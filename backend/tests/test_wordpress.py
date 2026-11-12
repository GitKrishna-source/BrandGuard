import json

import httpx
import pytest
from fastapi.testclient import TestClient

from app.auth import create_access_token
from app.main import app


@pytest.fixture
def auth_header():
    with TestClient(app) as client:
        token = client.post("/api/auth/demo", json={"role": "creator"}).json()["access_token"]
        return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def saved_revision(auth_header, monkeypatch):
    monkeypatch.setattr("app.main.settings.ai_provider", "local")
    with TestClient(app) as client:
        original = client.post("/api/audits", headers=auth_header, json={
            "content_type": "text",
            "content": "Our footwear is guaranteed to be indestructible.",
        })
        assert original.status_code == 201
        revision = client.post(f"/api/audits/{original.json()['id']}/revisions", headers=auth_header, json={
            "content": "Our footwear is rigorously tested for long-lasting durability.",
        })
        assert revision.status_code == 201
        return revision.json()


@pytest.fixture
def sync_payload(saved_revision):
    return {
        "site_url": "https://example.com",
        "username": "editor",
        "app_password": "secret_app_pw",
        "post_id": 101,
        "content": saved_revision["content_preview"],
        "audit_id": saved_revision["id"],
        "expected_modified": "2026-11-10T12:00:00",
    }


def test_wordpress_endpoints_require_auth():
    with TestClient(app) as client:
        res = client.post("/api/wordpress/connect", json={
            "site_url": "https://example.com",
            "username": "admin",
            "app_password": "abcd 1234 efgh 5678",
        })
        assert res.status_code == 401


def test_wordpress_connect_success(auth_header, monkeypatch):
    def mock_handler(request: httpx.Request):
        url = str(request.url)
        if url.endswith("/wp-json"):
            return httpx.Response(200, json={"name": "Acme Brand Blog"})
        if url.endswith("/wp-json/wp/v2/users/me"):
            assert "Basic " in request.headers.get("Authorization", "")
            return httpx.Response(200, json={"id": 1, "name": "Content Editor", "slug": "editor"})
        return httpx.Response(404)

    transport = httpx.MockTransport(mock_handler)
    monkeypatch.setattr("app.wordpress._get_client", lambda: httpx.Client(transport=transport))

    with TestClient(app) as client:
        res = client.post(
            "/api/wordpress/connect",
            headers=auth_header,
            json={
                "site_url": "https://example.com/",
                "username": "editor",
                "app_password": "abcd 1234 efgh 5678",
            },
        )
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert data["site_name"] == "Acme Brand Blog"
        assert data["user_display_name"] == "Content Editor"
        assert data["site_url"] == "https://example.com"


def test_wordpress_connect_bad_credentials(auth_header, monkeypatch):
    def mock_handler(request: httpx.Request):
        url = str(request.url)
        if url.endswith("/wp-json"):
            return httpx.Response(200, json={"name": "Acme Brand Blog"})
        if url.endswith("/wp-json/wp/v2/users/me"):
            return httpx.Response(401, json={"code": "invalid_username"})
        return httpx.Response(404)

    transport = httpx.MockTransport(mock_handler)
    monkeypatch.setattr("app.wordpress._get_client", lambda: httpx.Client(transport=transport))

    with TestClient(app) as client:
        res = client.post(
            "/api/wordpress/connect",
            headers=auth_header,
            json={
                "site_url": "https://example.com",
                "username": "wrong_user",
                "app_password": "wrong_password",
            },
        )
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is False
        assert data["user_display_name"] is None


def test_wordpress_fetch_drafts(auth_header, monkeypatch):
    def mock_handler(request: httpx.Request):
        url = str(request.url)
        if "/wp-json/wp/v2/posts" in url:
            return httpx.Response(200, json=[
                {
                    "id": 101,
                    "title": {"raw": "Q4 Product Announcement", "rendered": "Q4 Product Announcement"},
                    "content": {"raw": "Our footwear is guaranteed to be 100% indestructible.", "rendered": "<p>Our footwear...</p>"},
                    "excerpt": {"raw": "Announcing new shoes", "rendered": "<p>Announcing new shoes</p>"},
                    "modified": "2026-11-10T12:00:00",
                    "status": "draft",
                    "link": "https://example.com/?p=101",
                },
                {
                    "id": 102,
                    "title": "Summer Campaign Notes",
                    "content": "Check out our new kicks for running.",
                    "excerpt": "",
                    "modified": "2026-11-09T08:30:00",
                    "status": "draft",
                    "link": "https://example.com/?p=102",
                }
            ])
        return httpx.Response(404)

    transport = httpx.MockTransport(mock_handler)
    monkeypatch.setattr("app.wordpress._get_client", lambda: httpx.Client(transport=transport))

    with TestClient(app) as client:
        res = client.post(
            "/api/wordpress/drafts",
            headers=auth_header,
            json={
                "site_url": "https://example.com",
                "username": "editor",
                "app_password": "secret_app_pw",
            },
        )
        assert res.status_code == 200
        data = res.json()
        assert len(data["drafts"]) == 2
        assert data["drafts"][0]["id"] == 101
        assert data["drafts"][0]["title"] == "Q4 Product Announcement"
        assert "100% indestructible" in data["drafts"][0]["content"]
        assert data["drafts"][1]["id"] == 102
        assert data["drafts"][1]["title"] == "Summer Campaign Notes"


