from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi.responses import PlainTextResponse
from typing import List, Dict
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
            if member_result.scalar_one_or_none():
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

@router.get("/sessions/{session_id}/dom-edits/export/css")
async def export_dom_edits_css(session_id: str, request: Request, db: AsyncSession = Depends(get_db)):
    sess, _ = await verify_dom_edit_access(session_id, request, db, require_owner=True)
    
    result = await db.execute(select(DOMEdit).where(DOMEdit.session_id == session_id))
    edits = result.scalars().all()
    
    grouped = {}
    for edit in edits:
        url = edit.page_url
        if url not in grouped:
            grouped[url] = []
        grouped[url].append(edit)
        
    css_lines = [f"/* PixelMark DOM Edit Export — Session: {sess.title} */"]
    for url, page_edits in grouped.items():
        css_lines.append(f"/* Page: {url} */")
        for edit in page_edits:
            css_lines.append(f"{edit.selector} {{")
            css_lines.append(f"  {edit.property}: {edit.new_value}; /* was: {edit.old_value} */")
            css_lines.append("}")
            
    css_content = "\n".join(css_lines)
    return PlainTextResponse(
        content=css_content,
        media_type="text/css",
        headers={"Content-Disposition": f"attachment; filename=session_{session_id}_edits.css"}
    )
