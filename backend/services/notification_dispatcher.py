import asyncio
import logging
import os
import time
from datetime import datetime
from typing import Dict, List, Optional, Tuple, Any

import resend
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from redis import asyncio as aioredis
from redis.exceptions import ConnectionError, TimeoutError

from config import settings
from database import AsyncSessionLocal
from models.core import NotificationOutbox, NotificationPreferencesModel, User, Session, Project
from models.notifications import NotificationDeliveryAttempt


logger = logging.getLogger("stage.notification_dispatcher")

# Configuration Constants
DEBOUNCE_WINDOW_SECONDS = int(os.environ.get("NOTIFICATION_DEBOUNCE_SECONDS", "900"))  # 15 minutes default
POLL_INTERVAL_SECONDS = int(os.environ.get("NOTIFICATION_POLL_INTERVAL", "5"))
MAX_RETRIES = 3
FROM_EMAIL = os.environ.get("RESEND_FROM_EMAIL", "STAGE <notifications@stage.io>")
APP_URL = settings.app_public_url.rstrip("/")

# Initialize Resend
if settings.resend_api_key:
    resend.api_key = settings.resend_api_key
else:
    resend.api_key = os.environ.get("RESEND_API_KEY", "")


# ---------------------------------------------------------------------------
# 1. Redis Connection & In-Memory Fallback Manager
# ---------------------------------------------------------------------------

