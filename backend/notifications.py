import httpx
import os
from typing import Optional

RESEND_KEY = os.environ.get("RESEND_API_KEY", "")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")
FROM_EMAIL = "STAGE <noreply@stage.dev>"

async def send_email(to: str, subject: str, html: str):
    if not RESEND_KEY:
        print(f"[Email] RESEND_API_KEY not set — skipping email to {to}")
        return
    
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {RESEND_KEY}", 
                "Content-Type": "application/json"
            },
            json={
                "from": FROM_EMAIL, 
                "to": [to], 
                "subject": subject, 
                "html": html
            }
        )
        if resp.status_code not in (200, 201):
            print(f"[Email] Failed to send: {resp.text[:200]}")

def new_comment_html(project: dict, comment: dict, dashboard_url: str) -> str:
    severity = comment.get("severity", "P2")
    sev_color = {
        "P0": "#ef4444", 
        "P1": "#f97316", 
        "P2": "#eab308", 
        "P3": "#94a3b8"
    }.get(severity, "#a855f7")
    
    return f"""
    <!DOCTYPE html>
    <html>
    <body style="background:#0a0a0c;color:#ffffff;font-family:system-ui,sans-serif;margin:0;padding:40px 20px;">
      <div style="max-width:560px;margin:0 auto;">
        <div style="font-family:monospace;font-size:20px;font-weight:bold;letter-spacing:4px;color:#ffffff;margin-bottom:24px;">
          STAGE
        </div>
        <div style="background:#0f0f14;border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:24px;margin-bottom:20px;">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
            <span style="background:{sev_color}33;color:{sev_color};border:1px solid {sev_color}44;padding:2px 10px;border-radius:20px;font-size:12px;font-family:monospace;font-weight:bold;">
                {severity}
            </span>
            <span style="color:rgba(255,255,255,0.4);font-size:13px;">New feedback on <strong style="color:white;">{project.get('name', 'Project')}</strong></span>
          </div>
          <p style="color:rgba(255,255,255,0.8);font-size:15px;line-height:1.6;margin:0 0 16px;">
            "{comment.get('text', '')}"
          </p>
          <div style="background:rgba(168,85,247,0.1);border-left:3px solid #a855f7;padding:10px 14px;border-radius:4px;margin-bottom:16px;">
            <code style="color:#c084fc;font-size:12px;">{comment.get('component_selector','unknown')}</code>
          </div>
          {f'<p style="color:rgba(255,255,255,0.5);font-size:13px;margin:0 0 8px;">💡 <em>{comment["suggested_fix"]}</em></p>' if comment.get("suggested_fix") else ''}
          <p style="color:rgba(255,255,255,0.3);font-size:12px;margin:0;">
            by <strong style="color:rgba(255,255,255,0.6);">{comment.get('tester_name','Anonymous')}</strong>
          </p>
        </div>
        <a href="{dashboard_url}" style="display:block;text-align:center;background:#a855f7;color:white;text-decoration:none;padding:14px 24px;border-radius:12px;font-weight:600;font-size:14px;">
          View in Dashboard →
        </a>
        <p style="color:rgba(255,255,255,0.2);font-size:11px;text-align:center;margin-top:24px;">
          You received this because you own this project. 
          <a href="{FRONTEND_URL}/settings" style="color:rgba(168,85,247,0.7);">Manage notifications</a>
        </p>
      </div>
    </body>
    </html>
    """

async def notify_owner_new_comment(project: dict, comment: dict, owner_email: str):
    """Called in background after every new comment"""
    sev = comment.get("severity", "P2")
    subject = f"{'🔴 CRITICAL: ' if sev == 'P0' else '🟠 ' if sev == 'P1' else ''}New feedback on {project.get('name', 'Project')}"
    dashboard_url = f"{FRONTEND_URL}/project/{project.get('id', '')}"
    html = new_comment_html(project, comment, dashboard_url)
    await send_email(owner_email, subject, html)

async def weekly_digest(owner_email: str, projects_summary: list[dict]):
    """Weekly digest email with all project summaries"""
    rows = "".join([
        f"<tr><td style='padding:8px;color:white;'>{p['name']}</td><td style='padding:8px;color:#a855f7;'>{p['open_count']}</td><td style='padding:8px;color:#ef4444;'>{p['p0_count']}</td></tr>"
        for p in projects_summary
    ])
    html = f"""
    <!DOCTYPE html><html><body style="background:#0a0a0c;color:white;font-family:system-ui;padding:40px 20px;">
    <div style="max-width:560px;margin:0 auto;">
      <div style="font-family:monospace;font-size:20px;font-weight:bold;letter-spacing:4px;margin-bottom:24px;">STAGE</div>
      <h2 style="color:white;margin-bottom:16px;">Your Weekly Audit Summary</h2>
      <table style="width:100%;border-collapse:collapse;background:#0f0f14;border-radius:12px;overflow:hidden;">
        <thead><tr style="background:rgba(255,255,255,0.05);">
          <th style="padding:10px;text-align:left;color:rgba(255,255,255,0.4);font-size:12px;">Project</th>
          <th style="padding:10px;text-align:left;color:rgba(255,255,255,0.4);font-size:12px;">Open</th>
          <th style="padding:10px;text-align:left;color:rgba(255,255,255,0.4);font-size:12px;">Critical</th>
        </tr></thead>
        <tbody>{rows}</tbody>
      </table>
      <a href="{FRONTEND_URL}/projects" style="display:block;text-align:center;background:#a855f7;color:white;text-decoration:none;padding:14px;border-radius:12px;margin-top:20px;font-weight:600;">
        Open Dashboard →
      </a>
    </div></body></html>
    """
    await send_email(owner_email, "Your STAGE Weekly Summary", html)
