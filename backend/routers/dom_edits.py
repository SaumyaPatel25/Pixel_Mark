from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi.responses import PlainTextResponse, JSONResponse
from typing import List, Dict
from datetime import datetime
import uuid

from models import DOMEdit, Session, Project, ShareLink
from schemas import DOMEditCreate, DOMEditRead
from dependencies import get_db

router = APIRouter(tags=["dom_edits"])

async def verify_dom_edit_access(session_id: str, request: Request, db: AsyncSession, require_owner: bool = False):
    # Fetch session first to ensure it exists
    session_result = await db.execute(select(Session).where(Session.id == session_id))
    sess = session_result.scalar_one_or_none()
    if not sess:
        raise HTTPException(status_code=404, detail="Session not found")

    # Try resolving user from Auth token first if present
    user_id = None
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        try:
            from auth import decode_token
            payload = decode_token(token)
            user_id = payload.get("sub")
        except Exception:
            pass

    # Check if user is owner of the session's project
    if user_id:
        from models import OrgMember
        proj_result = await db.execute(select(Project).where(Project.id == sess.project_id))
        proj = proj_result.scalar_one_or_none()
        if proj:
            member_result = await db.execute(
                select(OrgMember).where(
                    OrgMember.org_id == proj.org_id,
                    OrgMember.user_id == user_id
                )
            )
            if member_result.scalars().first():
                return sess, user_id # Owner access granted

    if require_owner:
        raise HTTPException(status_code=403, detail="Owner access required")

    # Check share token if not owner and require_owner is False
    share_token = request.query_params.get("share_token") or request.headers.get("X-Share-Token")
    if share_token:
        share_query = select(ShareLink).where(ShareLink.token == share_token)
        share_result = await db.execute(share_query)
        share_link = share_result.scalar_one_or_none()
        if not share_link or not share_link.is_active or not share_link.can_comment or share_link.session_id != session_id:
            raise HTTPException(status_code=403, detail="Invalid or insufficient share token")
            
        return sess, None # Share access granted

    raise HTTPException(status_code=401, detail="Authentication required")

@router.post("/sessions/{session_id}/dom-edits", response_model=DOMEditRead)
async def create_dom_edit(session_id: str, edit: DOMEditCreate, request: Request, db: AsyncSession = Depends(get_db)):
    sess, user_id = await verify_dom_edit_access(session_id, request, db, require_owner=False)
    
    # Cap history growth: check for existing record matching selector + property + page_url
    query = select(DOMEdit).where(
        DOMEdit.session_id == session_id,
        DOMEdit.selector == edit.selector,
        DOMEdit.property == edit.property,
        DOMEdit.page_url == edit.page_url
    )
    result = await db.execute(query)
    existing_edit = result.scalars().first()

    if existing_edit:
        existing_edit.new_value = edit.new_value
        await db.commit()
        await db.refresh(existing_edit)
        return existing_edit

    new_edit = DOMEdit(
        session_id=session_id,
        selector=edit.selector,
        xpath=edit.xpath,
        property=edit.property,
        old_value=edit.old_value,
        new_value=edit.new_value,
        element_tag=edit.element_tag,
        element_text=edit.element_text,
        page_url=edit.page_url,
        created_by=edit.created_by or user_id
    )
    db.add(new_edit)
    await db.commit()
    await db.refresh(new_edit)
    return new_edit

@router.post("/sessions/{session_id}/dom-edits/bulk", response_model=List[DOMEditRead])
async def create_dom_edits_bulk(session_id: str, edits: List[DOMEditCreate], request: Request, db: AsyncSession = Depends(get_db)):
    sess, user_id = await verify_dom_edit_access(session_id, request, db, require_owner=False)
    
    new_edits = []
    for edit in edits:
        new_edit = DOMEdit(
            session_id=session_id,
            selector=edit.selector,
            xpath=edit.xpath,
            property=edit.property,
            old_value=edit.old_value,
            new_value=edit.new_value,
            element_tag=edit.element_tag,
            element_text=edit.element_text,
            page_url=edit.page_url,
            created_by=edit.created_by or user_id
        )
        db.add(new_edit)
        new_edits.append(new_edit)
        
    await db.commit()
    for edit in new_edits:
        await db.refresh(edit)
    return new_edits

