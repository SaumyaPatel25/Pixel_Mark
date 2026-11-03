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
from models import User, Project, Session as DbSession, OrgMember, Organization, NotificationOutbox
from markers.models import Marker

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

MOCK_USER_ID = f"usr-v2-{uuid.uuid4()}"
MOCK_USER_EMAIL = "copilot-v2-lead@stage.dev"
MOCK_ORG_ID = f"org-v2-{uuid.uuid4()}"
MOCK_PROJECT_ID = f"prj-v2-{uuid.uuid4()}"
MOCK_SESSION_ID = f"ses-v2-{uuid.uuid4()}"

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

        org = Organization(id=MOCK_ORG_ID, name="STAGE V2 Copilot Org", slug="stage-v2-org")
        session.add(org)

        member = OrgMember(id=f"mem-{uuid.uuid4()}", org_id=MOCK_ORG_ID, user_id=MOCK_USER_ID, role="admin")
        session.add(member)

        project = Project(
            id=MOCK_PROJECT_ID,
            org_id=MOCK_ORG_ID,
            name="STAGE V2 Copilot Project",
            url="https://v2.stage.dev"
        )
        session.add(project)

        sess = DbSession(
            id=MOCK_SESSION_ID,
            project_id=MOCK_PROJECT_ID,
            title="STAGE V2 Copilot Review Session",
            current_page_url="https://v2.stage.dev/dashboard"
        )
        session.add(sess)

        await session.commit()

    yield

    current_mock_user = None
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


# ============================================================================
# Scenario 1: Site Context Analysis & Top 3 Suggestions Pipeline
# ============================================================================

@pytest.mark.asyncio
async def test_scenario_1_site_context_analysis_and_top_3_suggestions():
    """
    Test Scenario 1:
    - Post site fingerprint (title, description, headings, dominant_colors, cta_buttons)
      to POST /api/copilot/analyze-site.
    - Verify response has business_category, aesthetic_summary, dominant_colors,
      and exactly 3 top_3_suggestions with valid schema (including CRO, Typography, Spacing/Polish).
    """
    fingerprint_payload = {
        "title": "Entrext AI Platform - Automated Visual Review",
        "description": "Next-generation visual staging canvas and design copilot for SaaS engineering teams.",
        "headings": [
            {"text": "Supercharge Your Visual Staging", "selector": "h1.hero-title"},
            {"text": "Real-time Ephemeral DOM Styling", "selector": "h2.feature-title"},
            {"text": "Automated Dev Fix Generation", "selector": "h2.dev-fix-title"}
        ],
        "dominant_colors": ["#0F172A", "#6366F1", "#10B981"],
        "cta_buttons": [
            {"text": "Start Free Trial", "selector": "button.cta-primary"},
            {"text": "Book a Demo", "selector": "a.secondary-demo"}
        ],
        "mock_client": True
    }

    response = client.post("/api/copilot/analyze-site", json=fingerprint_payload)
    assert response.status_code == 200, response.text
    data = response.json()

    # Verify top-level categorization & aesthetic metadata
    assert "business_category" in data
    assert isinstance(data["business_category"], str) and len(data["business_category"]) > 0
    assert "SaaS" in data["business_category"] or "Platform" in data["business_category"]

    assert "aesthetic_summary" in data
    assert isinstance(data["aesthetic_summary"], str) and len(data["aesthetic_summary"]) > 0
    assert "dark" in data["aesthetic_summary"].lower() or "modern" in data["aesthetic_summary"].lower()

    assert "dominant_colors" in data
    assert isinstance(data["dominant_colors"], list) and len(data["dominant_colors"]) >= 3
    assert "#0F172A" in data["dominant_colors"]

    # Verify exactly 3 top suggestions
    assert "top_3_suggestions" in data
    suggestions = data["top_3_suggestions"]
    assert len(suggestions) == 3

    # Verify suggestions schema and required design pillars
    impact_tags = []
    for s in suggestions:
        assert "id" in s and isinstance(s["id"], str) and len(s["id"]) > 0
        assert "title" in s and isinstance(s["title"], str) and len(s["title"]) > 0
        assert "impact_tag" in s and isinstance(s["impact_tag"], str) and len(s["impact_tag"]) > 0
        assert "selector" in s and isinstance(s["selector"], str) and len(s["selector"]) > 0
        assert "description" in s and isinstance(s["description"], str) and len(s["description"]) > 0
        assert "css_mutations" in s and isinstance(s["css_mutations"], dict)
        assert "css_rules" in s and isinstance(s["css_rules"], str)
        assert "!important" in s["css_rules"]
        impact_tags.append(s["impact_tag"])

    # Verify core design principles (CRO, Typography, Spacing / Polish) are covered
    assert "CRO" in impact_tags
    assert "Typography" in impact_tags
    assert any(tag in ["Polish", "Spacing", "Aesthetics"] for tag in impact_tags)

    # Suggestion 1 addresses CRO and 8pt spacing rhythm on CTA
    cro_sug = next(s for s in suggestions if s["impact_tag"] == "CRO")
    assert "cta" in cro_sug["selector"].lower() or "button" in cro_sug["selector"].lower()
    assert "padding" in cro_sug["css_mutations"] or "background-color" in cro_sug["css_mutations"]
    assert "8pt" in cro_sug["description"] or "spatial" in cro_sug["description"] or "padding" in cro_sug["description"]


