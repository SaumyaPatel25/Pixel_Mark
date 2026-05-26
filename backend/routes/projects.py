from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models import Project, OrgMember, User, Environment
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
    return project

@router.get("/", response_model=list[ProjectOut])
async def list_projects(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    org_member = await db.execute(select(OrgMember).where(OrgMember.user_id == current_user.id))
    member = org_member.scalar_one_or_none()
    if not member:
        return []
        
    result = await db.execute(select(Project).where(Project.org_id == member.org_id))
    return result.scalars().all()

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
