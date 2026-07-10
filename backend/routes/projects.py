from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from models import Project, OrgMember, User, Environment, Session
from schemas import ProjectCreate, ProjectOut, ProjectUpdate, EnvironmentCreate, EnvironmentOut
from dependencies import get_db, get_current_user
import uuid

router = APIRouter(prefix="/projects", tags=["projects"])

@router.post("/", response_model=ProjectOut, status_code=201)
async def create_project(data: ProjectCreate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    # Validate project payload (hardening validation rule)
    if not data.name or not data.name.strip():
        raise HTTPException(status_code=422, detail="Project name cannot be empty")
    if len(data.name) > 255:
        raise HTTPException(status_code=422, detail="Project name is too long")
    if data.url and not (data.url.startswith("http://") or data.url.startswith("https://")):
        raise HTTPException(status_code=422, detail="Invalid target URL scheme")

    # Get user's org
    org_member = await db.execute(select(OrgMember).where(OrgMember.user_id == current_user.id))
    member = org_member.scalars().first()
    if not member:
        raise HTTPException(status_code=400, detail="User does not belong to any organization")
    
    project = Project(id=str(uuid.uuid4()), org_id=member.org_id, **data.model_dump())
    db.add(project)
    await db.commit()
    await db.refresh(project)

    # Invalidate cache
    from services.cache import cache
    cache.invalidate(f"user:{current_user.id}:*")

    return project

@router.get("/dashboard/summary")
async def get_dashboard_summary(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    from services.cache import cache
    cache_key = f"user:{current_user.id}:dashboard:summary"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    org_member = await db.execute(select(OrgMember).where(OrgMember.user_id == current_user.id))
    member = org_member.scalars().first()
    if not member:
        return {
            "total_projects": 0,
            "total_sessions": 0,
            "total_markers": 0,
            "open_issues": 0
        }

    proj_count_res = await db.execute(
        select(func.count(Project.id)).where(Project.org_id == member.org_id)
    )
    total_projects = proj_count_res.scalar() or 0

    sess_count_res = await db.execute(
        select(func.count(Session.id))
        .join(Project, Session.project_id == Project.id)
        .where(Project.org_id == member.org_id)
    )
    total_sessions = sess_count_res.scalar() or 0

    total_markers = 0
    open_issues = 0

    summary_data = {
        "total_projects": total_projects,
        "total_sessions": total_sessions,
        "total_markers": total_markers,
        "open_issues": open_issues
    }

    cache.set(cache_key, summary_data, 15)
    return summary_data

@router.get("/", response_model=list[ProjectOut])
async def list_projects(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    from services.cache import cache
    cache_key = f"user:{current_user.id}:projects"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    org_member = await db.execute(select(OrgMember).where(OrgMember.user_id == current_user.id))
    member = org_member.scalars().first()
    if not member:
        return []
        
    result = await db.execute(select(Project).where(Project.org_id == member.org_id))
    projects = result.scalars().all()
    
    # Serialize to dictionary for safe caching
    data = [{"id": p.id, "name": p.name, "url": p.url, "created_at": p.created_at, "org_id": p.org_id} for p in projects]
    cache.set(cache_key, data, 30)
    return data

@router.get("/{project_id}", response_model=ProjectOut)
async def get_project(project_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    # Verify valid UUID format
    try:
        uuid.UUID(project_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid UUID format")

    org_member = await db.execute(select(OrgMember).where(OrgMember.user_id == current_user.id))
    member = org_member.scalars().first()
    if not member:
        raise HTTPException(status_code=403, detail="Forbidden")

    result = await db.execute(select(Project).where(Project.id == project_id, Project.org_id == member.org_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project

@router.get("/{project_id}/analytics")
async def get_project_analytics(project_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    try:
        uuid.UUID(project_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid UUID format")

    org_member = await db.execute(select(OrgMember).where(OrgMember.user_id == current_user.id))
    member = org_member.scalars().first()
    if not member:
        raise HTTPException(status_code=403, detail="Forbidden")

    proj_res = await db.execute(select(Project).where(Project.id == project_id, Project.org_id == member.org_id))
    project = proj_res.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    from services.cache import cache
    cache_key = f"user:{current_user.id}:project:{project_id}:analytics"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    res_data = {
        "health_score": 100,
        "by_severity": {"P0": 0, "P1": 0, "P2": 0, "P3": 0},
        "open": 0,
        "resolved": 0,
        "total": 0,
        "resolution_rate": 100,
        "activity": [0, 0, 0, 0, 0, 0, 0]
    }
    from services.cache import cache
    cache.set(cache_key, res_data, 15)
    return res_data

@router.patch("/{project_id}", response_model=ProjectOut)
async def update_project(project_id: str, data: ProjectUpdate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    try:
        uuid.UUID(project_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid UUID format")

    org_member = await db.execute(select(OrgMember).where(OrgMember.user_id == current_user.id))
    member = org_member.scalars().first()
    if not member:
        raise HTTPException(status_code=403, detail="Forbidden")

    result = await db.execute(select(Project).where(Project.id == project_id, Project.org_id == member.org_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    for field, value in data.model_dump(exclude_none=True).items():
        setattr(project, field, value)
    await db.commit()
    await db.refresh(project)

    # Invalidate cache
    from services.cache import cache
    cache.invalidate(f"user:{current_user.id}:*")

    return project

@router.delete("/{project_id}")
async def delete_project(project_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    try:
        uuid.UUID(project_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid UUID format")

    org_member = await db.execute(select(OrgMember).where(OrgMember.user_id == current_user.id))
    member = org_member.scalars().first()
    if not member:
        raise HTTPException(status_code=403, detail="Forbidden")

    result = await db.execute(select(Project).where(Project.id == project_id, Project.org_id == member.org_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    await db.delete(project)
    await db.commit()

    # Invalidate cache
    from services.cache import cache
    cache.invalidate(f"user:{current_user.id}:*")

    return {"deleted": True}

# Environments CRUD
@router.post("/{project_id}/environments", response_model=EnvironmentOut)
async def create_environment(project_id: str, data: EnvironmentCreate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    try:
        uuid.UUID(project_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid UUID format")

    org_member = await db.execute(select(OrgMember).where(OrgMember.user_id == current_user.id))
    member = org_member.scalars().first()
    if not member:
        raise HTTPException(status_code=403, detail="Forbidden")

    project_result = await db.execute(select(Project).where(Project.id == project_id, Project.org_id == member.org_id))
    project = project_result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    env = Environment(id=str(uuid.uuid4()), project_id=project_id, **data.model_dump())
    db.add(env)
    await db.commit()
    await db.refresh(env)
    return env

@router.get("/{project_id}/environments", response_model=list[EnvironmentOut])
async def list_environments(project_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    try:
        uuid.UUID(project_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid UUID format")

    org_member = await db.execute(select(OrgMember).where(OrgMember.user_id == current_user.id))
    member = org_member.scalars().first()
    if not member:
        raise HTTPException(status_code=403, detail="Forbidden")

    project_result = await db.execute(select(Project).where(Project.id == project_id, Project.org_id == member.org_id))
    project = project_result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    result = await db.execute(select(Environment).where(Environment.project_id == project_id))
    return result.scalars().all()
