from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, UploadFile, File, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from models import Marker, Session, User, ShareLink, AuditArtifact, Project, OrgMember
from schemas import MarkerCreate, MarkerUpdate, MarkerOut
from dependencies import get_db, get_current_user
import uuid
import base64
from websocket import manager
from datetime import datetime, timedelta

router = APIRouter(prefix="/markers", tags=["markers"])

@router.get("/", response_model=list[MarkerOut])
async def list_all_markers(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    org_member = await db.execute(select(OrgMember).where(OrgMember.user_id == current_user.id))
    member = org_member.scalar_one_or_none()
    if not member:
        return []
    
    result = await db.execute(
        select(Marker)
        .join(Session, Marker.session_id == Session.id)
        .join(Project, Session.project_id == Project.id)
        .where(Project.org_id == member.org_id)
    )
    return result.scalars().all()

@router.post("/", response_model=MarkerOut)
async def create_marker(
    data: MarkerCreate, 
    background_tasks: BackgroundTasks,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    import logging
    logger = logging.getLogger("pixelmark.markers")
    trace_id = request.headers.get("x-request-id") or uuid.uuid4().hex[:8]
    logger.info(f"[OBSERVABILITY] [MARKER_CREATE] [TRACE={trace_id}] Received marker creation request. session={data.session_id}, url={data.page_url}")

    try:
        session_id = data.session_id
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
        if data.share_token:
            share_query = select(ShareLink).where(ShareLink.token == data.share_token)
            share_result = await db.execute(share_query)
            share_link = share_result.scalar_one_or_none()
            if not share_link:
                logger.warning(f"[OBSERVABILITY] [MARKER_CREATE_VALIDATION_ERROR] [TRACE={trace_id}] Invalid share token provided: {data.share_token}")
                raise HTTPException(status_code=404, detail="Invalid share token")
            
            if not share_link.is_active:
                logger.warning(f"[OBSERVABILITY] [MARKER_CREATE_VALIDATION_ERROR] [TRACE={trace_id}] Inactive share token: {data.share_token}")
                raise HTTPException(status_code=403, detail="This share link has been deactivated")
            
            if not share_link.can_comment:
                logger.warning(f"[OBSERVABILITY] [MARKER_CREATE_VALIDATION_ERROR] [TRACE={trace_id}] Commenting disabled on share token: {data.share_token}")
                raise HTTPException(status_code=403, detail="Commenting is disabled for this share link")
                
            if share_link.expires_at and share_link.expires_at < datetime.utcnow():
                logger.warning(f"[OBSERVABILITY] [MARKER_CREATE_VALIDATION_ERROR] [TRACE={trace_id}] Expired share token: {data.share_token}")
                raise HTTPException(status_code=403, detail="This share link has expired")
                
            session_id = share_link.session_id
            share_link_id = share_link.id

        if not session_id:
            if not data.project_id:
                logger.warning(f"[OBSERVABILITY] [MARKER_CREATE_VALIDATION_ERROR] [TRACE={trace_id}] Missing session_id, project_id, and share_token")
                raise HTTPException(status_code=422, detail="Either session_id, project_id, or share_token must be provided")
            
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
                logger.warning(f"[OBSERVABILITY] [MARKER_CREATE_VALIDATION_ERROR] [TRACE={trace_id}] Invalid UUID format for session_id: {session_id}")
                raise HTTPException(status_code=422, detail="Invalid UUID format")
                
            result = await db.execute(select(Session).where(Session.id == session_id))
            session = result.scalar_one_or_none()
            if not session:
                logger.warning(f"[OBSERVABILITY] [MARKER_CREATE_VALIDATION_ERROR] [TRACE={trace_id}] Session not found: {session_id}")
                raise HTTPException(status_code=404, detail="Session not found")
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"[OBSERVABILITY] [MARKER_CREATE_ERROR] [TRACE={trace_id}] Unexpected validation error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error resolving marker payload")

    # Guardrail: Protect against duplicate marker spam
    from utils.guardrails import check_duplicate_marker, GuardrailError
    if data.x is not None and data.y is not None:
        try:
            check_duplicate_marker(
                session_id=session_id,
                page_url=data.page_url or "",
                x=data.x,
                y=data.y,
                note=data.note or ""
            )
        except GuardrailError as ge:
            logger.warning(f"[OBSERVABILITY] [MARKER_CREATE_VALIDATION_ERROR] [TRACE={trace_id}] Guardrail blocked duplicate: {ge.message}")
            raise HTTPException(status_code=ge.status_code, detail=ge.message)

    # 2-second double click deduplication for exact or near coordinate clicks
    if data.x is not None and data.y is not None:
        time_threshold = datetime.utcnow() - timedelta(seconds=2)
        dup_query = select(Marker).where(
            Marker.session_id == session_id,
            Marker.page_url == data.page_url,
            Marker.created_at >= time_threshold,
            func.abs(Marker.x - data.x) < 5,
            func.abs(Marker.y - data.y) < 5
        )
        dup_result = await db.execute(dup_query)
        dup_marker = dup_result.scalars().first()
        if dup_marker:
            # Enqueue screenshot job on the existing duplicate if requested but not captured
            if data.screenshot_required and not dup_marker.screenshot_url:
                background_tasks.add_task(mock_screenshot_capture_job, dup_marker.id)
            return dup_marker

    # Auto-increment marker_number within the session
    num_result = await db.execute(
        select(func.max(Marker.marker_number)).where(Marker.session_id == session_id)
    )
    max_num = num_result.scalar()
    marker_number = (max_num or 0) + 1

    marker_data = data.model_dump()
    marker_data["session_id"] = session_id
    marker_data["marker_number"] = marker_number
    marker_data["share_link_id"] = share_link_id
    marker_data["user_id"] = user_id
    
    if "project_id" in marker_data:
        del marker_data["project_id"]
    if "share_token" in marker_data:
        del marker_data["share_token"]

    # Fill fallbacks for xpath, css_selector and inner_text if missing but provided in element_* fields
    if not marker_data.get("css_selector") and marker_data.get("element_selector"):
        marker_data["css_selector"] = marker_data["element_selector"]
    if not marker_data.get("inner_text") and marker_data.get("element_text"):
        marker_data["inner_text"] = marker_data["element_text"]
    
    # Custom visual fallbacks for title/description
    if not marker_data.get("title"):
        if marker_data.get("element_text"):
            marker_data["title"] = f"Marker: {marker_data['element_text'][:20]}"
        elif marker_data.get("element_tag"):
            marker_data["title"] = f"Marker on <{marker_data['element_tag'].upper()}>"
        else:
            marker_data["title"] = f"Feedback Pin #{marker_number}"
            
    if not marker_data.get("description") and marker_data.get("note"):
        marker_data["description"] = marker_data["note"]

    # Priority mapping from severity (only if priority wasn't explicitly set)
    if "priority" not in data.model_fields_set and "severity" in data.model_fields_set and data.severity:
        sev = data.severity.lower()
        if sev in ("critical", "high", "medium", "low"):
            marker_data["priority"] = sev

    marker = Marker(id=str(uuid.uuid4()), **marker_data)

    # Step 2v2 — explicitly assign new structured fields after construction
    # to guarantee SQLAlchemy tracks them as dirty and includes them in INSERT.
    marker.issue_type   = data.issue_type   or "other"
    marker.aria_label   = data.aria_label
    marker.aria_role    = data.aria_role
    marker.bounding_box = data.bounding_box
    marker.browser_info = data.browser_info

    db.add(marker)
    await db.commit()
    await db.refresh(marker)


    # Enqueue background screenshot job if requested
    if data.screenshot_required:
        background_tasks.add_task(mock_screenshot_capture_job, marker.id)

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
        "is_inside_shadow_dom": marker.is_inside_shadow_dom,
        "shadow_root_depth": marker.shadow_root_depth,
        "shadow_host_tag": marker.shadow_host_tag,
        "shadow_host_id": marker.shadow_host_id,
        "shadow_host_class_list": marker.shadow_host_class_list,
        "shadow_path": marker.shadow_path,
        "priority": getattr(marker.priority, "value", str(marker.priority)),
        "status": getattr(marker.status, "value", str(marker.status)),
        "ai_summary": marker.ai_summary,
        "created_at": marker.created_at.isoformat() if marker.created_at else None,
        
        # Step 2B visual ingestion fields
        "x": marker.x,
        "y": marker.y,
        "viewport_x": marker.viewport_x,
        "viewport_y": marker.viewport_y,
        "norm_x": marker.norm_x,
        "norm_y": marker.norm_y,
        "canvas_snapshot": marker.canvas_snapshot,
        "element_selector": marker.element_selector,
        "element_text": marker.element_text,
        "element_tag": marker.element_tag,
        "note": marker.note,
        "severity": marker.severity,
        "screenshot_required": marker.screenshot_required,
        "created_via": marker.created_via,
        "share_link_id": marker.share_link_id,
        "user_id": marker.user_id,

        # Step 2v2 structured issue fields
        "issue_type": marker.issue_type,
        "aria_label": marker.aria_label,
        "aria_role": marker.aria_role,
        "bounding_box": marker.bounding_box,
        "browser_info": marker.browser_info,
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
            "is_inside_shadow_dom": m.is_inside_shadow_dom,
            "shadow_root_depth": m.shadow_root_depth,
            "shadow_host_tag": m.shadow_host_tag,
            "shadow_host_id": m.shadow_host_id,
            "shadow_host_class_list": m.shadow_host_class_list,
            "shadow_path": m.shadow_path,
            "priority": getattr(m.priority, "value", str(m.priority)),
            "status": getattr(m.status, "value", str(m.status)),
            "ai_summary": m.ai_summary,
            "created_at": m.created_at.isoformat() if m.created_at else None,
            
            # Step 2B visual ingestion fields
            "x": m.x,
            "y": m.y,
            "viewport_x": m.viewport_x,
            "viewport_y": m.viewport_y,
            "norm_x": m.norm_x,
            "norm_y": m.norm_y,
            "canvas_snapshot": m.canvas_snapshot,
            "element_selector": m.element_selector,
            "element_text": m.element_text,
            "element_tag": m.element_tag,
            "note": m.note,
            "severity": m.severity,
            "screenshot_required": m.screenshot_required,
            "created_via": m.created_via,
            "share_link_id": m.share_link_id,
            "user_id": m.user_id,

            # Step 2v2 structured issue fields
            "issue_type": m.issue_type,
            "aria_label": m.aria_label,
            "aria_role": m.aria_role,
            "bounding_box": m.bounding_box,
            "browser_info": m.browser_info,
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
    
    update_dict = data.model_dump(exclude_none=True)
    if "status" in update_dict:
        old_status = marker.status
        new_status = update_dict["status"]
        if old_status != new_status:
            audit = AuditArtifact(
                id=str(uuid.uuid4()),
                session_id=marker.session_id,
                kind="status_change",
                payload={
                    "feedback_id": marker.id,
                    "old_status": old_status,
                    "new_status": new_status,
                    "changed_at": datetime.utcnow().isoformat()
                }
            )
            db.add(audit)
            import logging
            logger = logging.getLogger("pixelmark.feedback")
            logger.info(f"[OBSERVABILITY] [STATUS_CHANGE] Feedback ID={marker.id} status changed from {old_status} to {new_status}")

    for field, value in update_dict.items():
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
        
    audit = AuditArtifact(
        id=str(uuid.uuid4()),
        session_id=marker.session_id,
        kind="marker_deletion",
        payload={
            "marker_id": marker.id,
            "marker_number": marker.marker_number,
            "deleted_at": datetime.utcnow().isoformat()
        }
    )
    db.add(audit)
    
    import logging
    logger = logging.getLogger("pixelmark.markers")
    logger.info(f"[OBSERVABILITY] [MARKER_DELETED] Marker ID={marker.id} number={marker.marker_number} deleted")
    
    await db.delete(marker)
    await db.commit()
    return {"deleted": True}
