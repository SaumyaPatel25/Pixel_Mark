import logging
import os
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update
from models import NotificationEventModel, NotificationPreferencesModel, NotificationDeliveryAttemptModel, Project, User
from services.notification_templates import (
    build_notification_subject, build_notification_body, build_preview_text, build_why_you_got_this
)

logger = logging.getLogger("stage.notifications")

async def get_or_create_preferences(
    db: AsyncSession,
    user_id: str,
    project_id: Optional[str] = None
) -> NotificationPreferencesModel:
    query = select(NotificationPreferencesModel).where(NotificationPreferencesModel.user_id == user_id)
    if project_id:
        query = query.where(NotificationPreferencesModel.project_id == project_id)
    else:
        query = query.where(NotificationPreferencesModel.project_id.is_(None))

    res = await db.execute(query)
    pref = res.scalar_one_or_none()

    if not pref:
        pref = NotificationPreferencesModel(
            user_id=user_id,
            project_id=project_id,
            in_app_enabled=True,
            email_enabled=True,
            digest_enabled=True,
            allow_blueprint_events=True,
            allow_session_events=True,
            allow_critical=True,
            allow_important=True,
            allow_digest=True
        )
        db.add(pref)
        try:
            await db.commit()
            await db.refresh(pref)
        except Exception as e:
            await db.rollback()
            logger.warning(f"[STAGE Notifications] Error creating default preferences: {e}")

    return pref


async def emit_blueprint_notification(
    db: AsyncSession,
    project_id: str,
    event_type: str,
    entity_type: str,
    entity_id: Optional[str],
    title: str,
    body: str,
    user_id: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
    category: str = "important"
) -> Optional[NotificationEventModel]:
    """
    Emits a Blueprint-sourced notification event safely without blocking main transaction flows.
    """
    try:
        # Resolve project and organization to check entitlement
        proj_res = await db.execute(select(Project).where(Project.id == project_id))
        proj = proj_res.scalar_one_or_none()
        if not proj:
            logger.info(f"[STAGE Notification] Skipping Blueprint event: project {project_id} not found.")
            return None
        
        org_id = proj.org_id

        # Entitlement check
        from services.plan_capabilities import resolve_org_plan
        plan_info = await resolve_org_plan(org_id, db)
        if not plan_info.get("has_blueprint_dom_edit", False):
            logger.info(f"[STAGE Notification] Skipping Blueprint event for org {org_id} (No Blueprint entitlement).")
            return None

        # Check preferences
        email_only = False
        if user_id:
            pref = await get_or_create_preferences(db, user_id, project_id)
            if not pref.allow_blueprint_events:
                logger.info(f"[STAGE Notification] Blueprint notifications disabled for user {user_id}. Skipping.")
                return None
            if not pref.in_app_enabled:
                email_only = True

        event = None
        if not email_only or not user_id:
            event = NotificationEventModel(
                user_id=user_id,
                org_id=org_id,
                project_id=project_id,
                source_type="blueprint",
                event_type=event_type,
                category=category,
                entity_type=entity_type,
                entity_id=entity_id,
                title=title,
                body=body,
                metadata_json=metadata or {}
            )
            db.add(event)
            await db.commit()
            await db.refresh(event)
            logger.info(f"[STAGE Notification] Emitted Blueprint event '{event_type}' [{event.id}] for project {project_id}")

        # Send email if enabled
        if user_id:
            pref = await get_or_create_preferences(db, user_id, project_id)
            if pref.email_enabled:
                if event:
                    await deliver_email_notification(db, event.id)
                else:
                    await deliver_email_notification_direct(db, user_id, project_id, "blueprint", event_type, title, body, metadata)

        return event
    except Exception as err:
        logger.warning(f"[STAGE Notification] Blueprint notification emit failed: {err}")
        try:
            await db.rollback()
        except Exception:
            pass
        return None


