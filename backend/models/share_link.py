from sqlalchemy import String, ForeignKey, DateTime, Boolean, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from database import Base
import uuid
import secrets

def gen_uuid():
    return str(uuid.uuid4())

class ShareLink(Base):
    __tablename__ = "share_links"
    __table_args__ = {'extend_existing': True}
    
    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    session_id: Mapped[str] = mapped_column(ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False)
    token: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False, default=lambda: secrets.token_urlsafe(24))
    label: Mapped[str] = mapped_column(String, nullable=True)
    can_comment: Mapped[bool] = mapped_column(Boolean, default=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    password_hash: Mapped[str] = mapped_column(String, nullable=True)
    expires_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=True)
    accessed_count: Mapped[int] = mapped_column(Integer, default=0)
    role: Mapped[str] = mapped_column(String, nullable=True, default="tester")
    max_uses: Mapped[int] = mapped_column(Integer, nullable=True)
    use_count: Mapped[int] = mapped_column(Integer, default=0)
    created_by: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationship to session
    session: Mapped["Session"] = relationship("Session", back_populates="share_links")
