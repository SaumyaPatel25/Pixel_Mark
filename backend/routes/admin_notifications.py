"""
backend/routes/admin_notifications.py

Admin Observability API for STAGE Notifications.
Allows project owners and admins to inspect delivery attempts across channels,
monitor Dead-Letter Queues (DLQ), and replay failed dispatches.
"""

from datetime import datetime
import logging
from typing import Any, Dict, List, Optional
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from dependencies import get_current_user, get_db
from models.core import OrgMember, Project, RoleEnum, User
from models.notifications import NotificationDeliveryAttempt, NotificationOutbox

logger = logging.getLogger("stage.routes.admin_notifications")

router = APIRouter(tags=["admin-notifications"])


# ---------------------------------------------------------------------------
# Pydantic Response Schemas
# ---------------------------------------------------------------------------


class DeliveryAttemptItem(BaseModel):
    id: str
    outbox_id: Optional[str] = None
    channel: str
    target: Optional[str] = None
    status: str
    error_context: Dict[str, Any] = {}
    created_at: Optional[str] = None
    event_type: Optional[str] = None
    outbox_status: Optional[str] = None
    retry_count: Optional[int] = None


class DeliveryAttemptsResponse(BaseModel):
    items: List[DeliveryAttemptItem]
    total: int
    offset: int
    limit: int
    dead_letter_count: int


class ReplayResponse(BaseModel):
    status: str
    outbox_id: str
    previous_status: str
    retry_count: int
    message: str


# ---------------------------------------------------------------------------
# Role Authorization Helper
# ---------------------------------------------------------------------------


async def verify_project_admin_or_owner(
    project_id: str,
    current_user: User,
    db: AsyncSession
) -> Project:
    """
    Validates UUID and enforces that current user has owner or admin role
    within the project's organization.
    """
    try:
        uuid.UUID(project_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid project UUID format"
        )

    # Check for admin or owner role in organization
    org_res = await db.execute(
        select(OrgMember).where(
            OrgMember.user_id == current_user.id,
            OrgMember.role.in_([RoleEnum.owner, RoleEnum.admin, "owner", "admin"])
        )
    )
    admin_memberships = org_res.scalars().all()
    if not admin_memberships:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Requires workspace owner or admin privileges"
        )

    org_ids = [m.org_id for m in admin_memberships]
    proj_res = await db.execute(
        select(Project).where(
            Project.id == project_id,
            Project.org_id.in_(org_ids),
            Project.status != "soft_deleted"
        )
    )
    project = proj_res.scalar_one_or_none()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found or admin access denied"
        )
    return project


# ---------------------------------------------------------------------------
# Admin Routes
# ---------------------------------------------------------------------------


@router.get(
    "/projects/{project_id}/notifications/deliveries",
    response_model=DeliveryAttemptsResponse,
    summary="List delivery attempts and DLQ entries for a project"
)
async def list_delivery_attempts(
    project_id: str,
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status: dead_letter, failed, success"),
    channel: Optional[str] = Query(None, description="Filter by channel: email, webhook, in_app"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Paginated list of delivery attempts for a project, with optional DLQ filtering.
    Restricted to project owners and admins.
    """
    await verify_project_admin_or_owner(project_id, current_user, db)

    # Build base join query: join delivery attempt with its parent outbox entry
    base_query = (
        select(NotificationDeliveryAttempt, NotificationOutbox)
        .join(NotificationOutbox, NotificationDeliveryAttempt.outbox_id == NotificationOutbox.id)
        .where(NotificationOutbox.project_id == project_id)
    )

    if status_filter:
        base_query = base_query.where(NotificationDeliveryAttempt.status == status_filter)
    if channel:
        base_query = base_query.where(NotificationDeliveryAttempt.channel == channel)

    # Count total matching rows
    count_stmt = (
        select(func.count(NotificationDeliveryAttempt.id))
        .join(NotificationOutbox, NotificationDeliveryAttempt.outbox_id == NotificationOutbox.id)
        .where(NotificationOutbox.project_id == project_id)
    )
    if status_filter:
        count_stmt = count_stmt.where(NotificationDeliveryAttempt.status == status_filter)
    if channel:
        count_stmt = count_stmt.where(NotificationDeliveryAttempt.channel == channel)

    total_res = await db.execute(count_stmt)
    total_count = total_res.scalar() or 0

    # Count dead_letter specifically for quick stats
    dlq_count_stmt = (
        select(func.count(NotificationDeliveryAttempt.id))
        .join(NotificationOutbox, NotificationDeliveryAttempt.outbox_id == NotificationOutbox.id)
        .where(
            NotificationOutbox.project_id == project_id,
            NotificationDeliveryAttempt.status == "dead_letter"
        )
    )
    dlq_res = await db.execute(dlq_count_stmt)
    dead_letter_count = dlq_res.scalar() or 0

    # Paginate results
    paged_query = base_query.order_by(NotificationDeliveryAttempt.created_at.desc()).offset(offset).limit(limit)
    rows_res = await db.execute(paged_query)
    rows = rows_res.all()

    items = []
    for attempt, outbox in rows:
        items.append(
            DeliveryAttemptItem(
                id=attempt.id,
                outbox_id=attempt.outbox_id,
                channel=attempt.channel,
                target=attempt.target,
                status=attempt.status,
                error_context=attempt.error_context or {},
                created_at=attempt.created_at.isoformat() if attempt.created_at else None,
                event_type=outbox.event_type if outbox else None,
                outbox_status=outbox.status if outbox else None,
                retry_count=outbox.retry_count if outbox else None,
            )
        )

    return DeliveryAttemptsResponse(
        items=items,
        total=total_count,
        offset=offset,
        limit=limit,
        dead_letter_count=dead_letter_count
    )


@router.post(
    "/projects/{project_id}/notifications/dlq/{outbox_id}/replay",
    response_model=ReplayResponse,
    summary="Replay a failed or dead-letter outbox dispatch"
)
async def replay_dlq_message(
    project_id: str,
    outbox_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Resets an outbox item's retry_count to 0 and status to 'pending',
    effectively re-queuing the dead letter for background delivery.
    Enforces idempotency (cannot replay already delivered messages).
    """
    await verify_project_admin_or_owner(project_id, current_user, db)

    # Locate outbox message
    stmt = select(NotificationOutbox).where(
        NotificationOutbox.id == outbox_id,
        NotificationOutbox.project_id == project_id
    )
    res = await db.execute(stmt)
    outbox = res.scalar_one_or_none()

    if not outbox:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Outbox message not found"
        )

    # Idempotency guard: do not replay already delivered messages
    if outbox.status == "delivered":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot replay a message that has already been successfully delivered"
        )

    previous_status = outbox.status or "failed"

    # Reset outbox item for fresh background worker pickup
    outbox.status = "pending"
    outbox.retry_count = 0
    outbox.last_error = None
    outbox.processed_at = None

    await db.commit()
    await db.refresh(outbox)

    logger.info(
        f"[DLQ Replay] Message {outbox_id} for project {project_id} "
        f"reset from '{previous_status}' to 'pending' by user {current_user.id}"
    )

    return ReplayResponse(
        status="requeued",
        outbox_id=outbox.id,
        previous_status=previous_status,
        retry_count=0,
        message="Message successfully moved from DLQ back to pending dispatch queue"
    )
