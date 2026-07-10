from sqlalchemy import String, Integer, Float, ForeignKey, DateTime, Boolean, JSON, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base
from datetime import datetime
from markers.contracts import MarkerStatus, MarkerPriority
import uuid

def gen_uuid():
    return str(uuid.uuid4())

class Marker(Base):
    __tablename__ = "markers"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    session_id: Mapped[str] = mapped_column(ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    page_visit_id: Mapped[str] = mapped_column(ForeignKey("page_visits.id", ondelete="SET NULL"), nullable=True)
    creator_id: Mapped[str] = mapped_column(String, nullable=True, index=True)
    creator_name: Mapped[str] = mapped_column(String, nullable=True)
    creator_role: Mapped[str] = mapped_column(String, nullable=True)  # developer | reviewer
    color_token: Mapped[str] = mapped_column(String, nullable=True)

    # Placement and anchoring
    anchor_kind: Mapped[str] = mapped_column(String, nullable=False)  # MarkerAnchorKind
    anchor_mode: Mapped[str] = mapped_column(String, default="dom", server_default="dom", nullable=False)
    page_url: Mapped[str] = mapped_column(String, nullable=True, index=True)
    page_title: Mapped[str] = mapped_column(String, nullable=True)
    target_selector: Mapped[str] = mapped_column(String, nullable=True)
    target_xpath: Mapped[str] = mapped_column(String, nullable=True)
    dom_text_excerpt: Mapped[str] = mapped_column(Text, nullable=True)
    offset_x_ratio: Mapped[float] = mapped_column(Float, nullable=True)
    offset_y_ratio: Mapped[float] = mapped_column(Float, nullable=True)
    viewport_x: Mapped[float] = mapped_column(Float, nullable=True)
    viewport_y: Mapped[float] = mapped_column(Float, nullable=True)
    page_x: Mapped[float] = mapped_column(Float, nullable=True)
    page_y: Mapped[float] = mapped_column(Float, nullable=True)
    viewport_width: Mapped[float] = mapped_column(Float, nullable=True)
    viewport_height: Mapped[float] = mapped_column(Float, nullable=True)
    element_rect_json: Mapped[dict] = mapped_column(JSON, nullable=True)
    scroll_x: Mapped[float] = mapped_column(Float, nullable=True)
    scroll_y: Mapped[float] = mapped_column(Float, nullable=True)

    # Canvas / WebGL context
    canvas_id: Mapped[str] = mapped_column(String, nullable=True)
    canvas_x_ratio: Mapped[float] = mapped_column(Float, nullable=True)
    canvas_y_ratio: Mapped[float] = mapped_column(Float, nullable=True)
    webgl_clip_x: Mapped[float] = mapped_column(Float, nullable=True)
    webgl_clip_y: Mapped[float] = mapped_column(Float, nullable=True)
    renderer_type: Mapped[str] = mapped_column(String, nullable=True)  # MarkerRendererType

    # Marker content and lifecycle
    title: Mapped[str] = mapped_column(String, nullable=True)
    description: Mapped[str] = mapped_column(String, nullable=True)
    status: Mapped[str] = mapped_column(String, default=MarkerStatus.OPEN.value, server_default=MarkerStatus.OPEN.value, nullable=False, index=True)
    priority: Mapped[str] = mapped_column(String, default=MarkerPriority.MEDIUM.value, server_default=MarkerPriority.MEDIUM.value, nullable=False)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false", nullable=False)
    deleted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), onupdate=func.now(), nullable=True)
    version: Mapped[int] = mapped_column(Integer, default=1, server_default="1", nullable=False)

    # Diagnostics / metadata
    browser: Mapped[str] = mapped_column(String, nullable=True)
    os: Mapped[str] = mapped_column(String, nullable=True)
    device_pixel_ratio: Mapped[float] = mapped_column(Float, nullable=True)
    console_errors_json: Mapped[list] = mapped_column(JSON, nullable=True)
    network_errors_json: Mapped[list] = mapped_column(JSON, nullable=True)
    screenshot_url: Mapped[str] = mapped_column(String, nullable=True)
    encrypted_context: Mapped[str] = mapped_column(String, nullable=True)

    # Relationships
    project = relationship("Project", backref="markers")
    session = relationship("Session", backref="markers")
    page_visit = relationship("PageVisit", backref="markers")


class ReviewerIdentity(Base):
    __tablename__ = "reviewer_identities"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    session_id: Mapped[str] = mapped_column(ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    display_name: Mapped[str] = mapped_column(String, nullable=False)
    role: Mapped[str] = mapped_column(String, default="reviewer", server_default="reviewer", nullable=False)
    color_token: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
    last_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=True)

    session = relationship("Session", backref="reviewer_identities")
