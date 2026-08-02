import sys
import os
import pytest
import uuid
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import StaticPool
from sqlalchemy import select, func, delete
from services.plan_capabilities import _PLAN_CACHE

# Setup path to import backend modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from main import app
from dependencies import get_db, get_current_user
from database import Base
from models import (
    User, Project, Session as DbSession, OrgMember, Organization, 
    SubscriptionModel, PageVisit, ReviewerDomEditSuggestionModel, ShareLink
)
from markers.models import ReviewerIdentity
from auth import hash_password

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
MOCK_USER_EMAIL = "owner@stage.dev"
MOCK_ORG_ID = str(uuid.uuid4())
MOCK_MEMBER_ID = str(uuid.uuid4())
MOCK_PROJECT_ID = str(uuid.uuid4())
MOCK_SESSION_ID = str(uuid.uuid4())

async def mock_get_current_user():
    return User(id=MOCK_USER_ID, email=MOCK_USER_EMAIL)

@pytest.fixture(autouse=True, scope="function")
def override_dependencies():
    app.dependency_overrides[get_db] = get_test_db
    app.dependency_overrides[get_current_user] = mock_get_current_user
    yield
    app.dependency_overrides.clear()

@pytest.fixture(autouse=True, scope="function")
async def setup_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
    async with TestingSessionLocal() as session:
        # Create Owner
        u = User(id=MOCK_USER_ID, email=MOCK_USER_EMAIL, hashed_password="pwd")
        session.add(u)
        
        org = Organization(id=MOCK_ORG_ID, name="My Org", slug="my-org")
        session.add(org)
        
        member = OrgMember(id=MOCK_MEMBER_ID, org_id=MOCK_ORG_ID, user_id=MOCK_USER_ID, role="owner")
        session.add(member)
        
        proj = Project(id=MOCK_PROJECT_ID, org_id=MOCK_ORG_ID, name="My Proj", url="https://stage.dev", allow_reviewer_dom_edit=True)
        session.add(proj)
        
        sess = DbSession(id=MOCK_SESSION_ID, project_id=MOCK_PROJECT_ID, title="Session 1", current_page_url="https://stage.dev/dashboard")
        session.add(sess)
        
        # Seed subscription for paid plan capabilities
        sub = SubscriptionModel(
            id=str(uuid.uuid4()),
            org_id=MOCK_ORG_ID,
            plan_type="dev_team",
            status="active",
            seats_allowed=5,
            projects_allowed=10
        )
        session.add(sub)
        
        await session.commit()
        
    yield
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

client = TestClient(app)

@pytest.mark.anyio
async def test_reviewer_suggestions_workflow():
    # 1. Create a share link and reviewer identity
    token = "testtoken123"
    reviewer_id = str(uuid.uuid4())
    
    async with TestingSessionLocal() as session:
        link = ShareLink(
            id=str(uuid.uuid4()),
            token=token,
            session_id=MOCK_SESSION_ID,
            can_comment=True,
            is_active=True
        )
        session.add(link)
        
        rev = ReviewerIdentity(
            id=reviewer_id,
            session_id=MOCK_SESSION_ID,
            display_name="Reviewer Bob",
            color_token="emerald"
        )
        session.add(rev)
        
        await session.commit()

    # 2. Check resolve share link API computes dom_edit_available
    resp = client.post("/share-links/resolve", json={"token": token})
    assert resp.status_code == 200
    assert resp.json()["dom_edit_available"] is True

    # 3. Check public dom-edit-available endpoint
    resp = client.get(f"/review/{token}/dom-edit-available")
    assert resp.status_code == 200
    assert resp.json()["dom_edit_available"] is True

    # 4. Propose a modification
    payload = {
        "reviewer_identity_id": reviewer_id,
        "page_url": "https://stage.dev/dashboard",
        "selector": ".hero-title",
        "operation_type": "replace",
        "proposed_value": "<h1>New Proposed Title</h1>"
    }
    resp = client.post(f"/review/{token}/dom-edit-suggestions", json=payload)
    assert resp.status_code == 200
    suggestion_id = resp.json()["id"]
    assert suggestion_id is not None

    # 5. Retrieve suggestions as project owner
    resp = client.get(f"/canvas/{MOCK_PROJECT_ID}/reviewer-suggestions")
    assert resp.status_code == 200
    suggestions = resp.json()
    assert len(suggestions) == 1
    assert suggestions[0]["id"] == suggestion_id
    assert suggestions[0]["status"] == "pending"
    assert suggestions[0]["reviewer_name"] == "Reviewer Bob"

    # 6. Accept the suggestion (promoting to live mutation)
    resp = client.post(f"/canvas/{MOCK_PROJECT_ID}/reviewer-suggestions/{suggestion_id}/accept")
    assert resp.status_code == 200
    assert "mutation_id" in resp.json()

    # 7. Check status is updated to accepted
    resp = client.get(f"/canvas/{MOCK_PROJECT_ID}/reviewer-suggestions")
    assert resp.json()[0]["status"] == "accepted"


