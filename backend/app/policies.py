"""Neutral defaults for audits that do not explicitly supply a brand policy."""

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .models import BrandPolicy

BASIC_POLICY_ID = "brandguard-basic-audit-v1"
BASIC_GUIDELINES = [
    "Use clear, direct, respectful language; flag specific clarity and grammar issues.",
    ("Request evidence, measurement criteria, scope, and timeframe for unsupported rankings "
     "and promotional or quantitative claims. Missing evidence does not prove a claim false."),
    "Preserve the author's meaning. Never invent replacement facts, metrics, or sources.",
    ("Brand names and third-party mentions are allowed. Do not assume a company, brand voice, "
     "competitor restriction, approved terminology, or industry-specific legal requirement."),
]


def get_basic_policy(db: Session) -> BrandPolicy:
    """Persist one versioned default without modifying existing policies or audits."""
    policy = db.get(BrandPolicy, BASIC_POLICY_ID)
    if policy is None:
        try:
            # Another worker may create the default at the same time. A savepoint
            # keeps the surrounding audit transaction usable on a unique-key race.
            with db.begin_nested():
                policy = BrandPolicy(
                    id=BASIC_POLICY_ID, name="General content audit",
                    guidelines=list(BASIC_GUIDELINES), approved_facts=[],
                    banned_terms=[], approved_terms={},
                )
                db.add(policy)
                db.flush()
        except IntegrityError:
            policy = db.get(BrandPolicy, BASIC_POLICY_ID)
            if policy is None:
                raise
    return policy
