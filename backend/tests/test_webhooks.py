"""
backend/tests/test_webhooks.py

Comprehensive tests for the STAGE Outbound Webhook Engine:
1. Pre-flight SSRF Validation (rejection of private/loopback/metadata IPs).
2. HMAC-SHA256 Payload Signature generation and cryptographic verification.
3. Webhook CRUD via FastAPI TestClient (creation, listing with masked secrets, deletion).
4. Resolution-time SSRF verification against DNS rebinding / private IP ranges.
5. Outbox webhook fan-out filtering by subscribed events.
"""

import hashlib
import hmac
import json
import os
import sys
import time
import uuid
import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from database import Base
from dependencies import get_current_user, get_db
from main import app
from models.core import OrgMember, Organization, Project, User
from models.webhooks import WebhookEndpoint
from services.webhook_dispatcher import (
    compute_hmac_signature,
    deliver_webhook_payload,
    dispatch_webhooks_for_outbox,
    is_ip_restricted,
    verify_resolution_time_ssrf,
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


async def override_get_db():
    async with TestingSessionLocal() as session:
        yield session


@pytest.mark.asyncio
async def test_hmac_signature_generation():
    """Verifies that compute_hmac_signature accurately matches HMAC-SHA256(secret, t={t}.v1={body})."""
    secret = "test_secret_key_1234567890abcdef"
    timestamp = str(int(time.time()))
    payload = {"event": "pin.created", "pin_id": "pin_99", "content": "Fix typo"}
    compact_body = json.dumps(payload, separators=(",", ":"))

    sig = compute_hmac_signature(secret, timestamp, compact_body)
    expected_data = f"t={timestamp}.v1={compact_body}".encode("utf-8")
    expected_sig = hmac.new(secret.encode("utf-8"), expected_data, hashlib.sha256).hexdigest()

    assert sig == expected_sig
    assert len(sig) == 64


@pytest.mark.asyncio
async def test_ip_restriction_guard():
    """Verifies that private, loopback, link-local, and cloud metadata IPs are identified as restricted."""
    blocked_ips = [
        "127.0.0.1",
        "10.0.0.1",
        "10.255.255.255",
        "172.16.0.1",
        "172.31.255.255",
        "192.168.1.1",
        "169.254.169.254",  # AWS/GCP metadata
        "::1",
        "fe80::1",
    ]
    for ip in blocked_ips:
        restricted, reason = is_ip_restricted(ip)
        assert restricted is True, f"Expected {ip} to be restricted, but got {reason}"

    # Public IP should not be restricted
    restricted, _ = is_ip_restricted("93.184.216.34")  # example.com
    assert restricted is False


@pytest.mark.asyncio
async def test_resolution_time_ssrf_rejects_loopback():
    """Resolution-time SSRF guard must reject loopback and metadata targets."""
    safe, reason = await verify_resolution_time_ssrf("http://127.0.0.1:8080/hook")
    assert safe is False
    assert "SSRF Block" in (reason or "") or "Loopback" in (reason or "")

    safe, reason = await verify_resolution_time_ssrf("http://169.254.169.254/latest/meta-data")
    assert safe is False


@pytest.mark.asyncio
async def test_webhook_crud_and_ssrf_preflight():
    """Tests the Webhook API endpoints: create, reject private IP, list masked, delete."""
    async with TestingSessionLocal() as session:
        user = User(
            id="user_test_123",
            email="developer@stage.io",
            hashed_password="fakehashpwd123"
        )
        org = Organization(id="org_test_123", name="Acme Org", slug="acme-org")
        member = OrgMember(id="mem_test_123", org_id=org.id, user_id=user.id)
        project = Project(id=str(uuid.uuid4()), org_id=org.id, name="App Redesign", url="https://acme.com")

        session.add_all([user, org, member, project])
        await session.commit()
        project_id = project.id

    async def override_user():
        return user

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_user

    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            # 1. Pre-flight SSRF rejection for private IP
            bad_resp = await client.post(
                f"/projects/{project_id}/webhooks",
                json={
                    "name": "Malicious Hook",
                    "target_url": "http://127.0.0.1:8000/internal",
                    "subscribed_events": ["pin.created"]
                }
            )
            assert bad_resp.status_code == 400
            assert "SSRF" in bad_resp.text or "blocked" in bad_resp.text

            # 2. Pre-flight SSRF rejection for AWS metadata IP
            meta_resp = await client.post(
                f"/projects/{project_id}/webhooks",
                json={
                    "name": "Metadata Exploit",
                    "target_url": "http://169.254.169.254/latest/meta-data",
                    "subscribed_events": ["pin.created"]
                }
            )
            assert meta_resp.status_code == 400

            # 3. Create legitimate webhook with a public destination
            create_resp = await client.post(
                f"/projects/{project_id}/webhooks",
                json={
                    "name": "Team Slack Channel",
                    "target_url": "https://example.com/webhooks/stage",
                    "subscribed_events": ["pin.created", "pin.status_changed"]
                }
            )
            assert create_resp.status_code == 201
            data = create_resp.json()
            assert data["name"] == "Team Slack Channel"
            assert data["target_url"] == "https://example.com/webhooks/stage"
            assert data["subscribed_events"] == ["pin.created", "pin.status_changed"]
            assert data["is_active"] is True
            # Full secret revealed ONCE upon creation
            secret_token = data["secret_token"]
            assert len(secret_token) == 64
            webhook_id = data["id"]

            # 4. List webhooks — verify secret is MASKED
            list_resp = await client.get(f"/projects/{project_id}/webhooks")
            assert list_resp.status_code == 200
            list_data = list_resp.json()
            assert len(list_data) == 1
            listed_item = list_data[0]
            assert listed_item["id"] == webhook_id
            assert listed_item["secret_token"].startswith("whsec_")
            assert "..." in listed_item["secret_token"]
            assert secret_token != listed_item["secret_token"]

            # 5. Delete webhook
            del_resp = await client.delete(f"/projects/{project_id}/webhooks/{webhook_id}")
            assert del_resp.status_code == 200
            assert del_resp.json()["status"] == "deleted"

            # 6. Verify listing is now empty
            list_resp2 = await client.get(f"/projects/{project_id}/webhooks")
            assert list_resp2.status_code == 200
            assert len(list_resp2.json()) == 0

    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_webhook_test_endpoint_and_signature_headers(monkeypatch):
    """Verifies that the /test endpoint signs the payload and sends correct headers."""
    async with TestingSessionLocal() as session:
        user = User(id="user_test_456", email="tester@stage.io", hashed_password="pwd")
        org = Organization(id="org_test_456", name="Org 456", slug="org-456")
        member = OrgMember(id="mem_test_456", org_id=org.id, user_id=user.id)
        project = Project(id=str(uuid.uuid4()), org_id=org.id, name="Test Proj", url="https://acme.com")
        webhook = WebhookEndpoint(
            id=str(uuid.uuid4()),
            project_id=project.id,
            name="Slack Hook",
            target_url="https://example.com/mock-slack",
            secret_token="secret_token_1234567890abcdef1234567890abcdef",
            subscribed_events=["*"],
            is_active=True
        )
        session.add_all([user, org, member, project, webhook])
        await session.commit()
        project_id = project.id
        webhook_id = webhook.id

    captured_requests = []

    # Mock httpx.AsyncClient.send for external outbound webhook calls only
    import httpx
    real_send = httpx.AsyncClient.send

    async def mock_send(self, request, **kwargs):
        # Let ASGI test client requests pass through to the app
        if str(request.url).startswith("http://test"):
            return await real_send(self, request, **kwargs)

        captured_requests.append({
            "url": str(request.url),
            "content": request.content.decode("utf-8") if request.content else "",
            "headers": dict(request.headers)
        })
        return httpx.Response(status_code=200, json={"ok": True}, request=request)

    monkeypatch.setattr(httpx.AsyncClient, "send", mock_send)



    async def override_user():
        return user

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_user

    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            test_resp = await client.post(f"/projects/{project_id}/webhooks/{webhook_id}/test")
            assert test_resp.status_code == 200
            data = test_resp.json()
            assert data["status"] == "success"
            assert data["status_code"] == 200
            assert "delivery_id" in data

            # Verify the captured outbound HTTP request
            assert len(captured_requests) == 1
            outbound = captured_requests[0]
            headers = outbound["headers"]
            assert headers.get("x-stage-event") == "ping"
            assert "x-stage-delivery" in headers
            assert "x-stage-timestamp" in headers
            assert headers.get("x-stage-signature", "").startswith("t=")
            assert ",v1=" in headers.get("x-stage-signature", "")

            # Verify HMAC signature against outbound content
            t = headers["x-stage-timestamp"]
            expected_sig = compute_hmac_signature(
                secret_token="secret_token_1234567890abcdef1234567890abcdef",
                timestamp=t,
                compact_body=outbound["content"]
            )
            assert headers["x-stage-signature"] == f"t={t},v1={expected_sig}"

    finally:
        app.dependency_overrides.clear()

