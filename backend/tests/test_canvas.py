import sys
import os
import pytest
import uuid
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import StaticPool
from sqlalchemy import select

# Setup path to import backend modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from main import app
from dependencies import get_db, get_current_user
from database import Base
from models import User, Project, Session as DbSession, OrgMember, Organization, CanvasFrame, CanvasFlow

# In-memory SQLite for testing
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"
engine = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

# Override dependencies
async def get_test_db():
    async with TestingSessionLocal() as session:
        yield session

MOCK_USER_ID = str(uuid.uuid4())
MOCK_USER_EMAIL = "user123@pixelmark.dev"
MOCK_ORG_ID = str(uuid.uuid4())
MOCK_MEMBER_ID = str(uuid.uuid4())
MOCK_PROJECT_ID = str(uuid.uuid4())
MOCK_SESSION1_ID = str(uuid.uuid4())
MOCK_SESSION2_ID = str(uuid.uuid4())
MOCK_MARKER_ID = str(uuid.uuid4())

async def mock_get_current_user():
    return User(id=MOCK_USER_ID, email=MOCK_USER_EMAIL)

@pytest.fixture(autouse=True, scope="function")
def override_dependencies():
    app.dependency_overrides[get_db] = get_test_db
    app.dependency_overrides[get_current_user] = mock_get_current_user
    yield
    app.dependency_overrides.clear()

client = TestClient(app)

@pytest.fixture(autouse=True, scope="function")
async def setup_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
    async with TestingSessionLocal() as session:
        # Seed user, org, membership, project, session
        u = User(id=MOCK_USER_ID, email=MOCK_USER_EMAIL, hashed_password="pwd")
        session.add(u)
        
        org = Organization(id=MOCK_ORG_ID, name="My Org", slug="my-org")
        session.add(org)
        
        member = OrgMember(id=MOCK_MEMBER_ID, org_id=MOCK_ORG_ID, user_id=MOCK_USER_ID, role="member")
        session.add(member)
        
        proj = Project(id=MOCK_PROJECT_ID, org_id=MOCK_ORG_ID, name="My Proj", url="https://pixelmark.dev")
        session.add(proj)
        
        # Session 1
        sess1 = DbSession(id=MOCK_SESSION1_ID, project_id=MOCK_PROJECT_ID, title="Session 1")
        session.add(sess1)
        
        # Session 2
        sess2 = DbSession(id=MOCK_SESSION2_ID, project_id=MOCK_PROJECT_ID, title="Session 2")
        session.add(sess2)

        
        await session.commit()
        
    yield
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.anyio
async def test_get_canvas_auto_creates_frames():
    resp = client.get(f"/canvas/{MOCK_PROJECT_ID}")
    assert resp.status_code == 200
    data = resp.json()
    
    assert len(data["frames"]) == 2
    
    # Verify values and marker count (MOCK_SESSION1_ID has 1 critical marker, MOCK_SESSION2_ID has 0)
    frame1 = next(f for f in data["frames"] if f["session_id"] == MOCK_SESSION1_ID)
    frame2 = next(f for f in data["frames"] if f["session_id"] == MOCK_SESSION2_ID)
    
    assert frame1["title"] == "Session 1"
    assert frame1["marker_count"] == 1
    assert frame1["priority_distribution"]["critical"] == 1
    assert len(frame1["top_markers"]) == 1
    assert frame1["top_markers"][0]["title"] == "Bug 1"
    
    assert frame2["title"] == "Session 2"
    assert frame2["marker_count"] == 0
    assert frame2["priority_distribution"]["critical"] == 0


@pytest.mark.anyio
async def test_patch_frame_updates_position():
    # First, let's trigger auto-creation by calling get
    client.get(f"/canvas/{MOCK_PROJECT_ID}")
    
    # Query database to get frame id
    async with TestingSessionLocal() as session:
        res = await session.execute(select(CanvasFrame).where(CanvasFrame.session_id == MOCK_SESSION1_ID))
        frame = res.scalar_one()
        frame_id = frame.id

    # Patch position
    resp = client.patch(f"/canvas/frames/{frame_id}", json={
        "position_x": 150.0,
        "position_y": 250.0,
        "width": 400.0,
        "height": 300.0,
        "color": "#ff0000",
        "title": "Patched Title"
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["position_x"] == 150.0
    assert data["position_y"] == 250.0
    assert data["width"] == 400.0
    assert data["height"] == 300.0
    assert data["color"] == "#ff0000"
    assert data["title"] == "Patched Title"


@pytest.mark.anyio
async def test_create_and_delete_flow():
    # Trigger auto-creation
    client.get(f"/canvas/{MOCK_PROJECT_ID}")
    
    async with TestingSessionLocal() as session:
        frames_res = await session.execute(select(CanvasFrame))
        frames = frames_res.scalars().all()
        f1_id = frames[0].id
        f2_id = frames[1].id

    # Create flow
    resp = client.post("/canvas/flows", json={
        "project_id": MOCK_PROJECT_ID,
        "source_frame_id": f1_id,
        "target_frame_id": f2_id,
        "label": "Funnel Flow"
    })
    assert resp.status_code == 201
    flow_data = resp.json()
    assert flow_data["source_frame_id"] == f1_id
    assert flow_data["target_frame_id"] == f2_id
    assert flow_data["label"] == "Funnel Flow"
    flow_id = flow_data["id"]

    # Delete flow
    del_resp = client.delete(f"/canvas/flows/{flow_id}")
    assert del_resp.status_code == 204


@pytest.mark.anyio
async def test_create_flow_different_projects_error():
    MOCK_PROJECT2_ID = str(uuid.uuid4())
    MOCK_FRAME1_ID = str(uuid.uuid4())
    MOCK_FRAME2_ID = str(uuid.uuid4())

    # Setup second project and a frame in it
    async with TestingSessionLocal() as session:
        proj2 = Project(id=MOCK_PROJECT2_ID, org_id=MOCK_ORG_ID, name="Proj 2", url="https://pixelmark.dev")
        session.add(proj2)
        
        f1 = CanvasFrame(id=MOCK_FRAME1_ID, project_id=MOCK_PROJECT_ID, title="Frame 1")
        session.add(f1)
        
        f2 = CanvasFrame(id=MOCK_FRAME2_ID, project_id=MOCK_PROJECT2_ID, title="Frame 2")
        session.add(f2)
        
        await session.commit()

    # Attempt to link frame-1 (MOCK_PROJECT_ID) with frame-2 (MOCK_PROJECT2_ID)
    resp = client.post("/canvas/flows", json={
        "project_id": MOCK_PROJECT_ID,
        "source_frame_id": MOCK_FRAME1_ID,
        "target_frame_id": MOCK_FRAME2_ID,
        "label": "Cross Project Link"
    })
    assert resp.status_code == 400
    assert "belong to the same project" in resp.json()["detail"]


@pytest.mark.anyio
async def test_delete_frame_retains_session():
    client.get(f"/canvas/{MOCK_PROJECT_ID}")
    
    async with TestingSessionLocal() as session:
        res = await session.execute(select(CanvasFrame).where(CanvasFrame.session_id == MOCK_SESSION1_ID))
        frame = res.scalar_one()
        frame_id = frame.id

    # Delete frame
    resp = client.delete(f"/canvas/frames/{frame_id}")
    assert resp.status_code == 204
    
    # Verify session still exists
    async with TestingSessionLocal() as session:
        sess_res = await session.execute(select(DbSession).where(DbSession.id == MOCK_SESSION1_ID))
        assert sess_res.scalar_one_or_none() is not None
