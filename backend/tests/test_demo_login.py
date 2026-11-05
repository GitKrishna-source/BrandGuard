import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.mark.parametrize("role", ["creator", "manager", "legal"])
def test_demo_role_gets_working_session_without_credentials(role, monkeypatch):
    monkeypatch.setattr("app.main.settings.demo_login_enabled", True)
    with TestClient(app) as client:
        response = client.post("/api/auth/demo", json={"role": role})
        assert response.status_code == 200
        data = response.json()
        assert data["user"] == {"username": f"{role}@brandguard.local", "role": role}
        me = client.get("/api/auth/me", headers={
            "Authorization": f"Bearer {data['access_token']}"
        })
        assert me.status_code == 200
        assert me.json() == data["user"]


def test_demo_login_can_be_disabled(monkeypatch):
    monkeypatch.setattr("app.main.settings.demo_login_enabled", False)
    with TestClient(app) as client:
        assert client.post("/api/auth/demo", json={"role": "legal"}).status_code == 403


@pytest.mark.parametrize("payload", [{"role": "admin"}, {}])
def test_demo_login_rejects_unknown_or_missing_role(payload):
    with TestClient(app) as client:
        assert client.post("/api/auth/demo", json=payload).status_code == 422


def test_demo_roles_keep_approval_permissions(monkeypatch):
    monkeypatch.setattr("app.main.settings.demo_login_enabled", True)
    monkeypatch.setattr("app.services.settings.ai_provider", "local")
    with TestClient(app) as client:
        def session(role):
            token = client.post("/api/auth/demo", json={"role": role}).json()["access_token"]
            return {"Authorization": f"Bearer {token}"}

        creator, manager, legal = (session(role) for role in ("creator", "manager", "legal"))
        policy = client.post("/api/policies", headers=manager, json={"name": "Demo role test"})
        assert policy.status_code == 201
        audit = client.post("/api/audits", headers=creator, json={
            "policy_id": policy.json()["id"], "content": "We guarantee zero downtime."
        })
        assert audit.status_code == 201
        path = f"/api/audits/{audit.json()['id']}/reviews"
        # The token's role controls the decision even if the body claims another role.
        assert client.post(path, headers=creator, json={
            "reviewer_role": "legal", "status": "approved"
        }).status_code == 403
        assert client.post(path, headers=manager, json={
            "reviewer_role": "manager", "status": "approved"
        }).status_code == 403
        assert client.post(path, headers=legal, json={
            "reviewer_role": "legal", "status": "approved"
        }).status_code == 201
