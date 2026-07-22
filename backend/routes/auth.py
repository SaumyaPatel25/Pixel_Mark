from fastapi import APIRouter, Depends, HTTPException, Request, Query
from fastapi.responses import RedirectResponse
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from database import AsyncSessionLocal
from models import User, Organization, OrgMember, RoleEnum, AuthToken, UserIdentity
from schemas import (
    RegisterRequest, LoginRequest, TokenResponse, UserOut, MessageResponse,
    VerifyEmailRequest, RequestPasswordResetRequest, ResetPasswordRequest, ResendVerificationRequest
)
from auth import hash_password, verify_password, create_access_token
from dependencies import get_db, get_current_user
from config import settings
from services.email import send_verification_email, send_password_reset_email, send_login_link_email
from services.tokens import create_token, consume_token
from pydantic import BaseModel
import uuid
import secrets
import hashlib
from datetime import datetime, timezone, timedelta
import httpx

router = APIRouter(prefix="/auth", tags=["auth"])

class ExtendedTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut

class RegisterResponse(BaseModel):
    message: str
    dev_link: Optional[str] = None
    access_token: Optional[str] = None
    token_type: Optional[str] = None
    user: Optional[UserOut] = None

async def login_or_register_oauth_user(email: str, name: str, db: AsyncSession) -> str:
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    
    if not user:
        user = User(
            id=str(uuid.uuid4()),
            email=email,
            hashed_password=hash_password(secrets.token_hex(16)),
            name=name,
            is_verified=True
        )
        org = Organization(id=str(uuid.uuid4()), name=f"{name}'s workspace", slug=str(uuid.uuid4())[:8])
        membership = OrgMember(id=str(uuid.uuid4()), org_id=org.id, user_id=user.id, role=RoleEnum.owner)
        
        db.add_all([user, org, membership])
        await db.commit()
    else:
        if not user.is_verified:
            user.is_verified = True
            db.add(user)
            await db.commit()
            
    return create_access_token({"sub": user.id})

