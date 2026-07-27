import pytest
import pytest_asyncio
import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from models import User, Organization, OrgMember, Project, SubscriptionModel, EarlyBirdCounterModel
from dependencies import check_project_limit, check_seat_limit, require_plan_feature
from services.dodo_client import dodo_client
from database import engine, Base


@pytest_asyncio.fixture(autouse=True)
async def setup_billing_tables():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()


@pytest.mark.asyncio
async def test_dodo_client_test_mode_methods():
    cust = await dodo_client.create_customer("test@stage.dev", "Test User")
    assert cust["customer_id"].startswith("cust_dodo_test_")

    session = await dodo_client.create_checkout_session(
        product_id="p_dev_team_test",
        customer_id=cust["customer_id"],
        discount_code="dsc_early_bird_25"
    )
    assert "checkout_url" in session
    assert session["is_test_mode"] is True
    assert session["discount_code"] == "dsc_early_bird_25"

    sub = await dodo_client.get_subscription("sub_123")
    assert sub["status"] == "active"

    cancel = await dodo_client.cancel_subscription("sub_123")
    assert cancel["status"] == "canceled"


@pytest.mark.asyncio
async def test_early_bird_atomic_50_limit():
    from database import DATABASE_URL
    from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
    from sqlalchemy.orm import sessionmaker
    from sqlalchemy.pool import NullPool

    test_engine = create_async_engine(DATABASE_URL, poolclass=NullPool)
    TestSessionLocal = sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with TestSessionLocal() as db_session:
        res = await db_session.execute(select(EarlyBirdCounterModel).where(EarlyBirdCounterModel.id == "dev_team_early_bird"))
        counter = res.scalar_one_or_none()
        if not counter:
            counter = EarlyBirdCounterModel(id="dev_team_early_bird", claimed_count=48, max_limit=50)
            db_session.add(counter)
        else:
            counter.claimed_count = 48
        await db_session.commit()

        # Claim slot 49
        res = await db_session.execute(select(EarlyBirdCounterModel).where(EarlyBirdCounterModel.id == "dev_team_early_bird"))
        c1 = res.scalar_one()
        c1.claimed_count += 1
        await db_session.commit()

        # Claim slot 50
        res = await db_session.execute(select(EarlyBirdCounterModel).where(EarlyBirdCounterModel.id == "dev_team_early_bird"))
        c2 = res.scalar_one()
        c2.claimed_count += 1
        await db_session.commit()

        # Attempt slot 51 (must fail to claim early-bird)
        res = await db_session.execute(select(EarlyBirdCounterModel).where(EarlyBirdCounterModel.id == "dev_team_early_bird"))
        c3 = res.scalar_one()
        assert c3.claimed_count == 50
        assert (c3.max_limit - c3.claimed_count) == 0

    await test_engine.dispose()


@pytest.mark.asyncio
async def test_subscription_limits_and_enforcement():
    import uuid
    from database import DATABASE_URL
    from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
    from sqlalchemy.orm import sessionmaker
    from sqlalchemy.pool import NullPool

    test_engine = create_async_engine(DATABASE_URL, poolclass=NullPool)
    TestSessionLocal = sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        from sqlalchemy import text
        await conn.execute(text("ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS past_due_since TIMESTAMPTZ;"))
        await conn.execute(text("ALTER TABLE projects ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'active';"))

    async with TestSessionLocal() as db_session:
        # Create test org with unique slug
        uid = str(uuid.uuid4())[:8]
        target_org_id = str(uuid.uuid4())
        org = Organization(id=target_org_id, name=f"Test Billing Org {uid}", slug=f"test-billing-org-{uid}")
        db_session.add(org)
        await db_session.commit()

        # Create None Subscription (1 seat, 1 project allowed)
        sub = SubscriptionModel(
            id=str(uuid.uuid4()),
            org_id=target_org_id,
            plan_type="none",
            status="none",
            seats_allowed=1,
            projects_allowed=1
        )
        db_session.add(sub)
        
        # Add 1 project to reach the limit
        proj = Project(id=str(uuid.uuid4()), name="Test Project", org_id=target_org_id)
        db_session.add(proj)
        await db_session.commit()

        # Add project check must raise SUBSCRIPTION_REQUIRED
        from fastapi import HTTPException
        try:
            await check_project_limit(target_org_id, db_session)
            assert False, "Should have raised SUBSCRIPTION_REQUIRED"
        except HTTPException as exc:
            assert exc.status_code == 403
            assert exc.detail["code"] == "SUBSCRIPTION_REQUIRED"

        # Feature check for DOM Edit on None plan must raise FEATURE_REQUIRES_DEV_TEAM_PLAN
        user = User(id=str(uuid.uuid4()), email=f"solo-{uid}@stage.dev", name="Solo Dev", hashed_password="mock_hash")
        db_session.add(user)
        await db_session.commit()

        try:
            await require_plan_feature("blueprint_dom_edit")(target_org_id, user, db_session)
            assert False, "Should have raised FEATURE_REQUIRES_DEV_TEAM_PLAN"
        except HTTPException as exc_feature:
            assert exc_feature.status_code == 403
            assert exc_feature.detail["code"] == "FEATURE_REQUIRES_DEV_TEAM_PLAN"

    await test_engine.dispose()
