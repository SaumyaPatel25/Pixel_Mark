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
    return User(id="mock-canvas-user-id", email="canvas@pixelmark.dev", name="Canvas Tester")

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
            email=f"phase5_qa_{uuid.uuid4().hex[:6]}@pixelmark.dev",
            hashed_password="$argon2id$v=19$m=65536,t=3,p=4$...",
            name="Phase 5 Canvas QA User"
        )
        db.add(user)
        
        org_id = str(uuid.uuid4())
        org = Organization(
            id=org_id, 
            name="Phase 5 Org", 
            slug=f"phase-5-org-{uuid.uuid4().hex[:6]}"
        )
        db.add(org)
        
        project_id = str(uuid.uuid4())
        project = Project(
            id=project_id,
            org_id=org_id,
            name="Phase 5 Canvas/3D Project",
            url="https://opinvox.pixelmark.com"
        )
        db.add(project)
        
        session_id = str(uuid.uuid4())
        session = Session(
            id=session_id,
            project_id=project_id,
            title="Phase 5 Canvas Audit Session",
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
async def test_canvas_webgl_threejs_marker_creation_and_exporters(test_setup):
    session = test_setup["session"]
    
    async with httpx.AsyncClient(app=app, base_url="http://test") as client:
        # 1. Create Standard DOM Marker
        dom_payload = {
            "session_id": session.id,
            "title": "DOM Header Error",
            "page_url": "https://opinvox.pixelmark.com/index",
            "page_title": "OpinVox Home",
            "renderer_type": "dom",
            "priority": "low"
        }
        resp = await client.post("/markers/", json=dom_payload)
        assert resp.status_code == 200
        assert resp.json()["marker_number"] == 1
        assert resp.json()["renderer_type"] == "dom"
        
        # 2. Create Canvas2D Marker
        canvas2d_payload = {
            "session_id": session.id,
            "title": "Canvas2D Line Rendering Error",
            "page_url": "https://opinvox.pixelmark.com/canvas-demo",
            "page_title": "Canvas 2D Playground",
            "renderer_type": "canvas2d",
            "priority": "medium",
            "canvas_context": {
                "type": "canvas2d",
                "canvas_coords": {"x": 350, "y": 420},
                "canvas_size": {"width": 800, "height": 600}
            }
        }
        resp = await client.post("/markers/", json=canvas2d_payload)
        assert resp.status_code == 200
        assert resp.json()["marker_number"] == 2
        assert resp.json()["renderer_type"] == "canvas2d"
        assert resp.json()["canvas_context"]["type"] == "canvas2d"
        assert resp.json()["canvas_context"]["canvas_coords"]["x"] == 350
        
        # 3. Create WebGL Marker
        webgl_payload = {
            "session_id": session.id,
            "title": "WebGL Context Shader Bug",
            "page_url": "https://opinvox.pixelmark.com/shaders",
            "page_title": "Custom Shader Arena",
            "renderer_type": "webgl",
            "priority": "high",
            "canvas_context": {
                "type": "webgl",
                "canvas_coords": {"x": 480, "y": 270},
                "canvas_size": {"width": 1920, "height": 1080},
                "gl_version": "WebGL 2.0 (OpenGL ES 3.0 Chromium)",
                "gl_vendor": "WebKit",
                "gl_renderer": "WebKit WebGL",
                "max_texture_size": 16384,
                "active_texture_units": 32
            }
        }
        resp = await client.post("/markers/", json=webgl_payload)
        assert resp.status_code == 200
        assert resp.json()["marker_number"] == 3
        assert resp.json()["renderer_type"] == "webgl"
        assert resp.json()["canvas_context"]["gl_renderer"] == "WebKit WebGL"
        assert resp.json()["canvas_context"]["max_texture_size"] == 16384
        
        # 4. Create Three.js Marker
        threejs_payload = {
            "session_id": session.id,
            "title": "Three.js Cube Alignment Issue",
            "page_url": "https://opinvox.pixelmark.com/arena/3d",
            "page_title": "Arena 3D Map",
            "renderer_type": "threejs",
            "priority": "critical",
            "canvas_context": {
                "type": "threejs",
                "object_name": "HeroCube",
                "object_uuid": "hero-mesh-uuid-12345",
                "object_type": "Mesh",
                "material_name": "StandardMetalMaterial",
                "geometry_type": "BoxGeometry",
                "intersection_point": [12.40, -4.50, 0.90],
                "distance": 45.2,
                "face_index": 4,
                "ray_origin": [0.0, 10.0, 50.0],
                "ray_direction": [0.0, -0.2, -1.0],
                "camera_position": [0.0, 10.0, 50.0],
                "camera_rotation": [0.0, 0.0, 0.0],
                "camera_fov": 45,
                "scene_children_count": 12,
                "renderer_size": {"width": 1024, "height": 768},
                "canvas_coords": {"x": 512, "y": 384},
                "hit_found": True
            }
        }
        resp = await client.post("/markers/", json=threejs_payload)
        assert resp.status_code == 200
        assert resp.json()["marker_number"] == 4
        assert resp.json()["renderer_type"] == "threejs"
        assert resp.json()["canvas_context"]["object_name"] == "HeroCube"
        assert resp.json()["canvas_context"]["intersection_point"] == [12.40, -4.50, 0.90]
        assert resp.json()["canvas_context"]["camera_position"] == [0.0, 10.0, 50.0]
        
        # 5. Verify markers grouping by page endpoint
        resp = await client.get(f"/markers/session/{session.id}/by-page")
        assert resp.status_code == 200
        pages = resp.json()["pages"]
        assert len(pages) == 4
        
        # 6. Verify Markdown Exporter includes technical canvas context sections
        resp = await client.get(f"/export/session/{session.id}/markdown")
        assert resp.status_code == 200
        markdown_text = resp.text
        assert "Page: Canvas 2D Playground" in markdown_text
        assert "Renderer: CANVAS2D" in markdown_text
        assert "Canvas Context:" in markdown_text
        assert "Page: Custom Shader Arena" in markdown_text
        assert "Renderer: WEBGL" in markdown_text
        assert "Page: Arena 3D Map" in markdown_text
        assert "Renderer: THREEJS" in markdown_text
        
        # 7. Verify CSV Exporter contains dynamic canvas columns
        resp = await client.get(f"/export/session/{session.id}/csv")
        assert resp.status_code == 200
        csv_text = resp.text
        csv_header = csv_text.split("\n")[0]
        assert "Renderer Type" in csv_header
        assert "Canvas Context" in csv_header
        
        assert "canvas2d" in csv_text
        assert "webgl" in csv_text
        assert "threejs" in csv_text
        assert "HeroCube" in csv_text
        assert "WebKit WebGL" in csv_text
        
        # 8. Verify JSON Exporter includes all canvas attributes
        resp = await client.get(f"/export/session/{session.id}/json")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 4
        assert data[1]["renderer_type"] == "canvas2d"
        assert data[1]["canvas_context"]["canvas_coords"]["x"] == 350
        assert data[2]["renderer_type"] == "webgl"
        assert data[2]["canvas_context"]["gl_renderer"] == "WebKit WebGL"
        assert data[3]["renderer_type"] == "threejs"
        assert data[3]["canvas_context"]["object_name"] == "HeroCube"
