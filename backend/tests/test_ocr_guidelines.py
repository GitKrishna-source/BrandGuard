import json
from io import BytesIO

import httpx
import pypdfium2 as pdfium
import pytest
from fastapi.testclient import TestClient
from PIL import Image, ImageFilter
from pypdf import PdfReader, PdfWriter
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app import services
from app.auth import create_access_token
from app.db import Base, get_db
from app.main import app


def auth(role="manager", username=None):
    token = create_access_token({"username": username or f"{role}@brandguard.local", "role": role})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def client(monkeypatch):
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)

    def database():
        with Session(engine) as db:
            yield db

    monkeypatch.setattr(services.settings, "ai_provider", "local")
    app.dependency_overrides[get_db] = database
    try:
        with TestClient(app) as test_client:
            yield test_client
    finally:
        app.dependency_overrides.pop(get_db, None)
        engine.dispose()


def _text_pdf(pages_lines: list[list[str]]) -> bytes:
    stream = BytesIO()
    doc = canvas.Canvas(stream)
    for idx, lines in enumerate(pages_lines):
        if idx > 0:
            doc.showPage()
        doc.setFont("Helvetica", 14)
        for line_idx, line in enumerate(lines):
            doc.drawString(50, 770 - line_idx * 24, line)
    doc.save()
    return stream.getvalue()


def _render_text_image(
    lines: list[str],
    *,
    image_format: str = "PNG",
    rgba: bool = False,
    blurry: bool = False,
    dpi: int = 200,
) -> bytes:
    raw_pdf = _text_pdf([lines])
    pdfium_doc = pdfium.PdfDocument(raw_pdf)
    page = pdfium_doc[0]
    bitmap = page.render(scale=dpi / 72.0)
    try:
        pil_img = bitmap.to_pil().copy()
    finally:
        bitmap.close()
        page.close()
        pdfium_doc.close()

    if blurry:
        pil_img = pil_img.filter(ImageFilter.GaussianBlur(radius=2.5))
    if rgba and image_format.upper() == "PNG":
        # Put dark text over a transparent canvas to verify alpha-compositing before OCR
        rgba_img = pil_img.convert("RGBA")
        pixels = rgba_img.load()
        width, height = rgba_img.size
        for y in range(height):
            for x in range(width):
                r, g, b, _ = pixels[x, y]
                if r > 240 and g > 240 and b > 240:
                    pixels[x, y] = (255, 255, 255, 0)
        pil_img = rgba_img
    elif image_format.upper() in {"JPG", "JPEG"}:
        pil_img = pil_img.convert("RGB")

    out = BytesIO()
    pil_img.save(out, format=image_format.upper())
    return out.getvalue()


def _scanned_or_mixed_pdf(page_specs: list[dict]) -> bytes:
    stream = BytesIO()
    doc = canvas.Canvas(stream)
    page_w, page_h = doc._pagesize
    for idx, spec in enumerate(page_specs):
        if idx > 0:
            doc.showPage()
        kind = spec["kind"]
        if kind == "text":
            doc.setFont("Helvetica", 14)
            for line_idx, line in enumerate(spec["lines"]):
                doc.drawString(50, 770 - line_idx * 24, line)
        elif kind == "scan":
            img_bytes = _render_text_image(spec["lines"], image_format="PNG", dpi=200)
            doc.drawImage(ImageReader(BytesIO(img_bytes)), 0, 0, width=page_w, height=page_h)
        elif kind == "blank_scan":
            blank = Image.new("RGB", (800, 1100), (255, 255, 255))
            buf = BytesIO()
            blank.save(buf, format="PNG")
            doc.drawImage(ImageReader(BytesIO(buf.getvalue())), 0, 0, width=page_w, height=page_h)
        else:
            raise ValueError(f"Unknown test spec kind: {kind}")
    doc.save()
    return stream.getvalue()


