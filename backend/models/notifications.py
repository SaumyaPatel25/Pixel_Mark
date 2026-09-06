import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, Integer, JSON, ForeignKey, DateTime, text, Text
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import JSONB

try:
    from backend.db.base import Base
except ImportError:
    from database import Base


def gen_uuid() -> str:
    return str(uuid.uuid4())


class NotificationOutbox(Base):
    __tablename__ = "notification_outbox"

    id = Column(
        String,
        primary_key=True,
        default=gen_uuid
    )
    event_type = Column(String(64), nullable=False, index=True)  # e.g., 'pin.created'
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    session_id = Column(String, ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False)
    marker_id = Column(String, ForeignKey("markers.id", ondelete="CASCADE"), nullable=True)
    actor_id = Column(String, nullable=False)  # User ID or Guest Identity ID
    actor_role = Column(String(16), nullable=False)
    payload = Column(JSON().with_variant(JSONB, "postgresql"), nullable=False)

    status = Column(
        String(16),
        nullable=False,
        default="pending",
        server_default="pending",
        index=True
    )  # pending, processing, delivered, failed
    retry_count = Column(Integer, nullable=False, default=0, server_default="0")
    created_at = Column(DateTime(timezone=True), default=func.now(), server_default=func.now(), nullable=False)
    processed_at = Column(DateTime(timezone=True), nullable=True)


class NotificationPreference(Base):
    __tablename__ = "notification_preferences"

    id = Column(
        String,
        primary_key=True,
        default=gen_uuid
    )
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=True, index=True)
    in_app_enabled = Column(Boolean, default=True, server_default="true", nullable=False)
    email_enabled = Column(Boolean, default=True, server_default="true", nullable=False)
    email_frequency = Column(String(32), default="digest_15m", server_default="digest_15m", nullable=False)  # immediate, digest_15m, daily, off
    digest_enabled = Column(Boolean, default=True, server_default="true", nullable=False)
    notify_on_all_pins = Column(Boolean, default=False, server_default="false", nullable=False)
    notify_on_assigned = Column(Boolean, default=True, server_default="true", nullable=False)
    notify_on_mentions = Column(Boolean, default=True, server_default="true", nullable=False)
    notify_on_status_change = Column(Boolean, default=True, server_default="true", nullable=False)
    allow_blueprint_events = Column(Boolean, default=True, server_default="true", nullable=False)
    allow_session_events = Column(Boolean, default=True, server_default="true", nullable=False)
    allow_critical = Column(Boolean, default=True, server_default="true", nullable=False)
    allow_important = Column(Boolean, default=True, server_default="true", nullable=False)
    allow_digest = Column(Boolean, default=True, server_default="true", nullable=False)
    quiet_hours_json = Column(JSON().with_variant(JSONB, "postgresql"), nullable=True)
    updated_at = Column(DateTime(timezone=True), default=func.now(), server_default=func.now(), onupdate=func.now(), nullable=False)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "project_id": self.project_id,
            "in_app_enabled": self.in_app_enabled,
            "email_enabled": self.email_enabled,
            "email_frequency": self.email_frequency,
            "notify_on_all_pins": self.notify_on_all_pins,
            "notify_on_assigned": self.notify_on_assigned,
            "notify_on_mentions": self.notify_on_mentions,
            "notify_on_status_change": self.notify_on_status_change,
            "digest_enabled": self.digest_enabled,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }


class NotificationDeliveryAttempt(Base):
    """
    Delivery attempt tracking for all outbound channels (email, webhook, in-app).
    Captures failure reasons, HTTP status codes, provider responses, and dead-letter queue states.
    """
    __tablename__ = "notification_delivery_attempts"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    outbox_id = Column(
        String(36),
        ForeignKey("notification_outbox.id", ondelete="CASCADE"),
        nullable=True,
        index=True
    )
    notification_event_id = Column(
        String(36),
        ForeignKey("notification_events.id", ondelete="CASCADE"),
        nullable=True,
        index=True
    )
    channel = Column(String(32), nullable=False, default="email")  # email, webhook, in_app
    target = Column(String(256), nullable=True)  # user@example.com, https://hooks.slack.com/...
    status = Column(String(32), nullable=False, default="failed", index=True)  # success, failed, dead_letter
    error_context = Column(JSON().with_variant(JSONB, "postgresql"), nullable=True, default=dict)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), default=datetime.utcnow, index=True)

    # Bookkeeping and retry scheduling
    attempt_number = Column(Integer, default=1)
    provider_message_id = Column(String(128), nullable=True)
    error_code = Column(String(64), nullable=True)
    error_message = Column(Text, nullable=True)
    next_retry_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    sent_at = Column(DateTime(timezone=True), nullable=True)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "outbox_id": self.outbox_id,
            "channel": self.channel,
            "target": self.target,
            "status": self.status,
            "error_context": self.error_context or {},
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


# Backwards-compatibility aliases for existing codebase
NotificationPreferencesModel = NotificationPreference
NotificationDeliveryAttemptModel = NotificationDeliveryAttempt

