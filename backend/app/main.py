import hashlib
import json
from collections import Counter, defaultdict
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, File, Form, HTTPException, Query, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, StreamingResponse
from pydantic import TypeAdapter, ValidationError
from sqlalchemy import select
from sqlalchemy.orm import Session

from .auth import authenticate, create_access_token, get_current_user, require_roles
from .config import get_settings
from .db import Base, engine, get_db
from .models import Audit, BrandPolicy, GuidelineDocument, Review, Revision
from .ocr import detect_source_type, extract_guideline_document, extract_single_page, iter_extract_guideline_document
from .policies import BASIC_POLICY_ID, get_basic_policy
from .remediation import build_remediation_edits
from .reports import AuditReport, build_report, capture_policy, render_report_pdf
from .retrieval import (
    BOOTWEAR_PDF,
    RETRIEVAL_METHOD,
    audit_sources,
    bootwear_document,
    check_document_access,
    document_info,
    find_duplicate_document,
    import_guidelines,
    list_accessible_documents,
    import_guidelines,
)
from .schemas import (
    AuditCreate,
    AuditResponse,
    AuthUser,
    BrandPolicyCreate,
    BrandPolicyResponse,
    BrandPolicyUpdate,
    ContentTypeInsight,
    DemoLoginRequest,
    GovernanceInsights,
    GuidelineDocumentResponse,
    GuidelineExtractionPreview,
    GuidelinePageRetryResponse,
    ReviewedPageInput,
    HealthResponse,
    LoginRequest,
    LoginResponse,
    RemediateRequest,
    RemediateResponse,
    ReviewCreate,
    ReviewResponse,
    RevisionCreate,
    RevisionResponse,
    ViolationInsight,
)
from .services import (
    audit_data_handling,
    audit_text_with_provider,
    audit_uploaded_file_with_provider,
    extract_document_text,
    remediate_text_with_provider,
)

settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(title=settings.app_name, version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse, tags=["system"])
def health() -> HealthResponse:
    return HealthResponse(status="ok", environment=settings.app_env)