def test_normal_text_pdf_preserves_native_extraction_and_page_refs(client):
    pdf_data = _text_pdf([
        ["Page 1 Company Overview. Use calm, verifiable copy at all times."],
        ["Terminology rule. Do not use \"miracle cure\"; use \"everyday comfort\"."],
        ["Claims rule. Avoid absolute performance guarantees without supporting evidence."],
    ])
    assert "".join(page.extract_text() or "" for page in PdfReader(BytesIO(pdf_data)).pages).strip()

    preview_res = client.post(
        "/api/guidelines/extract",
        headers=auth("manager"),
        files={"file": ("Digital_Brand_Guide.pdf", pdf_data, "application/pdf")},
    )
    assert preview_res.status_code == 200
    preview = preview_res.json()
    assert preview["detected_kind"] == "native_pdf"
    assert preview["native_page_count"] == 3
    assert preview["ocr_page_count"] == 0
    assert [p["page"] for p in preview["pages"]] == [1, 2, 3]
    assert all(p["extraction_method"] == "native_pdf" for p in preview["pages"])

    imp = client.post(
        "/api/guidelines/import",
        headers=auth("manager"),
        data={"brand_name": "Nordic Wear"},
        files={"file": ("Digital_Brand_Guide.pdf", pdf_data, "application/pdf")},
    )
    assert imp.status_code == 201
    doc = imp.json()
    assert doc["detected_kind"] == "native_pdf"

    audit = client.post(
        "/api/audits",
        headers=auth("manager"),
        json={
            "policy_id": doc["policy_id"],
            "content": "Our jacket offers a miracle cure and guaranteed dryness in storms.",
        },
    ).json()
    assert any("Digital_Brand_Guide.pdf, p. 2" in f["source"] for f in audit["findings"])
    assert any("Digital_Brand_Guide.pdf, p. 3" in f["source"] for f in audit["findings"])


def test_scanned_multipage_pdf_ocr_stream_page_refs_and_audit(client):
    scanned_pdf = _scanned_or_mixed_pdf([
        {"kind": "scan", "lines": ["Company introduction.", "Clearline Labs crafts durable instruments."]},
        {"kind": "scan", "lines": ["Brand voice and tone.", "Keep descriptions clear, factual, and grounded."]},
        {"kind": "scan", "lines": ["Typography guidelines.", "Use Inter for body paragraphs and clear hierarchy."]},
        {"kind": "scan", "lines": ["Approved terminology.", 'Do not use "miracle cure"; use "everyday relief".']},
        {"kind": "scan", "lines": ["Claims and prohibited statements.", "Avoid absolute performance guarantees without supporting evidence."]},
    ])
    # Verify there is genuinely no selectable PDF text layer on any page
    assert all((page.extract_text() or "").strip() == "" for page in PdfReader(BytesIO(scanned_pdf)).pages)

    stream_res = client.post(
        "/api/guidelines/extract?stream=true",
        headers=auth("legal"),
        files={"file": ("Scanned_Brand_Guidelines.pdf", scanned_pdf, "application/pdf")},
    )
    assert stream_res.status_code == 200
    events = [json.loads(line) for line in stream_res.text.splitlines() if line.strip()]
    stages = [event["stage"] for event in events]
    assert stages[0] == "detecting"
    assert "ocr" in stages
    assert stages[-1] == "completed"

    preview = events[-1]["result"]
    assert preview["filename"] == "Scanned_Brand_Guidelines.pdf"
    assert preview["detected_kind"] == "scanned_pdf"
    assert preview["page_count"] == 5
    assert preview["ocr_page_count"] == 5
    assert preview["native_page_count"] == 0
    assert preview["average_ocr_confidence"] is not None and preview["average_ocr_confidence"] > 0.65
    assert [p["page"] for p in preview["pages"]] == [1, 2, 3, 4, 5]
    assert "Clearline" in preview["pages"][0]["text"]
    assert "Inter" in preview["pages"][2]["text"]
    assert "miracle cure" in preview["pages"][3]["text"].lower()
    assert "guarantees" in preview["pages"][4]["text"].lower()
    assert all(p["extraction_method"] == "ocr" for p in preview["pages"])

    imported = client.post(
        "/api/guidelines/import",
        headers=auth("legal"),
        data={"brand_name": "Clearline Labs"},
        files={"file": ("Scanned_Brand_Guidelines.pdf", scanned_pdf, "application/pdf")},
    )
    assert imported.status_code == 201
    doc = imported.json()
    assert doc["detected_kind"] == "scanned_pdf"
    assert doc["ocr_page_count"] == 5
    assert [p["page"] for p in doc["pages"]] == [1, 2, 3, 4, 5]

    audit_res = client.post(
        "/api/audits",
        headers=auth("legal"),
        json={
            "policy_id": doc["policy_id"],
            "content": "Our device is a miracle cure that delivers guaranteed performance all day.",
        },
    )
    assert audit_res.status_code == 201
    audit = audit_res.json()
    assert any(src["extraction_method"] == "ocr" and src["ocr_confidence"] is not None for src in audit["retrieved_sources"])
    assert any("Scanned_Brand_Guidelines.pdf, p. 4" in f["source"] for f in audit["findings"])
    assert any("Scanned_Brand_Guidelines.pdf, p. 5" in f["source"] for f in audit["findings"])

    report_res = client.get(f"/api/audits/{audit['id']}/report", headers=auth("legal"))
    assert report_res.status_code == 200
    report = report_res.json()
    assert any("Scanned_Brand_Guidelines.pdf, p. 5" in f["source"] for f in report["audit"]["findings"])


