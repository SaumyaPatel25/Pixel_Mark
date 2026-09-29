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


class FeedbackSubmissionRequest(BaseModel):
    category: str = Field(..., description="Category: improve, add, remove, bug, general")
    message: str = Field(..., min_length=3, max_length=5000)
    rating: Optional[int] = Field(None, ge=1, le=5)
    name: Optional[str] = Field("Anonymous", max_length=128)
    email: Optional[str] = Field(None, max_length=256)
    role: Optional[str] = Field("user", max_length=32)
    sentiment: Optional[str] = Field(None, max_length=32)


@router.post("/marketing/feedback", status_code=status.HTTP_201_CREATED)
@router.post("/api/marketing/feedback", status_code=status.HTTP_201_CREATED)
async def submit_feedback(
    payload: FeedbackSubmissionRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Submits user feedback about STAGE directly to saumya@entrext.com
    without requiring the user to open an external mail client.
    Stores record in database for backup.
    """
    category_labels = {
        "improve": ("What to Improve", "#8b5cf6", "🚀"),
        "add": ("What to Add / Feature Request", "#06b6d4", "💡"),
        "remove": ("What to Remove / Simplify", "#f59e0b", "✂️"),
        "bug": ("Bug / Issue Report", "#ef4444", "🐞"),
        "general": ("General Feedback", "#3b82f6", "💬"),
    }

    category_key = payload.category.strip().lower()
    cat_label, cat_color, cat_emoji = category_labels.get(category_key, ("Product Feedback", "#6366f1", "📝"))

    sender_name = (payload.name.strip() if payload.name and payload.name.strip() else "Anonymous User")[:128]
    sender_email = (payload.email.strip().lower() if payload.email and payload.email.strip() else "anonymous@stage.entrext.com")[:256]
    stars_str = f" ({payload.rating}/5 ⭐)" if payload.rating else ""

    subject_header = f"[STAGE Feedback] {cat_emoji} {cat_label}{stars_str} - from {sender_name}"

    # 1. Persist to database
    query_record = LandingQuery(
        name=sender_name,
        email=sender_email,
        role="feedback",
        subject=f"[{category_key.upper()}] {cat_label}{stars_str}",
        message=payload.message.strip(),
        status="pending"
    )

    db.add(query_record)
    await db.commit()
    await db.refresh(query_record)

    # 2. Render rich HTML email
    reply_button_html = ""
    if payload.email and "@" in payload.email:
        reply_button_html = f"""
        <div style="text-align: center; margin-top: 28px;">
          <a href="mailto:{sender_email}?subject=Re: {subject_header}" 
             style="display: inline-block; background: #6366f1; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 14px; box-shadow: 0 4px 6px -1px rgba(99, 102, 241, 0.4);">
            Reply to {sender_name} ({sender_email})
          </a>
        </div>
        """

    rating_row_html = ""
    if payload.rating:
        stars_visual = "★" * payload.rating + "☆" * (5 - payload.rating)
        rating_row_html = f"""
          <tr>
            <td style="color: #94a3b8; padding: 6px 0; width: 130px;"><strong>Rating:</strong></td>
            <td style="color: #fbbf24; padding: 6px 0; font-size: 16px; font-weight: bold;">{stars_visual} ({payload.rating}/5)</td>
          </tr>
        """

    html_body = f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #0b0f19; color: #f3f4f6; margin: 0; padding: 32px 16px;">
  <div style="max-width: 600px; margin: 0 auto; background: #111827; border: 1px solid #1f2937; border-radius: 12px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);">
    <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 24px; color: #ffffff;">
      <h1 style="margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.025em;">STAGE · Direct Product Feedback</h1>
      <p style="margin: 6px 0 0 0; font-size: 13px; opacity: 0.9;">Direct user submission from stage.entrext.com/feedback</p>
    </div>
    <div style="padding: 28px;">
      <div style="background: #1e293b; border-radius: 8px; padding: 16px; margin-bottom: 24px; border: 1px solid #334155;">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="color: #94a3b8; padding: 6px 0; width: 130px;"><strong>Category:</strong></td>
            <td style="color: #f1f5f9; padding: 6px 0;">
              <span style="display: inline-block; background: {cat_color}22; color: {cat_color}; border: 1px solid {cat_color}44; font-size: 12px; font-weight: 700; padding: 3px 12px; border-radius: 9999px;">
                {cat_emoji} {cat_label.upper()}
              </span>
            </td>
          </tr>
          {rating_row_html}
          <tr>
            <td style="color: #94a3b8; padding: 6px 0;"><strong>Sender:</strong></td>
            <td style="color: #f1f5f9; padding: 6px 0;">{sender_name}</td>
          </tr>
          <tr>
            <td style="color: #94a3b8; padding: 6px 0;"><strong>Email:</strong></td>
            <td style="color: #38bdf8; padding: 6px 0;">
              {f'<a href="mailto:{sender_email}" style="color: #38bdf8; text-decoration: none;">{sender_email}</a>' if payload.email else '<span style="color: #64748b; font-style: italic;">Not provided (Anonymous)</span>'}
            </td>
          </tr>
          <tr>
            <td style="color: #94a3b8; padding: 6px 0;"><strong>Received At:</strong></td>
            <td style="color: #94a3b8; padding: 6px 0;">{datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}</td>
          </tr>
        </table>
      </div>
      
      <div style="margin-bottom: 24px;">
        <h3 style="font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; margin: 0 0 10px 0;">Feedback Details</h3>
        <div style="background: #0f172a; border-radius: 8px; padding: 20px; border: 1px solid #1e293b; color: #e2e8f0; font-size: 15px; line-height: 1.6; white-space: pre-wrap;">
{payload.message.strip()}
        </div>
      </div>

      {reply_button_html}
    </div>
    <div style="border-top: 1px solid #1f2937; padding: 16px 28px; background: #0b0f19; text-align: center; font-size: 12px; color: #64748b;">
      Dispatched directly to {TARGET_EMAIL} from STAGE In-App Feedback Gateway.
    </div>
  </div>
</body>
</html>"""

    fallback_text = f"New STAGE Feedback [{cat_label}]:\nFrom: {sender_name} ({sender_email})\nRating: {payload.rating or 'N/A'}/5\n\n{payload.message.strip()}"

    try:
        send_email_wrapper(
            subject=subject_header,
            to=TARGET_EMAIL,
            html=html_body,
            fallback_msg=fallback_text
        )
        logger.info(f"[STAGE FEEDBACK] Email dispatched to {TARGET_EMAIL} for feedback id={query_record.id}")
    except Exception as e:
        logger.error(f"[STAGE FEEDBACK] Failed to send email to {TARGET_EMAIL}: {e}")

    return {
        "success": True,
        "id": query_record.id,
        "message": "Thank you! Your feedback has been sent directly to the creator."
    }