class RedisDebounceManager:
    """
    Manages Redis debouncing, buffering, and distributed locking.
    Falls back gracefully to an in-memory dictionary if Redis is offline.
    """
    def __init__(self, redis_url: str):
        self.redis_url = redis_url
        self.pool: Optional[aioredis.ConnectionPool] = None
        self.redis: Optional[aioredis.Redis] = None
        self._connected = False
        self._last_connect_attempt = 0.0

        # In-memory fallbacks for single-instance / degraded mode
        self._mem_buffers: Dict[str, List[str]] = {}
        self._mem_locks: Dict[str, float] = {}
        self._mem_processing: set = set()
        self._mem_lock = asyncio.Lock()

    async def get_client(self) -> Optional[aioredis.Redis]:
        if self._connected and self.redis:
            return self.redis

        now = time.time()
        # Avoid retrying connection every call if Redis is down (backoff 30s)
        if now - self._last_connect_attempt < 30.0:
            return None

        self._last_connect_attempt = now
        try:
            self.pool = aioredis.ConnectionPool.from_url(
                self.redis_url,
                decode_responses=True,
                health_check_interval=30,
                socket_connect_timeout=1.0
            )
            self.redis = aioredis.Redis(connection_pool=self.pool)
            await self.redis.ping()
            self._connected = True
            logger.info("[DebounceManager] Connected to Redis for notification debouncing.")
            return self.redis
        except Exception as e:
            logger.warning(f"[DebounceManager] Redis connection failed: {e}. Running in degraded in-memory mode.")
            self.redis = None
            self._connected = False
            return None

    async def buffer_event(self, session_id: str, user_id: str, outbox_id: str) -> bool:
        """
        Pushes an outbox ID to the buffer list and initializes the debounce expiration lock.
        """
        buffer_key = f"digest:buffer:{session_id}:{user_id}"
        lock_key = f"digest:lock:{session_id}:{user_id}"
        schedule_key = "digest:scheduled_flushes"
        item_tag = f"{session_id}:{user_id}"

        r = await self.get_client()
        if r:
            try:
                # 1. Push to Redis list
                await r.rpush(buffer_key, outbox_id)
                await r.expire(buffer_key, DEBOUNCE_WINDOW_SECONDS * 4)  # Safety TTL

                # 2. Track global buffered IDs to prevent re-buffering in polling queries
                await r.sadd("digest:buffered_ids", outbox_id)

                # 3. Check or set debounce window lock
                lock_exists = await r.exists(lock_key)
                if not lock_exists:
                    flush_at = time.time() + DEBOUNCE_WINDOW_SECONDS
                    await r.set(lock_key, str(flush_at), ex=DEBOUNCE_WINDOW_SECONDS)
                    await r.zadd(schedule_key, {item_tag: flush_at})
                    logger.info(f"[Debounce] Started new {DEBOUNCE_WINDOW_SECONDS}s debounce window for {item_tag}")
                else:
                    logger.debug(f"[Debounce] Appended outbox {outbox_id} to existing debounce window for {item_tag}")
                return True
            except Exception as e:
                logger.warning(f"[DebounceManager] Redis buffer_event error: {e}. Falling back to memory.")

        # In-memory fallback
        async with self._mem_lock:
            if item_tag not in self._mem_buffers:
                self._mem_buffers[item_tag] = []
            self._mem_buffers[item_tag].append(outbox_id)

            if item_tag not in self._mem_locks:
                self._mem_locks[item_tag] = time.time() + DEBOUNCE_WINDOW_SECONDS
                logger.info(f"[Debounce-Mem] Started in-memory debounce window for {item_tag}")
        return True

    async def is_buffered(self, outbox_id: str) -> bool:
        """Checks if an outbox record is already buffered."""
        r = await self.get_client()
        if r:
            try:
                return bool(await r.sismember("digest:buffered_ids", outbox_id))
            except Exception:
                pass

        async with self._mem_lock:
            for ids in self._mem_buffers.values():
                if outbox_id in ids:
                    return True
        return False

    async def get_expired_buffers(self) -> List[Tuple[str, str]]:
        """
        Finds all (session_id, user_id) buffers whose debounce lock has expired.
        """
        expired: List[Tuple[str, str]] = []
        now = time.time()

        r = await self.get_client()
        if r:
            try:
                # Retrieve from scheduled flushes where score <= now
                items = await r.zrangebyscore("digest:scheduled_flushes", 0, now)
                for tag in items:
                    if ":" in tag:
                        sid, uid = tag.split(":", 1)
                        expired.append((sid, uid))
                return expired
            except Exception as e:
                logger.warning(f"[DebounceManager] Redis get_expired_buffers error: {e}. Checking memory.")

        # In-memory check
        async with self._mem_lock:
            for tag, expire_time in list(self._mem_locks.items()):
                if now >= expire_time and tag not in self._mem_processing:
                    if ":" in tag:
                        sid, uid = tag.split(":", 1)
                        expired.append((sid, uid))
        return expired

    async def acquire_flush_lock(self, session_id: str, user_id: str) -> bool:
        """
        Acquires an atomic distributed lock before flushing to guarantee idempotency.
        """
        item_tag = f"{session_id}:{user_id}"
        proc_lock_key = f"digest:processing:{item_tag}"

        r = await self.get_client()
        if r:
            try:
                # 60-second processing lock
                acquired = await r.set(proc_lock_key, "1", nx=True, ex=60)
                if acquired:
                    # Remove from scheduled sorted set immediately
                    await r.zrem("digest:scheduled_flushes", item_tag)
                    return True
                return False
            except Exception as e:
                logger.warning(f"[DebounceManager] Redis acquire_flush_lock error: {e}")

        async with self._mem_lock:
            if item_tag in self._mem_processing:
                return False
            self._mem_processing.add(item_tag)
            return True

    async def fetch_and_clear_buffer(self, session_id: str, user_id: str) -> List[str]:
        """
        Retrieves all outbox IDs from the buffer and removes the buffer from Redis.
        """
        item_tag = f"{session_id}:{user_id}"
        buffer_key = f"digest:buffer:{item_tag}"
        lock_key = f"digest:lock:{item_tag}"

        r = await self.get_client()
        if r:
            try:
                ids = await r.lrange(buffer_key, 0, -1)
                # Cleanup buffer and lock
                await r.delete(buffer_key)
                await r.delete(lock_key)
                if ids:
                    await r.srem("digest:buffered_ids", *ids)
                return ids
            except Exception as e:
                logger.warning(f"[DebounceManager] Redis fetch_and_clear_buffer error: {e}")

        async with self._mem_lock:
            ids = self._mem_buffers.pop(item_tag, [])
            self._mem_locks.pop(item_tag, None)
            return ids

    async def release_flush_lock(self, session_id: str, user_id: str):
        """Releases the processing lock after flush completes."""
        item_tag = f"{session_id}:{user_id}"
        proc_lock_key = f"digest:processing:{item_tag}"

        r = await self.get_client()
        if r:
            try:
                await r.delete(proc_lock_key)
            except Exception:
                pass

        async with self._mem_lock:
            self._mem_processing.discard(item_tag)


