import pytest
import uuid
from database import Base, DATABASE_URL
from models import User, Organization, OrgMember, SubscriptionModel, EntitlementAuditLogModel
from services.identity_resolver import is_entrext_domain, ensure_domain_and_founder_entitlement, resolve_canonical_user
from routes.admin import list_admin_users, admin_override_plan, admin_toggle_pause, OverridePlanRequest, TogglePauseRequest
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
        from sqlalchemy import text
        for stmt in [
            "ALTER TABLE users ADD COLUMN is_super_admin BOOLEAN DEFAULT 0;",
            "ALTER TABLE subscriptions ADD COLUMN is_manual_override BOOLEAN DEFAULT 0;",
            "ALTER TABLE subscriptions ADD COLUMN plan_source VARCHAR DEFAULT 'default';",
            "ALTER TABLE subscriptions ADD COLUMN is_paused BOOLEAN DEFAULT 0;",
            "ALTER TABLE subscriptions ADD COLUMN admin_notes TEXT;"
        ]:
            try:
                await conn.execute(text(stmt))
            except Exception:
                pass
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as session:
        yield session

    await engine.dispose()


@pytest.mark.asyncio
async def test_domain_matching_helper():
    assert is_entrext_domain("saumya@entrext.com") is True
    assert is_entrext_domain("SAUMYA@ENTREXT.COM") is True
    assert is_entrext_domain("  test@entrext.com  ") is True
    assert is_entrext_domain("user@notentrext.com") is False
    assert is_entrext_domain("user@entrext.com.evil.com") is False
    assert is_entrext_domain("entrext.com") is False
    assert is_entrext_domain(None) is False


@pytest.mark.asyncio
async def test_non_owner_cannot_access_admin_api(async_db):
    uid = str(uuid.uuid4())[:8]
    regular_user = User(id=f"usr_{uid}", email=f"regular_{uid}@example.com", hashed_password="pw", name="Regular User")
    async_db.add(regular_user)
    await async_db.commit()

    from routes.admin import require_admin_owner

    # 1. Dependency check for non-owner access
    with pytest.raises(HTTPException) as exc1:
        await require_admin_owner(current_user=regular_user)
    assert exc1.value.status_code == 403


@pytest.mark.asyncio
async def test_entrext_domain_auto_entitlement_on_canonical_resolution(async_db):
    uid = str(uuid.uuid4())[:8]
    entrext_email = f"employee_{uid}@entrext.com"

    # Resolve user via Google OAuth
    user_google = await resolve_canonical_user(
        db=async_db,
        provider="google",
        provider_user_id=f"google_{uid}",
        email=entrext_email,
        name="Entrext Team Member",
        email_verified=True
    )

    # Verify user record
    assert user_google.email == entrext_email
    assert user_google.is_verified is True

    # Verify subscription auto-provisioning
    mem_res = await async_db.execute(select(OrgMember).where(OrgMember.user_id == user_google.id))
    mem = mem_res.scalars().first()
    assert mem is not None

    sub_res = await async_db.execute(select(SubscriptionModel).where(SubscriptionModel.org_id == mem.org_id))
    sub = sub_res.scalar_one_or_none()
    assert sub is not None
    assert sub.plan_type == "stage_team"
    assert sub.status == "active"
    assert sub.plan_source == "domain_auto_provision"
    assert sub.seats_allowed == 9999
    assert sub.projects_allowed == 9999


@pytest.mark.asyncio
async def test_non_entrext_domain_rejection(async_db):
    uid = str(uuid.uuid4())[:8]
    fake_email = f"spoofed_{uid}@notentrext.com"

    user = await resolve_canonical_user(
        db=async_db,
        provider="github",
        provider_user_id=f"gh_{uid}",
        email=fake_email,
        name="Spoofer",
        email_verified=True
    )

    mem_res = await async_db.execute(select(OrgMember).where(OrgMember.user_id == user.id))
    mem = mem_res.scalars().first()
    sub_res = await async_db.execute(select(SubscriptionModel).where(SubscriptionModel.org_id == mem.org_id))
    sub = sub_res.scalar_one_or_none()

    # Plan should remain default free tier
    assert sub is None or sub.plan_type in ("none", "default")


