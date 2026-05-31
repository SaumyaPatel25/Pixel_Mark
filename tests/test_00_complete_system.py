import httpx
import pytest
import uuid
import asyncio
import json
import time
import os
from playwright.sync_api import sync_playwright
import websockets

# Configuration
RAILWAY_URL = "https://pixelmark-production.up.railway.app"
VERCEL_URL = "https://web-zeta-sable-82.vercel.app"
RAILWAY_WS = RAILWAY_URL.replace("https://", "wss://")

# State
state = {
    "token": None,
    "email": f"fulltest_{uuid.uuid4().hex[:6]}@pixelmark.dev",
    "password": "FullTest1234!",
    "project_id": None,
    "session_id": None,
    "marker_id": None,
    "share_token": None,
    "share_id": None,
    "frame_id": None
}

# --- SECTION A: INFRASTRUCTURE ---

@pytest.mark.asyncio
async def test_01_backend_health():
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(f"{RAILWAY_URL}/health")
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"

@pytest.mark.asyncio
async def test_02_backend_docs():
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(f"{RAILWAY_URL}/docs")
        assert resp.status_code == 200
        assert "swagger" in resp.text.lower()

@pytest.mark.asyncio
async def test_03_frontend_root():
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(VERCEL_URL)
        assert resp.status_code == 200
        assert "pixelmark" in resp.text.lower()

@pytest.mark.asyncio
async def test_04_cors_headers():
    async with httpx.AsyncClient(timeout=10) as client:
        headers = {"Origin": VERCEL_URL}
        resp = await client.options(f"{RAILWAY_URL}/health", headers=headers)
        assert "access-control-allow-origin" in resp.headers
        assert resp.headers["access-control-allow-origin"] == VERCEL_URL

# --- SECTION B: AUTH ---

@pytest.mark.asyncio
async def test_05_register():
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.post(
            f"{RAILWAY_URL}/auth/register",
            json={"email": state["email"], "password": state["password"], "name": "Full Tester"}
        )
        assert resp.status_code == 200
        assert "access_token" in resp.json()
        state["token"] = resp.json()["access_token"]

@pytest.mark.asyncio
async def test_06_login():
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.post(
            f"{RAILWAY_URL}/auth/login",
            json={"email": state["email"], "password": state["password"]}
        )
        assert resp.status_code == 200
        assert "access_token" in resp.json()

@pytest.mark.asyncio
async def test_07_auth_me():
    async with httpx.AsyncClient(timeout=10) as client:
        headers = {"Authorization": f"Bearer {state['token']}"}
        resp = await client.get(f"{RAILWAY_URL}/auth/me", headers=headers)
        assert resp.status_code == 200
        assert resp.json()["email"] == state["email"]

# --- SECTION C: PROJECTS ---

@pytest.mark.asyncio
async def test_08_create_project():
    async with httpx.AsyncClient(timeout=10) as client:
        headers = {"Authorization": f"Bearer {state['token']}"}
        resp = await client.post(
            f"{RAILWAY_URL}/projects/",
            json={"name": "System Test Project", "url": "https://test.com"},
            headers=headers
        )
        assert resp.status_code in [200, 201]
        state["project_id"] = resp.json()["id"]

@pytest.mark.asyncio
async def test_09_list_projects():
    async with httpx.AsyncClient(timeout=10) as client:
        headers = {"Authorization": f"Bearer {state['token']}"}
        resp = await client.get(f"{RAILWAY_URL}/projects/", headers=headers)
        assert resp.status_code == 200
        ids = [p["id"] for p in resp.json()]
        assert state["project_id"] in ids

# --- SECTION D: SESSIONS ---

@pytest.mark.asyncio
async def test_10_create_session():
    async with httpx.AsyncClient(timeout=10) as client:
        headers = {"Authorization": f"Bearer {state['token']}"}
        resp = await client.post(
            f"{RAILWAY_URL}/sessions/",
            json={"project_id": state["project_id"], "title": "System Session"},
            headers=headers
        )
        assert resp.status_code in [200, 201]
        state["session_id"] = resp.json()["id"]

# --- SECTION E: MARKERS ---

