import logging
import secrets
import string
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from dependencies import get_db, get_current_user
from models.core import (
    User, Organization, OrgMember, SubscriptionModel,
    RedemptionCodeModel, RedemptionCodeUseModel, EntitlementAuditLogModel
)
from services.plan_capabilities import invalidate_org_plan_cache, resolve_org_entitlements
from routes.billing import resolve_user_org_id
from routes.admin import verify_owner_access

logger = logging.getLogger("stage.routes.redemption")
router = APIRouter(tags=["redemption"])


class RedemptionCodeCreateRequest(BaseModel):
    plan: str = "stage_team"
    max_uses: int = 1
    expires_at: Optional[datetime] = None
    notes: Optional[str] = None


class RedemptionCodeRead(BaseModel):
    id: str
    code: str
    plan: str
    max_uses: int
    uses_count: int
    expires_at: Optional[datetime]
    is_active: bool
    notes: Optional[str]
    created_at: datetime


class RedeemCodeRequest(BaseModel):
    code: str


def generate_secure_code() -> str:
    # Generates a code of the format STAGE-XXXX-XXXX
    chars = string.ascii_uppercase + string.digits
    part1 = "".join(secrets.choice(chars) for _ in range(4))
    part2 = "".join(secrets.choice(chars) for _ in range(4))
    return f"STAGE-{part1}-{part2}"


@router.post("/admin/redemption-codes", response_model=RedemptionCodeRead, status_code=status.HTTP_201_CREATED)
async def create_redemption_code(
    req: RedemptionCodeCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Owner-only endpoint to generate a plan redemption code.
    """
    verify_owner_access(current_user)

    # Validate tier
    valid_tiers = ("stage_team", "dev_team", "enterprise", "none", "free")
    if req.plan not in valid_tiers:
        raise HTTPException(status_code=400, detail=f"Invalid plan/tier. Allowed: {valid_tiers}")

    # Generate a unique code
    for _ in range(10):
        code_str = generate_secure_code()
        # check unique
        res = await db.execute(select(RedemptionCodeModel).where(RedemptionCodeModel.code == code_str))
        if not res.scalar_one_or_none():
            break
    else:
        # Fallback to random alphanumeric string if suffix collisions occurred (unlikely)
        code_str = "STAGE-" + "".join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(8))

    new_code = RedemptionCodeModel(
        code=code_str,
        plan=req.plan,
        max_uses=req.max_uses,
        expires_at=req.expires_at,
        created_by=current_user.id,
        notes=req.notes
    )

    db.add(new_code)
    await db.commit()
    await db.refresh(new_code)

    logger.info(
        f"[STAGE Redemption] Owner {current_user.email} (id={current_user.id}) created "
        f"redemption code '{code_str}' for plan '{req.plan}' (max_uses={req.max_uses}, notes={req.notes})"
    )

    return new_code


@router.post("/billing/redeem-code")
async def redeem_code(
    req: RedeemCodeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    User-facing endpoint to redeem a plan code and upgrade organization plan.
    """
    input_code = req.code.strip().upper()
    if not input_code:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Redemption code cannot be empty.")

    # Fetch code
    res = await db.execute(select(RedemptionCodeModel).where(RedemptionCodeModel.code == input_code))
    code_obj = res.scalar_one_or_none()

    if not code_obj or not code_obj.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or inactive redemption code.")

    # Expiry check
    if code_obj.expires_at:
        exp = code_obj.expires_at
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
        if datetime.now(timezone.utc) > exp:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Redemption code has expired.")

    # Max uses check
    if code_obj.uses_count >= code_obj.max_uses:
        # Mark inactive for good hygiene
        code_obj.is_active = False
        await db.commit()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Redemption code has already reached its maximum usage limit.")

    # Resolve organization ID for current user
    org_id = await resolve_user_org_id(db, current_user)

    # Fetch organization
    org_res = await db.execute(select(Organization).where(Organization.id == org_id))
    org_obj = org_res.scalar_one_or_none()
    if not org_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User organization not found.")

    # Get subscription
    sub_res = await db.execute(select(SubscriptionModel).where(SubscriptionModel.org_id == org_id))
    sub = sub_res.scalar_one_or_none()

    if not sub:
        sub = SubscriptionModel(
            org_id=org_id,
            plan_type="none",
            status="none",
            is_test_mode=True,
            seats_allowed=1,
            projects_allowed=1
        )
        db.add(sub)
        await db.flush()

    previous_plan = sub.plan_type
    new_plan = code_obj.plan

    # Update subscription plan and status
    sub.plan_type = new_plan
    sub.status = "active"
    if new_plan in ("stage_team", "enterprise"):
        sub.seats_allowed = 9999
        sub.projects_allowed = 9999
    elif new_plan in ("dev_team", "dev_team_early_bird"):
        sub.seats_allowed = 5
        sub.projects_allowed = 10
    else:
        sub.seats_allowed = 1
        sub.projects_allowed = 1

    # Upgrade organization internal flag if plan is stage_team
    if new_plan == "stage_team":
        org_obj.is_internal = True

    # Record usage
    use_record = RedemptionCodeUseModel(
        code_id=code_obj.id,
        redeemed_by_user_id=current_user.id,
        redeemed_by_org_id=org_id,
        previous_plan=previous_plan,
        new_plan=new_plan
    )
    db.add(use_record)

    # Increment use count
    code_obj.uses_count += 1
    if code_obj.uses_count >= code_obj.max_uses:
        code_obj.is_active = False

    # Also log to EntitlementAuditLogModel
    audit_log = EntitlementAuditLogModel(
        actor_id=current_user.id,
        actor_email=current_user.email,
        target_org_id=org_id,
        target_user_id=current_user.id,
        old_tier=previous_plan,
        new_tier=new_plan,
        reason=f"Plan redeemed via code: {code_obj.code}"
    )
    db.add(audit_log)

    await db.commit()

    # Invalidate cache
    invalidate_org_plan_cache(org_id)

    # Retrieve fresh entitlements
    entitlements = await resolve_org_entitlements(current_user.id, db)

    logger.info(
        f"[STAGE Redemption] User {current_user.email} successfully redeemed code '{code_obj.code}', "
        f"upgraded org_id={org_id} from '{previous_plan}' to '{new_plan}'."
    )

    return {
        "success": True,
        "message": f"Successfully redeemed code. Plan updated to '{new_plan}'.",
        "plan_type": new_plan,
        "entitlements": entitlements
    }
