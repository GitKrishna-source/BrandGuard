import json
from pathlib import Path

import httpx
import pytest

from app import services
from app.config import Settings
from app.models import BrandPolicy


@pytest.fixture
def policy():
    return BrandPolicy(name="Test policy", banned_terms=[], approved_facts=[])


@pytest.fixture(autouse=True)
def provider_settings(monkeypatch):
    monkeypatch.setattr(services.settings, "ai_provider", "gemini")
    monkeypatch.setattr(services.settings, "gemini_api_key", "test-secret-do-not-log")
    monkeypatch.setattr(services.settings, "gemini_model", "test-model")


def test_env_path_is_independent_of_working_directory(tmp_path, monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.delenv("GEMINI_MODEL", raising=False)
    # A root-level/launch-directory env must not shadow backend/.env.
    (tmp_path / ".env").write_text("GEMINI_MODEL=wrong-launch-directory-model\n")
    before = Settings()
    monkeypatch.chdir(tmp_path)
    after = Settings()
    assert Path(Settings.model_config["env_file"]).is_absolute()
    assert before.gemini_model == after.gemini_model
    assert before.gemini_api_key == after.gemini_api_key


@pytest.mark.parametrize("status", [400, 401, 403, 404, 429, 503])
def test_http_failure_is_visible_without_leaking_secrets(status, monkeypatch, policy, caplog):
    def fail(prompt, image=None):
        request = httpx.Request("POST", "https://example.test")
        response = httpx.Response(status, request=request)
        raise httpx.HTTPStatusError(
            "test-secret-do-not-log PRIVATE DRAFT", request=request, response=response
        )

    monkeypatch.setattr(services, "_gemini_request", fail)
    score, findings, engine = services.audit_text_with_provider(
        "We guarantee zero downtime.", policy
    )
    assert score < 100
    assert findings
    assert f"Gemini fallback: HTTP {status}" in engine
    assert "test-secret-do-not-log" not in engine + caplog.text
    assert "PRIVATE DRAFT" not in engine + caplog.text
    assert "transmission was attempted" in services.audit_data_handling(engine)


def test_no_key_reports_configuration_without_calling_provider(monkeypatch, policy):
    monkeypatch.setattr(services.settings, "gemini_api_key", None)

    def unexpected(*args, **kwargs):
        pytest.fail("Unconfigured provider must not be called")

    monkeypatch.setattr(services, "_gemini_request", unexpected)
    score, findings, engine = services.audit_text_with_provider("Plain draft.", policy)
    assert (score, findings) == (100, [])
    assert "Gemini not configured" in engine
    assert "No external AI service" in services.audit_data_handling(engine)


def test_success_uses_provider_result_and_preserves_draft(monkeypatch, policy):
    draft = "We do not guarantee zero downtime."

    def review(prompt, image=None):
        assert draft in prompt
        assert "negation" in prompt
        return 97, []

    monkeypatch.setattr(services, "_gemini_request", review)
    assert services.audit_text_with_provider(draft, policy) == (97, [], "Gemini test-model")
    assert "sent to Google Gemini" in services.audit_data_handling("Gemini test-model")


@pytest.mark.parametrize("body", [{"candidates": []}, {"candidates": [{"content": {
    "parts": [{"text": "{}"}]
}}]}])
def test_incomplete_provider_response_does_not_become_clean_audit(body, monkeypatch, policy):
    monkeypatch.setattr(services.httpx, "post", lambda *a, **kw: httpx.Response(
        200, json=body, request=httpx.Request("POST", "https://example.test")
    ))
    _, findings, engine = services.audit_text_with_provider("Guaranteed results.", policy)
    assert findings
    assert "invalid audit response" in engine


def test_parser_ignores_thinking_parts_and_combines_output(monkeypatch):
    output = json.dumps({"score": 96, "findings": []})
    parts = [
        {"thought": True, "text": "internal reasoning"},
        {"text": output[:10]}, {"text": output[10:]},
    ]
    monkeypatch.setattr(services.httpx, "post", lambda *a, **kw: httpx.Response(
        200, json={"candidates": [{"content": {"parts": parts}}]},
        request=httpx.Request("POST", "https://example.test"),
    ))
    assert services._gemini_request("Review this draft.") == (96, [])


def test_document_upload_reports_provider_failure(monkeypatch, policy):
    def fail(*args, **kwargs):
        raise httpx.ReadTimeout("do not expose private request details")

    monkeypatch.setattr(services, "_gemini_request", fail)
    _, findings, engine, preview = services.audit_uploaded_file_with_provider(
        "draft.txt", "text/plain", b"We guarantee zero downtime.", policy
    )
    assert findings
    assert "request timed out" in engine
    assert preview == "We guarantee zero downtime."


@pytest.fixture
def groq_settings(monkeypatch):
    monkeypatch.setattr(services.settings, "ai_provider", "groq")
    monkeypatch.setattr(services.settings, "groq_api_key", "groq-test-secret-do-not-log")
    monkeypatch.setattr(services.settings, "groq_model", "groq-test-model")
    monkeypatch.setattr(services.settings, "groq_vision_model", "groq-test-vision")


def test_groq_request_uses_auth_json_mode_and_parses_findings(
    groq_settings, monkeypatch, policy
):
    def post(url, **kwargs):
        assert url == "https://api.groq.com/openai/v1/chat/completions"
        assert kwargs["headers"]["Authorization"] == "Bearer groq-test-secret-do-not-log"
        body = kwargs["json"]
        assert body["model"] == "groq-test-model"
        assert body["response_format"] == {"type": "json_object"}
        assert "We do not guarantee zero downtime." in body["messages"][1]["content"]
        return httpx.Response(200, request=httpx.Request("POST", url), json={
            "choices": [{"finish_reason": "stop", "message": {
                "content": json.dumps({"score": 100, "findings": []})
            }}]
        })

    monkeypatch.setattr(services.httpx, "post", post)
    score, findings, engine = services.audit_text_with_provider(
        "We do not guarantee zero downtime.", policy
    )
    assert (score, findings, engine) == (100, [], "Groq groq-test-model")
    assert "sent to Groq" in services.audit_data_handling(engine)
    assert "Google Gemini" not in services.audit_data_handling(engine)


def test_groq_missing_key_never_uses_configured_gemini(groq_settings, monkeypatch, policy):
    monkeypatch.setattr(services.settings, "groq_api_key", None)

    def unexpected(*args, **kwargs):
        pytest.fail("Groq selection must never send data to Gemini")

    monkeypatch.setattr(services, "_gemini_request", unexpected)
    monkeypatch.setattr(services, "_groq_request", unexpected)
    _, _, engine = services.audit_text_with_provider("Plain draft.", policy)
    assert "Groq not configured: set backend GROQ_API_KEY" in engine


def test_groq_failure_does_not_use_gemini_or_expose_secrets(
    groq_settings, monkeypatch, policy, caplog
):
    def post(url, **kwargs):
        return httpx.Response(401, request=httpx.Request("POST", url), json={
            "error": {"message": "groq-test-secret-do-not-log private draft"}
        })

    def unexpected(*args, **kwargs):
        pytest.fail("Provider failure must not silently switch to Gemini")

    monkeypatch.setattr(services.httpx, "post", post)
    monkeypatch.setattr(services, "_gemini_request", unexpected)
    _, _, engine = services.audit_text_with_provider("Guaranteed results.", policy)
    assert "Groq fallback: HTTP 401" in engine
    assert "GROQ_API_KEY" in engine
    assert "groq-test-secret-do-not-log" not in engine + caplog.text
    assert "private draft" not in engine + caplog.text


def test_groq_vision_uses_separate_model_and_encoded_image(groq_settings, monkeypatch, policy):
    def post(url, **kwargs):
        body = kwargs["json"]
        assert body["model"] == "groq-test-vision"
        assert body["messages"][1]["content"][1]["image_url"]["url"] == (
            "data:image/png;base64,dGVzdC1pbWFnZQ=="
        )
        return httpx.Response(200, request=httpx.Request("POST", url), json={
            "choices": [{"message": {"content": '{"score": 95, "findings": []}'}}]
        })

    monkeypatch.setattr(services.httpx, "post", post)
    score, _, engine, preview = services.audit_uploaded_file_with_provider(
        "image.png", "image/png", b"test-image", policy
    )
    assert (score, engine, preview) == (95, "Groq groq-test-vision vision", "")


@pytest.mark.parametrize("content", ["{}", '{"score":101,"findings":[]}',
                                     '{"score":100,"findings":null}', "invalid JSON"])
def test_invalid_groq_result_is_visible_fallback(groq_settings, monkeypatch, policy, content):
    monkeypatch.setattr(services.httpx, "post", lambda url, **kwargs: httpx.Response(
        200, request=httpx.Request("POST", url),
        json={"choices": [{"message": {"content": content}}]},
    ))
    score, findings, engine = services.audit_text_with_provider("Guaranteed results.", policy)
    assert score < 100
    assert findings
    assert "Groq fallback: provider returned an invalid audit response" in engine


def test_local_mode_never_calls_either_provider(monkeypatch, policy):
    monkeypatch.setattr(services.settings, "ai_provider", "local")

    def unexpected(*args, **kwargs):
        pytest.fail("Local mode must not call a provider")

    monkeypatch.setattr(services.httpx, "post", unexpected)
    _, _, engine = services.audit_text_with_provider("Plain draft.", policy)
    assert engine == services.LOCAL_ENGINE
