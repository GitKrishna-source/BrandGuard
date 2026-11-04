import re

from .models import BrandPolicy
from .schemas import Finding


def audit_text(content: str, policy: BrandPolicy) -> tuple[int, list[Finding]]:
    """Deterministic baseline checks; an LLM provider can be added behind this boundary later."""
    findings: list[Finding] = []
    lower_content = content.lower()

    for term in policy.banned_terms:
        if term.lower() in lower_content:
            replacement = policy.approved_terms.get(term, "approved brand terminology")
            findings.append(
                Finding(
                    category="terminology",
                    severity="medium",
                    message=f"Banned terminology detected: {term}",
                    evidence=term,
                    suggestion=f"Replace it with: {replacement}",
                    source=f"Brand policy: {policy.name}",
                )
            )

    promotional_patterns = [
        r"\bguaranteed\b",
        r"\b100%\b",
        r"\bzero downtime\b",
        r"\b(best|cheapest|#1)\b",
        r"\b(up to|over)\s+\d+(?:\.\d+)?x\b",
    ]
    for pattern in promotional_patterns:
        match = re.search(pattern, content, flags=re.IGNORECASE)
        if match:
            evidence = match.group(0)
            findings.append(
                Finding(
                    category="unsupported_claim",
                    severity="high",
                    message="Promotional claim requires approved evidence before publication.",
                    evidence=evidence,
                    suggestion="Attach a verified source or soften the claim to a measurable, qualified statement.",
                    source="BrandGuard claim verification rule",
                )
            )

    for fact in policy.approved_facts:
        if fact.lower() in lower_content:
            continue

    score = max(0, 100 - sum(20 if f.severity == "high" else 10 for f in findings))
    return score, findings
