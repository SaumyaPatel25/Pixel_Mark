from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.exc import IntegrityError
from models import Session, PageVisit, Marker, AuditArtifact, ShareLink, CanvasFrame, Project, OrgMember, User
from schemas import (
    SessionCreate, SessionOut, PageVisitOut, SessionRendererUpdate,
    FeedbackCreate, FeedbackUpdate, FeedbackOut, FeedbackListOut
)
from dependencies import get_db, get_current_user
import uuid
from datetime import datetime, timedelta
from typing import Optional, List
from utils.ssrf_guard import is_ssrf_safe, is_domain_allowed
from routes.proxy import resolve_session_base_url, validate_public_access
import logging
from services.cache import cache

async def close_stale_sessions(db: AsyncSession):
    logger = logging.getLogger("pixelmark.sessions.cleanup")
    one_min_ago = datetime.utcnow() - timedelta(seconds=60)
    
    # Update active sessions with last_heartbeat_at < one_min_ago to status = "idle"
    result = await db.execute(
        select(Session)
        .where(Session.status == "active")
        .where(
            (Session.last_heartbeat_at < one_min_ago) |
            ((Session.last_heartbeat_at.is_(None)) & (Session.created_at < one_min_ago))
        )
    )
    from services.cache import SYSTEM_METRICS
    stale_sessions = result.scalars().all()
    for s in stale_sessions:
        s.status = "idle"
        logger.info(f"[OBSERVABILITY] [SESSION_IDLE_AUTO_CLOSE] Session {s.id} marked as idle due to heartbeat timeout.")
        SYSTEM_METRICS["idle_closures"] += 1
    
    if stale_sessions:
        await db.commit()


router = APIRouter(prefix="/sessions", tags=["sessions"])

