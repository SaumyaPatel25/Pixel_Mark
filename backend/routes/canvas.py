from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from dependencies import get_db
from models import CanvasFrame, CanvasFlow, User
from schemas import CanvasData, CanvasFrameUpdate, CanvasFrameOut
from dependencies import get_current_user
import uuid

router = APIRouter(prefix="/canvas", tags=["canvas"])

@router.get("/project/{project_id}", response_model=CanvasData)
async def get_canvas_data(project_id: str, db: AsyncSession = Depends(get_db)):
    # Check frames
    f_result = await db.execute(select(CanvasFrame).where(CanvasFrame.project_id == project_id))
    frames = f_result.scalars().all()
    
    # Check flows
    fl_result = await db.execute(select(CanvasFlow).where(CanvasFlow.project_id == project_id))
    flows = fl_result.scalars().all()
    
    # If no frames exist, create default ones (mocking frontend fallback)
    if not frames:
        f1 = CanvasFrame(
            id=str(uuid.uuid4()),
            project_id=project_id,
            title='Landing Page Viewport',
            position_x=100,
            position_y=120,
            width=320,
            height=200
        )
        f2 = CanvasFrame(
            id=str(uuid.uuid4()),
            project_id=project_id,
            title='Pricing Page Grid View',
            position_x=500,
            position_y=180,
            width=320,
            height=200
        )
        db.add_all([f1, f2])
        
        flow1 = CanvasFlow(
            id=str(uuid.uuid4()),
            project_id=project_id,
            name='Check Out Conversion Funnel',
            frame_sequence=[f1.id, f2.id]
        )
        db.add(flow1)
        await db.commit()
        
        # Re-fetch
        return await get_canvas_data(project_id, db)

    return {"frames": frames, "flows": flows}

@router.patch("/frames/{frame_id}", response_model=CanvasFrameOut)
async def update_frame(frame_id: str, data: CanvasFrameUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(CanvasFrame).where(CanvasFrame.id == frame_id))
    frame = result.scalar_one_or_none()
    if not frame:
        # If it's a mock ID from frontend (like 'frame-1'), we might need to handle it or just 404
        # Since I implement default frame creation above, actual UUIDs will exist soon.
        raise HTTPException(status_code=404, detail="Frame not found")
        
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(frame, field, value)
        
    await db.commit()
    await db.refresh(frame)
    return frame
