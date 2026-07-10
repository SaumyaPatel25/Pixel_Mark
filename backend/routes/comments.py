import uuid
from typing import List
from fastapi import APIRouter, Depends, Request, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from database import get_db, AsyncSessionLocal
from models import Comment, Project
from schemas import CommentCreate, CommentResponse
from errors import AppError
from ratelimit import check_rate_limit
from logger import logger
from websocket import manager

router = APIRouter(prefix="/comments", tags=["comments"])

async def run_ai_triage(comment_id: str, text: str, project_id: str):
    """Classify severity, update DB, then broadcast the update."""
    try:
        import os, httpx
        groq_key = os.environ.get("GROQ_API_KEY", "")
        if not groq_key:
            severity = "P2"
        else:
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={"Authorization": f"Bearer {groq_key}", "Content-Type": "application/json"},
                    json={
                        "model": "llama3-8b-8192",
                        "messages": [{
                            "role": "user",
                            "content": (
                                f"Classify this UI bug report as P0 (critical/crash), "
                                f"P1 (major), P2 (minor), or P3 (cosmetic). "
                                f"Reply with ONLY the label, nothing else.\n\nFeedback: {text}"
                            )
                        }],
                        "max_tokens": 5,
                        "temperature": 0,
                    }
                )
            severity = resp.json()["choices"][0]["message"]["content"].strip()
            if severity not in ("P0","P1","P2","P3"):
                severity = "P2"

        # Update DB using an isolated session since this is a background task
        async with AsyncSessionLocal() as session:
            result = await session.execute(select(Comment).where(Comment.id == comment_id))
            comment = result.scalars().first()
            if comment:
                comment.severity = severity
                await session.commit()

        # Broadcast severity update to all clients
        await manager.broadcast(
            project_id,
            {"type": "COMMENT_TRIAGED", "comment_id": str(comment_id), "severity": severity}
        )
    except Exception as e:
        logger.warning(f"AI triage failed: {type(e).__name__}")

@router.post("/", status_code=201, response_model=CommentResponse)
async def create_comment(b: CommentCreate, request: Request, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    check_rate_limit(request, "create_comment")

    try:
        uuid.UUID(b.project_id)
    except ValueError:
        raise AppError("INVALID_UUID", f"Project ID '{b.project_id}' is not a valid UUID format", 400)

    # Verify project exists
    result = await db.execute(select(Project.id).where(Project.id == b.project_id))
    if not result.scalars().first():
        raise AppError("NOT_FOUND", f"Project {b.project_id} not found", 404)

    screenshot = b.screenshot_url
    if screenshot and screenshot.startswith('data:image') and len(screenshot) > 500_000:
        logger.warning(f"[comments] screenshot_url truncated — was {len(screenshot)} chars")
        screenshot = screenshot[:100] + "...[truncated]"

    new_comment = Comment(
        project_id=b.project_id,
        text=b.text.strip(),
        component_selector=b.component_selector or "",
        xpath=b.xpath or "",
        tag_name=b.tag_name or "",
        inner_text=b.inner_text or "",
        page_url=b.page_url or "/",
        tester_name=b.tester_name or "Anonymous",
        x=b.x or 0,
        y=b.y or 0,
        marker_number=b.marker_number or 0,
        screenshot_url=screenshot,
        status="open",
        severity=None
    )

    try:
        db.add(new_comment)
        await db.commit()
        await db.refresh(new_comment)
    except Exception as e:
        await db.rollback()
        err_str = str(e)
        logger.error(f"[DB ERROR] Full Report: {err_str}")
        raise AppError("DB_ERROR", f"Substrate write failed: {err_str}", 500)

    # Use dict conversion for broadcast payload
    comment_dict = {
        "id": str(new_comment.id),
        "project_id": str(new_comment.project_id),
        "text": new_comment.text,
        "component_selector": new_comment.component_selector,
        "xpath": new_comment.xpath,
        "tag_name": new_comment.tag_name,
        "inner_text": new_comment.inner_text,
        "page_url": new_comment.page_url,
        "tester_name": new_comment.tester_name,
        "screenshot_url": new_comment.screenshot_url,
        "x": new_comment.x,
        "y": new_comment.y,
        "marker_number": new_comment.marker_number,
        "status": new_comment.status,
        "severity": new_comment.severity,
        "created_at": new_comment.created_at.isoformat() if new_comment.created_at else None
    }

    # Broadcast + AI triage in background
    background_tasks.add_task(
        manager.broadcast,
        b.project_id,
        {"type": "NEW_COMMENT", "comment": comment_dict}
    )
    background_tasks.add_task(run_ai_triage, str(new_comment.id), b.text, b.project_id)

    return new_comment

@router.get("/{project_id}/", response_model=List[CommentResponse])
async def get_comments(project_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Comment).where(Comment.project_id == project_id).order_by(Comment.created_at.desc()))
    return result.scalars().all()
