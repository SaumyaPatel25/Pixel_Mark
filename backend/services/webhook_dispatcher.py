"""
backend/services/webhook_dispatcher.py

Outbound Webhook Dispatcher for STAGE.
Handles cryptographic payload signing (HMAC-SHA256), resolution-time SSRF guards,
asynchronous event fan-out, and auto-disabling flaky endpoints.
"""

import asyncio
import hashlib
import hmac
import ipaddress
import json
import logging
import socket
import time
import urllib.parse
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

import httpx
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from database import AsyncSessionLocal
from models.webhooks import WebhookEndpoint

logger = logging.getLogger("stage.webhook_dispatcher")

# Security and Timeout Constants
MAX_CONSECUTIVE_FAILURES = 10
CONNECT_TIMEOUT_SECONDS = 5.0
READ_TIMEOUT_SECONDS = 10.0


def is_ip_restricted(ip_str: str) -> Tuple[bool, str]:
    """
    Checks whether an IP address belongs to private, loopback, link-local,
    multicast, or cloud metadata ranges.
    """
    try:
        ip = ipaddress.ip_address(ip_str)
        if ip.is_private:
            return True, f"Private IP address ({ip_str}) is prohibited"
        if ip.is_loopback:
            return True, f"Loopback IP address ({ip_str}) is prohibited"
        if ip.is_link_local:
            return True, f"Link-local IP address ({ip_str}) is prohibited"
        if ip.is_multicast:
            return True, f"Multicast IP address ({ip_str}) is prohibited"
        if ip.is_reserved:
            return True, f"Reserved IP address ({ip_str}) is prohibited"
        if ip.is_unspecified:
            return True, f"Unspecified IP address ({ip_str}) is prohibited"
        # Explicit Cloud Metadata check (AWS/GCP/Azure link-local: 169.254.169.254)
        if str(ip) == "169.254.169.254":
            return True, "Cloud metadata service IP is prohibited"
        return False, ""
    except ValueError:
        return True, f"Invalid IP address format: {ip_str}"


async def verify_resolution_time_ssrf(target_url: str) -> Tuple[bool, Optional[str]]:
    """
    Re-resolves the target hostname immediately before connecting to prevent
    DNS Rebinding (TOCTOU) and SSRF attacks.
    """
    try:
        parsed = urllib.parse.urlparse(target_url)
        if parsed.scheme not in ("http", "https"):
            return False, f"Unsupported scheme: {parsed.scheme}"
        hostname = parsed.hostname
        if not hostname:
            return False, "Target URL is missing a valid hostname"

        clean_host = hostname[1:-1] if hostname.startswith("[") and hostname.endswith("]") else hostname

        # Asynchronously resolve DNS to prevent event loop blocking
        loop = asyncio.get_running_loop()
        addr_info = await loop.run_in_executor(None, lambda: socket.getaddrinfo(clean_host, None))
        if not addr_info:
            return False, f"DNS resolution yielded no address records for host {clean_host}"

        for family, socktype, proto, canonname, sockaddr in addr_info:
            ip_str = sockaddr[0]
            restricted, reason = is_ip_restricted(ip_str)
            if restricted:
                logger.warning(f"[Webhook SSRF Block] Target {target_url} resolved to blocked IP {ip_str}: {reason}")
                return False, f"SSRF Block: {reason}"

        return True, None
    except socket.gaierror as e:
        return False, f"DNS resolution failed: {e}"
    except Exception as e:
        return False, f"SSRF check failed with error: {e}"


def compute_hmac_signature(secret_token: str, timestamp: str, compact_body: str) -> str:
    """
    Generates an HMAC-SHA256 signature conforming to:
    HMAC-SHA256(secret_token, f"t={t}.v1={body}")
    """
    sig_payload = f"t={timestamp}.v1={compact_body}".encode("utf-8")
    key = secret_token.encode("utf-8")
    return hmac.new(key, sig_payload, hashlib.sha256).hexdigest()


