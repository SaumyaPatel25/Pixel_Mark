import sys
import os
import pytest
import uuid
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import StaticPool
from sqlalchemy import select
from unittest.mock import AsyncMock, patch

# Setup path to import backend modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from main import app
from dependencies import get_db, get_current_user_optional, get_current_user
from database import Base
from models import User, Project, Session as DbSession, OrgMember, Organization
from markers.models import Marker
from models.core import UserAIProviderConfig
from utils.encryption import encrypt_secret

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
MOCK_USER_EMAIL = "copilot-tester@stage.dev"
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

        org = Organization(id=MOCK_ORG_ID, name="Copilot Org", slug="copilot-org")
        session.add(org)

        member = OrgMember(id=f"mem-{uuid.uuid4()}", org_id=MOCK_ORG_ID, user_id=MOCK_USER_ID, role="member")
        session.add(member)

        proj = Project(id=MOCK_PROJECT_ID, org_id=MOCK_ORG_ID, name="Copilot Project", url="https://copilot.test")
        session.add(proj)

        sess = DbSession(id=MOCK_SESSION_ID, project_id=MOCK_PROJECT_ID, title="Copilot Test Session")
        session.add(sess)

        await session.commit()

    yield

    current_mock_user = None
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.anyio
async def test_copilot_parse_mock_client():
    sample_dom = [
        {
            "selector": "button.cta-primary",
            "tag": "button",
            "text": "Start Free Trial",
            "className": "cta-primary btn",
            "rect": {"top": 100, "left": 200, "width": 150, "height": 45}
        },
        {
            "selector": "h1.hero-title",
            "tag": "h1",
            "text": "Welcome to Stage",
            "className": "hero-title",
            "rect": {"top": 40, "left": 200, "width": 400, "height": 60}
        }
    ]

    payload = {
        "prompt": "Make the primary start free trial button emerald green and change copy to Get Started Now",
        "micro_dom": sample_dom,
        "session_id": MOCK_SESSION_ID,
        "mock_client": True
    }

    resp = client.post("/api/copilot/parse", json=payload)
    assert resp.status_code == 200, resp.text
    data = resp.json()

    assert data["selector"] == "button.cta-primary"
    assert "background-color" in data["css_mutations"] or "color" in data["css_mutations"]
    assert data["text_mutation"] == "Get Started Now"
    assert "button" in data["client_summary"].lower()
    assert len(data["developer_explanation"]) > 0
    assert data["confidence"] > 0.0


@pytest.mark.anyio
async def test_copilot_parse_with_active_user_provider():
    # Insert active user provider config into DB
    async with TestingSessionLocal() as session:
        cfg = UserAIProviderConfig(
            id=f"cfg-{uuid.uuid4()}",
            user_id=MOCK_USER_ID,
            provider="groq",
            display_name="My Custom Groq",
            encrypted_api_key=encrypt_secret("gsk_test_mock_12345"),
            is_active=True,
            is_default=True,
            supports_openai_compat=True,
            model_name="llama-3.3-70b-versatile"
        )
        session.add(cfg)
        await session.commit()

    sample_dom = [
        {
            "selector": "#header-banner",
            "tag": "div",
            "text": "Special Announcement",
            "rect": {"top": 0, "left": 0, "width": 1200, "height": 50}
        }
    ]

    mock_llm_json = {
        "selector": "#header-banner",
        "css_mutations": {"background-color": "#EF4444", "color": "#FFFFFF"},
        "css_rules": "#header-banner { background-color: #EF4444 !important; color: #FFFFFF !important; }",
        "text_mutation": "Urgent Announcement",
        "client_summary": "Changed banner background to red and updated header text.",
        "developer_explanation": "Updated hero banner theme with red background for urgent status callout.",
        "confidence": 0.98
    }

    with patch("services.copilot_service.run_provider_json_completion", new_callable=AsyncMock) as mock_complete:
        mock_complete.return_value = mock_llm_json

        payload = {
            "prompt": "Change banner to red and set copy to Urgent Announcement",
            "micro_dom": sample_dom,
            "session_id": MOCK_SESSION_ID
        }

        resp = client.post("/api/copilot/parse", json=payload)
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert data["selector"] == "#header-banner"
        assert data["css_mutations"]["background-color"] == "#EF4444"
        assert data["text_mutation"] == "Urgent Announcement"
        assert data["confidence"] == 0.98


