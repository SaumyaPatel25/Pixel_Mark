"""
backend/routes/notification_preferences.py

Notification Preferences API for STAGE.
Allows users to configure global delivery defaults and project-level overrides
for in-app alerts, email frequencies, and specific pin event triggers.
"""

from enum import Enum
import logging
from typing import Any, Dict, List, Optional
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from dependencies import get_current_user, get_db
from models.core import OrgMember, Project, User
from models.notifications import NotificationPreference
from services.notification_service import (
    DEFAULT_NOTIFICATION_PREFERENCES,
    resolve_user_notification_preferences,
)

logger = logging.getLogger("stage.routes.notification_preferences")

router = APIRouter(tags=["notification-preferences"])


# ---------------------------------------------------------------------------
# Pydantic Schemas
# ---------------------------------------------------------------------------


class EmailFrequencyEnum(str, Enum):
    immediate = "immediate"
    digest_15m = "digest_15m"
    daily = "daily"
    off = "off"


class NotificationPreferenceItem(BaseModel):
    id: Optional[str] = None
    user_id: str
    project_id: Optional[str] = None
    project_name: Optional[str] = None
    in_app_enabled: bool = True
    email_enabled: bool = True
    email_frequency: EmailFrequencyEnum = EmailFrequencyEnum.digest_15m
    notify_on_all_pins: bool = False
    notify_on_assigned: bool = True
    notify_on_mentions: bool = True
    notify_on_status_change: bool = True
    updated_at: Optional[str] = None


class NotificationPreferencesGetResponse(BaseModel):
    global_preferences: NotificationPreferenceItem
    project_overrides: List[NotificationPreferenceItem] = []
    effective: Optional[NotificationPreferenceItem] = None


