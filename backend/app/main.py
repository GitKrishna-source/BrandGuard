from collections import Counter, defaultdict
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, File, Form, HTTPException, Query, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select
from sqlalchemy.orm import Session

from .auth import authenticate, create_access_token, get_current_user, require_roles
from .config import get_settings
from .db import Base, engine, get_db
from .models import Audit, BrandPolicy, Review, Revision
from .schemas import (
    AuditCreate,
    AuditResponse,
    AuthUser,
    BrandPolicyCreate,
    BrandPolicyResponse,
    BrandPolicyUpdate,
    ContentTypeInsight,
    GovernanceInsights,
    HealthResponse,
    LoginRequest,
    LoginResponse,
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
    return list(db.scalars(select(BrandPolicy).order_by(BrandPolicy.created_at.desc())))


@app.patch("/api/policies/{policy_id}", response_model=BrandPolicyResponse)
def update_policy(
    policy_id: str,
    payload: BrandPolicyUpdate,
    db: Session = Depends(get_db),
    _: dict[str, str] = Depends(require_roles("manager", "legal")),
) -> BrandPolicy:
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
    policy = db.get(BrandPolicy, payload.policy_id)
    if not policy:
        raise HTTPException(status_code=404, detail="Brand policy not found")

    score, findings, engine = audit_text_with_provider(payload.content, policy)
    audit = Audit(
        policy_id=policy.id,
        content_type=payload.content_type,
        content=payload.content,
        score=score,
        status="needs_review",
        response={"owner": user["username"], "findings": [finding.model_dump() for finding in findings],
                  "analysis_engine": engine, "data_handling": audit_data_handling(engine)},
    )
    db.add(audit)
    db.commit()
    db.refresh(audit)
    return AuditResponse(
        id=audit.id, policy_id=audit.policy_id, content_type=audit.content_type,
        score=audit.score, status=audit.status, findings=findings,
        content_preview=payload.content[:4000], analysis_engine=engine,
        data_handling=audit_data_handling(engine), created_at=audit.created_at,
    )


@app.post("/api/audits/upload", response_model=AuditResponse, status_code=status.HTTP_201_CREATED)
def create_upload_audit(
    policy_id: str = Form(...), file: UploadFile = File(...), db: Session = Depends(get_db),
    user: dict[str, str] = Depends(get_current_user),
) -> AuditResponse:
    policy = db.get(BrandPolicy, policy_id)
    if not policy:
        raise HTTPException(status_code=404, detail="Brand policy not found")
    data = file.file.read(settings.max_upload_bytes + 1)
    if len(data) > settings.max_upload_bytes:
        raise HTTPException(status_code=413, detail="Upload exceeds the configured size limit")
    try:
        score, findings, engine, preview = audit_uploaded_file_with_provider(file.filename or "upload", file.content_type, data, policy)
    except Exception as error:
        raise HTTPException(status_code=422, detail="Unable to parse uploaded content") from error
    content_type = "image" if (file.content_type or "").startswith("image/") else "document"
    audit = Audit(
        policy_id=policy.id, content_type=content_type, content=preview,
        score=score, status="needs_review",
        response={"owner": user["username"], "findings": [finding.model_dump() for finding in findings],
                  "analysis_engine": engine, "data_handling": audit_data_handling(engine)},
    )
    db.add(audit)
    db.commit()
    db.refresh(audit)
    return AuditResponse(
        id=audit.id, policy_id=audit.policy_id, content_type=audit.content_type,
        score=audit.score, status=audit.status, findings=findings,
        content_preview=preview, analysis_engine=engine,
        data_handling=audit_data_handling(engine), created_at=audit.created_at,
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
    score, findings, engine = audit_text_with_provider(payload.content, policy)
    audit = Audit(
        policy_id=policy.id, content_type="text", content=payload.content, score=score,
        status="needs_review",
        response={"owner": user["username"], "findings": [finding.model_dump() for finding in findings],
                  "analysis_engine": engine, "data_handling": audit_data_handling(engine)},
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
        data_handling=audit_data_handling(engine), created_at=audit.created_at,
    )


@app.get("/api/audits/{audit_id}/revisions", response_model=list[RevisionResponse])
def list_revisions(
    audit_id: str, db: Session = Depends(get_db), user: dict[str, str] = Depends(get_current_user)
) -> list[Revision]:
    accessible_audit(db, audit_id, user)
    return list(db.scalars(
        select(Revision).where(Revision.parent_audit_id == audit_id).order_by(Revision.created_at)
    ))


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