@router.get("/", response_model=list[SessionOut])
async def list_all_sessions(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    cache_key = f"user:{current_user.id}:sessions"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    org_member = await db.execute(select(OrgMember).where(OrgMember.user_id == current_user.id))
    member = org_member.scalar_one_or_none()
    if not member:
        return []
    
    result = await db.execute(
        select(Session)
        .join(Project, Session.project_id == Project.id)
        .where(Project.org_id == member.org_id)
    )
    sessions = result.scalars().all()
    
    # Serialize to dictionary for safe caching
    data = [
        {
            "id": s.id,
            "project_id": s.project_id,
            "title": s.title,
            "current_page_url": s.current_page_url,
            "pages_visited_count": s.pages_visited_count,
            "created_at": s.created_at,
            "updated_at": s.updated_at,
            "renderer_type": s.renderer_type,
            "heavy_mode": s.heavy_mode,
            "conservative_render_mode": s.conservative_render_mode,
            "render_detected_at": s.render_detected_at,
            "canvas_count": s.canvas_count,
            "has_webgl": s.has_webgl,
            "has_three_js": s.has_three_js,
            "status": s.status,
            "last_heartbeat_at": s.last_heartbeat_at
        } for s in sessions
    ]
    cache.set(cache_key, data, 15)
    return data

@router.post("/", response_model=SessionOut)
async def create_session(
    data: SessionCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Auto-clean stale sessions in the background
    background_tasks.add_task(close_stale_sessions, db)

    # 1. Reuse existing active session if created within a short window (5 minutes)
    five_min_ago = datetime.utcnow() - timedelta(minutes=5)
    existing_res = await db.execute(
        select(Session)
        .where(Session.project_id == data.project_id)
        .where(Session.status == "active")
        .where(Session.created_at >= five_min_ago)
        .order_by(Session.created_at.desc())
    )
    existing = existing_res.scalars().first()
    if existing:
        # Recycle/reuse
        logger = logging.getLogger("pixelmark.sessions.create")
        logger.info(f"[OBSERVABILITY] [SESSION_REUSE] Reusing active session {existing.id} for project {data.project_id}")
        SYSTEM_METRICS["session_reuses"] += 1
        return existing

    # 2. Enforce concurrency limits: max 3 active sessions per organization
    org_member = await db.execute(select(OrgMember).where(OrgMember.user_id == current_user.id))
    member = org_member.scalar_one_or_none()
    if member:
        active_count_res = await db.execute(
            select(func.count(Session.id))
            .join(Project, Session.project_id == Project.id)
            .where(Project.org_id == member.org_id)
            .where(Session.status == "active")
        )
        active_count = active_count_res.scalar() or 0
        if active_count >= 3:
            logger = logging.getLogger("pixelmark.sessions.concurrency")
            logger.warning(f"[OBSERVABILITY] [SESSION_LIMIT_EXCEEDED] Org {member.org_id} has {active_count} active sessions. Recycling oldest.")
            # Close oldest active session(s)
            oldest_res = await db.execute(
                select(Session)
                .join(Project, Session.project_id == Project.id)
                .where(Project.org_id == member.org_id)
                .where(Session.status == "active")
                .order_by(Session.created_at.asc())
            )
            oldest = oldest_res.scalars().all()
            for s in oldest[:(active_count - 2)]:
                s.status = "closed"
            await db.commit()

    title = data.title
    if not title or not title.strip():
        # Auto-title logic
        title = f"Session - {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')}"
    
    session = Session(id=str(uuid.uuid4()), project_id=data.project_id, title=title, status="active")
    db.add(session)
    await db.commit()
    await db.refresh(session)

    # Auto-create CanvasFrame for this new session
    f_count_res = await db.execute(
        select(func.count(CanvasFrame.id)).where(CanvasFrame.project_id == data.project_id)
    )
    existing_count = f_count_res.scalar() or 0

    frame = CanvasFrame(
        id=str(uuid.uuid4()),
        project_id=data.project_id,
        session_id=session.id,
        title=session.title,
        position_x=existing_count * 380.0,
        position_y=60.0,
        width=320.0,
        height=200.0,
        color="#1c1b19"
    )
    db.add(frame)
    await db.commit()
    
    # Invalidate cache keys affected by the mutation
    cache.invalidate(f"user:{current_user.id}:*")
    cache.invalidate("*:projects")
    cache.invalidate("*:project:*:analytics")

    return session

@router.get("/project/{project_id}", response_model=list[SessionOut])
async def list_sessions(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    try:
        uuid.UUID(project_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid UUID format")

    cache_key = f"user:{current_user.id}:project:{project_id}:sessions"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    result = await db.execute(select(Session).where(Session.project_id == project_id))
    sessions = result.scalars().all()
    
    # Serialize to dictionary for safe caching
    data = [
        {
            "id": s.id,
            "project_id": s.project_id,
            "title": s.title,
            "current_page_url": s.current_page_url,
            "pages_visited_count": s.pages_visited_count,
            "created_at": s.created_at,
            "updated_at": s.updated_at,
            "renderer_type": s.renderer_type,
            "heavy_mode": s.heavy_mode,
            "conservative_render_mode": s.conservative_render_mode,
            "render_detected_at": s.render_detected_at,
            "canvas_count": s.canvas_count,
            "has_webgl": s.has_webgl,
            "has_three_js": s.has_three_js,
            "status": s.status,
            "last_heartbeat_at": s.last_heartbeat_at
        } for s in sessions
    ]
    cache.set(cache_key, data, 15)
    return data

@router.get("/{session_id}", response_model=SessionOut)
async def get_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    try:
        uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid UUID format")

    result = await db.execute(select(Session).where(Session.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session

@router.delete("/{session_id}")
async def delete_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    try:
        uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid UUID format")

    result = await db.execute(select(Session).where(Session.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    await db.delete(session)
    await db.commit()

    # Invalidate cache
    cache.invalidate(f"user:{current_user.id}:*")
    cache.invalidate("*:projects")
    cache.invalidate("*:project:*:analytics")

    return {"deleted": True}

@router.get("/{session_id}/stats")
async def get_session_stats(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    try:
        uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid UUID format")

    cache_key = f"user:{current_user.id}:session:{session_id}:stats"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached
        
    session_result = await db.execute(select(Session).where(Session.id == session_id))
    session = session_result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    markers_result = await db.execute(select(Marker).where(Marker.session_id == session_id))
    markers = markers_result.scalars().all()
    
    total = len(markers)
    by_priority = {"critical": 0, "high": 0, "medium": 0, "low": 0}
    by_status = {"open": 0, "in_progress": 0, "resolved": 0}
    by_renderer = {"dom": 0, "threejs": 0, "webgl": 0, "canvas2d": 0}
    
    for m in markers:
        # Priority
        p_val = getattr(m.priority, "value", str(m.priority))
        if p_val in by_priority:
            by_priority[p_val] += 1
        else:
            by_priority["medium"] += 1
            
        # Status
        s_val = getattr(m.status, "value", str(m.status))
        if s_val in by_status:
            by_status[s_val] += 1
        else:
            by_status["open"] += 1
            
        # Renderer
        r_val = m.renderer_type or "dom"
        if r_val in by_renderer:
            by_renderer[r_val] += 1
        else:
            by_renderer["dom"] += 1
            
    visits_result = await db.execute(
        select(func.count(func.distinct(PageVisit.page_url))).where(PageVisit.session_id == session_id)
    )
    unique_pages = visits_result.scalar() or 0
    
    res_data = {
        "total": total,
        "by_priority": by_priority,
        "by_status": by_status,
        "by_renderer": by_renderer,
        "pages_visited": session.pages_visited or 0,
        "unique_pages": unique_pages
    }
    cache.set(cache_key, res_data, 15)
    return res_data

@router.post("/{session_id}/heartbeat")
async def session_heartbeat(
    session_id: str,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    try:
        uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid UUID format")
        
    result = await db.execute(select(Session).where(Session.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    session.last_heartbeat_at = datetime.utcnow()
    session.status = "active"
    await db.commit()

    # Clean up stale sessions asynchronously
    background_tasks.add_task(close_stale_sessions, db)
    return {"status": "active", "last_heartbeat_at": session.last_heartbeat_at}

@router.get("/{session_id}/pages", response_model=list[PageVisitOut])
async def get_session_pages(session_id: str, db: AsyncSession = Depends(get_db)):
    try:
        uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid UUID format")
        
    result = await db.execute(
        select(PageVisit).where(PageVisit.session_id == session_id).order_by(PageVisit.visited_at.asc())
    )
    return result.scalars().all()

@router.post("/{session_id}/renderer", response_model=SessionOut)
async def update_session_renderer(
    session_id: str,
    data: SessionRendererUpdate,
    db: AsyncSession = Depends(get_db)
):
    from utils.guardrails import check_render_retry_limits, GuardrailError
    try:
        check_render_retry_limits(session_id)
    except GuardrailError as ge:
        raise HTTPException(status_code=ge.status_code, detail=ge.message)

    try:
        uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid UUID format")

    result = await db.execute(select(Session).where(Session.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    session.renderer_type = data.renderer_type
    session.heavy_mode = (data.renderer_type != "dom")
    session.render_detected_at = datetime.utcnow()
    session.canvas_count = data.canvas_count
    session.has_webgl = (data.renderer_type in ["webgl", "webgl2", "mixed"])
    session.has_three_js = data.three_detected

    import logging
    logger = logging.getLogger("pixelmark.sessions")
    logger.info(f"[OBSERVABILITY] [RENDERER_DETECTED] Deployed agent detected renderer type: {data.renderer_type} for session={session_id}. has_webgl={session.has_webgl}, has_three_js={session.has_three_js}, canvas_count={data.canvas_count}")

    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session


def map_marker_to_feedback_out(marker: Marker) -> FeedbackOut:
    import urllib.parse
    # Extract raw capture_payload
    payload = marker.capture_payload or {}
    
    # Fallbacks for details
    comment_val = marker.comment or marker.note or marker.description or ""
    
    return FeedbackOut(
        id=marker.id,
        sessionid=marker.session_id,
        pageurl=marker.page_url or "",
        pagetitle=marker.page_title or "",
        status=marker.status if isinstance(marker.status, str) else getattr(marker.status, "value", str(marker.status)),
        issuetype=marker.issue_type,
        priority=marker.priority if isinstance(marker.priority, str) else getattr(marker.priority, "value", str(marker.priority)),
        comment=comment_val,
        renderertype=marker.renderer_type or "dom",
        createdvia=marker.created_via or "agent",
        createdat=marker.created_at,
        updatedat=marker.updated_at,
        capture_payload=payload,
        capturepayload=payload,
        project_id=marker.project_id,
        marker_number=marker.marker_number,
        share_link_id=marker.share_link_id,
        title=marker.title,
        description=marker.description
    )

def normalize_logical_url(url: str) -> str:
    if not url:
        return url
    import urllib.parse
    try:
        parsed = urllib.parse.urlparse(url)
        qs = urllib.parse.parse_qs(parsed.query)
        if "url" in qs:
            return qs["url"][0]
    except Exception:
        pass
    return url

@router.post("/{session_id}/feedback", response_model=FeedbackOut, status_code=201)
async def create_feedback(
    session_id: str,
    data: FeedbackCreate,
    background_tasks: BackgroundTasks,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    logger = logging.getLogger("pixelmark.feedback")
    logger.info(f"[PixelMark Feedback API] create session={session_id} page={data.pageurl}")

    try:
        uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid UUID format")

    # Resolve session and project, validation
    base_url, project_id, session = await resolve_session_base_url(session_id, db)
    
    # Extract logical target URL from proxy URL format if needed
    logical_pageurl = normalize_logical_url(data.pageurl)
    
    # Enforce domain scoping and SSRF safety on the logical page URL
    if not is_ssrf_safe(logical_pageurl):
        raise HTTPException(status_code=403, detail="SSRF target blocked: Loopback or private IP ranges are restricted.")
    if not is_domain_allowed(logical_pageurl, base_url):
        raise HTTPException(status_code=403, detail="Navigation blocked: pageurl is outside allowed session domain boundary.")

    share_link_id = None
    user_id = None

    # Try resolving user from Auth token first if present
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        try:
            from auth import decode_token
            payload = decode_token(token)
            user_id = payload.get("sub")
        except Exception:
            pass

    # Resolve share token if present
    share_token = data.share_token or request.query_params.get("share_token")
    if share_token:
        link = await validate_public_access(session_id, share_token, db)
        share_link_id = link.id

    # Extract nested fields from payload
    payload = data.capturepayload or {}
    coords = payload.get("coordinates") or {}
    target_data = payload.get("target") or {}
    screenshots_data = payload.get("screenshots") or {}
    diagnostics_data = payload.get("diagnostics") or {}
    viewport_data = payload.get("viewport") or {}
    browser_info_data = diagnostics_data.get("browserInfo") or {}

    # Always generate a fresh server-side UUID — never trust client draft IDs as DB PKs.
    # This prevents IntegrityError on duplicate/retry submissions.
    marker_id = str(uuid.uuid4())

    # Auto-increment marker_number. We retry once on unique constraint collision
    # caused by concurrent requests hitting the same MAX(marker_number) race.
    num_result = await db.execute(
        select(func.max(Marker.marker_number)).where(Marker.session_id == session_id)
    )
    max_num = num_result.scalar()
    marker_number = (max_num or 0) + 1

    marker = Marker(
        id=marker_id,
        session_id=session_id,
        project_id=project_id,
        page_url=logical_pageurl,
        page_title=data.pagetitle,
        status="submitted",
        issue_type=data.issuetype or "other",
        priority=data.priority or "medium",
        comment=data.comment or "",
        note=data.comment or "",
        description=data.description or data.comment or "",
        title=data.title,
        renderer_type=data.renderertype or "dom",
        created_via=data.createdvia or "agent",
        marker_number=marker_number,
        share_link_id=share_link_id,
        user_id=user_id,
        created_by=user_id,
        
        # Structured fields for compatibility
        x=coords.get("pageX"),
        y=coords.get("pageY"),
        viewport_x=coords.get("viewportX"),
        viewport_y=coords.get("viewportY"),
        norm_x=coords.get("normX"),
        norm_y=coords.get("normY"),
        element_selector=target_data.get("selector"),
        element_text=target_data.get("text"),
        element_tag=target_data.get("tagName"),
        xpath=target_data.get("xpath"),
        css_selector=target_data.get("selector"),
        inner_text=target_data.get("text"),
        aria_label=target_data.get("ariaLabel"),
        aria_role=target_data.get("ariaRole"),
        bounding_box=payload.get("boundingBox"),
        viewport=viewport_data,
        browser=browser_info_data.get("name"),
        os=browser_info_data.get("os"),
        scroll_position={"x": viewport_data.get("scrollX"), "y": viewport_data.get("scrollY")} if (viewport_data.get("scrollX") is not None or viewport_data.get("scrollY") is not None) else None,
        console_errors=diagnostics_data.get("consoleErrors"),
        network_errors=diagnostics_data.get("networkErrors"),
        browser_info=browser_info_data,
        canvas_context=payload.get("canvasContext"),
        agent_version=payload.get("agentVersion"),
        
        screenshot_url=screenshots_data.get("cropDataUrl") or screenshots_data.get("fullPageDataUrl"),
        canvas_snapshot=screenshots_data.get("canvasSnapshot"),
        
        # The new JSON fields
        capture_payload=payload,
        coordinates=coords,
        target=target_data,
        source=payload.get("source"),
        screenshots=screenshots_data,
        diagnostics=diagnostics_data,
    )

    db.add(marker)
    try:
        await db.commit()
    except IntegrityError as ie:
        await db.rollback()
        err_msg = str(ie.orig) if hasattr(ie, 'orig') else str(ie)
        if "uq_session_marker_number" in err_msg or "markers_pkey" in err_msg:
            # Race condition on marker_number or PK — retry with a fresh number/ID
            logger.warning(f"[PixelMark Submit] IntegrityError on insert (race or duplicate): {err_msg}. Retrying with fresh IDs.")
            retry_result = await db.execute(
                select(func.max(Marker.marker_number)).where(Marker.session_id == session_id)
            )
            marker.marker_number = (retry_result.scalar() or 0) + 1
            marker.id = str(uuid.uuid4())
            db.add(marker)
            await db.commit()
        else:
            logger.error(f"[PixelMark Submit] Unrecoverable IntegrityError: {err_msg}")
            raise HTTPException(status_code=409, detail="Feedback could not be saved due to a database conflict. Please try again.")

    await db.refresh(marker)

    logger.info(f"[PixelMark Submit] persisted capture {marker.id}")

    # Broadcast severity + triage updates in the background
    from websocket import manager
    marker_dict = map_marker_to_feedback_out(marker).model_dump()
    marker_dict["created_at"] = marker.created_at.isoformat() if marker.created_at else None
    
    background_tasks.add_task(
        manager.broadcast,
        project_id,
        {"type": "NEW_COMMENT", "comment": marker_dict}
    )

    return map_marker_to_feedback_out(marker)

@router.get("/{session_id}/feedback", response_model=FeedbackListOut)
async def list_feedback(
    session_id: str,
    pageurl: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    request: Request = None,
    db: AsyncSession = Depends(get_db)
):
    logger = logging.getLogger("pixelmark.feedback")
    logger.info(f"[PixelMark Feedback API] list session={session_id} page={pageurl or 'all'}")

    try:
        uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid UUID format")

    # Verify session exists
    sess_res = await db.execute(select(Session).where(Session.id == session_id))
    if not sess_res.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Session not found")

    query = select(Marker).where(Marker.session_id == session_id)
    if pageurl:
        norm_url = normalize_logical_url(pageurl)
        query = query.where(Marker.page_url == norm_url)

    if status:
        query = query.where(Marker.status == status)

    # Get total
    count_query = select(func.count()).select_from(query.subquery())
    count_res = await db.execute(count_query)
    total = count_res.scalar() or 0

    # Get items
    items_query = query.order_by(Marker.created_at.desc()).offset(offset).limit(limit)
    items_res = await db.execute(items_query)
    markers = items_res.scalars().all()

    items_out = [map_marker_to_feedback_out(m) for m in markers]
    return FeedbackListOut(items=items_out, total=total)

@router.get("/{session_id}/feedback/{feedback_id}", response_model=FeedbackOut)
async def get_feedback(
    session_id: str,
    feedback_id: str,
    db: AsyncSession = Depends(get_db)
):
    try:
        uuid.UUID(session_id)
        uuid.UUID(feedback_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid UUID format")

    result = await db.execute(
        select(Marker).where(Marker.session_id == session_id, Marker.id == feedback_id)
    )
    marker = result.scalar_one_or_none()
    if not marker:
        raise HTTPException(status_code=404, detail="Feedback item not found")

    return map_marker_to_feedback_out(marker)

@router.patch("/{session_id}/feedback/{feedback_id}", response_model=FeedbackOut)
async def patch_feedback(
    session_id: str,
    feedback_id: str,
    data: FeedbackUpdate,
    db: AsyncSession = Depends(get_db)
):
    logger = logging.getLogger("pixelmark.feedback")
    logger.info(f"[PixelMark Feedback API] update session={session_id} feedback={feedback_id}")

    try:
        uuid.UUID(session_id)
        uuid.UUID(feedback_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid UUID format")

    result = await db.execute(
        select(Marker).where(Marker.session_id == session_id, Marker.id == feedback_id)
    )
    marker = result.scalar_one_or_none()
    if not marker:
        raise HTTPException(status_code=404, detail="Feedback item not found")

    update_dict = data.model_dump(exclude_none=True)
    if "status" in update_dict:
        old_status = marker.status
        new_status = update_dict["status"]
        if old_status != new_status:
            marker.status = new_status
            audit = AuditArtifact(
                id=str(uuid.uuid4()),
                session_id=session_id,
                kind="status_change",
                payload={
                    "feedback_id": feedback_id,
                    "old_status": old_status,
                    "new_status": new_status,
                    "changed_at": datetime.utcnow().isoformat()
                }
            )
            db.add(audit)
            logger.info(f"[OBSERVABILITY] [STATUS_CHANGE] Feedback ID={feedback_id} status changed from {old_status} to {new_status}")

    if "issuetype" in update_dict:
        marker.issue_type = update_dict["issuetype"]
    if "priority" in update_dict:
        marker.priority = update_dict["priority"]
    if "comment" in update_dict:
        comment_val = update_dict["comment"]
        marker.comment = comment_val
        marker.note = comment_val
        marker.description = comment_val
    if "title" in update_dict:
        marker.title = update_dict["title"]
    if "description" in update_dict:
        marker.description = update_dict["description"]

    marker.updated_at = datetime.utcnow()

    await db.commit()
    await db.refresh(marker)

    return map_marker_to_feedback_out(marker)


@router.get("/{session_id}/analytics")
async def get_session_analytics(
    session_id: str,
    db: AsyncSession = Depends(get_db)
):
    try:
        uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid UUID format")

    # Verify session exists and find its project_id
    session_res = await db.execute(select(Session).where(Session.id == session_id))
    session = session_res.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    project_id = session.project_id

    # Resolve all sessions in this project to compute project-wide metrics
    all_sessions_res = await db.execute(
        select(Session.id).where(Session.project_id == project_id)
    )
    project_session_ids = [s_id for s_id in all_sessions_res.scalars().all()]

    async def compute_metrics(s_ids: List[str]):
        # 1. Total feedback
        feedback_res = await db.execute(
            select(Marker).where(Marker.session_id.in_(s_ids))
        )
        markers = feedback_res.scalars().all()
        total_feedback = len(markers)

        # 2. Status counts
        status_counts = {"new": 0, "triaged": 0, "in_progress": 0, "resolved": 0, "dismissed": 0}
        for m in markers:
            s = m.status or "new"
            s = s.lower()
            if s == "open" or s == "submitted":
                s = "new"
            if s in status_counts:
                status_counts[s] += 1
            else:
                status_counts[s] = 1

        # 3. Issue type counts
        issue_type_counts = {"layout": 0, "copy": 0, "interaction": 0, "rendering": 0, "canvas_webgl": 0, "navigation": 0, "other": 0}
        for m in markers:
            t = m.issue_type or "other"
            t = t.lower()
            if t in issue_type_counts:
                issue_type_counts[t] += 1
            else:
                issue_type_counts[t] = 1

        # 4. Priority counts
        priority_counts = {"critical": 0, "high": 0, "medium": 0, "low": 0}
        for m in markers:
            p = m.priority
            p_val = getattr(p, "value", str(p)) if p is not None else "medium"
            p_val = p_val.lower()
            if p_val in priority_counts:
                priority_counts[p_val] += 1
            else:
                priority_counts["medium"] += 1

        # 5. Screenshot attachment rate
        screenshot_count = sum(1 for m in markers if m.screenshot_url and len(m.screenshot_url.strip()) > 0)
        screenshot_attachment_rate = screenshot_count / total_feedback if total_feedback > 0 else 0.0

        # 6. Marker creation rate (by date)
        creation_dates = {}
        for m in markers:
            if m.created_at:
                dt_str = m.created_at.strftime("%Y-%m-%d")
                creation_dates[dt_str] = creation_dates.get(dt_str, 0) + 1
        creation_rate_list = [{"date": d, "count": c} for d, c in sorted(creation_dates.items())]

        # 7. Marker deletion count
        deletion_res = await db.execute(
            select(func.count(AuditArtifact.id))
            .where(AuditArtifact.session_id.in_(s_ids), AuditArtifact.kind == "marker_deletion")
        )
        marker_deletion_count = deletion_res.scalar() or 0

        # 8. Share-link usage count
        shares_res = await db.execute(
            select(func.sum(ShareLink.use_count))
            .where(ShareLink.session_id.in_(s_ids))
        )
        share_link_usage_count = shares_res.scalar() or 0

        # 9. Reviewer session activity
        visits_res = await db.execute(
            select(PageVisit)
            .where(PageVisit.session_id.in_(s_ids), PageVisit.share_link_id != None)
        )
        reviewer_visits = visits_res.scalars().all()
        reviewer_visit_count = len(reviewer_visits)

        reviewer_pages = {}
        for v in reviewer_visits:
            url = v.page_url or "Unknown"
            reviewer_pages[url] = reviewer_pages.get(url, 0) + 1
        reviewer_active_pages = [{"page_url": u, "visit_count": c} for u, c in sorted(reviewer_pages.items(), key=lambda x: x[1], reverse=True)]

        return {
            "total_feedback": total_feedback,
            "status_counts": status_counts,
            "issue_type_counts": issue_type_counts,
            "priority_counts": priority_counts,
            "screenshot_attachment_rate": screenshot_attachment_rate,
            "marker_creation_rate": creation_rate_list,
            "marker_deletion_count": marker_deletion_count,
            "share_link_usage_count": share_link_usage_count,
            "reviewer_visit_count": reviewer_visit_count,
            "reviewer_active_pages": reviewer_active_pages
        }

    session_metrics = await compute_metrics([session_id])
    project_metrics = await compute_metrics(project_session_ids)

    logger = logging.getLogger("pixelmark.feedback")
    logger.info(f"[OBSERVABILITY] [ANALYTICS_LOADED] Loaded analytics for session={session_id} project={project_id}")

    return {
        "session_id": session_id,
        "project_id": project_id,
        "session": session_metrics,
        "project": project_metrics
    }


@router.get("/{session_id}/feedback/{feedback_id}/history")
async def get_feedback_history(
    session_id: str,
    feedback_id: str,
    db: AsyncSession = Depends(get_db)
):
    try:
        uuid.UUID(session_id)
        uuid.UUID(feedback_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid UUID format")

    result = await db.execute(
        select(Marker).where(Marker.session_id == session_id, Marker.id == feedback_id)
    )
    marker = result.scalar_one_or_none()
    if not marker:
        raise HTTPException(status_code=404, detail="Feedback item not found")

    history_res = await db.execute(
        select(AuditArtifact)
        .where(
            AuditArtifact.session_id == session_id,
            AuditArtifact.kind == "status_change"
        )
        .order_by(AuditArtifact.created_at.asc())
    )
    artifacts = history_res.scalars().all()

    history = []
    for art in artifacts:
        payload = art.payload or {}
        if payload.get("feedback_id") == feedback_id:
            history.append({
                "id": art.id,
                "old_status": payload.get("old_status"),
                "new_status": payload.get("new_status"),
                "changed_at": payload.get("changed_at") or art.created_at.isoformat()
            })

    return history


from pydantic import BaseModel

class ReportEmailRequest(BaseModel):
    email: str
    message: Optional[str] = None

@router.get("/{session_id}/report")
async def get_session_report(session_id: str, db: AsyncSession = Depends(get_db)):
    from models import Project
    try:
        uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid UUID format")

    # Fetch session
    result = await db.execute(select(Session).where(Session.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Fetch project
    proj_result = await db.execute(select(Project).where(Project.id == session.project_id))
    project = proj_result.scalar_one_or_none()
    project_name = project.name if project else "Acme Project"
    target_url = project.url if project else ""

    # Fetch markers
    markers_result = await db.execute(
        select(Marker)
        .where(Marker.session_id == session_id)
        .order_by(Marker.marker_number.asc())
    )
    markers = markers_result.scalars().all()

    critical_count = 0
    needs_work_count = 0
    approved_count = 0

    formatted_markers = []

    def map_priority(p_enum) -> str:
        val = getattr(p_enum, "value", str(p_enum)).lower()
        if val == "critical":
            return "Critical"
        elif val in ("high", "medium"):
            return "Needs Work"
        else:
            return "Looks Good"

    def map_status(s_str: str) -> str:
        s = (s_str or "open").lower()
        if s in ("resolved", "fixed"):
            return "Fixed ✓"
        elif s == "in_progress":
            return "Being Fixed"
        else:
            return "Waiting"

    def get_device(v_dict: dict) -> str:
        if not v_dict or not isinstance(v_dict, dict):
            return "Desktop"
        w = v_dict.get("width")
        if not w:
            return "Desktop"
        try:
            w_val = int(w)
            if w_val < 600:
                return "Mobile"
            elif w_val < 1024:
                return "Tablet"
            else:
                return "Desktop"
        except Exception:
            return "Desktop"

    for m in markers:
        client_prio = map_priority(m.priority)
        if client_prio == "Critical":
            critical_count += 1
        elif client_prio == "Needs Work":
            needs_work_count += 1
        else:
            approved_count += 1

        truncated_page = "Global Substrate"
        p_url = m.page_url or m.url
        if p_url:
            try:
                from urllib.parse import urlparse
                parsed_logical = urlparse(normalize_logical_url(p_url))
                truncated_page = parsed_logical.path if parsed_logical.path and parsed_logical.path != "/" else "/"
                if parsed_logical.query:
                    truncated_page += "?" + parsed_logical.query
            except Exception:
                truncated_page = p_url

        formatted_markers.append({
            "id": m.id,
            "title": m.title or "Untitled Observation",
            "description": m.description or m.comment or "",
            "priority": client_prio,
            "status": map_status(m.status),
            "page_url_truncated": truncated_page,
            "page_url": m.page_url or m.url or "",
            "screenshot_url": m.screenshot_url,
            "device": get_device(m.viewport)
        })

    # Duration calculation
    timestamps = [session.created_at]
    if session.updated_at:
        timestamps.append(session.updated_at)

    visits_res = await db.execute(
        select(PageVisit).where(PageVisit.session_id == session_id)
    )
    visits = visits_res.scalars().all()
    for v in visits:
        if v.visited_at:
            timestamps.append(v.visited_at)

    for m in markers:
        if m.created_at:
            timestamps.append(m.created_at)
        if m.updated_at:
            timestamps.append(m.updated_at)

    review_time_mins = 1
    if len(timestamps) > 1:
        diff = max(timestamps) - min(timestamps)
        review_time_mins = max(1, int(diff.total_seconds() / 60))

    from notifications import FRONTEND_URL
    share_url = f"{FRONTEND_URL}/report/{session_id}"

    return {
        "session_id": session.id,
        "session_title": session.title,
        "project_name": project_name,
        "target_url": target_url,
        "created_at": session.created_at.isoformat() if session.created_at else None,
        "share_url": share_url,
        "stats": {
            "total_issues": len(markers),
            "critical": critical_count,
            "needs_work": needs_work_count,
            "approved": approved_count,
            "review_time_mins": review_time_mins
        },
        "issues": formatted_markers
    }

@router.post("/{session_id}/send-report")
async def send_report_email(
    session_id: str,
    data: ReportEmailRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    from models import Project
    try:
        uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid UUID format")

    result = await db.execute(select(Session).where(Session.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    proj_result = await db.execute(select(Project).where(Project.id == session.project_id))
    project = proj_result.scalar_one_or_none()
    project_name = project.name if project else "Project"

    from notifications import FRONTEND_URL
    report_url = f"{FRONTEND_URL}/report/{session_id}"
    subject = f"Review Report for {project_name}"

    personal_msg_html = ""
    if data.message and data.message.strip():
        personal_msg_html = f"""
        <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.05);border-radius:12px;padding:16px;margin-bottom:24px;color:rgba(255,255,255,0.8);font-size:14px;line-height:1.6;font-style:italic;">
          "{data.message.strip()}"
        </div>
        """

    html = f"""
    <!DOCTYPE html>
    <html>
    <body style="background:#0a0a0c;color:#ffffff;font-family:system-ui,sans-serif;margin:0;padding:40px 20px;">
      <div style="max-width:560px;margin:0 auto;">
        <div style="font-family:monospace;font-size:20px;font-weight:bold;letter-spacing:4px;color:#ffffff;margin-bottom:24px;text-align:center;">
          PIXELMARK
        </div>
        <div style="background:#0f0f14;border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:32px;margin-bottom:20px;box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
          <h2 style="font-size:20px;font-weight:900;margin-top:0;margin-bottom:12px;color:#a855f7;text-transform:uppercase;letter-spacing:1px;text-align:center;">Review Report Ready</h2>
          <p style="color:rgba(255,255,255,0.6);font-size:14px;line-height:1.5;margin-bottom:24px;text-align:center;">
            A review report has been generated for <strong>{project_name}</strong> (Session: {session.title}).
          </p>
          
          {personal_msg_html}
          
          <a href="{report_url}" style="display:block;text-align:center;background:#a855f7;color:white;text-decoration:none;padding:14px 24px;border-radius:12px;font-weight:bold;font-size:14px;margin-top:16px;box-shadow:0 4px 12px rgba(168,85,247,0.3);">
            Open Review Report ✨
          </a>
        </div>
        <p style="color:rgba(255,255,255,0.2);font-size:11px;text-align:center;margin-top:24px;">
          Sent via PixelMark Visual Observability System.
        </p>
      </div>
    </body>
    </html>
    """
    from notifications import send_email
    background_tasks.add_task(send_email, data.email, subject, html)
    return {"status": "queued", "message": f"Report email queueing to {data.email}..."}



