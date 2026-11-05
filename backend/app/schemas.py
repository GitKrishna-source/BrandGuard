from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class BrandPolicyCreate(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    guidelines: list[str] = Field(default_factory=list)
    approved_facts: list[str] = Field(default_factory=list)
    banned_terms: list[str] = Field(default_factory=list)
    approved_terms: dict[str, str] = Field(default_factory=dict)


class BrandPolicyResponse(BrandPolicyCreate):
    id: str
    created_at: datetime

    model_config = {"from_attributes": True}


class BrandPolicyUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=160)
    guidelines: list[str] | None = None
    approved_facts: list[str] | None = None
    banned_terms: list[str] | None = None
    approved_terms: dict[str, str] | None = None


class AuditCreate(BaseModel):
    policy_id: str | None = None
    content_type: Literal["text", "document", "image"] = "text"
    content: str = Field(min_length=1)


class Finding(BaseModel):
    category: str
    severity: Literal["low", "medium", "high"]
    message: str
    evidence: str
    suggestion: str
    source: str


class RetrievedSource(BaseModel):
    citation_id: str
    document_id: str
    filename: str
    page: int
    chunk_id: str
    text: str
    document_sha256: str
    relevance: float


class GuidelineDocumentResponse(BaseModel):
    id: str
    policy_id: str
    brand_name: str
    filename: str
    page_count: int
    chunk_count: int
    sha256: str
    shared_demo: bool
    retrieval_method: str = "BM25 keyword retrieval over page-labelled PDF passages"


class AuditResponse(BaseModel):
    id: str
    policy_id: str
    content_type: str
    score: int
    status: str
    findings: list[Finding]
    content_preview: str | None = None
    analysis_engine: str = "BrandGuard deterministic policy engine"
    data_handling: str = "No external AI service receives drafts. Draft text or excerpts and results are retained."
    parent_audit_id: str | None = None
    retrieved_sources: list[RetrievedSource] = Field(default_factory=list)
    retrieval_method: str | None = None
    created_at: datetime


class RevisionCreate(BaseModel):
    content: str = Field(min_length=1)
    summary: str = Field(default="Content revised and re-audited", max_length=240)


class RevisionResponse(BaseModel):
    id: str
    parent_audit_id: str
    audit_id: str
    author: str
    summary: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ViolationInsight(BaseModel):
    category: str
    occurrences: int
    severity: str


class ContentTypeInsight(BaseModel):
    content_type: str
    audits: int
    average_score: int


class GovernanceInsights(BaseModel):
    total_audits: int
    flagged_audits: int
    intercept_rate: int
    average_score: int
    top_violations: list[ViolationInsight]
    content_types: list[ContentTypeInsight]
    unclear_guidelines: list[str]


class ReviewCreate(BaseModel):
    reviewer_role: Literal["creator", "manager", "legal"]
    status: Literal["pending", "approved", "rejected", "changes_requested"] = "pending"
    comment: str | None = None


class ReviewResponse(ReviewCreate):
    id: str
    audit_id: str
    created_at: datetime

    model_config = {"from_attributes": True}


class HealthResponse(BaseModel):
    status: str
    environment: str


class LoginRequest(BaseModel):
    username: str
    password: str


class DemoLoginRequest(BaseModel):
    role: Literal["creator", "manager", "legal"]


class AuthUser(BaseModel):
    username: str
    role: Literal["creator", "manager", "legal"]


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: AuthUser


class RemediateRequest(BaseModel):
    content: str = Field(min_length=1, max_length=15000)
    policy_id: str | None = None


class RemediateResponse(BaseModel):
    original: str
    fixed_content: str
    changes_summary: str
    analysis_engine: str
