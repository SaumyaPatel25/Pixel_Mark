import httpx
import pytest
import uuid

RAILWAY_URL = "https://pixelmark-production.up.railway.app"
state = {
    "token": None,
    "project_id": None,
    "session_id": None,
    "marker_id": None
}

@pytest.fixture(scope="module", autouse=True)
async def setup_auth():
    email = f"qatest_{uuid.uuid4().hex[:6]}@pixelmark.dev"
    async with httpx.AsyncClient(timeout=10) as client:
        # Register
        resp = await client.post(
            f"{RAILWAY_URL}/auth/register",
            json={"email": email, "password": "QaTest1234!", "name": "Chain Tester"}
        )
        assert resp.status_code == 200
        state["token"] = resp.json()["access_token"]

async def test_create_project():
    async with httpx.AsyncClient(timeout=10) as client:
        headers = {"Authorization": f"Bearer {state['token']}"}
        response = await client.post(
            f"{RAILWAY_URL}/projects/",
            json={"name": "QA Project", "url": "https://staging.test.com"},
            headers=headers
        )
        assert response.status_code in [200, 201]
        data = response.json()
        assert "id" in data
        assert data["name"] == "QA Project"
        state["project_id"] = data["id"]
        print(f"\nCreate Project: PASS (ID: {state['project_id']})")

async def test_list_projects_contains_new():
    async with httpx.AsyncClient(timeout=10) as client:
        headers = {"Authorization": f"Bearer {state['token']}"}
        response = await client.get(f"{RAILWAY_URL}/projects/", headers=headers)
        assert response.status_code in [200, 201]
        project_ids = [p["id"] for p in response.json()]
        assert state["project_id"] in project_ids
        print("List Projects: PASS")

async def test_get_project_by_id():
    async with httpx.AsyncClient(timeout=10) as client:
        headers = {"Authorization": f"Bearer {state['token']}"}
        response = await client.get(f"{RAILWAY_URL}/projects/{state['project_id']}", headers=headers)
        assert response.status_code in [200, 201]
        assert response.json()["id"] == state["project_id"]
        print("Get Project By ID: PASS")

async def test_update_project_name():
    async with httpx.AsyncClient(timeout=10) as client:
        headers = {"Authorization": f"Bearer {state['token']}"}
        response = await client.patch(
            f"{RAILWAY_URL}/projects/{state['project_id']}",
            json={"name": "QA Project Updated"},
            headers=headers
        )
        assert response.status_code in [200, 201]
        assert response.json()["name"] == "QA Project Updated"
        print("Update Project Name: PASS")

async def test_create_session():
    async with httpx.AsyncClient(timeout=10) as client:
        headers = {"Authorization": f"Bearer {state['token']}"}
        response = await client.post(
            f"{RAILWAY_URL}/sessions/",
            json={"project_id": state["project_id"], "title": "QA Session"},
            headers=headers
        )
        assert response.status_code in [200, 201]
        data = response.json()
        assert "id" in data
        assert data["project_id"] == state["project_id"]
        state["session_id"] = data["id"]
        print(f"Create Session: PASS (ID: {state['session_id']})")

async def test_list_sessions_for_project():
    async with httpx.AsyncClient(timeout=10) as client:
        headers = {"Authorization": f"Bearer {state['token']}"}
        response = await client.get(f"{RAILWAY_URL}/sessions/project/{state['project_id']}", headers=headers)
        assert response.status_code in [200, 201]
        session_ids = [s["id"] for s in response.json()]
        assert state["session_id"] in session_ids
        print("List Sessions For Project: PASS")

