import sys
import os
import pytest
import uuid
import json
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import StaticPool
from sqlalchemy import select
from unittest.mock import AsyncMock, patch

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from main import app
from dependencies import get_db, get_current_user_optional, get_current_user
from database import Base
from models import User, Project, Session as DbSession, OrgMember, Organization, NotificationOutbox
from markers.models import Marker
from models.core import UserAIProviderConfig
from utils.encryption import encrypt_secret

# Isolated In-Memory SQLite Engine
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

MOCK_USER_ID = f"usr-e2e-{uuid.uuid4()}"
MOCK_USER_EMAIL = "copilot-e2e-owner@stage.dev"
MOCK_ORG_ID = f"org-e2e-{uuid.uuid4()}"
MOCK_PROJECT_ID = f"prj-e2e-{uuid.uuid4()}"
MOCK_SESSION_ID = f"ses-e2e-{uuid.uuid4()}"

# Sample Base64 5x5 PNG data url representing cropped element preview
SAMPLE_CROP_BASE64 = (
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI"
    "12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg=="
)

@pytest.fixture(autouse=True, scope="function")
async def setup_db():
    global current_mock_user
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with TestingSessionLocal() as session:
        user = User(id=MOCK_USER_ID, email=MOCK_USER_EMAIL, hashed_password="pwd")
        session.add(user)
        current_mock_user = user

        org = Organization(id=MOCK_ORG_ID, name="E2E Copilot Org", slug="e2e-copilot-org")
        session.add(org)

        member = OrgMember(id=f"mem-{uuid.uuid4()}", org_id=MOCK_ORG_ID, user_id=MOCK_USER_ID, role="admin")
        session.add(member)

        project = Project(
            id=MOCK_PROJECT_ID,
            org_id=MOCK_ORG_ID,
            name="E2E Copilot Project",
            url="https://e2e.stage.dev"
        )
        session.add(project)

        sess = DbSession(
            id=MOCK_SESSION_ID,
            project_id=MOCK_PROJECT_ID,
            title="E2E Canvas Review Session",
            current_page_url="https://e2e.stage.dev/pricing"
        )
        session.add(sess)

        await session.commit()

    yield

    current_mock_user = None
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_copilot_e2e_full_lifecycle_mock_client():
    """
    E2E Test 1: Full roundtrip lifecycle using mock client parser:
    1. Natural language prompt + realistic extracted micro-DOM snippet
    2. Intent parsing returns valid CSS rules, mutations, and selector
    3. Client confirmation payload with cropped element base64, rect, and summary
    4. Pin creation in test DB with AI metadata and outbox notification emission
    5. Marker query verification via GET /markers/{id} and GET /sessions/{session_id}/markers
    """
    # 1. Natural Language Prompt + Micro-DOM Snippet
    micro_dom_snippet = [
        {
            "selector": "button.cta-primary",
            "tag": "button",
            "text": "Start Free Trial",
            "className": "cta-primary btn font-bold",
            "rect": {"top": 140, "left": 280, "width": 180, "height": 48}
        },
        {
            "selector": "h1.hero-title",
            "tag": "h1",
            "text": "Build Applications Faster",
            "className": "hero-title text-4xl",
            "rect": {"top": 40, "left": 200, "width": 450, "height": 60}
        },
        {
            "selector": "a.nav-pricing",
            "tag": "a",
            "text": "Pricing Plans",
            "className": "nav-pricing link",
            "rect": {"top": 12, "left": 600, "width": 90, "height": 24}
        }
    ]

    parse_payload = {
        "prompt": "Make the primary start free trial button emerald green and change copy to Get Started Now",
        "micro_dom": micro_dom_snippet,
        "session_id": MOCK_SESSION_ID,
        "mock_client": True
    }

    # 2. Intent Parsing Request
    parse_resp = client.post("/api/copilot/parse", json=parse_payload)
    assert parse_resp.status_code == 200, parse_resp.text
    parse_data = parse_resp.json()

    assert parse_data["selector"] == "button.cta-primary"
    assert "background" in str(parse_data["css_mutations"]).lower() or "color" in str(parse_data["css_mutations"]).lower()
    assert parse_data["text_mutation"] == "Get Started Now"
    assert len(parse_data["client_summary"]) > 0
    assert len(parse_data["developer_explanation"]) > 0
    assert parse_data["confidence"] >= 0.8
    assert "button.cta-primary" in parse_data["css_rules"]
    assert "!important" in parse_data["css_rules"]

    # 3. Client Confirmation Payload
    confirm_payload = {
        "session_id": MOCK_SESSION_ID,
        "selector": parse_data["selector"],
        "image_base64": SAMPLE_CROP_BASE64,
        "css_mutations": parse_data["css_mutations"],
        "css_rules": parse_data["css_rules"],
        "text_mutation": parse_data["text_mutation"],
        "client_summary": parse_data["client_summary"],
        "developer_explanation": parse_data["developer_explanation"],
        "rect": {"top": 140, "left": 280, "width": 180, "height": 48}
    }

    # 4. Pin Creation Request
    confirm_resp = client.post("/api/copilot/confirm-pin", json=confirm_payload)
    assert confirm_resp.status_code == 201, confirm_resp.text
    pin_data = confirm_resp.json()

    marker_id = pin_data["id"]
    assert pin_data["session_id"] == MOCK_SESSION_ID
    assert pin_data["selector"] == "button.cta-primary"
    assert pin_data["status"] == "created"
    assert pin_data["title"] == parse_data["client_summary"]
    assert pin_data["description"] == parse_data["developer_explanation"]
    assert pin_data["screenshot_url"] == SAMPLE_CROP_BASE64
    assert pin_data["metadata"]["source"] == "ai_copilot"
    assert pin_data["metadata"]["text_mutation"] == "Get Started Now"
    assert pin_data["metadata"]["css_mutations"] == parse_data["css_mutations"]

    # 5. Database Direct Verification (Marker & Outbox Notification)
    async with TestingSessionLocal() as session:
        # Verify Marker in DB
        marker_stmt = select(Marker).where(Marker.id == marker_id)
        marker_res = await session.execute(marker_stmt)
        marker = marker_res.scalar_one_or_none()
        assert marker is not None
        assert marker.project_id == MOCK_PROJECT_ID
        assert marker.session_id == MOCK_SESSION_ID
        assert marker.target_selector == "button.cta-primary"
        assert marker.title == parse_data["client_summary"]
        assert marker.description == parse_data["developer_explanation"]
        assert marker.screenshot_url == SAMPLE_CROP_BASE64
        assert marker.element_rect_json["top"] == 140
        assert marker.element_rect_json["left"] == 280
        assert marker.element_rect_json["metadata"]["source"] == "ai_copilot"
        assert marker.element_rect_json["metadata"]["text_mutation"] == "Get Started Now"

        # Verify Notification Outbox Record in DB
        outbox_stmt = select(NotificationOutbox).where(NotificationOutbox.session_id == MOCK_SESSION_ID)
        outbox_res = await session.execute(outbox_stmt)
        outbox_rows = list(outbox_res.scalars().all())
        assert len(outbox_rows) >= 1
        outbox_entry = outbox_rows[0]
        assert outbox_entry.event_type == "pin.created"
        assert outbox_entry.marker_id == marker_id
        assert outbox_entry.project_id == MOCK_PROJECT_ID
        assert outbox_entry.status == "pending"
        assert outbox_entry.payload["event"] == "pin.created"
        assert outbox_entry.payload["pin"]["id"] == marker_id
        assert outbox_entry.payload["pin"]["title"] == parse_data["client_summary"]

    # 6. Marker API Query Verification
    # (a) Single Marker Query GET /markers/{marker_id}
    get_marker_resp = client.get(f"/markers/{marker_id}")
    assert get_marker_resp.status_code == 200, get_marker_resp.text
    fetched_marker = get_marker_resp.json()

    assert fetched_marker["id"] == marker_id
    assert fetched_marker["target_selector"] == "button.cta-primary"
    assert fetched_marker["screenshot_url"] == SAMPLE_CROP_BASE64
    assert fetched_marker["description"] == parse_data["developer_explanation"]
    assert fetched_marker["title"] == parse_data["client_summary"]
    assert fetched_marker["element_rect_json"]["metadata"]["source"] == "ai_copilot"
    assert fetched_marker["element_rect_json"]["metadata"]["css_mutations"] == parse_data["css_mutations"]
    assert fetched_marker["element_rect_json"]["metadata"]["text_mutation"] == "Get Started Now"

    # (b) Session Markers Query GET /sessions/{session_id}/markers
    list_markers_resp = client.get(f"/sessions/{MOCK_SESSION_ID}/markers")
    assert list_markers_resp.status_code == 200, list_markers_resp.text
    markers_list = list_markers_resp.json()
    assert len(markers_list) >= 1
    found = next((m for m in markers_list if m["id"] == marker_id), None)
    assert found is not None
    assert found["target_selector"] == "button.cta-primary"
    assert found["screenshot_url"] == SAMPLE_CROP_BASE64
    assert found["element_rect_json"]["metadata"]["css_mutations"] == parse_data["css_mutations"]