async def emit_session_notification(
    db: AsyncSession,
    session_id: str,
    event_type: str,
    entity_type: str,
    entity_id: Optional[str],
    title: str,
    body: str,
    project_id: Optional[str] = None,
    user_id: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
    category: str = "important"
) -> Optional[NotificationEventModel]:
    """
    Emits a Session-sourced notification event safely without blocking session/review flows.
    """
    try:
        org_id = None
        if project_id:
            proj_res = await db.execute(select(Project).where(Project.id == project_id))
            proj = proj_res.scalar_one_or_none()
            if proj:
                org_id = proj.org_id

        # Check preferences
        email_only = False
        if user_id:
            pref = await get_or_create_preferences(db, user_id, project_id)
            if not pref.allow_session_events:
                logger.info(f"[STAGE Notification] Session notifications disabled for user {user_id}. Skipping.")
                return None
            if not pref.in_app_enabled:
                email_only = True

        merged_meta = metadata or {}
        merged_meta["session_id"] = session_id

        event = None
        if not email_only or not user_id:
            event = NotificationEventModel(
                user_id=user_id,
                org_id=org_id,
                project_id=project_id,
                source_type="session",
                event_type=event_type,
                category=category,
                entity_type=entity_type,
                entity_id=entity_id,
                title=title,
                body=body,
                metadata_json=merged_meta
            )
            db.add(event)
            await db.commit()
            await db.refresh(event)
            logger.info(f"[STAGE Notification] Emitted Session event '{event_type}' [{event.id}] for session {session_id}")

        # Send email if enabled
        if user_id:
            pref = await get_or_create_preferences(db, user_id, project_id)
            if pref.email_enabled:
                if event:
                    await deliver_email_notification(db, event.id)
                else:
                    await deliver_email_notification_direct(db, user_id, project_id, "session", event_type, title, body, merged_meta)

        return event
    except Exception as err:
        logger.warning(f"[STAGE Notification] Session notification emit failed: {err}")
        try:
            await db.rollback()
        except Exception:
            pass
        return None


async def deliver_email_notification_direct(
    db: AsyncSession,
    user_id: str,
    project_id: Optional[str],
    source_type: str,
    event_type: str,
    title: str,
    body: str,
    metadata: Optional[Dict[str, Any]]
) -> bool:
    try:
        user_res = await db.execute(select(User).where(User.id == user_id))
        user = user_res.scalar_one_or_none()
        if not user or not user.email:
            return False

        subject = build_notification_subject(source_type, event_type, metadata)
        body_text = build_notification_body(source_type, event_type, metadata)

        from services.email import _base_template, send_email_wrapper
        html_content = _base_template(
            title=title,
            body=body_text,
            cta_text="View in STAGE",
            cta_url=os.environ.get("APP_PUBLIC_URL", "https://stage.io")
        )

        send_email_wrapper(subject, user.email, html_content, body_text)
        return True
    except Exception as e:
        logger.warning(f"[STAGE Email] Direct email notification delivery failed: {e}")
        return False


