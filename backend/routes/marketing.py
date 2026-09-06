"""
backend/routes/marketing.py

FastAPI router for landing page telemetry and lead generation:
- POST /marketing/cta-click and /api/marketing/cta-click: Tracks landing page signup CTA clicks with IP/UserAgent/Role attribution
- GET /marketing/cta-stats: Aggregated analytics for signup CTA conversions
- POST /marketing/contact-query and /api/marketing/contact-query: Submits user inquiries directly to saumya@entrext.com
"""

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
import logging

try:
    from dependencies import get_db
    from models.marketing import LandingCtaClick, LandingQuery
    from services.email import send_email_wrapper
except ImportError:
    from backend.dependencies import get_db
    from backend.models.marketing import LandingCtaClick, LandingQuery
    from backend.services.email import send_email_wrapper

logger = logging.getLogger("stage.marketing")

router = APIRouter(tags=["marketing"])

TARGET_EMAIL = "saumya@entrext.com"


class CtaClickRequest(BaseModel):
    cta_id: str = Field(..., description="Identifier for the CTA, e.g. 'hero_signup_cta', 'client_toggle_cta', 'free_plan_signup'")
    target_role: Optional[str] = Field("client", description="Target role: client, developer, agency, general")
    page_url: Optional[str] = None
    referrer: Optional[str] = None


class ContactQueryRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=128)
    email: EmailStr
    role: Optional[str] = Field("client", description="Role: client, developer, agency, founder, other")
    subject: str = Field(..., min_length=2, max_length=256)
    message: str = Field(..., min_length=5, max_length=4000)


def _get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


