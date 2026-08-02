import pytest
import uuid
import os
import sys
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import StaticPool
from sqlalchemy import select, update

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from main import app
from dependencies import get_db
from database import Base
from models import User, Organization, OrgMember, SubscriptionModel, Project
from auth import create_access_token
from services.plan_capabilities import invalidate_org_plan_cache, resolve_org_entitlements

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

@pytest.fixture(autouse=True)
def override_dependencies():
    app.dependency_overrides[get_db] = get_test_db
    yield
    app.dependency_overrides.clear()

@pytest.fixture(autouse=True)
async def setup_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

client = TestClient(app)

@pytest.mark.anyio
async def test_free_plan_project_limit_enforcement():
    """
    Test requirement 2 & 7: Free user creates 1st project successfully, 2nd project blocked with LIMIT_PROJECTS_EXCEEDED.
    """
    email = f"free_user_{uuid.uuid4().hex[:6]}@stage.dev"
    user_id = f"usr_free_{uuid.uuid4().hex[:6]}"
    org_id = f"org_free_{uuid.uuid4().hex[:6]}"

    async with TestingSessionLocal() as db:
        user = User(id=user_id, email=email, name="Free User", hashed_password="dummy_hash_123", is_verified=True)
        org = Organization(id=org_id, name="Free Org", slug=f"free-org-{uuid.uuid4().hex[:4]}")
        member = OrgMember(org_id=org_id, user_id=user_id, role="owner")
        sub = SubscriptionModel(org_id=org_id, plan_type="none", status="none", projects_allowed=1, seats_allowed=1)
        
        db.add_all([user, org, member, sub])
        await db.commit()

    token = create_access_token({"sub": user_id})
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create first project (should succeed 201)
    resp1 = client.post("/projects/", json={"name": "Project 1", "url": "https://p1.dev"}, headers=headers)
    assert resp1.status_code == 201, f"First project creation failed: {resp1.text}"

    # 2. Attempt to create second project (should fail 403 LIMIT_PROJECTS_EXCEEDED)
    resp2 = client.post("/projects/", json={"name": "Project 2", "url": "https://p2.dev"}, headers=headers)
    assert resp2.status_code == 403, f"Second project should be blocked: {resp2.text}"
    body = resp2.json()
    assert body["detail"]["code"] == "LIMIT_PROJECTS_EXCEEDED"


@pytest.mark.anyio
async def test_dodo_webhook_active_subscription_sync():
    """
    Test requirement 1 & 7: Webhook processing for 'subscription.active' updates DB and status.
    """
    email = f"webhook_user_{uuid.uuid4().hex[:6]}@stage.dev"
    user_id = f"usr_wh_{uuid.uuid4().hex[:6]}"
    org_id = f"org_wh_{uuid.uuid4().hex[:6]}"

    async with TestingSessionLocal() as db:
        user = User(id=user_id, email=email, name="Webhook User", hashed_password="dummy_hash_123", is_verified=True)
        org = Organization(id=org_id, name="Webhook Org", slug=f"wh-org-{uuid.uuid4().hex[:4]}")
        member = OrgMember(org_id=org_id, user_id=user_id, role="owner")
        sub = SubscriptionModel(org_id=org_id, plan_type="none", status="none", projects_allowed=1, seats_allowed=1)
        
        db.add_all([user, org, member, sub])
        await db.commit()

    token = create_access_token({"sub": user_id})
    headers = {"Authorization": f"Bearer {token}"}

    # Verify initially free/none
    async with TestingSessionLocal() as db:
        ent_before = await resolve_org_entitlements(user_id, db)
        assert ent_before["is_paid"] is False
        assert ent_before["plan_type"] == "none"

    # Simulate Dodo Webhook payload for subscription.active
    webhook_payload = {
        "event_id": f"evt_{uuid.uuid4().hex[:8]}",
        "event_type": "subscription.active",
        "data": {
            "id": "sub_dodo_test_123",
            "customer_id": "cust_dodo_123",
            "metadata": {
                "org_id": org_id,
                "plan_type": "dev_team"
            }
        }
    }

    # Send webhook
    wh_resp = client.post("/billing/webhooks/dodo", json=webhook_payload)
    assert wh_resp.status_code == 200, f"Webhook failed: {wh_resp.text}"

    # Verify entitlement is updated immediately to paid / dev_team
    async with TestingSessionLocal() as db:
        ent_after = await resolve_org_entitlements(user_id, db)
        assert ent_after["is_paid"] is True
        assert ent_after["plan_type"] == "dev_team"
        assert ent_after["projects_allowed"] == 10
        assert ent_after["can_use_blueprint_dom"] is True

    # Check GET /billing/status endpoint returns paid status
    status_resp = client.get("/billing/status", headers=headers)
    assert status_resp.status_code == 200
    assert status_resp.json()["subscription"]["plan_type"] == "dev_team"
    assert status_resp.json()["has_blueprint_dom_edit"] is True

    # Check GET /billing/entitlements endpoint
    ent_resp = client.get("/billing/entitlements", headers=headers)
    assert ent_resp.status_code == 200
    assert ent_resp.json()["is_paid"] is True


