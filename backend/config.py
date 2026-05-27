import os
from dataclasses import dataclass
from dotenv import load_dotenv
from pathlib import Path

# Look for .env in the same directory as this file (backend/)
env_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=env_path)

@dataclass
class Settings:
    frontend_url: str = "http://localhost:3000"
    environment: str = "development"
    jwt_secret_key: str = "dev_secret_key_123"

def load_config() -> Settings:
    frontend = os.environ.get("FRONTEND_URL", "http://localhost:3000")
    env_name = os.environ.get("ENVIRONMENT", "development")
    jwt_secret = os.environ.get("JWT_SECRET_KEY", "dev_secret_key_123")

    return Settings(
        frontend_url=frontend.rstrip("/"),
        environment=env_name,
        jwt_secret_key=jwt_secret
    )

settings = load_config()
