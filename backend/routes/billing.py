import logging
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Request, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update

from database import AsyncSessionLocal
from dependencies import get_db, get_current_user, get_current_user_optional
from config import settings
from models import User, Organization, OrgMember, Project, SubscriptionModel, EarlyBirdCounterModel
from schemas import (
    SubscriptionRead, CheckoutRequest, CheckoutResponse,
    EarlyBirdStatusResponse, BillingStatusResponse
)
from services.dodo_client import dodo_client

logger = logging.getLogger("stage.routes.billing")
router = APIRouter(prefix="/billing", tags=["billing"])

import time
PROCESSED_WEBHOOK_EVENTS = {}  # { event_id: timestamp }

async def is_webhook_event_processed(event_id: str) -> bool:
    if not event_id:
        return False
    try:
        from realtime.redis_broadcaster import redis_broadcaster
        redis = await redis_broadcaster.get_redis()
        if redis:
            is_set = await redis.get(f"dodo_webhook:{event_id}")
            if is_set:
                return True
    except Exception:
        pass

    now = time.time()
    if event_id in PROCESSED_WEBHOOK_EVENTS:
        if now - PROCESSED_WEBHOOK_EVENTS[event_id] < 86400:
            return True
        else:
            del PROCESSED_WEBHOOK_EVENTS[event_id]
    return False

async def mark_webhook_event_processed(event_id: str) -> None:
    if not event_id:
        return
    try:
        from realtime.redis_broadcaster import redis_broadcaster
        redis = await redis_broadcaster.get_redis()
        if redis:
            await redis.set(f"dodo_webhook:{event_id}", "1", ex=86400)
    except Exception:
        pass

    now = time.time()
    PROCESSED_WEBHOOK_EVENTS[event_id] = now
    if len(PROCESSED_WEBHOOK_EVENTS) > 5000:
        cutoff = now - 86400
        to_del = [k for k, v in PROCESSED_WEBHOOK_EVENTS.items() if v < cutoff]
        for k in to_del:
            PROCESSED_WEBHOOK_EVENTS.pop(k, None)

# Helper function to get or create default subscription for an organization
async def get_or_create_subscription(db: AsyncSession, org_id: str) -> SubscriptionModel:
    res = await db.execute(select(SubscriptionModel).where(SubscriptionModel.org_id == org_id))
    sub = res.scalar_one_or_none()
    if not sub:
        is_test = (settings.dodo_environment == "test_mode")
        sub = SubscriptionModel(
            org_id=org_id,
            plan_type="none",
            status="none",
            is_test_mode=is_test,
            seats_allowed=1,
            projects_allowed=1
        )
        db.add(sub)
        await db.commit()
        await db.refresh(sub)
    return sub


async def resolve_user_org_id(db: AsyncSession, user: User, requested_org_id: Optional[str] = None) -> str:
    if requested_org_id:
        res = await db.execute(select(OrgMember).where(OrgMember.org_id == requested_org_id, OrgMember.user_id == user.id))
        if res.scalar_one_or_none():
            return requested_org_id

    # Check first existing membership
    res = await db.execute(select(OrgMember).where(OrgMember.user_id == user.id))
    mem = res.scalar_one_or_none()
    if mem:
        return mem.org_id

    # Create default org if user has none
    new_org = Organization(name=f"{user.name or 'User'}'s Workspace", slug=f"org-{user.id[:8]}")
    db.add(new_org)
    await db.commit()
    await db.refresh(new_org)

    new_mem = OrgMember(org_id=new_org.id, user_id=user.id)
    db.add(new_mem)
    await db.commit()

    return new_org.id


@router.get("/early-bird-status", response_model=EarlyBirdStatusResponse)
async def get_early_bird_status(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(EarlyBirdCounterModel).where(EarlyBirdCounterModel.id == "dev_team_early_bird"))
    counter = res.scalar_one_or_none()
    claimed = counter.claimed_count if counter else 0
    max_limit = 50
    slots_remaining = max(0, max_limit - claimed)
    return EarlyBirdStatusResponse(
        claimed_count=claimed,
        max_limit=max_limit,
        slots_remaining=slots_remaining,
        is_active=slots_remaining > 0
    )


