import re
from io import BytesIO

from docx import Document
from PIL import Image
from pypdf import PdfReader

from .models import BrandPolicy
from .schemas import Finding


def audit_text(content: str, policy: BrandPolicy) -> tuple[int, list[Finding]]:
    """Deterministic baseline checks; an LLM provider can be added behind this boundary later."""
    findings: list[Finding] = []
    lower_content = content.lower()

    for term in policy.banned_terms or []:
        if term.lower() in lower_content:
            replacement = (policy.approved_terms or {}).get(term, "approved brand terminology")
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

    for fact in policy.approved_facts or []:
        if fact.lower() in lower_content:
            continue

    score = max(0, 100 - sum(20 if f.severity == "high" else 10 for f in findings))
    return score, findings


def extract_document_text(filename: str, data: bytes) -> str:
    suffix = filename.lower().rsplit(".", 1)[-1] if "." in filename else ""
    if suffix == "pdf":
        return "\n".join(page.extract_text() or "" for page in PdfReader(BytesIO(data)).pages)
    if suffix == "docx":
        return "\n".join(paragraph.text for paragraph in Document(BytesIO(data)).paragraphs)
    return data.decode("utf-8", errors="replace")


def audit_uploaded_file(filename: str, media_type: str | None, data: bytes, policy: BrandPolicy):
    if (media_type or "").startswith("image/"):
        image = Image.open(BytesIO(data))
        width, height = image.size
        findings = [
            Finding(
                category="visual_consistency",
                severity="medium",
                message="Visual asset received for brand review; palette and placement require policy-aware vision checks.",
                evidence=f"{filename} ({width}×{height}, {image.mode})",
                suggestion="Confirm approved palette, logo clear space, and accessible contrast before publication.",
                source=f"Brand policy: {policy.name}",
            )
        ]
        return 85, findings, ""

    content = extract_document_text(filename, data)
    score, findings = audit_text(content, policy)
    return score, findings, content[:4000]
