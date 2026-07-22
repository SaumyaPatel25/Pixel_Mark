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
    return User(id="mock-shadow-user-id", email="shadow@stage.dev", name="Shadow User")

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
            email=f"phase4_qa_{uuid.uuid4().hex[:6]}@stage.dev",
            hashed_password="$argon2id$v=19$m=65536,t=3,p=4$...",
            name="Phase 4 Shadow QA User"
        )
        db.add(user)
        
        org_id = str(uuid.uuid4())
        org = Organization(
            id=org_id, 
            name="Phase 4 Org", 
            slug=f"phase-4-org-{uuid.uuid4().hex[:6]}"
        )
        db.add(org)
        
        project_id = str(uuid.uuid4())
        project = Project(
            id=project_id,
            org_id=org_id,
            name="Phase 4 WebComponents Project",
            url="https://opinvox.stage.com"
        )
        db.add(project)
        
        session_id = str(uuid.uuid4())
        session = Session(
            id=session_id,
            project_id=project_id,
            title="Phase 4 Shadow DOM Session",
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
async def test_shadow_dom_marker_creation_and_exporters(test_setup):
    session = test_setup["session"]
    
    async with httpx.AsyncClient(app=app, base_url="http://test") as client:
        # 1. Create Standard DOM Marker
        dom_payload = {
            "session_id": session.id,
            "title": "Main DOM Element Error",
            "page_url": "https://opinvox.stage.com/index",
            "page_title": "OpinVox Home",
            "renderer_type": "dom",
            "priority": "low"
        }
        resp = await client.post("/markers/", json=dom_payload)
        assert resp.status_code == 200
        assert resp.json()["marker_number"] == 1
        assert resp.json()["renderer_type"] == "dom"
        assert resp.json()["is_inside_shadow_dom"] is False
        
        # 2. Create Shadow DOM Marker (Depth 1 Host)
        shadow_payload = {
            "session_id": session.id,
            "title": "Visual Shift inside Custom Shadow Element",
            "page_url": "https://opinvox.stage.com/arena/3d",
            "page_title": "Arena 3D Map",
            "renderer_type": "shadow_dom",
            "priority": "critical",
            "is_inside_shadow_dom": True,
            "shadow_root_depth": 2,
            "shadow_host_tag": "user-card",
            "shadow_host_id": "profile-host",
            "shadow_host_class_list": ["flex", "w-full", "card-wrapper"],
            "shadow_path": "app-shell#root >> shadow-root >> user-card#profile-host >> shadow-root >> button#save"
        }
        resp = await client.post("/markers/", json=shadow_payload)
        assert resp.status_code == 200
        assert resp.json()["marker_number"] == 2
        assert resp.json()["renderer_type"] == "shadow_dom"
        assert resp.json()["is_inside_shadow_dom"] is True
        assert resp.json()["shadow_host_tag"] == "user-card"
        assert resp.json()["shadow_host_id"] == "profile-host"
        assert resp.json()["shadow_root_depth"] == 2
        assert resp.json()["shadow_path"] == "app-shell#root >> shadow-root >> user-card#profile-host >> shadow-root >> button#save"
        
        # 3. Verify markers grouping by page endpoint
        resp = await client.get(f"/markers/session/{session.id}/by-page")
        assert resp.status_code == 200
        pages = resp.json()["pages"]
        assert len(pages) == 2
        
        page_urls = [p["page_url"] for p in pages]
        assert "https://opinvox.stage.com/index" in page_urls
        assert "https://opinvox.stage.com/arena/3d" in page_urls
        
        arena_page = [p for p in pages if p["page_url"] == "https://opinvox.stage.com/arena/3d"][0]
        assert len(arena_page["markers"]) == 1
        assert arena_page["markers"][0]["is_inside_shadow_dom"] is True
        assert arena_page["markers"][0]["shadow_host_tag"] == "user-card"
        assert arena_page["markers"][0]["shadow_path"] == "app-shell#root >> shadow-root >> user-card#profile-host >> shadow-root >> button#save"
        
        # 4. Verify Markdown Exporter
        resp = await client.get(f"/export/session/{session.id}/markdown")
        assert resp.status_code == 200
        assert "Page: Arena 3D Map" in resp.text
        assert "Renderer: SHADOW_DOM" in resp.text
        assert "Shadow DOM: Yes" in resp.text
        assert "Shadow Host: `user-card#profile-host`" in resp.text
        assert "Shadow Path: `app-shell#root >> shadow-root >> user-card#profile-host >> shadow-root >> button#save`" in resp.text
        
        # 5. Verify CSV Exporter contains dynamic columns
        resp = await client.get(f"/export/session/{session.id}/csv")
        assert resp.status_code == 200
        csv_text = resp.text
        csv_header = csv_text.split("\n")[0]
        assert "Is Inside Shadow DOM" in csv_header
        assert "Shadow Root Depth" in csv_header
        assert "Shadow Host Tag" in csv_header
        assert "Shadow Host ID" in csv_header
        assert "Shadow Host Class List" in csv_header
        assert "Shadow Path" in csv_header
        
        csv_rows = csv_text.split("\n")
        assert len(csv_rows) >= 3
        # Assert values are printed in rows
        assert "user-card" in csv_text
        assert "profile-host" in csv_text
        assert "app-shell#root >> shadow-root >> user-card#profile-host >> shadow-root >> button#save" in csv_text
        
        # 6. Verify JSON Exporter includes new fields
        resp = await client.get(f"/export/session/{session.id}/json")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 2
        assert data[1]["is_inside_shadow_dom"] is True
        assert data[1]["shadow_host_tag"] == "user-card"
        assert data[1]["shadow_path"] == "app-shell#root >> shadow-root >> user-card#profile-host >> shadow-root >> button#save"
