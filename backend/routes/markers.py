from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models import Marker, Session, User
from schemas import MarkerCreate, MarkerUpdate, MarkerOut
from dependencies import get_db, get_current_user
import uuid

router = APIRouter(prefix="/markers", tags=["markers"])

@router.post("/", response_model=MarkerOut)
async def create_marker(data: MarkerCreate, db: AsyncSession = Depends(get_db)):
    try:
        uuid.UUID(data.session_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid UUID format")

    marker = Marker(id=str(uuid.uuid4()), **data.model_dump())
    db.add(marker)
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