@pytest.mark.asyncio
async def test_copilot_e2e_full_lifecycle_with_ai_provider():
    """
    E2E Test 2: Full roundtrip lifecycle with user BYOK AI Provider completion:
    1. Setup active UserAIProviderConfig
    2. Intent parse returns structured LLM resolution for headline styling
    3. Confirm pin with element crop base64
    4. Outbox notification emission and DB verification
    5. Query marker and verify all fields preserved
    """
    async with TestingSessionLocal() as session:
        cfg = UserAIProviderConfig(
            id=f"cfg-e2e-{uuid.uuid4()}",
            user_id=MOCK_USER_ID,
            provider="groq",
            display_name="BYOK Enterprise Groq",
            encrypted_api_key=encrypt_secret("gsk_e2e_secret_token_12345"),
            is_active=True,
            is_default=True,
            supports_openai_compat=True,
            model_name="llama-3.3-70b-versatile"
        )
        session.add(cfg)
        await session.commit()

    micro_dom_snippet = [
        {
            "selector": "h1.hero-title",
            "tag": "h1",
            "text": "Build Applications Faster",
            "className": "hero-title text-4xl",
            "rect": {"top": 40, "left": 200, "width": 450, "height": 60}
        },
        {
            "selector": "p.hero-subtitle",
            "tag": "p",
            "text": "The visual feedback tool for modern teams",
            "rect": {"top": 110, "left": 200, "width": 400, "height": 30}
        }
    ]

    mock_llm_result = {
        "selector": "h1.hero-title",
        "css_mutations": {"color": "#2563EB", "font-weight": "800"},
        "css_rules": "h1.hero-title { color: #2563EB !important; font-weight: 800 !important; }",
        "text_mutation": "Enterprise Velocity Accelerated",
        "client_summary": "Updated hero title color to Royal Blue and set bold enterprise copy.",
        "developer_explanation": "Hero banner header re-styled with #2563EB for high contrast branding.",
        "confidence": 0.97
    }

    with patch("services.copilot_service.run_provider_json_completion", new_callable=AsyncMock) as mock_complete:
        mock_complete.return_value = mock_llm_result

        parse_payload = {
            "prompt": "Change the hero title to Enterprise Velocity Accelerated and make it vibrant royal blue bold",
            "micro_dom": micro_dom_snippet,
            "session_id": MOCK_SESSION_ID,
            "mock_client": False
        }

        parse_resp = client.post("/api/copilot/parse", json=parse_payload)
        assert parse_resp.status_code == 200, parse_resp.text
        parse_data = parse_resp.json()

        assert parse_data["selector"] == "h1.hero-title"
        assert parse_data["css_mutations"]["color"] == "#2563EB"
        assert parse_data["text_mutation"] == "Enterprise Velocity Accelerated"
        assert parse_data["confidence"] == 0.97

        # Confirm Pin
        confirm_payload = {
            "session_id": MOCK_SESSION_ID,
            "selector": parse_data["selector"],
            "image_base64": SAMPLE_CROP_BASE64,
            "css_mutations": parse_data["css_mutations"],
            "css_rules": parse_data["css_rules"],
            "text_mutation": parse_data["text_mutation"],
            "client_summary": parse_data["client_summary"],
            "developer_explanation": parse_data["developer_explanation"],
            "rect": {"top": 40, "left": 200, "width": 450, "height": 60}
        }

        confirm_resp = client.post("/api/copilot/confirm-pin", json=confirm_payload)
        assert confirm_resp.status_code == 201, confirm_resp.text
        pin_data = confirm_resp.json()
        marker_id = pin_data["id"]

        # Verify DB and Outbox
        async with TestingSessionLocal() as session:
            marker_res = await session.execute(select(Marker).where(Marker.id == marker_id))
            marker = marker_res.scalar_one_or_none()
            assert marker is not None
            assert marker.target_selector == "h1.hero-title"
            assert marker.description == mock_llm_result["developer_explanation"]
            assert marker.screenshot_url == SAMPLE_CROP_BASE64

            outbox_res = await session.execute(
                select(NotificationOutbox).where(NotificationOutbox.marker_id == marker_id)
            )
            outbox_entry = outbox_res.scalar_one_or_none()
            assert outbox_entry is not None
            assert outbox_entry.event_type == "pin.created"

        # Verify via GET /markers/{id}
        get_resp = client.get(f"/markers/{marker_id}")
        assert get_resp.status_code == 200
        marker_data = get_resp.json()
        assert marker_data["target_selector"] == "h1.hero-title"
        assert marker_data["description"] == mock_llm_result["developer_explanation"]
        assert marker_data["element_rect_json"]["metadata"]["css_mutations"] == {"color": "#2563EB", "font-weight": "800"}


