"""
backend/models/webhooks.py

SQLAlchemy 2.0 model for Webhook Endpoints.
Supports Neon Postgres (JSONB, native UUID) and SQLite environments.
"""

import uuid
import secrets
from datetime import datetime
from typing import Dict, Any, List, Optional
from sqlalchemy import Column, String, Boolean, Integer, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.types import JSON
from sqlalchemy.dialects.postgresql import JSONB

try:
    from backend.db.base import Base
except ImportError:
    from database import Base


def gen_uuid() -> str:
    return str(uuid.uuid4())


def gen_secret_token() -> str:
    return secrets.token_hex(32)


class WebhookEndpoint(Base):
    """
    Outbound webhook configuration for a project.
    Allows developers to stream STAGE pin and session events to external platforms
    (e.g., Slack, Discord, Linear, internal services) with HMAC-SHA256 signatures.
    """
    __tablename__ = "webhook_endpoints"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    project_id = Column(
        String(36),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    name = Column(String(128), nullable=False)
    target_url = Column(Text, nullable=False)
    secret_token = Column(String(64), nullable=False, default=gen_secret_token)
    subscribed_events = Column(
        JSON().with_variant(JSONB, "postgresql"),
        nullable=False,
        default=list
    )
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        default=datetime.utcnow,
        nullable=False
    )
    last_triggered_at = Column(DateTime(timezone=True), nullable=True)
    failure_count = Column(Integer, default=0, nullable=False)

    def mask_secret(self) -> str:
        """Returns masked secret representation for secure display."""
        if not self.secret_token or len(self.secret_token) <= 8:
            return "whsec_***"
        return f"whsec_{self.secret_token[:4]}...{self.secret_token[-4:]}"

    def to_dict(self, mask_secret: bool = True) -> Dict[str, Any]:
        return {
            "id": self.id,
            "project_id": self.project_id,
            "name": self.name,
            "target_url": self.target_url,
            "secret_token": self.mask_secret() if mask_secret else self.secret_token,
            "subscribed_events": self.subscribed_events or [],
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "last_triggered_at": self.last_triggered_at.isoformat() if self.last_triggered_at else None,
            "failure_count": self.failure_count,
        }