def test_mixed_pdf_combines_native_and_ocr_pages_with_exact_numbers(client):
    mixed_pdf = _scanned_or_mixed_pdf([
        {"kind": "text", "lines": ["Introduction: Harbor Coffee roasts seasonal beans in small batches."]},
        {"kind": "scan", "lines": ["Packaging Claims: Avoid performance guarantees without supporting evidence."]},
        {"kind": "text", "lines": ['Terminology Guide: Do not use "instant boost"; use "morning ritual".']},
        {"kind": "scan", "lines": ["Typography: Keep labels high contrast and legible on matte sleeves."]},
    ])

    preview = client.post(
        "/api/guidelines/extract",
        headers=auth("manager"),
        files={"file": ("Harbor_Mixed_Manual.pdf", mixed_pdf, "application/pdf")},
    ).json()
    assert preview["detected_kind"] == "mixed_pdf"
    assert preview["native_page_count"] == 2
    assert preview["ocr_page_count"] == 2
    assert [p["extraction_method"] for p in preview["pages"]] == ["native_pdf", "ocr", "native_pdf", "ocr"]
    assert [p["page"] for p in preview["pages"]] == [1, 2, 3, 4]

    doc = client.post(
        "/api/guidelines/import",
        headers=auth("manager"),
        data={"brand_name": "Harbor Coffee"},
        files={"file": ("Harbor_Mixed_Manual.pdf", mixed_pdf, "application/pdf")},
    ).json()
    assert doc["detected_kind"] == "mixed_pdf"

    audit = client.post(
        "/api/audits",
        headers=auth("manager"),
        json={
            "policy_id": doc["policy_id"],
            "content": "Enjoy an instant boost with guaranteed energy from every cup.",
        },
    ).json()
    assert any("Harbor_Mixed_Manual.pdf, p. 2" in f["source"] for f in audit["findings"])
    assert any("Harbor_Mixed_Manual.pdf, p. 3" in f["source"] for f in audit["findings"])


