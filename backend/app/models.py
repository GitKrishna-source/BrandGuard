from datetime import datetime
from typing import Any
from uuid import uuid4

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base


class BrandPolicy(Base):
    __tablename__ = "brand_policies"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    name: Mapped[str] = mapped_column(String(160))
    guidelines: Mapped[list[str]] = mapped_column(JSON, default=list)
    approved_facts: Mapped[list[str]] = mapped_column(JSON, default=list)
    banned_terms: Mapped[list[str]] = mapped_column(JSON, default=list)
    approved_terms: Mapped[dict[str, str]] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class Audit(Base):
    __tablename__ = "audits"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    policy_id: Mapped[str] = mapped_column(ForeignKey("brand_policies.id"), index=True)
    content_type: Mapped[str] = mapped_column(String(32))
    content: Mapped[str] = mapped_column(Text)
    score: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(32), default="needs_review")
    response: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    policy: Mapped[BrandPolicy] = relationship()


class Review(Base):
    __tablename__ = "reviews"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    audit_id: Mapped[str] = mapped_column(ForeignKey("audits.id"), index=True)
    reviewer_role: Mapped[str] = mapped_column(String(32))
    status: Mapped[str] = mapped_column(String(32), default="pending")
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
