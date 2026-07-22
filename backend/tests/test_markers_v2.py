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
from dependencies import get_db
from database import Base
from models import User, Project, Session as DbSession, OrgMember, Organization
from markers.models import Marker, ReviewerIdentity
from markers.router import get_current_user_optional
from realtime.router import get_db_sessionmaker
from markers.contracts import MarkerAnchorKind, MarkerRendererType, CreatorRole, MarkerStatus, MarkerPriority

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

async def mock_get_db_sessionmaker():
    return TestingSessionLocal

# Global state mock for auth
current_mock_user = None

async def mock_get_current_user_optional():
    return current_mock_user

@pytest.fixture(autouse=True, scope="function")
def override_dependencies():
    app.dependency_overrides[get_db] = get_test_db
    app.dependency_overrides[get_current_user_optional] = mock_get_current_user_optional
    app.dependency_overrides[get_db_sessionmaker] = mock_get_db_sessionmaker
    yield
    app.dependency_overrides.clear()

MOCK_USER_ID = str(uuid.uuid4())
MOCK_USER_EMAIL = "dev@stage.dev"
MOCK_ORG_ID = str(uuid.uuid4())
MOCK_PROJECT_ID = str(uuid.uuid4())
MOCK_SESSION_ID = str(uuid.uuid4())

@pytest.fixture(autouse=True, scope="function")
async def setup_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
    async with TestingSessionLocal() as session:
        u = User(id=MOCK_USER_ID, email=MOCK_USER_EMAIL, hashed_password="pwd")
        session.add(u)
        
        org = Organization(id=MOCK_ORG_ID, name="My Org", slug="my-org")
        session.add(org)
        
        proj = Project(id=MOCK_PROJECT_ID, org_id=MOCK_ORG_ID, name="My Proj", url="https://stage.dev")
        session.add(proj)
        
        sess = DbSession(id=MOCK_SESSION_ID, project_id=MOCK_PROJECT_ID, title="Session 1")
        session.add(sess)
        
        await session.commit()
        
    yield
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

client = TestClient(app)