# ============================================================================
# Scenario 2: Suggestion Pinning as Electric Violet AI Marker
# ============================================================================

@pytest.mark.asyncio
async def test_scenario_2_suggestion_pinning_as_electric_violet_marker():
    """
    Test Scenario 2:
    - Take the top suggestion from Scenario 1.
    - Post to POST /api/copilot/confirm-pin with session_id, selector, css_rules, client_summary.
    - Verify marker was created in database.
    - Verify marker.color_token == "ai_copilot".
    - Verify marker.creator_name == "STAGE Copilot".
    - Verify element_rect_json["metadata"]["source"] == "ai_copilot".
    """
    # 1. Fetch site suggestions
    fingerprint_payload = {
        "title": "Entrext AI Platform",
        "description": "Visual staging canvas",
        "headings": [{"text": "Supercharge Your Visual Staging", "selector": "h1.hero-title"}],
        "dominant_colors": ["#0F172A", "#6366F1", "#10B981"],
        "cta_buttons": [{"text": "Start Free Trial", "selector": "button.cta-primary"}],
        "mock_client": True
    }
    analyze_resp = client.post("/api/copilot/analyze-site", json=fingerprint_payload)
    assert analyze_resp.status_code == 200
    top_suggestion = analyze_resp.json()["top_3_suggestions"][0]

    # 2. Post to confirm-pin
    confirm_payload = {
        "session_id": MOCK_SESSION_ID,
        "selector": top_suggestion["selector"],
        "css_rules": top_suggestion["css_rules"],
        "css_mutations": top_suggestion["css_mutations"],
        "client_summary": top_suggestion["title"],
        "developer_explanation": top_suggestion["description"],
        "rect": {"top": 140, "left": 280, "width": 180, "height": 48}
    }

    pin_resp = client.post("/api/copilot/confirm-pin", json=confirm_payload)
    assert pin_resp.status_code == 201, pin_resp.text
    pin_data = pin_resp.json()

    marker_id = pin_data["id"]
    assert pin_data["status"] == "created"
    assert pin_data["metadata"]["source"] == "ai_copilot"

    # 3. Direct DB Verification
    async with TestingSessionLocal() as session:
        stmt = select(Marker).where(Marker.id == marker_id)
        res = await session.execute(stmt)
        marker = res.scalar_one_or_none()

        assert marker is not None, f"Marker {marker_id} was not found in the database"
        assert marker.project_id == MOCK_PROJECT_ID
        assert marker.session_id == MOCK_SESSION_ID
        assert marker.target_selector == top_suggestion["selector"]

        # Verification of Electric Violet AI Marker attributes
        assert marker.color_token == "ai_copilot", f"Expected 'ai_copilot', got '{marker.color_token}'"
        assert marker.creator_name == "STAGE Copilot", f"Expected 'STAGE Copilot', got '{marker.creator_name}'"
        assert marker.element_rect_json["metadata"]["source"] == "ai_copilot"
        assert marker.element_rect_json["metadata"]["css_rules"] == top_suggestion["css_rules"]


# ============================================================================
# Scenario 3: Inspiration Photo Attachment Flow
# ============================================================================

