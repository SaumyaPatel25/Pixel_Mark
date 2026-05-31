import pytest
import httpx
import asyncio
from datetime import datetime, timedelta

BASE_URL = "http://127.0.0.1:8765"

@pytest.mark.asyncio
async def test_marker_capture_flow():
    async with httpx.AsyncClient(base_url=BASE_URL, timeout=10.0) as client:
        # 1. Login or register a test user
        login_resp = await client.post("/auth/login", json={
            "email": "test@example.com",
            "password": "password123"
        })
        if login_resp.status_code != 200:
            await client.post("/auth/register", json={
                "email": "test@example.com",
                "password": "password123",
                "name": "Test User"
            })
            login_resp = await client.post("/auth/login", json={
                "email": "test@example.com",
                "password": "password123"
            })
        
        assert login_resp.status_code == 200
        auth_token = login_resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {auth_token}"}

        # 2. Get/create project
        projects_resp = await client.get("/projects/", headers=headers)
        projects = projects_resp.json()
        if not projects:
            await client.post("/projects/", headers=headers, json={"name": "Marker Test Proj", "url": "https://example.com"})
            projects_resp = await client.get("/projects/", headers=headers)
            projects = projects_resp.json()
        
        project = projects[0]

        # 3. Get/create session
        sessions_resp = await client.get(f"/sessions/project/{project['id']}", headers=headers)
        sessions = sessions_resp.json()
        if not sessions:
            await client.post("/sessions/", headers=headers, json={"project_id": project["id"], "title": "Marker Session"})
            sessions_resp = await client.get(f"/sessions/project/{project['id']}", headers=headers)
            sessions = sessions_resp.json()
            
        session = sessions[0]

        # 4. Create a share link
        share_resp = await client.post("/share-links/", headers=headers, json={
            "session_id": session["id"],
            "label": "Reviewer Share Link",
            "can_comment": True
        })
        assert share_resp.status_code == 200
        share_data = share_resp.json()
        share_token = share_data["token"]

        # 5. Test 2B: POST /markers/ with valid payload (standard user auth)
        marker_resp = await client.post("/markers/", headers=headers, json={
            "session_id": session["id"],
            "title": "Header misalignment",
            "description": "The brand logo is shifted 4px to the right",
            "page_url": "https://example.com/home",
            "x": 120.5,
            "y": 450.2,
            "viewport_x": 120.5,
            "viewport_y": 300.0,
            "element_selector": "header > .logo-wrapper img",
            "element_text": "Company Logo",
            "element_tag": "IMG",
            "screenshot_required": False
        })
        assert marker_resp.status_code == 200
        marker_data = marker_resp.json()
        assert marker_data["x"] == 120.5
        assert marker_data["element_selector"] == "header > .logo-wrapper img"

        # 6. Test 2B: POST /markers/ with share_token (simulating unauthenticated public reviewer drop)
        public_marker_resp = await client.post("/markers/", json={
            "share_token": share_token,
            "title": "Public Pin Drop",
            "note": "Dropped manually without account",
            "page_url": "https://example.com/home",
            "x": 300.0,
            "y": 600.0,
            "viewport_x": 300.0,
            "viewport_y": 450.0,
            "element_selector": ".hero-section",
            "element_text": "Join the revolution",
            "element_tag": "SECTION",
            "severity": "high",
            "screenshot_required": True # should trigger mock background job
        })
        assert public_marker_resp.status_code == 200
        public_marker_data = public_marker_resp.json()
        assert public_marker_data["session_id"] == session["id"]
        assert public_marker_data["created_via"] == "agent" # default created_via is agent
        assert public_marker_data["priority"] == "high" # severity maps to priority

        # 7. Test 2B: Rejects invalid payloads (e.g. missing both session_id, project_id, and share_token)
        invalid_resp = await client.post("/markers/", json={
            "title": "Invalid Marker",
            "x": 10.0,
            "y": 20.0
        })
        assert invalid_resp.status_code == 422

        # 8. Test 2B: 2-second double-click deduplication
        dup_resp = await client.post("/markers/", headers=headers, json={
            "session_id": session["id"],
            "title": "Header misalignment duplicate",
            "description": "Double click click spam",
            "page_url": "https://example.com/home",
            "x": 120.5,
            "y": 450.2, # exact same coords as marker 1
            "viewport_x": 120.5,
            "viewport_y": 300.0
        })
        assert dup_resp.status_code == 200
        dup_data = dup_resp.json()
        assert dup_data["id"] == marker_data["id"] # returns the existing marker!

        # 9. Test 2B: Invalid/Deactivated share token rejection
        # Let's revoke/delete the share link
        await client.delete(f"/share-links/{share_data['id']}", headers=headers)
        
        deactivated_resp = await client.post("/markers/", json={
            "share_token": share_token,
            "title": "Dropped on deactivated share link",
            "page_url": "https://example.com/home",
            "x": 300.0,
            "y": 600.0
        })
        assert deactivated_resp.status_code == 403 # deactivated (403)
        
        invalid_token_resp = await client.post("/markers/", json={
            "share_token": "completely_fake_token_1234",
            "title": "Dropped with fake token",
            "page_url": "https://example.com/home",
            "x": 300.0,
            "y": 600.0
        })
        assert invalid_token_resp.status_code == 404 # invalid/not found (404)


