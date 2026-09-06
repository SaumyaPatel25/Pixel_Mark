"""
backend/services/sla_daemon.py

SLA Enforcement Daemon and Escalation State Machine.
Scans for open Critical and High priority pins exceeding project turnaround SLAs,
and transactionally injects escalation records into NotificationOutbox.
"""

import asyncio
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional, Tuple

from sqlalchemy import select, and_, or_, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from database import AsyncSessionLocal
from models.core import Project, OrgMember, RoleEnum
from models.notifications import NotificationOutbox
from markers.models import Marker

logger = logging.getLogger("stage.services.sla_daemon")

# ---------------------------------------------------------------------------
# Constants & Defaults
# ---------------------------------------------------------------------------

DEFAULT_CRITICAL_HOURS = 24
DEFAULT_HIGH_HOURS = 48

DEFAULT_SLA_CONFIG = {
    "critical_hours": DEFAULT_CRITICAL_HOURS,
    "high_hours": DEFAULT_HIGH_HOURS,
}

SLA_CHECK_INTERVAL_SECONDS = 3600  # Scan every 1 hour

_daemon_running = False


# ---------------------------------------------------------------------------
# SLA Configuration Resolver
# ---------------------------------------------------------------------------

def resolve_sla_threshold(sla_config: Optional[dict], priority: str) -> int:
    """
    Extracts the SLA threshold in hours for a given priority.
    Supports formats:
      - {"critical_hours": 24, "high_hours": 48}
      - {"critical": 24, "high": 48}
    Defaults:
      - critical -> 24 hours
      - high     -> 48 hours
    """
    p = (priority or "").lower()
    cfg = sla_config or {}

    val = cfg.get(f"{p}_hours", cfg.get(p))
    if val is not None:
        try:
            return int(val)
        except (ValueError, TypeError):
            pass

    if p == "critical":
        return DEFAULT_CRITICAL_HOURS
    elif p == "high":
        return DEFAULT_HIGH_HOURS
    return DEFAULT_HIGH_HOURS


# ---------------------------------------------------------------------------
# Core SLA Enforcement State Machine
# ---------------------------------------------------------------------------

