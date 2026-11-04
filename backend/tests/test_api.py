from io import BytesIO

from PIL import Image

from app.db import Base, SessionLocal, engine
from app.main import create_audit, create_policy, create_review
from app.models import BrandPolicy
from app.schemas import AuditCreate, BrandPolicyCreate, ReviewCreate
from app.services import audit_uploaded_file


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
        )
        assert audit.status == "needs_review"
        assert len(audit.findings) == 2

        review = create_review(
            audit.id,
            ReviewCreate(reviewer_role="manager", status="changes_requested", comment="Add evidence."),
            db,
        )
        assert review.status == "changes_requested"
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
    assert image_score == 85
    assert image_findings[0].category == "visual_consistency"