@pytest.mark.anyio
async def test_create_dom_relative_marker():
    # 1. Test success with ratio clamping
    payload = {
        "project_id": MOCK_PROJECT_ID,
        "anchor_kind": "dom-relative",
        "page_url": "https://example.com",
        "target_selector": "#submit-btn",
        "offset_x_ratio": 1.5,  # Should clamp to 1.0
        "offset_y_ratio": -0.2, # Should clamp to 0.0
        "title": "Broken Button",
        "description": "It overflows"
    }
    
    response = client.post(f"/sessions/{MOCK_SESSION_ID}/markers", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["offset_x_ratio"] == 1.0
    assert data["offset_y_ratio"] == 0.0
    assert data["anchor_kind"] == "dom-relative"
    assert data["target_selector"] == "#submit-btn"
    assert data["version"] == 1

    # 2. Test failure (missing selector/xpath)
    payload_invalid = {
        "project_id": MOCK_PROJECT_ID,
        "anchor_kind": "dom-relative",
        "offset_x_ratio": 0.5,
        "offset_y_ratio": 0.5
    }
    response_invalid = client.post(f"/sessions/{MOCK_SESSION_ID}/markers", json=payload_invalid)
    assert response_invalid.status_code == 422

@pytest.mark.anyio
async def test_create_canvas_and_webgl_markers():
    # Canvas success
    canvas_payload = {
        "project_id": MOCK_PROJECT_ID,
        "anchor_kind": "canvas-relative",
        "canvas_id": "chart-canvas",
        "canvas_x_ratio": 0.75,
        "canvas_y_ratio": 1.2, # Clamps to 1.0
        "renderer_type": "canvas2d"
    }
    response = client.post(f"/sessions/{MOCK_SESSION_ID}/markers", json=canvas_payload)
    assert response.status_code == 200
    assert response.json()["canvas_y_ratio"] == 1.0

    # WebGL success
    webgl_payload = {
        "project_id": MOCK_PROJECT_ID,
        "anchor_kind": "webgl-clip-space",
        "webgl_clip_x": -1.5, # Clamps to -1.0
        "webgl_clip_y": 0.5,
        "renderer_type": "webgl"
    }
    response = client.post(f"/sessions/{MOCK_SESSION_ID}/markers", json=webgl_payload)
    assert response.status_code == 200
    assert response.json()["webgl_clip_x"] == -1.0

@pytest.mark.anyio
async def test_invalid_coordinate_conflicts_return_422():
    # Attempting DOM relative but providing WebGL coordinate systems
    conflict_payload = {
        "project_id": MOCK_PROJECT_ID,
        "anchor_kind": "dom-relative",
        "target_selector": "#id",
        "offset_x_ratio": 0.5,
        "offset_y_ratio": 0.5,
        "webgl_clip_x": 0.0 # Conflict!
    }
    response = client.post(f"/sessions/{MOCK_SESSION_ID}/markers", json=conflict_payload)
    assert response.status_code == 422
    assert "Conflicting coordinate" in response.json()["detail"]

@pytest.mark.anyio
async def test_reviewer_delete_permissions():
    global current_mock_user
    current_mock_user = None # Treat requests as reviewer (guest)

    # 1. Create a ReviewerIdentity in the DB
    reviewer_payload = {"display_name": "Reviewer A"}
    reviewer_resp = client.post(f"/sessions/{MOCK_SESSION_ID}/reviewer-identities", json=reviewer_payload)
    assert reviewer_resp.status_code == 200
    reviewer_a = reviewer_resp.json()

    reviewer_b_payload = {"display_name": "Reviewer B"}
    reviewer_b_resp = client.post(f"/sessions/{MOCK_SESSION_ID}/reviewer-identities", json=reviewer_b_payload)
    reviewer_b = reviewer_b_resp.json()

    # 2. Create marker as Reviewer A
    headers_a = {"X-Reviewer-Id": reviewer_a["id"]}
    marker_payload = {
        "project_id": MOCK_PROJECT_ID,
        "anchor_kind": "manual",
        "title": "Bug A"
    }
    response = client.post(f"/sessions/{MOCK_SESSION_ID}/markers", json=marker_payload, headers=headers_a)
    assert response.status_code == 200
    marker = response.json()

    # 3. Reviewer B tries to delete Reviewer A's marker -> 403
    headers_b = {"X-Reviewer-Id": reviewer_b["id"]}
    del_resp = client.delete(f"/markers/{marker['id']}", headers=headers_b)
    assert del_resp.status_code == 403

    # 4. Reviewer A deletes own marker -> 200
    del_resp_ok = client.delete(f"/markers/{marker['id']}", headers=headers_a)
    assert del_resp_ok.status_code == 200

@pytest.mark.anyio
async def test_developer_delete_permissions():
    global current_mock_user
    
    # 1. Create marker as reviewer
    reviewer_payload = {"display_name": "Reviewer"}
    reviewer_resp = client.post(f"/sessions/{MOCK_SESSION_ID}/reviewer-identities", json=reviewer_payload)
    reviewer = reviewer_resp.json()
    
    marker_payload = {
        "project_id": MOCK_PROJECT_ID,
        "anchor_kind": "manual",
        "title": "Reviewer's Bug"
    }
    response = client.post(f"/sessions/{MOCK_SESSION_ID}/markers", json=marker_payload, headers={"X-Reviewer-Id": reviewer["id"]})
    marker = response.json()

    # 2. Delete as Developer (User token mock)
    current_mock_user = User(id=MOCK_USER_ID, email=MOCK_USER_EMAIL)
    del_resp = client.delete(f"/markers/{marker['id']}")
    assert del_resp.status_code == 200

@pytest.mark.anyio
async def test_soft_deleted_markers_hidden_from_list():
    # 1. Create two markers
    p1 = {"project_id": MOCK_PROJECT_ID, "anchor_kind": "manual", "title": "Marker 1"}
    p2 = {"project_id": MOCK_PROJECT_ID, "anchor_kind": "manual", "title": "Marker 2"}
    m1 = client.post(f"/sessions/{MOCK_SESSION_ID}/markers", json=p1).json()
    m2 = client.post(f"/sessions/{MOCK_SESSION_ID}/markers", json=p2).json()

    # 2. Verify list shows 2 markers
    list_resp = client.get(f"/sessions/{MOCK_SESSION_ID}/markers")
    assert len(list_resp.json()) == 2

    # 3. Soft delete Marker 1
    client.delete(f"/markers/{m1['id']}")

    # 4. Verify list shows only Marker 2
    list_resp_2 = client.get(f"/sessions/{MOCK_SESSION_ID}/markers")
    assert len(list_resp_2.json()) == 1
    assert list_resp_2.json()[0]["id"] == m2["id"]

    # 5. Verify list with include_deleted=True shows both
    list_resp_3 = client.get(f"/sessions/{MOCK_SESSION_ID}/markers?include_deleted=true")
    assert len(list_resp_3.json()) == 2

@pytest.mark.anyio
async def test_version_increments_and_patch_restrictions():
    # 1. Create a marker
    p = {"project_id": MOCK_PROJECT_ID, "anchor_kind": "manual", "title": "Version 1"}
    m = client.post(f"/sessions/{MOCK_SESSION_ID}/markers", json=p).json()
    assert m["version"] == 1

    # 2. Patch content -> version = 2
    update_payload = {"title": "Version 2"}
    update_resp = client.patch(f"/markers/{m['id']}", json=update_payload)
    assert update_resp.status_code == 200
    assert update_resp.json()["version"] == 2
    assert update_resp.json()["title"] == "Version 2"

    # 3. Patch position -> version = 3
    pos_payload = {"viewport_x": 100.0, "viewport_y": 200.0}
    pos_resp = client.patch(f"/markers/{m['id']}/position", json=pos_payload)
    assert pos_resp.status_code == 200
    assert pos_resp.json()["version"] == 3
    assert pos_resp.json()["viewport_x"] == 100.0
    
    # 4. Position patch with disallowed fields should ignore them (due to Pydantic schema validation filtering)
    pos_payload_disallowed = {"viewport_x": 150.0, "title": "Hacked Title"}
    pos_resp_disallowed = client.patch(f"/markers/{m['id']}/position", json=pos_payload_disallowed)
    assert pos_resp_disallowed.status_code == 200
    assert pos_resp_disallowed.json()["viewport_x"] == 150.0
    assert pos_resp_disallowed.json()["title"] == "Version 2" # Unchanged!

@pytest.mark.anyio
async def test_optimistic_locking_conflict():
    # 1. Create a marker
    p = {"project_id": MOCK_PROJECT_ID, "anchor_kind": "manual", "title": "Lock test"}
    m = client.post(f"/sessions/{MOCK_SESSION_ID}/markers", json=p).json()
    assert m["version"] == 1

    # 2. Patch with correct expected_version -> succeeds
    update_payload = {"title": "Updated", "expected_version": 1}
    resp = client.patch(f"/markers/{m['id']}", json=update_payload)
    assert resp.status_code == 200
    assert resp.json()["version"] == 2

    # 3. Patch with wrong expected_version -> 409 Conflict
    update_payload_fail = {"title": "Stale Update", "expected_version": 1} # server is at version 2
    resp_fail = client.patch(f"/markers/{m['id']}", json=update_payload_fail)
    assert resp_fail.status_code == 409
    assert "version mismatch" in resp_fail.json()["detail"]

    # 4. Position patch with wrong expected_version -> 409 Conflict
    pos_payload_fail = {"viewport_x": 50.0, "expected_version": 1}
    pos_resp_fail = client.patch(f"/markers/{m['id']}/position", json=pos_payload_fail)
    assert pos_resp_fail.status_code == 409
    assert "version mismatch" in pos_resp_fail.json()["detail"]

@pytest.mark.anyio
async def test_websocket_session_isolation_and_broadcasts():
    session_a = MOCK_SESSION_ID
    session_b = str(uuid.uuid4())
    
    # Create session_b in DB
    async with TestingSessionLocal() as session:
        sess_b = DbSession(id=session_b, project_id=MOCK_PROJECT_ID, title="Session B")
        session.add(sess_b)
        await session.commit()

    # Connect to WebSocket for Session A
    with client.websocket_connect(f"/ws/sessions/{session_a}") as ws_a:
        # Check welcome event
        welcome_a = ws_a.receive_json()
        assert welcome_a["type"] == "session_reconciled"
        
        # Connect to WebSocket for Session B
        with client.websocket_connect(f"/ws/sessions/{session_b}") as ws_b:
            welcome_b = ws_b.receive_json()
            assert welcome_b["type"] == "session_reconciled"

            # Perform REST create on Session A
            p_a = {"project_id": MOCK_PROJECT_ID, "anchor_kind": "manual", "title": "Marker A"}
            m_a = client.post(f"/sessions/{session_a}/markers", json=p_a).json()

            # Client A should receive marker_created broadcast
            event_a = ws_a.receive_json()
            assert event_a["type"] == "marker_created"
            assert event_a["marker_id"] == m_a["id"]
            assert event_a["version"] == 1
            assert event_a["data"]["marker"]["title"] == "Marker A"
            
            # Client B should NOT receive anything (no socket timeout means no messages waiting)
            ws_b.send_text("ping")
            assert ws_b.receive_text() == "pong"

            # Patch Marker A -> should broadcast marker_updated to A
            client.patch(f"/markers/{m_a['id']}", json={"title": "Marker A Updated"})
            event_a_updated = ws_a.receive_json()
            assert event_a_updated["type"] == "marker_updated"
            assert event_a_updated["version"] == 2

            # Patch Marker A Position -> should broadcast marker_moved to A
            client.patch(f"/markers/{m_a['id']}/position", json={"viewport_x": 100.0, "viewport_y": 100.0})
            event_a_moved = ws_a.receive_json()
            assert event_a_moved["type"] == "marker_moved"
            assert event_a_moved["version"] == 3

            # Delete Marker A -> should broadcast marker_deleted to A
            client.delete(f"/markers/{m_a['id']}")
            event_a_deleted = ws_a.receive_json()
            assert event_a_deleted["type"] == "marker_deleted"
            assert event_a_deleted["marker_id"] == m_a["id"]

@pytest.mark.anyio
async def test_websocket_snapshot_request():
    # 1. Create two markers in Session A
    p1 = {"project_id": MOCK_PROJECT_ID, "anchor_kind": "manual", "title": "M1"}
    p2 = {"project_id": MOCK_PROJECT_ID, "anchor_kind": "manual", "title": "M2"}
    m1 = client.post(f"/sessions/{MOCK_SESSION_ID}/markers", json=p1).json()
    m2 = client.post(f"/sessions/{MOCK_SESSION_ID}/markers", json=p2).json()

    # Delete m1
    client.delete(f"/markers/{m1['id']}")

    # 2. Connect and request snapshot
    with client.websocket_connect(f"/ws/sessions/{MOCK_SESSION_ID}") as ws:
        # Prune welcome event
        ws.receive_json()

        # Send snapshot request
        ws.send_json({"type": "session_snapshot_requested"})
        
        snapshot = ws.receive_json()
        assert snapshot["type"] == "session_snapshot"
        assert snapshot["session_id"] == MOCK_SESSION_ID
        
        # Verify that soft-deleted marker is absent, only m2 is present
        markers = snapshot["data"]["markers"]
        assert len(markers) == 1
        assert markers[0]["id"] == m2["id"]
        assert markers[0]["title"] == "M2"

