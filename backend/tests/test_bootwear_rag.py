import hashlib
import json
from io import BytesIO

import httpx
import pytest
from fastapi.testclient import TestClient
from pypdf import PdfReader
from reportlab.pdfgen import canvas
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app import services
from app.auth import create_access_token
from app.db import Base, get_db
from app.main import app
from app.models import GuidelineDocument
from app.retrieval import BOOTWEAR_PDF, extract_chunks, retrieve

BAD_DRAFT = ("Bootwear Everyday is the #1 performance racing shoe. These kicks are 100% "
             "waterproof and cure foot pain. Buy them for INR 1,999 with returns on worn shoes for 30 days.")
GOOD_DRAFT = ("Bootwear Everyday is an everyday walking shoe. Bootwear Everyday costs INR 2,499. "
              "Bootwear accepts unworn shoes within 14 days of delivery.")


def auth(role="creator", username=None):
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
        with TestClient(app) as client:
            yield client
    finally:
        app.dependency_overrides.pop(get_db, None)
        engine.dispose()


def demo(client):
    response = client.post("/api/demo/bootwear", headers=auth())
    assert response.status_code == 200
    return response.json()


def audit(client, policy_id, content=BAD_DRAFT, headers=None):
    return client.post("/api/audits", headers=headers or auth(), json={
        "policy_id": policy_id, "content": content,
    })


def pdf_bytes(text):
    stream = BytesIO()
    doc = canvas.Canvas(stream)
    for number, line in enumerate(text.splitlines()):
        doc.drawString(40, 780 - number * 18, line)
    doc.save()
    return stream.getvalue()


def test_bootwear_pdf_is_actual_indexed_source_and_demo_is_idempotent(client):
    loaded = demo(client)
    assert loaded == demo(client)
    data = BOOTWEAR_PDF.read_bytes()
    assert loaded["page_count"] == 6
    assert loaded["chunk_count"] > 10
    assert loaded["sha256"] == hashlib.sha256(data).hexdigest()
    download = client.get("/api/demo/bootwear/guidelines.pdf", headers=auth())
    assert download.content == data
    assert download.headers["cache-control"] == "no-store"
    assert len(client.get("/api/policies", headers=auth()).json()) == 1
    _, chunks = extract_chunks(data)
    assert all(chunk["page"] < 6 for chunk in chunks)
    assert "INR 1,999" not in " ".join(chunk["text"] for chunk in chunks)


def test_retrieval_covers_the_actual_terminology_price_returns_and_claim_rules():
    _, chunks = extract_chunks(BOOTWEAR_PDF.read_bytes())
    document = GuidelineDocument(id="test", filename="Bootwear.pdf", sha256="a" * 64, chunks=chunks)
    sources = retrieve(document, BAD_DRAFT)
    assert len(sources) == 6
    text = " ".join(source.text for source in sources)
    for expected in ("BW-03", "BW-04", "BW-05", "BW-07", "BW-08", "BW-09"):
        assert expected in text
    assert all(source.document_id == "test" and source.page in {2, 3, 4} for source in sources)
    assert retrieve(document, "zzzxxyyq unusualtoken") == []


def test_local_source_checks_and_revision_keep_saved_evidence_and_approval_gate(client):
    loaded = demo(client)
    response = audit(client, loaded["policy_id"])
    assert response.status_code == 201
    original = response.json()
    assert original["score"] < 100
    assert original["status"] == "needs_review"
    assert original["retrieval_method"].startswith("BM25")
    term = next(finding for finding in original["findings"] if finding["category"] == "terminology")
    assert term["evidence"] == "kicks"
    assert "p. 2" in term["source"]
    assert "[S" in term["source"]
    assert "Guideline PDFs are retained" in original["data_handling"]
    revised = client.post(f"/api/audits/{original['id']}/revisions", headers=auth(), json={
        "content": GOOD_DRAFT,
    }).json()
    assert revised["score"] == 100
    assert revised["findings"] == []
    assert revised["status"] == "needs_review"
    assert revised["policy_id"] == loaded["policy_id"]
    old_report = client.get(f"/api/audits/{original['id']}/report", headers=auth()).json()
    assert old_report["content"] == BAD_DRAFT
    assert old_report["audit"]["retrieved_sources"] == original["retrieved_sources"]
    pdf = client.get(f"/api/audits/{original['id']}/report.pdf", headers=auth())
    assert pdf.status_code == 200
    extracted = "\n".join(page.extract_text() for page in PdfReader(BytesIO(pdf.content)).pages)
    assert "Retrieved guideline evidence" in extracted
    assert "BW-05 / Product and price" in extracted
    assert loaded["sha256"] in extracted
    assert client.post(f"/api/audits/{original['id']}/reviews", headers=auth("manager"), json={
        "reviewer_role": "manager", "status": "approved",
    }).status_code == 403