@pytest.mark.asyncio
async def test_scenario_3_inspiration_photo_attachment_flow():
    """
    Test Scenario 3:
    - Post to POST /api/copilot/confirm-pin with
      inspo_image_url="https://images.unsplash.com/photo-minimal-design" and image_base64.
    - Verify marker is saved with inspo_image_url persisted in metadata, element_rect_json,
      and encrypted_context.
    """
    inspo_url = "https://images.unsplash.com/photo-minimal-design"

    inspo_payload = {
        "session_id": MOCK_SESSION_ID,
        "selector": "div.hero-feature-card",
        "image_base64": SAMPLE_CROP_BASE64,
        "inspo_image_url": inspo_url,
        "client_summary": "Elevate feature card visual depth aligned with inspiration reference",
        "developer_explanation": "Client attached minimal card design inspiration image for modern aesthetics.",
        "css_mutations": {
            "border": "1px solid rgba(255, 255, 255, 0.08)",
            "border-radius": "16px"
        },
        "css_rules": "div.hero-feature-card { border: 1px solid rgba(255, 255, 255, 0.08) !important; border-radius: 16px !important; }",
        "rect": {"top": 220, "left": 180, "width": 360, "height": 220}
    }

    resp = client.post("/api/copilot/confirm-pin", json=inspo_payload)
    assert resp.status_code == 201, resp.text
    data = resp.json()

    marker_id = data["id"]
    assert data["metadata"]["inspo_image_url"] == inspo_url
    assert data["metadata"]["source"] == "ai_copilot"

    # Query database and verify persistence in all required targets
    async with TestingSessionLocal() as session:
        res = await session.execute(select(Marker).where(Marker.id == marker_id))
        marker = res.scalar_one_or_none()

        assert marker is not None
        assert marker.screenshot_url == SAMPLE_CROP_BASE64
        assert marker.color_token == "ai_copilot"
        assert marker.creator_name == "STAGE Copilot"

        # Verify inspo_image_url in element_rect_json & element_rect_json["metadata"]
        assert marker.element_rect_json is not None
        assert marker.element_rect_json.get("inspo_image_url") == inspo_url
        assert marker.element_rect_json.get("metadata", {}).get("inspo_image_url") == inspo_url
        assert marker.element_rect_json.get("metadata", {}).get("source") == "ai_copilot"

        # Verify inspo_image_url in encrypted_context
        assert marker.encrypted_context is not None
        parsed_context = json.loads(marker.encrypted_context)
        assert parsed_context["inspo_image_url"] == inspo_url
        assert parsed_context["source"] == "ai_copilot"


# ============================================================================
# Scenario 4: Point-to-Marker Developer Fix Generator
# ============================================================================

@pytest.mark.asyncio
async def test_scenario_4_point_to_marker_developer_fix_generator():
    """
    Test Scenario 4:
    - Post to POST /api/copilot/generate-dev-fix with
      marker_id, selector="button.cta-primary", comment="CTA button has low contrast and fails WCAG AA",
      mock_client=True.
    - Verify response contains issue_analysis, suggested_code (with CSS and Tailwind),
      file_hint, and css_rules.
    """
    fix_payload = {
        "marker_id": f"mrk-{uuid.uuid4()}",
        "selector": "button.cta-primary",
        "comment": "CTA button has low contrast and fails WCAG AA",
        "target_url": "https://v2.stage.dev/dashboard",
        "inspo_image_url": "https://images.unsplash.com/photo-minimal-design",
        "mock_client": True
    }

    resp = client.post("/api/copilot/generate-dev-fix", json=fix_payload)
    assert resp.status_code == 200, resp.text
    fix_data = resp.json()

    assert fix_data["marker_id"] == fix_payload["marker_id"]

    # 1. Verify issue_analysis
    assert "issue_analysis" in fix_data
    assert isinstance(fix_data["issue_analysis"], str) and len(fix_data["issue_analysis"]) > 0
    assert "button.cta-primary" in fix_data["issue_analysis"]
    assert "WCAG" in fix_data["issue_analysis"]
    assert "contrast" in fix_data["issue_analysis"].lower()

    # 2. Verify suggested_code contains both Tailwind and scoped CSS
    assert "suggested_code" in fix_data
    suggested_code = fix_data["suggested_code"]
    assert isinstance(suggested_code, str) and len(suggested_code) > 0
    # Must contain Tailwind replacement utility snippet
    assert "tailwind" in suggested_code.lower() or "classname=" in suggested_code.lower()
    # Must contain CSS implementation
    assert "button.cta-primary" in suggested_code
    assert "{" in suggested_code and "}" in suggested_code

    # 3. Verify file_hint
    assert "file_hint" in fix_data
    assert isinstance(fix_data["file_hint"], str) and len(fix_data["file_hint"]) > 0
    assert "Button.tsx" in fix_data["file_hint"]

    # 4. Verify css_rules
    assert "css_rules" in fix_data
    assert isinstance(fix_data["css_rules"], str) and len(fix_data["css_rules"]) > 0
    assert "button.cta-primary" in fix_data["css_rules"]
    assert "!important" in fix_data["css_rules"]