@pytest.mark.anyio
async def test_blueprint_dom_mode_plan_gating():
    """
    Test requirement 7: Blueprint DOM mode is blocked for free users and allowed for paid users.
    """
    email = f"dom_user_{uuid.uuid4().hex[:6]}@stage.dev"
    user_id = f"usr_dom_{uuid.uuid4().hex[:6]}"
    org_id = f"org_dom_{uuid.uuid4().hex[:6]}"
    project_id = str(uuid.uuid4())

    async with TestingSessionLocal() as db:
        user = User(id=user_id, email=email, name="DOM User", hashed_password="dummy_hash_123", is_verified=True)
        org = Organization(id=org_id, name="DOM Org", slug=f"dom-org-{uuid.uuid4().hex[:4]}")
        member = OrgMember(org_id=org_id, user_id=user_id, role="owner")
        sub = SubscriptionModel(org_id=org_id, plan_type="none", status="none", projects_allowed=1)
        project = Project(id=project_id, org_id=org_id, name="DOM Test Project")
        
        db.add_all([user, org, member, sub, project])
        await db.commit()

    token = create_access_token({"sub": user_id})
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Attempt to post DOM edits as free user (should fail 403 FEATURE_REQUIRES_PAID_PLAN or FEATURE_REQUIRES_DEV_TEAM_PLAN)
    dom_resp = client.post(
        f"/canvas/{project_id}/edits",
        json={"mutations": [{"targetSelector": "#hero", "actionType": "modify", "property": "color", "newValue": "red", "pageUrl": "https://app.dev"}]},
        headers=headers
    )
    assert dom_resp.status_code == 403, f"Free user should be blocked from DOM edit mode: {dom_resp.text}"

    # Upgrade org subscription to dev_team
    async with TestingSessionLocal() as db:
        await db.execute(update(SubscriptionModel).where(SubscriptionModel.org_id == org_id).values(plan_type="dev_team", status="active"))
        await db.commit()
        invalidate_org_plan_cache(org_id)

    # 2. Attempt post DOM edits as paid user (should succeed 200)
    dom_resp_paid = client.post(
        f"/canvas/{project_id}/edits",
        json={"mutations": [{"targetSelector": "#hero", "actionType": "modify", "property": "color", "newValue": "blue", "pageUrl": "https://app.dev"}]},
        headers=headers
    )
    assert dom_resp_paid.status_code in (200, 201), f"Paid user DOM edit failed: {dom_resp_paid.text}"


@pytest.mark.anyio
async def test_dodo_webhook_customer_id_mapping_fallback():
    """
    Test that when metadata is missing from the webhook, we resolve the org using dodo_customer_id mapping.
    """
    email = f"cust_fallback_{uuid.uuid4().hex[:6]}@stage.dev"
    user_id = f"usr_cf_{uuid.uuid4().hex[:6]}"
    org_id = f"org_cf_{uuid.uuid4().hex[:6]}"
    dodo_cust_id = f"cust_fallback_{uuid.uuid4().hex[:6]}"

    async with TestingSessionLocal() as db:
        user = User(id=user_id, email=email, name="Cust Fallback User", hashed_password="dummy_hash_123", is_verified=True)
        org = Organization(id=org_id, name="Cust Fallback Org", slug=f"cf-org-{uuid.uuid4().hex[:4]}")
        member = OrgMember(org_id=org_id, user_id=user_id, role="owner")
        sub = SubscriptionModel(
            org_id=org_id,
            plan_type="none",
            status="none",
            projects_allowed=1,
            seats_allowed=1,
            dodo_customer_id=dodo_cust_id
        )
        db.add_all([user, org, member, sub])
        await db.commit()

    webhook_payload = {
        "event_id": f"evt_{uuid.uuid4().hex[:8]}",
        "event_type": "subscription.active",
        "data": {
            "id": "sub_cust_fallback_123",
            "customer_id": dodo_cust_id
        }
    }

    wh_resp = client.post("/billing/webhooks/dodo", json=webhook_payload)
    assert wh_resp.status_code == 200

    async with TestingSessionLocal() as db:
        ent_after = await resolve_org_entitlements(user_id, db)
        assert ent_after["is_paid"] is True
        assert ent_after["plan_type"] == "dev_team"


