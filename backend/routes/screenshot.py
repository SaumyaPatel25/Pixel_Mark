from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import logging

from dependencies import get_db
from models import Session, Project, Environment
from utils.screenshotter import take_screenshot

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/sessions", tags=["screenshot"])

@router.post("/{session_id}/screenshot")
async def take_session_screenshot(
    session_id: str,
    target_url: str = Query(...),
    share_token: str = Query(None),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Session).where(Session.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    proj_result = await db.execute(select(Project).where(Project.id == session.project_id))
    project = proj_result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    env_result = await db.execute(select(Environment).where(Environment.project_id == project.id))
    envs = env_result.scalars().all()
    base_url = None
    if envs:
        base_url = envs[0].base_url
        for env in envs:
            if env.name.lower() in ("prod", "production"):
                base_url = env.base_url
                break
    if not base_url:
        base_url = project.url
        
    if not base_url:
        raise HTTPException(status_code=400, detail="Project has no base URL")

    # Take screenshot
    data_url = await take_screenshot(target_url, base_url)
    
    if not data_url:
        return {"screenshot_url": None, "status": "failed"}
        
    return {"screenshot_url": data_url, "status": "success"}
