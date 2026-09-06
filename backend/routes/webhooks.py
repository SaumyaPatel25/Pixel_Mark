"""
backend/routes/webhooks.py

Webhook Management API for STAGE.
Allows authenticated project members to register, list, delete, and test outbound
webhook endpoints with strict pre-flight SSRF validation.
"""

import ipaddress
import logging
import socket
import urllib.parse
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from dependencies import get_current_user, get_db
from models.core import OrgMember, Project, User
from models.webhooks import WebhookEndpoint, gen_secret_token
from services.webhook_dispatcher import (
    deliver_webhook_payload,
    is_ip_restricted,
)
from utils.ssrf_guard import is_ssrf_safe

logger = logging.getLogger("stage.routes.webhooks")

router = APIRouter(tags=["webhooks"])


# ---------------------------------------------------------------------------
# Pydantic Request & Response Schemas
# ---------------------------------------------------------------------------

class WebhookCreateRequest(BaseModel):
    name: str = Field(
        ...,
        min_length=1,
        max_length=128,
        description="Friendly identifier (e.g. 'Team Slack', 'Linear Sync')"
    )
    target_url: str = Field(
        ...,
        description="Public HTTPS/HTTP URL endpoint to receive webhooks"
    )
    subscribed_events: List[str] = Field(
        default=["pin.created"],
        description="List of subscribed events e.g. ['pin.created', 'pin.status_changed'] or ['*']"
    )

    @field_validator("name")
    def validate_name(cls, v: str) -> str:
        clean = v.strip()
        if not clean:
            raise ValueError("Webhook name cannot be blank")
        return clean

    @field_validator("target_url")
    def validate_target_url(cls, v: str) -> str:
        clean = v.strip()
        parsed = urllib.parse.urlparse(clean)
        if parsed.scheme not in ("http", "https"):
            raise ValueError("Target URL scheme must be http or https")
        if not parsed.hostname:
            raise ValueError("Target URL must have a valid hostname")
        return clean

    @field_validator("subscribed_events")
    def validate_events(cls, v: List[str]) -> List[str]:
        if not v:
            raise ValueError("At least one subscribed event is required")
        return [evt.strip() for evt in v if evt.strip()]


class WebhookCreateResponse(BaseModel):
    id: str
    project_id: str
    name: str
    target_url: str
    secret_token: str  # Unmasked secret returned once upon creation
    subscribed_events: List[str]
    is_active: bool
    created_at: Optional[datetime]
    last_triggered_at: Optional[datetime]
    failure_count: int


class WebhookItemResponse(BaseModel):
    id: str
    project_id: str
    name: str
    target_url: str
    secret_token: str  # Masked secret e.g. whsec_a1b2...c3d4
    subscribed_events: List[str]
    is_active: bool
    created_at: Optional[datetime]
    last_triggered_at: Optional[datetime]
    failure_count: int


class WebhookTestResponse(BaseModel):
    status: str
    status_code: Optional[int] = None
    latency_ms: float
    delivery_id: Optional[str] = None
    message: Optional[str] = None
    error: Optional[str] = None


# ---------------------------------------------------------------------------
# Security Helpers
# ---------------------------------------------------------------------------

async def verify_project_access(
    project_id: str,
    current_user: User,
    db: AsyncSession
) -> Project:
    """
    Validates UUID format and verifies current user belongs to the project's organization.
    """
    try:
        uuid.UUID(project_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid project UUID format"
        )

    org_res = await db.execute(select(OrgMember).where(OrgMember.user_id == current_user.id))
    members = org_res.scalars().all()
    if not members:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: User does not belong to any organization"
        )

    org_ids = [m.org_id for m in members]
    proj_res = await db.execute(
        select(Project).where(
            Project.id == project_id,
            Project.org_id.in_(org_ids),
            Project.status != "soft_deleted"
        )
    )
    project = proj_res.scalar_one_or_none()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found or access denied"
        )
    return project


def enforce_preflight_ssrf_safety(url: str) -> None:
    """
    Strict pre-flight SSRF guard.
    Rejects private, loopback, link-local, and cloud metadata destinations with HTTP 400.
    """
    parsed = urllib.parse.urlparse(url)
    hostname = parsed.hostname
    if not hostname:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Target URL must include a valid hostname"
        )

    # 1. Base platform SSRF validator check
    if not is_ssrf_safe(url):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Target URL failed platform SSRF validation: destination is disallowed."
        )

    # 2. Strict DNS resolution check for private / loopback / cloud-metadata ranges
    clean_host = hostname[1:-1] if hostname.startswith("[") and hostname.endswith("]") else hostname
    try:
        addr_info = socket.getaddrinfo(clean_host, None)
    except socket.gaierror as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Target URL hostname could not be resolved via DNS: {exc}"
        )

    for family, socktype, proto, canonname, sockaddr in addr_info:
        ip_str = sockaddr[0]
        restricted, reason = is_ip_restricted(ip_str)
        if restricted:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Target URL resolves to blocked non-public IP ({ip_str}): {reason}"
            )


