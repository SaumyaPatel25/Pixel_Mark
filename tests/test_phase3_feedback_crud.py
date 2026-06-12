import pytest
import httpx
import sys
import os
import uuid
import asyncio
from datetime import datetime

# Add backend to path so we can import modules
sys.path.append(os.path.join(os.path.dirname(os.path.dirname(__file__)), "backend"))

from main import app
from database import DATABASE_URL
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.pool import NullPool
from sqlalchemy import select, delete
from models import Session, PageVisit, Marker, Project, User, Organization
from dependencies import get_db, get_current_user

# Override database engine for tests
test_engine = create_async_engine(
    DATABASE_URL,
    poolclass=NullPool,
    connect_args={"ssl": True} if "neon.tech" in DATABASE_URL else {}
)

TestSessionLocal = async_sessionmaker(
    test_engine,
    expire_on_commit=False,
    class_=AsyncSession
)

async def override_get_db():
    async with TestSessionLocal() as session:
        yield session

async def override_get_current_user():
    return User(id="mock-user-id", email="mock@pixelmark.dev", name="Mock User")

app.dependency_overrides[get_db] = override_get_db
app.dependency_overrides[get_current_user] = override_get_current_user

@pytest.fixture(scope="module")
def anyio_backend():
    return "asyncio"

@pytest.fixture(scope="module")
def event_loop():
    policy = asyncio.get_event_loop_policy()
    loop = policy.new_event_loop()
    yield loop
    loop.close()

@pytest.fixture(scope="module")
async def test_setup():
    # Setup: Create a temporary user, organization, project, and session
    async with TestSessionLocal() as db:
        user_id = str(uuid.uuid4())
        user = User(
            id=user_id,
            email=f"phase3_crud_qa_{uuid.uuid4().hex[:6]}@pixelmark.dev",
            hashed_password="$argon2id$v=19$m=65536,t=3,p=4$...",
            name="Phase 3 CRUD QA User"
        )
        db.add(user)
        
        org_id = str(uuid.uuid4())
        org = Organization(
            id=org_id, 
            name="Phase 3 CRUD Org", 
            slug=f"phase-3-crud-org-{uuid.uuid4().hex[:6]}"
        )
        db.add(org)
        
        project_id = str(uuid.uuid4())
        project = Project(
            id=project_id,
            org_id=org_id,
            name="Phase 3 CRUD Project",
            url="https://example.com"
        )
        db.add(project)
        
        session_id = str(uuid.uuid4())
        session = Session(
            id=session_id,
            project_id=project_id,
            title="Phase 3 CRUD Session",
            pages_visited=0
        )
        db.add(session)
        await db.commit()
        
        yield {
            "user": user,
            "org": org,
            "project": project,
            "session": session
        }
        
        # Teardown: Cleanup all created records
        await db.execute(delete(Marker).where(Marker.session_id == session_id))
        await db.execute(delete(PageVisit).where(PageVisit.session_id == session_id))
        await db.execute(delete(Session).where(Session.id == session_id))
        await db.execute(delete(Project).where(Project.id == project_id))
        await db.execute(delete(Organization).where(Organization.id == org_id))
        await db.execute(delete(User).where(User.id == user_id))
        await db.commit()
        
    # Dispose of engine connection pool to release connections
    await test_engine.dispose()