@app.post("/api/auth/login", response_model=LoginResponse, tags=["auth"])
def login(payload: LoginRequest) -> LoginResponse:
    user = authenticate(payload.username, payload.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    return LoginResponse(access_token=create_access_token(user), user=AuthUser(**user))


@app.post("/api/auth/demo", response_model=LoginResponse, tags=["auth"])
def demo_login(payload: DemoLoginRequest) -> LoginResponse:
    if not settings.demo_login_enabled:
        raise HTTPException(status_code=403, detail="Demo login is disabled")
    user = {"username": f"{payload.role}@brandguard.local", "role": payload.role}
    return LoginResponse(access_token=create_access_token(user), user=AuthUser(**user))


@app.get("/api/auth/me", response_model=AuthUser, tags=["auth"])
def current_user(user: dict[str, str] = Depends(get_current_user)) -> AuthUser:
    return AuthUser(**user)


@app.post("/api/policies", response_model=BrandPolicyResponse, status_code=status.HTTP_201_CREATED)
def create_policy(
    payload: BrandPolicyCreate,
    db: Session = Depends(get_db),
    _: dict[str, str] = Depends(get_current_user),
) -> BrandPolicy:
    policy = BrandPolicy(**payload.model_dump())
    db.add(policy)
    db.commit()
    db.refresh(policy)
    return policy


@app.get("/api/policies", response_model=list[BrandPolicyResponse])
def list_policies(db: Session = Depends(get_db), _: dict[str, str] = Depends(get_current_user)) -> list[BrandPolicy]:
    policies = list(db.scalars(select(BrandPolicy).order_by(BrandPolicy.created_at.desc())))
    if _["role"] == "creator":
        private = set(db.scalars(select(GuidelineDocument.policy_id).where(
            GuidelineDocument.shared_demo.is_(False), GuidelineDocument.owner != _["username"])))
        policies = [policy for policy in policies if policy.id not in private]
    return policies


@app.post("/api/demo/bootwear", response_model=GuidelineDocumentResponse)
def load_bootwear_demo(db: Session = Depends(get_db), _: dict[str, str] = Depends(get_current_user)):
    document = bootwear_document(db)
    db.commit()
    return document_info(document, db)


@app.get("/api/demo/bootwear/guidelines.pdf")
def download_bootwear_guidelines(_: dict[str, str] = Depends(get_current_user)):
    return Response(BOOTWEAR_PDF.read_bytes(), media_type="application/pdf", headers={
        "Content-Disposition": 'attachment; filename="Bootwear_Brand_Guidelines.pdf"',
        "Cache-Control": "no-store",
    })


@app.get("/api/guidelines", response_model=list[GuidelineDocumentResponse])
def list_guidelines(
    db: Session = Depends(get_db),
    user: dict[str, str] = Depends(get_current_user),
):
    return [document_info(document, db) for document in list_accessible_documents(db, user)]


@app.post("/api/guidelines/extract", response_model=GuidelineExtractionPreview)
def extract_guideline_preview(
    file: UploadFile = File(...),
    stream: bool = Query(default=False),
    db: Session = Depends(get_db),
    user: dict[str, str] = Depends(require_roles("manager", "legal")),
):
    filename = file.filename or "guideline"
    data = file.file.read(settings.max_upload_bytes + 1)
    if not data:
        raise HTTPException(status_code=422, detail="Uploaded file is empty.")
    if len(data) > settings.max_upload_bytes:
        raise HTTPException(status_code=413, detail="Guideline file exceeds the 10 MB upload limit")
    try:
        detect_source_type(filename, data)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    duplicate_of = find_duplicate_document(db, hashlib.sha256(data).hexdigest(), user)

    if stream:
        def event_stream():
            try:
                for event in iter_extract_guideline_document(data, filename, duplicate_of=duplicate_of):
                    yield json.dumps(event) + "\n"
            except Exception as error:
                yield json.dumps({"stage": "failed", "progress": 100, "message": str(error)}) + "\n"

        return StreamingResponse(
            event_stream(),
            media_type="application/x-ndjson",
            headers={"Cache-Control": "no-store"},
        )

    try:
        return extract_guideline_document(data, filename, duplicate_of=duplicate_of)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except Exception as error:
        raise HTTPException(status_code=422, detail="Unable to process uploaded guideline document") from error


@app.post("/api/guidelines/extract-page", response_model=GuidelinePageRetryResponse)
def retry_guideline_page_ocr(
    file: UploadFile = File(...),
    page: int = Form(..., ge=1, le=100),
    enhanced: bool = Form(default=True),
    _: dict[str, str] = Depends(require_roles("manager", "legal")),
):
    filename = file.filename or "guideline.pdf"
    data = file.file.read(settings.max_upload_bytes + 1)
    if not data:
        raise HTTPException(status_code=422, detail="Uploaded file is empty.")
    if len(data) > settings.max_upload_bytes:
        raise HTTPException(status_code=413, detail="Guideline file exceeds the 10 MB upload limit")
    try:
        page_data = extract_single_page(data, filename, page, enhanced=enhanced)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except Exception as error:
        raise HTTPException(status_code=422, detail=f"Failed to retry OCR on page {page}") from error
    clean_name = filename.replace("\\", "/").rsplit("/", 1)[-1][:240]
    return GuidelinePageRetryResponse(filename=clean_name, page=page, page_data=page_data)


def _guideline_media_type_and_ext(filename: str) -> tuple[str, str]:
    suffix = (filename or "").lower().rsplit(".", 1)[-1] if "." in (filename or "") else "pdf"
    if suffix in {"jpg", "jpeg"}:
        return "image/jpeg", suffix
    if suffix == "png":
        return "image/png", "png"
    return "application/pdf", "pdf"


@app.post("/api/guidelines/import", response_model=GuidelineDocumentResponse, status_code=201)
def import_guideline_pdf(
    brand_name: str = Form(..., min_length=1, max_length=160),
    file: UploadFile = File(...),
    reviewed_pages_json: str | None = Form(default=None),
    db: Session = Depends(get_db),
    user: dict[str, str] = Depends(require_roles("manager", "legal")),
):
    data = file.file.read(settings.max_upload_bytes + 1)
    if len(data) > settings.max_upload_bytes:
        raise HTTPException(status_code=413, detail="Guideline file exceeds the upload limit")
    filename = file.filename or "guideline"
    try:
        detect_source_type(filename, data)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    name = brand_name.strip()
    if not name:
        raise HTTPException(status_code=422, detail="Enter a brand name")
    reviewed_pages = None
    if reviewed_pages_json and reviewed_pages_json.strip():
        try:
            reviewed_pages = TypeAdapter(list[ReviewedPageInput]).validate_json(reviewed_pages_json)
        except ValidationError as error:
            raise HTTPException(status_code=422, detail="Invalid reviewed pages payload") from error
    prior_duplicate = find_duplicate_document(db, hashlib.sha256(data).hexdigest(), user)
    try:
        document = import_guidelines(
            db, data, filename, name, user["username"], reviewed_pages=reviewed_pages
        )
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except Exception as error:
        raise HTTPException(status_code=422, detail="Unable to extract guideline document text") from error
    db.commit()
    return document_info(document, db, duplicate_of=prior_duplicate)


@app.get("/api/guidelines/{document_id}", response_model=GuidelineDocumentResponse)
def get_guideline_source(
    document_id: str,
    db: Session = Depends(get_db),
    user: dict[str, str] = Depends(get_current_user),
):
    document = db.get(GuidelineDocument, document_id)
    if document is None:
        raise HTTPException(status_code=404, detail="Guideline document not found")
    check_document_access(document, user)
    return document_info(document, db)


@app.get("/api/guidelines/{document_id}/pdf")
def download_guideline_source(document_id: str, db: Session = Depends(get_db),
                              user: dict[str, str] = Depends(get_current_user)):
    document = db.get(GuidelineDocument, document_id)
    if document is None:
        raise HTTPException(status_code=404, detail="Guideline document not found")
    check_document_access(document, user)
    media_type, ext = _guideline_media_type_and_ext(document.filename)
    return Response(document.pdf_data, media_type=media_type, headers={
        "Content-Disposition": f'attachment; filename="Guidelines_{document.id}.{ext}"',
        "Cache-Control": "no-store",
    })


def source_metadata(sources):
    if sources is None:
        return {}
    return {"retrieved_sources": [source.model_dump() for source in sources],
            "retrieval_method": RETRIEVAL_METHOD}


def run_text_audit(db, policy, user, content):
    sources = audit_sources(db, policy.id, user, content)
    result = (audit_text_with_provider(content, policy) if sources is None else
              audit_text_with_provider(content, policy, sources))
    return *result, sources


def source_data_handling(engine, sources):
    notice = audit_data_handling(engine)
    if sources is not None:
        notice += " Guideline PDFs are retained in the database. Search runs locally. When AI is used, the draft or asset and relevant passages may also be sent for a citation check."
    return notice


@app.patch("/api/policies/{policy_id}", response_model=BrandPolicyResponse)
def update_policy(
    policy_id: str,
    payload: BrandPolicyUpdate,
    db: Session = Depends(get_db),
    _: dict[str, str] = Depends(require_roles("manager", "legal")),
) -> BrandPolicy:
    if policy_id == BASIC_POLICY_ID:
        raise HTTPException(status_code=409, detail="General audit defaults cannot be edited. Create a separate brand policy instead.")
    if db.scalar(select(GuidelineDocument.id).where(GuidelineDocument.policy_id == policy_id)):
        raise HTTPException(status_code=409, detail="Import a new PDF to create a new guideline version; source-backed policies are immutable.")
    policy = db.get(BrandPolicy, policy_id)
    if not policy:
        raise HTTPException(status_code=404, detail="Brand policy not found")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(policy, field, value)
    db.commit()
    db.refresh(policy)
    return policy


@app.post("/api/audits", response_model=AuditResponse, status_code=status.HTTP_201_CREATED)
def create_audit(
    payload: AuditCreate,
    db: Session = Depends(get_db),
    user: dict[str, str] = Depends(get_current_user),
) -> AuditResponse:
    policy = get_basic_policy(db) if payload.policy_id is None else db.get(BrandPolicy, payload.policy_id)
    if not policy:
        raise HTTPException(status_code=404, detail="Brand policy not found")

    score, findings, engine, sources = run_text_audit(db, policy, user, payload.content)
    audit = Audit(
        policy_id=policy.id,
        content_type=payload.content_type,
        content=payload.content,
        score=score,
        status="needs_review",
        response={"owner": user["username"], "findings": [finding.model_dump() for finding in findings],
                  "analysis_engine": engine, "data_handling": source_data_handling(engine, sources),
                  **source_metadata(sources),
                  "policy_snapshot": capture_policy(policy), "content_coverage": "full_text"},
    )
    db.add(audit)
    db.commit()
    db.refresh(audit)
    return AuditResponse(
        id=audit.id, policy_id=audit.policy_id, content_type=audit.content_type,
        score=audit.score, status=audit.status, findings=findings,
        content_preview=payload.content[:4000], analysis_engine=engine,
        data_handling=source_data_handling(engine, sources), **source_metadata(sources), created_at=audit.created_at,
    )


@app.post("/api/audits/remediate", response_model=RemediateResponse)
def remediate_audit_content(
    payload: RemediateRequest,
    db: Session = Depends(get_db),
    user: dict[str, str] = Depends(get_current_user),
) -> RemediateResponse:
    policy = get_basic_policy(db) if payload.policy_id is None else db.get(BrandPolicy, payload.policy_id)
    if not policy:
        raise HTTPException(status_code=404, detail="Brand policy not found")
    sources = audit_sources(db, policy.id, user, payload.content)
    fixed_content, changes_summary, engine, explanations = remediate_text_with_provider(
        payload.content, policy, sources)
    return RemediateResponse(
        original=payload.content,
        fixed_content=fixed_content,
        changes_summary=changes_summary,
        analysis_engine=engine,
        edits=build_remediation_edits(payload.content, fixed_content, policy, sources, explanations),
        data_handling=source_data_handling(engine, sources),
    )


@app.post("/api/audits/upload", response_model=AuditResponse, status_code=status.HTTP_201_CREATED)
def create_upload_audit(
    policy_id: str | None = Form(default=None), file: UploadFile = File(...), db: Session = Depends(get_db),
    user: dict[str, str] = Depends(get_current_user),
) -> AuditResponse:
    policy = get_basic_policy(db) if policy_id is None else db.get(BrandPolicy, policy_id)
    if not policy:
        raise HTTPException(status_code=404, detail="Brand policy not found")
    data = file.file.read(settings.max_upload_bytes + 1)
    if len(data) > settings.max_upload_bytes:
        raise HTTPException(status_code=413, detail="Upload exceeds the configured size limit")
    try:
        query = ("logo palette visual contrast accessibility" if (file.content_type or "").startswith("image/")
                 else extract_document_text(file.filename or "upload", data))
        sources = audit_sources(db, policy.id, user, query)
        score, findings, engine, preview = audit_uploaded_file_with_provider(
            file.filename or "upload", file.content_type, data, policy, sources)
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=422, detail="Unable to parse uploaded content") from error
    content_type = "image" if (file.content_type or "").startswith("image/") else "document"
    audit = Audit(
        policy_id=policy.id, content_type=content_type, content=preview,
        score=score, status="needs_review",
        response={"owner": user["username"], "findings": [finding.model_dump() for finding in findings],
                  "analysis_engine": engine, "data_handling": source_data_handling(engine, sources),
                  **source_metadata(sources),
                  "policy_snapshot": capture_policy(policy),
                  "content_coverage": "image_not_retained" if content_type == "image" else "full_text",
                  "source_filename": (file.filename or "upload").replace("\\", "/").rsplit("/", 1)[-1]},
    )
    db.add(audit)
    db.commit()
    db.refresh(audit)
    return AuditResponse(
        id=audit.id, policy_id=audit.policy_id, content_type=audit.content_type,
        score=audit.score, status=audit.status, findings=findings,
        content_preview=preview[:4000], analysis_engine=engine,
        data_handling=source_data_handling(engine, sources), **source_metadata(sources), created_at=audit.created_at,
    )


