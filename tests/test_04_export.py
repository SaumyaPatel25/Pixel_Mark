import httpx
import pytest
import uuid

import os
RAILWAY_URL = os.environ.get("RAILWAY_URL", "https://stage-production.up.railway.app")
state = {
    "token": None,
    "project_id": None,
    "session_id": None
}

@pytest.fixture(scope="module", autouse=True)
async def setup_data():
    email = f"qatest_{uuid.uuid4().hex[:6]}@stage.dev"
    async with httpx.AsyncClient(timeout=10) as client:
        # Register
        resp = await client.post(
            f"{RAILWAY_URL}/auth/register",
            json={"email": email, "password": "QaTest1234!", "name": "Export Tester"}
        )
        assert resp.status_code == 200
        state["token"] = resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {state['token']}"}
        
        # Project
        resp = await client.post(f"{RAILWAY_URL}/projects/", json={"name": "Export Test Project"}, headers=headers)
        state["project_id"] = resp.json()["id"]
        
        # Session
        resp = await client.post(f"{RAILWAY_URL}/sessions/", json={"project_id": state["project_id"], "title": "Export Session"}, headers=headers)
        state["session_id"] = resp.json()["id"]
        
        # 3 Markers
        markers = [
            {"title": "Critical Bug", "priority": "critical", "console_errors": ["Error 1"]},
            {"title": "High Bug", "priority": "high", "browser": "Safari"},
            {"title": "Low Bug", "priority": "low"}
        ]
        for m in markers:
            await client.post(f"{RAILWAY_URL}/markers/", json={"session_id": state["session_id"], **m}, headers=headers)

async def test_export_markdown_status():
    async with httpx.AsyncClient(timeout=10) as client:
        headers = {"Authorization": f"Bearer {state['token']}"}
        response = await client.get(f"{RAILWAY_URL}/export/session/{state['session_id']}/markdown", headers=headers)
        assert response.status_code == 200
        assert "text" in response.headers["Content-Type"]
        print("\nExport Markdown Status: PASS")

async def test_export_markdown_content():
    async with httpx.AsyncClient(timeout=10) as client:
        headers = {"Authorization": f"Bearer {state['token']}"}
        response = await client.get(f"{RAILWAY_URL}/export/session/{state['session_id']}/markdown", headers=headers)
        text = response.text
        assert "QA Report" in text or "Export" in text or "Markers" in text
        assert "CRITICAL" in text or "Critical Bug" in text
        assert "HIGH" in text or "High Bug" in text
        assert "Safari" in text
        print("Export Markdown Content: PASS")

async def test_export_markdown_all_markers_present():
    async with httpx.AsyncClient(timeout=10) as client:
        headers = {"Authorization": f"Bearer {state['token']}"}
        response = await client.get(f"{RAILWAY_URL}/export/session/{state['session_id']}/markdown", headers=headers)
        # Check for marker sections
        assert response.text.count("Bug") >= 3
        print("Export Markdown All Markers Present: PASS")

async def test_export_csv_status():
    async with httpx.AsyncClient(timeout=10) as client:
        headers = {"Authorization": f"Bearer {state['token']}"}
        response = await client.get(f"{RAILWAY_URL}/export/session/{state['session_id']}/csv", headers=headers)
        assert response.status_code == 200
        assert "csv" in response.headers["Content-Type"] or "text" in response.headers["Content-Type"]
        print("Export CSV Status: PASS")

async def test_export_csv_structure():
    async with httpx.AsyncClient(timeout=10) as client:
        headers = {"Authorization": f"Bearer {state['token']}"}
        response = await client.get(f"{RAILWAY_URL}/export/session/{state['session_id']}/csv", headers=headers)
        lines = response.text.strip().split("\n")
        assert len(lines) >= 4  # Header + 3 markers
        header = lines[0].lower()
        assert "id" in header and "title" in header and "priority" in header
        print("Export CSV Structure: PASS")

async def test_export_json_status():
    async with httpx.AsyncClient(timeout=10) as client:
        headers = {"Authorization": f"Bearer {state['token']}"}
        response = await client.get(f"{RAILWAY_URL}/export/session/{state['session_id']}/json", headers=headers)
        assert response.status_code == 200
        assert "application/json" in response.headers["Content-Type"]
        print("Export JSON Status: PASS")

async def test_export_json_structure():
    async with httpx.AsyncClient(timeout=10) as client:
        headers = {"Authorization": f"Bearer {state['token']}"}
        response = await client.get(f"{RAILWAY_URL}/export/session/{state['session_id']}/json", headers=headers)
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 3
        assert "id" in data[0] and "title" in data[0]
        print("Export JSON Structure: PASS")

async def test_export_requires_auth():
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.get(f"{RAILWAY_URL}/export/session/{state['session_id']}/markdown")
        assert response.status_code in [401, 403]
        print("Export Requires Auth: PASS")
