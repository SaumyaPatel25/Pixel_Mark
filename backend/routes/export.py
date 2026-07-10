from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import PlainTextResponse, JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models import User, Session
from markers.models import Marker
from dependencies import get_db, get_current_user
import csv, io

router = APIRouter(prefix="/export", tags=["export"])

@router.get("/session/{session_id}/markdown", response_class=PlainTextResponse)
async def export_markdown(session_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    # 1. Fetch Session Info
    session_res = await db.execute(select(Session).where(Session.id == session_id))
    session = session_res.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    # 2. Fetch Markers
    markers_res = await db.execute(
        select(Marker)
        .where(Marker.session_id == session_id, Marker.is_deleted == False)
        .order_by(Marker.created_at.asc())
    )
    markers = list(markers_res.scalars().all())

    # 3. Build Markdown Report
    lines = []
    lines.append(f"# QA Review Report: {session.title or 'Untitled Session'}")
    lines.append(f"**Session ID:** `{session.id}`")
    lines.append(f"**Generated At:** {session.created_at.strftime('%Y-%m-%d %H:%M:%S') if session.created_at else 'N/A'}")
    lines.append("")
    lines.append("## Executive Summary")
    
    total = len(markers)
    open_count = sum(1 for m in markers if m.status == 'open')
    resolved_count = sum(1 for m in markers if m.status == 'resolved')
    
    lines.append(f"- **Total Markers dropped:** {total}")
    lines.append(f"- **Open Issues:** {open_count}")
    lines.append(f"- **Resolved Issues:** {resolved_count}")
    lines.append("")
    
    lines.append("## Detailed Feedback Stream")
    lines.append("")
    
    for idx, m in enumerate(markers):
        lines.append(f"### {idx + 1}. {m.title or 'Untitled Issue'} ({m.priority.upper()})")
        lines.append(f"- **Status:** `{m.status}`")
        lines.append(f"- **Creator:** {m.creator_name or 'Anonymous'} ({m.creator_role or 'Unknown Role'})")
        lines.append(f"- **Target URL:** [{m.page_url}]({m.page_url})")
        if m.target_selector:
            lines.append(f"- **CSS Selector:** `{m.target_selector}`")
        if m.renderer_type:
            lines.append(f"- **Renderer Type:** `{m.renderer_type}`")
        if m.screenshot_url:
            lines.append(f"- **Screenshot:** [View Image]({m.screenshot_url})")
        lines.append("")
        lines.append("#### Description")
        lines.append(m.description or "*No description provided.*")
        lines.append("")
        lines.append("---")
        lines.append("")
        
    return "\n".join(lines)

@router.get("/session/{session_id}/csv")
async def export_csv(session_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    markers_res = await db.execute(
        select(Marker)
        .where(Marker.session_id == session_id, Marker.is_deleted == False)
        .order_by(Marker.created_at.asc())
    )
    markers = list(markers_res.scalars().all())

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Marker Number", "ID", "Title", "Description", "Priority", 
        "Status", "Creator Name", "Creator Role", "Page URL", "Page Title", 
        "Anchor Kind", "Renderer Type", "Created At", "Screenshot URL"
    ])
    
    for idx, m in enumerate(markers):
        writer.writerow([
            idx + 1,
            m.id,
            m.title or "Untitled Issue",
            m.description or "",
            m.priority,
            m.status,
            m.creator_name or "Anonymous",
            m.creator_role or "",
            m.page_url or "",
            m.page_title or "",
            m.anchor_kind,
            m.renderer_type or "",
            m.created_at.isoformat() if m.created_at else "",
            m.screenshot_url or ""
        ])
        
    return PlainTextResponse(output.getvalue(), media_type="text/csv")

@router.get("/session/{session_id}/json")
async def export_json(session_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    markers_res = await db.execute(
        select(Marker)
        .where(Marker.session_id == session_id, Marker.is_deleted == False)
        .order_by(Marker.created_at.asc())
    )
    markers = list(markers_res.scalars().all())
    
    data = []
    for idx, m in enumerate(markers):
        data.append({
            "number": idx + 1,
            "id": m.id,
            "title": m.title,
            "description": m.description,
            "priority": m.priority,
            "status": m.status,
            "creator_name": m.creator_name,
            "creator_role": m.creator_role,
            "color_token": m.color_token,
            "anchor_kind": m.anchor_kind,
            "page_url": m.page_url,
            "page_title": m.page_title,
            "target_selector": m.target_selector,
            "target_xpath": m.target_xpath,
            "dom_text_excerpt": m.dom_text_excerpt,
            "renderer_type": m.renderer_type,
            "screenshot_url": m.screenshot_url,
            "created_at": m.created_at.isoformat() if m.created_at else None,
            "version": m.version
        })
        
    return JSONResponse(data)

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