@pytest.mark.anyio
async def test_dodo_webhook_subscription_id_mapping_fallback():
    """
    Test that when metadata is missing, we resolve the org using dodo_subscription_id mapping.
    """
    email = f"sub_fallback_{uuid.uuid4().hex[:6]}@stage.dev"
    user_id = f"usr_sf_{uuid.uuid4().hex[:6]}"
    org_id = f"org_sf_{uuid.uuid4().hex[:6]}"
    dodo_sub_id = f"sub_fallback_{uuid.uuid4().hex[:6]}"

    async with TestingSessionLocal() as db:
        user = User(id=user_id, email=email, name="Sub Fallback User", hashed_password="dummy_hash_123", is_verified=True)
        org = Organization(id=org_id, name="Sub Fallback Org", slug=f"sf-org-{uuid.uuid4().hex[:4]}")
        member = OrgMember(org_id=org_id, user_id=user_id, role="owner")
        sub = SubscriptionModel(
            org_id=org_id,
            plan_type="none",
            status="none",
            projects_allowed=1,
            seats_allowed=1,
            dodo_subscription_id=dodo_sub_id
        )
        db.add_all([user, org, member, sub])
        await db.commit()

    webhook_payload = {
        "event_id": f"evt_{uuid.uuid4().hex[:8]}",
        "event_type": "subscription.active",
        "data": {
            "id": dodo_sub_id,
            "customer_id": "cust_different_123"
        }
    }

    wh_resp = client.post("/billing/webhooks/dodo", json=webhook_payload)
    assert wh_resp.status_code == 200

    async with TestingSessionLocal() as db:
        ent_after = await resolve_org_entitlements(user_id, db)
        assert ent_after["is_paid"] is True
        assert ent_after["plan_type"] == "dev_team"


@pytest.mark.anyio
async def test_dodo_webhook_email_fallback():
    """
    Test that when all ID mappings are missing, we resolve the org using email fallback.
    """
    email = f"email_fallback_{uuid.uuid4().hex[:6]}@stage.dev"
    user_id = f"usr_ef_{uuid.uuid4().hex[:6]}"
    org_id = f"org_ef_{uuid.uuid4().hex[:6]}"

    async with TestingSessionLocal() as db:
        user = User(id=user_id, email=email, name="Email Fallback User", hashed_password="dummy_hash_123", is_verified=True)
        org = Organization(id=org_id, name="Email Fallback Org", slug=f"ef-org-{uuid.uuid4().hex[:4]}")
        member = OrgMember(org_id=org_id, user_id=user_id, role="owner")
        sub = SubscriptionModel(org_id=org_id, plan_type="none", status="none", projects_allowed=1, seats_allowed=1)
        db.add_all([user, org, member, sub])
        await db.commit()

    webhook_payload = {
        "event_id": f"evt_{uuid.uuid4().hex[:8]}",
        "event_type": "subscription.active",
        "data": {
            "id": "sub_unknown_123",
            "customer": {
                "id": "cust_unknown_123",
                "email": email
            }
        }
    }

    wh_resp = client.post("/billing/webhooks/dodo", json=webhook_payload)
    assert wh_resp.status_code == 200

    async with TestingSessionLocal() as db:
        ent_after = await resolve_org_entitlements(user_id, db)
        assert ent_after["is_paid"] is True
        assert ent_after["plan_type"] == "dev_team"


@pytest.mark.anyio
async def test_dodo_webhook_invalid_org_mapping_ignored():
    """
    Test that webhook is ignored or doesn't promote any org if resolution fails.
    """
    webhook_payload = {
        "event_id": f"evt_{uuid.uuid4().hex[:8]}",
        "event_type": "subscription.active",
        "data": {
            "id": "sub_invalid_123",
            "customer_id": "cust_invalid_123",
            "metadata": {
                "org_id": "non_existent_org_id"
            }
        }
    }

    wh_resp = client.post("/billing/webhooks/dodo", json=webhook_payload)
    assert wh_resp.status_code == 200

