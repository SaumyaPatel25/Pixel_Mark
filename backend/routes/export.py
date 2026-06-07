from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import PlainTextResponse, JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models import Marker, User, Session
from dependencies import get_db, get_current_user
import csv, io

router = APIRouter(prefix="/export", tags=["export"])

@router.get("/session/{session_id}/markdown", response_class=PlainTextResponse)
async def export_markdown(session_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Marker).where(Marker.session_id == session_id).order_by(Marker.marker_number.asc()))
    markers = result.scalars().all()
    
    # Group markers by page_url or url
    grouped = {}
    for m in markers:
        url = m.page_url or m.url or "Unknown Page"
        if url not in grouped:
            grouped[url] = []
        grouped[url].append(m)
        
    lines = [f"# QA Report — Session {session_id}\n"]
    for url, list_markers in grouped.items():
        title = list_markers[0].page_title or "Untitled Page"
        renderer = list_markers[0].renderer_type or "dom"
        lines.append(f"## Page: {title}")
        lines.append(f"- **URL:** {url}")
        lines.append(f"- **Renderer: {renderer.upper()}**")
        lines.append("---")
        lines.append("")
        
        for m in list_markers:
            lines.append(f"### #{m.marker_number or 0} [{m.priority.upper()}] {m.title or 'Untitled'}")
            lines.append(f"- **Status:** {m.status}")
            lines.append(f"- **Browser:** {m.browser or 'N/A'} | **Viewport:** {m.viewport}")
            lines.append(f"- **XPath:** `{m.xpath or 'N/A'}`")
            lines.append(f"- **CSS Selector:** `{m.css_selector or 'N/A'}`")
            lines.append(f"- **Description:** {m.description or 'No description'}")
            if m.canvas_context:
                lines.append(f"- **Canvas Context:** {m.canvas_context}")
            if m.is_inside_shadow_dom:
                lines.append(f"- **Shadow DOM: Yes** (Depth: {m.shadow_root_depth or 1})")
                if m.shadow_host_tag:
                    host_str = m.shadow_host_tag
                    if m.shadow_host_id:
                        host_str += f"#{m.shadow_host_id}"
                    lines.append(f"- **Shadow Host: `{host_str}`**")
                if m.shadow_path:
                    lines.append(f"- **Shadow Path: `{m.shadow_path}`**")
            if m.console_errors:
                lines.append(f"- **Console Errors:** {m.console_errors}")
            lines.append("")
    return "\n".join(lines)

@router.get("/session/{session_id}/csv")
async def export_csv(session_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Marker).where(Marker.session_id == session_id).order_by(Marker.marker_number.asc()))
    markers = result.scalars().all()
    output = io.StringIO()
    writer = csv.writer(output)
    # Header columns supporting stable backward compatibility + new fields
    writer.writerow([
        "ID","Title","Priority","Status","URL","Browser","XPath","CSS Selector","Description","Created At",
        "Page URL","Page Title","Renderer Type","Marker Number","Canvas Context","Screenshot URL",
        "Is Inside Shadow DOM","Shadow Root Depth","Shadow Host Tag","Shadow Host ID","Shadow Host Class List","Shadow Path"
    ])
    for m in markers:
        writer.writerow([
            m.id, m.title, m.priority, m.status, m.url, m.browser, m.xpath, m.css_selector, m.description, m.created_at,
            m.page_url, m.page_title, m.renderer_type, m.marker_number, str(m.canvas_context) if m.canvas_context else "", m.screenshot_url,
            "true" if m.is_inside_shadow_dom else "false",
            m.shadow_root_depth if m.shadow_root_depth is not None else "",
            m.shadow_host_tag or "",
            m.shadow_host_id or "",
            str(m.shadow_host_class_list) if m.shadow_host_class_list else "",
            m.shadow_path or ""
        ])
    return PlainTextResponse(output.getvalue(), media_type="text/csv")

@router.get("/session/{session_id}/json")
async def export_json(session_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Marker).where(Marker.session_id == session_id).order_by(Marker.marker_number.asc()))
    markers = result.scalars().all()
    return JSONResponse([
        {
            "id": m.id, 
            "title": m.title, 
            "priority": m.priority, 
            "status": m.status,
            "url": m.url, 
            "page_url": m.page_url,
            "page_title": m.page_title,
            "renderer_type": m.renderer_type,
            "canvas_context": m.canvas_context,
            "marker_number": m.marker_number,
            "screenshot_url": m.screenshot_url,
            "xpath": m.xpath, 
            "css_selector": m.css_selector,
            "browser": m.browser, 
            "viewport": m.viewport, 
            "description": m.description,
            "is_inside_shadow_dom": m.is_inside_shadow_dom,
            "shadow_root_depth": m.shadow_root_depth,
            "shadow_host_tag": m.shadow_host_tag,
            "shadow_host_id": m.shadow_host_id,
            "shadow_host_class_list": m.shadow_host_class_list,
            "shadow_path": m.shadow_path,
            "created_at": m.created_at.isoformat() if m.created_at else None
        }
        for m in markers
    ])

@router.get("")
@router.get("/")
async def export_by_project_query(
    project_id: str = Query(...),
    format: str = Query("markdown"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Find the latest session for this project
    session_result = await db.execute(
        select(Session)
        .where(Session.project_id == project_id)
        .order_by(Session.created_at.desc())
        .limit(1)
    )
    session = session_result.scalar_one_or_none()
    if not session:
        # Create a default session so the export has a target
        import uuid
        session = Session(id=str(uuid.uuid4()), project_id=project_id, title="Initial Audit Session")
        db.add(session)
        await db.commit()
        await db.refresh(session)
        
    if format == "csv":
        return await export_csv(session.id, db, current_user)
    elif format == "json":
        return await export_json(session.id, db, current_user)
    else:
        markdown_text = await export_markdown(session.id, db, current_user)
        return PlainTextResponse(markdown_text)
