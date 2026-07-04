from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from dependencies import get_db, get_current_user
from models import User

router = APIRouter(prefix="/ai", tags=["AI"])

@router.post("/triage/session/{session_id}")
async def triage_session(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    raise HTTPException(status_code=400, detail="Marker system temporarily removed for rebuild.")

@router.get("/summary/session/{session_id}")
async def get_session_summary(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    raise HTTPException(status_code=400, detail="Marker system temporarily removed for rebuild.")
