from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from models import Marker, Session, User
from schemas import MarkerCreate, MarkerUpdate, MarkerOut
from dependencies import get_db, get_current_user
import uuid
import base64
from websocket import manager

router = APIRouter(prefix="/markers", tags=["markers"])

@router.post("/", response_model=MarkerOut)
async def create_marker(
    data: MarkerCreate, 
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    session_id = data.session_id
    if not session_id:
        if not data.project_id:
            raise HTTPException(status_code=422, detail="Either session_id or project_id must be provided")
        
        # Resolve or create a default session for this project_id
        result = await db.execute(
            select(Session).where(Session.project_id == data.project_id).order_by(Session.created_at.desc())
        )
        session = result.scalars().first()
        if not session:
            session = Session(
                id=str(uuid.uuid4()),
                project_id=data.project_id,
                title="Default Audit Session"
            )
            db.add(session)
            await db.commit()
            await db.refresh(session)
        session_id = session.id
    else:
        try:
            uuid.UUID(session_id)
        except ValueError:
            raise HTTPException(status_code=422, detail="Invalid UUID format")
            
        result = await db.execute(select(Session).where(Session.id == session_id))
        session = result.scalar_one_or_none()
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

    # Auto-increment marker_number within the session
    num_result = await db.execute(
        select(func.max(Marker.marker_number)).where(Marker.session_id == session_id)
    )
    max_num = num_result.scalar()
    marker_number = (max_num or 0) + 1

    marker_data = data.model_dump()
    marker_data["session_id"] = session_id
    marker_data["marker_number"] = marker_number
    if "project_id" in marker_data:
        del marker_data["project_id"]

    marker = Marker(id=str(uuid.uuid4()), **marker_data)
    db.add(marker)
    await db.commit()
    await db.refresh(marker)

    # Prepare serializable dict
    marker_dict = {
        "id": str(marker.id),
        "session_id": str(marker.session_id),
        "title": marker.title,
        "description": marker.description,
        "url": marker.url,
        "page_url": marker.page_url,
        "page_title": marker.page_title,
        "renderer_type": marker.renderer_type,
        "canvas_context": marker.canvas_context,
        "marker_number": marker.marker_number,
        "agent_version": marker.agent_version,
        "xpath": marker.xpath,
        "css_selector": marker.css_selector,
        "inner_text": marker.inner_text,
        "viewport": marker.viewport,
        "browser": marker.browser,
        "os": marker.os,
        "scroll_position": marker.scroll_position,
        "console_errors": marker.console_errors,
        "network_errors": marker.network_errors,
        "screenshot_url": marker.screenshot_url,
        "priority": getattr(marker.priority, "value", str(marker.priority)),
        "status": getattr(marker.status, "value", str(marker.status)),
        "ai_summary": marker.ai_summary,
        "created_at": marker.created_at.isoformat() if marker.created_at else None
    }

    # Broadcast severity + triage updates in the background
    background_tasks.add_task(
        manager.broadcast,
        session.project_id,
        {"type": "NEW_COMMENT", "comment": marker_dict}
    )

    return marker

@router.post("/{marker_id}/screenshot", response_model=MarkerOut)
async def upload_marker_screenshot(
    marker_id: str,
    screenshot: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    try:
        uuid.UUID(marker_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid UUID format")
        
    result = await db.execute(select(Marker).where(Marker.id == marker_id))
    marker = result.scalar_one_or_none()
    if not marker:
        raise HTTPException(status_code=404, detail="Marker not found")
        
    if screenshot.content_type not in ("image/png", "image/jpeg"):
        raise HTTPException(status_code=400, detail="Invalid image format. Only PNG or JPEG are allowed.")
        
    contents = await screenshot.read()
    base64_data = base64.b64encode(contents).decode("utf-8")
    data_url = f"data:{screenshot.content_type};base64,{base64_data}"
    
    marker.screenshot_url = data_url
    await db.commit()
    await db.refresh(marker)
    return marker

@router.get("/session/{session_id}", response_model=list[MarkerOut])
async def list_markers(session_id: str, db: AsyncSession = Depends(get_db)):
    try:
        uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid UUID format")

    result = await db.execute(select(Marker).where(Marker.session_id == session_id))
    return result.scalars().all()

@router.get("/session/{session_id}/by-page")
async def list_markers_by_page(session_id: str, db: AsyncSession = Depends(get_db)):
    try:
        uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid UUID format")
        
    result = await db.execute(select(Marker).where(Marker.session_id == session_id))
    markers = result.scalars().all()
    
    grouped = {}
    for m in markers:
        url = m.page_url or "Unknown Page"
        if url not in grouped:
            grouped[url] = {
                "page_url": url,
                "page_title": m.page_title or "Untitled Page",
                "marker_count": 0,
                "markers": []
            }
        grouped[url]["markers"].append({
            "id": str(m.id),
            "session_id": str(m.session_id),
            "title": m.title,
            "description": m.description,
            "url": m.url,
            "page_url": m.page_url,
            "page_title": m.page_title,
            "renderer_type": m.renderer_type,
            "canvas_context": m.canvas_context,
            "marker_number": m.marker_number,
            "agent_version": m.agent_version,
            "xpath": m.xpath,
            "css_selector": m.css_selector,
            "inner_text": m.inner_text,
            "viewport": m.viewport,
            "browser": m.browser,
            "os": m.os,
            "scroll_position": m.scroll_position,
            "console_errors": m.console_errors,
            "network_errors": m.network_errors,
            "screenshot_url": m.screenshot_url,
            "priority": getattr(m.priority, "value", str(m.priority)),
            "status": getattr(m.status, "value", str(m.status)),
            "ai_summary": m.ai_summary,
            "created_at": m.created_at.isoformat() if m.created_at else None
        })
        grouped[url]["marker_count"] += 1
        
    return {"pages": list(grouped.values())}

@router.get("/project/{project_id}", response_model=list[MarkerOut])
async def list_project_markers(project_id: str, db: AsyncSession = Depends(get_db)):
    try:
        uuid.UUID(project_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid UUID format")

    result = await db.execute(
        select(Marker)
        .join(Session)
        .where(Session.project_id == project_id)
    )
    return result.scalars().all()

@router.get("/{marker_id}", response_model=MarkerOut)
async def get_marker(marker_id: str, db: AsyncSession = Depends(get_db)):
    try:
        uuid.UUID(marker_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid UUID format")

    result = await db.execute(select(Marker).where(Marker.id == marker_id))
    marker = result.scalar_one_or_none()
    if not marker:
        raise HTTPException(status_code=404, detail="Marker not found")
    return marker

@router.patch("/{marker_id}", response_model=MarkerOut)
async def update_marker(marker_id: str, data: MarkerUpdate, db: AsyncSession = Depends(get_db)):
    try:
        uuid.UUID(marker_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid UUID format")

    result = await db.execute(select(Marker).where(Marker.id == marker_id))
    marker = result.scalar_one_or_none()
    if not marker:
        raise HTTPException(status_code=404, detail="Marker not found")
    
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(marker, field, value)
    await db.commit()
    await db.refresh(marker)
    return marker

@router.delete("/{marker_id}")
async def delete_marker(marker_id: str, db: AsyncSession = Depends(get_db)):
    try:
        uuid.UUID(marker_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid UUID format")

    result = await db.execute(select(Marker).where(Marker.id == marker_id))
    marker = result.scalar_one_or_none()
    if not marker:
        raise HTTPException(status_code=404, detail="Marker not found")
    await db.delete(marker)
    await db.commit()
    return {"deleted": True}