@pytest.mark.asyncio
async def test_feedback_crud_pipeline(test_setup):
    session = test_setup["session"]
    feedback_id_1 = str(uuid.uuid4())
    feedback_id_2 = str(uuid.uuid4())
    
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        # 1. Test POST /sessions/{session_id}/feedback (Valid logical target URL)
        payload = {
            "pageurl": "https://example.com/dashboard/home",
            "pagetitle": "Dashboard Main",
            "issuetype": "layout",
            "priority": "high",
            "comment": "Hero image is clipped on mobile viewports",
            "renderertype": "dom",
            "createdvia": "agent",
            "capturepayload": {
                "id": feedback_id_1,
                "coordinates": {"pageX": 150, "pageY": 200},
                "target": {"selector": "#hero-img", "tagName": "IMG"},
                "screenshots": {"cropDataUrl": "data:image/png;base64,mock..."}
            }
        }
        resp = await client.post(f"/sessions/{session.id}/feedback", json=payload)
        assert resp.status_code == 201, resp.text
        data = resp.json()
        assert data["id"] == feedback_id_1
        assert data["sessionid"] == session.id
        assert data["pageurl"] == "https://example.com/dashboard/home"
        assert data["comment"] == "Hero image is clipped on mobile viewports"
        assert data["status"] == "submitted"
        assert data["capturepayload"]["coordinates"]["pageX"] == 150

        # 2. Test POST /sessions/{session_id}/feedback with proxy URL (Should extract and validate logical URL)
        proxy_payload = {
            "pageurl": f"http://localhost:8765/proxy/session/{session.id}/page?url=https%3A%2F%2Fexample.com%2Fsettings%3Ftab%3Dprofile",
            "pagetitle": "Profile Settings",
            "issuetype": "interaction",
            "priority": "medium",
            "comment": "Submit button does not respond to clicks",
            "renderertype": "dom",
            "createdvia": "agent",
            "capturepayload": {
                "id": feedback_id_2,
                "coordinates": {"pageX": 300, "pageY": 400},
                "target": {"selector": "#submit-btn", "tagName": "BUTTON"}
            }
        }
        resp = await client.post(f"/sessions/{session.id}/feedback", json=proxy_payload)
        assert resp.status_code == 201, resp.text
        proxy_data = resp.json()
        # Should be stored as the logical URL
        assert proxy_data["pageurl"] == "https://example.com/settings?tab=profile"

        # 3. Test POST /sessions/{session_id}/feedback (Invalid domain scope using a real domain like google.com)
        invalid_domain_payload = {
            "pageurl": "https://google.com/search",
            "pagetitle": "Google Search",
            "issuetype": "other",
            "priority": "low",
            "comment": "Out of scope url",
            "capturepayload": {}
        }
        resp = await client.post(f"/sessions/{session.id}/feedback", json=invalid_domain_payload)
        assert resp.status_code == 403
        assert "Navigation blocked" in resp.json()["detail"]

        # 4. Test POST /sessions/{session_id}/feedback (Blocked private IP / SSRF)
        ssrf_payload = {
            "pageurl": "http://127.0.0.1:8500/admin",
            "pagetitle": "SSRF target",
            "issuetype": "other",
            "priority": "low",
            "comment": "SSRF test",
            "capturepayload": {}
        }
        resp = await client.post(f"/sessions/{session.id}/feedback", json=ssrf_payload)
        assert resp.status_code == 403
        assert "SSRF target blocked" in resp.json()["detail"]

        # 5. Test GET /sessions/{session_id}/feedback (List all)
        resp = await client.get(f"/sessions/{session.id}/feedback")
        assert resp.status_code == 200
        list_data = resp.json()
        assert list_data["total"] == 2
        items = list_data["items"]
        assert items[0]["id"] == feedback_id_2 # Newest first
        assert items[1]["id"] == feedback_id_1

        # 6. Test GET /sessions/{session_id}/feedback with pageurl filter
        resp = await client.get(f"/sessions/{session.id}/feedback?pageurl=https%3A%2F%2Fexample.com%2Fdashboard%2Fhome")
        assert resp.status_code == 200
        filtered_data = resp.json()
        assert filtered_data["total"] == 1
        assert filtered_data["items"][0]["id"] == feedback_id_1

        # 7. Test GET /sessions/{session_id}/feedback/{feedback_id} (Retrieve one)
        resp = await client.get(f"/sessions/{session.id}/feedback/{feedback_id_1}")
        assert resp.status_code == 200
        item = resp.json()
        assert item["comment"] == "Hero image is clipped on mobile viewports"

        # 8. Test PATCH /sessions/{session_id}/feedback/{feedback_id} (Update details)
        patch_payload = {
            "status": "resolved",
            "issuetype": "copy",
            "priority": "low",
            "comment": "Updated: text alignment issue fixed"
        }
        resp = await client.patch(f"/sessions/{session.id}/feedback/{feedback_id_1}", json=patch_payload)
        assert resp.status_code == 200
        patched_item = resp.json()
        assert patched_item["status"] == "resolved"
        assert patched_item["issuetype"] == "copy"
        assert patched_item["priority"] == "low"
        assert patched_item["comment"] == "Updated: text alignment issue fixed"
