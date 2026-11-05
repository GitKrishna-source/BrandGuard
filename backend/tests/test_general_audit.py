import json
from io import BytesIO

import httpx
import pytest
from fastapi.testclient import TestClient
from PIL import Image
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app import services
from app.auth import create_access_token
from app.db import Base, get_db
from app.main import app
from app.models import BrandPolicy
from app.policies import BASIC_POLICY_ID


def auth(role="creator"):
    token = create_access_token({"username": f"{role}@brandguard.local", "role": role})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def client(monkeypatch):
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False},
                           poolclass=StaticPool)
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


def audit(client, content):
    response = client.post("/api/audits", headers=auth(), json={"content": content})
    assert response.status_code == 201
    return response.json()


def report(client, audit_id):
    response = client.get(f"/api/audits/{audit_id}/report", headers=auth())
    assert response.status_code == 200
    return response.json()


def test_audit_works_without_brand_setup_and_reuses_neutral_defaults(client):
    first = audit(client, "Contact our customer support rep.")
    second = audit(client, "Nike makes shoes.")
    assert first["policy_id"] == second["policy_id"] == BASIC_POLICY_ID
    assert first["score"] == 100
    assert first["findings"] == second["findings"] == []
    assert first["status"] == "needs_review"
    policies = client.get("/api/policies", headers=auth()).json()
    assert len(policies) == 1
    assert policies[0]["approved_facts"] == []
    assert policies[0]["banned_terms"] == []
    assert policies[0]["approved_terms"] == {}


def test_saved_company_policy_is_not_selected_or_modified_for_general_audit(client):
    legacy = client.post("/api/policies", headers=auth(), json={
        "name": "CloudNexus default policy", "banned_terms": ["customer support rep"],
        "approved_terms": {"customer support rep": "Brand Success Specialist"},
        "approved_facts": ["CloudNexus-specific fact."],
    }).json()
    old = client.post("/api/audits", headers=auth(), json={
        "policy_id": legacy["id"], "content": "Contact our customer support rep.",
    }).json()
    assert old["findings"][0]["category"] == "terminology"
    original_report = report(client, old["id"])
    new = audit(client, "Contact our customer support rep.")
    assert new["findings"] == []
    assert new["policy_id"] == BASIC_POLICY_ID
    assert report(client, old["id"])["policy_snapshot"] == original_report["policy_snapshot"]
    assert report(client, old["id"])["audit"] == original_report["audit"]
    assert report(client, new["id"])["policy_snapshot"]["approved_facts"] == []
    policies = client.get("/api/policies", headers=auth()).json()
    assert next(row for row in policies if row["id"] == legacy["id"]) == legacy


@pytest.mark.parametrize("ranking", ["number 1", "number one", "#1", "No. 1"])
def test_rankings_request_evidence_without_inventing_a_brand_restriction(client, ranking):
    result = audit(client, f"Nike is the {ranking} brand in the world.")
    assert result["score"] < 100
    assert {finding["category"] for finding in result["findings"]} == {"unsupported_claim"}
    suggestion = result["findings"][0]["suggestion"]
    assert "what is measured" in suggestion
    assert "scope, source, and timeframe" in suggestion
    assert "inventing facts" in suggestion
    assert "CloudNexus" not in json.dumps(result)


def test_general_upload_and_revision_keep_neutral_rules_and_human_review(client):
    content = "Nike is the number 1 brand in the world."
    upload = client.post("/api/audits/upload", headers=auth(), files={
        "file": ("campaign.txt", content.encode(), "text/plain"),
    })
    assert upload.status_code == 201
    original = upload.json()
    assert original["policy_id"] == BASIC_POLICY_ID
    assert original["score"] < 100
    assert report(client, original["id"])["content"] == content
    revision = client.post(f"/api/audits/{original['id']}/revisions", headers=auth(), json={
        "content": "Contact our team to learn more.",
    })
    assert revision.status_code == 201
    revised = revision.json()
    assert revised["policy_id"] == BASIC_POLICY_ID
    assert revised["score"] == 100
    assert revised["status"] == "needs_review"
    assert report(client, revised["id"])["audit"]["parent_audit_id"] == original["id"]
    assert report(client, original["id"])["content"] == content
    assert client.post(f"/api/audits/{revised['id']}/reviews", headers=auth(), json={
        "reviewer_role": "creator", "status": "approved",
    }).status_code == 403
    assert client.post(f"/api/audits/{revised['id']}/reviews", headers=auth("manager"), json={
        "reviewer_role": "manager", "status": "approved",
    }).status_code == 201


def test_general_image_upload_never_assumes_a_company_palette(client):
    stream = BytesIO()
    Image.new("RGB", (40, 40), "#a78bfa").save(stream, format="PNG")
    response = client.post("/api/audits/upload", headers=auth(), files={
        "file": ("image.png", stream.getvalue(), "image/png"),
    })
    assert response.status_code == 201
    result = response.json()
    assert result["policy_id"] == BASIC_POLICY_ID
    assert "automated visual review is unavailable" in result["findings"][0]["message"]
    assert "approved palette" not in result["findings"][0]["suggestion"]


def test_general_defaults_cannot_be_changed_by_a_policy_edit(client):
    audit(client, "Contact our team.")
    response = client.patch(f"/api/policies/{BASIC_POLICY_ID}", headers=auth("manager"), json={
        "name": "CloudNexus", "banned_terms": ["Nike"],
    })
    assert response.status_code == 409
    assert audit(client, "Nike makes shoes.")["findings"] == []


def test_unknown_explicit_policy_does_not_silently_become_general(client):
    response = client.post("/api/audits", headers=auth(), json={
        "policy_id": "missing-policy", "content": "Draft.",
    })
    assert response.status_code == 404


def test_local_grammar_check_handles_accidental_repetition_without_flagging_valid_forms():
    policy = BrandPolicy(name="General content audit", guidelines=[], banned_terms=[], approved_facts=[])
    score, findings = services.audit_text("Contact the the team.", policy)
    assert score < 100
    assert findings[0].category == "grammar"
    assert findings[0].evidence == "the the"
    assert services.audit_text("She had had enough.", policy) == (100, [])


def test_groq_prompt_uses_neutral_rules_and_no_sample_facts(client, monkeypatch):
    monkeypatch.setattr(services.settings, "ai_provider", "groq")
    monkeypatch.setattr(services.settings, "groq_api_key", "fake-test-key")
    calls = []

    def provider(url, **kwargs):
        calls.append(kwargs["json"])
        return httpx.Response(200, request=httpx.Request("POST", url), json={
            "choices": [{"finish_reason": "stop", "message": {
                "content": json.dumps({"score": 90, "findings": []}),
            }}],
        })

    monkeypatch.setattr(services.httpx, "post", provider)
    result = audit(client, "Nike is the number 1 brand in the world.")
    assert result["analysis_engine"].startswith("Groq ")
    prompt = calls[0]["messages"][1]["content"]
    supplied = json.loads(prompt.split("Policy: ", 1)[1].split("\nDraft: ", 1)[0])
    assert supplied["name"] == "General content audit"
    assert supplied["approved_facts"] == supplied["banned_terms"] == []
    assert "CloudNexus" not in prompt
    assert "Mentioning another brand is not itself a violation" in prompt
    assert "measurement criteria" in prompt
    assert "Do not invent replacement facts" in prompt
    assert "clarity|grammar" in prompt