async def enforce_pin_slas(db: AsyncSession) -> List[NotificationOutbox]:
    """
    Scans for open Critical and High priority markers exceeding SLA thresholds.
    Filters strictly via SQL WHERE clauses on status, priority, and time deltas.
    Idempotently injects 'pin.sla_breached' records into NotificationOutbox.

    Returns the list of newly created NotificationOutbox records.
    """
    now = datetime.now(timezone.utc)
    
    # Minimum time delta cutoff: no pin younger than 1 hour could breach an SLA
    min_cutoff = now - timedelta(hours=1)

    # Optimized subquery: check if an active escalation already exists for this pin.
    # If the pin was previously resolved and reopened, marker.updated_at will be newer
    # than the previous escalation, allowing re-escalation.
    escalation_exists = (
        select(1)
        .where(
            NotificationOutbox.marker_id == Marker.id,
            NotificationOutbox.event_type == "pin.sla_breached",
            or_(
                Marker.updated_at.is_(None),
                NotificationOutbox.created_at >= Marker.updated_at
            )
        )
        .exists()
    )

    # 1. SQL Query: Filter strictly on status = 'open', priority, time delta, and un-escalated
    stmt = (
        select(Marker, Project)
        .join(Project, Marker.project_id == Project.id)
        .where(
            Marker.status == "open",
            Marker.is_deleted == False,
            Marker.priority.in_(["critical", "high"]),
            Marker.created_at <= min_cutoff,
            ~escalation_exists
        )
        .order_by(Marker.created_at.asc())
    )

    result = await db.execute(stmt)
    candidates = result.all()

    if not candidates:
        logger.debug("[SLA Daemon] No breached candidate markers found.")
        return []

    logger.info(f"[SLA Daemon] Evaluated candidate markers from DB: {len(candidates)}")
    new_escalations: List[NotificationOutbox] = []

    for marker, project in candidates:
        # Timezone-safe timestamp comparison
        created_at = marker.created_at
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)

        time_elapsed = now - created_at
        hours_elapsed = time_elapsed.total_seconds() / 3600.0

        sla_threshold = resolve_sla_threshold(project.sla_config if project else None, marker.priority)

        # 2. Strict SLA threshold breach check
        if hours_elapsed < sla_threshold:
            continue

        # 3. Double-check idempotency to prevent concurrent race conditions
        chk_stmt = (
            select(NotificationOutbox)
            .where(
                NotificationOutbox.marker_id == marker.id,
                NotificationOutbox.event_type == "pin.sla_breached"
            )
            .order_by(desc(NotificationOutbox.created_at))
            .limit(1)
        )
        chk_res = await db.execute(chk_stmt)
        existing = chk_res.scalar_one_or_none()

        if existing:
            # If marker was not updated after existing escalation, skip to prevent infinite spam
            marker_updated = marker.updated_at
            if marker_updated and marker_updated.tzinfo is None:
                marker_updated = marker_updated.replace(tzinfo=timezone.utc)

            existing_created = existing.created_at
            if existing_created and existing_created.tzinfo is None:
                existing_created = existing_created.replace(tzinfo=timezone.utc)

            if not marker_updated or marker_updated <= existing_created:
                continue

        # 4. Resolve notification recipient (Project Owner/Admin or Marker Creator)
        recipient_user_id = marker.creator_id or "system"
        if project and project.org_id:
            owner_stmt = (
                select(OrgMember.user_id)
                .where(
                    OrgMember.org_id == project.org_id,
                    OrgMember.role.in_(["owner", "admin", RoleEnum.owner, RoleEnum.admin])
                )
                .order_by(OrgMember.id.asc())
                .limit(1)
            )
            owner_res = await db.execute(owner_stmt)
            found_owner = owner_res.scalar_one_or_none()
            if found_owner:
                recipient_user_id = found_owner

        # 5. Construct escalation payload
        pin_payload = {
            "id": marker.id,
            "marker_number": marker.marker_number,
            "title": marker.title or f"Marker #{marker.marker_number or marker.id[:8]}",
            "description": marker.description or "(No description provided)",
            "priority": marker.priority,
            "status": marker.status,
            "page_url": marker.page_url or "#",
            "page_title": marker.page_title or "Review Page",
            "target_selector": marker.target_selector or "Element",
            "creator_id": marker.creator_id,
            "creator_name": marker.creator_name or "Reviewer",
            "creator_role": marker.creator_role or "reviewer",
            "created_at": marker.created_at.isoformat() if marker.created_at else None,
            "screenshot_url": marker.screenshot_url,
        }

        outbox_payload = {
            "event": "pin.sla_breached",
            "hours_elapsed": round(hours_elapsed, 1),
            "sla_threshold_hours": sla_threshold,
            "priority": marker.priority,
            "project_id": project.id if project else marker.project_id,
            "project_name": project.name if project else "STAGE Project",
            "pin": pin_payload,
        }

        # 6. INSERT into notification_outbox
        outbox_item = NotificationOutbox(
            event_type="pin.sla_breached",
            project_id=marker.project_id,
            session_id=marker.session_id,
            marker_id=marker.id,
            actor_id=recipient_user_id,
            actor_role="system",
            payload=outbox_payload,
            status="pending"
        )
        db.add(outbox_item)
        new_escalations.append(outbox_item)

        logger.warning(
            f"🚨 [SLA Breach] Pin {marker.id} ({marker.priority}) breached SLA "
            f"({round(hours_elapsed, 1)}h > {sla_threshold}h). Queued outbox escalation."
        )

    if new_escalations:
        await db.commit()
        logger.info(f"✅ [SLA Daemon] Successfully committed {len(new_escalations)} escalation events to outbox.")

    return new_escalations


# ---------------------------------------------------------------------------
# Background Daemon Task Runner & Scheduler
# ---------------------------------------------------------------------------

