from sqlalchemy import String, Text, ForeignKey, DateTime, Boolean, JSON, Enum as SAEnum, UniqueConstraint, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from database import Base
import uuid
import enum

def gen_uuid():
    return str(uuid.uuid4())

class RoleEnum(str, enum.Enum):
    owner = "owner"
    admin = "admin"
    member = "member"
    guest = "guest"

class PriorityEnum(str, enum.Enum):
    critical = "critical"
    high = "high"
    medium = "medium"
    low = "low"

class StatusEnum(str, enum.Enum):
    open = "open"
    in_progress = "in_progress"
    resolved = "resolved"

class User(Base):
    __tablename__ = "users"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    email: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String, nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    org_memberships: Mapped[list["OrgMember"]] = relationship(back_populates="user")

class Organization(Base):
    __tablename__ = "organizations"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    name: Mapped[str] = mapped_column(String, nullable=False)
    slug: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    members: Mapped[list["OrgMember"]] = relationship(back_populates="org")
    projects: Mapped[list["Project"]] = relationship(back_populates="org")

class OrgMember(Base):
    __tablename__ = "org_members"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    org_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), nullable=False)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)
    role: Mapped[RoleEnum] = mapped_column(SAEnum(RoleEnum), default=RoleEnum.member)
    org: Mapped["Organization"] = relationship(back_populates="members")
    user: Mapped["User"] = relationship(back_populates="org_memberships")

