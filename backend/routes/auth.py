from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import AsyncSessionLocal
from models import User, Organization, OrgMember, RoleEnum
from schemas import RegisterRequest, LoginRequest, TokenResponse, UserOut
from auth import hash_password, verify_password, create_access_token
from dependencies import get_db, get_current_user
import uuid

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=TokenResponse)
async def register(data: RegisterRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == data.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(id=str(uuid.uuid4()), email=data.email, hashed_password=hash_password(data.password), name=data.name)
    # auto-create personal org
    org = Organization(id=str(uuid.uuid4()), name=f"{data.name or data.email}'s workspace", slug=str(uuid.uuid4())[:8])
    membership = OrgMember(id=str(uuid.uuid4()), org_id=org.id, user_id=user.id, role=RoleEnum.owner)
    db.add_all([user, org, membership])
    await db.commit()
    token = create_access_token({"sub": user.id})
    return TokenResponse(access_token=token)

@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token({"sub": user.id})
    return TokenResponse(access_token=token)

@router.get("/me", response_model=UserOut)
async def me(current_user: User = Depends(get_current_user)):
    return current_user