@app.get("/api/audits", response_model=list[AuditResponse])
def list_audits(
    policy_id: str | None = Query(default=None), db: Session = Depends(get_db),
    user: dict[str, str] = Depends(get_current_user),
) -> list[AuditResponse]:
    query = select(Audit).order_by(Audit.created_at.desc())
    if policy_id:
        query = query.where(Audit.policy_id == policy_id)
    if user["role"] == "creator":
        query = query.where(Audit.response["owner"].as_string() == user["username"])
    audits = list(db.scalars(query))
    parents = dict(db.execute(select(Revision.audit_id, Revision.parent_audit_id)).all())
    return [
        AuditResponse(
            id=audit.id, policy_id=audit.policy_id, content_type=audit.content_type,
            score=audit.score, status=audit.status,
            findings=audit.response.get("findings", []), content_preview=audit.content[:4000],
            analysis_engine=audit.response.get("analysis_engine", "Not recorded for this older audit"),
            data_handling=audit.response.get(
                "data_handling", "Provider usage was not recorded for this older audit."
            ),
            parent_audit_id=parents.get(audit.id), created_at=audit.created_at,
            retrieved_sources=audit.response.get("retrieved_sources", []),
            retrieval_method=audit.response.get("retrieval_method"),
        )
        for audit in audits
    ]


