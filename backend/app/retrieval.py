"""Local PDF ingestion and BM25 retrieval. No embedding service receives documents."""

import hashlib
import math
import re
from collections import Counter
from io import BytesIO
from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException
from pypdf import PdfReader
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .models import BrandPolicy, GuidelineDocument
from .schemas import GuidelineDocumentResponse, RetrievedSource

BOOTWEAR_POLICY_ID = "bootwear-demo-v1"
BOOTWEAR_DOCUMENT_ID = "bootwear-guidelines-v1"
BOOTWEAR_PDF = Path(__file__).parent / "assets" / "bootwear-brand-guidelines.pdf"
RETRIEVAL_METHOD = "BM25 keyword retrieval over page-labelled PDF passages"
STOPWORDS = {"a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "has", "have",
             "i", "in", "is", "it", "its", "of", "on", "or", "our", "the", "their", "these", "this",
             "to", "was", "we", "with", "your"}


def tokens(text: str) -> list[str]:
    text = re.sub(r"#1\b|\bnumber\s+(?:1|one)\b", " number one ranking ", text, flags=re.IGNORECASE)
    words = re.findall(r"[a-z0-9]+", text.casefold().replace(",", ""))
    return [word[:-1] if len(word) > 4 and word.endswith("s") else word
            for word in words if word not in STOPWORDS]


def extract_chunks(data: bytes) -> tuple[int, list[dict]]:
    reader = PdfReader(BytesIO(data))
    if reader.is_encrypted or not 1 <= len(reader.pages) <= 100:
        raise ValueError("Use an unencrypted text PDF with 1 to 100 pages.")
    chunks = []
    total_chars = 0
    for number, page in enumerate(reader.pages, 1):
        text = page.extract_text() or ""
        total_chars += len(text)
        if total_chars > 250_000:
            raise ValueError("Guideline text exceeds 250,000 characters.")
        # The handout contains deliberately false evaluation copy. Never index it
        # as approved evidence, including when a judge re-imports the same PDF.
        if "not additional approved brand evidence" in text.casefold():
            continue
        text = "\n".join(line.strip() for line in text.splitlines()
                         if not re.fullmatch(r"Page \d+", line.strip())
                         and not line.strip().startswith("BOOTWEAR /"))
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
                    chunks.append({"page": number, "chunk_id": f"p{number}-c{len(chunks) + 1}",
                                   "text": excerpt})
                if start + 900 >= len(block):
                    break
    if not chunks:
        raise ValueError("No extractable guideline text. Scanned PDFs need OCR first.")
    return len(reader.pages), chunks


def policy_from_chunks(name: str, chunks: list[dict], policy_id: str) -> BrandPolicy:
    guidelines, facts, banned, replacements = [], [], [], {}
    # Only explicit labelled entries become local rules. Other passages remain
    # retrievable evidence for the contextual AI review; nothing is inferred here.
    for chunk in chunks:
        for line in chunk["text"].splitlines():
            match = re.match(r"^(FACT|TERM|TONE|MESSAGING|PALETTE):\s*(.+)$", line)
            if not match:
                continue
            kind, value = match.groups()
            if kind == "FACT":
                facts.append(value.strip())
            elif kind == "TERM" and "=>" in value:
                term, replacement = [part.strip() for part in value.split("=>", 1)]
                if term and replacement:
                    banned.append(term)
                    replacements[term] = replacement
            elif kind in {"TONE", "MESSAGING", "PALETTE"}:
                guidelines.append(f"{kind.lower()}: {value}")
    return BrandPolicy(id=policy_id, name=name, guidelines=list(dict.fromkeys(guidelines)),
                       approved_facts=list(dict.fromkeys(facts)),
                       banned_terms=list(dict.fromkeys(banned)), approved_terms=replacements)


def import_guidelines(db: Session, data: bytes, filename: str, name: str, owner: str,
                      *, shared_demo=False) -> GuidelineDocument:
    page_count, chunks = extract_chunks(data)
    policy_id = BOOTWEAR_POLICY_ID if shared_demo else str(uuid4())
    policy = policy_from_chunks(name, chunks, policy_id)
    document = GuidelineDocument(
        id=BOOTWEAR_DOCUMENT_ID if shared_demo else str(uuid4()), policy_id=policy_id,
        filename=filename.replace("\\", "/").rsplit("/", 1)[-1][:240], owner=owner,
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


def document_info(document: GuidelineDocument, db: Session) -> GuidelineDocumentResponse:
    return GuidelineDocumentResponse(
        id=document.id, policy_id=document.policy_id,
        brand_name=db.get(BrandPolicy, document.policy_id).name,
        filename=document.filename, page_count=document.page_count, chunk_count=len(document.chunks),
        sha256=document.sha256, shared_demo=document.shared_demo,
    )


def retrieve(document: GuidelineDocument, query: str, limit: int = 6) -> list[RetrievedSource]:
    """BM25 with k1=1.5, b=0.75; only this document's passages can be returned."""
    query_tokens = set(tokens(query))
    corpus = [tokens(chunk["text"]) for chunk in document.chunks]
    count = len(corpus)
    average = sum(map(len, corpus)) / max(1, count)
    frequencies = Counter(word for passage in corpus for word in set(passage))
    scored = []
    for index, passage in enumerate(corpus):
        term_counts = Counter(passage)
        score = 0.0
        for word in query_tokens:
            freq = term_counts[word]
            if not freq:
                continue
            idf = math.log(1 + (count - frequencies[word] + 0.5) / (frequencies[word] + 0.5))
            score += idf * freq * 2.5 / (freq + 1.5 * (0.25 + 0.75 * len(passage) / max(1, average)))
        if score > 0:
            scored.append((score, index))
    ranked = sorted(scored, key=lambda pair: (-pair[0], pair[1]))[:limit]
    return [RetrievedSource(
        citation_id=f"S{rank}", document_id=document.id, filename=document.filename,
        page=document.chunks[index]["page"], chunk_id=document.chunks[index]["chunk_id"],
        text=document.chunks[index]["text"], document_sha256=document.sha256,
        relevance=round(score, 4),
    ) for rank, (score, index) in enumerate(ranked, 1)]


def audit_sources(db: Session, policy_id: str, user: dict[str, str], query: str):
    document = db.scalar(select(GuidelineDocument).where(GuidelineDocument.policy_id == policy_id))
    if document is None:
        return None
    check_document_access(document, user)
    return retrieve(document, query)
