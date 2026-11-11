"""Local PDF and OCR document ingestion and hybrid retrieval over page-labelled passages."""

import hashlib
import math
import re
from collections import Counter, defaultdict
from io import BytesIO
from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException
from pypdf import PdfReader
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .models import BrandPolicy, GuidelineDocument
from .ocr import (
    LOW_CONFIDENCE_THRESHOLD,
    MAX_PDF_PAGES,
    SourceType,
    detect_source_type,
    extract_guideline_document,
    normalize_extracted_text,
)
from .schemas import (
    DuplicateDocumentInfo,
    ExtractedPage,
    GuidelineDocumentResponse,
    RetrievedSource,
    ReviewedPageInput,
)
from .semantics import concepts

BOOTWEAR_POLICY_ID = "bootwear-demo-v1"
BOOTWEAR_DOCUMENT_ID = "bootwear-guidelines-v1"
BOOTWEAR_PDF = Path(__file__).parent / "assets" / "bootwear-brand-guidelines.pdf"
RETRIEVAL_METHOD = "BM25 keyword and semantic concept search over page-labelled PDF and OCR passages"
STOPWORDS = {"a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "has", "have",
             "i", "in", "is", "it", "its", "of", "on", "or", "our", "the", "their", "these", "this",
             "to", "was", "we", "with", "your"}

_QUOTED_BAN_PATTERN = re.compile(
    r"(?:do not use|never use|avoid using|avoid|prohibited(?:\s+terms?)?|banned(?:\s+terms?)?)"
    r"\s*[:\-]?\s*[\"“']([^\"”']{2,40})[\"”']"
    r"(?:\s*(?:;|,|—|-|->|=>|to|instead(?:\s+use)?|use|prefer)\s*[\"“']([^\"”']{2,60})[\"”'])?",
    re.IGNORECASE,
)
_USE_INSTEAD_PATTERN = re.compile(
    r"\buse\s+[\"“']([^\"”']{2,60})[\"”']\s+instead\s+of\s+[\"“']([^\"”']{2,40})[\"”']",
    re.IGNORECASE,
)
_LABELLED_BAN_PATTERN = re.compile(
    r"^(?:banned|prohibited)\s+(?:term|word|phrase)s?\s*:\s*(.+?)(?:\s*(?:=>|->|→)\s*(.+))?$",
    re.IGNORECASE,
)


def tokens(text: str) -> list[str]:
    text = re.sub(r"#1\b|\bnumber\s+(?:1|one)\b", " number one ranking ", text, flags=re.IGNORECASE)
    words = re.findall(r"[a-z0-9]+", text.casefold().replace(",", ""))
    return [word[:-1] if len(word) > 4 and word.endswith("s") else word
            for word in words if word not in STOPWORDS]


def chunks_from_pages(
    pages: list[ExtractedPage],
    *,
    filter_bootwear_handout: bool = True,
) -> list[dict]:
    chunks: list[dict] = []
    total_chars = 0
    for page in sorted(pages, key=lambda item: item.page):
        text = page.text or ""
        total_chars += len(text)
        if total_chars > 250_000:
            raise ValueError("Guideline text exceeds 250,000 characters.")
        # The handout contains deliberately false evaluation copy. Never index it
        # as approved evidence, including when a judge re-imports the same PDF.
        if filter_bootwear_handout and "not additional approved brand evidence" in text.casefold():
            continue
        text = "\n".join(
            line.strip()
            for line in text.splitlines()
            if not re.fullmatch(r"Page \d+", line.strip())
            and not line.strip().startswith("BOOTWEAR /")
        )
        blocks = re.split(r"(?m)(?=^BW-\d{2} /)", text)
        for block in blocks:
            block = block.strip()
            if not block:
                continue
            # Split long passages with overlap while keeping every passage tied
            # to its original page. Bootwear rule blocks fit in one passage.
            for start in range(0, len(block), 760):
                excerpt = block[start:start + 900].strip()
                if excerpt:
                    entry: dict[str, object] = {
                        "page": page.page,
                        "chunk_id": f"p{page.page}-c{len(chunks) + 1}",
                        "text": excerpt,
                        "extraction_method": page.extraction_method,
                    }
                    if page.ocr_confidence is not None:
                        entry["ocr_confidence"] = round(float(page.ocr_confidence), 4)
                    chunks.append(entry)
                if start + 900 >= len(block):
                    break
    return chunks