@pytest.mark.asyncio
async def test_copilot_e2e_revert_refine_and_reapply():
    """
    E2E Test 3: Iterative refinement simulation:
    Client prompts twice with refined colors, then confirms final chosen visual change.
    """
    sample_dom = [
        {"selector": "button.cta-primary", "tag": "button", "text": "Get Started", "rect": {"top": 100, "left": 200, "width": 140, "height": 40}}
    ]

    # Iteration 1: User asks for emerald green
    resp1 = client.post("/api/copilot/parse", json={
        "prompt": "Make button emerald green",
        "micro_dom": sample_dom,
        "session_id": MOCK_SESSION_ID,
        "mock_client": True
    })
    assert resp1.status_code == 200
    res1 = resp1.json()
    assert res1["selector"] == "button.cta-primary"

    # Iteration 2: User changes mind to purple CTA
    resp2 = client.post("/api/copilot/parse", json={
        "prompt": "Actually make button purple and change copy to Join Now",
        "micro_dom": sample_dom,
        "session_id": MOCK_SESSION_ID,
        "mock_client": True
    })
    assert resp2.status_code == 200
    res2 = resp2.json()
    assert res2["selector"] == "button.cta-primary"
    assert res2["text_mutation"] == "Join Now"

    # Confirm only the second refined iteration
    confirm_resp = client.post("/api/copilot/confirm-pin", json={
        "session_id": MOCK_SESSION_ID,
        "selector": res2["selector"],
        "image_base64": SAMPLE_CROP_BASE64,
        "css_mutations": res2["css_mutations"],
        "css_rules": res2["css_rules"],
        "text_mutation": res2["text_mutation"],
        "client_summary": res2["client_summary"],
        "developer_explanation": res2["developer_explanation"],
        "rect": {"top": 100, "left": 200, "width": 140, "height": 40}
    })
    assert confirm_resp.status_code == 201
    pin_id = confirm_resp.json()["id"]

    # Verify marker created with final chosen purple styling
    get_resp = client.get(f"/markers/{pin_id}")
    assert get_resp.status_code == 200
    assert get_resp.json()["element_rect_json"]["metadata"]["text_mutation"] == "Join Now"


