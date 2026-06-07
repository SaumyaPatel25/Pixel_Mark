import httpx
import pytest
import uuid

RAILWAY_URL = "http://localhost:8000"
state = {
    "token": None,
    "session_id": None,
    "share_token": None,
    "readonly_token": None,
    "protected_token": None,
    "share_id": None
}

@pytest.fixture(scope="module", autouse=True)
async def setup_data():
    email = f"qatest_{uuid.uuid4().hex[:6]}@pixelmark.dev"
    async with httpx.AsyncClient(timeout=10) as client:
        # Register
        resp = await client.post(
            f"{RAILWAY_URL}/auth/register",
            json={"email": email, "password": "QaTest1234!", "name": "Share Tester"}
        )
        assert resp.status_code == 200
        state["token"] = resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {state['token']}"}
        
        # Project
        resp = await client.post(f"{RAILWAY_URL}/projects/", json={"name": "Share Test Project"}, headers=headers)
        project_id = resp.json()["id"]
        
        # Session
        resp = await client.post(f"{RAILWAY_URL}/sessions/", json={"project_id": project_id, "title": "Share Session"}, headers=headers)
        state["session_id"] = resp.json()["id"]

async def test_create_share_link_basic():
    async with httpx.AsyncClient(timeout=10) as client:
        headers = {"Authorization": f"Bearer {state['token']}"}
        response = await client.post(
            f"{RAILWAY_URL}/shares/",
            json={"session_id": state["session_id"], "can_comment": True},
            headers=headers
        )
        assert response.status_code in [200, 201]
        data = response.json()
        assert "token" in data
        assert data["can_comment"] is True
        state["share_token"] = data["token"]
        state["share_id"] = data["id"]
        print(f"\nCreate Share Link Basic: PASS (Token: {state['share_token']})")

async def test_create_share_link_readonly():
    async with httpx.AsyncClient(timeout=10) as client:
        headers = {"Authorization": f"Bearer {state['token']}"}
        response = await client.post(
            f"{RAILWAY_URL}/shares/",
            json={"session_id": state["session_id"], "can_comment": False},
            headers=headers
        )
        assert response.status_code in [200, 201]
        state["readonly_token"] = response.json()["token"]
        print("Create Share Link Readonly: PASS")

async def test_create_share_link_with_password():
    async with httpx.AsyncClient(timeout=10) as client:
        headers = {"Authorization": f"Bearer {state['token']}"}
        response = await client.post(
            f"{RAILWAY_URL}/shares/",
            json={"session_id": state["session_id"], "can_comment": True, "password": "testpass123"},
            headers=headers
        )
        assert response.status_code in [200, 201]
        state["protected_token"] = response.json()["token"]
        print("Create Share Link Protected: PASS")

async def test_list_share_links():
    async with httpx.AsyncClient(timeout=10) as client:
        headers = {"Authorization": f"Bearer {state['token']}"}
        response = await client.get(f"{RAILWAY_URL}/shares/session/{state['session_id']}", headers=headers)
        assert response.status_code == 200
        tokens = [s["token"] for s in response.json()]
        assert state["share_token"] in tokens
        assert len(tokens) >= 3
        print("List Share Links: PASS")

async def test_access_share_link_no_auth_needed():
    async with httpx.AsyncClient(timeout=10) as client:
        # Client-facing endpoint should not need Bearer token
        response = await client.post(f"{RAILWAY_URL}/shares/access/{state['share_token']}", json={})
        assert response.status_code == 200
        data = response.json()
        assert data["session_id"] == state["session_id"]
        print("Access Share Link No Auth: PASS")

async def test_access_share_link_returns_session_info():
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.post(f"{RAILWAY_URL}/shares/access/{state['share_token']}", json={})
        assert response.status_code == 200
        assert response.json()["can_comment"] is True
        print("Access Share Link Info: PASS")

async def test_access_readonly_link():
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.post(f"{RAILWAY_URL}/shares/access/{state['readonly_token']}", json={})
        assert response.status_code == 200
        assert response.json()["can_comment"] is False
        print("Access Readonly Link: PASS")

async def test_access_protected_link_wrong_password():
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.post(
            f"{RAILWAY_URL}/shares/access/{state['protected_token']}",
            json={"password": "wrongpassword"}
        )
        assert response.status_code == 403
        print("Access Protected Link Wrong Password Rejected: PASS")

async def test_access_protected_link_correct_password():
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.post(
            f"{RAILWAY_URL}/shares/access/{state['protected_token']}",
            json={"password": "testpass123"}
        )
        assert response.status_code == 200
        print("Access Protected Link Correct Password: PASS")

async def test_access_invalid_token():
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.post(f"{RAILWAY_URL}/shares/access/totally-fake-token-xyz123", json={})
        assert response.status_code == 404
        print("Access Invalid Token Rejected: PASS")

async def test_delete_share_link():
    async with httpx.AsyncClient(timeout=10) as client:
        headers = {"Authorization": f"Bearer {state['token']}"}
        response = await client.delete(f"{RAILWAY_URL}/shares/{state['share_id']}", headers=headers)
        assert response.status_code == 200
        assert response.json()["deleted"] is True
        print("Delete Share Link: PASS")

async def test_deleted_link_returns_404():
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.post(f"{RAILWAY_URL}/shares/access/{state['share_token']}", json={})
        assert response.status_code == 404
        print("Access Deleted Link Rejected: PASS")