async def deliver_email_notification(db: AsyncSession, notification_id: str, max_attempts: int = 3) -> bool:
    """
    Delivers a single STAGE HTML notification email and records delivery attempt bookkeeping.
    """
    try:
        res = await db.execute(select(NotificationEventModel).where(NotificationEventModel.id == notification_id))
        event = res.scalar_one_or_none()
        if not event or event.delivered_email_at:
            return False

        # Count prior attempts
        attempts_res = await db.execute(
            select(func.count(NotificationDeliveryAttemptModel.id)).where(
                NotificationDeliveryAttemptModel.notification_event_id == notification_id
            )
        )
        attempt_num = (attempts_res.scalar() or 0) + 1

        # Retrieve user email
        if not event.user_id:
            logger.info(f"[STAGE Email] Notification {notification_id} has no user_id associated.")
            return False

        user_res = await db.execute(select(User).where(User.id == event.user_id))
        recipient = user_res.scalar_one_or_none()
        if not recipient or not recipient.email:
            logger.warning(f"[STAGE Email] No recipient email found for user {event.user_id}")
            return False

        subject = build_notification_subject(event.source_type, event.event_type, event.metadata_json)
        body_text = build_notification_body(event.source_type, event.event_type, event.metadata_json)

        from services.email import _base_template, send_email_wrapper
        html_content = _base_template(
            title=event.title,
            body=body_text,
            cta_text="View in STAGE",
            cta_url=os.environ.get("APP_PUBLIC_URL", "https://stage.io")
        )

        # Call existing email service helper to deliver SMTP or Resend email
        send_email_wrapper(subject, recipient.email, html_content, body_text)

        provider_msg_id = f"msg_stage_{notification_id[:8]}_{attempt_num}"
        now = datetime.utcnow()

        event.delivered_email_at = now
        attempt = NotificationDeliveryAttemptModel(
            notification_event_id=notification_id,
            channel="email",
            status="sent",
            attempt_number=attempt_num,
            provider_message_id=provider_msg_id,
            sent_at=now
        )
        db.add(attempt)
        await db.commit()
        logger.info(f"[STAGE Email] Delivered notification email for event {notification_id} (Attempt #{attempt_num})")
        return True
    except Exception as e:
        logger.warning(f"[STAGE Email] Failed to deliver email for notification {notification_id}: {e}")
        try:
            attempts_res = await db.execute(
                select(func.count(NotificationDeliveryAttemptModel.id)).where(
                    NotificationDeliveryAttemptModel.notification_event_id == notification_id
                )
            )
            attempt_num = (attempts_res.scalar() or 0) + 1
            status = "dead_letter" if attempt_num >= max_attempts else "retrying"
            next_retry = datetime.utcnow() + timedelta(minutes=2 ** attempt_num) if status == "retrying" else None

            attempt = NotificationDeliveryAttemptModel(
                notification_event_id=notification_id,
                channel="email",
                status=status,
                attempt_number=attempt_num,
                error_code="DELIVERY_FAILURE",
                error_message=str(e)[:500],
                next_retry_at=next_retry
            )
            db.add(attempt)
            await db.commit()
        except Exception:
            await db.rollback()
        return False


async def retry_failed_delivery(db: AsyncSession, attempt_id: str) -> Optional[NotificationDeliveryAttemptModel]:
    """
    Retries a specific failed/dead_letter delivery attempt.
    """
    res = await db.execute(select(NotificationDeliveryAttemptModel).where(NotificationDeliveryAttemptModel.id == attempt_id))
    attempt = res.scalar_one_or_none()
    if not attempt:
        return None

    success = await deliver_email_notification(db, attempt.notification_event_id)
    if success:
        attempt.status = "sent"
        attempt.sent_at = datetime.utcnow()
        await db.commit()
        await db.refresh(attempt)
    return attempt


async def retry_all_failed_deliveries(db: AsyncSession) -> int:
    """
    Retries all failed, retrying, and dead_letter delivery attempts.
    """
    res = await db.execute(
        select(NotificationDeliveryAttemptModel).where(
            NotificationDeliveryAttemptModel.status.in_(["failed", "retrying", "dead_letter"])
        )
    )
    failed_attempts = res.scalars().all()
    count = 0
    for att in failed_attempts:
        if await deliver_email_notification(db, att.notification_event_id):
            att.status = "sent"
            att.sent_at = datetime.utcnow()
            count += 1
    await db.commit()
    return count


