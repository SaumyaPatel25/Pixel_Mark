from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import PlainTextResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
import uuid

from models import BlueprintDomTarget, BlueprintDomEditSet, BlueprintDomEditOperation, CanvasFrame, Project
from schemas import (
    BlueprintDomTargetUpsert,
    BlueprintDomTargetOut,
    BlueprintDomEditSetCreate,
    BlueprintDomEditSetOut,
    BlueprintDomEditOperationCreate,
    BlueprintDomEditOperationUpdate,
    BlueprintDomEditOperationOut
)
from dependencies import get_db

router = APIRouter(prefix="/projects", tags=["blueprint-dom-edits"])


async def verify_project_and_frame(project_id: str, frame_id: str, db: AsyncSession):
    proj_res = await db.execute(select(Project).where(Project.id == project_id))
    proj = proj_res.scalar_one_or_none()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    frame_res = await db.execute(
        select(CanvasFrame).where(CanvasFrame.id == frame_id, CanvasFrame.project_id == project_id)
    )
    frame = frame_res.scalar_one_or_none()
    if not frame:
        raise HTTPException(status_code=404, detail="CanvasFrame not found for this project")

    return proj, frame


# 1. GET Target for Frame
@router.get("/{project_id}/blueprint/frames/{frame_id}/dom-target", response_model=Optional[BlueprintDomTargetOut])
async def get_blueprint_dom_target(
    project_id: str,
    frame_id: str,
    db: AsyncSession = Depends(get_db)
):
    await verify_project_and_frame(project_id, frame_id, db)

    res = await db.execute(
        select(BlueprintDomTarget).where(
            BlueprintDomTarget.project_id == project_id,
            BlueprintDomTarget.canvas_frame_id == frame_id
        )
    )
    return res.scalar_one_or_none()


# 2. PUT (Upsert) Target for Frame
@router.put("/{project_id}/blueprint/frames/{frame_id}/dom-target", response_model=BlueprintDomTargetOut)
async def upsert_blueprint_dom_target(
    project_id: str,
    frame_id: str,
    payload: BlueprintDomTargetUpsert,
    db: AsyncSession = Depends(get_db)
):
    await verify_project_and_frame(project_id, frame_id, db)

    res = await db.execute(
        select(BlueprintDomTarget).where(
            BlueprintDomTarget.project_id == project_id,
            BlueprintDomTarget.canvas_frame_id == frame_id
        )
    )
    target = res.scalar_one_or_none()

    if not target:
        target = BlueprintDomTarget(
            id=str(uuid.uuid4()),
            project_id=project_id,
            canvas_frame_id=frame_id,
            page_url=payload.page_url,
            selector_primary=payload.selector_primary,
            selector_fallback=payload.selector_fallback,
            xpath=payload.xpath,
            target_signature_json=payload.target_signature_json,
            element_tag=payload.element_tag,
            element_label=payload.element_label,
            text_excerpt=payload.text_excerpt
        )
        db.add(target)
    else:
        for field, val in payload.model_dump(exclude_unset=True).items():
            setattr(target, field, val)

    await db.commit()
    await db.refresh(target)
    return target


# 3. GET Edit Sets for Frame
@router.get("/{project_id}/blueprint/frames/{frame_id}/edit-sets", response_model=List[BlueprintDomEditSetOut])
async def list_blueprint_edit_sets(
    project_id: str,
    frame_id: str,
    db: AsyncSession = Depends(get_db)
):
    await verify_project_and_frame(project_id, frame_id, db)

    res = await db.execute(
        select(BlueprintDomEditSet).where(
            BlueprintDomEditSet.project_id == project_id,
            BlueprintDomEditSet.canvas_frame_id == frame_id
        ).order_by(BlueprintDomEditSet.created_at.desc())
    )
    edit_sets = res.scalars().all()

    # Load operations for each set
    out_sets = []
    for es in edit_sets:
        ops_res = await db.execute(
            select(BlueprintDomEditOperation)
            .where(BlueprintDomEditOperation.edit_set_id == es.id)
            .order_by(BlueprintDomEditOperation.sort_order.asc(), BlueprintDomEditOperation.created_at.asc())
        )
        ops = ops_res.scalars().all()
        es_dict = BlueprintDomEditSetOut.model_validate(es).model_dump()
        es_dict["operations"] = [BlueprintDomEditOperationOut.model_validate(op) for op in ops]
        out_sets.append(es_dict)

    return out_sets


