import pytest
import uuid
from datetime import datetime, timezone, timedelta
from database import Base, DATABASE_URL
from models import User, Organization, OrgMember, SubscriptionModel, RedemptionCodeModel, RedemptionCodeUseModel
from services.plan_capabilities import PlanCapabilities, resolve_org_plan, resolve_org_entitlements, invalidate_org_plan_cache
from routes.redemption import create_redemption_code, redeem_code, RedemptionCodeCreateRequest, RedeemCodeRequest
from routes.billing import handle_dodo_webhook
from config import settings
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool
from fastapi import HTTPException

@pytest.fixture
async def async_db():
    engine = create_async_engine(DATABASE_URL, poolclass=NullPool)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as session:
        yield session

    await engine.dispose()

@pytest.mark.asyncio
async def test_owner_vs_non_owner_code_generation(async_db):
    uid = str(uuid.uuid4())[:8]
    owner_user = User(id=f"owner_{uid}", email=settings.owner_email, hashed_password="pw", name="Owner")
    regular_user = User(id=f"user_{uid}", email=f"regular_{uid}@example.com", hashed_password="pw", name="Regular")
    async_db.add_all([owner_user, regular_user])
    await async_db.commit()

    # 1. Non-owner attempt should fail (403)
    req = RedemptionCodeCreateRequest(plan="stage_team", max_uses=1, notes="Hacker code")
    with pytest.raises(HTTPException) as exc_info:
        await create_redemption_code(req=req, current_user=regular_user, db=async_db)
    assert exc_info.value.status_code == 403

    # 2. Owner attempt should succeed
    req_owner = RedemptionCodeCreateRequest(plan="stage_team", max_uses=1, notes="Owner generated beta code")
    code_obj = await create_redemption_code(req=req_owner, current_user=owner_user, db=async_db)
    assert code_obj.code.startswith("STAGE-")
    assert code_obj.plan == "stage_team"
    assert code_obj.notes == "Owner generated beta code"

@pytest.mark.asyncio
async def test_redemption_validation_rules(async_db):
    uid = str(uuid.uuid4())[:8]
    owner_user = User(id=f"owner_{uid}", email=settings.owner_email, hashed_password="pw", name="Owner")
    target_user = User(id=f"user_{uid}", email=f"target_{uid}@example.com", hashed_password="pw", name="Target")
    target_org = Organization(id=f"org_{uid}", name="Target Org", slug=f"target-org-{uid}")
    member = OrgMember(id=f"mem_{uid}", org_id=target_org.id, user_id=target_user.id, role="owner")
    async_db.add_all([owner_user, target_user, target_org, member])
    await async_db.commit()

    # 1. Generate active, expired, and max-used codes
    req_active = RedemptionCodeCreateRequest(plan="stage_team", max_uses=1, notes="Valid active code")
    active_code = await create_redemption_code(req=req_active, current_user=owner_user, db=async_db)

    # Expired code setup
    past_time = datetime.now(timezone.utc) - timedelta(days=1)
    req_expired = RedemptionCodeCreateRequest(plan="stage_team", max_uses=1, expires_at=past_time, notes="Expired code")
    expired_code = await create_redemption_code(req=req_expired, current_user=owner_user, db=async_db)

    # Max-used code setup
    req_used = RedemptionCodeCreateRequest(plan="stage_team", max_uses=1, notes="Already used code")
    used_code = await create_redemption_code(req=req_used, current_user=owner_user, db=async_db)
    # Simulate usage
    used_code.uses_count = 1
    used_code.is_active = False
    await async_db.commit()

    # 2. Test Invalid Code Redemption
    with pytest.raises(HTTPException) as exc_info:
        await redeem_code(req=RedeemCodeRequest(code="STAGE-INVALID-CODE"), current_user=target_user, db=async_db)
    assert exc_info.value.status_code == 400
    assert "Invalid or inactive" in exc_info.value.detail

    # 3. Test Expired Code Redemption
    with pytest.raises(HTTPException) as exc_info:
        await redeem_code(req=RedeemCodeRequest(code=expired_code.code), current_user=target_user, db=async_db)
    assert exc_info.value.status_code == 400
    assert "expired" in exc_info.value.detail

    # 4. Test Max-used Code Redemption
    with pytest.raises(HTTPException) as exc_info:
        await redeem_code(req=RedeemCodeRequest(code=used_code.code), current_user=target_user, db=async_db)
    assert exc_info.value.status_code == 400
    assert "usage limit" in exc_info.value.detail or "Invalid or inactive" in exc_info.value.detail

    # 5. Test Successful Code Redemption
    res = await redeem_code(req=RedeemCodeRequest(code=active_code.code), current_user=target_user, db=async_db)
    assert res["success"] is True
    assert res["plan_type"] == "stage_team"
    assert res["entitlements"]["plan_type"] == "stage_team"
    assert res["entitlements"]["projects_allowed"] == 9999
    assert res["entitlements"]["seats_allowed"] == 9999
    assert res["entitlements"]["can_use_blueprint_dom"] is True

    # 6. Verify database side-effects
    sub_res = await async_db.execute(select(SubscriptionModel).where(SubscriptionModel.org_id == target_org.id))
    sub = sub_res.scalar_one_or_none()
    assert sub is not None
    assert sub.plan_type == "stage_team"
    assert sub.status == "active"

    org_res = await async_db.execute(select(Organization).where(Organization.id == target_org.id))
    org = org_res.scalar_one_or_none()
    assert org.is_internal is True

@pytest.mark.asyncio
async def test_webhook_precedence_protection(async_db, monkeypatch):
    # Mock signature check
    monkeypatch.setattr("services.dodo_client.dodo_client.verify_webhook_signature", lambda p, h: True)

    uid = str(uuid.uuid4())[:8]
    user = User(id=f"user_{uid}", email=f"user_{uid}@test.com", hashed_password="pw", name="Tester")
    org = Organization(id=f"org_{uid}", name="STAGE Team Org", slug=f"stage-team-{uid}", is_internal=True)
    member = OrgMember(id=f"mem_{uid}", org_id=org.id, user_id=user.id, role="owner")
    sub = SubscriptionModel(id=f"sub_{uid}", org_id=org.id, plan_type="stage_team", status="active", seats_allowed=9999, projects_allowed=9999)
    async_db.add_all([user, org, member, sub])
    await async_db.commit()

    # Simulate webhook request attempting a downgrade to dev_team
    class MockRequest:
        async def body(self):
            return b'{}'
        @property
        def headers(self):
            return {}
        async def json(self):
            return {
                "event_id": f"evt_{uuid.uuid4()}",
                "event_type": "subscription.updated",
                "data": {
                    "subscription_id": "sub_dodo_123",
                    "plan_type": "dev_team",
                    "metadata": {"org_id": org.id}
                }
            }

    mock_req = MockRequest()
    res = await handle_dodo_webhook(request=mock_req, db=async_db)
    assert "ignored" in res["message"] or "Webhook ignored" in res["message"]

    # Verify plan type is preserved as stage_team
    await async_db.refresh(sub)
    assert sub.plan_type == "stage_team"
