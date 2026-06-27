from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.exc import IntegrityError
from models import Session, PageVisit, Marker, AuditArtifact, ShareLink, CanvasFrame
from schemas import (
    SessionCreate, SessionOut, PageVisitOut, SessionRendererUpdate,
    FeedbackCreate, FeedbackUpdate, FeedbackOut, FeedbackListOut
)
from dependencies import get_db
import uuid
from datetime import datetime
from typing import Optional, List
from utils.ssrf_guard import is_ssrf_safe, is_domain_allowed
from routes.proxy import resolve_session_base_url, validate_public_access
import logging


router = APIRouter(prefix="/sessions", tags=["sessions"])

@router.post("/", response_model=SessionOut)
async def create_session(data: SessionCreate, db: AsyncSession = Depends(get_db)):
    title = data.title
    if not title or not title.strip():
        # Auto-title logic
        title = f"Session - {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')}"
    
    session = Session(id=str(uuid.uuid4()), project_id=data.project_id, title=title)
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
    
    return session

@router.get("/project/{project_id}", response_model=list[SessionOut])
async def list_sessions(project_id: str, db: AsyncSession = Depends(get_db)):
    try:
        uuid.UUID(project_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid UUID format")

    result = await db.execute(select(Session).where(Session.project_id == project_id))
    return result.scalars().all()

@router.get("/{session_id}", response_model=SessionOut)
async def get_session(session_id: str, db: AsyncSession = Depends(get_db)):
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
async def delete_session(session_id: str, db: AsyncSession = Depends(get_db)):
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
    return {"deleted": True}

@router.get("/{session_id}/stats")
async def get_session_stats(session_id: str, db: AsyncSession = Depends(get_db)):
    try:
        uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid UUID format")
        
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
    
    return {
        "total": total,
        "by_priority": by_priority,
        "by_status": by_status,
        "by_renderer": by_renderer,
        "pages_visited": session.pages_visited or 0,
        "unique_pages": unique_pages
    }

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


