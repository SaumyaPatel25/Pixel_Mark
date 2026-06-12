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
from dependencies import get_db

# 1. Override the database engine with NullPool specifically for tests
# This guarantees that Windows event loops closing between test scopes never trigger pool exceptions!
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

# 2. Inject dependency overrides in FastAPI app
async def override_get_db():
    async with TestSessionLocal() as session:
        yield session

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(scope="module")
def anyio_backend():
    return "asyncio"

# Module-scoped event loop to prevent event loop closed exception on Windows
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
            email=f"enhanced_qa_{uuid.uuid4().hex[:6]}@pixelmark.dev",
            hashed_password="$argon2id$v=19$m=65536,t=3,p=4$...",
            name="Enhanced QA User"
        )
        db.add(user)
        
        org_id = str(uuid.uuid4())
        org = Organization(
            id=org_id, 
            name="Enhanced Org", 
            slug=f"enhanced-org-{uuid.uuid4().hex[:6]}"
        )
        db.add(org)
        
        project_id = str(uuid.uuid4())
        project = Project(
            id=project_id,
            org_id=org_id,
            name="Enhanced QA Project",
            url="https://example.com"
        )
        db.add(project)
        
        session_id = str(uuid.uuid4())
        session = Session(
            id=session_id,
            project_id=project_id,
            title="Enhanced QA Session",
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
async def test_proxy_initial(test_setup):
    session = test_setup["session"]
    # We must pass Request to get the client IP registered in ACTIVE_IP_SESSIONS, but httpx client simulates Request
    async with httpx.AsyncClient(app=app, base_url="http://test") as client:
        # GET /proxy/session/{session_id}
        response = await client.get(f"/proxy/session/{session.id}")
        assert response.status_code == 200
        assert "text/html" in response.headers["content-type"]
        assert "pixelmark-agent.js" in response.text
        assert "PIXELMARK" in response.text
        
        # Verify page visit was recorded in DB
        async with TestSessionLocal() as db:
            visits = (await db.execute(select(PageVisit).where(PageVisit.session_id == session.id))).scalars().all()
            assert len(visits) > 0
            assert any(v.page_url == "https://example.com" for v in visits)

@pytest.mark.asyncio
async def test_proxy_navigation(test_setup):
    session = test_setup["session"]
    async with httpx.AsyncClient(app=app, base_url="http://test") as client:
        # Navigate to iana.org/domains/example within the session
        response = await client.get(f"/proxy/session/{session.id}/page?url=https%3A%2F%2Fiana.org%2Fdomains%2Fexample")
        assert response.status_code == 200
        assert "pixelmark-agent.js" in response.text
        
        # Verify visit was recorded
        async with TestSessionLocal() as db:
            visits = (await db.execute(select(PageVisit).where(PageVisit.session_id == session.id))).scalars().all()
            assert any(v.page_url == "https://iana.org/domains/example" for v in visits)
            
            # Check session current URL updated
            res = await db.execute(select(Session).where(Session.id == session.id))
            sess = res.scalar_one()
            assert sess.current_page_url == "https://iana.org/domains/example"

@pytest.mark.asyncio
async def test_proxy_blocks_ssrf(test_setup):
    session = test_setup["session"]
    async with httpx.AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get(f"/proxy/session/{session.id}/page?url=http%3A%2F%2F127.0.0.1%3A80")
        assert response.status_code == 403

@pytest.mark.asyncio
async def test_marker_creation_and_auto_increment(test_setup):
    session = test_setup["session"]
    async with httpx.AsyncClient(app=app, base_url="http://test") as client:
        # Create Marker 1
        marker_payload = {
            "session_id": session.id,
            "title": "Marker 1",
            "page_url": "https://example.com",
            "renderer_type": "threejs",
            "canvas_context": {
                "type": "threejs",
                "object_name": "CubeMesh",
                "intersection_point": [1.0, 2.0, 3.0]
            }
        }
        response = await client.post("/markers/", json=marker_payload)
        assert response.status_code == 200
        m1 = response.json()
        assert m1["marker_number"] == 1
        assert m1["renderer_type"] == "threejs"
        assert m1["canvas_context"]["object_name"] == "CubeMesh"
        
        # Create Marker 2
        marker_payload2 = {
            "session_id": session.id,
            "title": "Marker 2",
            "page_url": "https://example.com/about",
            "renderer_type": "dom"
        }
        response2 = await client.post("/markers/", json=marker_payload2)
        assert response2.status_code == 200
        m2 = response2.json()
        assert m2["marker_number"] == 2
        assert m2["renderer_type"] == "dom"

@pytest.mark.asyncio
async def test_session_stats(test_setup):
    session = test_setup["session"]
    async with httpx.AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get(f"/sessions/{session.id}/stats")
        assert response.status_code == 200
        stats = response.json()
        assert stats["total"] == 2
        assert stats["by_renderer"]["threejs"] == 1
        assert stats["by_renderer"]["dom"] == 1

@pytest.mark.asyncio
async def test_markers_grouped_by_page(test_setup):
    session = test_setup["session"]
    async with httpx.AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get(f"/markers/session/{session.id}/by-page")
        assert response.status_code == 200
        pages = response.json()["pages"]
        assert len(pages) == 2
        page_urls = [p["page_url"] for p in pages]
        assert "https://example.com" in page_urls
        assert "https://example.com/about" in page_urls

@pytest.mark.asyncio
async def test_agent_script_served():
    async with httpx.AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/static/pixelmark-agent.js")
        assert response.status_code == 200
        assert "altKey" in response.text
        assert "THREE" in response.text
        assert "postMessage" in response.text