async def run_sla_daemon(interval_seconds: int = SLA_CHECK_INTERVAL_SECONDS):
    """
    Long-running background task that periodically triggers SLA enforcement.
    Safely shuts down when cancelled or when stop_sla_daemon() is invoked.
    """
    global _daemon_running
    _daemon_running = True
    logger.info(f"⏰ [SLA Daemon] Started recurring SLA enforcement daemon (interval: {interval_seconds}s)")

    # Initial warm-up grace delay to let FastAPI finish startup
    try:
        await asyncio.sleep(5)
    except asyncio.CancelledError:
        _daemon_running = False
        return

    while _daemon_running:
        try:
            async with AsyncSessionLocal() as db:
                breaches = await enforce_pin_slas(db)
                if breaches:
                    logger.warning(f"🚨 [SLA Daemon] Injected {len(breaches)} SLA breach escalations.")
        except asyncio.CancelledError:
            logger.info("🛑 [SLA Daemon] Received cancellation signal. Exiting loop.")
            break
        except Exception as exc:
            logger.exception(f"❌ [SLA Daemon] Error during SLA scan iteration: {exc}")

        try:
            await asyncio.sleep(interval_seconds)
        except asyncio.CancelledError:
            break

    _daemon_running = False
    logger.info("🛑 [SLA Daemon] SLA enforcement daemon stopped.")


def stop_sla_daemon():
    """Signals the recurring SLA daemon loop to terminate."""
    global _daemon_running
    _daemon_running = False


# ---------------------------------------------------------------------------
# Email Compilation & Template Rendering
# ---------------------------------------------------------------------------

def render_sla_breach_email(
    item: NotificationOutbox,
    session_title: str,
    review_url: str
) -> Tuple[str, str, str]:
    """
    Renders an aggressive, high-visibility HTML email and subject for an SLA breach.
    Subject follows: '🚨 STAGE Escalation: Critical Pin Unresolved for 24h'
    """
    payload = item.payload or {}
    pin = payload.get("pin", {})
    hours_elapsed = int(payload.get("hours_elapsed", 24))
    sla_threshold = payload.get("sla_threshold_hours", 24)
    priority = (pin.get("priority") or payload.get("priority", "critical")).upper()
    project_name = payload.get("project_name", "STAGE Project")

    pin_title = pin.get("title") or f"Marker #{pin.get('marker_number', '1')}"
    pin_description = pin.get("description") or "(No description provided)"
    creator_name = pin.get("creator_name") or "Reviewer"
    creator_role = pin.get("creator_role") or "reviewer"
    target_selector = pin.get("target_selector") or "body"
    page_title = pin.get("page_title") or session_title or "Review Page"
    page_url = pin.get("page_url") or review_url

    # Exact requested subject line format
    subject = f"🚨 STAGE Escalation: Critical Pin Unresolved for {hours_elapsed}h"
    if priority == "HIGH":
        subject = f"🚨 STAGE Escalation: High Priority Pin Unresolved for {hours_elapsed}h"

    # Aggressive, high-visibility dark HTML matching MJML design
    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{subject}</title>
