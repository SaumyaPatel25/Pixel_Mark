import pytest
import uuid
from datetime import datetime, timezone
from database import DATABASE_URL, Base
from models import User, Organization, OrgMember, Project, SubscriptionModel, EntitlementAuditLogModel
from services.plan_capabilities import PlanCapabilities, resolve_org_plan, resolve_org_entitlements, invalidate_org_plan_cache
from routes.admin import promote_account_tier, PromoteEntitlementRequest
from dependencies import check_project_limit, require_plan_feature
from config import settings
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool
from fastapi import HTTPException, Request
from routes.billing import create_checkout, CheckoutRequest, handle_dodo_webhook


@pytest.fixture
async def async_db():
    engine = create_async_engine(DATABASE_URL, poolclass=NullPool)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as session:
        yield session

    await engine.dispose()


@pytest.mark.asyncio
async def test_stage_team_capabilities_and_resolver(async_db):
    uid = str(uuid.uuid4())[:8]
    org_id = f"org_{uid}"
    user_id = f"usr_{uid}"

    user = User(id=user_id, email=f"test_{uid}@stage.dev", hashed_password="pw", name="Tester", is_verified=True)
    org = Organization(id=org_id, name="Stage Team Org", slug=f"stage-team-{uid}", is_internal=True)
    member = OrgMember(id=str(uuid.uuid4()), org_id=org_id, user_id=user_id, role="owner")
    sub = SubscriptionModel(id=str(uuid.uuid4()), org_id=org_id, plan_type="stage_team", status="active", seats_allowed=9999, projects_allowed=9999)

    async_db.add_all([user, org, member, sub])
    await async_db.commit()

    invalidate_org_plan_cache(org_id)

    # Test Plan Capabilities
    plan_info = await resolve_org_plan(org_id, async_db)
    assert plan_info["plan_type"] == "stage_team"
    assert plan_info["status"] == "active"
    assert plan_info["seats_allowed"] == 9999
    assert plan_info["projects_allowed"] == 9999
    assert plan_info["has_blueprint_dom_edit"] is True
    assert plan_info["can_create_projects"] is True

    # Test Centralized Entitlements Resolver
    entitlements = await resolve_org_entitlements(user_id, async_db)
    assert entitlements["plan_type"] == "stage_team"
    assert entitlements["is_paid"] is True
    assert entitlements["can_use_blueprint_dom"] is True
    assert entitlements["projects_allowed"] == 9999
    assert entitlements["seats_allowed"] == 9999


@pytest.mark.asyncio
async def test_owner_promotion_and_audit_logging(async_db):
    uid = str(uuid.uuid4())[:8]
    res_owner = await async_db.execute(select(User).where(User.email == settings.owner_email))
    owner_user = res_owner.scalar_one_or_none()
    if not owner_user:
        owner_user = User(id=f"owner_{uid}", email=settings.owner_email, hashed_password="pw", name="Owner")
        async_db.add(owner_user)

    regular_user = User(id=f"user_{uid}", email=f"target_{uid}@example.com", hashed_password="pw", name="Regular")

    target_org_id = f"org_{uid}"
    target_org = Organization(id=target_org_id, name="Target Org", slug=f"target-org-{uid}")
    member = OrgMember(id=str(uuid.uuid4()), org_id=target_org_id, user_id=regular_user.id, role="owner")
    sub = SubscriptionModel(id=str(uuid.uuid4()), org_id=target_org_id, plan_type="none", status="none")

    async_db.add_all([regular_user, target_org, member, sub])
    await async_db.commit()

    # Non-owner promotion attempt must be rejected (403)
    req = PromoteEntitlementRequest(target_email=regular_user.email, new_tier="stage_team", reason="Hacker attempt")
    with pytest.raises(HTTPException) as exc_info:
        await promote_account_tier(req=req, current_user=regular_user, db=async_db)
    assert exc_info.value.status_code == 403

    # Owner promotion must succeed
    req_owner = PromoteEntitlementRequest(target_email=regular_user.email, new_tier="stage_team", reason="Verified employee promotion")
    res = await promote_account_tier(req=req_owner, current_user=owner_user, db=async_db)

    assert res["success"] is True
    assert res["new_tier"] == "stage_team"

    # Audit log check
    audit_res = await async_db.execute(
        EntitlementAuditLogModel.__table__.select().where(EntitlementAuditLogModel.target_org_id == target_org_id)
    )
    audit_row = audit_res.fetchone()
    assert audit_row is not None
    assert audit_row.actor_email == settings.owner_email
    assert audit_row.old_tier == "none"
    assert audit_row.new_tier == "stage_team"
    assert audit_row.reason == "Verified employee promotion"


@pytest.mark.asyncio
async def test_stage_team_unlimited_projects_and_feature_gates(async_db):
    uid = str(uuid.uuid4())[:8]
    org_id = f"org_{uid}"
    sub = SubscriptionModel(id=str(uuid.uuid4()), org_id=org_id, plan_type="stage_team", status="active", seats_allowed=9999, projects_allowed=9999)
    async_db.add(sub)
    await async_db.commit()

    # Add 25 active projects
    for i in range(25):
        p = Project(id=str(uuid.uuid4()), name=f"Proj {i}", org_id=org_id)
        async_db.add(p)
    await async_db.commit()

    invalidate_org_plan_cache(org_id)

    # Check project limit check does NOT raise exception
    await check_project_limit(org_id, db=async_db)

    # Check feature gate allows blueprint_dom_edit
    checker = require_plan_feature("blueprint_dom_edit")
    res = await checker(org_id=org_id, db=async_db)
    assert res is True


@pytest.mark.asyncio
async def test_checkout_rejects_stage_team(async_db):
    uid = str(uuid.uuid4())[:8]
    user = User(id=f"usr_{uid}", email=f"user_{uid}@test.com", hashed_password="pw")
    async_db.add(user)
    await async_db.commit()

    req = CheckoutRequest(plan_type="stage_team")
    with pytest.raises(HTTPException) as exc_info:
        await create_checkout(payload=req, db=async_db, current_user=user)
    assert exc_info.value.status_code == 400


@pytest.mark.asyncio
async def test_dodo_webhook_does_not_overwrite_stage_team(async_db):
    uid = str(uuid.uuid4())[:8]
    org_id = f"org_{uid}"
    sub = SubscriptionModel(id=str(uuid.uuid4()), org_id=org_id, plan_type="stage_team", status="active", seats_allowed=9999, projects_allowed=9999)
    async_db.add(sub)
    await async_db.commit()

    # Mock Dodo Webhook payload sending cancellation event
    class DummyRequest:
        async def body(self):
            return b'{}'
        @property
        def headers(self):
            return {}
        async def json(self):
            return {
                "event_id": f"evt_{uid}",
                "event_type": "subscription.canceled",
                "data": {"metadata": {"org_id": org_id}}
            }

    # Patch dodo_client signature check
    from services.dodo_client import dodo_client
    original_verify = dodo_client.verify_webhook_signature
    dodo_client.verify_webhook_signature = lambda payload, headers: True

    try:
        resp = await handle_dodo_webhook(request=DummyRequest(), db=async_db)
        assert resp["event_type"] == "subscription.canceled"
        assert "ignored" in resp["message"].lower() or "protected" in resp["message"].lower()

        # Confirm subscription is still stage_team and active
        await async_db.refresh(sub)
        assert sub.plan_type == "stage_team"
        assert sub.status == "active"
    finally:
        dodo_client.verify_webhook_signature = original_verify
