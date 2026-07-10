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
from models import User, Project, Session as DbSession, Organization
from markers.models import Marker, ReviewerIdentity
from markers.router import get_current_user_optional
from realtime.router import get_db_sessionmaker

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
MOCK_USER_EMAIL = "dev@pixelmark.dev"
MOCK_ORG_ID = str(uuid.uuid4())
MOCK_PROJECT_ID = str(uuid.uuid4())
MOCK_SESSION_ID = str(uuid.uuid4())

@pytest.fixture(autouse=True, scope="function")
async def setup_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
    async with TestingSessionLocal() as session:
        # Create Developer
        u = User(id=MOCK_USER_ID, email=MOCK_USER_EMAIL, hashed_password="pwd")
        session.add(u)
        
        org = Organization(id=MOCK_ORG_ID, name="My Org", slug="my-org")
        session.add(org)
        
        proj = Project(id=MOCK_PROJECT_ID, org_id=MOCK_ORG_ID, name="My Proj", url="https://pixelmark.dev")
        session.add(proj)
        
        sess = DbSession(id=MOCK_SESSION_ID, project_id=MOCK_PROJECT_ID, title="Session 1")
        session.add(sess)
        
        await session.commit()
        
    yield
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

client = TestClient(app)

@pytest.mark.anyio
async def test_reviewer_attribution_and_color():
    # 1. Register a reviewer identity
    reviewer_payload = {
        "display_name": "Reviewer Alice",
        "color_token": "emerald"
    }
    resp = client.post(f"/sessions/{MOCK_SESSION_ID}/reviewer-identities", json=reviewer_payload)
    assert resp.status_code == 200
    reviewer = resp.json()
    assert reviewer["display_name"] == "Reviewer Alice"
    assert reviewer["color_token"] == "emerald"
    reviewer_id = reviewer["id"]

    # 2. Create marker with reviewer header context
    marker_payload = {
        "project_id": MOCK_PROJECT_ID,
        "anchor_kind": "manual",
        "title": "Alice's Issue",
        "description": "Found a bug",
        "anchor_mode": "fuzzy_dom"
    }
    headers = {"X-Reviewer-Id": reviewer_id}
    create_resp = client.post(f"/sessions/{MOCK_SESSION_ID}/markers", json=marker_payload, headers=headers)
    assert create_resp.status_code == 200
    marker = create_resp.json()
    assert marker["creator_name"] == "Reviewer Alice"
    assert marker["creator_role"] == "reviewer"
    assert marker["color_token"] == "emerald"
    assert marker["anchor_mode"] == "fuzzy_dom"

@pytest.mark.anyio
async def test_reviewer_delete_permissions():
    # 1. Register two reviewer identities
    alice_resp = client.post(f"/sessions/{MOCK_SESSION_ID}/reviewer-identities", json={"display_name": "Alice", "color_token": "emerald"}).json()
    bob_resp = client.post(f"/sessions/{MOCK_SESSION_ID}/reviewer-identities", json={"display_name": "Bob", "color_token": "violet"}).json()
    
    alice_id = alice_resp["id"]
    bob_id = bob_resp["id"]

    # 2. Alice creates a marker
    marker_payload = {
        "project_id": MOCK_PROJECT_ID,
        "anchor_kind": "manual",
        "title": "Alice's marker"
    }
    marker = client.post(f"/sessions/{MOCK_SESSION_ID}/markers", json=marker_payload, headers={"X-Reviewer-Id": alice_id}).json()

    # 3. Bob attempts to delete Alice's marker -> should be blocked (403)
    del_bob = client.delete(f"/markers/{marker['id']}", headers={"X-Reviewer-Id": bob_id})
    assert del_bob.status_code == 403

    # 4. Alice deletes her own marker -> should succeed (200)
    del_alice = client.delete(f"/markers/{marker['id']}", headers={"X-Reviewer-Id": alice_id})
    assert del_alice.status_code == 200

@pytest.mark.anyio
async def test_websocket_presence_updates():
    # 1. Register a reviewer
    rev = client.post(f"/sessions/{MOCK_SESSION_ID}/reviewer-identities", json={"display_name": "Carol", "color_token": "sky"}).json()
    rev_id = rev["id"]

    # 2. Connect with reviewer actor ID
    url = f"/ws/sessions/{MOCK_SESSION_ID}?actor_id={rev_id}&actor_role=reviewer&client_kind=browser"
    with client.websocket_connect(url) as ws:
        # First message should be welcome event (session_reconciled)
        welcome = ws.receive_json()
        assert welcome["type"] == "session_reconciled"

        # Second message should be presence_updated
        presence = ws.receive_json()
        assert presence["type"] == "presence_updated"
        
        participants = presence["data"]["participants"]
        assert len(participants) == 1
        assert participants[0]["id"] == rev_id
        assert participants[0]["name"] == "Carol"
        assert participants[0]["role"] == "reviewer"
        assert participants[0]["color_token"] == "sky"
        assert participants[0]["is_online"] is True
