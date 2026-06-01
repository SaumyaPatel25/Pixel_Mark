import pytest
import httpx
import sys
import os
import uuid
import asyncio
from bs4 import BeautifulSoup

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(os.path.dirname(__file__)), "backend"))

from main import app
from database import DATABASE_URL
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.pool import NullPool
from sqlalchemy import select, delete
from models import Session, PageVisit, Marker, Project, User, Organization
from dependencies import get_db, get_current_user
from utils.proxy_rewriter import rewrite_html

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
    return User(id="mock-heavy-user-id", email="heavy@pixelmark.dev", name="Heavy Tester")

app.dependency_overrides[get_db] = override_get_db
app.dependency_overrides[get_current_user] = override_get_current_user

@pytest.fixture(scope="module")
def anyio_backend():
    return "asyncio"

@pytest.fixture(scope="module")
async def test_setup():
    async with TestSessionLocal() as db:
        user_id = str(uuid.uuid4())
        user = User(
            id=user_id,
            email=f"heavy_qa_{uuid.uuid4().hex[:6]}@pixelmark.dev",
            hashed_password="mock_password_hash",
            name="Heavy Render QA User"
        )
        db.add(user)
        
        org_id = str(uuid.uuid4())
        org = Organization(
            id=org_id, 
            name="Heavy Org", 
            slug=f"heavy-org-{uuid.uuid4().hex[:6]}"
        )
        db.add(org)
        
        project_id = str(uuid.uuid4())
        project = Project(
            id=project_id,
            org_id=org_id,
            name="Heavy WebGL Test Proj",
            url="https://webrox.xyz"
        )
        db.add(project)
        
        session_id = str(uuid.uuid4())
        session = Session(
            id=session_id,
            project_id=project_id,
            title="Heavy WebGL Session"
        )
        db.add(session)
        await db.commit()
        
        yield {
            "user": user,
            "org": org,
            "project": project,
            "session": session
        }
        
        await db.execute(delete(Marker).where(Marker.session_id == session_id))
        await db.execute(delete(PageVisit).where(PageVisit.session_id == session_id))
        await db.execute(delete(Session).where(Session.id == session_id))
        await db.execute(delete(Project).where(Project.id == project_id))
        await db.execute(delete(Organization).where(Organization.id == org_id))
        await db.execute(delete(User).where(User.id == user_id))
        await db.commit()
        
    await test_engine.dispose()

@pytest.mark.asyncio
async def test_path_based_asset_rewriter_routing(test_setup):
    session = test_setup["session"]
    
    # 1. Test HTML rewriter outputs path-based URLs
    html_input = """
    <html>
      <head>
        <script type="module" src="https://cdn.jsdelivr.net/npm/three@0.150.0/build/three.module.js"></script>
        <script type="importmap">
          {
            "imports": {
              "three": "https://unpkg.com/three@0.150.0/build/three.module.js"
            }
          }
        </script>
        <link rel="stylesheet" href="/styles/main.css">
      </head>
      <body>
        <canvas id="canvas3d"></canvas>
      </body>
    </html>
    """
    
    rewritten = rewrite_html(html_input, session.id, "https://webrox.xyz/index.html", "https://webrox.xyz")
    soup = BeautifulSoup(rewritten, "html.parser")
    
    # Verify module script URL
    script_el = soup.find("script", type="module")
    assert script_el is not None
    assert "/proxy/session/" in script_el["src"]
    assert "/asset/https/cdn.jsdelivr.net/" in script_el["src"]
    
    # Verify inline importmap JSON URL
    importmap_el = soup.find("script", type="importmap")
    assert importmap_el is not None
    import json
    map_data = json.loads(importmap_el.string)
    assert "/proxy/session/" in map_data["imports"]["three"]
    assert "/asset/https/unpkg.com/three" in map_data["imports"]["three"]

    # Verify link href format
    link_el = soup.find("link", rel="stylesheet")
    assert link_el is not None
    assert "/proxy/session/" in link_el["href"]
    assert "/asset/https/webrox.xyz/styles/main.css" in link_el["href"]

@pytest.mark.asyncio
async def test_wildcard_asset_proxy_route(test_setup):
    session = test_setup["session"]
    
    async with httpx.AsyncClient(app=app, base_url="http://test") as client:
        # Test fetching a common cdnjs asset through wildcard path route
        resp = await client.get(
            f"/proxy/session/{session.id}/asset/https/cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"
        )
        assert resp.status_code == 200
        assert resp.headers.get("Cache-Control") is not None
        assert "public, max-age=31536000, immutable" in resp.headers.get("Cache-Control")
        assert "THREE" in resp.text
        
        # Test server-side Cache-HIT
        resp_hit = await client.get(
            f"/proxy/session/{session.id}/asset/https/cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"
        )
        assert resp_hit.status_code == 200
        assert resp_hit.headers.get("X-PixelMark-Cache") == "HIT"

@pytest.mark.asyncio
async def test_heavy_marker_canvas_context_saving(test_setup):
    session = test_setup["session"]
    
    async with httpx.AsyncClient(app=app, base_url="http://test") as client:
        # Save high performance 3D marker coordinate
        marker_payload = {
            "session_id": session.id,
            "title": "WebGL mesh interaction click test",
            "page_url": "https://webrox.xyz/index",
            "page_title": "3D Portfolio",
            "renderer_type": "webgl",
            "priority": "critical",
            "x": 640.0,
            "y": 480.0,
            "element_selector": "visual-canvas-context",
            "element_tag": "CANVAS",
            "canvas_context": {
                "type": "threejs",
                "object_name": "RotatingTorus",
                "object_uuid": "torus-uuid-99999",
                "geometry_type": "TorusGeometry",
                "intersection_point": [1.2, 3.4, -0.5],
                "pixel_ratio": 2,
                "scene_hint": "Three.js Scene"
            }
        }
        
        resp = await client.post("/markers/", json=marker_payload)
        assert resp.status_code == 200
        marker_data = resp.json()
        assert marker_data["renderer_type"] == "webgl"
        assert marker_data["element_selector"] == "visual-canvas-context"
        assert marker_data["canvas_context"]["object_name"] == "RotatingTorus"
        assert marker_data["canvas_context"]["scene_hint"] == "Three.js Scene"