def test_jpg_and_png_image_guidelines_ocr_download_and_audit(client):
    jpg_bytes = _render_text_image(
        [
            "Solstice Apparel Policy",
            'TERM: cheap wear => everyday apparel',
            "Never make sustainability guarantees without supporting evidence.",
        ],
        image_format="JPEG",
    )
    png_bytes = _render_text_image(
        [
            "Verdant Care Guidelines",
            'Do not use "miracle tonic"; use "daily moisturizer".',
        ],
        image_format="PNG",
        rgba=True,
    )

    jpg_preview = client.post(
        "/api/guidelines/extract",
        headers=auth("manager"),
        files={"file": ("solstice_rules.jpg", jpg_bytes, "image/jpeg")},
    )
    assert jpg_preview.status_code == 200
    assert jpg_preview.json()["detected_kind"] == "image"
    assert jpg_preview.json()["source_type"] == "jpg"

    jpg_doc = client.post(
        "/api/guidelines/import",
        headers=auth("manager"),
        data={"brand_name": "Solstice Apparel"},
        files={"file": ("solstice_rules.jpg", jpg_bytes, "image/jpeg")},
    )
    assert jpg_doc.status_code == 201
    jpg_info = jpg_doc.json()
    assert jpg_info["source_type"] == "jpg"
    assert jpg_info["page_count"] == 1
    assert jpg_info["pages"][0]["extraction_method"] == "ocr"
    jpg_dl = client.get(f"/api/guidelines/{jpg_info['id']}/pdf", headers=auth("manager"))
    assert jpg_dl.headers["content-type"] == "image/jpeg"
    assert jpg_dl.content == jpg_bytes

    jpg_audit = client.post(
        "/api/audits",
        headers=auth("manager"),
        json={"policy_id": jpg_info["policy_id"], "content": "Our cheap wear carries a 100% guarantee."},
    ).json()
    assert any("solstice_rules.jpg, p. 1" in f["source"] for f in jpg_audit["findings"])

    png_doc = client.post(
        "/api/guidelines/import",
        headers=auth("manager"),
        data={"brand_name": "Verdant Care"},
        files={"file": ("verdant_sheet.png", png_bytes, "image/png")},
    )
    assert png_doc.status_code == 201
    png_info = png_doc.json()
    assert png_info["source_type"] == "png"
    png_dl = client.get(f"/api/guidelines/{png_info['id']}/pdf", headers=auth("manager"))
    assert png_dl.headers["content-type"] == "image/png"
    assert png_dl.content == png_bytes

    png_audit = client.post(
        "/api/audits",
        headers=auth("manager"),
        json={"policy_id": png_info["policy_id"], "content": "Try our miracle tonic tonight."},
    ).json()
    assert any("verdant_sheet.png, p. 1" in f["source"] for f in png_audit["findings"])


def test_ai_provider_receives_and_verifies_ocr_citations(client, monkeypatch):
    png_bytes = _render_text_image(
        ["Claims Policy: Avoid absolute performance guarantees without supporting evidence."],
        image_format="PNG",
    )
    doc = client.post(
        "/api/guidelines/import",
        headers=auth("manager"),
        data={"brand_name": "Pulse Metrics"},
        files={"file": ("pulse_policy.png", png_bytes, "image/png")},
    ).json()

    monkeypatch.setattr(services.settings, "ai_provider", "groq")
    monkeypatch.setattr(services.settings, "groq_api_key", "fake-test-key")

    def provider(url, **kwargs):
        prompt = kwargs["json"]["messages"][1]["content"]
        if "Verification data:\n" in prompt:
            data = json.loads(prompt.split("Verification data:\n", 1)[1])
            cid = next(iter(data["passages"]))
            excerpts = data["passages"][cid]
            first_key = next(iter(excerpts))
            return httpx.Response(200, request=httpx.Request("POST", url), json={
                "choices": [{"finish_reason": "stop", "message": {"content": json.dumps({
                    "checks": [{
                        "finding_index": 0, "citation_id": cid, "status": "supported",
                        "excerpt_id": first_key, "reason": "OCR passage forbids unverified guarantees.",
                    }],
                })}}],
            })
        supplied = json.loads(prompt.split("Policy: ", 1)[1].split("\nDraft: ", 1)[0])
        passage = supplied["retrieved_passages"][0]
        assert passage["extraction_method"] == "ocr"
        assert passage["page"] == 1
        assert passage["filename"] == "pulse_policy.png"
        return httpx.Response(200, request=httpx.Request("POST", url), json={
            "choices": [{"finish_reason": "stop", "message": {"content": json.dumps({
                "score": 68,
                "findings": [{
                    "category": "unsupported_claim",
                    "severity": "high",
                    "message": "Unsupported performance guarantee claim.",
                    "evidence": "guaranteed accuracy",
                    "suggestion": "Remove guaranteed accuracy unless lab proof is linked.",
                    "source": passage["citation_id"],
                }],
            })}}],
        })

    monkeypatch.setattr(services.httpx, "post", provider)
    res = client.post(
        "/api/audits",
        headers=auth("manager"),
        json={"policy_id": doc["policy_id"], "content": "Pulse sensors deliver guaranteed accuracy outdoors."},
    ).json()
    assert res["analysis_engine"].startswith("Groq ")
    assert "pulse_policy.png, p. 1" in res["findings"][0]["source"]
    assert res["findings"][0]["verification"]["status"] == "supported"