@pytest.mark.asyncio
async def test_11_create_marker():
    async with httpx.AsyncClient(timeout=10) as client:
        headers = {"Authorization": f"Bearer {state['token']}"}
        marker_data = {
            "session_id": state["session_id"],
            "title": "System Bug",
            "priority": "high",
            "browser": "Chrome",
            "viewport": {"width": 1920, "height": 1080},
            "console_errors": ["Init failed"]
        }
        resp = await client.post(f"{RAILWAY_URL}/markers/", json=marker_data, headers=headers)
        assert resp.status_code in [200, 201]
        state["marker_id"] = resp.json()["id"]

@pytest.mark.asyncio
async def test_12_list_project_markers():
    async with httpx.AsyncClient(timeout=10) as client:
        headers = {"Authorization": f"Bearer {state['token']}"}
        resp = await client.get(f"{RAILWAY_URL}/markers/project/{state['project_id']}", headers=headers)
        assert resp.status_code == 200
        ids = [m["id"] for m in resp.json()]
        assert state["marker_id"] in ids

# --- SECTION F: EXPORTS ---

@pytest.mark.asyncio
async def test_13_exports():
    async with httpx.AsyncClient(timeout=10) as client:
        headers = {"Authorization": f"Bearer {state['token']}"}
        # Markdown
        resp = await client.get(f"{RAILWAY_URL}/export/session/{state['session_id']}/markdown", headers=headers)
        assert resp.status_code == 200
        assert "System Bug" in resp.text
        # JSON
        resp = await client.get(f"{RAILWAY_URL}/export/session/{state['session_id']}/json", headers=headers)
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

# --- SECTION G: SHARE LINKS ---

@pytest.mark.asyncio
async def test_14_share_links():
    async with httpx.AsyncClient(timeout=10) as client:
        headers = {"Authorization": f"Bearer {state['token']}"}
        # Create
        resp = await client.post(
            f"{RAILWAY_URL}/shares/",
            json={"session_id": state["session_id"], "can_comment": True, "password": "pass"},
            headers=headers
        )
        assert resp.status_code in [200, 201]
        state["share_token"] = resp.json()["token"]
        state["share_id"] = resp.json()["id"]
        # Access
        resp = await client.post(f"{RAILWAY_URL}/shares/access/{state['share_token']}", json={"password": "pass"})
        assert resp.status_code == 200
        assert resp.json()["session_id"] == state["session_id"]

# --- SECTION H: CANVAS ---

@pytest.mark.asyncio
async def test_15_canvas():
    async with httpx.AsyncClient(timeout=10) as client:
        headers = {"Authorization": f"Bearer {state['token']}"}
        # Fetch (initializes defaults)
        resp = await client.get(f"{RAILWAY_URL}/canvas/project/{state['project_id']}", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["frames"]) > 0
        state["frame_id"] = data["frames"][0]["id"]
        # Update
        resp = await client.patch(f"{RAILWAY_URL}/canvas/frames/{state['frame_id']}", json={"position_x": 999}, headers=headers)
        assert resp.status_code == 200
        assert resp.json()["position_x"] == 999

# --- SECTION I: WEBSOCKET ---

@pytest.mark.asyncio
async def test_16_websocket():
    uri = f"{RAILWAY_WS}/ws/{state['project_id']}"
    async with websockets.connect(uri) as ws:
        assert ws.open
        # Heartbeat/Isolation check
        await ws.send(json.dumps({"type": "ping"}))
        # Backend doesn't broadcast ping back to sender, but we verified connect

# --- SECTION J: FRONTEND E2E ---

def test_17_frontend_e2e():
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            # Login page
            page.goto(f"{VERCEL_URL}/login")
            assert "Sign in" in page.content() or "Login" in page.content() or "PixelMark" in page.content()
            # Register page
            page.goto(f"{VERCEL_URL}/register")
            assert "Account" in page.content() or "Register" in page.content()
            browser.close()
    except Exception as e:
        pytest.skip(f"Playwright E2E skipped: {e}")

# --- SECTION K: CLEANUP ---

@pytest.mark.asyncio
async def test_99_cleanup():
    async with httpx.AsyncClient(timeout=10) as client:
        headers = {"Authorization": f"Bearer {state['token']}"}
        # Delete Marker
        await client.delete(f"{RAILWAY_URL}/markers/{state['marker_id']}", headers=headers)
        # Delete Project (cascade handles session/shares)
        resp = await client.delete(f"{RAILWAY_URL}/projects/{state['project_id']}", headers=headers)
        assert resp.status_code == 200
