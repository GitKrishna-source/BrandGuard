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


class CitationCheck(BaseModel):
    citation_id: str
    status: Literal["supported", "weak", "unsupported", "unverified"]
    reason: str
    quote: str | None = None


class EvidenceVerification(BaseModel):
    status: Literal["supported", "weak", "unsupported", "unverified", "uncited"]
    reason: str
    citations: list[CitationCheck] = Field(default_factory=list)


class Finding(BaseModel):
    category: str
    severity: Literal["low", "medium", "high"]
    message: str
    evidence: str
    suggestion: str
    source: str
    verification: EvidenceVerification | None = None


class RetrievedSource(BaseModel):
    citation_id: str
    document_id: str
    filename: str
    page: int
    chunk_id: str
    text: str
    document_sha256: str
    relevance: float
    match_types: list[Literal["keyword", "semantic"]] = Field(default_factory=list)
    extraction_method: Literal["native_pdf", "ocr"] | None = None
    ocr_confidence: float | None = None


class ExtractedPage(BaseModel):
    page: int = Field(..., ge=1)
    text: str = ""
    extraction_method: Literal["native_pdf", "ocr"]
    ocr_confidence: float | None = Field(default=None, ge=0.0, le=1.0)
    low_confidence: bool = False
    status: Literal["extracted", "low_confidence", "unreadable", "empty", "failed"] = "extracted"
    error: str | None = None
    has_images: bool = False
    char_count: int = 0
    retryable: bool = False


class DuplicateDocumentInfo(BaseModel):
    document_id: str
    policy_id: str
    brand_name: str
    filename: str
    sha256: str


class GuidelineExtractionPreview(BaseModel):
    filename: str
    sha256: str
    source_type: Literal["pdf", "jpg", "jpeg", "png"]
    detected_kind: Literal["native_pdf", "scanned_pdf", "mixed_pdf", "image"]
    page_count: int
    usable_page_count: int
    failed_page_count: int
    low_confidence_page_count: int
    native_page_count: int
    ocr_page_count: int
    extraction_methods: list[Literal["native_pdf", "ocr"]] = Field(default_factory=list)
    average_ocr_confidence: float | None = None
    warnings: list[str] = Field(default_factory=list)
    duplicate_of: DuplicateDocumentInfo | None = None
    pages: list[ExtractedPage] = Field(default_factory=list)


class ReviewedPageInput(BaseModel):
    page: int = Field(..., ge=1, le=200)
    text: str
    extraction_method: Literal["native_pdf", "ocr"] = "ocr"
    ocr_confidence: float | None = Field(default=None, ge=0.0, le=1.0)


class GuidelinePageRetryResponse(BaseModel):
    filename: str
    page: int
    page_data: ExtractedPage


class GuidelineDocumentResponse(BaseModel):
    id: str
    policy_id: str
    brand_name: str
    filename: str
    page_count: int
    chunk_count: int
    sha256: str
    shared_demo: bool
    retrieval_method: str
    source_type: Literal["pdf", "jpg", "jpeg", "png"] = "pdf"
    detected_kind: Literal["native_pdf", "scanned_pdf", "mixed_pdf", "image"] = "native_pdf"
    extraction_methods: list[Literal["native_pdf", "ocr"]] = Field(default_factory=list)
    native_page_count: int = 0
    ocr_page_count: int = 0
    average_ocr_confidence: float | None = None
    duplicate_of: DuplicateDocumentInfo | None = None
    pages: list[ExtractedPage] = Field(default_factory=list)


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


class RemediationExplanation(BaseModel):
    before: str = Field(max_length=30000)
    after: str = Field(max_length=30000)
    reason: str = Field(min_length=1, max_length=1000)


class RemediationEdit(BaseModel):
    id: str
    start: int = Field(ge=0, description="UTF-16 start offset in the original draft")
    end: int = Field(ge=0, description="Exclusive UTF-16 end offset in the original draft")
    original: str
    replacement: str
    explanation: str
    source: str | None = None


class RemediateResponse(BaseModel):
    original: str
    fixed_content: str
    changes_summary: str
    analysis_engine: str
    edits: list[RemediationEdit] = Field(default_factory=list)
    data_handling: str = ""


class WordPressConnectRequest(BaseModel):
    site_url: str = Field(min_length=1, max_length=500)
    username: str = Field(min_length=1, max_length=120)
    app_password: str = Field(min_length=1, max_length=120)


class WordPressConnectResponse(BaseModel):
    success: bool
    site_url: str
    username: str
    site_name: str | None = None
    user_display_name: str | None = None


class WordPressDraft(BaseModel):
    id: int
    title: str
    content: str
    excerpt: str = ""
    date_modified: str
    status: str = "draft"
    link: str | None = None


class WordPressDraftsResponse(BaseModel):
    drafts: list[WordPressDraft] = Field(default_factory=list)


class WordPressSyncRequest(BaseModel):
    site_url: str = Field(min_length=1, max_length=500)
    username: str = Field(min_length=1, max_length=120)
    app_password: str = Field(min_length=1, max_length=120)
    post_id: int = Field(gt=0)
    content: str = Field(min_length=1)
    title: str | None = None
    audit_id: str = Field(min_length=1, max_length=36)
    expected_modified: str | None = None
    status: Literal["draft"] = "draft"


class WordPressSyncResponse(BaseModel):
    success: bool
    post_id: int
    title: str
    status: str
    audit_reference: str
    link: str | None = None
    message: str
    date_modified: str | None = None

