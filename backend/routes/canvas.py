from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import PlainTextResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete
from typing import List, Optional
from dependencies import get_db, get_current_user
from models import CanvasFrame, CanvasFlow, User, OrgMember, Project, Session, BlueprintMutationModel, BlueprintPublicationModel
from schemas import (
    CanvasData, CanvasFrameCreate, CanvasFrameUpdate, CanvasFrameRead,
    CanvasFlowCreate, CanvasFlowRead, CanvasPriorityDistribution,
    BlueprintMutationCreate, BlueprintMutationRead, BlueprintBatchSaveRequest,
    BlueprintPublicationCreate, BlueprintPublicationRead
)
import uuid
from datetime import datetime

router = APIRouter(prefix="/canvas", tags=["canvas"])

async def get_frame_read(f: CanvasFrame, db: AsyncSession) -> CanvasFrameRead:
    priority_dist = CanvasPriorityDistribution()

    return CanvasFrameRead(
        id=f.id,
        project_id=f.project_id,
        session_id=f.session_id,
        title=f.title,
        position_x=f.position_x,
        position_y=f.position_y,
        width=f.width,
        height=f.height,
        color=f.color,
        snapshot_url=f.snapshot_url,
        created_at=f.created_at,
        priority_distribution=priority_dist
    )