# ── Step 2v2 tests ────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_marker_issue_type_stored():
    """Marker issue_type is stored and returned correctly."""
    async with httpx.AsyncClient(base_url=BASE_URL, timeout=10.0) as client:
        login_resp = await client.post("/auth/login", json={"email": "test@example.com", "password": "password123"})
        assert login_resp.status_code == 200
        token = login_resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        projects = (await client.get("/projects/", headers=headers)).json()
        project = projects[0]
        sessions = (await client.get(f"/sessions/project/{project['id']}", headers=headers)).json()
        session = sessions[0]

        for issue_type in ["layout", "copy", "interaction", "navigation", "rendering", "canvas_webgl", "other"]:
            resp = await client.post("/markers/", headers=headers, json={
                "session_id": session["id"],
                "page_url": "https://example.com/test",
                "x": float(hash(issue_type) % 800),
                "y": float(hash(issue_type) % 600),
                "issue_type": issue_type,
                "element_tag": "DIV",
                "note": f"Testing issue type: {issue_type}"
            })
            assert resp.status_code == 200, f"Failed for issue_type={issue_type}: {resp.text}"
            data = resp.json()
            assert data["issue_type"] == issue_type, f"Expected issue_type={issue_type}, got {data.get('issue_type')}"


@pytest.mark.asyncio
async def test_marker_no_ctrl_key_in_payload():
    """Verify no ctrlKey field is expected or processed in payload."""
    async with httpx.AsyncClient(base_url=BASE_URL, timeout=10.0) as client:
        login_resp = await client.post("/auth/login", json={"email": "test@example.com", "password": "password123"})
        token = login_resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        projects = (await client.get("/projects/", headers=headers)).json()
        sessions = (await client.get(f"/sessions/project/{projects[0]['id']}", headers=headers)).json()
        session = sessions[0]

        # A payload with ctrlKey (should be silently ignored)
        resp = await client.post("/markers/", headers=headers, json={
            "session_id": session["id"],
            "page_url": "https://example.com/test",
            "x": 55.0,
            "y": 77.0,
            "issue_type": "interaction",
            "ctrlKey": True,  # should be silently ignored by the backend
            "element_tag": "BUTTON",
        })
        assert resp.status_code == 200
        data = resp.json()
        # ctrlKey must not appear in the response
        assert "ctrlKey" not in data, "ctrlKey should not be stored or returned"


@pytest.mark.asyncio
async def test_marker_created_via_values():
    """Verify created_via is stored correctly for agent, alt_click, manual, fallback."""
    async with httpx.AsyncClient(base_url=BASE_URL, timeout=10.0) as client:
        login_resp = await client.post("/auth/login", json={"email": "test@example.com", "password": "password123"})
        token = login_resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        projects = (await client.get("/projects/", headers=headers)).json()
        sessions = (await client.get(f"/sessions/project/{projects[0]['id']}", headers=headers)).json()
        session = sessions[0]

        for via in ["agent", "alt_click", "manual", "fallback"]:
            resp = await client.post("/markers/", headers=headers, json={
                "session_id": session["id"],
                "page_url": "https://example.com/test",
                "x": 100.0 + hash(via) % 500,
                "y": 200.0 + hash(via) % 400,
                "created_via": via,
                "issue_type": "other",
            })
            assert resp.status_code == 200
            data = resp.json()
            assert data["created_via"] == via


@pytest.mark.asyncio
async def test_marker_bounding_box_and_browser_info():
    """Verify bounding_box and browser_info JSON fields are stored and returned."""
    async with httpx.AsyncClient(base_url=BASE_URL, timeout=10.0) as client:
        login_resp = await client.post("/auth/login", json={"email": "test@example.com", "password": "password123"})
        token = login_resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        projects = (await client.get("/projects/", headers=headers)).json()
        sessions = (await client.get(f"/sessions/project/{projects[0]['id']}", headers=headers)).json()
        session = sessions[0]

        bbox = {"x": 120, "y": 80, "width": 200, "height": 40, "top": 80, "right": 320, "bottom": 120, "left": 120}
        browser = {"name": "Chrome", "version": "124.0", "os": "macOS", "platform": "MacIntel", "user_agent": "Mozilla/5.0"}

        resp = await client.post("/markers/", headers=headers, json={
            "session_id": session["id"],
            "page_url": "https://example.com/bbox-browser-info-test-unique",
            "x": 751.0,
            "y": 553.0,
            "issue_type": "layout",
            "element_tag": "HEADER",
            "aria_label": "Main navigation bar",
            "aria_role": "banner",
            "bounding_box": bbox,
            "browser_info": browser,
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["bounding_box"] == bbox
        assert data["browser_info"] == browser
        assert data["aria_label"] == "Main navigation bar"
        assert data["aria_role"] == "banner"


@pytest.mark.asyncio
async def test_marker_canvas_webgl_issue_type():
    """Canvas/WebGL markers use canvas_webgl issue type and store canvas_context."""
    async with httpx.AsyncClient(base_url=BASE_URL, timeout=10.0) as client:
        login_resp = await client.post("/auth/login", json={"email": "test@example.com", "password": "password123"})
        token = login_resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        projects = (await client.get("/projects/", headers=headers)).json()
        sessions = (await client.get(f"/sessions/project/{projects[0]['id']}", headers=headers)).json()
        session = sessions[0]

        canvas_ctx = {
            "type": "webgl",
            "canvas_coords": {"x": 340, "y": 210},
            "canvas_size": {"width": 1920, "height": 1080},
            "gl_version": "WebGL 2.0",
            "gl_vendor": "Google Inc.",
            "gl_renderer": "ANGLE (NVIDIA)",
        }

        resp = await client.post("/markers/", headers=headers, json={
            "session_id": session["id"],
            "page_url": "https://example.com/canvas-webgl-unique-test",
            "x": 887.0,
            "y": 773.0,
            "issue_type": "canvas_webgl",
            "element_tag": "CANVAS",
            "renderer_type": "webgl",
            "canvas_context": canvas_ctx,
            "note": "Scene flickering at this point",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["issue_type"] == "canvas_webgl"
        assert data["renderer_type"] == "webgl"
        assert data["canvas_context"]["type"] == "webgl"