async def deliver_webhook_payload(
    webhook: WebhookEndpoint,
    event_type: str,
    payload: Dict[str, Any],
    db: Optional[AsyncSession] = None
) -> Tuple[bool, Optional[int], float, Optional[str], str]:
    """
    Cryptographically signs and delivers an outbound webhook event.
    Enforces resolution-time SSRF checks, 5s connect timeout, 10s read timeout,
    and automatic deactivation after 10 consecutive failures.

    Returns:
        Tuple of (success, status_code, latency_ms, error_message, delivery_id)
    """
    delivery_id = str(uuid.uuid4())
    timestamp = str(int(time.time()))

    # 1. Pre-connect SSRF verification (anti-DNS rebinding)
    is_safe, ssrf_error = await verify_resolution_time_ssrf(webhook.target_url)
    if not is_safe:
        err_msg = f"SSRF Check Rejected: {ssrf_error}"
        await _record_failure(webhook.id, err_msg, db=db, is_security_block=True)
        return False, None, 0.0, err_msg, delivery_id

    # 2. Compact JSON serialization & HMAC signing
    compact_body = json.dumps(payload, separators=(",", ":"), ensure_ascii=False)
    hex_digest = compute_hmac_signature(webhook.secret_token, timestamp, compact_body)

    headers = {
        "Content-Type": "application/json",
        "User-Agent": "STAGE-Webhook-Dispatcher/2.0",
        "X-STAGE-Event": event_type,
        "X-STAGE-Delivery": delivery_id,
        "X-STAGE-Timestamp": timestamp,
        "X-STAGE-Signature": f"t={timestamp},v1={hex_digest}",
    }

    # 3. HTTP Delivery with strict timeouts & no open redirect following
    client_timeout = httpx.Timeout(READ_TIMEOUT_SECONDS, connect=CONNECT_TIMEOUT_SECONDS)
    start_time = time.monotonic()

    try:
        async with httpx.AsyncClient(timeout=client_timeout, follow_redirects=False) as client:
            resp = await client.post(
                webhook.target_url,
                content=compact_body.encode("utf-8"),
                headers=headers
            )
            elapsed_ms = round((time.monotonic() - start_time) * 1000, 2)

            if 200 <= resp.status_code < 300:
                await _record_success(webhook.id, db=db)
                logger.info(
                    f"[Webhook Dispatch] SUCCESS delivery={delivery_id} webhook={webhook.id} "
                    f"event={event_type} status={resp.status_code} ({elapsed_ms}ms)"
                )
                return True, resp.status_code, elapsed_ms, None, delivery_id

            # Non-2xx response
            err_msg = f"HTTP {resp.status_code}: {resp.text[:200]}"
            # Increment failure count on 5xx server errors
            if resp.status_code >= 500:
                await _record_failure(webhook.id, err_msg, db=db, is_security_block=False)
            logger.warning(
                f"[Webhook Dispatch] FAILED delivery={delivery_id} webhook={webhook.id} "
                f"event={event_type} status={resp.status_code} ({elapsed_ms}ms)"
            )
            return False, resp.status_code, elapsed_ms, err_msg, delivery_id

    except (httpx.ConnectTimeout, httpx.ReadTimeout, httpx.TimeoutException) as exc:
        elapsed_ms = round((time.monotonic() - start_time) * 1000, 2)
        err_msg = f"Timeout Error: {exc}"
        await _record_failure(webhook.id, err_msg, db=db, is_security_block=False)
        logger.warning(f"[Webhook Dispatch] TIMEOUT webhook={webhook.id}: {exc}")
        return False, None, elapsed_ms, err_msg, delivery_id

    except (httpx.ConnectError, httpx.RequestError) as exc:
        elapsed_ms = round((time.monotonic() - start_time) * 1000, 2)
        err_msg = f"Network Error: {exc}"
        await _record_failure(webhook.id, err_msg, db=db, is_security_block=False)
        logger.warning(f"[Webhook Dispatch] NETWORK ERROR webhook={webhook.id}: {exc}")
        return False, None, elapsed_ms, err_msg, delivery_id

    except Exception as exc:
        elapsed_ms = round((time.monotonic() - start_time) * 1000, 2)
        err_msg = f"Unexpected Error: {exc}"
        await _record_failure(webhook.id, err_msg, db=db, is_security_block=False)
        logger.error(f"[Webhook Dispatch] EXCEPTION webhook={webhook.id}: {exc}", exc_info=True)
        return False, None, elapsed_ms, err_msg, delivery_id


