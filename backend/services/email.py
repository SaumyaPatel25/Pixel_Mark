import resend
import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from datetime import datetime

resend_api_key = os.environ.get("RESEND_API_KEY", "")
resend.api_key = resend_api_key

FROM_EMAIL = os.environ.get("RESEND_FROM_EMAIL", "PixelMark <noreply@pixelmark.io>")
APP_URL    = os.environ.get("APP_PUBLIC_URL", "https://pixelmark.io")


def _base_template(title: str, body: str, cta_text: str, cta_url: str) -> str:
    return f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family:Inter,sans-serif;background:#0a0a0a;color:#e2e8f0;
                 margin:0;padding:40px 20px;">
      <div style="max-width:520px;margin:0 auto;background:#111827;
                  border-radius:12px;padding:40px;border:1px solid #1f2937;">
        <div style="font-size:22px;font-weight:700;color:#ffffff;
                    margin-bottom:8px;">PixelMark</div>
        <div style="font-size:13px;color:#6b7280;margin-bottom:32px;">
          Visual website review — pixel perfect.
        </div>
        <h2 style="font-size:20px;font-weight:600;color:#f9fafb;
                   margin:0 0 16px;">{title}</h2>
        <p style="font-size:15px;color:#9ca3af;line-height:1.6;
                  margin:0 0 28px;">{body}</p>
        <a href="{cta_url}"
           style="display:inline-block;background:#6366f1;color:#ffffff;
                  text-decoration:none;padding:12px 28px;border-radius:8px;
                  font-size:15px;font-weight:600;">{cta_text}</a>
        <p style="font-size:12px;color:#4b5563;margin-top:32px;">
          If you didn't request this, you can safely ignore this email.
          <br>PixelMark · support@pixelmark.io
        </p>
      </div>
    </body>
    </html>
    """


def send_email_wrapper(subject: str, to: str, html: str, fallback_msg: str):
    smtp_user = os.environ.get("SMTP_USERNAME")
    smtp_pass = os.environ.get("SMTP_PASSWORD")
    
    # 1. Try SMTP (Gmail/Custom SMTP)
    if smtp_user and smtp_pass:
        smtp_server = os.environ.get("SMTP_SERVER", "smtp.gmail.com")
        try:
            smtp_port = int(os.environ.get("SMTP_PORT", "587"))
        except ValueError:
            smtp_port = 587
            
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"PixelMark <{smtp_user}>"
        msg["To"] = to
        msg.attach(MIMEText(html, "html"))
        
        try:
            server = smtplib.SMTP(smtp_server, smtp_port)
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.sendmail(smtp_user, to, msg.as_string())
            server.quit()
            print(f"[{datetime.now().isoformat()}] Email successfully sent via SMTP to {to}")
            return
        except Exception as e:
            print(f"SMTP sending error to {to}: {e}")
            
    # 2. Try Resend if SMTP is not configured or failed
    if resend.api_key and not resend.api_key.startswith("re_mock") and not resend.api_key.startswith("YOUR_"):
        try:
            resend.Emails.send({
                "from": FROM_EMAIL,
                "to": [to],
                "subject": subject,
                "html": html
            })
            print(f"[{datetime.now().isoformat()}] Email successfully sent via Resend to {to}")
            return
        except Exception as e:
            print(f"Resend sending error to {to}: {e}")
            
    # 3. Fallback mock logging
    print("\n" + "="*50)
    print(f"[{datetime.now().isoformat()}] MOCK EMAIL SENT")
    print(f"To: {to}")
    print(f"Subject: {subject}")
    print(f"Fallback/Link: {fallback_msg}")
    print("="*50 + "\n")



def send_verification_email(to: str, token: str):
    url = f"{APP_URL}/auth/verify-email?token={token}"
    html = _base_template(
        title="Confirm your email address",
        body="Click the button below to verify your email and activate your account. This link expires in 24 hours.",
        cta_text="Verify Email",
        cta_url=url
    )
    send_email_wrapper("Verify your PixelMark account", to, html, url)


def send_login_link_email(to: str, token: str):
    url = f"{APP_URL}/auth/confirm-login?token={token}"
    html = _base_template(
        title="Sign in to PixelMark",
        body="Click the button below to sign in. This link expires in 15 minutes and can only be used once.",
        cta_text="Sign In",
        cta_url=url
    )
    send_email_wrapper("Your PixelMark login link", to, html, url)


def send_password_reset_email(to: str, token: str):
    url = f"{APP_URL}/auth/reset-password?token={token}"
    html = _base_template(
        title="Reset your password",
        body="We received a password reset request. Click below to set a new password. This link expires in 1 hour.",
        cta_text="Reset Password",
        cta_url=url
    )
    send_email_wrapper("Reset your PixelMark password", to, html, url)