@app.post("/api/audits/{audit_id}/revisions", response_model=AuditResponse, status_code=201)
def create_revision(
    audit_id: str,
    payload: RevisionCreate,
    db: Session = Depends(get_db),
    user: dict[str, str] = Depends(get_current_user),
) -> AuditResponse:
    parent = accessible_audit(db, audit_id, user)
    if parent.content_type == "image":
        raise HTTPException(status_code=422, detail="Image revisions require a new upload")
    policy = db.get(BrandPolicy, parent.policy_id)
    if not policy:
        raise HTTPException(status_code=404, detail="Brand policy not found")
    score, findings, engine, sources = run_text_audit(db, policy, user, payload.content)
    audit = Audit(
        policy_id=policy.id, content_type="text", content=payload.content, score=score,
        status="needs_review",
        response={"owner": user["username"], "findings": [finding.model_dump() for finding in findings],
                  "analysis_engine": engine, "data_handling": source_data_handling(engine, sources),
                  **source_metadata(sources),
                  "policy_snapshot": capture_policy(policy), "content_coverage": "full_text",
                  "source_filename": parent.response.get("source_filename")},
    )
    db.add(audit)
    db.flush()
    db.add(Revision(
        parent_audit_id=parent.id, audit_id=audit.id, author=user["username"], summary=payload.summary
    ))
    db.commit()
    db.refresh(audit)
    return AuditResponse(
        id=audit.id, policy_id=audit.policy_id, content_type=audit.content_type,
        score=audit.score, status=audit.status, findings=findings,
        content_preview=audit.content[:4000], analysis_engine=engine,
        data_handling=source_data_handling(engine, sources), **source_metadata(sources), created_at=audit.created_at,
    )