@pytest.mark.anyio
async def test_copilot_parse_no_provider_error(monkeypatch):
    # Ensure no system env keys
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)

    payload = {
        "prompt": "Change button color to blue",
        "micro_dom": [{"selector": "button.save", "tag": "button", "text": "Save"}],
        "session_id": MOCK_SESSION_ID,
        "mock_client": False
    }

    resp = client.post("/api/copilot/parse", json=payload)
    assert resp.status_code == 400
    assert "No active AI provider configured" in resp.json()["detail"]


@pytest.mark.anyio
async def test_copilot_parse_validation_error():
    # Empty prompt fails validation
    payload = {
        "prompt": "",
        "micro_dom": []
    }
    resp = client.post("/api/copilot/parse", json=payload)
    assert resp.status_code == 422


@pytest.mark.anyio
async def test_copilot_confirm_pin_success():
    payload = {
        "session_id": MOCK_SESSION_ID,
        "selector": "button.cta-primary",
        "image_base64": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
        "css_mutations": {"background-color": "#10B981", "color": "#FFFFFF"},
        "css_rules": "button.cta-primary { background-color: #10B981 !important; color: #FFFFFF !important; }",
        "text_mutation": "Get Started Now",
        "client_summary": "Changed button color to emerald green and updated copy.",
        "developer_explanation": "Client requested high-contrast CTA button styling with emerald #10B981.",
        "rect": {"top": 100, "left": 200, "width": 150, "height": 45}
    }

    resp = client.post("/api/copilot/confirm-pin", json=payload)
    assert resp.status_code in (200, 201), resp.text
    data = resp.json()

    assert data["session_id"] == MOCK_SESSION_ID
    assert data["selector"] == "button.cta-primary"
    assert data["status"] == "created"
    assert data["title"] == "Changed button color to emerald green and updated copy."
    assert "high-contrast CTA" in data["description"]
    assert data["screenshot_url"] == payload["image_base64"]

    # Verify metadata in response
    assert data["metadata"]["source"] == "ai_copilot"
    assert data["metadata"]["css_mutations"] == {"background-color": "#10B981", "color": "#FFFFFF"}
    assert data["metadata"]["text_mutation"] == "Get Started Now"

    # Verify persisted in database
    marker_id = data["id"]
    async with TestingSessionLocal() as session:
        res = await session.execute(select(Marker).where(Marker.id == marker_id))
        marker = res.scalar_one_or_none()
        assert marker is not None
        assert marker.project_id == MOCK_PROJECT_ID
        assert marker.session_id == MOCK_SESSION_ID
        assert marker.target_selector == "button.cta-primary"
        assert marker.title == payload["client_summary"]
        assert marker.description == payload["developer_explanation"]
        assert marker.screenshot_url == payload["image_base64"]
        assert marker.element_rect_json is not None
        assert marker.element_rect_json["metadata"]["source"] == "ai_copilot"
        assert marker.element_rect_json["top"] == 100


@pytest.mark.anyio
async def test_copilot_confirm_pin_session_not_found():
    payload = {
        "session_id": "ses-nonexistent-9999",
        "selector": "button.cta",
        "client_summary": "Summary"
    }
    resp = client.post("/api/copilot/confirm-pin", json=payload)
    assert resp.status_code == 404
    assert "Session not found" in resp.json()["detail"]


@pytest.mark.anyio
async def test_copilot_confirm_pin_missing_fields():
    payload = {
        # missing selector and client_summary
        "session_id": MOCK_SESSION_ID
    }
    resp = client.post("/api/copilot/confirm-pin", json=payload)
    assert resp.status_code == 422


@pytest.mark.anyio
async def test_copilot_confirm_pin_dispatches_notifications():
    payload = {
        "session_id": MOCK_SESSION_ID,
        "selector": "h1.hero",
        "client_summary": "Update headline copy",
        "developer_explanation": "Revised marketing headline for A/B test.",
        "css_mutations": {},
        "text_mutation": "Better Product Management"
    }

    with patch("services.notification_service.emit_pin_event", new_callable=AsyncMock) as mock_pin_evt, \
         patch("services.notification_service.emit_session_notification", new_callable=AsyncMock) as mock_sess_notif:
        resp = client.post("/api/copilot/confirm-pin", json=payload)
        assert resp.status_code in (200, 201)

        assert mock_pin_evt.called
        pin_call_kwargs = mock_pin_evt.call_args.kwargs
        assert pin_call_kwargs["event_type"] == "pin.created"
        assert pin_call_kwargs["session_id"] == MOCK_SESSION_ID

        assert mock_sess_notif.called
        sess_call_kwargs = mock_sess_notif.call_args.kwargs
        assert sess_call_kwargs["event_type"] == "marker_created"
        assert sess_call_kwargs["metadata"]["source"] == "ai_copilot"
