import sys
import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import StaticPool
from sqlalchemy import select
from unittest.mock import AsyncMock, patch

# Setup path to import backend modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from main import app
from dependencies import get_db, get_current_user
from database import Base
from models import User, Project, Session as DbSession, Marker, OrgMember, Organization
from models.core import UserAIProviderConfig

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

MOCK_USER_ID = "user-123"
MOCK_USER_EMAIL = "user123@pixelmark.dev"

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
        # Seed user, org, membership, project, session, marker
        u = User(id=MOCK_USER_ID, email=MOCK_USER_EMAIL, hashed_password="pwd")
        session.add(u)
        
        org = Organization(id="org-123", name="My Org", slug="my-org")
        session.add(org)
        
        member = OrgMember(id="mem-123", org_id="org-123", user_id=MOCK_USER_ID, role="member")
        session.add(member)
        
        proj = Project(id="proj-123", org_id="org-123", name="My Proj", url="https://pixelmark.dev")
        session.add(proj)
        
        sess = DbSession(id="sess-123", project_id="proj-123", title="My Session")
        session.add(sess)
        
        m1 = Marker(id="marker-1", session_id="sess-123", title="Bug 1", description="UI break", url="https://pixelmark.dev", priority="medium")
        session.add(m1)
        
        await session.commit()
        
    yield
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.anyio
async def test_triage_no_provider():
    resp = client.post("/ai/triage/session/sess-123")
    assert resp.status_code == 400
    assert "No active default AI provider configured" in resp.json()["detail"]


@pytest.mark.anyio
async def test_summary_no_provider():
    resp = client.get("/ai/summary/session/sess-123")
    assert resp.status_code == 400
    assert "No active default AI provider configured" in resp.json()["detail"]


@pytest.mark.anyio
async def test_triage_success_path():
    # 1. Add default provider
    async with TestingSessionLocal() as session:
        c1 = UserAIProviderConfig(
            id="c-1",
            user_id=MOCK_USER_ID,
            provider="openai",
            display_name="OpenAI default",
            encrypted_api_key="encrypted-val",
            is_active=True,
            is_default=True,
            supports_openai_compat=True
        )
        session.add(c1)
        await session.commit()
        
    mock_triage_response = {
        "session_summary": "Overall look is clean.",
        "markers": [
            {"id": "marker-1", "priority": "critical", "ai_summary": "Critical layout breakage detected."}
        ]
    }
    
    with patch("routers.ai.triage_markers", new_callable=AsyncMock) as mock_triage:
        mock_triage.return_value = mock_triage_response
        
        resp = client.post("/ai/triage/session/sess-123")
        assert resp.status_code == 200
        data = resp.json()
        assert data["triaged_count"] == 1
        assert data["session_summary"] == "Overall look is clean."
        
        # Assert parameters loaded correct provider config
        called_args, called_kwargs = mock_triage.call_args
        assert called_kwargs["provider_config"]["provider"] == "openai"
        assert called_kwargs["provider_config"]["api_key"] == "encrypted-val" # Since decryption in tests with DEV key returns raw input if decryption fails (or fails back to raw)
        
        # Assert priority updated in DB
        async with TestingSessionLocal() as session:
            res = await session.execute(select(Marker).where(Marker.id == "marker-1"))
            marker = res.scalar_one()
            # priority field in model core.py is SAEnum(PriorityEnum), so it compares by value/name
            assert marker.priority.value == "critical"
            assert marker.ai_summary == "Critical layout breakage detected."


@pytest.mark.anyio
async def test_summary_success_path():
    # 1. Add default provider
    async with TestingSessionLocal() as session:
        c1 = UserAIProviderConfig(
            id="c-1",
            user_id=MOCK_USER_ID,
            provider="openai",
            display_name="OpenAI default",
            encrypted_api_key="encrypted-val",
            is_active=True,
            is_default=True,
            supports_openai_compat=True
        )
        session.add(c1)
        await session.commit()
        
    mock_summary_response = {
        "overall_health": "needs_work",
        "top_issues": ["Issue 1"],
        "suggested_fix_order": ["marker-1"],
        "session_summary": "Session needs improvements."
    }
    
    with patch("routers.ai.summarize_session", new_callable=AsyncMock) as mock_summary:
        mock_summary.return_value = mock_summary_response
        
        resp = client.get("/ai/summary/session/sess-123")
        assert resp.status_code == 200
        data = resp.json()
        assert data["overall_health"] == "needs_work"
        assert data["total_markers"] == 1
        assert data["session_summary"] == "Session needs improvements."


@pytest.mark.anyio
async def test_unsupported_provider_path():
    # 1. Add default provider that is not supported (e.g. google gemini with native adapter missing)
    async with TestingSessionLocal() as session:
        c1 = UserAIProviderConfig(
            id="c-1",
            user_id=MOCK_USER_ID,
            provider="google",
            display_name="Google Gemini",
            encrypted_api_key="encrypted-val",
            is_active=True,
            is_default=True,
            supports_openai_compat=False
        )
        session.add(c1)
        await session.commit()
        
    # Calling triage should fail with 501 or 503 from the Exception wrapper in router
    resp = client.post("/ai/triage/session/sess-123")
    assert resp.status_code in (501, 503)
    assert resp.status_code != 500
