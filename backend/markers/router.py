from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from database import AsyncSessionLocal
from dependencies import get_db, bearer_scheme, get_current_user_optional
from fastapi.security import HTTPAuthorizationCredentials
from auth import decode_token
from models import User, ApiKey
from sqlalchemy import select
import logging

from markers.models import Marker, ReviewerIdentity
from markers.schemas import (
    MarkerCreate, MarkerUpdate, MarkerRead, MarkerListItem,
    MarkerPositionPatch, ReviewerIdentityCreate, ReviewerIdentityRead
)
from markers.repository import MarkerRepository
from markers.service import MarkerService

from realtime.connection_manager import realtime_manager
from realtime.redis_broadcaster import redis_broadcaster
from realtime.events import build_marker_event, build_marker_deleted_event

logger = logging.getLogger("pixelmark.markers")

router = APIRouter(tags=["markers"])

# Helper function to resolve actor context
async def resolve_actor_context(
    session_id: str,
    db: AsyncSession,
    current_user: Optional[User],
    x_reviewer_id: Optional[str]
) -> dict:
    print(f"[DEBUG resolve_actor_context] session_id={session_id}, x_reviewer_id={x_reviewer_id}, current_user={current_user.email if current_user else None}")
    if x_reviewer_id:
        repo = MarkerRepository(db)
        reviewer = await repo.get_reviewer_identity(x_reviewer_id)
        if reviewer:
            print(f"[DEBUG resolve_actor_context] Found reviewer in DB: id={reviewer.id}, session_id={reviewer.session_id}")
        else:
            print(f"[DEBUG resolve_actor_context] Reviewer NOT found in DB for id={x_reviewer_id}")
            
        if reviewer and reviewer.session_id == session_id:
            from datetime import datetime, timezone
            reviewer.last_seen_at = datetime.now(timezone.utc)
            resolved = {
                "id": reviewer.id,
                "name": reviewer.display_name,
                "role": reviewer.role,
                "color_token": reviewer.color_token
            }
            logger.info(f"PixelMark participant resolved [{reviewer.id}] [{reviewer.role}]")
            print(f"[DEBUG resolve_actor_context] Resolved to reviewer actor: {resolved}")
            return resolved
        else:
            # Rejects fallback to current_user if reviewer context was supplied but not resolved
            resolved = {
                "id": x_reviewer_id or "anonymous-guest",
                "name": "Anonymous Reviewer",
                "role": "reviewer",
                "color_token": "#8b5cf6"
            }
            logger.info(f"PixelMark participant resolved [{resolved['id']}] [reviewer]")
            print(f"[DEBUG resolve_actor_context] Resolved to fallback reviewer actor: {resolved}")
            return resolved

    if current_user:
        resolved = {
            "id": current_user.id,
            "name": current_user.name or current_user.email,
            "role": "developer",
            "color_token": "#4f46e5"
        }
        logger.info(f"PixelMark participant resolved [{current_user.id}] [developer]")
        print(f"[DEBUG resolve_actor_context] Resolved to developer actor: {resolved}")
        return resolved

    # Default fallback
    resolved = {
        "id": "anonymous-guest",
        "name": "Anonymous Reviewer",
        "role": "reviewer",
        "color_token": "#8b5cf6"
    }
    logger.info(f"PixelMark participant resolved [anonymous-guest] [reviewer]")
    return resolved

# Dependency wrapper for session-scoped actor retrieval
async def get_session_actor(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
    x_reviewer_id: Optional[str] = Header(None)
):
    return await resolve_actor_context(session_id, db, current_user, x_reviewer_id)


