"""
backend/tests/test_notification_preferences.py

QA Verification Script: Testing Fallback Hierarchy from Project-Specific to Global Settings
"""

import os
import sys
import uuid
import pytest
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.pool import StaticPool

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from database import Base
from models.core import User, Organization, OrgMember, Project
from models.notifications import NotificationPreference
from services.notification_service import (
    DEFAULT_NOTIFICATION_PREFERENCES,
    resolve_user_notification_preferences,
    emit_pin_event,
)

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"
engine = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


@pytest.fixture(autouse=True)
async def setup_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_preference_resolution_fallback_hierarchy():
    """
    Verifies that preference resolution strictly obeys:
    Project Override -> Global Default -> System Platform Defaults
    """
    async with TestingSessionLocal() as session:
        user_id = str(uuid.uuid4())
        proj_alpha = str(uuid.uuid4())
        proj_beta = str(uuid.uuid4())

        # Step 1: No preferences recorded -> Should resolve to system defaults
        default_res = await resolve_user_notification_preferences(session, user_id=user_id, project_id=proj_alpha)
        assert default_res["in_app_enabled"] is True
        assert default_res["email_enabled"] is True
        assert default_res["email_frequency"] == "digest_15m"
        assert default_res["notify_on_all_pins"] is False
        assert default_res["notify_on_assigned"] is True
        assert default_res["notify_on_mentions"] is True
        assert default_res["notify_on_status_change"] is True

        # Step 2: Set Global user preference (email_frequency='immediate', in_app_enabled=True)
        global_pref = NotificationPreference(
            id=str(uuid.uuid4()),
            user_id=user_id,
            project_id=None,
            in_app_enabled=True,
            email_enabled=True,
            email_frequency="immediate",
            notify_on_all_pins=True,
            notify_on_assigned=True,
            notify_on_mentions=True,
            notify_on_status_change=True,
        )
        session.add(global_pref)
        await session.commit()

        # Both projects should inherit global preference
        alpha_res = await resolve_user_notification_preferences(session, user_id=user_id, project_id=proj_alpha)
        assert alpha_res["email_frequency"] == "immediate"
        assert alpha_res["notify_on_all_pins"] is True

        beta_res = await resolve_user_notification_preferences(session, user_id=user_id, project_id=proj_beta)
        assert beta_res["email_frequency"] == "immediate"

        # Step 3: Set Project-Specific override on proj_alpha (email_frequency='off')
        alpha_override = NotificationPreference(
            id=str(uuid.uuid4()),
            user_id=user_id,
            project_id=proj_alpha,
            in_app_enabled=False,
            email_enabled=False,
            email_frequency="off",
            notify_on_all_pins=False,
            notify_on_assigned=False,
            notify_on_mentions=True,
            notify_on_status_change=False,
        )
        session.add(alpha_override)
        await session.commit()

        # Proj Alpha must resolve to its override (frequency='off', in_app=False)
        alpha_override_res = await resolve_user_notification_preferences(session, user_id=user_id, project_id=proj_alpha)
        assert alpha_override_res["email_frequency"] == "off"
        assert alpha_override_res["email_enabled"] is False
        assert alpha_override_res["in_app_enabled"] is False

        # Proj Beta must continue falling back to the Global default (frequency='immediate', in_app=True)
        beta_fallback_res = await resolve_user_notification_preferences(session, user_id=user_id, project_id=proj_beta)
        assert beta_fallback_res["email_frequency"] == "immediate"
        assert beta_fallback_res["email_enabled"] is True
        assert beta_fallback_res["in_app_enabled"] is True


@pytest.mark.asyncio
async def test_emit_pin_skips_queuing_when_frequency_is_off():
    """
    Verifies that when email_frequency == 'off', emit_pin_event skips outbox record creation.
    """
    async with TestingSessionLocal() as session:
        user_id = str(uuid.uuid4())
        proj_id = str(uuid.uuid4())

        # Configure user to have email_frequency = 'off'
        pref = NotificationPreference(
            id=str(uuid.uuid4()),
            user_id=user_id,
            project_id=proj_id,
            in_app_enabled=True,
            email_enabled=True,
            email_frequency="off",
        )
        session.add(pref)
        await session.commit()

        # Emit pin event
        outbox = await emit_pin_event(
            db=session,
            event_type="pin.created",
            marker={"id": "marker_1", "title": "Test Pin"},
            session_id=str(uuid.uuid4()),
            project_id=proj_id,
            actor_id=user_id,
            actor_role="member",
        )

        # When frequency is 'off', outbox queuing is skipped
        assert outbox is None