def test_error_handling_unreadable_page_retry_duplicate_review_and_rbac(client):
    # 1. Mixed PDF where Page 2 is an unreadable blank scan
    mixed_with_blank = _scanned_or_mixed_pdf([
        {"kind": "text", "lines": ["Page 1 Policy: Stay concise and transparent."]},
        {"kind": "blank_scan"},
        {"kind": "scan", "lines": ['Page 3 Policy: Do not use "instant hack"; use "workflow tip".']},
    ])
    preview_res = client.post(
        "/api/guidelines/extract",
        headers=auth("manager"),
        files={"file": ("Partial_Scan.pdf", mixed_with_blank, "application/pdf")},
    )
    assert preview_res.status_code == 200
    preview = preview_res.json()
    assert preview["failed_page_count"] == 1
    assert preview["pages"][1]["page"] == 2
    assert preview["pages"][1]["status"] in {"unreadable", "empty"}
    assert preview["pages"][1]["retryable"] is True
    assert preview["warnings"]

    # 2. Retry OCR endpoint on a scanned page works and preserves page number
    retry_res = client.post(
        "/api/guidelines/extract-page",
        headers=auth("manager"),
        data={"page": "3", "enhanced": "true"},
        files={"file": ("Partial_Scan.pdf", mixed_with_blank, "application/pdf")},
    )
    assert retry_res.status_code == 200
    assert retry_res.json()["page"] == 3
    assert "instant hack" in retry_res.json()["page_data"]["text"].lower()

    # 3. Reviewed pages edit preserved on import
    reviewed = [
        {"page": 1, "text": "Page 1 Reviewed: Stay concise and transparent.", "extraction_method": "native_pdf"},
        {"page": 3, "text": 'Page 3 Reviewed: Do not use "instant hack"; use "practical workflow".', "extraction_method": "ocr", "ocr_confidence": 0.91},
    ]
    first_import = client.post(
        "/api/guidelines/import",
        headers=auth("manager"),
        data={"brand_name": "Partial Brand", "reviewed_pages_json": json.dumps(reviewed)},
        files={"file": ("Partial_Scan.pdf", mixed_with_blank, "application/pdf")},
    )
    assert first_import.status_code == 201
    first_doc = first_import.json()
    assert first_doc["duplicate_of"] is None
    assert [p["page"] for p in first_doc["pages"]] == [1, 3]

    # 4. Duplicate upload detection warns while keeping immutable versioning
    second_import = client.post(
        "/api/guidelines/import",
        headers=auth("manager"),
        data={"brand_name": "Partial Brand Copy"},
        files={"file": ("Partial_Scan.pdf", mixed_with_blank, "application/pdf")},
    )
    assert second_import.status_code == 201
    second_doc = second_import.json()
    assert second_doc["duplicate_of"]["document_id"] == first_doc["id"]
    assert second_doc["policy_id"] != first_doc["policy_id"]

    # 5. RBAC & visibility isolation for creator role
    assert client.post(
        "/api/guidelines/extract",
        headers=auth("creator"),
        files={"file": ("Partial_Scan.pdf", mixed_with_blank, "application/pdf")},
    ).status_code == 403
    creator_list = client.get("/api/guidelines", headers=auth("creator")).json()
    assert all(item["id"] != first_doc["id"] for item in creator_list)
    manager_list = client.get("/api/guidelines", headers=auth("manager")).json()
    assert any(item["id"] == first_doc["id"] for item in manager_list)

    # 6. Scanned draft upload audit (/api/audits/upload)
    scanned_draft_pdf = _scanned_or_mixed_pdf([
        {"kind": "scan", "lines": ["Draft announcement: Try our instant hack today."]},
    ])
    draft_audit = client.post(
        "/api/audits/upload",
        headers=auth("manager"),
        data={"policy_id": first_doc["policy_id"]},
        files={"file": ("Scanned_Draft.pdf", scanned_draft_pdf, "application/pdf")},
    )
    assert draft_audit.status_code == 201
    assert "instant hack" in draft_audit.json()["content_preview"].lower()
    assert any("Partial_Scan.pdf, p. 3" in f["source"] for f in draft_audit.json()["findings"])

    # 7. Corrupt, empty, oversized page count, and unsupported files return clear 422 errors
    assert client.post(
        "/api/guidelines/extract",
        headers=auth("manager"),
        files={"file": ("empty.pdf", b"", "application/pdf")},
    ).status_code == 422
    assert client.post(
        "/api/guidelines/extract",
        headers=auth("manager"),
        files={"file": ("corrupt.jpg", b"\xff\xd8\xffnot-a-jpeg", "image/jpeg")},
    ).status_code == 422
    assert client.post(
        "/api/guidelines/extract",
        headers=auth("manager"),
        files={"file": ("notes.docx", b"not-supported", "application/octet-stream")},
    ).status_code == 422

    # 101-page PDF exceeds MAX_PDF_PAGES (100)
    writer = PdfWriter()
    for _ in range(101):
        writer.add_blank_page(width=200, height=200)
    oversized_buf = BytesIO()
    writer.write(oversized_buf)
    large_res = client.post(
        "/api/guidelines/extract",
        headers=auth("manager"),
        files={"file": ("Too_Many_Pages.pdf", oversized_buf.getvalue(), "application/pdf")},
    )
    assert large_res.status_code == 422
    assert "100" in large_res.json()["detail"]

    # Low-confidence check using blurred text image doesn't crash and tracks confidence
    blurry_png = _render_text_image(["Blurred small disclaimer text"], image_format="PNG", blurry=True, dpi=96)
    blurry_res = client.post(
        "/api/guidelines/extract",
        headers=auth("manager"),
        files={"file": ("blurry.png", blurry_png, "image/png")},
    )
    assert blurry_res.status_code == 200


