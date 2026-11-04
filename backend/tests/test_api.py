from app.db import Base, SessionLocal, engine
from app.main import create_audit, create_policy, create_review
from app.schemas import AuditCreate, BrandPolicyCreate, ReviewCreate


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
