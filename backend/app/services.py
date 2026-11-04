import re
import base64
import json
from io import BytesIO
from typing import Any

import httpx
from docx import Document
from PIL import Image, ImageColor
from pypdf import PdfReader

from .models import BrandPolicy
from .schemas import Finding
from .config import get_settings

settings = get_settings()


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
    promotional_patterns += [r"\b\d+(?:\.\d+)?x\s+faster\b", r"\$\d+(?:\.\d+)?\s*(?:million|billion|[mb]\b)?"]
    approved = {" ".join(fact.casefold().split()) for fact in policy.approved_facts or []}
    for sentence in re.split(r"(?<=[.!?])\s+|\n+", content):
        if " ".join(sentence.casefold().split()).rstrip(".") in {fact.rstrip(".") for fact in approved}:
            continue
        for pattern in promotional_patterns:
            match = re.search(pattern, sentence, flags=re.IGNORECASE)
            if match:
                findings.append(Finding(
                    category="unsupported_claim", severity="high",
                    message="This statement does not match an approved fact.",
                    evidence=match.group(0),
                    suggestion="Cite an approved source or replace the claim with a verified statement.",
                    source=f"{policy.name} / Approved facts",
                ))
    for rule in policy.guidelines or []:
        kind, _, body = rule.partition(":")
        phrase, separator, replacement = body.partition("=>")
        if kind.lower() not in {"tone", "messaging"} or not separator or not phrase.strip():
            continue
        if re.search(r"(?<!\w)" + re.escape(phrase.strip()) + r"(?!\w)", content, re.IGNORECASE):
            findings.append(Finding(
                category=kind.lower(), severity="medium", message="Draft wording conflicts with this guideline.",
                evidence=phrase.strip(), suggestion=replacement.strip(), source=f"{policy.name} / {rule}",
            ))
    for match in re.finditer(r"!\[\s*\]\([^)]+\)", content):
        findings.append(Finding(
            category="accessibility", severity="low", message="Markdown image has empty alternative text.",
            evidence=match.group(0), suggestion="Describe the image’s purpose if it conveys information.",
            source="BrandGuard Markdown accessibility check",
        ))

    score = max(0, 100 - sum(20 if f.severity == "high" else 10 for f in findings))
    return score, findings


def _policy_prompt(policy: BrandPolicy) -> str:
    return json.dumps({
        "name": policy.name,
        "guidelines": policy.guidelines or [],
        "approved_facts": policy.approved_facts or [],
        "banned_terms": policy.banned_terms or [],
        "approved_terms": policy.approved_terms or {},
    }, ensure_ascii=False)


def _gemini_request(prompt: str, image: tuple[str, bytes] | None = None) -> tuple[int, list[Finding]]:
    parts: list[dict[str, Any]] = [{"text": prompt}]
    if image:
        media_type, data = image
        parts.append({"inline_data": {"mime_type": media_type, "data": base64.b64encode(data).decode("ascii")}})
    response = httpx.post(
        f"https://generativelanguage.googleapis.com/v1beta/models/{settings.gemini_model}:generateContent",
        headers={"x-goog-api-key": settings.gemini_api_key or "", "Content-Type": "application/json"},
        json={
            "contents": [{"parts": parts}],
            "generationConfig": {"temperature": 0.1, "maxOutputTokens": 2500, "responseMimeType": "application/json"},
        },
        timeout=30,
    )
    response.raise_for_status()
    text = response.json()["candidates"][0]["content"]["parts"][0]["text"]
    result = json.loads(text)
    findings = [Finding(**finding) for finding in result.get("findings", [])]
    score = max(0, min(100, int(result.get("score", 100))))
    return score, findings


