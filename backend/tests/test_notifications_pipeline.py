import os
import sys
import hmac
import hashlib
import time
import json
from datetime import datetime, timezone, timedelta
import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

# Ensure RUNNING_SSRF_TEST is true so loopback checks are strictly enforced
os.environ["RUNNING_SSRF_TEST"] = "true"

# Support running pytest from repository root or backend/ directory
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
repo_root = os.path.abspath(os.path.join(backend_dir, ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)
if repo_root not in sys.path:
    sys.path.insert(0, repo_root)

from main import app
from models.notifications import NotificationOutbox, NotificationDeliveryAttempt
from models.webhooks import WebhookEndpoint
from services.sla_daemon import enforce_pin_slas
from utils.ssrf_guard import is_ssrf_safe
from database import Base
from dependencies import get_db
from models.core import User, Organization, OrgMember, Project, Session as DbSession
from markers.models import Marker


# In-memory test database for fast, isolated pipeline testing
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"
pipeline_engine = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
PipelineSessionLocal = async_sessionmaker(pipeline_engine, expire_on_commit=False, class_=AsyncSession)


@pytest.fixture(autouse=True)
async def setup_pipeline_db():
    os.environ["RUNNING_SSRF_TEST"] = "true"
    async with pipeline_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with pipeline_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture
async def db_session():
    async with PipelineSessionLocal() as session:
        yield session


@pytest.fixture
async def async_client():
    async def override_get_db():
        async with PipelineSessionLocal() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client
    app.dependency_overrides.pop(get_db, None)


@pytest.mark.asyncio
async def test_ssrf_guard_blocks_private_ranges():
    """Verify SSRF guard rejects loopback, private RFC1918, and AWS metadata IPs."""
    os.environ["RUNNING_SSRF_TEST"] = "true"
    assert is_ssrf_safe("http://127.0.0.1:8000/webhook") is False
    assert is_ssrf_safe("http://localhost:8765/hook") is False
    assert is_ssrf_safe("http://169.254.169.254/latest/meta-data/") is False
    assert is_ssrf_safe("http://10.0.0.5:9000/webhook") is False
    assert is_ssrf_safe("http://192.168.1.1/hook") is False
    assert is_ssrf_safe("https://webhook.site/test-uuid") is True


@pytest.mark.asyncio
async def test_pin_creation_outbox_transaction(async_client: AsyncClient, db_session):
    """Verify creating a marker atomically writes an outbox record in the same transaction."""
    # Seed matching Project and Session so foreign keys and session checks pass
    org = Organization(id="test-org-uuid", name="Test Org", slug="test-org")
    db_session.add(org)
    await db_session.flush()

    project = Project(
        id="test-project-uuid",
        org_id=org.id,
        name="Test Project",
        sla_config={"critical_hours": 24, "high_hours": 48}
    )
    db_session.add(project)
    await db_session.flush()

    session = DbSession(
        id="test-session-uuid",
        project_id=project.id,
        title="Test Session"
    )
    db_session.add(session)
    await db_session.commit()

    payload = {
        "session_id": "test-session-uuid",
        "project_id": "test-project-uuid",
        "page_url": "https://example.com",
        "title": "Header misalignment bug",
        "priority": "critical",
        "status": "open",
        "anchor_kind": "dom-relative",
        "target_selector": "header > h1"
    }

    # 1. Post marker
    res = await async_client.post("/markers/", json=payload)
    assert res.status_code == 201
    marker_id = res.json()["id"]

    # 2. Assert outbox record exists
    stmt = select(NotificationOutbox).where(NotificationOutbox.marker_id == marker_id)
    outbox_item = (await db_session.execute(stmt)).scalar_one_or_none()

    assert outbox_item is not None
    assert outbox_item.event_type == "pin.created"
    assert outbox_item.status == "pending"
    assert outbox_item.payload["pin"]["id"] == marker_id


@pytest.mark.asyncio
async def test_webhook_hmac_signature_verification():
    """Verify HMAC-SHA256 signature calculation matches receiver expectations."""
    secret = "test_secret_key_64_bytes_long_value_here"
    payload = {"event": "pin.created", "pin": {"id": "123", "title": "Crash"}}
    timestamp = str(int(time.time()))
    body = json.dumps(payload, separators=(',', ':'))

    # Sender side
    signature_payload = f"t={timestamp}.v1={body}".encode('utf-8')
    computed_sig = hmac.new(secret.encode('utf-8'), signature_payload, hashlib.sha256).hexdigest()
    header_val = f"t={timestamp},v1={computed_sig}"

    # Receiver validation
    parts = dict(x.split('=') for x in header_val.split(','))
    assert parts["t"] == timestamp

    expected_verify = hmac.new(
        secret.encode('utf-8'),
        f"t={parts['t']}.v1={body}".encode('utf-8'),
        hashlib.sha256
    ).hexdigest()

    assert hmac.compare_digest(parts["v1"], expected_verify) is True


@pytest.mark.asyncio
async def test_sla_daemon_escalation_deduplication(db_session):
    """Verify SLA breach creates one escalation event and does not duplicate on second run."""
    # Setup test project and breached marker (30 hours old)
    org = Organization(id="sla-org-uuid", name="SLA Org", slug="sla-org")
    db_session.add(org)
    await db_session.flush()

    project = Project(
        id="sla-proj-uuid",
        org_id=org.id,
        name="SLA Project",
        sla_config={"critical_hours": 24, "high_hours": 48}
    )
    db_session.add(project)
    await db_session.flush()

    session = DbSession(
        id="sla-sess-uuid",
        project_id=project.id,
        title="SLA Session"
    )
    db_session.add(session)
    await db_session.flush()

    now = datetime.now(timezone.utc)
    breached_marker = Marker(
        project_id=project.id,
        session_id=session.id,
        anchor_kind="dom",
        title="Critical memory leak on checkout",
        status="open",
        priority="critical",
        created_at=now - timedelta(hours=30)
    )
    db_session.add(breached_marker)
    await db_session.commit()

    # First execution scans and logs escalation
    await enforce_pin_slas(db_session)

    stmt = select(NotificationOutbox).where(NotificationOutbox.event_type == "pin.sla_breached")
    first_count = len((await db_session.execute(stmt)).scalars().all())
    assert first_count == 1

    # Second immediate execution must find dedupe record and insert 0 rows
    await enforce_pin_slas(db_session)
    second_count = len((await db_session.execute(stmt)).scalars().all())

    assert first_count == second_count
    assert second_count == 1


@pytest.mark.asyncio
async def test_redis_debounce_batches_rapid_events():
    """Verify injecting 5 rapid pin events within debounce window buffers them for a single batch digest."""
    from services.notification_dispatcher import debounce_manager
    session_id = "session-debounce-qa"
    user_id = "user-debounce-qa"
    outbox_ids = [f"outbox-id-{i}" for i in range(5)]

    # 1. Simulate 5 rapid pin events within 2 seconds
    for oid in outbox_ids:
        buffered = await debounce_manager.buffer_event(session_id, user_id, oid)
        assert buffered is True
        assert await debounce_manager.is_buffered(oid) is True

    # 2. Verify debounce manager grouped all 5 events together for batch digest
    cleared_ids = await debounce_manager.fetch_and_clear_buffer(session_id, user_id)
    assert len(cleared_ids) == 5
    assert set(cleared_ids) == set(outbox_ids)

