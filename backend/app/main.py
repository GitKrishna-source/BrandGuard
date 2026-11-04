from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, File, Form, HTTPException, Query, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select
from sqlalchemy.orm import Session

from .config import get_settings
from .db import Base, engine, get_db
from .models import Audit, BrandPolicy, Review
from .schemas import (
    AuditCreate,
    AuditResponse,
    BrandPolicyCreate,
    BrandPolicyResponse,
    HealthResponse,
    ReviewCreate,
    ReviewResponse,
)
from .services import audit_text, audit_uploaded_file

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


@app.post("/api/policies", response_model=BrandPolicyResponse, status_code=status.HTTP_201_CREATED)
def create_policy(payload: BrandPolicyCreate, db: Session = Depends(get_db)) -> BrandPolicy:
    policy = BrandPolicy(**payload.model_dump())
    db.add(policy)
    db.commit()
    db.refresh(policy)
    return policy


@app.get("/api/policies", response_model=list[BrandPolicyResponse])
def list_policies(db: Session = Depends(get_db)) -> list[BrandPolicy]:
    return list(db.scalars(select(BrandPolicy).order_by(BrandPolicy.created_at.desc())))


@app.post("/api/audits", response_model=AuditResponse, status_code=status.HTTP_201_CREATED)
def create_audit(payload: AuditCreate, db: Session = Depends(get_db)) -> AuditResponse:
    policy = db.get(BrandPolicy, payload.policy_id)
    if not policy:
        raise HTTPException(status_code=404, detail="Brand policy not found")

    score, findings = audit_text(payload.content, policy)
    audit = Audit(
        policy_id=policy.id,
        content_type=payload.content_type,
        content=payload.content,
        score=score,
        status="approved" if not findings else "needs_review",
        response={"findings": [finding.model_dump() for finding in findings]},
    )
    db.add(audit)
    db.commit()
    db.refresh(audit)
    return AuditResponse(
        id=audit.id, policy_id=audit.policy_id, content_type=audit.content_type,
        score=audit.score, status=audit.status, findings=findings,
        content_preview=payload.content[:4000], created_at=audit.created_at,
    )


@app.post("/api/audits/upload", response_model=AuditResponse, status_code=status.HTTP_201_CREATED)
def create_upload_audit(
    policy_id: str = Form(...), file: UploadFile = File(...), db: Session = Depends(get_db)
) -> AuditResponse:
    policy = db.get(BrandPolicy, policy_id)
    if not policy:
        raise HTTPException(status_code=404, detail="Brand policy not found")
    data = file.file.read()
    try:
        score, findings, preview = audit_uploaded_file(file.filename or "upload", file.content_type, data, policy)
    except Exception as error:
        raise HTTPException(status_code=422, detail=f"Unable to parse uploaded content: {error}") from error
    content_type = "image" if (file.content_type or "").startswith("image/") else "document"
    audit = Audit(
        policy_id=policy.id, content_type=content_type, content=preview,
        score=score, status="approved" if not findings else "needs_review",
        response={"findings": [finding.model_dump() for finding in findings]},
    )
    db.add(audit)
    db.commit()
    db.refresh(audit)
    return AuditResponse(
        id=audit.id, policy_id=audit.policy_id, content_type=audit.content_type,
        score=audit.score, status=audit.status, findings=findings,
        content_preview=preview, created_at=audit.created_at,
    )


@app.get("/api/audits", response_model=list[AuditResponse])
def list_audits(
    policy_id: str | None = Query(default=None), db: Session = Depends(get_db)
) -> list[AuditResponse]:
    query = select(Audit).order_by(Audit.created_at.desc())
    if policy_id:
        query = query.where(Audit.policy_id == policy_id)
    audits = list(db.scalars(query))
    return [
        AuditResponse(
            id=audit.id, policy_id=audit.policy_id, content_type=audit.content_type,
            score=audit.score, status=audit.status,
            findings=audit.response.get("findings", []), content_preview=audit.content[:4000],
            created_at=audit.created_at,
        )
        for audit in audits
    ]


@app.post("/api/audits/{audit_id}/reviews", response_model=ReviewResponse, status_code=201)
def create_review(audit_id: str, payload: ReviewCreate, db: Session = Depends(get_db)) -> Review:
    if not db.get(Audit, audit_id):
        raise HTTPException(status_code=404, detail="Audit not found")
    review = Review(audit_id=audit_id, **payload.model_dump())
    db.add(review)
    db.commit()
    db.refresh(review)
    return review


@app.get("/api/audits/{audit_id}/reviews", response_model=list[ReviewResponse])
def list_reviews(audit_id: str, db: Session = Depends(get_db)) -> list[Review]:
    return list(db.scalars(select(Review).where(Review.audit_id == audit_id).order_by(Review.created_at)))