@router.post("/sessions/{session_id}/reviewer-identities", response_model=ReviewerIdentityRead)
async def create_reviewer_identity(
    session_id: str,
    payload: ReviewerIdentityCreate,
    db: AsyncSession = Depends(get_db)
):
    repo = MarkerRepository(db)
    
    # 1. Curated readable palette:
    CURATED_PALETTE = [
        "violet",
        "emerald",
        "coral",
        "amber",
        "sky",
        "rose",
        "purple",
        "magenta",
        "indigo"
    ]
    
    # Check what colors are already taken in this session
    res = await db.execute(
        select(ReviewerIdentity.color_token)
        .where(ReviewerIdentity.session_id == session_id)
    )
    existing_colors = {r[0] for r in res.all()}
    
    color_token = payload.color_token
    if color_token:
        # If color_token is already taken, let's find the first free one from our curated list
        if color_token in existing_colors:
            for c in CURATED_PALETTE:
                if c not in existing_colors:
                    color_token = c
                    break
    else:
        # If not chosen: pick first available from curated palette
        for c in CURATED_PALETTE:
            if c not in existing_colors:
                color_token = c
                break
        if not color_token:
            color_token = CURATED_PALETTE[len(existing_colors) % len(CURATED_PALETTE)]

    reviewer = ReviewerIdentity(
        session_id=session_id,
        display_name=payload.display_name,
        color_token=color_token,
        role="reviewer"
    )
    await repo.create_reviewer_identity(reviewer)
    await db.commit()
    await db.refresh(reviewer)
    
    # Log resolved participant:
    logger.info(f"PixelMark participant resolved [{reviewer.id}] [reviewer]")
    return reviewer


