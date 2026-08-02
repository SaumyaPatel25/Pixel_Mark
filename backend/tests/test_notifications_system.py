import sys
import os
import pytest
import uuid
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import StaticPool
from sqlalchemy import select

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from database import Base
from models import User, Project, Session as DbSession, NotificationEventModel, NotificationPreferencesModel, SubscriptionModel
from services.notification_service import (
    emit_session_notification, emit_blueprint_notification,
    get_or_create_preferences
)
from services.plan_capabilities import invalidate_org_plan_cache

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
async def test_session_notification_emission():
    async with TestingSessionLocal() as db_session:
        user_id = str(uuid.uuid4())
        project_id = str(uuid.uuid4())
        session_id = str(uuid.uuid4())

        proj = Project(id=project_id, org_id="org_free_123", name="Session Test Project", url="https://example.com")
        db_session.add(proj)
        sess = DbSession(id=session_id, project_id=project_id, title="Test Session")
        db_session.add(sess)
        await db_session.commit()

        # Emit session event
        event = await emit_session_notification(
            db=db_session,
            session_id=session_id,
            event_type="marker_created",
            entity_type="marker",
            entity_id="marker_1",
            title="Test Pin Added",
            body="A test pin was created on the session.",
            project_id=project_id,
            user_id=user_id
        )

        assert event is not None
        assert event.source_type == "session"
        assert event.event_type == "marker_created"
        assert event.title == "Test Pin Added"

        res = await db_session.execute(
            select(NotificationEventModel).where(NotificationEventModel.id == event.id)
        )
        saved = res.scalar_one_or_none()
        assert saved is not None
        assert saved.event_type == "marker_created"


@pytest.mark.asyncio
async def test_free_org_blueprint_notification_skipped():
    async with TestingSessionLocal() as db_session:
        project_id = str(uuid.uuid4())
        org_id = f"org_free_{uuid.uuid4().hex[:6]}"
        proj = Project(id=project_id, org_id=org_id, name="Free Org Project", url="https://example.com")
        db_session.add(proj)
        await db_session.commit()

        invalidate_org_plan_cache(org_id)

        # Attempt emitting Blueprint event for free org (no Blueprint entitlement)
        event = await emit_blueprint_notification(
            db=db_session,
            project_id=project_id,
            event_type="blueprint_edit_saved",
            entity_type="edit",
            entity_id="edit_1",
            title="Blueprint Edits Saved",
            body="Saved 2 mutations.",
            user_id="user_free_1"
        )

        # Must return None and skip silently without raising error
        assert event is None


@pytest.mark.asyncio
async def test_paid_org_blueprint_notification_emitted():
    async with TestingSessionLocal() as db_session:
        project_id = str(uuid.uuid4())
        org_id = f"org_paid_{uuid.uuid4().hex[:6]}"
        proj = Project(id=project_id, org_id=org_id, name="Paid Org Project", url="https://example.com")
        db_session.add(proj)

        sub = SubscriptionModel(
            id=str(uuid.uuid4()),
            org_id=org_id,
            plan_type="dev_team",
            status="active",
            seats_allowed=5,
            projects_allowed=10
        )
        db_session.add(sub)
        await db_session.commit()

        invalidate_org_plan_cache(org_id)

        # Attempt emitting Blueprint event for paid org with Blueprint entitlement
        event = await emit_blueprint_notification(
            db=db_session,
            project_id=project_id,
            event_type="blueprint_edit_saved",
            entity_type="edit",
            entity_id="edit_1",
            title="Blueprint Edits Saved",
            body="Saved 2 mutations.",
            user_id="user_paid_1"
        )

        assert event is not None
        assert event.source_type == "blueprint"
        assert event.event_type == "blueprint_edit_saved"


@pytest.mark.asyncio
async def test_notification_preferences_toggles():
    async with TestingSessionLocal() as db_session:
        user_id = str(uuid.uuid4())
        project_id = str(uuid.uuid4())

        pref = await get_or_create_preferences(db_session, user_id, project_id)
        assert pref.in_app_enabled is True
        assert pref.email_enabled is True
        assert pref.allow_session_events is True
        assert pref.allow_blueprint_events is True

        # Disable session events
        pref.allow_session_events = False
        await db_session.commit()

        event = await emit_session_notification(
            db=db_session,
            session_id=str(uuid.uuid4()),
            event_type="marker_created",
            entity_type="marker",
            entity_id="marker_disabled",
            title="Disabled Event",
            body="Should be skipped",
            project_id=project_id,
            user_id=user_id
        )

        # Should skip due to user preference
        assert event is None