# Instantiate the manager singleton
debounce_manager = RedisDebounceManager(settings.redis_url)


# ---------------------------------------------------------------------------
# 2. Resend Email Compilation Logic
# ---------------------------------------------------------------------------

def compile_digest_email(
    items: List[NotificationOutbox],
    session_title: str,
    target_url: str,
    review_url: str
) -> Tuple[str, str, str]:
    """
    Constructs a clean, branded STAGE HTML email payload aggregating multiple review events.
    """
    total_count = len(items)
    
    # 1. Resolve distinct actors
    actors = []
    for it in items:
        name = it.actor_name or "A collaborator"
        if name not in actors:
            actors.append(name)

    if len(actors) == 1:
        actor_summary = actors[0]
    elif len(actors) == 2:
        actor_summary = f"{actors[0]} and {actors[1]}"
    elif len(actors) > 2:
        actor_summary = f"{actors[0]}, {actors[1]} and {len(actors) - 2} others"
    else:
        actor_summary = "A collaborator"

    # Subject line
    display_title = session_title or "Review Session"
    if total_count == 1:
        subject = f"STAGE: {actor_summary} added 1 new marker on {display_title}"
    else:
        subject = f"STAGE: {actor_summary} added {total_count} new markers on {display_title}"

    # Build marker cards list HTML
    cards_html = ""
    for idx, item in enumerate(items[:15], 1):
        pin_title = item.title or f"Marker #{idx}"
        pin_body = item.body or "(No comment body provided)"
        pin_actor = item.actor_name or "Reviewer"
        
        cards_html += f"""
        <div style="background:#1e293b;border:1px solid #334155;border-radius:8px;padding:14px 16px;margin-bottom:12px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
            <span style="font-size:13px;font-weight:700;color:#38bdf8;">{pin_title}</span>
            <span style="font-size:11px;color:#94a3b8;font-family:monospace;">by {pin_actor}</span>
          </div>
          <div style="font-size:13px;color:#e2e8f0;line-height:1.5;">{pin_body}</div>
        </div>
        """

    overflow_notice = ""
    if total_count > 15:
        overflow_notice = f"""
        <p style="font-size:12px;color:#94a3b8;text-align:center;margin:12px 0;">
          + {total_count - 15} more annotations in this review batch
        </p>
        """

    # Full STAGE Branded HTML Template
    html_content = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>{subject}</title>
    </head>
    <body style="margin:0;padding:40px 16px;background-color:#090d16;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#f8fafc;">
      <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:580px;margin:0 auto;background-color:#0f172a;border:1px solid #1e293b;border-radius:16px;overflow:hidden;box-shadow:0 20px 25px -5px rgba(0,0,0,0.5);">
        <!-- Header -->
        <tr>
          <td style="padding:28px 32px;background:linear-gradient(180deg,#0f172a 0%,#090d16 100%);border-bottom:1px solid #1e293b;">
            <div style="display:inline-block;padding:4px 10px;background:#0369a1;border-radius:6px;font-size:10px;font-weight:800;letter-spacing:0.1em;color:#e0f2fe;text-transform:uppercase;margin-bottom:12px;">
              STAGE Activity Digest
            </div>
            <h1 style="margin:0;font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.01em;">
              {total_count} New Feedback {"Marker" if total_count == 1 else "Markers"}
            </h1>
            <p style="margin:6px 0 0 0;font-size:13px;color:#94a3b8;">
              Target: <a href="{target_url}" style="color:#38bdf8;text-decoration:none;">{display_title}</a>
            </p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:28px 32px;">
            <p style="font-size:14px;color:#cbd5e1;line-height:1.6;margin:0 0 20px 0;">
              <strong>{actor_summary}</strong> completed a review session and placed feedback markers on the page. Here is the aggregated summary:
            </p>

            {cards_html}
            {overflow_notice}

            <!-- CTA Button -->
            <div style="text-align:center;margin:32px 0 16px 0;">
              <a href="{review_url}" style="display:inline-block;background:#0284c7;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:10px;font-size:14px;font-weight:700;letter-spacing:0.02em;box-shadow:0 4px 14px 0 rgba(2,132,199,0.39);">
                Open Live Review Session &rarr;
              </a>
            </div>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 32px;background-color:#090d16;border-top:1px solid #1e293b;text-align:center;">
            <p style="margin:0;font-size:11px;color:#64748b;line-height:1.5;">
              Debounced via STAGE Outbox Engine &middot; You received this 15-minute digest based on your notification preferences.
            </p>
            <p style="margin:6px 0 0 0;font-size:11px;color:#475569;">
              &copy; {datetime.now().year} STAGE &middot; All rights reserved.
            </p>
          </td>
        </tr>
      </table>
    </body>
    </html>
    """

    # Plain text fallback
    plain_text = f"STAGE Review Digest: {total_count} new markers added by {actor_summary} on {display_title}.\n\n"
    for it in items:
        plain_text += f"- [{it.title}] by {it.actor_name or 'Reviewer'}: {it.body}\n"
    plain_text += f"\nView live review session: {review_url}\n"

    return subject, html_content, plain_text


async def transmit_via_resend(to_email: str, subject: str, html_content: str, plain_text: str) -> str:
    """
    Transmits an email payload using the Resend Python SDK.
    Falls back to mock delivery if Resend API key is not configured.
    """
    if resend.api_key and not resend.api_key.startswith("re_mock") and not resend.api_key.startswith("YOUR_"):
        # Run blocking Resend HTTP call in threadpool
        loop = asyncio.get_running_loop()
        response = await loop.run_in_executor(
            None,
            lambda: resend.Emails.send({
                "from": FROM_EMAIL,
                "to": [to_email],
                "subject": subject,
                "html": html_content,
                "text": plain_text
            })
        )
        msg_id = response.get("id") if isinstance(response, dict) else getattr(response, "id", "sent_resend")
        logger.info(f"[Resend] Successfully dispatched email to {to_email} (ID: {msg_id})")
        return str(msg_id)
    else:
        # Mock mode fallback for test / offline environments
        logger.info(f"[Resend-Mock] Simulated email transmission to {to_email} | Subject: {subject}")
        return f"mock_{int(time.time())}"


# ---------------------------------------------------------------------------
# 3. Worker Polling & Outbox State Management
# ---------------------------------------------------------------------------

async def poll_and_buffer_pending_outbox(db: AsyncSession):
    """
    Polls the NotificationOutbox table for 'pending' records.
    Checks recipient preferences:
      - If 'digest_15m', pushes event to Redis debounce buffer.
      - If 'instant', dispatches single email immediately.
    """
    # 1. Fetch pending items that are not exceeded in retries
    stmt = (
        select(NotificationOutbox)
        .where(
            NotificationOutbox.status == "pending",
            NotificationOutbox.retry_count <= MAX_RETRIES
        )
        .order_by(NotificationOutbox.created_at.asc())
        .limit(100)
    )
    result = await db.execute(stmt)
    pending_items = result.scalars().all()

    if not pending_items:
        return

    logger.debug(f"[Dispatcher] Found {len(pending_items)} pending outbox items.")

    for item in pending_items:
        # Avoid re-buffering items already residing in Redis buffer
        if await debounce_manager.is_buffered(item.id):
            continue

        # Trigger outbound developer webhook fan-out asynchronously
        try:
            from services.webhook_dispatcher import dispatch_webhooks_for_outbox
            asyncio.create_task(
                dispatch_webhooks_for_outbox(
                    project_id=item.project_id,
                    event_type=item.event_type,
                    outbox_item=item
                )
            )
        except Exception as wh_err:
            logger.warning(f"[Dispatcher] Failed to spawn webhook task for outbox {item.id}: {wh_err}")

        # 2. Check recipient preference for email delivery
        target_uid = getattr(item, "user_id", None) or getattr(item, "actor_id", None)
        is_digest_15m = True
        if target_uid:
            pref_stmt = select(NotificationPreferencesModel).where(
                NotificationPreferencesModel.user_id == target_uid
            )
            pref_res = await db.execute(pref_stmt)
            pref = pref_res.scalar_one_or_none()

            # Check if user preference is digest_15m (default: digest_15m)
            if pref:
                if hasattr(pref, "digest_frequency") and pref.digest_frequency == "instant":
                    is_digest_15m = False
                elif not pref.digest_enabled:
                    is_digest_15m = False

        # SLA breach escalations must always bypass debounce delays
        if item.event_type == "pin.sla_breached":
            is_digest_15m = False

        if is_digest_15m:
            # Buffer event and set debounce lock
            await debounce_manager.buffer_event(item.session_id, target_uid or "anonymous", item.id)
        else:
            # Instant delivery path
            await _dispatch_single_instant_notification(db, item)



async def _dispatch_single_instant_notification(db: AsyncSession, item: NotificationOutbox):
    """Delivers a single outbox record immediately without debouncing."""
    try:
        recipient_id = getattr(item, "user_id", None) or getattr(item, "actor_id", None)
        user_res = await db.execute(select(User).where(User.id == recipient_id))
        user = user_res.scalar_one_or_none()
        if not user or not user.email:
            logger.warning(f"[Dispatcher] Recipient user {recipient_id} has no valid email. Marking failed.")
            item.status = "failed"
            item.last_error = "No recipient email found"
            await db.commit()
            return

        # Fetch session info
        sess_res = await db.execute(select(Session).where(Session.id == item.session_id))
        sess = sess_res.scalar_one_or_none()
        session_title = sess.target_url if sess else "STAGE Session"
        review_url = f"{APP_URL}/sessions/{item.session_id}"

        if item.event_type == "pin.sla_breached":
            from services.sla_daemon import render_sla_breach_email
            subject, html, plain = render_sla_breach_email(item, session_title, review_url)
        else:
            subject, html, plain = compile_digest_email([item], session_title, session_title, review_url)
        await transmit_via_resend(user.email, subject, html, plain)

        item.status = "delivered"
        item.delivered_at = datetime.utcnow()
        await db.commit()
        logger.info(f"[Dispatcher] Instant notification delivered for outbox item {item.id}")
    except Exception as e:
        item.retry_count += 1
        item.last_error = str(e)
        is_dlq = item.retry_count > MAX_RETRIES
        item.status = "dead_letter" if is_dlq else "failed"

        # Worker Telemetry: Record delivery attempt failure in DLQ tracking
        target_email = user.email if (user and user.email) else f"user:{item.user_id}"
        attempt = NotificationDeliveryAttempt(
            outbox_id=item.id,
            channel="email",
            target=target_email,
            status="dead_letter" if is_dlq else "failed",
            error_context={
                "error": str(e),
                "retry_count": item.retry_count,
                "max_retries": MAX_RETRIES,
                "error_type": type(e).__name__,
                "session_id": item.session_id,
            }
        )
        db.add(attempt)

        if is_dlq:
            logger.error(f"[Dispatcher] Outbox item {item.id} moved to DEAD_LETTER queue after {item.retry_count} retries: {e}")
        else:
            logger.warning(f"[Dispatcher] Outbox item {item.id} attempt {item.retry_count} failed: {e}")

        await db.commit()



async def flush_expired_debounces(db: AsyncSession):
    """
    Checks for expired debounce locks, aggregates buffered events,
    transmits single email digest via Resend, and marks outbox items as delivered.
    """
    expired_buffers = await debounce_manager.get_expired_buffers()
    if not expired_buffers:
        return

    for session_id, user_id in expired_buffers:
        # 1. Acquire distributed lock
        acquired = await debounce_manager.acquire_flush_lock(session_id, user_id)
        if not acquired:
            continue

        try:
            # 2. Retrieve all event IDs from buffer
            outbox_ids = await debounce_manager.fetch_and_clear_buffer(session_id, user_id)
            if not outbox_ids:
                continue

            logger.info(f"[Dispatcher] Flushing {len(outbox_ids)} debounced events for session={session_id}, user={user_id}")

            # 3. Query outbox items from database
            stmt = select(NotificationOutbox).where(NotificationOutbox.id.in_(outbox_ids))
            res = await db.execute(stmt)
            items = res.scalars().all()

            if not items:
                continue

            # 4. Fetch recipient user
            user_res = await db.execute(select(User).where(User.id == user_id))
            user = user_res.scalar_one_or_none()
            if not user or not user.email:
                logger.warning(f"[Dispatcher] Cannot send digest: User {user_id} has no email. Marking outbox failed.")
                for it in items:
                    it.status = "failed"
                    it.last_error = "User email not found"
                await db.commit()
                continue

            # 5. Fetch session details
            sess_res = await db.execute(select(Session).where(Session.id == session_id))
            sess = sess_res.scalar_one_or_none()
            session_title = sess.target_url if sess else "STAGE Review Session"
            target_url = sess.target_url if sess else APP_URL
            review_url = f"{APP_URL}/sessions/{session_id}"

            # 6. Compile aggregated email
            subject, html_content, plain_text = compile_digest_email(
                items,
                session_title=session_title,
                target_url=target_url,
                review_url=review_url
            )

            # 7. Transmit via Resend SDK
            try:
                await transmit_via_resend(user.email, subject, html_content, plain_text)

                # 8. Bulk update status from 'pending' to 'delivered'
                now = datetime.utcnow()
                update_stmt = (
                    update(NotificationOutbox)
                    .where(NotificationOutbox.id.in_(outbox_ids))
                    .values(status="delivered", delivered_at=now)
                )
                await db.execute(update_stmt)
                await db.commit()
                logger.info(f"[Dispatcher] Successfully delivered {len(items)} debounced items to {user.email}")
            except Exception as send_err:
                logger.error(f"[Dispatcher] Failed to send Resend digest to {user.email}: {send_err}")
                await db.rollback()

                target_email = user.email if (user and user.email) else f"user:{user_id}"

                # Increment retry count, record telemetry attempt, and mark DLQ
                for it in items:
                    it.retry_count += 1
                    it.last_error = str(send_err)
                    is_dlq = it.retry_count > MAX_RETRIES
                    it.status = "dead_letter" if is_dlq else "failed"

                    attempt = NotificationDeliveryAttempt(
                        outbox_id=it.id,
                        channel="email",
                        target=target_email,
                        status="dead_letter" if is_dlq else "failed",
                        error_context={
                            "error": str(send_err),
                            "retry_count": it.retry_count,
                            "max_retries": MAX_RETRIES,
                            "error_type": type(send_err).__name__,
                            "session_id": session_id,
                            "batch_size": len(items),
                        }
                    )
                    db.add(attempt)
                    if is_dlq:
                        logger.error(f"[Dispatcher] Outbox item {it.id} moved to DEAD_LETTER queue after {it.retry_count} retries.")

                await db.commit()


        finally:
            await debounce_manager.release_flush_lock(session_id, user_id)


# ---------------------------------------------------------------------------
# 4. Continuous Background Worker Runner
# ---------------------------------------------------------------------------

_worker_stop_event = asyncio.Event()

async def run_notification_dispatcher():
    """
    Main asynchronous background worker loop.
    Periodically polls pending outbox records, buffers debounces, and flushes expired digests.
    """
    logger.info("[NotificationDispatcher] Background worker service started.")
    while not _worker_stop_event.is_set():
        try:
            async with AsyncSessionLocal() as db:
                # Step 1: Poll and buffer incoming outbox items
                await poll_and_buffer_pending_outbox(db)

                # Step 2: Flush expired debounce buffers
                await flush_expired_debounces(db)
        except asyncio.CancelledError:
            logger.info("[NotificationDispatcher] Background worker received cancellation. Shutting down cleanly.")
            break
        except Exception as e:
            logger.error(f"[NotificationDispatcher] Worker loop unexpected error: {e}", exc_info=True)

        try:
            await asyncio.wait_for(_worker_stop_event.wait(), timeout=POLL_INTERVAL_SECONDS)
        except asyncio.TimeoutError:
            pass

    logger.info("[NotificationDispatcher] Background worker service stopped.")


def stop_notification_dispatcher():
    """Signals the worker loop to terminate."""
    _worker_stop_event.set()