# ============================================================================
# Scenario 5: Full Orchestrated V2 Copilot End-to-End Pipeline
# ============================================================================

@pytest.mark.asyncio
async def test_full_orchestrated_v2_copilot_e2e_pipeline():
    """
    Comprehensive pipeline connecting all 4 scenarios in sequence:
    1. Analyze site context from DOM fingerprint -> receive Top 3 suggestions.
    2. User picks suggestion 1 (CRO CTA improvement) and attaches an inspiration photo URL.
    3. Confirm pin commits Electric Violet marker to DB with outbox notification.
    4. Developer invokes 'Ask AI to Generate Dev Fix' on the created marker.
    5. Query marker via GET /markers/{id} and verify full round-trip data fidelity.
    """
    # 1. Site Context Analysis
    fingerprint = {
        "title": "Stage AI Design Studio",
        "description": "Visual design feedback and real-time frontend prototyping.",
        "headings": ["Next Gen Visual Reviews", "Collaborative Canvas"],
        "dominant_colors": ["#09090B", "#8B5CF6", "#10B981"],
        "cta_buttons": [{"text": "Try Copilot Free", "selector": "button.hero-try-btn"}],
        "mock_client": True
    }
    analysis_resp = client.post("/api/copilot/analyze-site", json=fingerprint)
    assert analysis_resp.status_code == 200
    analysis = analysis_resp.json()
    assert len(analysis["top_3_suggestions"]) == 3

    chosen_suggestion = analysis["top_3_suggestions"][0]
    inspo_reference = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe"

    # 2. Confirm Pin with attached inspiration photo
    confirm_payload = {
        "session_id": MOCK_SESSION_ID,
        "selector": chosen_suggestion["selector"],
        "image_base64": SAMPLE_CROP_BASE64,
        "inspo_image_url": inspo_reference,
        "css_mutations": chosen_suggestion["css_mutations"],
        "css_rules": chosen_suggestion["css_rules"],
        "client_summary": chosen_suggestion["title"],
        "developer_explanation": chosen_suggestion["description"],
        "rect": {"top": 150, "left": 300, "width": 170, "height": 46}
    }
    confirm_resp = client.post("/api/copilot/confirm-pin", json=confirm_payload)
    assert confirm_resp.status_code == 201
    created_pin = confirm_resp.json()
    marker_id = created_pin["id"]

    # 3. Direct DB check for electric violet marker & outbox
    async with TestingSessionLocal() as session:
        marker = (await session.execute(select(Marker).where(Marker.id == marker_id))).scalar_one_or_none()
        assert marker is not None
        assert marker.color_token == "ai_copilot"
        assert marker.creator_name == "STAGE Copilot"
        assert marker.element_rect_json["metadata"]["source"] == "ai_copilot"
        assert marker.element_rect_json["metadata"]["inspo_image_url"] == inspo_reference

        outbox = (await session.execute(
            select(NotificationOutbox).where(NotificationOutbox.marker_id == marker_id)
        )).scalar_one_or_none()
        assert outbox is not None
        assert outbox.event_type == "pin.created"

    # 4. Generate Developer Fix for the created marker
    fix_resp = client.post("/api/copilot/generate-dev-fix", json={
        "marker_id": marker_id,
        "selector": chosen_suggestion["selector"],
        "comment": f"Fails WCAG AA contrast. Recommended fix: {chosen_suggestion['title']}",
        "inspo_image_url": inspo_reference,
        "mock_client": True
    })
    assert fix_resp.status_code == 200
    fix_data = fix_resp.json()
    assert fix_data["marker_id"] == marker_id
    assert any(h in fix_data["file_hint"] for h in ["Button.tsx", "Hero.tsx"])
    assert "!important" in fix_data["css_rules"]

    # 5. Verify GET /markers/{id}
    get_marker_resp = client.get(f"/markers/{marker_id}")
    assert get_marker_resp.status_code == 200
    fetched = get_marker_resp.json()
    assert fetched["id"] == marker_id
    assert fetched["color_token"] == "ai_copilot"
    assert fetched["creator_name"] == "STAGE Copilot"
    assert fetched["element_rect_json"]["inspo_image_url"] == inspo_reference