@app.get("/api/audits/{audit_id}/revisions", response_model=list[RevisionResponse])
def list_revisions(
    audit_id: str, db: Session = Depends(get_db), user: dict[str, str] = Depends(get_current_user)
) -> list[Revision]:
    accessible_audit(db, audit_id, user)
    return list(db.scalars(
        select(Revision).where(Revision.parent_audit_id == audit_id).order_by(Revision.created_at)
    ))


@app.get("/api/audits/{audit_id}/report", response_model=AuditReport)
def get_audit_report(
    audit_id: str, response: Response, db: Session = Depends(get_db),
    user: dict[str, str] = Depends(get_current_user),
) -> AuditReport:
    response.headers["Cache-Control"] = "no-store"
    return build_report(db, accessible_audit(db, audit_id, user))


@app.get("/api/audits/{audit_id}/report.pdf", response_class=Response,
         responses={200: {"content": {"application/pdf": {}}}})
def download_audit_report(
    audit_id: str, db: Session = Depends(get_db),
    user: dict[str, str] = Depends(get_current_user),
) -> Response:
    audit = accessible_audit(db, audit_id, user)
    return Response(
        content=render_report_pdf(build_report(db, audit)), media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="BrandGuard_Audit_{audit.id}.pdf"',
                 "Cache-Control": "no-store"},
    )