</head>
<body style="margin:0;padding:32px 16px;background-color:#090d16;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#f8fafc;">
  <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:580px;margin:0 auto;background-color:#0f172a;border:1px solid #991b1b;border-radius:14px;overflow:hidden;box-shadow:0 25px 35px -5px rgba(220,38,38,0.25);">
    <!-- Urgent Top Banner -->
    <tr>
      <td style="background-color:#dc2626;height:6px;"></td>
    </tr>
    
    <!-- Header -->
    <tr>
      <td style="padding:28px 32px 20px 32px;background:linear-gradient(180deg,#1e1b2e 0%,#0f172a 100%);border-bottom:1px solid #334155;">
        <div style="display:inline-block;padding:4px 10px;background:#7f1d1d;border:1px solid #ef4444;border-radius:6px;font-size:11px;font-weight:800;letter-spacing:0.08em;color:#fecaca;text-transform:uppercase;margin-bottom:14px;">
          🚨 SLA BREACH &middot; ESCALATION NOTICE
        </div>
        <h1 style="margin:0;font-size:22px;font-weight:800;color:#ffffff;line-height:1.3;letter-spacing:-0.01em;">
          {priority} Pin Unresolved for {hours_elapsed}h
        </h1>
        <p style="margin:6px 0 0 0;font-size:13px;color:#94a3b8;">
          Workspace Project: <strong style="color:#f1f5f9;">{project_name}</strong>
        </p>
      </td>
    </tr>

    <!-- Body -->
    <tr>
      <td style="padding:24px 32px;">
        <p style="font-size:14px;color:#f87171;line-height:1.6;margin:0 0 20px 0;">
          <strong>Action Required:</strong> A <span style="text-transform:uppercase;color:#ef4444;font-weight:700;">{priority}</span> review pin has exceeded the guaranteed SLA resolution threshold of <strong>{sla_threshold}h</strong>. This incident has been automatically escalated to workspace owners and assignees.
        </p>

        <!-- Metric Grid -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;border-collapse:collapse;">
          <tr style="border-bottom:1px solid #1e293b;">
            <td style="padding:10px 0;font-size:12px;color:#64748b;text-transform:uppercase;font-weight:700;width:36%;">Time in Open State</td>
            <td style="padding:10px 0;font-size:14px;color:#ef4444;font-weight:700;font-family:monospace;">{hours_elapsed} hours</td>
          </tr>
          <tr style="border-bottom:1px solid #1e293b;">
            <td style="padding:10px 0;font-size:12px;color:#64748b;text-transform:uppercase;font-weight:700;">SLA Window Target</td>
            <td style="padding:10px 0;font-size:14px;color:#f59e0b;font-weight:600;font-family:monospace;">&le; {sla_threshold} hours</td>
          </tr>
          <tr style="border-bottom:1px solid #1e293b;">
            <td style="padding:10px 0;font-size:12px;color:#64748b;text-transform:uppercase;font-weight:700;">Reported By</td>
            <td style="padding:10px 0;font-size:13px;color:#e2e8f0;">{creator_name} ({creator_role})</td>
          </tr>
          <tr style="border-bottom:1px solid #1e293b;">
            <td style="padding:10px 0;font-size:12px;color:#64748b;text-transform:uppercase;font-weight:700;">Target Page</td>
            <td style="padding:10px 0;font-size:13px;color:#38bdf8;">
              <a href="{page_url}" style="color:#38bdf8;text-decoration:none;">{page_title}</a>
            </td>
          </tr>
          <tr>
            <td style="padding:10px 0;font-size:12px;color:#64748b;text-transform:uppercase;font-weight:700;">DOM Selector</td>
            <td style="padding:10px 0;">
              <code style="background:#030712;border:1px solid #1f2937;border-radius:4px;padding:4px 8px;font-size:12px;color:#f87171;font-family:monospace;word-break:break-all;">
                {target_selector}
              </code>
            </td>
          </tr>
        </table>

        <!-- Feedback Card -->
        <div style="background-color:#1e293b;border-left:4px solid #ef4444;border-radius:0 8px 8px 0;padding:14px 16px;margin-bottom:28px;">
          <div style="font-size:14px;font-weight:700;color:#ffffff;margin-bottom:6px;">{pin_title}</div>
          <div style="font-size:13px;color:#cbd5e1;line-height:1.5;">{pin_description}</div>
        </div>

        <!-- Action Button -->
        <div style="text-align:center;margin:28px 0 16px 0;">
          <a href="{review_url}" style="display:inline-block;background:#dc2626;color:#ffffff;text-decoration:none;padding:14px 34px;border-radius:8px;font-size:14px;font-weight:700;letter-spacing:0.02em;box-shadow:0 6px 18px 0 rgba(220,38,38,0.4);">
            Inspect &amp; Resolve Pin Now &rarr;
          </a>
        </div>
        <p style="font-size:12px;color:#94a3b8;text-align:center;margin:0;">
          Direct link: <a href="{review_url}" style="color:#38bdf8;text-decoration:underline;">{review_url}</a>
        </p>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="padding:20px 32px;background-color:#090d16;border-top:1px solid #1e293b;text-align:center;">
        <p style="margin:0;font-size:11px;color:#64748b;line-height:1.5;">
          You received this automated escalation because you are a designated owner or assignee on STAGE.<br>
          SLA rules: Critical &le; {sla_threshold}h &middot; High &le; 48h. Unresolved pins trigger automatic leadership visibility.
        </p>
        <p style="margin:6px 0 0 0;font-size:11px;color:#475569;">
          &copy; {datetime.now().year} STAGE &middot; All rights reserved.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>"""

    # Plain text fallback
    plain_text = (
        f"{subject}\n\n"
        f"Action Required: A {priority} review pin has exceeded the SLA threshold of {sla_threshold}h.\n"
        f"Project: {project_name}\n"
        f"Time in Open State: {hours_elapsed} hours\n"
        f"Pin: {pin_title}\n"
        f"Description: {pin_description}\n"
        f"Target Selector: {target_selector}\n"
        f"Reporter: {creator_name} ({creator_role})\n\n"
        f"Resolve immediately at: {review_url}\n"
    )

    return subject, html_content, plain_text