@router.get("/{project_id}", response_model=CanvasData)
async def get_canvas(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    try:
        uuid.UUID(project_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid UUID format")

    org_member = await db.execute(select(OrgMember).where(OrgMember.user_id == current_user.id))
    member = org_member.scalars().first()
    if not member:
        raise HTTPException(status_code=403, detail="Forbidden")

    proj_result = await db.execute(select(Project).where(Project.id == project_id, Project.org_id == member.org_id))
    project = proj_result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Fetch existing frames
    f_result = await db.execute(select(CanvasFrame).where(CanvasFrame.project_id == project_id))
    frames = list(f_result.scalars().all())

    # Fetch all sessions for this project
    s_result = await db.execute(select(Session).where(Session.project_id == project_id))
    sessions = s_result.scalars().all()

    # Auto-create frames for sessions that don't have one
    existing_session_ids = {f.session_id for f in frames if f.session_id}
    new_frames = []
    frame_count = len(frames)

    for session in sessions:
        if session.id not in existing_session_ids:
            frame = CanvasFrame(
                id=str(uuid.uuid4()),
                project_id=project_id,
                session_id=session.id,
                title=session.title or "Untitled Session",
                position_x=frame_count * 380.0,
                position_y=60.0,
                width=320.0,
                height=200.0,
                color="#1c1b19"
            )
            db.add(frame)
            new_frames.append(frame)
            frame_count += 1

    if new_frames:
        await db.commit()
        frames.extend(new_frames)

    # Fetch flows
    fl_result = await db.execute(select(CanvasFlow).where(CanvasFlow.project_id == project_id))
    flows = fl_result.scalars().all()

    frames_read = []
    for f in frames:
        f_read = await get_frame_read(f, db)
        frames_read.append(f_read)

    return {
        "frames": frames_read,
        "flows": [
            CanvasFlowRead(
                id=fl.id,
                project_id=fl.project_id,
                source_frame_id=fl.source_frame_id,
                target_frame_id=fl.target_frame_id,
                label=fl.label,
                created_at=fl.created_at
            )
            for fl in flows
        ]
    }

@router.post("/frames", response_model=CanvasFrameRead, status_code=201)
async def create_frame(
    data: CanvasFrameCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    try:
        uuid.UUID(data.project_id)
        if data.session_id:
            uuid.UUID(data.session_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid UUID format")

    org_member = await db.execute(select(OrgMember).where(OrgMember.user_id == current_user.id))
    member = org_member.scalars().first()
    if not member:
        raise HTTPException(status_code=403, detail="Forbidden")

    proj_result = await db.execute(select(Project).where(Project.id == data.project_id, Project.org_id == member.org_id))
    project = proj_result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if data.session_id:
        sess_result = await db.execute(select(Session).where(Session.id == data.session_id, Session.project_id == data.project_id))
        session = sess_result.scalar_one_or_none()
        if not session:
            raise HTTPException(status_code=400, detail="Session does not belong to this project")

    frame = CanvasFrame(
        id=str(uuid.uuid4()),
        project_id=data.project_id,
        session_id=data.session_id,
        title=data.title,
        position_x=data.position_x if data.position_x is not None else 0.0,
        position_y=data.position_y if data.position_y is not None else 0.0,
        width=data.width if data.width is not None else 320.0,
        height=data.height if data.height is not None else 200.0,
        color=data.color if data.color is not None else "#1c1b19"
    )
    db.add(frame)
    await db.commit()
    await db.refresh(frame)

    return await get_frame_read(frame, db)

@router.patch("/frames/{frame_id}", response_model=CanvasFrameRead)
async def update_frame(
    frame_id: str,
    data: CanvasFrameUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    try:
        uuid.UUID(frame_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid UUID format")

    result = await db.execute(select(CanvasFrame).where(CanvasFrame.id == frame_id))
    frame = result.scalar_one_or_none()
    if not frame:
        raise HTTPException(status_code=404, detail="Frame not found")

    org_member = await db.execute(select(OrgMember).where(OrgMember.user_id == current_user.id))
    member = org_member.scalars().first()
    if not member:
        raise HTTPException(status_code=403, detail="Forbidden")

    proj_result = await db.execute(select(Project).where(Project.id == frame.project_id, Project.org_id == member.org_id))
    project = proj_result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=403, detail="Forbidden")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(frame, field, value)

    await db.commit()
    await db.refresh(frame)

    return await get_frame_read(frame, db)

@router.delete("/frames/{frame_id}", status_code=204)
async def delete_frame(
    frame_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    try:
        uuid.UUID(frame_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid UUID format")

    result = await db.execute(select(CanvasFrame).where(CanvasFrame.id == frame_id))
    frame = result.scalar_one_or_none()
    if not frame:
        raise HTTPException(status_code=404, detail="Frame not found")

    org_member = await db.execute(select(OrgMember).where(OrgMember.user_id == current_user.id))
    member = org_member.scalars().first()
    if not member:
        raise HTTPException(status_code=403, detail="Forbidden")

    proj_result = await db.execute(select(Project).where(Project.id == frame.project_id, Project.org_id == member.org_id))
    project = proj_result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=403, detail="Forbidden")

    await db.delete(frame)
    await db.commit()
    return None

@router.post("/flows", response_model=CanvasFlowRead, status_code=201)
async def create_flow(
    data: CanvasFlowCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    try:
        uuid.UUID(data.project_id)
        uuid.UUID(data.source_frame_id)
        uuid.UUID(data.target_frame_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid UUID format")

    org_member = await db.execute(select(OrgMember).where(OrgMember.user_id == current_user.id))
    member = org_member.scalars().first()
    if not member:
        raise HTTPException(status_code=403, detail="Forbidden")

    proj_result = await db.execute(select(Project).where(Project.id == data.project_id, Project.org_id == member.org_id))
    project = proj_result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Fetch source and target frames
    s_frame_res = await db.execute(select(CanvasFrame).where(CanvasFrame.id == data.source_frame_id))
    source_frame = s_frame_res.scalar_one_or_none()

    t_frame_res = await db.execute(select(CanvasFrame).where(CanvasFrame.id == data.target_frame_id))
    target_frame = t_frame_res.scalar_one_or_none()

    if not source_frame or not target_frame:
        raise HTTPException(status_code=404, detail="Source or target frame not found")

    if source_frame.project_id != data.project_id or target_frame.project_id != data.project_id:
        raise HTTPException(status_code=400, detail="Source and target frames must belong to the same project")

    flow = CanvasFlow(
        id=str(uuid.uuid4()),
        project_id=data.project_id,
        source_frame_id=data.source_frame_id,
        target_frame_id=data.target_frame_id,
        label=data.label
    )
    db.add(flow)
    await db.commit()
    await db.refresh(flow)

    return CanvasFlowRead(
        id=flow.id,
        project_id=flow.project_id,
        source_frame_id=flow.source_frame_id,
        target_frame_id=flow.target_frame_id,
        label=flow.label,
        created_at=flow.created_at
    )

@router.delete("/flows/{flow_id}", status_code=204)
async def delete_flow(
    flow_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    try:
        uuid.UUID(flow_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid UUID format")

    result = await db.execute(select(CanvasFlow).where(CanvasFlow.id == flow_id))
    flow = result.scalar_one_or_none()
    if not flow:
        raise HTTPException(status_code=404, detail="Flow not found")

    org_member = await db.execute(select(OrgMember).where(OrgMember.user_id == current_user.id))
    member = org_member.scalars().first()
    if not member:
        raise HTTPException(status_code=403, detail="Forbidden")

    proj_result = await db.execute(select(Project).where(Project.id == flow.project_id, Project.org_id == member.org_id))
    project = proj_result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=403, detail="Forbidden")

    await db.delete(flow)
    await db.commit()
    return None


# ==========================================
# BLUEPRINT PROJECT-SCOPED EDITS & PERSISTENCE
# ==========================================

@router.get("/{project_id}/edits", response_model=List[BlueprintMutationRead])
async def get_blueprint_edits(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    org_member = await db.execute(select(OrgMember).where(OrgMember.user_id == current_user.id))
    member = org_member.scalars().first()
    if not member:
        raise HTTPException(status_code=403, detail="Forbidden")

    proj_result = await db.execute(select(Project).where(Project.id == project_id, Project.org_id == member.org_id))
    project = proj_result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    res = await db.execute(
        select(BlueprintMutationModel)
        .where(BlueprintMutationModel.project_id == project_id)
        .order_by(BlueprintMutationModel.sort_order.asc(), BlueprintMutationModel.created_at.asc())
    )
    mutations = res.scalars().all()

    return [
        BlueprintMutationRead(
            id=m.id,
            project_id=m.project_id,
            targetSelector=m.target_selector,
            actionType=m.action_type,
            presetId=m.preset_id,
            presetName=m.preset_name,
            htmlPayload=m.html_payload,
            timestamp=m.created_at.isoformat() if m.created_at else None,
            pageUrl=m.page_url,
            created_at=m.created_at
        )
        for m in mutations
    ]


@router.post("/{project_id}/edits", response_model=List[BlueprintMutationRead])
async def batch_save_blueprint_edits(
    project_id: str,
    payload: BlueprintBatchSaveRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    org_member = await db.execute(select(OrgMember).where(OrgMember.user_id == current_user.id))
    member = org_member.scalars().first()
    if not member:
        raise HTTPException(status_code=403, detail="Forbidden")

    proj_result = await db.execute(select(Project).where(Project.id == project_id, Project.org_id == member.org_id))
    project = proj_result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Clear previous persisted mutations for project to sync exact state
    await db.execute(delete(BlueprintMutationModel).where(BlueprintMutationModel.project_id == project_id))

    new_models = []
    for idx, item in enumerate(payload.mutations):
        mut_id = item.id if item.id and len(item.id) > 10 else str(uuid.uuid4())
        m = BlueprintMutationModel(
            id=mut_id,
            project_id=project_id,
            target_selector=item.targetSelector,
            action_type=item.actionType,
            preset_id=item.presetId,
            preset_name=item.presetName,
            html_payload=item.htmlPayload,
            page_url=item.pageUrl,
            sort_order=idx
        )
        db.add(m)
        new_models.append(m)

    await db.commit()

    return [
        BlueprintMutationRead(
            id=m.id,
            project_id=m.project_id,
            targetSelector=m.target_selector,
            actionType=m.action_type,
            presetId=m.preset_id,
            presetName=m.preset_name,
            htmlPayload=m.html_payload,
            timestamp=m.created_at.isoformat() if m.created_at else None,
            pageUrl=m.page_url,
            created_at=m.created_at
        )
        for m in new_models
    ]


@router.delete("/{project_id}/edits/{edit_id}")
async def delete_blueprint_edit(
    project_id: str,
    edit_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    org_member = await db.execute(select(OrgMember).where(OrgMember.user_id == current_user.id))
    member = org_member.scalars().first()
    if not member:
        raise HTTPException(status_code=403, detail="Forbidden")

    await db.execute(
        delete(BlueprintMutationModel).where(
            BlueprintMutationModel.id == edit_id,
            BlueprintMutationModel.project_id == project_id
        )
    )
    await db.commit()
    return {"message": "Edit deleted", "id": edit_id}


@router.delete("/{project_id}/edits")
async def clear_all_blueprint_edits(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    org_member = await db.execute(select(OrgMember).where(OrgMember.user_id == current_user.id))
    member = org_member.scalars().first()
    if not member:
        raise HTTPException(status_code=403, detail="Forbidden")

    await db.execute(delete(BlueprintMutationModel).where(BlueprintMutationModel.project_id == project_id))
    await db.commit()
    return {"message": "All blueprint edits cleared for project", "project_id": project_id}


@router.get("/{project_id}/edits/export/json")
async def export_blueprint_edits_json(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    org_member = await db.execute(select(OrgMember).where(OrgMember.user_id == current_user.id))
    member = org_member.scalars().first()
    if not member:
        raise HTTPException(status_code=403, detail="Forbidden")

    res = await db.execute(
        select(BlueprintMutationModel)
        .where(BlueprintMutationModel.project_id == project_id)
        .order_by(BlueprintMutationModel.sort_order.asc())
    )
    mutations = res.scalars().all()

    return {
        "project_id": project_id,
        "exported_at": datetime.utcnow().isoformat(),
        "total_edits": len(mutations),
        "edits": [
            {
                "id": m.id,
                "targetSelector": m.target_selector,
                "actionType": m.action_type,
                "presetId": m.preset_id,
                "presetName": m.preset_name,
                "htmlPayload": m.html_payload,
                "pageUrl": m.page_url,
                "sortOrder": m.sort_order
            }
            for m in mutations
        ]
    }


@router.get("/{project_id}/edits/export/css", response_class=PlainTextResponse)
async def export_blueprint_edits_css(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    org_member = await db.execute(select(OrgMember).where(OrgMember.user_id == current_user.id))
    member = org_member.scalars().first()
    if not member:
        raise HTTPException(status_code=403, detail="Forbidden")

    res = await db.execute(
        select(BlueprintMutationModel)
        .where(BlueprintMutationModel.project_id == project_id)
        .order_by(BlueprintMutationModel.sort_order.asc())
    )
    mutations = res.scalars().all()

    lines = [
        "/* STAGE Blueprint Project CSS Export */",
        f"/* Project ID: {project_id} */",
        f"/* Generated Edits: {len(mutations)} */",
        ""
    ]

    for m in mutations:
        lines.append(f"/* Edit: {m.preset_name or 'Mutation'} on {m.target_selector} ({m.action_type}) */")

    css_content = "\n".join(lines)
    return PlainTextResponse(content=css_content, media_type="text/css")


@router.get("/{project_id}/edits/export/markdown", response_class=PlainTextResponse)
async def export_blueprint_edits_markdown(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    org_member = await db.execute(select(OrgMember).where(OrgMember.user_id == current_user.id))
    member = org_member.scalars().first()
    if not member:
        raise HTTPException(status_code=403, detail="Forbidden")

    proj_res = await db.execute(select(Project).where(Project.id == project_id, Project.org_id == member.org_id))
    project = proj_res.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    res = await db.execute(
        select(BlueprintMutationModel)
        .where(BlueprintMutationModel.project_id == project_id)
        .order_by(BlueprintMutationModel.sort_order.asc())
    )
    mutations = res.scalars().all()

    lines = [
        f"# Blueprint Handoff Summary — {project.name or 'Project'}",
        f"**Project ID**: `{project_id}`",
        f"**Export Date**: `{datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}`",
        f"**Total Mutations**: `{len(mutations)}`",
        "",
        "## Changeset Breakdown",
        ""
    ]

    if not mutations:
        lines.append("_No mutations found for this project._")
    else:
        for idx, m in enumerate(mutations, 1):
            lines.append(f"### {idx}. {m.preset_name or 'Mutation'} (`{m.action_type}`)")
            lines.append(f"- **Target Selector**: `{m.target_selector}`")
            lines.append(f"- **Placement**: `{m.action_type.upper()}`")
            if m.page_url:
                lines.append(f"- **Page URL**: `{m.page_url}`")
            if m.preset_id:
                lines.append(f"- **Preset ID**: `{m.preset_id}`")
            lines.append("")

    md_content = "\n".join(lines)
    return PlainTextResponse(content=md_content, media_type="text/markdown")


# ==========================================
# BLUEPRINT PUBLICATIONS & HANDOFF
# ==========================================

@router.post("/{project_id}/publications", response_model=BlueprintPublicationRead, status_code=201)
async def create_blueprint_publication(
    project_id: str,
    payload: BlueprintPublicationCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    org_member = await db.execute(select(OrgMember).where(OrgMember.user_id == current_user.id))
    member = org_member.scalars().first()
    if not member:
        raise HTTPException(status_code=403, detail="Forbidden")

    proj_res = await db.execute(select(Project).where(Project.id == project_id, Project.org_id == member.org_id))
    project = proj_res.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Fetch current mutations to freeze in publication snapshot
    res = await db.execute(
        select(BlueprintMutationModel)
        .where(BlueprintMutationModel.project_id == project_id)
        .order_by(BlueprintMutationModel.sort_order.asc())
    )
    mutations = res.scalars().all()

    # Determine publication version
    pub_count_res = await db.execute(
        select(func.count(BlueprintPublicationModel.id)).where(BlueprintPublicationModel.project_id == project_id)
    )
    version = (pub_count_res.scalar() or 0) + 1

    share_token = f"bp_pub_{uuid.uuid4().hex[:12]}"

    snapshot_metadata = payload.metadata_json or {}
    snapshot_metadata["mutations"] = [
        {
            "id": m.id,
            "targetSelector": m.target_selector,
            "actionType": m.action_type,
            "presetId": m.preset_id,
            "presetName": m.preset_name,
            "htmlPayload": m.html_payload,
            "pageUrl": m.page_url,
            "sortOrder": m.sort_order
        }
        for m in mutations
    ]
    snapshot_metadata["project"] = {
        "id": project.id,
        "name": project.name,
        "url": project.url
    }

    pub = BlueprintPublicationModel(
        id=str(uuid.uuid4()),
        project_id=project_id,
        name=payload.name,
        blueprint_version=version,
        metadata_json=snapshot_metadata,
        share_token=share_token,
        created_by=current_user.email
    )
    db.add(pub)
    await db.commit()
    await db.refresh(pub)

    return pub


@router.get("/{project_id}/publications", response_model=List[BlueprintPublicationRead])
async def list_blueprint_publications(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    org_member = await db.execute(select(OrgMember).where(OrgMember.user_id == current_user.id))
    member = org_member.scalars().first()
    if not member:
        raise HTTPException(status_code=403, detail="Forbidden")

    res = await db.execute(
        select(BlueprintPublicationModel)
        .where(BlueprintPublicationModel.project_id == project_id)
        .order_by(BlueprintPublicationModel.created_at.desc())
    )
    return res.scalars().all()


@router.get("/publications/{publication_id}", response_model=BlueprintPublicationRead)
async def get_blueprint_publication(
    publication_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(BlueprintPublicationModel).where(BlueprintPublicationModel.id == publication_id))
    pub = res.scalar_one_or_none()
    if not pub:
        raise HTTPException(status_code=404, detail="Publication not found")
    return pub


@router.get("/publications/token/{share_token}", response_model=BlueprintPublicationRead)
async def get_blueprint_publication_by_token(
    share_token: str,
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(BlueprintPublicationModel).where(BlueprintPublicationModel.share_token == share_token))
    pub = res.scalar_one_or_none()
    if not pub:
        raise HTTPException(status_code=404, detail="Publication not found for share token")
    return pub


