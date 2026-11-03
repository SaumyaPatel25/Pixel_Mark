import sys
import os
import pytest
import uuid
import json
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import StaticPool
from sqlalchemy import select

# Setup path to import backend modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from main import app
from dependencies import get_db, get_current_user_optional, get_current_user
from database import Base
from models import User, Project, Session as DbSession, OrgMember, Organization
from markers.models import Marker
from services.copilot_service import generate_developer_fix

# In-memory SQLite for testing
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"
engine = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

async def get_test_db():
    async with TestingSessionLocal() as session:
        yield session

current_mock_user = None

async def mock_get_current_user_optional():
    return current_mock_user

async def mock_get_current_user():
    return current_mock_user

@pytest.fixture(autouse=True, scope="function")
def override_dependencies():
    app.dependency_overrides[get_db] = get_test_db
    app.dependency_overrides[get_current_user_optional] = mock_get_current_user_optional
    app.dependency_overrides[get_current_user] = mock_get_current_user
    yield
    app.dependency_overrides.clear()

client = TestClient(app)

MOCK_USER_ID = f"usr-{uuid.uuid4()}"
MOCK_USER_EMAIL = "dev-fix-tester@stage.dev"
MOCK_ORG_ID = f"org-{uuid.uuid4()}"
MOCK_PROJECT_ID = f"prj-{uuid.uuid4()}"
MOCK_SESSION_ID = f"ses-{uuid.uuid4()}"

@pytest.fixture(autouse=True, scope="function")
async def setup_db():
    global current_mock_user
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with TestingSessionLocal() as session:
        u = User(id=MOCK_USER_ID, email=MOCK_USER_EMAIL, hashed_password="pwd")
        session.add(u)
        current_mock_user = u

        org = Organization(id=MOCK_ORG_ID, name="DevFix Org", slug="devfix-org")
        session.add(org)

        member = OrgMember(id=f"mem-{uuid.uuid4()}", org_id=MOCK_ORG_ID, user_id=MOCK_USER_ID, role="member")
        session.add(member)

        proj = Project(id=MOCK_PROJECT_ID, org_id=MOCK_ORG_ID, name="DevFix Project", url="https://devfix.test")
        session.add(proj)

        sess = DbSession(id=MOCK_SESSION_ID, project_id=MOCK_PROJECT_ID, title="DevFix Test Session")
        session.add(sess)

        await session.commit()

    yield

    current_mock_user = None
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.anyio
async def test_generate_developer_fix_mock():
    """Direct service call to generate_developer_fix in mock mode."""
    res = await generate_developer_fix(
        marker_id="mrk-001",
        selector="button.cta-primary",
        comment="Increase CTA prominence and WCAG contrast",
        target_url="https://example.com/checkout",
        inspo_image_url="https://images.unsplash.com/photo-modern-cta",
        is_mock=True
    )

    assert res["marker_id"] == "mrk-001"
    assert "button.cta-primary" in res["issue_analysis"]
    assert "Increase CTA prominence" in res["issue_analysis"]
    assert "photo-modern-cta" in res["issue_analysis"]
    assert "button.cta-primary" in res["suggested_code"]
    assert "Button.tsx" in res["file_hint"]
    assert "button.cta-primary" in res["css_rules"]
    assert "!important" in res["css_rules"]


@pytest.mark.anyio
async def test_generate_dev_fix_endpoint_mock():
    """HTTP API POST to /api/copilot/generate-dev-fix in mock mode."""
    payload = {
        "marker_id": "mrk-navbar-002",
        "selector": "nav.site-header",
        "comment": "Fix mobile clipping and adjust padding",
        "target_url": "https://example.com",
        "inspo_image_url": "https://example.com/ref.png",
        "mock_client": True
    }

    resp = client.post("/api/copilot/generate-dev-fix", json=payload)
    assert resp.status_code == 200, resp.text
    data = resp.json()

    assert data["marker_id"] == "mrk-navbar-002"
    assert "nav.site-header" in data["issue_analysis"]
    assert len(data["suggested_code"]) > 0
    assert data["file_hint"] == "src/components/Navbar.tsx"
    assert "nav.site-header" in data["css_rules"]


@pytest.mark.anyio
async def test_generate_dev_fix_validation_error():
    """HTTP API POST validation error when required fields are missing or empty."""
    # Missing comment
    resp1 = client.post("/api/copilot/generate-dev-fix", json={"selector": "button.submit"})
    assert resp1.status_code == 422

    # Empty selector
    resp2 = client.post("/api/copilot/generate-dev-fix", json={"selector": "", "comment": "Fix this"})
    assert resp2.status_code == 422

    # Empty comment
    resp3 = client.post("/api/copilot/generate-dev-fix", json={"selector": "div.main", "comment": ""})
    assert resp3.status_code == 422


@pytest.mark.anyio
async def test_confirm_pin_enforces_ai_copilot_token():
    """Ensures color_token is set to 'ai_copilot' and inspo_image_url is saved in metadata."""
    payload = {
        "session_id": MOCK_SESSION_ID,
        "selector": "header.hero-banner",
        "client_summary": "Elevate hero visual hierarchy",
        "developer_explanation": "Client requested refined hero depth and contrast.",
        "inspo_image_url": "https://example.com/hero-inspo.png",
        "rect": {"top": 80, "left": 100, "width": 800, "height": 300}
    }

    resp = client.post("/api/copilot/confirm-pin", json=payload)
    assert resp.status_code in (200, 201), resp.text
    data = resp.json()

    assert data["session_id"] == MOCK_SESSION_ID
    assert data["status"] == "created"
    assert data["metadata"]["source"] == "ai_copilot"
    assert data["metadata"]["inspo_image_url"] == "https://example.com/hero-inspo.png"

    # Query marker in DB and assert attributes
    marker_id = data["id"]
    async with TestingSessionLocal() as session:
        result = await session.execute(select(Marker).where(Marker.id == marker_id))
        marker = result.scalar_one_or_none()

        assert marker is not None
        assert marker.color_token == "ai_copilot"
        assert marker.element_rect_json["metadata"]["source"] == "ai_copilot"
        assert marker.element_rect_json["metadata"]["inspo_image_url"] == "https://example.com/hero-inspo.png"
        assert marker.element_rect_json["inspo_image_url"] == "https://example.com/hero-inspo.png"

        # Check encrypted context
        parsed_context = json.loads(marker.encrypted_context)
        assert parsed_context["source"] == "ai_copilot"
        assert parsed_context["inspo_image_url"] == "https://example.com/hero-inspo.png"
