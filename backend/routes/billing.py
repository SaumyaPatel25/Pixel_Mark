import logging
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

PROCESSED_WEBHOOK_EVENTS = set()

# Helper function to get or create default subscription for an organization
async def get_or_create_subscription(db: AsyncSession, org_id: str) -> SubscriptionModel:
    res = await db.execute(select(SubscriptionModel).where(SubscriptionModel.org_id == org_id))
    sub = res.scalar_one_or_none()
    if not sub:
        is_test = (settings.dodo_environment == "test_mode")
        sub = SubscriptionModel(
            org_id=org_id,
            plan_type="solopreneur",
            status="active",
            is_test_mode=is_test,
            seats_allowed=1,
            projects_allowed=5
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
    target_org_id = await resolve_user_org_id(db, current_user, org_id)
    sub = await get_or_create_subscription(db, target_org_id)

    # Usage stats
    proj_res = await db.execute(select(func.count(Project.id)).where(Project.org_id == target_org_id))
    projects_used = proj_res.scalar() or 0

    mem_res = await db.execute(select(func.count(OrgMember.id)).where(OrgMember.org_id == target_org_id))
    seats_used = mem_res.scalar() or 0

    has_dom_edit = sub.plan_type in ("dev_team", "dev_team_early_bird", "enterprise") and sub.status == "active"
    is_early_bird = (sub.plan_type == "dev_team_early_bird")

    return BillingStatusResponse(
        subscription=SubscriptionRead.model_validate(sub),
        projects_used=projects_used,
        seats_used=seats_used,
        has_blueprint_dom_edit=has_dom_edit,
        is_early_bird=is_early_bird,
        is_test_mode=sub.is_test_mode
    )


@router.post("/checkout", response_model=CheckoutResponse)
async def create_checkout(
    payload: CheckoutRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if payload.plan_type == "enterprise":
        raise HTTPException(
            status_code=400,
            detail="Enterprise plan is custom-managed. Please click 'Let's talk' to contact our team directly."
        )

    if payload.plan_type not in ("solopreneur", "dev_team"):
        raise HTTPException(status_code=400, detail="Invalid plan_type requested.")

    target_org_id = await resolve_user_org_id(db, current_user, payload.org_id)
    early_bird_applied = False
    requested_plan = payload.plan_type
    discount_code = None

    if payload.plan_type == "dev_team":
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
    else:
        product_id = settings.dodo_product_id_solopreneur

    customer = await dodo_client.create_customer(email=current_user.email, name=current_user.name or current_user.email)
    customer_id = customer.get("customer_id", f"cust_{current_user.id[:8]}")

    redirect_url = f"{settings.frontend_url}/billing/success?org_id={target_org_id}&plan={requested_plan}"

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
        checkout_url=session.get("checkout_url", f"https://test.dodopayments.com/buy/{product_id}"),
        session_id=session.get("session_id", f"cs_test_{target_org_id[:8]}"),
        plan_type=requested_plan,
        early_bird_applied=early_bird_applied,
        is_test_mode=(settings.dodo_environment == "test_mode")
    )


@router.post("/cancel")
async def cancel_subscription_endpoint(
    org_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    target_org_id = await resolve_user_org_id(db, current_user, org_id)
    sub = await get_or_create_subscription(db, target_org_id)

    if sub.dodo_subscription_id:
        try:
            await dodo_client.cancel_subscription(sub.dodo_subscription_id)
        except Exception as e:
            logger.warning(f"[STAGE Billing] Cancel Dodo subscription error: {e}")

    sub.status = "canceled"
    await db.commit()
    return {"message": "Subscription canceled successfully", "status": "canceled"}


@router.post("/webhooks/dodo")
async def handle_dodo_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    payload_bytes = await request.body()
    headers = dict(request.headers)

    if not dodo_client.verify_webhook_signature(payload_bytes, headers):
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    try:
        data = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")

    event_id = data.get("event_id") or data.get("id")
    if event_id and event_id in PROCESSED_WEBHOOK_EVENTS:
        return {"message": "Event already processed"}

    event_type = data.get("event_type") or data.get("type", "unknown")
    event_data = data.get("data", {})
    metadata = event_data.get("metadata", {})

    org_id = metadata.get("org_id")
    plan_type = metadata.get("plan_type", "solopreneur")
    sub_id = event_data.get("subscription_id") or event_data.get("id")
    cust_id = event_data.get("customer_id")

    logger.info(f"[STAGE Billing Webhook] Received Dodo event '{event_type}' for org {org_id}")

    if org_id and event_type in ("subscription.created", "subscription.updated", "payment.succeeded"):
        res = await db.execute(select(SubscriptionModel).where(SubscriptionModel.org_id == org_id))
        sub = res.scalar_one_or_none()
        if not sub:
            sub = SubscriptionModel(org_id=org_id)
            db.add(sub)

        sub.plan_type = plan_type
        sub.status = "active"
        sub.dodo_subscription_id = sub_id
        sub.dodo_customer_id = cust_id
        sub.is_test_mode = (settings.dodo_environment == "test_mode")

        if plan_type in ("dev_team", "dev_team_early_bird"):
            sub.seats_allowed = 5
            sub.projects_allowed = 10
        else: # solopreneur
            sub.seats_allowed = 1
            sub.projects_allowed = 5

        await db.commit()

    elif org_id and event_type in ("subscription.canceled", "payment.failed"):
        res = await db.execute(select(SubscriptionModel).where(SubscriptionModel.org_id == org_id))
        sub = res.scalar_one_or_none()
        if sub:
            sub.status = "canceled"
            await db.commit()

    if event_id:
        PROCESSED_WEBHOOK_EVENTS.add(event_id)

    return {"message": "Webhook processed successfully", "event_type": event_type}