class NotificationPreferenceUpdateRequest(BaseModel):
    project_id: Optional[str] = Field(
        default=None,
        description="Project ID for project-level override, or null for global defaults"
    )
    in_app_enabled: bool = Field(default=True, description="Enable in-app drawer notifications")
    email_enabled: bool = Field(default=True, description="Enable email delivery")
    email_frequency: EmailFrequencyEnum = Field(
        default=EmailFrequencyEnum.digest_15m,
        description="Delivery schedule: immediate, digest_15m, daily, off"
    )
    notify_on_all_pins: bool = Field(default=False, description="Notify when any pin is added")
    notify_on_assigned: bool = Field(default=True, description="Notify when a pin is assigned to me")
    notify_on_mentions: bool = Field(default=True, description="Notify when mentioned or replied to")
    notify_on_status_change: bool = Field(default=True, description="Notify when pin status resolves/changes")

    @field_validator("email_frequency", mode="before")
    def validate_frequency(cls, v: Any) -> Any:
        if isinstance(v, str):
            clean = v.strip().lower()
            if clean in ("instant", "immediate"):
                return EmailFrequencyEnum.immediate
            if clean in ("digest_15m", "15m", "batch"):
                return EmailFrequencyEnum.digest_15m
            if clean in ("daily", "digest_daily"):
                return EmailFrequencyEnum.daily
            if clean in ("off", "never", "disabled"):
                return EmailFrequencyEnum.off
        return v


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.get(
    "/notification-preferences",
    response_model=NotificationPreferencesGetResponse,
    summary="Get user notification preferences"
)
async def get_user_preferences(
    project_id: Optional[str] = Query(None, description="Optional project ID to resolve effective preference"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns global notification defaults and all project-level overrides for the user.
    If `project_id` is supplied, also returns the effective resolved preference.
    """
    user_id = current_user.id

    # 1. Fetch all existing preference rows for this user
    stmt = (
        select(NotificationPreference)
        .where(NotificationPreference.user_id == user_id)
        .order_by(NotificationPreference.updated_at.desc())
    )
    res = await db.execute(stmt)
    rows = res.scalars().all()

    global_row: Optional[NotificationPreference] = None
    override_rows: List[NotificationPreference] = []

    for row in rows:
        if row.project_id is None:
            global_row = row
        else:
            override_rows.append(row)

    # 2. Build global item (fallback to defaults if user has never saved global preferences)
    if global_row:
        global_item = NotificationPreferenceItem(
            id=global_row.id,
            user_id=user_id,
            project_id=None,
            in_app_enabled=global_row.in_app_enabled,
            email_enabled=global_row.email_enabled,
            email_frequency=EmailFrequencyEnum(global_row.email_frequency) if global_row.email_frequency in EmailFrequencyEnum.__members__.values() else EmailFrequencyEnum.digest_15m,
            notify_on_all_pins=global_row.notify_on_all_pins,
            notify_on_assigned=global_row.notify_on_assigned,
            notify_on_mentions=global_row.notify_on_mentions,
            notify_on_status_change=global_row.notify_on_status_change,
            updated_at=global_row.updated_at.isoformat() if global_row.updated_at else None
        )
    else:
        global_item = NotificationPreferenceItem(
            user_id=user_id,
            project_id=None,
            in_app_enabled=DEFAULT_NOTIFICATION_PREFERENCES["in_app_enabled"],
            email_enabled=DEFAULT_NOTIFICATION_PREFERENCES["email_enabled"],
            email_frequency=EmailFrequencyEnum(DEFAULT_NOTIFICATION_PREFERENCES["email_frequency"]),
            notify_on_all_pins=DEFAULT_NOTIFICATION_PREFERENCES["notify_on_all_pins"],
            notify_on_assigned=DEFAULT_NOTIFICATION_PREFERENCES["notify_on_assigned"],
            notify_on_mentions=DEFAULT_NOTIFICATION_PREFERENCES["notify_on_mentions"],
            notify_on_status_change=DEFAULT_NOTIFICATION_PREFERENCES["notify_on_status_change"],
        )

    # 3. Resolve project names for overrides
    project_ids = [r.project_id for r in override_rows if r.project_id]
    project_name_map: Dict[str, str] = {}
    if project_ids:
        p_res = await db.execute(select(Project.id, Project.name).where(Project.id.in_(project_ids)))
        project_name_map = dict(p_res.all())

    project_overrides: List[NotificationPreferenceItem] = []
    for r in override_rows:
        project_overrides.append(
            NotificationPreferenceItem(
                id=r.id,
                user_id=user_id,
                project_id=r.project_id,
                project_name=project_name_map.get(r.project_id or "", "Project Override"),
                in_app_enabled=r.in_app_enabled,
                email_enabled=r.email_enabled,
                email_frequency=EmailFrequencyEnum(r.email_frequency) if r.email_frequency in EmailFrequencyEnum.__members__.values() else EmailFrequencyEnum.digest_15m,
                notify_on_all_pins=r.notify_on_all_pins,
                notify_on_assigned=r.notify_on_assigned,
                notify_on_mentions=r.notify_on_mentions,
                notify_on_status_change=r.notify_on_status_change,
                updated_at=r.updated_at.isoformat() if r.updated_at else None
            )
        )

    # 4. If project_id is provided, compute effective preferences
    effective_item: Optional[NotificationPreferenceItem] = None
    if project_id:
        eff = await resolve_user_notification_preferences(db, user_id=user_id, project_id=project_id)
        effective_item = NotificationPreferenceItem(
            user_id=user_id,
            project_id=project_id,
            project_name=project_name_map.get(project_id),
            in_app_enabled=eff["in_app_enabled"],
            email_enabled=eff["email_enabled"],
            email_frequency=EmailFrequencyEnum(eff["email_frequency"]),
            notify_on_all_pins=eff["notify_on_all_pins"],
            notify_on_assigned=eff["notify_on_assigned"],
            notify_on_mentions=eff["notify_on_mentions"],
            notify_on_status_change=eff["notify_on_status_change"],
        )

    return NotificationPreferencesGetResponse(
        global_preferences=global_item,
        project_overrides=project_overrides,
        effective=effective_item
    )


@router.put(
    "/notification-preferences",
    response_model=NotificationPreferenceItem,
    summary="Upsert notification preferences"
)
async def update_user_preferences(
    payload: NotificationPreferenceUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Upserts preference row for global defaults (project_id=null)
    or project-specific overrides (project_id provided).
    """
    user_id = current_user.id
    target_project_id = payload.project_id.strip() if payload.project_id and payload.project_id.strip() else None

    # Validate project access if project_id is specified
    project_name: Optional[str] = None
    if target_project_id:
        try:
            uuid.UUID(target_project_id)
        except ValueError:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid project UUID format")

        org_res = await db.execute(select(OrgMember).where(OrgMember.user_id == user_id))
        members = org_res.scalars().all()
        if not members:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden: User does not belong to any organization")

        org_ids = [m.org_id for m in members]
        p_res = await db.execute(
            select(Project).where(
                Project.id == target_project_id,
                Project.org_id.in_(org_ids),
                Project.status != "soft_deleted"
            )
        )
        proj = p_res.scalar_one_or_none()
        if not proj:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found or access denied")
        project_name = proj.name

    # Find existing row for (user_id, project_id)
    if target_project_id:
        stmt = select(NotificationPreference).where(
            NotificationPreference.user_id == user_id,
            NotificationPreference.project_id == target_project_id
        )
    else:
        stmt = select(NotificationPreference).where(
            NotificationPreference.user_id == user_id,
            NotificationPreference.project_id.is_(None)
        )

    res = await db.execute(stmt)
    pref = res.scalar_one_or_none()

    if not pref:
        pref = NotificationPreference(
            user_id=user_id,
            project_id=target_project_id,
            in_app_enabled=payload.in_app_enabled,
            email_enabled=payload.email_enabled,
            email_frequency=payload.email_frequency.value,
            notify_on_all_pins=payload.notify_on_all_pins,
            notify_on_assigned=payload.notify_on_assigned,
            notify_on_mentions=payload.notify_on_mentions,
            notify_on_status_change=payload.notify_on_status_change,
        )
        db.add(pref)
    else:
        pref.in_app_enabled = payload.in_app_enabled
        pref.email_enabled = payload.email_enabled
        pref.email_frequency = payload.email_frequency.value
        pref.notify_on_all_pins = payload.notify_on_all_pins
        pref.notify_on_assigned = payload.notify_on_assigned
        pref.notify_on_mentions = payload.notify_on_mentions
        pref.notify_on_status_change = payload.notify_on_status_change

    await db.commit()
    await db.refresh(pref)

    logger.info(
        f"[Preferences] Updated notification preferences for user={user_id}, "
        f"project_id={target_project_id}, frequency={payload.email_frequency.value}"
    )

    return NotificationPreferenceItem(
        id=pref.id,
        user_id=pref.user_id,
        project_id=pref.project_id,
        project_name=project_name,
        in_app_enabled=pref.in_app_enabled,
        email_enabled=pref.email_enabled,
        email_frequency=EmailFrequencyEnum(pref.email_frequency),
        notify_on_all_pins=pref.notify_on_all_pins,
        notify_on_assigned=pref.notify_on_assigned,
        notify_on_mentions=pref.notify_on_mentions,
        notify_on_status_change=pref.notify_on_status_change,
        updated_at=pref.updated_at.isoformat() if pref.updated_at else None
    )