def test_contextual_groq_audit_receives_only_retrieved_chunks_and_validates_citations(client, monkeypatch):
    loaded = demo(client)
    monkeypatch.setattr(services.settings, "ai_provider", "groq")
    monkeypatch.setattr(services.settings, "groq_api_key", "fake-test-key")
    calls = []

    def provider(url, **kwargs):
        prompt = kwargs["json"]["messages"][1]["content"]
        calls.append(prompt)
        supplied = json.loads(prompt.split("Policy: ", 1)[1].split("\nDraft: ", 1)[0])
        passages = supplied["retrieved_passages"]
        price = next(source for source in passages if "BW-05 /" in source["text"])
        assert "approved_facts" not in supplied
        assert all(source["page"] != 6 for source in passages)
        assert "judge walkthrough" not in prompt.casefold()
        output = {"score": 70, "findings": [{
            "category": "unsupported_claim", "severity": "high", "message": "Price differs from the supplied catalogue.",
            "evidence": "INR 1,999", "suggestion": "The demo catalogue lists INR 2,499; confirm the intended price.",
            "source": f"[{price['citation_id']}]",
        }]}
        return httpx.Response(200, request=httpx.Request("POST", url), json={
            "choices": [{"finish_reason": "stop", "message": {"content": json.dumps(output)}}],
        })

    monkeypatch.setattr(services.httpx, "post", provider)
    result = audit(client, loaded["policy_id"]).json()
    assert len(calls) == 1
    assert result["analysis_engine"].startswith("Groq ")
    assert "p. 3" in result["findings"][0]["source"]
    assert "bootwear-brand-guidelines.pdf" in result["findings"][0]["source"]


@pytest.mark.parametrize("citation", ["[S999]", "Invented source.pdf, page 99"])
def test_fabricated_citation_triggers_disclosed_local_fallback(client, monkeypatch, citation):
    loaded = demo(client)
    monkeypatch.setattr(services.settings, "ai_provider", "groq")
    monkeypatch.setattr(services.settings, "groq_api_key", "fake-test-key")
    from app.schemas import Finding
    monkeypatch.setattr(services, "_groq_request", lambda prompt, image=None: (99, [Finding(
        category="unsupported_claim", severity="high", message="Unreliable finding",
        evidence="kicks", suggestion="Fabricated replacement", source=citation,
    )]))
    result = audit(client, loaded["policy_id"]).json()
    assert "Groq fallback" in result["analysis_engine"]
    assert all("Fabricated replacement" not in finding["suggestion"] for finding in result["findings"])
    assert all("S999" not in finding["source"] for finding in result["findings"])


def test_import_permission_isolation_and_immutable_source_versions(client):
    data = pdf_bytes("Private Acme guidelines\nTERM: kicks => walking shoes\nFACT: Acme costs INR 500.")
    request = {"data": {"brand_name": "Private Acme"},
               "files": {"file": ("private.pdf", data, "application/pdf")}}
    assert client.post("/api/guidelines/import", headers=auth(), **request).status_code == 403
    response = client.post("/api/guidelines/import", headers=auth("manager"), **request)
    assert response.status_code == 201
    imported = response.json()
    second = client.post("/api/guidelines/import", headers=auth("manager"), **request).json()
    assert imported["policy_id"] != second["policy_id"]
    assert imported["sha256"] == second["sha256"]
    assert client.get(f"/api/guidelines/{imported['id']}/pdf", headers=auth()).status_code == 404
    assert client.get(f"/api/guidelines/{imported['id']}/pdf", headers=auth("manager")).content == data
    assert audit(client, imported["policy_id"], "These kicks are new.").status_code == 404
    result = audit(client, imported["policy_id"], "These kicks are new.", auth("manager")).json()
    assert "private.pdf" in result["findings"][0]["source"]
    assert all(source["document_id"] == imported["id"] for source in result["retrieved_sources"])
    visible = client.get("/api/policies", headers=auth()).json()
    assert imported["policy_id"] not in {policy["id"] for policy in visible}
    assert client.patch(f"/api/policies/{imported['policy_id']}", headers=auth("manager"), json={
        "approved_facts": ["Acme costs INR 999."],
    }).status_code == 409


@pytest.mark.parametrize("filename,data", [("scan.pdf", pdf_bytes("")), ("bad.pdf", b"%PDF-invalid"),
                                         ("guide.txt", b"not a PDF")])
def test_import_rejects_scanned_corrupt_and_non_pdf_files(client, filename, data):
    assert client.post("/api/guidelines/import", headers=auth("manager"), data={
        "brand_name": "Acme",
    }, files={"file": (filename, data, "application/pdf")}).status_code == 422


def test_bootwear_documents_require_auth_and_general_audits_stay_neutral(client):
    assert client.post("/api/demo/bootwear").status_code == 401
    assert client.get("/api/demo/bootwear/guidelines.pdf").status_code == 401
    loaded = demo(client)
    result = client.post("/api/audits", headers=auth(), json={"content": "These kicks are new."}).json()
    assert result["policy_id"] != loaded["policy_id"]
    assert result["findings"] == []
    assert result["retrieved_sources"] == []