def extract_chunks(
    data: bytes,
    filename: str = "document.pdf",
    *,
    reviewed_pages: list[ReviewedPageInput] | None = None,
) -> tuple[int, list[dict]]:
    source_type = detect_source_type(filename, data)
    if reviewed_pages is not None:
        if source_type == "pdf":
            reader = PdfReader(BytesIO(data))
            if reader.is_encrypted or not 1 <= len(reader.pages) <= MAX_PDF_PAGES:
                raise ValueError(f"Use an unencrypted PDF with 1 to {MAX_PDF_PAGES} pages.")
            page_count = len(reader.pages)
        else:
            page_count = 1
        pages = [
            ExtractedPage(
                page=item.page,
                text=normalize_extracted_text(item.text),
                extraction_method=item.extraction_method,
                ocr_confidence=item.ocr_confidence if item.extraction_method == "ocr" else None,
            )
            for item in reviewed_pages
            if 1 <= item.page <= page_count
        ]
    else:
        preview = extract_guideline_document(data, filename)
        page_count = preview.page_count
        pages = preview.pages

    chunks = chunks_from_pages(pages)
    if not chunks:
        raise ValueError("No extractable guideline text. Scanned or blank pages could not be read.")
    return page_count, chunks


def _clean_term_token(value: str) -> str:
    return value.strip().strip("\"'“”‘’.,;:")


def policy_from_chunks(name: str, chunks: list[dict], policy_id: str) -> BrandPolicy:
    guidelines, facts, banned, replacements = [], [], [], {}
    for chunk in chunks:
        for raw_line in chunk["text"].splitlines():
            line = raw_line.strip()
            match = re.match(r"^(FACT|TERM|TONE|MESSAGING|PALETTE):\s*(.+)$", line)
            if match:
                kind, value = match.groups()
                if kind == "FACT":
                    facts.append(value.strip())
                elif kind == "TERM" and ("=>" in value or "->" in value or "→" in value):
                    sep = "=>" if "=>" in value else ("->" if "->" in value else "→")
                    term, replacement = [part.strip() for part in value.split(sep, 1)]
                    if term and replacement:
                        banned.append(term)
                        replacements[term] = replacement
                elif kind in {"TONE", "MESSAGING", "PALETTE"}:
                    guidelines.append(f"{kind.lower()}: {value}")
                continue

            labelled = _LABELLED_BAN_PATTERN.match(line)
            if labelled:
                raw_bad, raw_good = labelled.groups()
                bad_items = [_clean_term_token(raw_bad)] if raw_good else [
                    _clean_term_token(part) for part in re.split(r"[,;]", raw_bad)
                ]
                good_clean = _clean_term_token(raw_good) if raw_good else ""
                for term in bad_items:
                    if 2 <= len(term) <= 40:
                        banned.append(term)
                        if good_clean:
                            replacements[term] = good_clean
                continue

            for bad, good in _QUOTED_BAN_PATTERN.findall(line):
                term = _clean_term_token(bad)
                if 2 <= len(term) <= 40:
                    banned.append(term)
                    if good:
                        replacements[term] = _clean_term_token(good)

            for good, bad in _USE_INSTEAD_PATTERN.findall(line):
                term = _clean_term_token(bad)
                replacement = _clean_term_token(good)
                if 2 <= len(term) <= 40 and replacement:
                    banned.append(term)
                    replacements[term] = replacement

    return BrandPolicy(id=policy_id, name=name, guidelines=list(dict.fromkeys(guidelines)),
                       approved_facts=list(dict.fromkeys(facts)),
                       banned_terms=list(dict.fromkeys(banned)), approved_terms=replacements)


def import_guidelines(db: Session, data: bytes, filename: str, name: str, owner: str,
                      *, shared_demo=False,
                      reviewed_pages: list[ReviewedPageInput] | None = None) -> GuidelineDocument:
    clean_filename = filename.replace("\\", "/").rsplit("/", 1)[-1][:240]
    page_count, chunks = extract_chunks(data, clean_filename, reviewed_pages=reviewed_pages)
    policy_id = BOOTWEAR_POLICY_ID if shared_demo else str(uuid4())
    policy = policy_from_chunks(name, chunks, policy_id)
    document = GuidelineDocument(
        id=BOOTWEAR_DOCUMENT_ID if shared_demo else str(uuid4()), policy_id=policy_id,
        filename=clean_filename, owner=owner,
        shared_demo=shared_demo, sha256=hashlib.sha256(data).hexdigest(),
        page_count=page_count, chunks=chunks, pdf_data=data,
    )
    db.add(policy)
    db.flush()
    db.add(document)
    db.flush()
    return document