async def get_delivery_summary_data(db: AsyncSession) -> Dict[str, Any]:
    """
    Calculates aggregate delivery monitoring statistics and overall health status.
    """
    res = await db.execute(
        select(NotificationDeliveryAttemptModel.status, func.count(NotificationDeliveryAttemptModel.id))
        .group_by(NotificationDeliveryAttemptModel.status)
    )
    counts = dict(res.all())

    queued = counts.get("queued", 0)
    sent = counts.get("sent", 0)
    failed = counts.get("failed", 0)
    retrying = counts.get("retrying", 0)
    dead_letter = counts.get("dead_letter", 0)
    total = sum(counts.values())

    if dead_letter > 0 or failed > 5:
        health_status = "critical_failures"
    elif retrying > 0 or failed > 0:
        health_status = "warnings"
    else:
        health_status = "healthy"

    return {
        "total_attempts": total,
        "queued": queued,
        "sent": sent,
        "failed": failed,
        "retrying": retrying,
        "dead_letter": dead_letter,
        "health_status": health_status
    }


async def build_project_digest(db: AsyncSession, project_id: Optional[str] = None, hours: int = 24) -> Dict[str, Any]:
    """
    Aggregates recent notification events into a clean HTML & plaintext STAGE project digest.
    """
    since = datetime.utcnow() - timedelta(hours=hours)
    query = select(NotificationEventModel).where(NotificationEventModel.created_at >= since)
    if project_id:
        query = query.where(NotificationEventModel.project_id == project_id)

    res = await db.execute(query.order_by(NotificationEventModel.created_at.desc()))
    events = res.scalars().all()

    blueprint_events = [e for e in events if e.source_type == "blueprint"]
    session_events = [e for e in events if e.source_type == "session"]

    proj_name = "STAGE Projects"
    if project_id:
        p_res = await db.execute(select(Project).where(Project.id == project_id))
        p = p_res.scalar_one_or_none()
        if p:
            proj_name = p.name

    subject = f"STAGE Project Digest: {len(events)} updates for {proj_name}"

    digest_text = f"STAGE Project Activity Digest ({proj_name})\n"
    digest_text += f"Total Updates: {len(events)} ({len(blueprint_events)} Blueprint, {len(session_events)} Session)\n\n"

    if blueprint_events:
        digest_text += "--- BLUEPRINT CANVAS UPDATES ---\n"
        for be in blueprint_events:
            digest_text += f"• [{be.event_type}] {be.title}: {be.body}\n"
        digest_text += "\n"

    if session_events:
        digest_text += "--- SESSION REVIEW UPDATES ---\n"
        for se in session_events:
            digest_text += f"• [{se.event_type}] {se.title}: {se.body}\n"

    digest_html = f"""
    <div style="font-family: sans-serif; background: #090d16; color: #f8fafc; padding: 24px; borderRadius: 12px;">
      <h2 style="color: #38bdf8; margin-top: 0;">STAGE Activity Digest</h2>
      <p style="color: #94a3b8;">Summary of updates for <strong>{proj_name}</strong> in the past {hours} hours.</p>
      
      <div style="margin-top: 16px; background: #1e293b; padding: 16px; border-radius: 8px;">
        <h3 style="color: #c084fc; margin-top: 0;">Blueprint Canvas ({len(blueprint_events)})</h3>
        {"".join([f'<div style="margin-bottom: 8px; font-size: 13px;"><strong>{be.title}</strong> — {be.body}</div>' for be in blueprint_events]) or '<p style="color: #64748b; font-size: 13px;">No blueprint activity</p>'}
      </div>

      <div style="margin-top: 16px; background: #1e293b; padding: 16px; border-radius: 8px;">
        <h3 style="color: #38bdf8; margin-top: 0;">Session Review ({len(session_events)})</h3>
        {"".join([f'<div style="margin-bottom: 8px; font-size: 13px;"><strong>{se.title}</strong> — {se.body}</div>' for se in session_events]) or '<p style="color: #64748b; font-size: 13px;">No session activity</p>'}
      </div>
    </div>
    """.strip()

    return {
        "project_id": project_id,
        "subject": subject,
        "event_count": len(events),
        "blueprint_count": len(blueprint_events),
        "session_count": len(session_events),
        "digest_html": digest_html,
        "digest_text": digest_text
    }
