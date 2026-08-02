import uuid
import secrets
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from models import User, UserIdentity, Organization, OrgMember, RoleEnum
from auth import hash_password

async def resolve_canonical_user(
    db: AsyncSession,
    provider: str,
    provider_user_id: str,
    email: str,
    name: Optional[str] = None,
    avatar_url: Optional[str] = None,
    email_verified: bool = True
) -> User:
    """
    Centralized canonical identity resolver.
    Guarantees that the same verified email across any auth provider (Google, GitHub, Email Link, Password)
    resolves to the exact same canonical STAGE User record and workspace data.
    """
    if not email or not email.strip():
        raise ValueError("Email is required for identity resolution.")

    normalized_email = email.strip().lower()

    # 1. First, search by provider link in user_identities
    ident_res = await db.execute(
        select(UserIdentity).where(
            UserIdentity.provider == provider,
            UserIdentity.provider_user_id == str(provider_user_id)
        )
    )
    identity = ident_res.scalar_one_or_none()

    if identity:
        user_res = await db.execute(select(User).where(User.id == identity.user_id))
        user = user_res.scalar_one_or_none()
        if user:
            user.last_login_at = datetime.now(timezone.utc)
            if email_verified and not user.is_verified:
                user.is_verified = True
            if avatar_url and not user.avatar_url:
                user.avatar_url = avatar_url
            if name and not user.name:
                user.name = name

            identity.provider_email = normalized_email
            identity.email_verified = email_verified
            db.add(user)
            db.add(identity)
            await db.commit()
            await db.refresh(user)
            return user

    # 2. Next, search for an existing canonical User by verified email (case-insensitive)
    user_res = await db.execute(
        select(User).where(func.lower(User.email) == normalized_email)
    )
    user = user_res.scalar_one_or_none()

    if user:
        # If incoming provider verifies the email, upgrade existing user to verified
        if email_verified and not user.is_verified:
            user.is_verified = True

        user.last_login_at = datetime.now(timezone.utc)
        if avatar_url and not user.avatar_url:
            user.avatar_url = avatar_url
        if name and not user.name:
            user.name = name

        # Link provider identity to existing canonical user record
        ident_check = await db.execute(
            select(UserIdentity).where(
                UserIdentity.user_id == user.id,
                UserIdentity.provider == provider,
                UserIdentity.provider_user_id == str(provider_user_id)
            )
        )
        if not ident_check.scalar_one_or_none():
            new_identity = UserIdentity(
                id=str(uuid.uuid4()),
                user_id=user.id,
                provider=provider,
                provider_user_id=str(provider_user_id),
                provider_email=normalized_email,
                email_verified=email_verified
            )
            db.add(new_identity)

        db.add(user)
        await db.commit()
        await db.refresh(user)
        return user

    # 3. No existing user record -> Create new canonical User & personal workspace Organization
    display_name = name or normalized_email.split("@")[0]
    new_user = User(
        id=str(uuid.uuid4()),
        email=normalized_email,
        hashed_password=hash_password(secrets.token_hex(16)),
        name=display_name,
        avatar_url=avatar_url,
        is_verified=email_verified,
        last_login_at=datetime.now(timezone.utc)
    )

    org = Organization(
        id=str(uuid.uuid4()),
        name=f"{display_name}'s workspace",
        slug=str(uuid.uuid4())[:8]
    )
    membership = OrgMember(
        id=str(uuid.uuid4()),
        org_id=org.id,
        user_id=new_user.id,
        role=RoleEnum.owner
    )

    new_identity = UserIdentity(
        id=str(uuid.uuid4()),
        user_id=new_user.id,
        provider=provider,
        provider_user_id=str(provider_user_id),
        provider_email=normalized_email,
        email_verified=email_verified
    )

    db.add_all([new_user, org, membership, new_identity])
    await db.commit()
    await db.refresh(new_user)
    return new_user