@router.post("/sessions/{session_id}/markers", response_model=MarkerRead)
async def create_marker(
    session_id: str,
    payload: MarkerCreate,
    db: AsyncSession = Depends(get_db),
    actor: dict = Depends(get_session_actor)
):
    from models import Session as DbSession
    result = await db.execute(select(DbSession).where(DbSession.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.project_id != payload.project_id:
        raise HTTPException(status_code=422, detail="Project ID does not match Session's Project ID")

    repo = MarkerRepository(db)
    marker = MarkerService.prepare_marker_creation(
        payload=payload,
        actor_role=actor["role"],
        actor_id=actor["id"],
        actor_name=actor["name"],
        actor_color=actor["color_token"]
    )
    marker.session_id = session_id

    await repo.create_marker(marker)
    await db.commit()
    await db.refresh(marker)

    logger.info(f"PixelMark marker author attached [{marker.id}] [{marker.creator_id}]")

    # Autoritative realtime sync: Broadcast created event after successful REST commit
    try:
        event = build_marker_event(
            event_type="marker_created",
            session_id=session_id,
            marker=marker,
            actor_id=actor["id"],
            actor_role=actor["role"]
        )
        await redis_broadcaster.publish_event(session_id, event)
    except Exception as e:
        logger.warning(f"[WS] Failed to broadcast marker_created event: {e}")

    return marker


@router.get("/sessions/{session_id}/markers", response_model=List[MarkerListItem])
async def list_markers(
    session_id: str,
    page_url: Optional[str] = None,
    creator_role: Optional[str] = None,
    creator_id: Optional[str] = None,
    status: Optional[str] = None,
    include_deleted: bool = False,
    db: AsyncSession = Depends(get_db)
):
    repo = MarkerRepository(db)
    markers = await repo.list_markers_by_session(
        session_id=session_id,
        include_deleted=include_deleted,
        page_url=page_url,
        creator_role=creator_role,
        creator_id=creator_id,
        status=status
    )
    return markers

@router.get("/markers/project/{project_id}", response_model=List[MarkerListItem])
async def list_project_markers(
    project_id: str,
    page_url: Optional[str] = None,
    creator_role: Optional[str] = None,
    creator_id: Optional[str] = None,
    status: Optional[str] = None,
    include_deleted: bool = False,
    db: AsyncSession = Depends(get_db)
):
    from models.core import Session
    from sqlalchemy import select
    
    query = select(Marker).join(Session, Marker.session_id == Session.id).where(Session.project_id == project_id)
    
    if not include_deleted:
        query = query.where(Marker.is_deleted == False)
    if page_url is not None:
        query = query.where(Marker.page_url == page_url)
    if creator_role is not None:
        query = query.where(Marker.creator_role == creator_role)
    if creator_id is not None:
        query = query.where(Marker.creator_id == creator_id)
    if status is not None:
        query = query.where(Marker.status == status)
        
    result = await db.execute(query)
    markers = list(result.scalars().all())
    return markers


@router.get("/markers/{marker_id}", response_model=MarkerRead)
async def get_marker(
    marker_id: str,
    db: AsyncSession = Depends(get_db)
):
    repo = MarkerRepository(db)
    marker = await repo.get_marker_by_id(marker_id)
    if not marker or marker.is_deleted:
        raise HTTPException(status_code=404, detail="Marker not found")
    return marker


@router.patch("/markers/{marker_id}", response_model=MarkerRead)
async def update_marker(
    marker_id: str,
    payload: MarkerUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
    x_reviewer_id: Optional[str] = Header(None)
):
    repo = MarkerRepository(db)
    marker = await repo.get_marker_by_id(marker_id)
    if not marker or marker.is_deleted:
        raise HTTPException(status_code=404, detail="Marker not found")

    actor_ctx = await resolve_actor_context(
        session_id=marker.session_id,
        db=db,
        current_user=current_user,
        x_reviewer_id=x_reviewer_id
    )

    MarkerService.apply_marker_update(
        marker=marker,
        update_payload=payload,
        actor_role=actor_ctx["role"],
        actor_id=actor_ctx["id"]
    )
    await db.commit()
    await db.refresh(marker)

    # Broadcast updated event after commit
    try:
        event = build_marker_event(
            event_type="marker_updated",
            session_id=marker.session_id,
            marker=marker,
            actor_id=actor_ctx["id"],
            actor_role=actor_ctx["role"]
        )
        await redis_broadcaster.publish_event(marker.session_id, event)
    except Exception as e:
        logger.warning(f"[WS] Failed to broadcast marker_updated event: {e}")

    return marker


@router.patch("/markers/{marker_id}/position", response_model=MarkerRead)
async def update_marker_position(
    marker_id: str,
    payload: MarkerPositionPatch,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
    x_reviewer_id: Optional[str] = Header(None)
):
    repo = MarkerRepository(db)
    marker = await repo.get_marker_by_id(marker_id)
    if not marker or marker.is_deleted:
        raise HTTPException(status_code=404, detail="Marker not found")

    actor_ctx = await resolve_actor_context(
        session_id=marker.session_id,
        db=db,
        current_user=current_user,
        x_reviewer_id=x_reviewer_id
    )

    MarkerService.apply_position_patch(
        marker=marker,
        position_payload=payload,
        actor_role=actor_ctx["role"],
        actor_id=actor_ctx["id"]
    )
    await db.commit()
    await db.refresh(marker)

    # Broadcast moved event after commit
    try:
        event = build_marker_event(
            event_type="marker_moved",
            session_id=marker.session_id,
            marker=marker,
            actor_id=actor_ctx["id"],
            actor_role=actor_ctx["role"]
        )
        await redis_broadcaster.publish_event(marker.session_id, event)
    except Exception as e:
        logger.warning(f"[WS] Failed to broadcast marker_moved event: {e}")

    return marker


@router.delete("/markers/{marker_id}")
async def delete_marker(
    marker_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
    x_reviewer_id: Optional[str] = Header(None)
):
    repo = MarkerRepository(db)
    marker = await repo.get_marker_by_id(marker_id)
    if not marker or marker.is_deleted:
        raise HTTPException(status_code=404, detail="Marker not found")

    actor_ctx = await resolve_actor_context(
        session_id=marker.session_id,
        db=db,
        current_user=current_user,
        x_reviewer_id=x_reviewer_id
    )

    MarkerService.check_mutation_permission(
        actor_role=actor_ctx["role"],
        actor_id=actor_ctx["id"],
        marker=marker
    )

    await repo.soft_delete_marker(marker)
    await db.commit()

    # Broadcast deleted event after commit
    try:
        event = build_marker_deleted_event(
            session_id=marker.session_id,
            marker=marker,
            actor_id=actor_ctx["id"],
            actor_role=actor_ctx["role"]
        )
        await redis_broadcaster.publish_event(marker.session_id, event)
    except Exception as e:
        logger.warning(f"[WS] Failed to broadcast marker_deleted event: {e}")

    return {"success": True, "message": "Marker deleted successfully"}
