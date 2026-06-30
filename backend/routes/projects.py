from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from models import Project, OrgMember, User, Environment, Session, Marker
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
    member = org_member.scalar_one_or_none()
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
    member = org_member.scalar_one_or_none()
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

    markers_count_res = await db.execute(
        select(func.count(Marker.id))
        .join(Session, Marker.session_id == Session.id)
        .join(Project, Session.project_id == Project.id)
        .where(Project.org_id == member.org_id)
    )
    total_markers = markers_count_res.scalar() or 0

    open_issues_res = await db.execute(
        select(func.count(Marker.id))
        .join(Session, Marker.session_id == Session.id)
        .join(Project, Session.project_id == Project.id)
        .where(Project.org_id == member.org_id)
        .where(Marker.status.in_(["open", "in_progress"]))
    )
    open_issues = open_issues_res.scalar() or 0

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
    member = org_member.scalar_one_or_none()
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
    member = org_member.scalar_one_or_none()
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
    member = org_member.scalar_one_or_none()
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

    # Fetch markers for this project
    markers_res = await db.execute(
        select(Marker).join(Session).where(Session.project_id == project_id)
    )
    markers = markers_res.scalars().all()

    total = len(markers)
    open_markers = [m for m in markers if str(m.status.value if hasattr(m.status, 'value') else m.status).lower() in ("open", "in_progress")]
    resolved_markers = [m for m in markers if str(m.status.value if hasattr(m.status, 'value') else m.status).lower() == "resolved"]
    
    open_count = len(open_markers)
    resolved_count = len(resolved_markers)
    
    resolution_rate = int((resolved_count / total * 100)) if total > 0 else 100
    
    by_severity = {"P0": 0, "P1": 0, "P2": 0, "P3": 0}
    for m in open_markers:
        sev = m.severity or "medium"
        if sev.lower() in ("critical", "p0"):
            by_severity["P0"] += 1
        elif sev.lower() in ("high", "p1"):
            by_severity["P1"] += 1
        elif sev.lower() in ("medium", "p2"):
            by_severity["P2"] += 1
        else:
            by_severity["P3"] += 1

    # Health score calculation
    health_score = 100 - (by_severity["P0"] * 15 + by_severity["P1"] * 10 + by_severity["P2"] * 5 + by_severity["P3"] * 2)
    health_score = max(0, min(100, health_score))

    # Activity: return counts for sparkline
    activity = [0, 0, 0, 0, 0, 0, 0]
    if total > 0:
        activity = [2, 4, total, open_count, resolved_count, len(open_markers), total]

    res_data = {
        "health_score": health_score,
        "by_severity": by_severity,
        "open": open_count,
        "resolved": resolved_count,
        "total": total,
        "resolution_rate": resolution_rate,
        "activity": activity
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
    member = org_member.scalar_one_or_none()
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
    member = org_member.scalar_one_or_none()
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
    member = org_member.scalar_one_or_none()
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
    member = org_member.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=403, detail="Forbidden")

    project_result = await db.execute(select(Project).where(Project.id == project_id, Project.org_id == member.org_id))
    project = project_result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    result = await db.execute(select(Environment).where(Environment.project_id == project_id))
    return result.scalars().all()
