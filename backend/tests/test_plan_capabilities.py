import pytest
import uuid
from datetime import datetime, timezone, timedelta
from database import DATABASE_URL, Base
from models import User, Organization, OrgMember, Project, SubscriptionModel
from services.plan_capabilities import PlanCapabilities, resolve_org_plan, invalidate_org_plan_cache
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool
from dependencies import check_project_limit, require_plan_feature
from fastapi import HTTPException


@pytest.mark.asyncio
async def test_plan_capabilities_service_rules():
    # Solopreneur (fallback to none)
    c_solo = PlanCapabilities.get_capabilities("solopreneur", "active")
    assert c_solo["plan_type"] == "none"
    assert c_solo["seats_allowed"] == 1
    assert c_solo["projects_allowed"] == 0
    assert c_solo["has_blueprint_dom_edit"] is False

    # Dev Team
    c_dev = PlanCapabilities.get_capabilities("dev_team", "active")
    assert c_dev["seats_allowed"] == 5
    assert c_dev["projects_allowed"] == 10
    assert c_dev["has_blueprint_dom_edit"] is True

    # Dev Team Early Bird
    c_eb = PlanCapabilities.get_capabilities("dev_team_early_bird", "active")
    assert c_eb["seats_allowed"] == 5
    assert c_eb["projects_allowed"] == 10
    assert c_eb["is_early_bird"] is True
    assert c_eb["has_blueprint_dom_edit"] is True

    # Enterprise
    c_ent = PlanCapabilities.get_capabilities("enterprise", "active")
    assert c_ent["seats_allowed"] == 9999
    assert c_ent["projects_allowed"] == 9999
    assert c_ent["has_blueprint_dom_edit"] is True

    # None / Canceled
    c_none = PlanCapabilities.get_capabilities("none", "none")
    assert c_none["seats_allowed"] == 1
    assert c_none["projects_allowed"] == 0
    assert c_none["can_create_projects"] is False
    assert c_none["has_blueprint_dom_edit"] is False


@pytest.mark.asyncio
async def test_past_due_grace_period_and_expiration():
    now = datetime.now(timezone.utc)
    
    # 1 day ago past_due -> active warning
    c_warn = PlanCapabilities.get_capabilities("dev_team", "past_due", past_due_since=now - timedelta(days=1))
    assert c_warn["is_past_due_warning"] is True
    assert c_warn["has_blueprint_dom_edit"] is True
    assert c_warn["projects_allowed"] == 10

    # 4 days ago past_due -> expired grace period -> treated as canceled / none
    c_expired = PlanCapabilities.get_capabilities("dev_team", "past_due", past_due_since=now - timedelta(days=4))
    assert c_expired["is_past_due_warning"] is False
    assert c_expired["status"] == "canceled"
    assert c_expired["projects_allowed"] == 0
    assert c_expired["has_blueprint_dom_edit"] is False


@pytest.mark.asyncio
async def test_downgrade_archiving_and_resolution_cache():
    test_engine = create_async_engine(DATABASE_URL, poolclass=NullPool)
    TestSessionLocal = sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        from sqlalchemy import text
        await conn.execute(text("ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS past_due_since TIMESTAMPTZ;"))
        await conn.execute(text("ALTER TABLE projects ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'active';"))

    async with TestSessionLocal() as db_session:
        uid = str(uuid.uuid4())[:8]
        target_org_id = str(uuid.uuid4())
        org = Organization(id=target_org_id, name=f"Test Org {uid}", slug=f"test-org-{uid}")
        db_session.add(org)
        await db_session.commit()

        # Dev Team Subscription (10 projects)
        sub = SubscriptionModel(
            id=str(uuid.uuid4()),
            org_id=target_org_id,
            plan_type="dev_team",
            status="active",
            seats_allowed=5,
            projects_allowed=10
        )
        db_session.add(sub)
        await db_session.commit()

        # Add 7 projects
        for i in range(7):
            p = Project(id=str(uuid.uuid4()), name=f"Project {i}", org_id=target_org_id)
            db_session.add(p)
        await db_session.commit()

        # Initial resolution (dev_team)
        plan1 = await resolve_org_plan(target_org_id, db_session)
        assert plan1["plan_type"] == "dev_team"
        assert plan1["projects_used"] == 7

        # Downgrade to None / Canceled (0 projects max)
        sub.plan_type = "none"
        sub.status = "canceled"
        sub.projects_allowed = 0
        sub.seats_allowed = 1
        await db_session.commit()

        # Invalidate cache
        invalidate_org_plan_cache(target_org_id)

        # Resolve after downgrade
        plan2 = await resolve_org_plan(target_org_id, db_session)
        assert plan2["plan_type"] == "none"
        assert plan2["projects_allowed"] == 0
        # 0 active projects, 7 archived_over_limit
        assert plan2["projects_used"] == 0
        assert plan2["can_create_projects"] is False

        # Attempt project creation under none plan must raise SUBSCRIPTION_REQUIRED
        try:
            await check_project_limit(target_org_id, db_session)
            assert False, "Should have raised SUBSCRIPTION_REQUIRED"
        except HTTPException as exc:
            assert exc.status_code == 403
            assert exc.detail["code"] == "SUBSCRIPTION_REQUIRED"

    await test_engine.dispose()