async def test_create_marker_with_full_context():
    async with httpx.AsyncClient(timeout=10) as client:
        headers = {"Authorization": f"Bearer {state['token']}"}
        marker_data = {
            "session_id": state["session_id"],
            "title": "Button broken on mobile",
            "description": "Submit button misaligned",
            "url": "https://staging.test.com/checkout",
            "xpath": "/html/body/div/main/button",
            "css_selector": "#submit-btn",
            "inner_text": "Submit",
            "viewport": {"width": 375, "height": 812},
            "browser": "Safari",
            "os": "iOS 17",
            "scroll_position": {"x": 0, "y": 320},
            "console_errors": ["TypeError: null is not an object"],
            "network_errors": [{"url": "/api/order", "status": 500}],
            "priority": "high"
        }
        response = await client.post(f"{RAILWAY_URL}/markers/", json=marker_data, headers=headers)
        assert response.status_code in [200, 201]
        data = response.json()
        assert data["title"] == marker_data["title"]
        assert data["priority"] == "high"
        state["marker_id"] = data["id"]
        print(f"Create Marker With Context: PASS (ID: {state['marker_id']})")

async def test_marker_default_status_is_open():
    async with httpx.AsyncClient(timeout=10) as client:
        headers = {"Authorization": f"Bearer {state['token']}"}
        response = await client.get(f"{RAILWAY_URL}/markers/session/{state['session_id']}", headers=headers)
        assert response.status_code in [200, 201]
        markers = response.json()
        marker = next(m for m in markers if m["id"] == state["marker_id"])
        assert marker["status"] == "open"
        print("Marker Default Status Is Open: PASS")

async def test_update_marker_to_in_progress():
    async with httpx.AsyncClient(timeout=10) as client:
        headers = {"Authorization": f"Bearer {state['token']}"}
        response = await client.patch(
            f"{RAILWAY_URL}/markers/{state['marker_id']}",
            json={"status": "in_progress"},
            headers=headers
        )
        assert response.status_code in [200, 201]
        assert response.json()["status"] == "in_progress"
        print("Update Marker Status: PASS")

async def test_update_marker_priority_to_critical():
    async with httpx.AsyncClient(timeout=10) as client:
        headers = {"Authorization": f"Bearer {state['token']}"}
        response = await client.patch(
            f"{RAILWAY_URL}/markers/{state['marker_id']}",
            json={"priority": "critical"},
            headers=headers
        )
        assert response.status_code in [200, 201]
        assert response.json()["priority"] == "critical"
        print("Update Marker Priority: PASS")

async def test_resolve_marker():
    async with httpx.AsyncClient(timeout=10) as client:
        headers = {"Authorization": f"Bearer {state['token']}"}
        response = await client.patch(
            f"{RAILWAY_URL}/markers/{state['marker_id']}",
            json={"status": "resolved"},
            headers=headers
        )
        assert response.status_code in [200, 201]
        assert response.json()["status"] == "resolved"
        print("Resolve Marker: PASS")

async def test_marker_context_fields_preserved():
    async with httpx.AsyncClient(timeout=10) as client:
        headers = {"Authorization": f"Bearer {state['token']}"}
        response = await client.get(f"{RAILWAY_URL}/markers/session/{state['session_id']}", headers=headers)
        assert response.status_code in [200, 201]
        markers = response.json()
        marker = next(m for m in markers if m["id"] == state["marker_id"])
        assert marker["xpath"] == "/html/body/div/main/button"
        assert marker["viewport"] == {"width": 375, "height": 812}
        assert len(marker["console_errors"]) > 0
        assert marker["browser"] == "Safari"
        print("Marker Context Fields Preserved: PASS")

async def test_delete_marker():
    async with httpx.AsyncClient(timeout=10) as client:
        headers = {"Authorization": f"Bearer {state['token']}"}
        response = await client.delete(f"{RAILWAY_URL}/markers/{state['marker_id']}", headers=headers)
        assert response.status_code in [200, 201]
        assert response.json()["deleted"] is True
        print("Delete Marker: PASS")

async def test_marker_gone_after_delete():
    async with httpx.AsyncClient(timeout=10) as client:
        headers = {"Authorization": f"Bearer {state['token']}"}
        response = await client.get(f"{RAILWAY_URL}/markers/session/{state['session_id']}", headers=headers)
        assert response.status_code in [200, 201]
        marker_ids = [m["id"] for m in response.json()]
        assert state["marker_id"] not in marker_ids
        print("Marker Gone After Delete: PASS")
