import pytest
import asyncio
from datetime import datetime, timezone, timedelta
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from database import Base
from models.core import User, Organization, OrgMember, Project, Session as DbSession, RoleEnum
from models.notifications import NotificationOutbox
from markers.models import Marker
from markers.contracts import MarkerStatus, MarkerPriority
from services.sla_daemon import (
    resolve_sla_threshold,
    enforce_pin_slas,
    render_sla_breach_email,
    DEFAULT_CRITICAL_HOURS,
    DEFAULT_HIGH_HOURS
)

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"
test_engine = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = async_sessionmaker(test_engine, expire_on_commit=False, class_=AsyncSession)


@pytest.fixture(autouse=True)
async def prepare_db():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


def test_resolve_sla_threshold():
    # Defaults
    assert resolve_sla_threshold(None, "critical") == 24
    assert resolve_sla_threshold(None, "high") == 48
    assert resolve_sla_threshold({}, "critical") == 24

    # Custom with _hours suffix
    custom_cfg = {"critical_hours": 12, "high_hours": 36}
    assert resolve_sla_threshold(custom_cfg, "critical") == 12
    assert resolve_sla_threshold(custom_cfg, "high") == 36

    # Custom plain priority key
    custom_plain = {"critical": 8, "high": 16}
    assert resolve_sla_threshold(custom_plain, "critical") == 8
    assert resolve_sla_threshold(custom_plain, "high") == 16


@pytest.mark.asyncio
async def test_enforce_pin_slas_detection_and_idempotency():
    async with TestingSessionLocal() as db:
        # Setup Org & Owner
        org = Organization(name="SLA Test Org", slug="sla-test-org")
        db.add(org)
        await db.flush()

        owner = User(email="owner@stage.io", name="Project Owner", hashed_password="fakehash")
        db.add(owner)
        await db.flush()

        org_member = OrgMember(org_id=org.id, user_id=owner.id, role="owner")
        db.add(org_member)

        # Setup Project with default SLA
        project = Project(
            org_id=org.id,
            name="SLA Demo Project",
            sla_config={"critical_hours": 24, "high_hours": 48}
        )
        db.add(project)
        await db.flush()

        session = DbSession(project_id=project.id, title="Test Audit Session")
        db.add(session)
        await db.flush()

        now = datetime.now(timezone.utc)

        # Pin 1: Open Critical, created 26 hours ago (BREACHED)
        breached_critical = Marker(
            project_id=project.id,
            session_id=session.id,
            anchor_kind="dom",
            title="Payment checkout broken",
            description="Button crashes on submit",
            status="open",
            priority="critical",
            target_selector="#checkout-btn",
            page_url="https://app.stage.io/cart",
            creator_id=owner.id,
            creator_name="QA Lead",
            created_at=now - timedelta(hours=26)
        )

        # Pin 2: Open High, created 20 hours ago (NOT BREACHED, threshold is 48h)
        safe_high = Marker(
            project_id=project.id,
            session_id=session.id,
            anchor_kind="dom",
            title="Typo in footer",
            status="open",
            priority="high",
            created_at=now - timedelta(hours=20)
        )

        # Pin 3: Resolved Critical, created 50 hours ago (RESOLVED, ignored)
        resolved_critical = Marker(
            project_id=project.id,
            session_id=session.id,
            anchor_kind="dom",
            title="Old critical bug",
            status="resolved",
            priority="critical",
            created_at=now - timedelta(hours=50)
        )

        db.add_all([breached_critical, safe_high, resolved_critical])
        await db.commit()

        # Run 1: Should detect Pin 1 breach
        new_records = await enforce_pin_slas(db)
        assert len(new_records) == 1
        record = new_records[0]
        assert record.event_type == "pin.sla_breached"
        assert record.marker_id == breached_critical.id
        assert record.actor_id == owner.id
        assert record.status == "pending"
        assert record.payload["event"] == "pin.sla_breached"
        assert record.payload["hours_elapsed"] >= 26
        assert record.payload["pin"]["title"] == "Payment checkout broken"

        # Run 2: Idempotency check -> 0 new records
        subsequent_records = await enforce_pin_slas(db)
        assert len(subsequent_records) == 0

        # Total in DB should still be exactly 1
        total_stmt = select(NotificationOutbox).where(NotificationOutbox.event_type == "pin.sla_breached")
        total_res = await db.execute(total_stmt)
        all_outbox = total_res.scalars().all()
        assert len(all_outbox) == 1

        # Test Template Renderer
        subject, html, plain = render_sla_breach_email(record, session.title, "https://app.stage.io/review")
        assert "🚨 STAGE Escalation: Critical Pin Unresolved for" in subject
        assert "Payment checkout broken" in html
        assert "#checkout-btn" in html
        assert "https://app.stage.io/review" in html


@pytest.mark.asyncio
async def test_reopened_marker_allows_re_escalation():
    """
    Guarantees that an SLA breach is only notified ONCE,
    UNLESS the pin is resolved and reopened later.
    """
    async with TestingSessionLocal() as db:
        org = Organization(name="Reopen Org", slug="reopen-org")
        db.add(org)
        await db.flush()

        owner = User(email="reopen_owner@stage.io", name="Reopen Owner", hashed_password="fakehash")
        db.add(owner)
        await db.flush()

        org_member = OrgMember(org_id=org.id, user_id=owner.id, role="owner")
        db.add(org_member)

        project = Project(
            org_id=org.id,
            name="Reopen Project",
            sla_config={"critical_hours": 24}
        )
        db.add(project)
        await db.flush()

        session = DbSession(project_id=project.id, title="Reopen Audit")
        db.add(session)
        await db.flush()

        now = datetime.now(timezone.utc)

        # Pin created 30h ago
        marker = Marker(
            project_id=project.id,
            session_id=session.id,
            anchor_kind="dom",
            title="Navbar missing on mobile",
            status="open",
            priority="critical",
            created_at=now - timedelta(hours=30)
        )
        db.add(marker)
        await db.commit()

        # Step 1: First SLA check triggers escalation
        escalations_1 = await enforce_pin_slas(db)
        assert len(escalations_1) == 1

        # Step 2: Immediate re-check -> no duplicate
        escalations_2 = await enforce_pin_slas(db)
        assert len(escalations_2) == 0

        # Step 3: Pin gets resolved, then reopened later
        marker.status = "open"
        # Simulate updated_at after resolution & reopen (e.g. 1 minute later)
        marker.updated_at = datetime.now(timezone.utc) + timedelta(minutes=1)
        await db.commit()

        # Step 4: After reopen, daemon allows a new escalation
        escalations_3 = await enforce_pin_slas(db)
        assert len(escalations_3) == 1
        assert escalations_3[0].marker_id == marker.id