@router.post("/marketing/cta-click", status_code=status.HTTP_201_CREATED)
@router.post("/api/marketing/cta-click", status_code=status.HTTP_201_CREATED)
async def track_cta_click(
    payload: CtaClickRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Records a click on a signup or conversion CTA button on the landing page.
    Stores IP address, user-agent, target role, and page URL in the database.
    """
    ip_addr = _get_client_ip(request)
    user_agent = request.headers.get("user-agent", "")[:250]
    referrer = payload.referrer or request.headers.get("referer", "")[:250]

    click = LandingCtaClick(
        cta_id=payload.cta_id[:60],
        target_role=payload.target_role[:30] if payload.target_role else "client",
        page_url=(payload.page_url or str(request.url))[:250],
        referrer=referrer,
        ip_address=ip_addr[:60],
        user_agent=user_agent
    )

    db.add(click)
    await db.commit()
    await db.refresh(click)

    logger.info(f"[CTA CLICK] Tracked cta_id={click.cta_id} role={click.target_role} from ip={ip_addr}")
    return {
        "success": True,
        "id": click.id,
        "cta_id": click.cta_id,
        "target_role": click.target_role,
        "timestamp": click.created_at.isoformat() if click.created_at else datetime.utcnow().isoformat()
    }


@router.get("/marketing/cta-stats")
@router.get("/api/marketing/cta-stats")
async def get_cta_stats(
    db: AsyncSession = Depends(get_db)
):
    """
    Returns aggregated analytics for landing page CTA clicks.
    """
    total_res = await db.execute(select(func.count(LandingCtaClick.id)))
    total_clicks = total_res.scalar() or 0

    cta_group_res = await db.execute(
        select(LandingCtaClick.cta_id, func.count(LandingCtaClick.id))
        .group_by(LandingCtaClick.cta_id)
    )
    by_cta = {row[0]: row[1] for row in cta_group_res.fetchall()}

    role_group_res = await db.execute(
        select(LandingCtaClick.target_role, func.count(LandingCtaClick.id))
        .group_by(LandingCtaClick.target_role)
    )
    by_role = {row[0]: row[1] for row in role_group_res.fetchall()}

    recent_res = await db.execute(
        select(LandingCtaClick)
        .order_by(desc(LandingCtaClick.created_at))
        .limit(10)
    )
    recent_clicks = [
        {
            "id": c.id,
            "cta_id": c.cta_id,
            "target_role": c.target_role,
            "created_at": c.created_at.isoformat() if c.created_at else None
        }
        for c in recent_res.scalars().all()
    ]

    return {
        "total_clicks": total_clicks,
        "by_cta": by_cta,
        "by_role": by_role,
        "recent_clicks": recent_clicks
    }


@router.post("/marketing/contact-query", status_code=status.HTTP_201_CREATED)
@router.post("/api/marketing/contact-query", status_code=status.HTTP_201_CREATED)
async def submit_contact_query(
    payload: ContactQueryRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Persists a user query in the database and immediately delivers
    an alert email to saumya@entrext.com.
    """
    query = LandingQuery(
        name=payload.name.strip(),
        email=payload.email.strip().lower(),
        role=payload.role.strip().lower() if payload.role else "client",
        subject=payload.subject.strip(),
        message=payload.message.strip(),
        status="pending"
    )

    db.add(query)
    await db.commit()
    await db.refresh(query)

    subject = f"[STAGE Inquiry] {query.subject} - from {query.name} ({query.role.capitalize()})"
    html_body = f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #0b0f19; color: #f3f4f6; margin: 0; padding: 32px 16px;">
  <div style="max-width: 600px; margin: 0 auto; background: #111827; border: 1px solid #1f2937; border-radius: 12px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);">
    <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 24px; color: #ffffff;">
      <h1 style="margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.025em;">STAGE · New Landing Page Inquiry</h1>
      <p style="margin: 6px 0 0 0; font-size: 13px; opacity: 0.9;">Lead received from website contact form</p>
    </div>
    <div style="padding: 28px;">
      <div style="background: #1e293b; border-radius: 8px; padding: 16px; margin-bottom: 24px; border: 1px solid #334155;">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="color: #94a3b8; padding: 6px 0; width: 110px;"><strong>Sender:</strong></td>
            <td style="color: #f1f5f9; padding: 6px 0;">{query.name}</td>
          </tr>
          <tr>
            <td style="color: #94a3b8; padding: 6px 0;"><strong>Email:</strong></td>
            <td style="color: #38bdf8; padding: 6px 0;"><a href="mailto:{query.email}" style="color: #38bdf8; text-decoration: none;">{query.email}</a></td>
          </tr>
          <tr>
            <td style="color: #94a3b8; padding: 6px 0;"><strong>Role:</strong></td>
            <td style="color: #f1f5f9; padding: 6px 0;"><span style="display: inline-block; background: #312e81; color: #c7d2fe; font-size: 12px; font-weight: 600; padding: 2px 10px; border-radius: 9999px;">{query.role.upper()}</span></td>
          </tr>
          <tr>
            <td style="color: #94a3b8; padding: 6px 0;"><strong>Subject:</strong></td>
            <td style="color: #f1f5f9; padding: 6px 0; font-weight: 600;">{query.subject}</td>
          </tr>
          <tr>
            <td style="color: #94a3b8; padding: 6px 0;"><strong>Received:</strong></td>
            <td style="color: #94a3b8; padding: 6px 0;">{datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}</td>
          </tr>
        </table>
      </div>
      
      <div style="margin-bottom: 28px;">
        <h3 style="font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; margin: 0 0 10px 0;">Message Content</h3>
        <div style="background: #0f172a; border-radius: 8px; padding: 20px; border: 1px solid #1e293b; color: #e2e8f0; font-size: 15px; line-height: 1.6; white-space: pre-wrap;">
{query.message}
        </div>
      </div>

      <div style="text-align: center; margin-top: 32px;">
        <a href="mailto:{query.email}?subject=Re: {query.subject} - STAGE" 
           style="display: inline-block; background: #4f46e5; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 14px; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.4);">
          Reply Directly to {query.name}
        </a>
      </div>
    </div>
    <div style="border-top: 1px solid #1f2937; padding: 16px 28px; background: #0b0f19; text-align: center; font-size: 12px; color: #64748b;">
      Automated inquiry alert dispatched to {TARGET_EMAIL} by STAGE Marketing Engine.
    </div>
  </div>
</body>
</html>"""

    fallback_text = f"New inquiry from {query.name} ({query.email}) [{query.role}]:\nSubject: {query.subject}\n\n{query.message}"

    try:
        send_email_wrapper(
            subject=subject,
            to=TARGET_EMAIL,
            html=html_body,
            fallback_msg=fallback_text
        )
        logger.info(f"[CONTACT QUERY] Email dispatched to {TARGET_EMAIL} for query_id={query.id}")
    except Exception as e:
        logger.error(f"[CONTACT QUERY] Failed to send email to {TARGET_EMAIL}: {e}")

    return {
        "success": True,
        "id": query.id,
        "message": "Thank you! Your query has been received and our team will get back to you shortly."
    }