# ---------------------------------------------------------------------------
# Webhook CRUD Routes
# ---------------------------------------------------------------------------

@router.post(
    "/projects/{project_id}/webhooks",
    response_model=WebhookCreateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new outbound webhook endpoint"
)
async def create_webhook(
    project_id: str,
    payload: WebhookCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Registers a new outbound webhook endpoint for the specified project.
    Runs pre-flight SSRF checks and returns the generated secret token once.
    """
    await verify_project_access(project_id, current_user, db)

    # Pre-flight SSRF verification
    enforce_preflight_ssrf_safety(payload.target_url)

    secret_token = gen_secret_token()
    webhook = WebhookEndpoint(
        project_id=project_id,
        name=payload.name,
        target_url=payload.target_url,
        secret_token=secret_token,
        subscribed_events=payload.subscribed_events,
        is_active=True,
    )

    db.add(webhook)
    await db.commit()
    await db.refresh(webhook)

    logger.info(f"[Webhooks] Created webhook endpoint {webhook.id} for project {project_id}")

    return WebhookCreateResponse(
        id=webhook.id,
        project_id=webhook.project_id,
        name=webhook.name,
        target_url=webhook.target_url,
        secret_token=webhook.secret_token,  # Revealed once upon creation
        subscribed_events=webhook.subscribed_events or [],
        is_active=webhook.is_active,
        created_at=webhook.created_at,
        last_triggered_at=webhook.last_triggered_at,
        failure_count=webhook.failure_count,
    )


@router.get(
    "/projects/{project_id}/webhooks",
    response_model=List[WebhookItemResponse],
    summary="List active webhooks for a project"
)
async def list_webhooks(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Lists all webhook endpoints for the specified project with masked secret tokens.
    """
    await verify_project_access(project_id, current_user, db)

    res = await db.execute(
        select(WebhookEndpoint)
        .where(WebhookEndpoint.project_id == project_id)
        .order_by(WebhookEndpoint.created_at.desc())
    )
    webhooks = res.scalars().all()

    return [
        WebhookItemResponse(
            id=wh.id,
            project_id=wh.project_id,
            name=wh.name,
            target_url=wh.target_url,
            secret_token=wh.mask_secret(),
            subscribed_events=wh.subscribed_events or [],
            is_active=wh.is_active,
            created_at=wh.created_at,
            last_triggered_at=wh.last_triggered_at,
            failure_count=wh.failure_count,
        )
        for wh in webhooks
    ]


@router.delete(
    "/projects/{project_id}/webhooks/{webhook_id}",
    summary="Delete a webhook endpoint"
)
async def delete_webhook(
    project_id: str,
    webhook_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Deletes a registered webhook endpoint.
    """
    await verify_project_access(project_id, current_user, db)

    res = await db.execute(
        select(WebhookEndpoint).where(
            WebhookEndpoint.id == webhook_id,
            WebhookEndpoint.project_id == project_id
        )
    )
    webhook = res.scalar_one_or_none()
    if not webhook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Webhook endpoint not found"
        )

    await db.delete(webhook)
    await db.commit()

    logger.info(f"[Webhooks] Deleted webhook endpoint {webhook_id} from project {project_id}")
    return {"status": "deleted", "id": webhook_id, "message": "Webhook deleted successfully"}


@router.post(
    "/projects/{project_id}/webhooks/{webhook_id}/test",
    response_model=WebhookTestResponse,
    summary="Send a mock ping event to verify webhook connectivity"
)
async def test_webhook(
    project_id: str,
    webhook_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Sends a mock 'ping' event to test the webhook endpoint's reachability,
    HMAC validation, and HTTP response.
    """
    project = await verify_project_access(project_id, current_user, db)

    res = await db.execute(
        select(WebhookEndpoint).where(
            WebhookEndpoint.id == webhook_id,
            WebhookEndpoint.project_id == project_id
        )
    )
    webhook = res.scalar_one_or_none()
    if not webhook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Webhook endpoint not found"
        )

    mock_payload = {
        "event": "ping",
        "project_id": project_id,
        "project_name": project.name,
        "webhook_id": webhook.id,
        "triggered_by": current_user.email,
        "timestamp": datetime.utcnow().isoformat(),
        "message": "STAGE Webhook Test Connection"
    }

    success, status_code, elapsed_ms, err_msg, delivery_id = await deliver_webhook_payload(
        webhook=webhook,
        event_type="ping",
        payload=mock_payload,
        db=db
    )

    if not success:
        return WebhookTestResponse(
            status="failed",
            status_code=status_code,
            latency_ms=elapsed_ms,
            delivery_id=delivery_id,
            error=err_msg
        )

    return WebhookTestResponse(
        status="success",
        status_code=status_code,
        latency_ms=elapsed_ms,
        delivery_id=delivery_id,
        message="Test event delivered and acknowledged successfully"
    )
