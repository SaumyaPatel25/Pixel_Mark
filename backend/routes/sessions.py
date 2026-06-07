from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from models import Session, PageVisit, Marker
from schemas import SessionCreate, SessionOut, PageVisitOut, SessionRendererUpdate
from dependencies import get_db
import uuid
from datetime import datetime

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