class Project(Base):
    __tablename__ = "projects"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    org_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    url: Mapped[str] = mapped_column(String, nullable=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    org: Mapped["Organization"] = relationship(back_populates="projects")
    environments: Mapped[list["Environment"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    sessions: Mapped[list["Session"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    frames: Mapped[list["CanvasFrame"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    flows: Mapped[list["CanvasFlow"]] = relationship(back_populates="project", cascade="all, delete-orphan")

class CanvasFrame(Base):
    __tablename__ = "canvas_frames"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"), nullable=False)
    title: Mapped[str] = mapped_column(String, nullable=False)
    position_x: Mapped[float] = mapped_column(nullable=False, default=0)
    position_y: Mapped[float] = mapped_column(nullable=False, default=0)
    width: Mapped[float] = mapped_column(nullable=False, default=320)
    height: Mapped[float] = mapped_column(nullable=False, default=200)
    snapshot_url: Mapped[str] = mapped_column(String, nullable=True)
    project: Mapped["Project"] = relationship(back_populates="frames")

class CanvasFlow(Base):
    __tablename__ = "canvas_flows"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"), nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    frame_sequence: Mapped[list] = mapped_column(JSON, nullable=False, default=list) # List of frame IDs
    project: Mapped["Project"] = relationship(back_populates="flows")

class Environment(Base):
    __tablename__ = "environments"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"), nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)  # dev, staging, prod
    base_url: Mapped[str] = mapped_column(String, nullable=False)
    project: Mapped["Project"] = relationship(back_populates="environments")

class Session(Base):
    __tablename__ = "sessions"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"), nullable=False)
    title: Mapped[str] = mapped_column(String, nullable=True)
    current_page_url: Mapped[str] = mapped_column(String, nullable=True)
    pages_visited_count: Mapped[int] = mapped_column("pages_visited", nullable=True, default=0)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), onupdate=func.now(), nullable=True)
    
    # Heavy render metadata (Step 2E)
    renderer_type: Mapped[str] = mapped_column(String, nullable=True)
    heavy_mode: Mapped[bool] = mapped_column(Boolean, default=False, nullable=True)
    conservative_render_mode: Mapped[bool] = mapped_column(Boolean, default=False, nullable=True)
    render_detected_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=True)
    canvas_count: Mapped[int] = mapped_column(nullable=True)
    has_webgl: Mapped[bool] = mapped_column(Boolean, nullable=True)
    has_three_js: Mapped[bool] = mapped_column(Boolean, nullable=True)
    
    project: Mapped["Project"] = relationship(back_populates="sessions")
    markers: Mapped[list["Marker"]] = relationship(back_populates="session", cascade="all, delete-orphan")
    share_links: Mapped[list["ShareLink"]] = relationship(back_populates="session", cascade="all, delete-orphan")
    page_visits: Mapped[list["PageVisit"]] = relationship(back_populates="session", cascade="all, delete-orphan")

    @property
    def pages_visited(self) -> int:
        return self.pages_visited_count or 0

    @pages_visited.setter
    def pages_visited(self, value: int) -> None:
        self.pages_visited_count = value

class Marker(Base):
    __tablename__ = "markers"
    __table_args__ = (
        UniqueConstraint("session_id", "marker_number", name="uq_session_marker_number"),
    )
    
    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    session_id: Mapped[str] = mapped_column(ForeignKey("sessions.id"), nullable=False, index=True)
    page_visit_id: Mapped[str] = mapped_column(ForeignKey("page_visits.id", ondelete="SET NULL"), nullable=True, index=True)
    title: Mapped[str] = mapped_column(String, nullable=True)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    url: Mapped[str] = mapped_column(String, nullable=True)
    page_url: Mapped[str] = mapped_column(String, nullable=True, index=True)
    page_title: Mapped[str] = mapped_column(String, nullable=True)
    renderer_type: Mapped[str] = mapped_column(String, nullable=True, default="unknown")
    canvas_context: Mapped[dict] = mapped_column(JSON, nullable=True)
    marker_number: Mapped[int] = mapped_column(nullable=True, default=0)
    agent_version: Mapped[str] = mapped_column(String, nullable=True, default="1.0")
    xpath: Mapped[str] = mapped_column(Text, nullable=True)
    css_selector: Mapped[str] = mapped_column(Text, nullable=True)
    inner_text: Mapped[str] = mapped_column(Text, nullable=True)
    
    # New Marker ingestion fields (Step 2B)
    x: Mapped[float] = mapped_column(nullable=True)
    y: Mapped[float] = mapped_column(nullable=True)
    viewport_x: Mapped[float] = mapped_column(nullable=True)
    viewport_y: Mapped[float] = mapped_column(nullable=True)
    norm_x: Mapped[float] = mapped_column(nullable=True)
    norm_y: Mapped[float] = mapped_column(nullable=True)
    canvas_snapshot: Mapped[str] = mapped_column(Text, nullable=True)
    element_selector: Mapped[str] = mapped_column(Text, nullable=True)
    element_text: Mapped[str] = mapped_column(Text, nullable=True)
    element_tag: Mapped[str] = mapped_column(String, nullable=True)
    note: Mapped[str] = mapped_column(Text, nullable=True)
    severity: Mapped[str] = mapped_column(String, nullable=True, default="medium")
    screenshot_required: Mapped[bool] = mapped_column(Boolean, default=False, nullable=True)
    created_via: Mapped[str] = mapped_column(String, default="agent", nullable=True)
    share_link_id: Mapped[str] = mapped_column(ForeignKey("share_links.id", ondelete="SET NULL"), nullable=True, index=True)

    # Step 2v2 — Structured issue context
    issue_type: Mapped[str] = mapped_column(String, nullable=True, default="other")   # layout|copy|interaction|navigation|rendering|canvas_webgl|other
    aria_label: Mapped[str] = mapped_column(String, nullable=True)
    aria_role: Mapped[str] = mapped_column(String, nullable=True)
    bounding_box: Mapped[dict] = mapped_column(JSON, nullable=True)    # {x,y,width,height,top,right,bottom,left}
    browser_info: Mapped[dict] = mapped_column(JSON, nullable=True)    # {name,version,os,platform,user_agent}
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)

    viewport: Mapped[dict] = mapped_column(JSON, nullable=True)   # {width, height}
    browser: Mapped[str] = mapped_column(String, nullable=True)
    os: Mapped[str] = mapped_column(String, nullable=True)
    scroll_position: Mapped[dict] = mapped_column(JSON, nullable=True)  # {x, y}
    console_errors: Mapped[list] = mapped_column(JSON, nullable=True)
    network_errors: Mapped[list] = mapped_column(JSON, nullable=True)
    screenshot_url: Mapped[str] = mapped_column(String, nullable=True)
    priority: Mapped[PriorityEnum] = mapped_column(SAEnum(PriorityEnum), default=PriorityEnum.medium)
    status: Mapped[str] = mapped_column(String, default="submitted", nullable=True)
    project_id: Mapped[str] = mapped_column(String, nullable=True)
    comment: Mapped[str] = mapped_column(Text, nullable=True)
    capture_payload: Mapped[dict] = mapped_column(JSON, nullable=True)
    coordinates: Mapped[dict] = mapped_column(JSON, nullable=True)
    target: Mapped[dict] = mapped_column(JSON, nullable=True)
    source: Mapped[dict] = mapped_column(JSON, nullable=True)
    screenshots: Mapped[dict] = mapped_column(JSON, nullable=True)
    diagnostics: Mapped[dict] = mapped_column(JSON, nullable=True)
    created_by: Mapped[str] = mapped_column(String, nullable=True)
    parent_page_id: Mapped[str] = mapped_column(String, nullable=True)
    assignee_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=True)
    ai_summary: Mapped[str] = mapped_column(Text, nullable=True)
    is_inside_shadow_dom: Mapped[bool] = mapped_column(Boolean, default=False, nullable=True)
    shadow_root_depth: Mapped[int] = mapped_column(nullable=True)
    shadow_host_tag: Mapped[str] = mapped_column(String, nullable=True)
    shadow_host_id: Mapped[str] = mapped_column(String, nullable=True)
    shadow_host_class_list: Mapped[list] = mapped_column(JSON, nullable=True)
    shadow_path: Mapped[str] = mapped_column(Text, nullable=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), onupdate=func.now(), nullable=True)
    
    session: Mapped["Session"] = relationship(back_populates="markers")
    page_visit: Mapped["PageVisit"] = relationship()

class PageVisit(Base):
    __tablename__ = "page_visits"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    session_id: Mapped[str] = mapped_column(ForeignKey("sessions.id"), nullable=False, index=True)
    share_link_id: Mapped[str] = mapped_column(ForeignKey("share_links.id", ondelete="SET NULL"), nullable=True, index=True)
    page_url: Mapped[str] = mapped_column(String, nullable=False, index=True)
    page_title: Mapped[str] = mapped_column(String, nullable=True)
    visited_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    renderer_type: Mapped[str] = mapped_column(String, nullable=True)
    screenshot_url: Mapped[str] = mapped_column(String, nullable=True)
    visit_metadata: Mapped[dict] = mapped_column("metadata", JSON, nullable=True)
    
    page_order: Mapped[int] = mapped_column(nullable=True, default=1)
    first_visited_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    last_visited_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    visit_count: Mapped[int] = mapped_column(nullable=True, default=1)
    time_on_page_seconds: Mapped[int] = mapped_column(nullable=True)
    screenshot_captured_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=True)
    parent_page_id: Mapped[str] = mapped_column(ForeignKey("page_visits.id", ondelete="SET NULL"), nullable=True)
    
    session: Mapped["Session"] = relationship(back_populates="page_visits")

class AuditArtifact(Base):
    __tablename__ = "audit_artifacts"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    session_id: Mapped[str] = mapped_column(ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    page_visit_id: Mapped[str] = mapped_column(ForeignKey("page_visits.id", ondelete="SET NULL"), nullable=True, index=True)
    kind: Mapped[str] = mapped_column(String, nullable=False)
    payload: Mapped[dict] = mapped_column(JSON, nullable=False)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
    
    session: Mapped["Session"] = relationship()
    page_visit: Mapped["PageVisit"] = relationship()
