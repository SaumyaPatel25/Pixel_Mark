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
            email=f"phase3_qa_{uuid.uuid4().hex[:6]}@pixelmark.dev",
            hashed_password="$argon2id$v=19$m=65536,t=3,p=4$...",
            name="Phase 3 QA User"
        )
        db.add(user)
        
        org_id = str(uuid.uuid4())
        org = Organization(
            id=org_id, 
            name="Phase 3 Org", 
            slug=f"phase-3-org-{uuid.uuid4().hex[:6]}"
        )
        db.add(org)
        
        project_id = str(uuid.uuid4())
        project = Project(
            id=project_id,
            org_id=org_id,
            name="Phase 3 Multi-Page Project",
            url="https://opinvox.pixelmark.com"
        )
        db.add(project)
        
        session_id = str(uuid.uuid4())
        session = Session(
            id=session_id,
            project_id=project_id,
            title="Phase 3 Multi-Page Session",
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
async def test_multi_page_marker_creation_and_exporters(test_setup):
    session = test_setup["session"]
    
    async with httpx.AsyncClient(app=app, base_url="http://test") as client:
        # Create Marker on Page 1 (DOM)
        m1_payload = {
            "session_id": session.id,
            "title": "Broken Navbar Links",
            "page_url": "https://opinvox.pixelmark.com/index",
            "page_title": "OpinVox Home",
            "renderer_type": "dom",
            "priority": "critical"
        }
        resp = await client.post("/markers/", json=m1_payload)
        assert resp.status_code == 200
        assert resp.json()["marker_number"] == 1
        assert resp.json()["renderer_type"] == "dom"
        
        # Create Marker on Page 2 (Three.js 3D Canvas)
        m2_payload = {
            "session_id": session.id,
            "title": "3D Sphere Alignment Visual Drift",
            "page_url": "https://opinvox.pixelmark.com/arena/3d",
            "page_title": "Arena 3D Map",
            "renderer_type": "threejs",
            "canvas_context": {
                "type": "threejs",
                "object_name": "ArenaSphereMesh",
                "intersection_point": [12.4, -4.5, 0.9],
                "camera_position": [0.0, 10.0, 50.0],
                "canvas_coords": {"x": 204.0, "y": 190.0}
            },
            "priority": "high"
        }
        resp = await client.post("/markers/", json=m2_payload)
        assert resp.status_code == 200
        assert resp.json()["marker_number"] == 2
        assert resp.json()["renderer_type"] == "threejs"
        
        # Create Marker on Page 3 (WebGL)
        m3_payload = {
            "session_id": session.id,
            "title": "Background Gradient Shifting Error",
            "page_url": "https://opinvox.pixelmark.com/settings",
            "page_title": "User Dashboard Settings",
            "renderer_type": "webgl",
            "priority": "medium"
        }
        resp = await client.post("/markers/", json=m3_payload)
        assert resp.status_code == 200
        assert resp.json()["marker_number"] == 3
        
        # 1. Verify markers grouping by page endpoint
        resp = await client.get(f"/markers/session/{session.id}/by-page")
        assert resp.status_code == 200
        pages = resp.json()["pages"]
        assert len(pages) == 3
        
        page_urls = [p["page_url"] for p in pages]
        assert "https://opinvox.pixelmark.com/index" in page_urls
        assert "https://opinvox.pixelmark.com/arena/3d" in page_urls
        assert "https://opinvox.pixelmark.com/settings" in page_urls
        
        # 2. Get login/token validation context for export headers (auth emulation)
        auth_payload = {
            "email": test_setup["user"].email,
            "password": "E2eTest1234!"
        }
        # Fake active token since we bypass token details in mock FastAPI tests. 
        # Export routes use Depends(get_current_user).
        # To bypass, we override dependencies to mock a logged-in user:
        
        # 3. Verify Markdown Exporter
        resp = await client.get(f"/export/session/{session.id}/markdown")
        assert resp.status_code == 200
        assert "Page: OpinVox Home" in resp.text
        assert "Page: Arena 3D Map" in resp.text
        assert "Page: User Dashboard Settings" in resp.text
        assert "Renderer: THREEJS" in resp.text
        assert "ArenaSphereMesh" in resp.text
        
        # 4. Verify CSV Exporter contains dynamic columns
        resp = await client.get(f"/export/session/{session.id}/csv")
        assert resp.status_code == 200
        csv_header = resp.text.split("\n")[0]
        assert "Page URL" in csv_header
        assert "Page Title" in csv_header
        assert "Renderer Type" in csv_header
        assert "Canvas Context" in csv_header
        assert "Screenshot URL" in csv_header
        
        # 5. Verify JSON Exporter includes new fields
        resp = await client.get(f"/export/session/{session.id}/json")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 3
        assert data[1]["page_title"] == "Arena 3D Map"
        assert data[1]["renderer_type"] == "threejs"
        assert data[1]["canvas_context"]["object_name"] == "ArenaSphereMesh"