@router.get("/status", response_model=BillingStatusResponse)
async def get_billing_status(
    org_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from services.plan_capabilities import resolve_org_plan
    target_org_id = await resolve_user_org_id(db, current_user, org_id)
    sub = await get_or_create_subscription(db, target_org_id)
    plan_info = await resolve_org_plan(target_org_id, db)

    # Sync sub attributes with plan_info if different
    sub.plan_type = plan_info["plan_type"]
    sub.status = plan_info["status"]
    sub.projects_allowed = plan_info["projects_allowed"]
    sub.seats_allowed = plan_info["seats_allowed"]

    return BillingStatusResponse(
        subscription=SubscriptionRead.model_validate(sub),
        projects_used=plan_info["projects_used"],
        seats_used=plan_info["seats_used"],
        has_blueprint_dom_edit=plan_info["has_blueprint_dom_edit"],
        is_early_bird=plan_info["is_early_bird"],
        is_test_mode=sub.is_test_mode
    )


@router.get("/entitlements")
async def get_user_entitlements_endpoint(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from services.plan_capabilities import resolve_org_entitlements
    return await resolve_org_entitlements(current_user.id, db)


@router.get("/plan")
async def get_plan_capabilities_endpoint(
    org_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from services.plan_capabilities import resolve_org_plan
    target_org_id = await resolve_user_org_id(db, current_user, org_id)
    return await resolve_org_plan(target_org_id, db)


@router.post("/checkout", response_model=CheckoutResponse)
async def create_checkout(
    payload: CheckoutRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        if payload.plan_type == "enterprise":
            raise HTTPException(
                status_code=400,
                detail="Enterprise plan is custom-managed. Please click 'Let's talk' to contact our team directly."
            )

        if payload.plan_type != "dev_team":
            raise HTTPException(status_code=400, detail="Invalid plan_type requested. Solopreneur plan is temporarily unavailable.")

        target_org_id = await resolve_user_org_id(db, current_user, payload.org_id)
        early_bird_applied = False
        requested_plan = "dev_team"
        discount_code = None

        # Atomic lock on early bird counter to prevent race conditions past 50
        res = await db.execute(
            select(EarlyBirdCounterModel)
            .where(EarlyBirdCounterModel.id == "dev_team_early_bird")
            .with_for_update()
        )
        counter = res.scalar_one_or_none()
        if not counter:
            counter = EarlyBirdCounterModel(id="dev_team_early_bird", claimed_count=0, max_limit=50)
            db.add(counter)
            await db.flush()

        if counter.claimed_count < 50:
            counter.claimed_count += 1
            early_bird_applied = True
            requested_plan = "dev_team_early_bird"
            discount_code = settings.dodo_discount_code_dev_team_early_bird
            await db.commit()

        product_id = settings.dodo_product_id_dev_team

        customer = await dodo_client.create_customer(email=current_user.email, name=current_user.name or current_user.email)
        customer_id = customer.get("customer_id") or customer.get("id") or f"cust_{current_user.id[:8]}"

        redirect_url = f"{settings.frontend_url}/billing/success?org_id={target_org_id}&plan={requested_plan}"

        # Store customer ID in subscription immediately for webhook mapping fallback
        sub = await get_or_create_subscription(db, target_org_id)
        sub.dodo_customer_id = customer_id
        await db.commit()

        logger.info(f"[STAGE Billing Checkout] Initiated checkout for org_id={target_org_id}, user_id={current_user.id}, customer_id={customer_id}, plan_type={requested_plan}")

        session = await dodo_client.create_checkout_session(
            product_id=product_id,
            customer_id=customer_id,
            discount_code=discount_code,
            redirect_url=redirect_url,
            metadata={
                "org_id": target_org_id,
                "user_id": current_user.id,
                "plan_type": requested_plan,
                "early_bird_applied": str(early_bird_applied)
            }
        )

        return CheckoutResponse(
            checkout_url=session.get("checkout_url", f"https://test.checkout.dodopayments.com/buy/{product_id}"),
            session_id=session.get("session_id", f"cs_test_{target_org_id[:8]}"),
            plan_type=requested_plan,
            early_bird_applied=early_bird_applied,
            is_test_mode=(settings.dodo_environment == "test_mode")
        )
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        tb = traceback.format_exc()
        logger.error(f"[STAGE Diagnostic Checkout Error]: {e}\n{tb}")
        raise HTTPException(
            status_code=500,
            detail={
                "message": f"Diagnostic: {str(e)}",
                "traceback": tb,
                "dodo_base_url": getattr(dodo_client, "base_url", None),
                "is_mock": getattr(dodo_client, "is_mock", None),
                "plan_type": payload.plan_type
            }
        )


class SyncCheckoutRequest(BaseModel):
    org_id: Optional[str] = None
    subscription_id: Optional[str] = None
    plan_type: Optional[str] = None


@router.post("/cancel")
async def cancel_subscription_endpoint(
    org_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from services.plan_capabilities import invalidate_org_plan_cache
    target_org_id = await resolve_user_org_id(db, current_user, org_id)
    sub = await get_or_create_subscription(db, target_org_id)

    if sub.dodo_subscription_id:
        try:
            await dodo_client.cancel_subscription(sub.dodo_subscription_id)
        except Exception as e:
            logger.warning(f"[STAGE Billing] Cancel Dodo subscription error: {e}")

    sub.status = "canceled"
    await db.commit()
    invalidate_org_plan_cache(target_org_id)
    return {"message": "Subscription canceled successfully", "status": "canceled"}


@router.post("/sync-checkout")
async def sync_checkout_endpoint(
    req: SyncCheckoutRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Direct post-checkout sync endpoint.
    Verifies subscription status directly via Dodo Payments API or query parameters,
    ensuring instant promotion even if background webhooks are delayed or testing locally.
    """
    from services.plan_capabilities import invalidate_org_plan_cache, resolve_org_entitlements, PlanCapabilities
    target_org_id = await resolve_user_org_id(db, current_user, req.org_id)

    if not target_org_id:
        raise HTTPException(status_code=400, detail="Organization required for billing sync")

    sub = await get_or_create_subscription(db, target_org_id)
    sub_id = req.subscription_id or sub.dodo_subscription_id
    plan = req.plan_type or (sub.plan_type if sub.plan_type != "none" else "dev_team")

    if sub_id:
        try:
            dodo_sub = await dodo_client.get_subscription(sub_id)
            status = dodo_sub.get("status", "active")
            sub.dodo_subscription_id = sub_id
            sub.plan_type = plan
            sub.status = status
            sub.projects_allowed = 10 if plan in ("dev_team", "dev_team_early_bird") else (9999 if plan == "enterprise" else 1)
            sub.seats_allowed = 5 if plan in ("dev_team", "dev_team_early_bird") else (9999 if plan == "enterprise" else 1)
            await db.commit()
            invalidate_org_plan_cache(target_org_id)
            await PlanCapabilities.sync_org_project_status(target_org_id, sub.projects_allowed, db)
            logger.info(f"[STAGE Billing Sync] Verified subscription {sub_id} directly with Dodo API for org {target_org_id}")
        except Exception as e:
            logger.warning(f"[STAGE Billing Sync] Dodo API fetch error ({e}), syncing from checkout params for org {target_org_id}")
            if req.subscription_id:
                sub.dodo_subscription_id = req.subscription_id
                sub.plan_type = plan
                sub.status = "active"
                sub.projects_allowed = 10 if plan in ("dev_team", "dev_team_early_bird") else (9999 if plan == "enterprise" else 1)
                sub.seats_allowed = 5 if plan in ("dev_team", "dev_team_early_bird") else (9999 if plan == "enterprise" else 1)
                await db.commit()
                invalidate_org_plan_cache(target_org_id)
                await PlanCapabilities.sync_org_project_status(target_org_id, sub.projects_allowed, db)

    entitlements = await resolve_org_entitlements(current_user.id, db)
    return entitlements


@router.post("/webhooks/dodo")
async def handle_dodo_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    from services.plan_capabilities import invalidate_org_plan_cache, PlanCapabilities

    payload_bytes = await request.body()
    headers = dict(request.headers)

    if not dodo_client.verify_webhook_signature(payload_bytes, headers):
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    try:
        data = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")

    event_id = data.get("event_id") or data.get("id")
    if event_id and await is_webhook_event_processed(event_id):
        return {"message": "Event already processed"}

    event_type = data.get("event_type") or data.get("type", "unknown")
    event_data = data.get("data", {})
    metadata = event_data.get("metadata", {}) or data.get("metadata", {})
    custom_fields = event_data.get("custom_fields", {})

    org_id = metadata.get("org_id") or custom_fields.get("org_id")
    plan_type = metadata.get("plan_type") or custom_fields.get("plan_type") or "dev_team"
    sub_id = event_data.get("subscription_id") or event_data.get("id")
    cust_id = event_data.get("customer_id") or event_data.get("customer", {}).get("id") or event_data.get("customer", {}).get("customer_id")

    logger.info(f"[STAGE Webhook] Webhook payload: event_id={event_id}, event_type={event_type}, sub_id={sub_id}, cust_id={cust_id}, org_id_meta={org_id}")

    # Robust org_id resolution from subscription or customer mappings
    if not org_id:
        if sub_id:
            res = await db.execute(select(SubscriptionModel).where(SubscriptionModel.dodo_subscription_id == sub_id))
            existing_sub = res.scalar_one_or_none()
            if existing_sub:
                org_id = existing_sub.org_id
                logger.info(f"[STAGE Webhook] Resolved org_id={org_id} from database subscription mapping (dodo_subscription_id={sub_id})")

        if not org_id and cust_id:
            res = await db.execute(select(SubscriptionModel).where(SubscriptionModel.dodo_customer_id == cust_id))
            existing_sub = res.scalar_one_or_none()
            if existing_sub:
                org_id = existing_sub.org_id
                logger.info(f"[STAGE Webhook] Resolved org_id={org_id} from database customer mapping (dodo_customer_id={cust_id})")

        if not org_id:
            customer_data = event_data.get("customer", {})
            email = customer_data.get("email") or event_data.get("customer_email") or data.get("customer_email")
            if email:
                res = await db.execute(select(User).where(User.email == email))
                user_obj = res.scalar_one_or_none()
                if user_obj:
                    org_id = await resolve_user_org_id(db, user_obj)
                    logger.info(f"[STAGE Webhook] Resolved org_id={org_id} from fallback email matching (email={email})")

    # Look up plan_type from existing subscription if webhook metadata doesn't specify it
    if not metadata.get("plan_type") and not custom_fields.get("plan_type") and org_id:
        res = await db.execute(select(SubscriptionModel).where(SubscriptionModel.org_id == org_id))
        existing_sub = res.scalar_one_or_none()
        if existing_sub and existing_sub.plan_type != "none":
            plan_type = existing_sub.plan_type
            logger.info(f"[STAGE Webhook] Retained plan_type={plan_type} from existing subscription record")

    logger.info(f"[STAGE Billing Webhook] Received Dodo event '{event_type}' for resolved org {org_id}")

    active_event_types = (
        "subscription.created", "subscription.active", "subscription.updated",
        "subscription.plan_changed", "subscription.renewed", "payment.succeeded"
    )

    if org_id and event_type in active_event_types:
        res = await db.execute(select(SubscriptionModel).where(SubscriptionModel.org_id == org_id))
        sub = res.scalar_one_or_none()
        if not sub:
            sub = SubscriptionModel(org_id=org_id)
            db.add(sub)

        sub.plan_type = plan_type
        sub.status = "active"
        sub.past_due_since = None
        sub.dodo_subscription_id = sub_id
        sub.dodo_customer_id = cust_id
        sub.is_test_mode = (settings.dodo_environment == "test_mode")

        if plan_type in ("dev_team", "dev_team_early_bird"):
            sub.seats_allowed = 5
            sub.projects_allowed = 10
        elif plan_type == "enterprise":
            sub.seats_allowed = 9999
            sub.projects_allowed = 9999
        else:  # fallback to none limits
            sub.seats_allowed = 1
            sub.projects_allowed = 1

        await db.commit()
        invalidate_org_plan_cache(org_id)

    elif org_id and event_type in ("payment.failed", "subscription.past_due"):
        res = await db.execute(select(SubscriptionModel).where(SubscriptionModel.org_id == org_id))
        sub = res.scalar_one_or_none()
        if sub:
            sub.status = "past_due"
            sub.past_due_since = datetime.utcnow()
            await db.commit()
            invalidate_org_plan_cache(org_id)

    elif org_id and event_type in ("subscription.canceled", "subscription.expired"):
        res = await db.execute(select(SubscriptionModel).where(SubscriptionModel.org_id == org_id))
        sub = res.scalar_one_or_none()
        if sub:
            sub.status = "canceled"
            await db.commit()
            invalidate_org_plan_cache(org_id)
            # Sync projects for downgrade/cancellation
            await PlanCapabilities.sync_org_project_status(org_id, 0, db)

    if event_id:
        await mark_webhook_event_processed(event_id)

    return {"message": "Webhook processed successfully", "event_type": event_type}
