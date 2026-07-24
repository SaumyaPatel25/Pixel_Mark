from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.exc import IntegrityError
from models import Session, PageVisit, AuditArtifact, ShareLink, CanvasFrame, Project, OrgMember, User
from schemas import (
    SessionCreate, SessionOut, PageVisitOut, SessionRendererUpdate
)
from dependencies import get_db, get_current_user, get_current_user_optional
import uuid
from datetime import datetime, timedelta
from typing import Optional, List
from utils.ssrf_guard import is_ssrf_safe, is_domain_allowed
from routes.proxy import resolve_session_base_url, validate_public_access
import logging
from services.cache import cache
from services.notification_service import emit_session_notification

async def close_stale_sessions():
    from database import AsyncSessionLocal
    logger = logging.getLogger("stage.sessions.cleanup")
    one_min_ago = datetime.utcnow() - timedelta(seconds=60)
    
    async with AsyncSessionLocal() as db:
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
    member = org_member.scalars().first()
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
    background_tasks.add_task(close_stale_sessions)

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
        logger = logging.getLogger("stage.sessions.create")
        logger.info(f"[OBSERVABILITY] [SESSION_REUSE] Reusing active session {existing.id} for project {data.project_id}")
        try:
            from services.cache import SYSTEM_METRICS
            SYSTEM_METRICS["session_reuses"] += 1
        except Exception:
            pass
        return existing

    # 2. Enforce concurrency limits: max 3 active sessions per organization
    org_member = await db.execute(select(OrgMember).where(OrgMember.user_id == current_user.id))
    member = org_member.scalars().first()
    if member:
        active_count_res = await db.execute(
            select(func.count(Session.id))
            .join(Project, Session.project_id == Project.id)
            .where(Project.org_id == member.org_id)
            .where(Session.status == "active")
        )
        active_count = active_count_res.scalar() or 0
        if active_count >= 3:
            logger = logging.getLogger("stage.sessions.concurrency")
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

    await emit_session_notification(
        db=db,
        session_id=session.id,
        event_type="session_started",
        entity_type="session",
        entity_id=session.id,
        title=f"Session Started: {session.title}",
        body=f"New review session started for project {data.project_id}.",
        project_id=data.project_id,
        user_id=current_user.id,
        category="important"
    )
    
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
    request: Request,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db)
):
    try:
        uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid UUID format")

    if not current_user:
        share_token = request.query_params.get("share_token")
        if share_token:
            share_query = select(ShareLink).where(ShareLink.token == share_token, ShareLink.is_active == True)
            share_result = await db.execute(share_query)
            share_link = share_result.scalar_one_or_none()
            if not share_link or share_link.session_id != session_id:
                raise HTTPException(status_code=403, detail="Invalid or insufficient share token")
        else:
            raise HTTPException(status_code=401, detail="Authentication required")

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
        
    total = 0
    by_priority = {"critical": 0, "high": 0, "medium": 0, "low": 0}
    by_status = {"open": 0, "in_progress": 0, "resolved": 0}
    by_renderer = {"dom": 0, "threejs": 0, "webgl": 0, "canvas2d": 0}
            
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
    background_tasks.add_task(close_stale_sessions)
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
    logger = logging.getLogger("stage.sessions")
    logger.info(f"[OBSERVABILITY] [RENDERER_DETECTED] Deployed agent detected renderer type: {data.renderer_type} for session={session_id}. has_webgl={session.has_webgl}, has_three_js={session.has_three_js}, canvas_count={data.canvas_count}")

    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session



@router.get("/{session_id}/analytics")
async def get_session_analytics(
    session_id: str,
    db: AsyncSession = Depends(get_db)
):
    try:
        uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid UUID format")

    session_res = await db.execute(select(Session).where(Session.id == session_id))
    session = session_res.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    project_id = session.project_id

    async def compute_metrics(s_ids: List[str]):
        from sqlalchemy import func
        from markers.models import Marker
        from models.core import Session as DbSession
        
        # If s_ids is empty, compute project-level metrics across all sessions in project_id
        if not s_ids:
            session_ids_res = await db.execute(select(DbSession.id).where(DbSession.project_id == project_id))
            s_ids = [str(r) for r in session_ids_res.scalars().all()]
            
        if not s_ids:
            return {
                "total_feedback": 0,
                "status_counts": {"new": 0, "triaged": 0, "in_progress": 0, "resolved": 0, "dismissed": 0},
                "issue_type_counts": {"layout": 0, "copy": 0, "interaction": 0, "rendering": 0, "canvas_webgl": 0, "navigation": 0, "other": 0},
                "priority_counts": {"critical": 0, "high": 0, "medium": 0, "low": 0},
                "screenshot_attachment_rate": 0.0,
                "marker_creation_rate": [],
                "marker_deletion_count": 0,
                "share_link_usage_count": 0,
                "reviewer_visit_count": 0,
                "reviewer_active_pages": []
            }
            
        # Get active markers
        result = await db.execute(
            select(Marker).where(Marker.session_id.in_(s_ids), Marker.is_deleted == False)
        )
        markers = list(result.scalars().all())
        
        # Get deleted count
        del_result = await db.execute(
            select(func.count(Marker.id)).where(Marker.session_id.in_(s_ids), Marker.is_deleted == True)
        )
        marker_deletion_count = del_result.scalar() or 0
        
        status_counts = {"new": 0, "triaged": 0, "in_progress": 0, "resolved": 0, "dismissed": 0}
        issue_type_counts = {"layout": 0, "copy": 0, "interaction": 0, "rendering": 0, "canvas_webgl": 0, "navigation": 0, "other": 0}
        priority_counts = {"critical": 0, "high": 0, "medium": 0, "low": 0}
        
        screenshot_count = 0
        for m in markers:
            # Map canonical marker status (open, resolved) to legacy status
            status_val = m.status or "open"
            if status_val == "open":
                status_counts["new"] += 1
            elif status_val == "resolved":
                status_counts["resolved"] += 1
            else:
                status_counts[status_val] = status_counts.get(status_val, 0) + 1
                
            # Map renderer_type to issue_type
            if m.renderer_type in ("webgl", "threejs", "canvas2d"):
                issue_type_counts["canvas_webgl"] += 1
            else:
                issue_type_counts["layout"] += 1
                
            if m.priority in priority_counts:
                priority_counts[m.priority] += 1
                
            if m.screenshot_url:
                screenshot_count += 1
                
        total_feedback = len(markers)
        screenshot_rate = (screenshot_count / total_feedback) if total_feedback > 0 else 0.0
        
        return {
            "total_feedback": total_feedback,
            "status_counts": status_counts,
            "issue_type_counts": issue_type_counts,
            "priority_counts": priority_counts,
            "screenshot_attachment_rate": screenshot_rate,
            "marker_creation_rate": [],
            "marker_deletion_count": marker_deletion_count,
            "share_link_usage_count": 0,
            "reviewer_visit_count": 0,
            "reviewer_active_pages": []
        }

    session_metrics = await compute_metrics([session_id])
    project_metrics = await compute_metrics([])

    return {
        "session_id": session_id,
        "project_id": project_id,
        "session": session_metrics,
        "project": project_metrics
    }


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

    markers = []

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
          STAGE
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
          Sent via STAGE Visual Observability System.
        </p>
      </div>
    </body>
    </html>
    """
    from notifications import send_email
    background_tasks.add_task(send_email, data.email, subject, html)
    return {"status": "queued", "message": f"Report email queueing to {data.email}..."}



