"""Saved audit reports. Report generation never calls an AI provider."""

import hashlib
from datetime import UTC, datetime
from io import BytesIO
from pathlib import Path
from typing import Literal
from xml.sax.saxutils import escape

import reportlab
from pydantic import BaseModel
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import KeepTogether, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import Audit, BrandPolicy, Review, Revision
from .schemas import AuditResponse, BrandPolicyResponse, ReviewResponse


class ReportReview(ReviewResponse):
    reviewer_username: str | None = None


class AuditReport(BaseModel):
    report_version: str = "1.0"
    generated_at: datetime
    audit: AuditResponse
    owner: str | None
    source_filename: str | None
    policy_snapshot: BrandPolicyResponse | None
    content: str
    content_coverage: Literal["full_text", "retained_excerpt", "image_not_retained"]
    content_sha256: str | None
    automated_assessment: Literal["ai_review", "local_checks", "not_recorded"]
    required_reviewer: Literal["manager_or_legal", "legal"]
    reviews: list[ReportReview]
    notes: list[str]


def utc(value: datetime) -> datetime:
    return value.replace(tzinfo=UTC) if value.tzinfo is None else value.astimezone(UTC)


def capture_policy(policy: BrandPolicy) -> dict:
    snapshot = BrandPolicyResponse.model_validate(policy)
    snapshot.created_at = utc(snapshot.created_at)
    return snapshot.model_dump(mode="json")


def build_report(db: Session, audit: Audit) -> AuditReport:
    metadata = audit.response or {}
    engine = metadata.get("analysis_engine", "Not recorded for this older audit")
    assessment = (
        "ai_review" if engine.startswith(("Groq ", "Gemini "))
        else "local_checks" if "deterministic policy engine" in engine else "not_recorded"
    )
    coverage = metadata.get("content_coverage") or (
        "image_not_retained" if audit.content_type == "image"
        else "retained_excerpt" if audit.content_type == "document" else "full_text"
    )
    parent = db.scalar(select(Revision.parent_audit_id).where(Revision.audit_id == audit.id))
    findings = metadata.get("findings", [])
    audit_data = AuditResponse(
        id=audit.id, policy_id=audit.policy_id, content_type=audit.content_type,
        score=audit.score, status=audit.status, findings=findings,
        content_preview=audit.content[:4000], analysis_engine=engine,
        data_handling=metadata.get("data_handling", "Provider usage was not recorded."),
        parent_audit_id=parent, created_at=utc(audit.created_at),
        retrieved_sources=metadata.get("retrieved_sources", []),
        retrieval_method=metadata.get("retrieval_method"),
    )
    reviews = [
        ReportReview(
            id=review.id, audit_id=audit.id, reviewer_role=review.reviewer_role,
            status=review.status, comment=review.comment, created_at=utc(review.created_at),
            reviewer_username=metadata.get("review_authors", {}).get(review.id),
        )
        for review in db.scalars(
            select(Review).where(Review.audit_id == audit.id).order_by(Review.created_at, Review.id)
        )
    ]
    notes = [
        "Automated findings and the human review decision are separate. A score of 100 is not approval.",
        "This report records one saved audit revision; it is not a regulatory compliance certificate.",
    ]
    if not metadata.get("policy_snapshot"):
        notes.append("The policy snapshot was not recorded for this older audit.")
    if coverage == "retained_excerpt":
        notes.append("Only a retained text excerpt is available for this older document audit.")
    if coverage == "image_not_retained":
        notes.append("The original image is not retained. Findings are recorded; no image hash is claimed.")
    if assessment != "ai_review":
        notes.append("An AI review is not recorded as completed; inspect the analysis engine details.")
    if any(review.reviewer_username is None for review in reviews):
        notes.append("Individual reviewer identities were not recorded for some older review entries.")
    return AuditReport(
        generated_at=datetime.now(UTC), audit=audit_data, owner=metadata.get("owner"),
        source_filename=metadata.get("source_filename"),
        policy_snapshot=metadata.get("policy_snapshot"), content=audit.content,
        content_coverage=coverage,
        content_sha256=(hashlib.sha256(audit.content.encode("utf-8")).hexdigest()
                        if coverage != "image_not_retained" else None),
        automated_assessment=assessment,
        required_reviewer=("legal" if any(f["severity"] == "high" for f in findings)
                           else "manager_or_legal"),
        reviews=reviews, notes=notes,
    )