def test_ocr_engine_unavailable_fails_loudly_instead_of_zero_ocr_pages(client, monkeypatch):
    from app import ocr

    def broken_engine():
        raise ocr.OcrEngineUnavailableError("OCR engine could not be initialized on the server.")

    monkeypatch.setattr(ocr, "_get_ocr_engine", broken_engine)
    scanned_pdf = _scanned_or_mixed_pdf([
        {"kind": "scan", "lines": ["Brand policy rule."]},
    ])

    sync_res = client.post(
        "/api/guidelines/extract",
        headers=auth("manager"),
        files={"file": ("Scanned.pdf", scanned_pdf, "application/pdf")},
    )
    assert sync_res.status_code == 503

    stream_res = client.post(
        "/api/guidelines/extract?stream=true",
        headers=auth("manager"),
        files={"file": ("Scanned.pdf", scanned_pdf, "application/pdf")},
    )
    assert stream_res.status_code == 200
    events = [json.loads(line) for line in stream_res.text.splitlines() if line.strip()]
    assert events[-1]["stage"] == "failed"


def test_invoke_ocr_reads_rapidocr_output_and_passes_orientation_flag():
    from types import SimpleNamespace

    from app import ocr

    image = Image.new("RGB", (12, 12), (200, 10, 20))
    orientation_flags = []

    def engine(img_content, *, use_cls):
        assert img_content is image
        orientation_flags.append(use_cls)
        if not use_cls:
            return SimpleNamespace(boxes=None, txts=None, scores=None)
        return SimpleNamespace(
            boxes=[[[0, 0], [10, 0], [10, 10], [0, 10]]],
            txts=("Policy line",),
            scores=(0.95,),
        )

    assert ocr._invoke_ocr(engine, image).text == ""
    result = ocr._invoke_ocr(engine, image, use_angle_cls=True)
    assert result.text == "Policy line"
    assert result.confidence == 0.95
    assert orientation_flags == [False, True]