def audit_text_with_provider(content: str, policy: BrandPolicy) -> tuple[int, list[Finding], str]:
    if settings.gemini_api_key:
        prompt = f"""You are BrandGuard, an explainable brand-governance reviewer.
Review the draft against the policy below. Preserve creator intent. Find tone, terminology,
messaging, accessibility, factual, and unsupported promotional-claim issues.
Return JSON only with this shape: {{\"score\": 0, \"findings\": [{{\"category\": \"tone|terminology|messaging|accessibility|unsupported_claim|visual_consistency\", \"severity\": \"low|medium|high\", \"message\": \"why it was flagged\", \"evidence\": \"exact evidence\", \"suggestion\": \"specific correction\", \"source\": \"policy section or approved fact\"}}]}}.
Policy: {_policy_prompt(policy)}
Draft: {content}"""
        try:
            score, findings = _gemini_request(prompt)
            return score, findings, f"Gemini {settings.gemini_model}"
        except (httpx.HTTPError, KeyError, TypeError, ValueError, json.JSONDecodeError):
            pass
    score, findings = audit_text(content, policy)
    return score, findings, "BrandGuard deterministic policy engine"


def extract_document_text(filename: str, data: bytes) -> str:
    suffix = filename.lower().rsplit(".", 1)[-1] if "." in filename else ""
    if suffix == "pdf":
        return "\n".join(page.extract_text() or "" for page in PdfReader(BytesIO(data)).pages)
    if suffix == "docx":
        return "\n".join(paragraph.text for paragraph in Document(BytesIO(data)).paragraphs)
    if suffix not in {"txt", "md"}:
        raise ValueError("Unsupported document format")
    return data.decode("utf-8-sig")


def audit_uploaded_file(filename: str, media_type: str | None, data: bytes, policy: BrandPolicy):
    if (media_type or "").startswith("image/"):
        image = Image.open(BytesIO(data))
        width, height = image.size
        if width * height > 20_000_000:
            raise ValueError("Image is too large to analyze")
        image.thumbnail((96, 96))
        colors = image.convert("RGB").quantize(colors=5).convert("RGB").getcolors()
        palette = [
            ImageColor.getrgb(value.strip()) for line in policy.guidelines or []
            if line.lower().startswith("palette:")
            for value in line.split(":", 1)[1].split(",")
            if re.fullmatch(r"#[0-9a-fA-F]{6}", value.strip())
        ]
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
        if palette and colors:
            _, dominant = max(colors)
            if min(sum((a - b) ** 2 for a, b in zip(dominant, color)) for color in palette) > 3600:
                findings.append(Finding(
                    category="visual_consistency", severity="medium",
                    message="The dominant sampled color falls outside the approved palette.",
                    evidence="#{:02x}{:02x}{:02x}".format(*dominant),
                    suggestion="Use an approved color for dominant brand elements and review photographic exceptions.",
                    source=f"{policy.name} / Palette",
                ))
        return max(0, 100 - 10 * len(findings)), findings, ""

    content = extract_document_text(filename, data)
    if not content.strip():
        raise ValueError("No extractable text")
    score, findings = audit_text(content, policy)
    return score, findings, content[:4000]


def audit_uploaded_file_with_provider(filename: str, media_type: str | None, data: bytes, policy: BrandPolicy):
    if settings.gemini_api_key:
        if (media_type or "").startswith("image/"):
            prompt = f"Review this image for brand consistency, accessibility, and visual policy violations. Return the required JSON schema. Policy: {_policy_prompt(policy)}"
            try:
                score, findings = _gemini_request(prompt, (media_type or "image/png", data))
                return score, findings, f"Gemini {settings.gemini_model} vision", ""
            except (httpx.HTTPError, KeyError, TypeError, ValueError, json.JSONDecodeError):
                pass
        else:
            content = extract_document_text(filename, data)
            score, findings, engine = audit_text_with_provider(content, policy)
            return score, findings, engine, content[:4000]
    score, findings, preview = audit_uploaded_file(filename, media_type, data, policy)
    return score, findings, "BrandGuard deterministic policy engine", preview
