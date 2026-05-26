from fastapi import APIRouter, Depends
from fastapi.responses import PlainTextResponse, JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models import Marker
from dependencies import get_db
import csv, io

router = APIRouter(prefix="/export", tags=["export"])

@router.get("/session/{session_id}/markdown", response_class=PlainTextResponse)
async def export_markdown(session_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Marker).where(Marker.session_id == session_id))
    markers = result.scalars().all()
    lines = [f"# QA Report — Session {session_id}\n"]
    for i, m in enumerate(markers, 1):
        lines.append(f"## [{m.priority.upper()}] Marker {i}: {m.title or 'Untitled'}")
        lines.append(f"**Status:** {m.status}")
        lines.append(f"**URL:** {m.url or 'N/A'}")
        lines.append(f"**Browser:** {m.browser or 'N/A'} | **Viewport:** {m.viewport}")
        lines.append(f"**XPath:** `{m.xpath or 'N/A'}`")
        lines.append(f"**CSS Selector:** `{m.css_selector or 'N/A'}`")
        lines.append(f"**Description:** {m.description or 'No description'}")
        if m.console_errors:
            lines.append(f"**Console Errors:** {m.console_errors}")
        lines.append("")
    return "\n".join(lines)

@router.get("/session/{session_id}/csv")
async def export_csv(session_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Marker).where(Marker.session_id == session_id))
    markers = result.scalars().all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID","Title","Priority","Status","URL","Browser","XPath","CSS Selector","Description","Created At"])
    for m in markers:
        writer.writerow([m.id, m.title, m.priority, m.status, m.url, m.browser, m.xpath, m.css_selector, m.description, m.created_at])
    return PlainTextResponse(output.getvalue(), media_type="text/csv")

@router.get("/session/{session_id}/json")
async def export_json(session_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Marker).where(Marker.session_id == session_id))
    markers = result.scalars().all()
    return [
        {"id": m.id, "title": m.title, "priority": m.priority, "status": m.status,
         "url": m.url, "xpath": m.xpath, "css_selector": m.css_selector,
         "browser": m.browser, "viewport": m.viewport, "description": m.description}
        for m in markers
    ]