# 4. POST Create Edit Set for Frame
@router.post("/{project_id}/blueprint/frames/{frame_id}/edit-sets", response_model=BlueprintDomEditSetOut)
async def create_blueprint_edit_set(
    project_id: str,
    frame_id: str,
    payload: BlueprintDomEditSetCreate,
    db: AsyncSession = Depends(get_db)
):
    await verify_project_and_frame(project_id, frame_id, db)

    edit_set = BlueprintDomEditSet(
        id=str(uuid.uuid4()),
        project_id=project_id,
        canvas_frame_id=frame_id,
        target_id=payload.target_id,
        name=payload.name or "Untitled Edit Set",
        status=payload.status,
        base_snapshot_json=payload.base_snapshot_json,
        notes=payload.notes
    )
    db.add(edit_set)
    await db.commit()
    await db.refresh(edit_set)

    es_dict = BlueprintDomEditSetOut.model_validate(edit_set).model_dump()
    es_dict["operations"] = []
    return es_dict


# 5. GET Edit Set Details
@router.get("/{project_id}/blueprint/edit-sets/{edit_set_id}", response_model=BlueprintDomEditSetOut)
async def get_blueprint_edit_set(
    project_id: str,
    edit_set_id: str,
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(
        select(BlueprintDomEditSet).where(
            BlueprintDomEditSet.id == edit_set_id,
            BlueprintDomEditSet.project_id == project_id
        )
    )
    edit_set = res.scalar_one_or_none()
    if not edit_set:
        raise HTTPException(status_code=404, detail="BlueprintEditSet not found")

    ops_res = await db.execute(
        select(BlueprintDomEditOperation)
        .where(BlueprintDomEditOperation.edit_set_id == edit_set.id)
        .order_by(BlueprintDomEditOperation.sort_order.asc(), BlueprintDomEditOperation.created_at.asc())
    )
    ops = ops_res.scalars().all()

    es_dict = BlueprintDomEditSetOut.model_validate(edit_set).model_dump()
    es_dict["operations"] = [BlueprintDomEditOperationOut.model_validate(op) for op in ops]
    return es_dict


# 6. POST Operation to Edit Set
@router.post("/{project_id}/blueprint/edit-sets/{edit_set_id}/operations", response_model=BlueprintDomEditOperationOut)
async def create_blueprint_edit_operation(
    project_id: str,
    edit_set_id: str,
    payload: BlueprintDomEditOperationCreate,
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(
        select(BlueprintDomEditSet).where(
            BlueprintDomEditSet.id == edit_set_id,
            BlueprintDomEditSet.project_id == project_id
        )
    )
    edit_set = res.scalar_one_or_none()
    if not edit_set:
        raise HTTPException(status_code=404, detail="BlueprintEditSet not found")

    op = BlueprintDomEditOperation(
        id=str(uuid.uuid4()),
        edit_set_id=edit_set_id,
        op_type=payload.op_type,
        property_key=payload.property_key,
        old_value=payload.old_value,
        new_value=payload.new_value,
        unit=payload.unit,
        selector_override=payload.selector_override,
        sort_order=payload.sort_order
    )
    db.add(op)
    await db.commit()
    await db.refresh(op)
    return op


# 7. PATCH Operation
@router.patch("/{project_id}/blueprint/operations/{operation_id}", response_model=BlueprintDomEditOperationOut)
async def update_blueprint_edit_operation(
    project_id: str,
    operation_id: str,
    payload: BlueprintDomEditOperationUpdate,
    db: AsyncSession = Depends(get_db)
):
    op_res = await db.execute(
        select(BlueprintDomEditOperation).where(BlueprintDomEditOperation.id == operation_id)
    )
    op = op_res.scalar_one_or_none()
    if not op:
        raise HTTPException(status_code=404, detail="Operation not found")

    for field, val in payload.model_dump(exclude_unset=True).items():
        setattr(op, field, val)

    await db.commit()
    await db.refresh(op)
    return op


# 8. DELETE Operation
@router.delete("/{project_id}/blueprint/operations/{operation_id}")
async def delete_blueprint_edit_operation(
    project_id: str,
    operation_id: str,
    db: AsyncSession = Depends(get_db)
):
    op_res = await db.execute(
        select(BlueprintDomEditOperation).where(BlueprintDomEditOperation.id == operation_id)
    )
    op = op_res.scalar_one_or_none()
    if not op:
        raise HTTPException(status_code=404, detail="Operation not found")

    await db.delete(op)
    await db.commit()
    return {"message": "Operation deleted successfully", "id": operation_id}


# 9. GET Export CSS for Frame
@router.get("/{project_id}/blueprint/frames/{frame_id}/export.css", response_class=PlainTextResponse)
async def export_blueprint_frame_css(
    project_id: str,
    frame_id: str,
    db: AsyncSession = Depends(get_db)
):
    await verify_project_and_frame(project_id, frame_id, db)

    target_res = await db.execute(
        select(BlueprintDomTarget).where(
            BlueprintDomTarget.project_id == project_id,
            BlueprintDomTarget.canvas_frame_id == frame_id
        )
    )
    target = target_res.scalar_one_or_none()

    edit_sets_res = await db.execute(
        select(BlueprintDomEditSet).where(
            BlueprintDomEditSet.project_id == project_id,
            BlueprintDomEditSet.canvas_frame_id == frame_id
        ).order_by(BlueprintDomEditSet.created_at.desc())
    )
    edit_sets = edit_sets_res.scalars().all()

    if not edit_sets:
        return PlainTextResponse(
            content=f"/* PixelMark Blueprint DOM Export */\n/* Project: {project_id} */\n/* Frame: {frame_id} */\n\n/* No saved edit sets found for this frame. */\n",
            media_type="text/css"
        )

    latest_set = edit_sets[0]

    ops_res = await db.execute(
        select(BlueprintDomEditOperation)
        .where(BlueprintDomEditOperation.edit_set_id == latest_set.id)
        .order_by(BlueprintDomEditOperation.sort_order.asc(), BlueprintDomEditOperation.created_at.asc())
    )
    ops = ops_res.scalars().all()

    selector = None
    warning_comment = None

    if target:
        if target.selector_primary:
            selector = target.selector_primary
        elif target.selector_fallback:
            selector = target.selector_fallback
            warning_comment = "/* WARNING: Primary selector missing; using fallback selector. */"
        elif target.xpath:
            warning_comment = f"/* WARNING: CSS selector missing; target identified by XPath: {target.xpath} */"
            selector = "/* [WARNING: Unresolved XPath Target] */"

    if not selector:
        selector = "body"
        warning_comment = "/* WARNING: Target selector missing or unresolved; defaulted to 'body'. */"

    lines = [
        "/* PixelMark Blueprint DOM Export */",
        f"/* Project: {project_id} */",
        f"/* Frame: {frame_id} */",
        f"/* Target: {selector} */",
        f"/* Edit Set ID: {latest_set.id} (Status: {latest_set.status}) */",
        ""
    ]

    if warning_comment:
        lines.append(warning_comment)

    lines.append(f"{selector} {{")

    for op in ops:
        if op.op_type == "style" and op.property_key and op.new_value is not None:
            lines.append(f"  {op.property_key}: {op.new_value};")

    lines.append("}\n")

    css_content = "\n".join(lines)
    return PlainTextResponse(content=css_content, media_type="text/css")

