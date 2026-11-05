import hashlib
from io import BytesIO

import pytest
from fastapi.testclient import TestClient
from pypdf import PdfReader

from app.auth import create_access_token
from app.db import SessionLocal
from app.main import app
from app.models import Audit


def auth(role="creator", username=None):
    token = create_access_token({"username": username or f"{role}@brandguard.local", "role": role})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setattr("app.services.settings.ai_provider", "local")
    with TestClient(app) as client:
        yield client


def make_audit(client, content="We guarantee zero downtime."):
    policy = client.post("/api/policies", headers=auth(), json={
        "name": "Launch brand policy", "guidelines": ["Use evidence-backed language."],
        "approved_facts": ["Availability varies by deployment."],
    }).json()
    audit = client.post("/api/audits", headers=auth(), json={
        "policy_id": policy["id"], "content": content,
    }).json()
    return policy, audit


def test_reports_keep_actual_score_status_and_policy_snapshot(client):
    policy, audit = make_audit(client)
    client.patch(f"/api/policies/{policy['id']}", headers=auth("manager"), json={
        "name": "Changed later", "approved_facts": ["A completely different fact."],
    })
    response = client.get(f"/api/audits/{audit['id']}/report", headers=auth())
    assert response.status_code == 200
    assert response.headers["cache-control"] == "no-store"
    report = response.json()
    assert report["audit"]["score"] == audit["score"] < 100
    assert report["audit"]["status"] == "needs_review"
    assert report["required_reviewer"] == "legal"
    assert report["automated_assessment"] == "local_checks"
    assert report["policy_snapshot"]["name"] == "Launch brand policy"
    assert report["policy_snapshot"]["approved_facts"] == policy["approved_facts"]
    assert report["reviews"] == []
    assert report["content_sha256"] == hashlib.sha256(report["content"].encode()).hexdigest()


def test_report_tracks_specific_revision_and_recorded_reviews(client):
    _, original = make_audit(client)
    comment = "Please use <evidence> & approved facts."
    decision = client.post(f"/api/audits/{original['id']}/reviews", headers=auth("manager"), json={
        "reviewer_role": "manager", "status": "changes_requested", "comment": comment,
    })
    assert decision.status_code == 201
    revision = client.post(f"/api/audits/{original['id']}/revisions", headers=auth(), json={
        "content": "Service interruptions may occur."
    }).json()
    client.post(f"/api/audits/{revision['id']}/reviews", headers=auth("manager"), json={
        "reviewer_role": "manager", "status": "approved", "comment": "Reviewed the updated draft."
    })
    old = client.get(f"/api/audits/{original['id']}/report", headers=auth()).json()
    new = client.get(f"/api/audits/{revision['id']}/report", headers=auth()).json()
    assert old["audit"]["status"] == "changes_requested"
    assert old["reviews"][0]["comment"] == comment
    assert old["reviews"][0]["reviewer_username"] == "manager@brandguard.local"
    assert new["audit"]["status"] == "approved"
    assert new["audit"]["parent_audit_id"] == original["id"]
    assert len(new["reviews"]) == 1
    assert new["reviews"][0]["comment"] == "Reviewed the updated draft."
    pdf = client.get(f"/api/audits/{original['id']}/report.pdf", headers=auth())
    text = "\n".join(page.extract_text() for page in PdfReader(BytesIO(pdf.content)).pages)
    assert comment in text
    assert "Changes requested" in text
    assert "manager@brandguard.local" in text
    assert "Marcus Vance" not in text


@pytest.mark.parametrize("suffix", ["report", "report.pdf"])
def test_reports_enforce_authentication_and_audit_ownership(client, suffix):
    _, audit = make_audit(client)
    path = f"/api/audits/{audit['id']}/{suffix}"
    assert client.get(path).status_code == 401
    assert client.get(path, headers=auth(username="other@brandguard.local")).status_code == 404
    assert client.get(path, headers=auth("manager")).status_code == 200


def test_document_reports_preserve_content_beyond_ui_preview(client):
    policy, _ = make_audit(client)
    content = ("Evidence-backed draft paragraph.\n" * 180) + "FINAL DOCUMENT MARKER"
    uploaded = client.post("/api/audits/upload", headers=auth(), data={"policy_id": policy["id"]},
                           files={"file": ("long-draft.txt", content.encode(), "text/plain")})
    assert uploaded.status_code == 201
    audit = uploaded.json()
    assert len(audit["content_preview"]) == 4000
    report = client.get(f"/api/audits/{audit['id']}/report", headers=auth()).json()
    assert report["content"] == content
    assert report["content_coverage"] == "full_text"
    assert report["source_filename"] == "long-draft.txt"
    pdf = client.get(f"/api/audits/{audit['id']}/report.pdf", headers=auth())
    assert pdf.headers["content-type"] == "application/pdf"
    reader = PdfReader(BytesIO(pdf.content))
    assert len(reader.pages) >= 3
    assert "FINAL DOCUMENT MARKER" in "\n".join(page.extract_text() for page in reader.pages)


def test_legacy_report_does_not_invent_snapshot_or_signatures(client):
    policy, _ = make_audit(client)
    with SessionLocal() as db:
        old = Audit(policy_id=policy["id"], content_type="document", content="Only an excerpt.",
                    score=88, status="needs_review", response={
                        "owner": "creator@brandguard.local", "findings": []
                    })
        db.add(old)
        db.commit()
        db.refresh(old)
        audit_id = old.id
    report = client.get(f"/api/audits/{audit_id}/report", headers=auth()).json()
    assert report["policy_snapshot"] is None
    assert report["content_coverage"] == "retained_excerpt"
    assert report["automated_assessment"] == "not_recorded"
    assert report["reviews"] == []
    assert any("older document" in note for note in report["notes"])


def test_image_report_does_not_claim_text_hash_identifies_original_image(client):
    from PIL import Image

    policy, _ = make_audit(client)
    stream = BytesIO()
    Image.new("RGB", (40, 40), "#a78bfa").save(stream, format="PNG")
    audit = client.post("/api/audits/upload", headers=auth(), data={"policy_id": policy["id"]},
                        files={"file": ("swatch.png", stream.getvalue(), "image/png")}).json()
    report = client.get(f"/api/audits/{audit['id']}/report", headers=auth()).json()
    assert report["content_sha256"] is None
    assert report["content_coverage"] == "image_not_retained"
    assert report["source_filename"] == "swatch.png"


def test_pdf_handles_long_feedback_and_unavailable_font_glyphs(client, monkeypatch):
    _, audit = make_audit(client, "Draft with an emoji \U0001f680 and literal <tags> & facts.")
    comment = "Please review this sentence. " * 250
    client.post(f"/api/audits/{audit['id']}/reviews", headers=auth("manager"), json={
        "reviewer_role": "manager", "status": "changes_requested", "comment": comment
    })

    def unexpected(*args, **kwargs):
        pytest.fail("Export must use saved results without invoking AI")

    monkeypatch.setattr("app.services._provider_request", unexpected)
    response = client.get(f"/api/audits/{audit['id']}/report.pdf", headers=auth())
    assert response.status_code == 200
    text = "\n".join(page.extract_text() for page in PdfReader(BytesIO(response.content)).pages)
    assert "[U+1F680]" in text
    assert "<tags> & facts." in text
    report = client.get(f"/api/audits/{audit['id']}/report", headers=auth()).json()
    assert "\U0001f680" in report["content"]