@router.post("/register", response_model=RegisterResponse, status_code=201)
async def register(data: RegisterRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == data.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email already registered")
        
    user = User(
        id=str(uuid.uuid4()), 
        email=data.email, 
        hashed_password=hash_password(data.password), 
        name=data.name,
        is_verified=settings.auto_verify_users
    )
    # auto-create personal org
    org = Organization(id=str(uuid.uuid4()), name=f"{data.name or data.email}'s workspace", slug=str(uuid.uuid4())[:8])
    membership = OrgMember(id=str(uuid.uuid4()), org_id=org.id, user_id=user.id, role=RoleEnum.owner)
    
    db.add_all([user, org, membership])
    await db.commit()
    
    if settings.auto_verify_users:
        token = create_access_token({"sub": user.id})
        return RegisterResponse(
            message="Registration successful. Direct login activated.",
            access_token=token,
            token_type="bearer",
            user=UserOut.model_validate(user)
        )
        
    # Create verification token (24h = 1440 min)
    token = await create_token(db, user.id, "verify_email", 1440)
    
    # Send verification email
    try:
        send_verification_email(user.email, token)
    except Exception as e:
        print(f"Failed to send verification email: {e}")
        
    dev_link = None
    if not settings.resend_api_key or settings.resend_api_key.startswith("re_mock") or settings.resend_api_key.startswith("YOUR_"):
        dev_link = f"{settings.app_public_url}/auth/verify-email?token={token}"
        
    return RegisterResponse(
        message="Verification email sent. Please check your inbox.",
        dev_link=dev_link
    )

@router.post("/verify-email", response_model=MessageResponse)
async def verify_email(token: str = Query(...), db: AsyncSession = Depends(get_db)):
    auth_token = await consume_token(db, token, "verify_email")
    if not auth_token:
        raise HTTPException(status_code=400, detail="Invalid or expired verification token")
        
    result = await db.execute(select(User).where(User.id == auth_token.user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    user.is_verified = True
    db.add(user)
    await db.commit()
    
    return MessageResponse(message="Email verified. You can now sign in.")

@router.post("/login", response_model=ExtendedTokenResponse)
async def login(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
        
    if not user.is_verified:
        raise HTTPException(
            status_code=403,
            detail="Please verify your email before signing in."
        )
        
    token = create_access_token({"sub": user.id})
    return ExtendedTokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserOut.model_validate(user)
    )

@router.post("/request-password-reset", response_model=MessageResponse)
async def request_password_reset(data: RequestPasswordResetRequest, db: AsyncSession = Depends(get_db)):
    generic_response = "If that email exists, we sent a reset link."
    
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()
    
    if not user:
        return MessageResponse(message=generic_response)
        
    # Generate reset token (1 hour = 60 min)
    token = await create_token(db, user.id, "password_reset", 60)
    
    try:
        send_password_reset_email(user.email, token)
    except Exception as e:
        print(f"Failed to send password reset email: {e}")
        
    dev_link = None
    if not settings.resend_api_key or settings.resend_api_key.startswith("re_mock") or settings.resend_api_key.startswith("YOUR_"):
        dev_link = f"{settings.app_public_url}/auth/reset-password?token={token}"
        
    return MessageResponse(
        message=generic_response,
        dev_link=dev_link
    )

@router.post("/reset-password", response_model=MessageResponse)
async def reset_password(data: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    auth_token = await consume_token(db, data.token, "password_reset")
    if not auth_token:
        raise HTTPException(status_code=400, detail="Invalid or expired password reset token")
        
    result = await db.execute(select(User).where(User.id == auth_token.user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    new_pwd = data.new_password or data.password
    if not new_pwd:
        raise HTTPException(status_code=400, detail="Password is required")
        
    user.hashed_password = hash_password(new_pwd)
    db.add(user)
    
    # Invalidate all other active tokens for this user
    await db.execute(
        update(AuthToken)
        .where(AuthToken.user_id == user.id, AuthToken.used_at == None)
        .values(used_at=datetime.utcnow())
    )
    await db.commit()
    
    return MessageResponse(message="Password updated. You can now sign in.")

@router.post("/resend-verification", response_model=MessageResponse)
async def resend_verification(data: ResendVerificationRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()
    
    generic_response = "Verification email sent if applicable."
    
    if not user or user.is_verified:
        return MessageResponse(message=generic_response)
        
    # Invalidate old verify_email tokens for this user
    await db.execute(
        update(AuthToken)
        .where(AuthToken.user_id == user.id, AuthToken.purpose == "verify_email", AuthToken.used_at == None)
        .values(used_at=datetime.utcnow())
    )
    
    # Create new verify token (24h = 1440 min)
    token = await create_token(db, user.id, "verify_email", 1440)
    
    try:
        send_verification_email(user.email, token)
    except Exception as e:
        print(f"Failed to resend verification email: {e}")
        
    dev_link = None
    if not settings.resend_api_key or settings.resend_api_key.startswith("re_mock") or settings.resend_api_key.startswith("YOUR_"):
        dev_link = f"{settings.app_public_url}/auth/verify-email?token={token}"
        
    return MessageResponse(
        message=generic_response,
        dev_link=dev_link
    )

async def handle_oauth_user_login(
    provider: str,
    provider_user_id: str,
    email: str,
    name: str,
    db: AsyncSession
) -> RedirectResponse:
    # 1. Lookup identity
    result = await db.execute(
        select(UserIdentity).where(
            UserIdentity.provider == provider,
            UserIdentity.provider_user_id == provider_user_id
        )
    )
    identity = result.scalar_one_or_none()
    
    if identity:
        user_res = await db.execute(select(User).where(User.id == identity.user_id))
        user = user_res.scalar_one_or_none()
        if not user:
            return RedirectResponse(url=f"{settings.frontend_url}/auth/oauth-callback?error=user_not_found")
        
        if not user.is_verified:
            user.is_verified = True
            db.add(user)
            await db.commit()
            
        token = create_access_token({"sub": user.id})
        return RedirectResponse(url=f"{settings.frontend_url}/auth/oauth-callback?token={token}")
        
    # 2. Check if user with same email exists
    user_res = await db.execute(select(User).where(User.email == email))
    user = user_res.scalar_one_or_none()
    
    if user:
        if not user.is_verified:
            # Block account takeover from unverified emails
            return RedirectResponse(url=f"{settings.frontend_url}/auth/oauth-callback?error=link_unverified_email&email={email}")
            
        new_identity = UserIdentity(
            id=str(uuid.uuid4()),
            user_id=user.id,
            provider=provider,
            provider_user_id=provider_user_id,
            provider_email=email
        )
        db.add(new_identity)
        await db.commit()
        
        token = create_access_token({"sub": user.id})
        return RedirectResponse(url=f"{settings.frontend_url}/auth/oauth-callback?token={token}")
        
    # 3. Create new user
    new_user = User(
        id=str(uuid.uuid4()),
        email=email,
        hashed_password=hash_password(secrets.token_hex(16)),
        name=name,
        is_verified=True
    )
    org = Organization(id=str(uuid.uuid4()), name=f"{name}'s workspace", slug=str(uuid.uuid4())[:8])
    membership = OrgMember(id=str(uuid.uuid4()), org_id=org.id, user_id=new_user.id, role=RoleEnum.owner)
    
    new_identity = UserIdentity(
        id=str(uuid.uuid4()),
        user_id=new_user.id,
        provider=provider,
        provider_user_id=provider_user_id,
        provider_email=email
    )
    
    db.add_all([new_user, org, membership, new_identity])
    await db.commit()
    
    token = create_access_token({"sub": new_user.id})
    return RedirectResponse(url=f"{settings.frontend_url}/auth/oauth-callback?token={token}")
@router.get("/oauth/github/start")
async def github_start(request: Request):
    state = secrets.token_urlsafe(32)
    redirect_uri = settings.github_redirect_uri or f"{settings.backend_url.rstrip('/')}/auth/oauth/github/callback"
    github_auth_url = (
        "https://github.com/login/oauth/authorize"
        f"?client_id={settings.github_client_id}"
        f"&redirect_uri={redirect_uri}"
        f"&scope=user:email"
        f"&state={state}"
    )
    response = RedirectResponse(url=github_auth_url)
    response.set_cookie(
        key="oauth_state",
        value=state,
        httponly=True,
        max_age=600,
        samesite="lax",
        secure=settings.environment == "production"
    )
    return response

@router.get("/oauth/github/callback")
async def github_callback(request: Request, code: str, state: str, db: AsyncSession = Depends(get_db)):
    cookie_state = request.cookies.get("oauth_state")
    if settings.environment != "development" and (not cookie_state or cookie_state != state):
        return RedirectResponse(url=f"{settings.frontend_url}/auth/oauth-callback?error=csrf_failure")
        
    if not settings.github_client_id or not settings.github_client_secret:
        return RedirectResponse(url=f"{settings.frontend_url}/auth/oauth-callback?error=github_not_configured")
        
    token_url = "https://github.com/login/oauth/access_token"
    headers = {"Accept": "application/json"}
    data = {
        "code": code,
        "client_id": settings.github_client_id,
        "client_secret": settings.github_client_secret,
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(token_url, json=data, headers=headers)
        if response.status_code != 200:
            return RedirectResponse(url=f"{settings.frontend_url}/auth/oauth-callback?error=token_exchange_failed")
        token_data = response.json()
        access_token = token_data.get("access_token")
        
        if not access_token:
            return RedirectResponse(url=f"{settings.frontend_url}/auth/oauth-callback?error=missing_access_token")
            
        profile_url = "https://api.github.com/user"
        headers_auth = {"Authorization": f"Bearer {access_token}", "User-Agent": "STAGE"}
        profile_response = await client.get(profile_url, headers=headers_auth)
        if profile_response.status_code != 200:
            return RedirectResponse(url=f"{settings.frontend_url}/auth/oauth-callback?error=profile_fetch_failed")
        profile = profile_response.json()
        
        provider_user_id = profile.get("id")
        name = profile.get("name") or profile.get("login") or "GitHub User"
        email = profile.get("email")
        
        if not email:
            emails_url = "https://api.github.com/user/emails"
            emails_response = await client.get(emails_url, headers=headers_auth)
            if emails_response.status_code == 200:
                emails_list = emails_response.json()
                primary_email = next((e.get("email") for e in emails_list if e.get("primary")), None)
                if primary_email:
                    email = primary_email
                elif emails_list:
                    email = emails_list[0].get("email")
                    
        if not email or not provider_user_id:
            return RedirectResponse(url=f"{settings.frontend_url}/auth/oauth-callback?error=missing_email_or_id")
            
        return await handle_oauth_user_login("github", str(provider_user_id), email, name, db)

@router.get("/me", response_model=UserOut)
async def me(current_user: User = Depends(get_current_user)):
    return current_user


class FirebaseSyncRequest(BaseModel):
    id_token: str
    name: Optional[str] = None


@router.post("/firebase-sync", response_model=ExtendedTokenResponse)
async def firebase_sync(data: FirebaseSyncRequest, db: AsyncSession = Depends(get_db)):
    if not settings.firebase_api_key:
        raise HTTPException(
            status_code=500,
            detail="Firebase API Key is not configured on the backend."
        )
        
    verify_url = f"https://identitytoolkit.googleapis.com/v1/accounts:lookup?key={settings.firebase_api_key}"
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(verify_url, json={"idToken": data.id_token}, timeout=10.0)
        except httpx.RequestError as exc:
            raise HTTPException(
                status_code=503,
                detail=f"Failed to reach Firebase Auth verification service: {exc}"
            )
            
    if response.status_code != 200:
        raise HTTPException(
            status_code=401,
            detail="Invalid Firebase ID Token"
        )
        
    res_data = response.json()
    users_list = res_data.get("users", [])
    if not users_list:
        raise HTTPException(
            status_code=401,
            detail="Firebase user not found from ID Token"
        )
        
    fb_user = users_list[0]
    email = fb_user.get("email")
    email_verified = fb_user.get("emailVerified", False)
    display_name = fb_user.get("displayName") or data.name or email.split("@")[0]
    provider_user_id = fb_user.get("localId")
    
    # Lookup user by email
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    
    if not user:
        # Create a new user record
        user = User(
            id=str(uuid.uuid4()),
            email=email,
            hashed_password=hash_password(secrets.token_hex(16)),
            name=display_name,
            is_verified=email_verified
        )
        org = Organization(id=str(uuid.uuid4()), name=f"{display_name}'s workspace", slug=str(uuid.uuid4())[:8])
        membership = OrgMember(id=str(uuid.uuid4()), org_id=org.id, user_id=user.id, role=RoleEnum.owner)
        
        # Link user to Firebase Identity
        identity = UserIdentity(
            id=str(uuid.uuid4()),
            user_id=user.id,
            provider="firebase",
            provider_user_id=provider_user_id,
            provider_email=email
        )
        
        db.add_all([user, org, membership, identity])
        await db.commit()
        await db.refresh(user)
    else:
        # Update user's name or verification status if it changed
        if user.is_verified != email_verified:
            user.is_verified = email_verified
            db.add(user)
            
        # Ensure UserIdentity exists for Firebase
        ident_result = await db.execute(
            select(UserIdentity).where(
                UserIdentity.provider == "firebase",
                UserIdentity.provider_user_id == provider_user_id
            )
        )
        if not ident_result.scalar_one_or_none():
            identity = UserIdentity(
                id=str(uuid.uuid4()),
                user_id=user.id,
                provider="firebase",
                provider_user_id=provider_user_id,
                provider_email=email
            )
            db.add(identity)
        await db.commit()
        await db.refresh(user)
        
    token = create_access_token({"sub": user.id})
    return ExtendedTokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserOut.model_validate(user)
    )



