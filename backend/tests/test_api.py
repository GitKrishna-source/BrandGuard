from io import BytesIO

import pytest
from fastapi import HTTPException
from PIL import Image

from app.auth import authenticate
from app.db import Base, SessionLocal, engine
from app.main import (
    create_audit,
    create_policy,
    create_review,
    create_revision,
    list_audits,
    list_reviews,
)
from app.models import BrandPolicy
from app.schemas import AuditCreate, BrandPolicyCreate, ReviewCreate, RevisionCreate
from app.services import audit_uploaded_file


@pytest.fixture(autouse=True)
def local_audits_only(monkeypatch):
    # API tests must not send drafts to a real provider when a developer has a key.
    monkeypatch.setattr("app.services.settings.gemini_api_key", None)
    monkeypatch.setattr("app.services.settings.groq_api_key", None)


def test_policy_audit_and_review_flow():
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        policy = create_policy(
            BrandPolicyCreate(
                name="Default policy",
                guidelines=["Use precise, evidence-backed language."],
                approved_facts=["99.99% historical uptime"],
                banned_terms=["customer support rep"],
                approved_terms={"customer support rep": "Brand Success Specialist"},
            ),
            db,
        )
        audit = create_audit(
            AuditCreate(
                policy_id=policy.id,
                content_type="text",
                content="We are guaranteed 100% bug-free. Contact our customer support rep.",
            ),
            db,
            {"username": "creator@brandguard.local", "role": "creator"},
        )
        assert audit.status == "needs_review"
        assert len(audit.findings) == 2

        review = create_review(
            audit.id,
            ReviewCreate(reviewer_role="manager", status="changes_requested", comment="Add evidence."),
            db,
            {"username": "manager@brandguard.local", "role": "manager"},
        )
        assert review.status == "changes_requested"
        with pytest.raises(HTTPException) as error:
            create_review(
                audit.id,
                ReviewCreate(reviewer_role="creator", status="approved"),
                db,
                {"username": "creator@brandguard.local", "role": "creator"},
            )
        assert error.value.status_code == 403
        with pytest.raises(HTTPException) as error:
            list_reviews(audit.id, db, {"username": "other", "role": "creator"})
        assert error.value.status_code == 404
        with pytest.raises(HTTPException) as error:
            create_review(audit.id, ReviewCreate(reviewer_role="manager", status="approved"), db,
                          {"username": "manager", "role": "manager"})
        assert error.value.status_code == 403
        revision = create_revision(audit.id, RevisionCreate(content="Contact our team."), db,
                                   {"username": "creator@brandguard.local", "role": "creator"})
        assert revision.score == 100
        assert revision.status == "needs_review"
    finally:
        db.close()


def test_uploaded_document_and_image_audits():
    policy = BrandPolicy(name="Upload policy", banned_terms=["customer support rep"], approved_terms={})
    score, findings, preview = audit_uploaded_file(
        "release.md", "text/markdown", b"Contact our customer support rep for guaranteed results.", policy
    )
    assert score < 100
    assert findings
    assert "customer support rep" in preview

    image_buffer = BytesIO()
    Image.new("RGB", (120, 80), "#38bdf8").save(image_buffer, format="PNG")
    image_score, image_findings, _ = audit_uploaded_file(
        "creative.png", "image/png", image_buffer.getvalue(), policy
    )
    assert image_score == 90
    assert image_findings[0].category == "visual_consistency"


def test_demo_authentication_returns_role():
    user = authenticate("manager@brandguard.local", "manager-demo")
    assert user == {"username": "manager@brandguard.local", "role": "manager"}


def test_provider_metadata_is_returned_and_preserved_in_history(monkeypatch):
    monkeypatch.setattr("app.main.audit_text_with_provider", lambda content, policy: (
        100, [], "Gemini test-model"
    ))
    Base.metadata.create_all(bind=engine)
    user = {"username": "provider-test@brandguard.local", "role": "creator"}
    with SessionLocal() as db:
        policy = create_policy(BrandPolicyCreate(name="Provider metadata test"), db)
        audit = create_audit(
            AuditCreate(policy_id=policy.id, content="Service interruptions may occur."), db, user
        )
        assert audit.analysis_engine == "Gemini test-model"
        assert "sent to Google Gemini" in audit.data_handling
        saved = next(item for item in list_audits(None, db, user) if item.id == audit.id)
        assert saved.analysis_engine == audit.analysis_engine
        assert saved.data_handling == audit.data_handling
        revision = create_revision(audit.id, RevisionCreate(content="Updated draft."), db, user)
        assert revision.analysis_engine == "Gemini test-model"
        assert "sent to Google Gemini" in revision.data_handling
