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


class AuditCreate(BaseModel):
    policy_id: str
    content_type: Literal["text", "document", "image"] = "text"
    content: str = Field(min_length=1)


class Finding(BaseModel):
    category: str
    severity: Literal["low", "medium", "high"]
    message: str
    evidence: str
    suggestion: str
    source: str


class AuditResponse(BaseModel):
    id: str
    policy_id: str
    content_type: str
    score: int
    status: str
    findings: list[Finding]
    created_at: datetime


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
