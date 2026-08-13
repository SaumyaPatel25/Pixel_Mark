import uuid
import secrets
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from models import User, UserIdentity, Organization, OrgMember, RoleEnum
from auth import hash_password


def is_entrext_domain(email: str) -> bool:
    """
    Strictly verifies if an email belongs to the entrext.com domain.
    Normalizes by trimming and lowercasing, and checks for exact domain match after '@'.
    Guards against 'notentrext.com' or 'entrext.com.evil.com'.
    """
    if not email or not isinstance(email, str):
        return False
    normalized = email.strip().lower()
    parts = normalized.split("@")
    if len(parts) != 2:
        return False
    return parts[1] == "entrext.com"


def _get_founder_emails():
    """Returns the set of all founder emails (lowercase) from config."""
    try:
        from config import settings
        raw = getattr(settings, "stage_founder_emails", "") or getattr(settings, "stage_founder_email", "") or ""
        return {e.strip().lower() for e in raw.split(",") if e.strip()}
    except Exception:
        return {"saumyavishwam@gmail.com", "saumya@entrext.com", "saumyapatel25@gmail.com"}


async def ensure_domain_and_founder_entitlement(user: User, db: AsyncSession, auth_provider: Optional[str] = None) -> None:
    """
    Auto-provisions stage_team entitlement for @entrext.com domain verified users or founder emails.
    Runs idempotently on signup and every login. Writes audit log on change.
    """
    from models.core import SubscriptionModel, EntitlementAuditLogModel, Organization
    from services.plan_capabilities import invalidate_org_plan_cache

    if not user or not user.email:
        return

    email_clean = user.email.strip().lower()
    founder_emails = _get_founder_emails()
    is_domain_match = is_entrext_domain(email_clean)
    is_founder_match = email_clean in founder_emails

    if not (is_domain_match or is_founder_match):
        return

    # Security check: Ensure user email is verified before auto-granting domain entitlement
    # (unless it's an explicit founder account)
    if is_domain_match and not user.is_verified and not is_founder_match:
        return

    # Find personal workspace organization
    mem_res = await db.execute(select(OrgMember).where(OrgMember.user_id == user.id))
    memberships = mem_res.scalars().all()
    if not memberships:
        return

    # Target user's primary/owner workspace
    target_org_id = memberships[0].org_id
    for m in memberships:
        if getattr(m, "role", None) == RoleEnum.owner:
            target_org_id = m.org_id
            break

    # Mark Organization as internal
    org_res = await db.execute(select(Organization).where(Organization.id == target_org_id))
    org = org_res.scalar_one_or_none()
    if org and not org.is_internal:
        org.is_internal = True
        db.add(org)

    # Resolve or create subscription record
    sub_res = await db.execute(select(SubscriptionModel).where(SubscriptionModel.org_id == target_org_id))
    sub = sub_res.scalar_one_or_none()

    source_label = "domain_auto_provision" if is_domain_match else "founder_auto_provision"
    old_plan = sub.plan_type if sub else "none"

    if sub:
        if sub.plan_type != "stage_team" or sub.status != "active":
            sub.plan_type = "stage_team"
            sub.status = "active"
            sub.seats_allowed = 9999
            sub.projects_allowed = 9999
            sub.plan_source = source_label
            sub.dodo_customer_id = "stage_team_internal"
            sub.is_test_mode = True
            db.add(sub)

            # Audit log entry
            audit_log = EntitlementAuditLogModel(
                actor_id=user.id,
                actor_email=user.email,
                target_org_id=target_org_id,
                target_user_id=user.id,
                old_tier=old_plan,
                new_tier="stage_team",
                reason=f"Auto-provisioned {source_label} (provider: {auth_provider or 'login_sync'})"
            )
            db.add(audit_log)
            await db.commit()
            invalidate_org_plan_cache(target_org_id)
    else:
        new_sub = SubscriptionModel(
            id=str(uuid.uuid4()),
            org_id=target_org_id,
            plan_type="stage_team",
            status="active",
            seats_allowed=9999,
            projects_allowed=9999,
            plan_source=source_label,
            dodo_customer_id="stage_team_internal",
            is_test_mode=True,
        )
        db.add(new_sub)

        audit_log = EntitlementAuditLogModel(
            actor_id=user.id,
            actor_email=user.email,
            target_org_id=target_org_id,
            target_user_id=user.id,
            old_tier="none",
            new_tier="stage_team",
            reason=f"Auto-provisioned {source_label} on creation (provider: {auth_provider or 'login_sync'})"
        )
        db.add(audit_log)
        await db.commit()
        invalidate_org_plan_cache(target_org_id)


async def _ensure_founder_plan(user: User, db: AsyncSession) -> None:
    await ensure_domain_and_founder_entitlement(user, db)


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
            await _ensure_founder_plan(user, db)
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
        await _ensure_founder_plan(user, db)
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
    # Auto-promote founder on first login
    await _ensure_founder_plan(new_user, db)
    return new_user