@app.get("/api/insights", response_model=GovernanceInsights)
def governance_insights(
    db: Session = Depends(get_db), _: dict[str, str] = Depends(require_roles("manager", "legal"))
) -> GovernanceInsights:
    audits = list(db.scalars(select(Audit)))
    categories: Counter[str] = Counter()
    severities: dict[str, str] = {}
    by_type: dict[str, list[int]] = defaultdict(list)
    flagged = 0
    for audit in audits:
        findings = audit.response.get("findings", [])
        if findings:
            flagged += 1
        by_type[audit.content_type].append(audit.score)
        for finding in findings:
            category = finding.get("category", "other")
            categories[category] += 1
            severities[category] = finding.get("severity", "medium")
    total = len(audits)
    return GovernanceInsights(
        total_audits=total,
        flagged_audits=flagged,
        intercept_rate=round((flagged / total) * 100) if total else 0,
        average_score=round(sum(audit.score for audit in audits) / total) if total else 100,
        top_violations=[
            ViolationInsight(category=category, occurrences=count, severity=severities[category])
            for category, count in categories.most_common(5)
        ],
        content_types=[
            ContentTypeInsight(content_type=kind, audits=len(scores), average_score=round(sum(scores) / len(scores)))
            for kind, scores in by_type.items()
        ],
        unclear_guidelines=[category for category, count in categories.items() if count >= 2],
    )


@app.post("/api/audits/{audit_id}/reviews", response_model=ReviewResponse, status_code=201)
def create_review(
    audit_id: str,
    payload: ReviewCreate,
    db: Session = Depends(get_db),
    user: dict[str, str] = Depends(get_current_user),
) -> Review:
    audit = accessible_audit(db, audit_id, user)
    if payload.reviewer_role != user["role"]:
        raise HTTPException(status_code=403, detail="Reviewer role does not match authenticated user")
    if payload.status != "pending" and user["role"] == "creator":
        raise HTTPException(status_code=403, detail="Only reviewers can record decisions")
    if payload.status == "approved" and user["role"] != "legal" and any(
        finding["severity"] == "high" for finding in audit.response.get("findings", [])
    ):
        raise HTTPException(status_code=403, detail="High-severity findings require legal approval")
    review = Review(audit_id=audit_id, **payload.model_dump())
    db.add(review)
    db.flush()
    audit.response = {**audit.response, "review_authors": {
        **audit.response.get("review_authors", {}), review.id: user["username"]
    }}
    if payload.status in {"approved", "rejected", "changes_requested"}:
        audit.status = payload.status
    db.commit()
    db.refresh(review)
    return review


@app.get("/api/audits/{audit_id}/reviews", response_model=list[ReviewResponse])
def list_reviews(
    audit_id: str, db: Session = Depends(get_db), user: dict[str, str] = Depends(get_current_user)
) -> list[Review]:
    accessible_audit(db, audit_id, user)
    return list(db.scalars(select(Review).where(Review.audit_id == audit_id).order_by(Review.created_at)))

def accessible_audit(db: Session, audit_id: str, user: dict[str, str]) -> Audit:
    audit = db.get(Audit, audit_id)
    if not audit or (user["role"] == "creator" and audit.response.get("owner") != user["username"]):
        raise HTTPException(status_code=404, detail="Audit not found")
    return audit