def test_wordpress_sync_back(auth_header, monkeypatch, saved_revision, sync_payload):
    captured_payloads = []

    def mock_handler(request: httpx.Request):
        url = str(request.url)
        if request.method == "GET" and "/wp-json/wp/v2/posts/101" in url:
            assert request.url.params["context"] == "edit"
            return httpx.Response(200, json={"status": "draft", "modified": "2026-11-10T12:00:00"})
        if request.method == "POST" and "/wp-json/wp/v2/posts/101" in url:
            captured_payloads.append(json.loads(request.content))
            return httpx.Response(200, json={
                "id": 101,
                "title": {"rendered": "Q4 Product Announcement"},
                "status": "draft",
                "modified": "2026-11-10T12:01:00",
                "link": "https://example.com/?p=101&preview=true",
            })
        return httpx.Response(404)

    transport = httpx.MockTransport(mock_handler)
    monkeypatch.setattr("app.wordpress._get_client", lambda: httpx.Client(transport=transport))

    with TestClient(app) as client:
        spoofed_score = (saved_revision["score"] + 1) % 101
        res = client.post(
            "/api/wordpress/sync-back",
            headers=auth_header,
            json={**sync_payload, "audit_score": spoofed_score},
        )
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert data["post_id"] == 101
        assert data["audit_reference"] == f"BG-{saved_revision['id'][:8]}"
        assert data["status"] == "draft"
        assert data["date_modified"] == "2026-11-10T12:01:00"
        assert len(captured_payloads) == 1
        assert captured_payloads[0]["status"] == "draft"
        assert captured_payloads[0]["content"].startswith(f"{sync_payload['content']}\n\n")
        assert "BrandGuard AI Compliance Audit Reference" in captured_payloads[0]["content"]
        assert f"Score: {saved_revision['score']}/100" in captured_payloads[0]["content"]
        assert "<small>" not in captured_payloads[0]["content"]


@pytest.mark.parametrize("overrides, expected_status", [
    ({"audit_id": None}, 422),
    ({"audit_id": "missing-audit"}, 404),
    ({"content": "A newer draft that has not been audited."}, 409),
])
def test_wordpress_sync_requires_a_matching_audit(auth_header, monkeypatch, sync_payload, overrides, expected_status):
    monkeypatch.setattr("app.wordpress._get_client", lambda: pytest.fail("Invalid audits must not reach WordPress"))

    with TestClient(app) as client:
        response = client.post("/api/wordpress/sync-back", headers=auth_header, json={**sync_payload, **overrides})
        assert response.status_code == expected_status


def test_wordpress_sync_rejects_another_creators_audit(monkeypatch, sync_payload):
    monkeypatch.setattr("app.wordpress._get_client", lambda: pytest.fail("Inaccessible audits must not reach WordPress"))
    token = create_access_token({"username": "other@brandguard.local", "role": "creator"})

    with TestClient(app) as client:
        response = client.post("/api/wordpress/sync-back", headers={"Authorization": f"Bearer {token}"}, json=sync_payload)
        assert response.status_code == 404


@pytest.mark.parametrize("remote_status, modified", [
    ("publish", "2026-11-10T12:00:00"),
    ("draft", "2026-11-10T12:01:00"),
])
def test_sync_rejects_changed_or_published_post(auth_header, monkeypatch, sync_payload, remote_status, modified):
    def mock_handler(request: httpx.Request):
        assert request.method == "GET", "Conflicted drafts must not be overwritten"
        return httpx.Response(200, json={"status": remote_status, "modified": modified})

    transport = httpx.MockTransport(mock_handler)
    monkeypatch.setattr("app.wordpress._get_client", lambda: httpx.Client(transport=transport))

    with TestClient(app) as client:
        response = client.post("/api/wordpress/sync-back", headers=auth_header, json=sync_payload)
        assert response.status_code == 409


@pytest.mark.parametrize("endpoint", ["connect", "drafts", "sync-back"])
def test_judge_workspace_can_disable_live_wordpress(auth_header, monkeypatch, endpoint):
    monkeypatch.setattr("app.main.settings.wordpress_live_enabled", False)
    with TestClient(app) as client:
        response = client.post(f"/api/wordpress/{endpoint}", headers=auth_header, json={
            "site_url": "https://example.com",
            "username": "editor",
            "app_password": "secret_app_pw",
            "post_id": 101,
            "content": "Revised draft.",
            "audit_id": "missing-audit",
        })
        assert response.status_code == 403