@router.get("/sessions/{session_id}/dom-edits", response_model=Dict[str, List[DOMEditRead]])
async def list_dom_edits(session_id: str, request: Request, db: AsyncSession = Depends(get_db)):
    sess, _ = await verify_dom_edit_access(session_id, request, db, require_owner=False)
    
    result = await db.execute(select(DOMEdit).where(DOMEdit.session_id == session_id))
    edits = result.scalars().all()
    
    grouped = {}
    for edit in edits:
        url = edit.page_url
        if url not in grouped:
            grouped[url] = []
        grouped[url].append(edit)
    return grouped

@router.delete("/sessions/{session_id}/dom-edits/{edit_id}")
async def delete_dom_edit(session_id: str, edit_id: str, request: Request, db: AsyncSession = Depends(get_db)):
    sess, _ = await verify_dom_edit_access(session_id, request, db, require_owner=True)
    
    # Try parsing edit_id as UUID first
    try:
        uuid_edit_id = uuid.UUID(edit_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid edit ID format")

    result = await db.execute(select(DOMEdit).where(DOMEdit.id == uuid_edit_id, DOMEdit.session_id == session_id))
    edit = result.scalar_one_or_none()
    
    if not edit:
        raise HTTPException(status_code=404, detail="DOM edit not found")
        
    await db.delete(edit)
    await db.commit()
    return {"status": "success"}

@router.delete("/sessions/{session_id}/dom-edits")
async def delete_all_dom_edits(session_id: str, request: Request, db: AsyncSession = Depends(get_db)):
    sess, _ = await verify_dom_edit_access(session_id, request, db, require_owner=True)
    
    result = await db.execute(select(DOMEdit).where(DOMEdit.session_id == session_id))
    edits = result.scalars().all()
    
    for edit in edits:
        await db.delete(edit)
    await db.commit()
    return {"status": "success", "deleted_count": len(edits)}

def is_unstable_selector(selector: str) -> bool:
    if not selector:
        return False
    return ":nth-child" in selector or ":nth-of-type" in selector or selector.count(">") >= 4

# 1. Extended CSS Export
@router.get("/sessions/{session_id}/dom-edits/export/css")
async def export_dom_edits_css(session_id: str, request: Request, db: AsyncSession = Depends(get_db)):
    sess, _ = await verify_dom_edit_access(session_id, request, db, require_owner=False)
    
    result = await db.execute(select(DOMEdit).where(DOMEdit.session_id == session_id))
    edits = result.scalars().all()
    
    grouped = {}
    for edit in edits:
        url = edit.page_url or 'Global'
        if url not in grouped:
            grouped[url] = []
        grouped[url].append(edit)
        
    css_lines = [f"/* PixelMark DOM Edit Export — Session: {sess.title} */", ""]
    for url, page_edits in grouped.items():
        css_lines.append(f"/* Page: {url} */")
        for edit in page_edits:
            unstable = is_unstable_selector(edit.selector)
            if unstable:
                css_lines.append("/* WARNING: Unstable selector detected — verify stability before production deploy */")
            css_lines.append(f"{edit.selector} {{")
            css_lines.append(f"  {edit.property}: {edit.new_value}; /* was: {edit.old_value or '-'} */")
            css_lines.append("}\n")
            
    css_content = "\n".join(css_lines)
    return PlainTextResponse(
        content=css_content,
        media_type="text/css",
        headers={"Content-Disposition": f"attachment; filename=session_{session_id}_edits.css"}
    )

# 2. Markdown Export
@router.get("/sessions/{session_id}/dom-edits/export/markdown")
async def export_dom_edits_markdown(session_id: str, request: Request, db: AsyncSession = Depends(get_db)):
    sess, _ = await verify_dom_edit_access(session_id, request, db, require_owner=False)
    
    result = await db.execute(select(DOMEdit).where(DOMEdit.session_id == session_id))
    edits = result.scalars().all()
    
    grouped = {}
    for edit in edits:
        url = edit.page_url or 'Global'
        if url not in grouped:
            grouped[url] = []
        grouped[url].append(edit)
        
    md_lines = [
        f"# PixelMark Style Edits Summary",
        f"**Session:** {sess.title}  ",
        f"**Exported:** {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}  ",
        f"**Total Edits:** {len(edits)}",
        ""
    ]
    
    for url, page_edits in grouped.items():
        md_lines.append(f"## Page: {url}")
        md_lines.append("")
        md_lines.append("| Selector | Property | Original Value | New Value | Notes |")
        md_lines.append("|---|---|---|---|---|")
        for edit in page_edits:
            unstable = is_unstable_selector(edit.selector)
            note = "⚠️ **Unstable Selector**" if unstable else "OK"
            md_lines.append(f"| `{edit.selector}` | `{edit.property}` | `{edit.old_value or '-'}` | `{edit.new_value}` | {note} |")
        md_lines.append("")
        
    md_content = "\n".join(md_lines)
    return PlainTextResponse(
        content=md_content,
        media_type="text/markdown",
        headers={"Content-Disposition": f"attachment; filename=session_{session_id}_edits.md"}
    )

# 3. JSON Export
@router.get("/sessions/{session_id}/dom-edits/export/json")
async def export_dom_edits_json(session_id: str, request: Request, db: AsyncSession = Depends(get_db)):
    sess, _ = await verify_dom_edit_access(session_id, request, db, require_owner=False)
    
    result = await db.execute(select(DOMEdit).where(DOMEdit.session_id == session_id))
    edits = result.scalars().all()
    
    grouped = {}
    for edit in edits:
        url = edit.page_url or 'Global'
        if url not in grouped:
            grouped[url] = []
        grouped[url].append({
            "id": edit.id,
            "selector": edit.selector,
            "elementTag": edit.element_tag,
            "property": edit.property,
            "oldValue": edit.old_value,
            "newValue": edit.new_value,
            "isUnstableSelector": is_unstable_selector(edit.selector),
            "createdAt": edit.created_at.isoformat() if edit.created_at else None
        })
        
    pages_list = [{"pageUrl": url, "edits": page_edits} for url, page_edits in grouped.items()]
    
    export_payload = {
        "sessionId": session_id,
        "sessionTitle": sess.title,
        "exportTimestamp": datetime.utcnow().isoformat() + "Z",
        "totalEdits": len(edits),
        "pages": pages_list
    }
    
    return JSONResponse(
        content=export_payload,
        headers={"Content-Disposition": f"attachment; filename=session_{session_id}_edits.json"}
    )

# 4. AI_IMPLEMENTATION.md Export
@router.get("/sessions/{session_id}/dom-edits/export/ai-implementation")
async def export_dom_edits_ai_implementation(session_id: str, request: Request, db: AsyncSession = Depends(get_db)):
    sess, _ = await verify_dom_edit_access(session_id, request, db, require_owner=False)
    
    result = await db.execute(select(DOMEdit).where(DOMEdit.session_id == session_id))
    edits = result.scalars().all()
    
    grouped = {}
    for edit in edits:
        url = edit.page_url or 'Global'
        if url not in grouped:
            grouped[url] = []
        grouped[url].append(edit)
        
    ai_lines = [
        "# AI_IMPLEMENTATION.md — PixelMark DOM Editing Implementation Guide",
        "",
        "> **Developer & AI Assistant Note:**",
        "> This document is automatically generated by PixelMark DOM Editing Mode. It describes human-reviewed design adjustments",
        "> made directly on the live site UI. Pass this file to your developer or AI coding agent (e.g. Cursor, Antigravity, GitHub Copilot)",
        "> to apply these CSS changes cleanly in source code.",
        "",
        f"**Session:** {sess.title}  ",
        f"**Total Adjustments:** {len(edits)}",
        ""
    ]
    
    for url, page_edits in grouped.items():
        ai_lines.append(f"## Page: {url}")
        ai_lines.append("")
        for idx, edit in enumerate(page_edits, 1):
            tag = f"<{edit.element_tag}>" if edit.element_tag else "element"
            old_str = f"from `{edit.old_value}` " if edit.old_value else ""
            desc = f"Updated `{edit.property}` of {tag} {old_str}to `{edit.new_value}`."
            
            ai_lines.append(f"### Adjustment #{idx}: {tag} `{edit.property}`")
            ai_lines.append(f"- **Description:** {desc}")
            ai_lines.append(f"- **Target Selector:** `{edit.selector}`")
            
            if is_unstable_selector(edit.selector):
                ai_lines.append(f"- ⚠️ **Warning:** Unstable selector detected (`:nth-child` or deep hierarchy). Replace with a semantic class or id in source code.")
                
            ai_lines.append("")
            ai_lines.append("```css")
            ai_lines.append(f"{edit.selector} {{")
            ai_lines.append(f"  {edit.property}: {edit.new_value};")
            ai_lines.append("}")
            ai_lines.append("```")
            ai_lines.append("")
            
    ai_content = "\n".join(ai_lines)
    return PlainTextResponse(
        content=ai_content,
        media_type="text/markdown",
        headers={"Content-Disposition": f"attachment; filename=AI_IMPLEMENTATION_{session_id}.md"}
    )