@pytest.mark.anyio
async def test_reviewer_suggestions_plan_gate():
    # Setup organization on free plan by deleting/replacing subscription
    async with TestingSessionLocal() as session:
        # Delete existing subscription
        await session.execute(delete(SubscriptionModel).where(SubscriptionModel.org_id == MOCK_ORG_ID))
        
        # Seed free subscription
        sub = SubscriptionModel(
            id=str(uuid.uuid4()),
            org_id=MOCK_ORG_ID,
            plan_type="solopreneur",
            status="active",
            seats_allowed=1,
            projects_allowed=1
        )
        session.add(sub)
        
        token = "freetoken"
        reviewer_id = str(uuid.uuid4())
        link = ShareLink(
            id=str(uuid.uuid4()),
            token=token,
            session_id=MOCK_SESSION_ID,
            can_comment=True,
            is_active=True
        )
        session.add(link)
        
        rev = ReviewerIdentity(
            id=reviewer_id,
            session_id=MOCK_SESSION_ID,
            display_name="Free Reviewer",
            color_token="emerald"
        )
        session.add(rev)
        
        await session.commit()

    # Bust plan cache so resolve_org_plan re-reads the freshly-seeded free subscription
    _PLAN_CACHE.pop(MOCK_ORG_ID, None)

    # Check Resolve share link API: dom_edit_available must be False
    resp = client.post("/share-links/resolve", json={"token": token})
    assert resp.status_code == 200
    assert resp.json()["dom_edit_available"] is False

    # Check submit endpoint returns 403 Forbidden
    payload = {
        "reviewer_identity_id": reviewer_id,
        "page_url": "https://stage.dev/dashboard",
        "selector": ".hero-title",
        "operation_type": "replace",
        "proposed_value": "New title"
    }
    resp = client.post(f"/review/{token}/dom-edit-suggestions", json=payload)
    assert resp.status_code == 403


@pytest.mark.anyio
async def test_reviewer_suggestions_constraints():
    # Test expiration, password protection and invalid page URL
    token = "constrainedtoken"
    reviewer_id = str(uuid.uuid4())
    
    async with TestingSessionLocal() as session:
        # Expired link
        link = ShareLink(
            id=str(uuid.uuid4()),
            token=token,
            session_id=MOCK_SESSION_ID,
            can_comment=True,
            is_active=True,
             expires_at=datetime.utcnow() - timedelta(hours=1),
             password_hash=hash_password("secret")
        )
        session.add(link)
        
        rev = ReviewerIdentity(
            id=reviewer_id,
            session_id=MOCK_SESSION_ID,
            display_name="Reviewer Bob",
            color_token="emerald"
        )
        session.add(rev)
        
        await session.commit()

    # Expired token submission -> 410 Gone
    payload = {
        "reviewer_identity_id": reviewer_id,
        "page_url": "https://stage.dev/dashboard",
        "selector": ".hero",
        "operation_type": "replace",
        "proposed_value": "value"
    }
    resp = client.post(f"/review/{token}/dom-edit-suggestions", json=payload)
    assert resp.status_code == 410

    # Make link active but with password protection
    async with TestingSessionLocal() as session:
        link_res = await session.execute(select(ShareLink).where(ShareLink.token == token))
        link = link_res.scalar_one()
        link.expires_at = datetime.utcnow() + timedelta(hours=1)
        await session.commit()

    # Submit without password -> 403 Forbidden
    resp = client.post(f"/review/{token}/dom-edit-suggestions", json=payload)
    assert resp.status_code == 403

    # Submit with invalid password -> 403 Forbidden
    payload["password"] = "wrong"
    resp = client.post(f"/review/{token}/dom-edit-suggestions", json=payload)
    assert resp.status_code == 403

    # Submit with valid password but invalid page URL -> 400 Bad Request
    payload["password"] = "secret"
    payload["page_url"] = "https://unrelated-domain.com/hack"
    resp = client.post(f"/review/{token}/dom-edit-suggestions", json=payload)
    assert resp.status_code == 400