_font_dir = Path(reportlab.__file__).parent / "fonts"
pdfmetrics.registerFont(TTFont("ReportBody", str(_font_dir / "Vera.ttf")))
pdfmetrics.registerFont(TTFont("ReportBold", str(_font_dir / "VeraBd.ttf")))
pdfmetrics.registerFontFamily("ReportBody", normal="ReportBody", bold="ReportBold")


def render_report_pdf(report: AuditReport) -> bytes:
    """Paginated, escaped, searchable PDF from the same model served as JSON."""
    stream = BytesIO()
    violet = colors.HexColor("#6d28d9")
    ink = colors.HexColor("#251b38")
    muted = colors.HexColor("#655a74")
    base = {"fontName": "ReportBody", "fontSize": 9, "leading": 14, "textColor": ink,
            "alignment": TA_LEFT, "splitLongWords": True, "spaceAfter": 7}
    body = ParagraphStyle("Body", **base)
    title = ParagraphStyle("Title", parent=body, fontName="ReportBold", fontSize=25,
                           leading=32, textColor=violet, spaceAfter=14)
    heading = ParagraphStyle("Heading", parent=body, fontName="ReportBold", fontSize=13,
                             leading=20, spaceBefore=15, keepWithNext=True)
    small = ParagraphStyle("Small", parent=body, fontSize=7.5, leading=11, textColor=muted)
    glyphs = pdfmetrics.getFont("ReportBody").face.charToGlyph
    unsupported = set()

    def p(value, style=body):
        text = str(value if value is not None else "Not recorded")
        safe = []
        for char in text:
            if ord(char) in glyphs or char in "\n\t\r":
                safe.append(char)
            else:
                unsupported.add(char)
                safe.append(f"[U+{ord(char):04X}]")
        return Paragraph(escape("".join(safe)).replace("\n", "<br/>"), style)

    def label(value):
        return value.replace("_", " ").capitalize()

    audit = report.audit
    story = [p("BRANDGUARD / AUDIT RECORD", small), p("Content audit report", title),
             p("Saved findings. Recorded decisions. One traceable revision.", body)]
    details = [
        ("AUDIT ID", audit.id), ("AUDITED AT (UTC)", audit.created_at.strftime("%Y-%m-%d %H:%M:%S")),
        ("GENERATED AT (UTC)", report.generated_at.strftime("%Y-%m-%d %H:%M:%S")),
        ("READINESS SCORE", f"{audit.score} / 100"), ("REVIEW STATUS", label(audit.status)),
        ("ANALYSIS ENGINE", audit.analysis_engine), ("AUTOMATED ASSESSMENT", label(report.automated_assessment)),
        ("CONTENT TYPE", audit.content_type),
        ("SOURCE FILE", report.source_filename or ("Text draft" if audit.content_type == "text" else "Upload")),
        ("OWNER", report.owner), ("PARENT REVISION", audit.parent_audit_id or "Original audit"),
        ("REQUIRED REVIEWER", label(report.required_reviewer)),
    ]
    table = Table([[p(k, small), p(v)] for k, v in details], colWidths=[137, 362], hAlign="LEFT")
    table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"), ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f6f3fb")),
        ("LEFTPADDING", (0, 0), (-1, -1), 12), ("RIGHTPADDING", (0, 0), (-1, -1), 12),
        ("TOPPADDING", (0, 0), (-1, -1), 5), ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))
    story += [Spacer(1, 12), table, p("01 / Automated findings", heading)]
    if not audit.findings:
        story.append(p("No findings were recorded by the selected analysis engine. Human review status is shown separately."))
    for index, finding in enumerate(audit.findings, 1):
        story += [p(f"{index}. {label(finding.category)} / {finding.severity.upper()}", heading),
                  p(finding.message), p("Evidence: " + finding.evidence),
                  p("Suggestion: " + finding.suggestion), p("Policy source: " + finding.source, small)]
        if verification := finding.verification:
            story.append(p(f"Evidence check / {label(verification.status)}", small))
            story.append(p(verification.reason, small))
            for citation in verification.citations:
                story.append(p(f"[{citation.citation_id}] {label(citation.status)}. {citation.reason}", small))
                if citation.quote:
                    story.append(p(f'"{citation.quote}"', small))
    if audit.retrieval_method:
        story += [p("Retrieved guideline evidence", heading), p(audit.retrieval_method, small)]
        if not audit.retrieved_sources:
            story.append(p("No relevant source passage was retrieved. Missing facts are not inferred."))
        for source in audit.retrieved_sources:
            story += [p(f"[{source.citation_id}] {source.filename} / page {source.page} / {source.chunk_id}", heading),
                      p(source.text), p("Source PDF SHA-256: " + source.document_sha256, small)]
    if not report.reviews:
        story += [p("02 / Human review history", heading),
                  p("No human reviews have been recorded for this revision.")]
    for index, review in enumerate(report.reviews):
        block = [p("02 / Human review history", heading)] if index == 0 else []
        block += [
            p(f"{label(review.reviewer_role)} - {label(review.status)}", heading),
            p(f"{review.created_at.strftime('%Y-%m-%d %H:%M:%S UTC')} | "
              f"Reviewer: {review.reviewer_username or 'Identity not recorded'}", small),
            p(review.comment or "No comment provided."),
        ]
        story.append(KeepTogether(block))
    story.append(p("03 / Policy captured at audit time", heading))
    policy = report.policy_snapshot
    if policy:
        story += [p(policy.name), p("Policy ID: " + policy.id, small)]
        for name, values in (("Guidelines", policy.guidelines), ("Approved facts", policy.approved_facts),
                             ("Banned terms", policy.banned_terms)):
            story.append(p(name, heading))
            story.extend(p("- " + item) for item in values)
            if not values:
                story.append(p("None recorded.", small))
        if policy.approved_terms:
            story.append(p("Approved replacements", heading))
            story.extend(p(f"{term} -> {replacement}") for term, replacement in policy.approved_terms.items())
    else:
        story.append(p("Historical policy snapshot unavailable. Current policy rules are not substituted."))
    story += [p("04 / Saved content", heading), p("Coverage: " + label(report.content_coverage), small)]
    if report.content_sha256:
        story += [p("Saved text SHA-256: " + report.content_sha256, small),
                  p("This checksum identifies the saved UTF-8 text. It is not a digital signature.", small)]
    story.extend(p(line or " ") for line in report.content.splitlines())
    if not report.content:
        story.append(p("No source text was retained."))
    story += [p("05 / Report notes", heading)]
    story.extend(p("- " + note, small) for note in report.notes)
    story.append(p(audit.data_handling, small))
    if unsupported:
        story.append(p("Characters outside the PDF font are shown as [U+code] labels. The JSON download preserves the original Unicode text.", small))

    def page(canvas, doc):
        canvas.saveState()
        canvas.setFillColor(violet)
        canvas.rect(0, A4[1] - 8, A4[0], 8, fill=1, stroke=0)
        canvas.setFont("ReportBody", 7)
        canvas.setFillColor(muted)
        canvas.drawString(48, 29, "BrandGuard audit record - " + audit.id[:8])
        canvas.drawRightString(A4[0] - 48, 29, f"Page {doc.page}")
        canvas.restoreState()

    SimpleDocTemplate(stream, pagesize=A4, rightMargin=48, leftMargin=48,
                      topMargin=42, bottomMargin=48, title=f"BrandGuard audit {audit.id}",
                      author="BrandGuard").build(story, onFirstPage=page, onLaterPages=page)
    return stream.getvalue()