def bootwear_document(db: Session) -> GuidelineDocument:
    document = db.get(GuidelineDocument, BOOTWEAR_DOCUMENT_ID)
    if document is None:
        try:
            with db.begin_nested():
                document = import_guidelines(db, BOOTWEAR_PDF.read_bytes(), BOOTWEAR_PDF.name,
                                             "Bootwear - fictional shoe brand", "Bootwear demo fixture",
                                             shared_demo=True)
        except IntegrityError:
            document = db.get(GuidelineDocument, BOOTWEAR_DOCUMENT_ID)
            if document is None:
                raise
    return document


def check_document_access(document: GuidelineDocument, user: dict[str, str]):
    if not document.shared_demo and user["role"] == "creator" and document.owner != user["username"]:
        raise HTTPException(status_code=404, detail="Guideline document not found")


def _can_access_document(document: GuidelineDocument, user: dict[str, str]) -> bool:
    return bool(document.shared_demo or user["role"] != "creator" or document.owner == user["username"])


def find_duplicate_document(
    db: Session,
    sha256: str,
    user: dict[str, str],
    *,
    exclude_id: str | None = None,
) -> DuplicateDocumentInfo | None:
    docs = db.scalars(
        select(GuidelineDocument)
        .where(GuidelineDocument.sha256 == sha256)
        .order_by(GuidelineDocument.created_at.asc())
    ).all()
    for candidate in docs:
        if exclude_id and candidate.id == exclude_id:
            continue
        if not _can_access_document(candidate, user):
            continue
        policy = db.get(BrandPolicy, candidate.policy_id)
        return DuplicateDocumentInfo(
            document_id=candidate.id,
            policy_id=candidate.policy_id,
            brand_name=policy.name if policy else candidate.filename,
            filename=candidate.filename,
            sha256=candidate.sha256,
        )
    return None


def list_accessible_documents(db: Session, user: dict[str, str]) -> list[GuidelineDocument]:
    docs = db.scalars(select(GuidelineDocument).order_by(GuidelineDocument.created_at.desc())).all()
    return [doc for doc in docs if _can_access_document(doc, user)]


def _infer_source_type(filename: str) -> SourceType:
    suffix = (filename or "").lower().rsplit(".", 1)[-1] if "." in (filename or "") else ""
    if suffix in {"jpg", "jpeg", "png"}:
        return suffix  # type: ignore[return-value]
    return "pdf"


def document_info(
    document: GuidelineDocument,
    db: Session,
    *,
    duplicate_of: DuplicateDocumentInfo | None = None,
) -> GuidelineDocumentResponse:
    by_page: dict[int, list[dict]] = defaultdict(list)
    for chunk in document.chunks or []:
        by_page[int(chunk["page"])].append(chunk)

    pages: list[ExtractedPage] = []
    for page_num in sorted(by_page):
        page_chunks = by_page[page_num]
        combined_text = "\n\n".join(str(chunk["text"]) for chunk in page_chunks)
        methods = [chunk.get("extraction_method") or "native_pdf" for chunk in page_chunks]
        method = "ocr" if "ocr" in methods else "native_pdf"
        confs = [float(chunk["ocr_confidence"]) for chunk in page_chunks if chunk.get("ocr_confidence") is not None]
        avg_page_conf = round(sum(confs) / len(confs), 4) if confs else None
        is_low = method == "ocr" and avg_page_conf is not None and avg_page_conf < LOW_CONFIDENCE_THRESHOLD
        pages.append(
            ExtractedPage(
                page=page_num,
                text=combined_text,
                extraction_method=method,
                ocr_confidence=avg_page_conf,
                low_confidence=is_low,
                status="low_confidence" if is_low else "extracted",
                error=(
                    f"Low OCR confidence ({round(avg_page_conf * 100)}%)."
                    if is_low and avg_page_conf is not None
                    else None
                ),
                has_images=method == "ocr",
                char_count=len(combined_text),
                retryable=False,
            )
        )

    source_type = _infer_source_type(document.filename)
    native_count = sum(1 for page in pages if page.extraction_method == "native_pdf")
    ocr_count = sum(1 for page in pages if page.extraction_method == "ocr")
    extraction_methods: list = []
    if native_count > 0:
        extraction_methods.append("native_pdf")
    if ocr_count > 0:
        extraction_methods.append("ocr")
    if not extraction_methods:
        extraction_methods = ["native_pdf"]

    if source_type in {"jpg", "jpeg", "png"}:
        detected_kind = "image"
    elif native_count > 0 and ocr_count > 0:
        detected_kind = "mixed_pdf"
    elif ocr_count > 0:
        detected_kind = "scanned_pdf"
    else:
        detected_kind = "native_pdf"

    ocr_confs = [page.ocr_confidence for page in pages if page.ocr_confidence is not None]
    avg_conf = round(sum(ocr_confs) / len(ocr_confs), 4) if ocr_confs else None

    return GuidelineDocumentResponse(
        id=document.id,
        policy_id=document.policy_id,
        brand_name=db.get(BrandPolicy, document.policy_id).name,
        filename=document.filename,
        page_count=document.page_count,
        chunk_count=len(document.chunks),
        sha256=document.sha256,
        shared_demo=document.shared_demo,
        retrieval_method=RETRIEVAL_METHOD,
        source_type=source_type,
        detected_kind=detected_kind,
        extraction_methods=extraction_methods,
        native_page_count=native_count,
        ocr_page_count=ocr_count,
        average_ocr_confidence=avg_conf,
        duplicate_of=duplicate_of,
        pages=pages,
    )