@pytest.mark.asyncio
async def test_manual_admin_override_persistence(async_db, monkeypatch):
    monkeypatch.setattr("services.dodo_client.dodo_client.verify_webhook_signature", lambda p, h: True)

    uid = str(uuid.uuid4())[:8]
    owner_res = await async_db.execute(select(User).where(User.email == settings.owner_email))
    owner_user = owner_res.scalar_one_or_none()
    if not owner_user:
        owner_user = User(id=f"owner_{uid}", email=settings.owner_email, hashed_password="pw", name="Super Owner", is_super_admin=True)
        async_db.add(owner_user)

    target_user = User(id=f"target_{uid}", email=f"client_{uid}@external.com", hashed_password="pw", name="Client")
    target_org = Organization(id=f"org_{uid}", name="Client Org", slug=f"client-org-{uid}")
    member = OrgMember(id=f"mem_{uid}", org_id=target_org.id, user_id=target_user.id, role="owner")
    async_db.add_all([target_user, target_org, member])
    await async_db.commit()

    # 1. Admin manually overrides plan to enterprise
    override_req = OverridePlanRequest(
        target_org_id=target_org.id,
        new_plan="enterprise",
        is_manual_override=True,
        notes="VIP partner override"
    )
    res = await admin_override_plan(req=override_req, db=async_db, admin_user=owner_user)
    assert res["success"] is True

    # Verify DB state
    sub_res = await async_db.execute(select(SubscriptionModel).where(SubscriptionModel.org_id == target_org.id))
    sub = sub_res.scalar_one_or_none()
    assert sub.plan_type == "enterprise"
    assert sub.is_manual_override is True
    assert sub.plan_source == "manual_override"

    # 2. Simulate Dodo webhook attempting to downgrade account to dev_team
    class MockRequest:
        async def body(self): return b'{}'
        @property
        def headers(self): return {}
        async def json(self):
            return {
                "event_id": f"evt_{uuid.uuid4()}",
                "event_type": "subscription.updated",
                "data": {
                    "subscription_id": "sub_dodo_fake_123",
                    "plan_type": "dev_team",
                    "metadata": {"org_id": target_org.id}
                }
            }

    webhook_res = await handle_dodo_webhook(request=MockRequest(), db=async_db)
    assert "ignored" in webhook_res["message"]

    # 3. Confirm override persisted
    await async_db.refresh(sub)
    assert sub.plan_type == "enterprise"
    assert sub.is_manual_override is True


@pytest.mark.asyncio
async def test_audit_log_generation(async_db):
    uid = str(uuid.uuid4())[:8]
    owner_res = await async_db.execute(select(User).where(User.email == settings.owner_email))
    owner_user = owner_res.scalar_one_or_none()
    if not owner_user:
        owner_user = User(id=f"owner_{uid}", email=settings.owner_email, hashed_password="pw", name="Owner", is_super_admin=True)
        async_db.add(owner_user)
        await async_db.commit()

    target_org = Organization(id=f"org_{uid}", name="Test Org", slug=f"test-org-{uid}")
    async_db.add(target_org)
    await async_db.commit()

    # Apply override
    override_req = OverridePlanRequest(target_org_id=target_org.id, new_plan="dev_team", notes="Audit test")
    await admin_override_plan(req=override_req, db=async_db, admin_user=owner_user)

    # Check audit log
    logs_res = await async_db.execute(select(EntitlementAuditLogModel).where(EntitlementAuditLogModel.target_org_id == target_org.id))
    log = logs_res.scalars().first()
    assert log is not None
    assert log.actor_email == owner_user.email
    assert log.new_tier == "dev_team"
    assert "Audit test" in log.reason
