import logging
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update

from dependencies import get_db, get_current_user, get_current_user_optional
from models import User, NotificationEventModel, NotificationPreferencesModel, NotificationDeliveryAttemptModel
from schemas import (
    NotificationEventRead, NotificationListResponse,
    NotificationPreferencesRead, NotificationPreferencesUpdate,
    DigestPreviewRequest, DigestPreviewResponse,
    NotificationDeliveryAttemptRead, NotificationDeliverySummary, NotificationDeliveryListResponse
)
from services.notification_service import (
    get_or_create_preferences, emit_blueprint_notification,
    build_project_digest, deliver_email_notification,
    retry_failed_delivery, retry_all_failed_deliveries, get_delivery_summary_data
)
from services.notification_templates import (
    build_notification_subject, build_notification_body, build_preview_text, build_why_you_got_this
)

logger = logging.getLogger("stage.routes.notifications")
router = APIRouter(tags=["notifications"])

@router.get("/notifications", response_model=NotificationListResponse)
async def list_notifications(
    project_id: Optional[str] = None,
    source_type: Optional[str] = None,  # blueprint | session
    unread_only: bool = False,
    limit: int = 20,
    before: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    user_id = current_user.id if current_user else None

    query = select(NotificationEventModel)
    if user_id:
        query = query.where(
            (NotificationEventModel.user_id == user_id) | (NotificationEventModel.user_id.is_(None))
        )
    if project_id:
        query = query.where(NotificationEventModel.project_id == project_id)
    if source_type:
        query = query.where(NotificationEventModel.source_type == source_type)
    if unread_only:
        query = query.where(NotificationEventModel.read_at.is_(None))

    if before:
        try:
            dt_before = datetime.fromisoformat(before)
            query = query.where(NotificationEventModel.created_at < dt_before)
        except ValueError:
            pass

    unread_query = select(func.count(NotificationEventModel.id)).where(NotificationEventModel.read_at.is_(None))
    if user_id:
        unread_query = unread_query.where((NotificationEventModel.user_id == user_id) | (NotificationEventModel.user_id.is_(None)))
    if project_id:
        unread_query = unread_query.where(NotificationEventModel.project_id == project_id)
    
    unread_res = await db.execute(unread_query)
    unread_count = unread_res.scalar() or 0

    res = await db.execute(query.order_by(NotificationEventModel.created_at.desc()).limit(limit + 1))
    items = res.scalars().all()

    has_more = len(items) > limit
    results = items[:limit]
    next_cursor = results[-1].created_at.isoformat() if (has_more and results and results[-1].created_at) else None

    return NotificationListResponse(
        items=[NotificationEventRead.model_validate(n) for n in results],
        unread_count=unread_count,
        has_more=has_more,
        next_cursor=next_cursor
    )


@router.patch("/notifications/{id}/read", response_model=NotificationEventRead)
async def mark_notification_read(
    id: str,
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(NotificationEventModel).where(NotificationEventModel.id == id))
    event = res.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Notification not found")

    if not event.read_at:
        event.read_at = datetime.utcnow()
        await db.commit()
        await db.refresh(event)

    return NotificationEventRead.model_validate(event)


@router.patch("/notifications/read-all")
async def mark_all_notifications_read(
    project_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    user_id = current_user.id if current_user else None
    stmt = update(NotificationEventModel).where(NotificationEventModel.read_at.is_(None)).values(read_at=datetime.utcnow())
    if user_id:
        stmt = stmt.where((NotificationEventModel.user_id == user_id) | (NotificationEventModel.user_id.is_(None)))
    if project_id:
        stmt = stmt.where(NotificationEventModel.project_id == project_id)

    await db.execute(stmt)
    await db.commit()
    return {"message": "All notifications marked as read"}


@router.get("/notification-preferences", response_model=NotificationPreferencesRead)
async def get_preferences(
    project_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    user_id = current_user.id if current_user else "anonymous_user"
    pref = await get_or_create_preferences(db, user_id, project_id)
    return NotificationPreferencesRead.model_validate(pref)


@router.put("/notification-preferences", response_model=NotificationPreferencesRead)
async def update_preferences(
    payload: NotificationPreferencesUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    user_id = current_user.id if current_user else "anonymous_user"
    pref = await get_or_create_preferences(db, user_id, payload.project_id)

    if payload.email_enabled is not None:
        pref.email_enabled = payload.email_enabled
    if payload.digest_enabled is not None:
        pref.digest_enabled = payload.digest_enabled
    if payload.allow_blueprint_events is not None:
        pref.allow_blueprint_events = payload.allow_blueprint_events
    if payload.allow_session_events is not None:
        pref.allow_session_events = payload.allow_session_events
    if payload.allow_critical is not None:
        pref.allow_critical = payload.allow_critical
    if payload.allow_important is not None:
        pref.allow_important = payload.allow_important
    if payload.allow_digest is not None:
        pref.allow_digest = payload.allow_digest
    if payload.quiet_hours_json is not None:
        pref.quiet_hours_json = payload.quiet_hours_json

    pref.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(pref)
    return NotificationPreferencesRead.model_validate(pref)


@router.post("/notifications/digest/preview", response_model=DigestPreviewResponse)
async def preview_digest(
    payload: DigestPreviewRequest,
    db: AsyncSession = Depends(get_db)
):
    digest = await build_project_digest(db, payload.project_id, payload.hours or 24)
    return DigestPreviewResponse(
        project_id=digest["project_id"],
        subject=digest["subject"],
        event_count=digest["event_count"],
        blueprint_count=digest["blueprint_count"],
        session_count=digest["session_count"],
        digest_html=digest["digest_html"],
        digest_text=digest["digest_text"]
    )


@router.post("/notifications/test-email")
async def send_test_notification(
    project_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    user_id = current_user.id if current_user else None
    event = await emit_blueprint_notification(
        db=db,
        project_id=project_id or "test_project",
        event_type="test_event",
        entity_type="test",
        entity_id="test_id",
        title="STAGE Test Notification",
        body="This is a test notification verifying STAGE email & in-app delivery.",
        user_id=user_id,
        category="critical"
    )
    return {"message": "Test notification emitted", "notification_id": event.id if event else None}


@router.post("/notifications/templates/preview")
async def preview_notification_template(
    source_type: str = "blueprint",  # blueprint | session
    event_type: str = "comment_created",
    tone: str = "client_friendly",
    sample_target: str = "Hero CTA Button",
    sample_author: str = "Sarah Jenkins"
):
    metadata = {
        "target_selector": sample_target,
        "author_name": sample_author,
        "project_name": "E-Commerce Redesign",
        "comment_snippet": "Can we increase the padding and contrast on this button?",
        "version": "2.0",
        "status": "approved",
        "session_title": "Homepage Audit"
    }

    subject = build_notification_subject(source_type, event_type, metadata, tone)
    body = build_notification_body(source_type, event_type, metadata, tone)
    preview = build_preview_text(source_type, event_type, metadata)
    why_you_got_this = build_why_you_got_this(source_type, event_type)

    return {
        "source_type": source_type,
        "event_type": event_type,
        "tone": tone,
        "subject": subject,
        "body": body,
        "preview_text": preview,
        "why_you_got_this": why_you_got_this
    }


# ─── NOTIFICATION DELIVERY MONITORING & RETRY ROUTES ────────────────────────

@router.get("/notifications/deliveries/summary", response_model=NotificationDeliverySummary)
async def get_delivery_summary(
    db: AsyncSession = Depends(get_db)
):
    summary_data = await get_delivery_summary_data(db)
    return NotificationDeliverySummary(**summary_data)


@router.get("/notifications/deliveries", response_model=NotificationDeliveryListResponse)
async def list_delivery_attempts(
    status: Optional[str] = None,  # queued | sent | failed | retrying | dead_letter
    limit: int = 20,
    before: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    query = select(NotificationDeliveryAttemptModel)
    if status:
        query = query.where(NotificationDeliveryAttemptModel.status == status)

    if before:
        try:
            dt_before = datetime.fromisoformat(before)
            query = query.where(NotificationDeliveryAttemptModel.created_at < dt_before)
        except ValueError:
            pass

    res = await db.execute(query.order_by(NotificationDeliveryAttemptModel.created_at.desc()).limit(limit + 1))
    items = res.scalars().all()

    has_more = len(items) > limit
    results = items[:limit]
    next_cursor = results[-1].created_at.isoformat() if (has_more and results and results[-1].created_at) else None

    summary_data = await get_delivery_summary_data(db)

    return NotificationDeliveryListResponse(
        items=[NotificationDeliveryAttemptRead.model_validate(att) for att in results],
        summary=NotificationDeliverySummary(**summary_data),
        has_more=has_more,
        next_cursor=next_cursor
    )


@router.get("/notifications/deliveries/{id}", response_model=NotificationDeliveryAttemptRead)
async def get_delivery_attempt_detail(
    id: str,
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(NotificationDeliveryAttemptModel).where(NotificationDeliveryAttemptModel.id == id))
    attempt = res.scalar_one_or_none()
    if not attempt:
        raise HTTPException(status_code=404, detail="Delivery attempt log not found")
    return NotificationDeliveryAttemptRead.model_validate(attempt)


@router.post("/notifications/deliveries/{id}/retry", response_model=NotificationDeliveryAttemptRead)
async def retry_single_delivery_attempt(
    id: str,
    db: AsyncSession = Depends(get_db)
):
    attempt = await retry_failed_delivery(db, id)
    if not attempt:
        raise HTTPException(status_code=404, detail="Delivery attempt not found for retry")
    return NotificationDeliveryAttemptRead.model_validate(attempt)


@router.post("/notifications/deliveries/retry-failed")
async def retry_all_failed_deliveries_endpoint(
    db: AsyncSession = Depends(get_db)
):
    count = await retry_all_failed_deliveries(db)
    return {"message": f"Triggered retries for {count} failed delivery attempts", "retried_count": count}