def bm25_scores(corpus: list[list[str]], query_tokens: set[str]) -> list[float]:
    """BM25 with k1=1.5 and b=0.75."""
    count = len(corpus)
    average = sum(map(len, corpus)) / max(1, count)
    frequencies = Counter(word for passage in corpus for word in set(passage))
    scored = []
    for passage in corpus:
        term_counts = Counter(passage)
        score = 0.0
        for word in sorted(query_tokens):
            freq = term_counts[word]
            if not freq:
                continue
            idf = math.log(1 + (count - frequencies[word] + 0.5) / (frequencies[word] + 0.5))
            score += idf * freq * 2.5 / (freq + 1.5 * (0.25 + 0.75 * len(passage) / max(1, average)))
        scored.append(score)
    return scored


def semantic_scores(passages: list[str], query: str) -> list[float]:
    query_concepts = concepts(query)
    passage_concepts = [concepts(passage) for passage in passages]
    frequency = Counter(concept for passage in passage_concepts for concept in passage)
    weights = {key: math.log1p(len(passages) / count) for key, count in frequency.items()}
    return [
        sum(weights[key] for key in sorted(query_concepts & passage))
        / math.sqrt(max(1, len(passage)))
        for passage in passage_concepts
    ]


def retrieve(document: GuidelineDocument, query: str, limit: int = 6) -> list[RetrievedSource]:
    passages = [chunk["text"] for chunk in document.chunks]
    keyword = bm25_scores([tokens(passage) for passage in passages], set(tokens(query)))
    semantic = semantic_scores(passages, query)
    keyword_max = max(keyword, default=0) or 1
    semantic_max = max(semantic, default=0) or 1
    scores = [0.7 * k / keyword_max + 0.3 * s / semantic_max for k, s in zip(keyword, semantic)]
    ranked = sorted((i for i, score in enumerate(scores) if score > 0),
                    key=lambda i: (-scores[i], i))[:max(0, limit)]
    return [RetrievedSource(
        citation_id=f"S{rank}", document_id=document.id, filename=document.filename,
        page=document.chunks[index]["page"], chunk_id=document.chunks[index]["chunk_id"],
        text=document.chunks[index]["text"], document_sha256=document.sha256,
        relevance=round(scores[index], 4),
        match_types=[kind for kind, score in (("keyword", keyword[index]),
                                               ("semantic", semantic[index])) if score > 0],
        extraction_method=document.chunks[index].get("extraction_method"),
        ocr_confidence=document.chunks[index].get("ocr_confidence"),
    ) for rank, index in enumerate(ranked, 1)]


def audit_sources(db: Session, policy_id: str, user: dict[str, str], query: str):
    document = db.scalar(select(GuidelineDocument).where(GuidelineDocument.policy_id == policy_id))
    if document is None:
        return None
    check_document_access(document, user)
    return retrieve(document, query)
