import os
from dataclasses import dataclass
from dotenv import load_dotenv
from pathlib import Path

# Look for .env in the same directory as this file (backend/) - updated SMTP
env_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=env_path)

@dataclass
class Settings:
    frontend_url: str = "http://localhost:3000"
    backend_url: str = "http://localhost:8765"
    environment: str = "development"
    jwt_secret_key: str = "dev_secret_key_123"
    resend_api_key: str = ""
    resend_from_email: str = "STAGE <onboarding@resend.dev>"
    app_public_url: str = "http://localhost:3000"
    google_client_id: str = ""
    google_client_secret: str = ""
    github_client_id: str = ""
    github_client_secret: str = ""
    github_redirect_uri: str = ""
    auto_verify_users: bool = True
    redis_url: str = "redis://localhost:6379/0"
    firebase_api_key: str = ""
    firebase_project_id: str = ""
    dodo_environment: str = "test_mode"
    dodo_api_key: str = "test_dodo_api_key_sample"
    dodo_webhook_secret: str = "whsec_test_stage_secret"
    dodo_product_id_dev_team: str = "p_dev_team_test"
    dodo_discount_code_dev_team_early_bird: str = "dsc_early_bird_25"
    stage_founder_email: str = "saumyavishwam@gmail.com"
    enterprise_contact_email: str = "saumyavishwam@gmail.com"


def load_config() -> Settings:
    frontend = os.environ.get("FRONTEND_URL", "http://localhost:3000")
    env_name = os.environ.get("ENVIRONMENT", "development")
    jwt_secret = os.environ.get("JWT_SECRET_KEY", "dev_secret_key_123")
    resend_key = os.environ.get("RESEND_API_KEY", "")
    resend_from = os.environ.get("RESEND_FROM_EMAIL", "STAGE <onboarding@resend.dev>")
    app_url = os.environ.get("APP_PUBLIC_URL", frontend)
    google_id = os.environ.get("GOOGLE_CLIENT_ID", "")
    google_secret = os.environ.get("GOOGLE_CLIENT_SECRET", "")
    github_id = os.environ.get("GITHUB_CLIENT_ID", "")
    github_secret = os.environ.get("GITHUB_CLIENT_SECRET", "")
    github_redirect = os.environ.get("GITHUB_REDIRECT_URI", "")
    auto_verify = os.environ.get("AUTO_VERIFY_USERS", "true").lower() in ("true", "1", "yes")
    fb_api_key = os.environ.get("FIREBASE_API_KEY", "")
    fb_project_id = os.environ.get("FIREBASE_PROJECT_ID", "")

    return Settings(
        frontend_url=frontend.rstrip("/"),
        environment=env_name,
        jwt_secret_key=jwt_secret,
        resend_api_key=resend_key,
        resend_from_email=resend_from,
        app_public_url=app_url.rstrip("/"),
        google_client_id=google_id,
        google_client_secret=google_secret,
        github_client_id=github_id,
        github_client_secret=github_secret,
        github_redirect_uri=github_redirect,
        backend_url=os.getenv("BACKEND_URL", "http://localhost:8765"),
        redis_url=os.getenv("REDIS_URL", "redis://localhost:6379/0"),
        auto_verify_users=auto_verify,
        firebase_api_key=fb_api_key,
        firebase_project_id=fb_project_id,
        dodo_environment=os.getenv("DODO_ENVIRONMENT", "test_mode"),
        dodo_api_key=os.getenv("DODO_API_KEY", "test_dodo_api_key_sample"),
        dodo_webhook_secret=os.getenv("DODO_WEBHOOK_SECRET", "whsec_test_stage_secret"),
        dodo_product_id_dev_team=os.getenv("DODO_PRODUCT_ID_DEV_TEAM", "p_dev_team_test"),
        dodo_discount_code_dev_team_early_bird=os.getenv("DODO_DISCOUNT_CODE_DEV_TEAM_EARLY_BIRD", "dsc_early_bird_25"),
        stage_founder_email=os.getenv("STAGE_FOUNDER_EMAIL", "saumyavishwam@gmail.com"),
        enterprise_contact_email=os.getenv("ENTERPRISE_CONTACT_EMAIL", "saumyavishwam@gmail.com")
    )

settings = load_config()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
AI_MODEL = os.getenv("AI_MODEL", "gpt-4o-mini")
AI_TRIAGE_MAX_MARKERS = int(os.getenv("AI_TRIAGE_MAX_MARKERS", "50"))