async def _record_success(webhook_id: str, db: Optional[AsyncSession] = None):
    """Resets failure count and updates last_triggered_at timestamp."""
    now = datetime.utcnow()
    stmt = (
        update(WebhookEndpoint)
        .where(WebhookEndpoint.id == webhook_id)
        .values(failure_count=0, last_triggered_at=now)
    )
    if db is not None:
        await db.execute(stmt)
        await db.commit()
    else:
        async with AsyncSessionLocal() as session:
            await session.execute(stmt)
            await session.commit()


async def _record_failure(
    webhook_id: str,
    error_msg: str,
    db: Optional[AsyncSession] = None,
    is_security_block: bool = False
):
    """
    Increments failure count and auto-disables the webhook if threshold is reached.
    """
    async def _apply(session: AsyncSession):
        res = await session.execute(select(WebhookEndpoint).where(WebhookEndpoint.id == webhook_id))
        wh = res.scalar_one_or_none()
        if not wh:
            return

        wh.failure_count += 1
        if wh.failure_count >= MAX_CONSECUTIVE_FAILURES or is_security_block:
            wh.is_active = False
            logger.warning(
                f"[Webhook] Auto-disabled endpoint {webhook_id} "
                f"(failure_count={wh.failure_count}, security_block={is_security_block}). Reason: {error_msg}"
            )
        await session.commit()

    if db is not None:
        await _apply(db)
    else:
        async with AsyncSessionLocal() as session:
            await _apply(session)


async def dispatch_webhooks_for_outbox(
    project_id: str,
    event_type: str,
    outbox_item: Optional[Any] = None,
    payload: Optional[Dict[str, Any]] = None,
):
    """
    Queries all active WebhookEndpoints matching project_id and event_type,
    and dispatches payloads asynchronously.
    """
    if not project_id:
        return

    # Build standardized payload if not explicitly provided
    if payload is None:
        data_payload = getattr(outbox_item, "payload", {}) if outbox_item else {}
        if not isinstance(data_payload, dict):
            data_payload = {"raw": str(data_payload)}

        payload = {
            "event": event_type,
            "event_id": str(getattr(outbox_item, "id", uuid.uuid4())),
            "project_id": str(project_id),
            "session_id": str(getattr(outbox_item, "session_id", "")),
            "marker_id": getattr(outbox_item, "marker_id", None),
            "actor": {
                "id": getattr(outbox_item, "actor_id", None) or getattr(outbox_item, "user_id", None),
                "role": getattr(outbox_item, "actor_role", "guest"),
            },
            "data": data_payload,
            "timestamp": datetime.utcnow().isoformat(),
        }

    try:
        async with AsyncSessionLocal() as db:
            stmt = select(WebhookEndpoint).where(
                WebhookEndpoint.project_id == project_id,
                WebhookEndpoint.is_active == True
            )
            res = await db.execute(stmt)
            endpoints = res.scalars().all()

            # Filter by subscribed events
            matching = [
                wh for wh in endpoints
                if "*" in (wh.subscribed_events or []) or event_type in (wh.subscribed_events or [])
            ]

            if not matching:
                return

            logger.info(
                f"[WebhookDispatcher] Dispatching '{event_type}' to {len(matching)} "
                f"webhook endpoint(s) for project {project_id}"
            )

            # Fan-out concurrently
            tasks = [
                deliver_webhook_payload(webhook=wh, event_type=event_type, payload=payload, db=db)
                for wh in matching
            ]
            await asyncio.gather(*tasks, return_exceptions=True)

    except Exception as exc:
        logger.error(f"[WebhookDispatcher] Error dispatching webhooks for project {project_id}: {exc}", exc_info=True)