@pytest.mark.asyncio
async def test_copilot_e2e_error_handling_and_validation():
    """
    E2E Test 4: Validation boundaries and error handling:
    - Empty prompt returns 422
    - Invalid session_id returns 404
    - Missing required client summary returns 422
    - Empty micro-DOM resolves gracefully with fallback
    """
    # 1. Empty prompt
    resp_empty = client.post("/api/copilot/parse", json={"prompt": "", "micro_dom": []})
    assert resp_empty.status_code == 422

    # 2. Invalid session_id during confirm
    resp_invalid_session = client.post("/api/copilot/confirm-pin", json={
        "session_id": "ses-unknown-99999",
        "selector": "button.cta",
        "client_summary": "Test summary"
    })
    assert resp_invalid_session.status_code == 404

    # 3. Missing client_summary
    resp_missing_summary = client.post("/api/copilot/confirm-pin", json={
        "session_id": MOCK_SESSION_ID,
        "selector": "button.cta"
    })
    assert resp_missing_summary.status_code == 422

    # 4. Empty micro-DOM returns fallback body with 0.0 confidence
    resp_fallback = client.post("/api/copilot/parse", json={
        "prompt": "Make background dark",
        "micro_dom": [],
        "session_id": MOCK_SESSION_ID,
        "mock_client": True
    })
    assert resp_fallback.status_code == 200
    fallback_data = resp_fallback.json()
    assert fallback_data["selector"] == "body"
    assert fallback_data["confidence"] == 0.0
