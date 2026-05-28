from sqlalchemy import String, Text, ForeignKey, DateTime, Boolean, JSON, Enum as SAEnum
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
    pages_visited: Mapped[int] = mapped_column(nullable=True, default=0)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    project: Mapped["Project"] = relationship(back_populates="sessions")
    markers: Mapped[list["Marker"]] = relationship(back_populates="session", cascade="all, delete-orphan")
    share_links: Mapped[list["ShareLink"]] = relationship(back_populates="session", cascade="all, delete-orphan")
    page_visits: Mapped[list["PageVisit"]] = relationship(back_populates="session", cascade="all, delete-orphan")

class Marker(Base):
    __tablename__ = "markers"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    session_id: Mapped[str] = mapped_column(ForeignKey("sessions.id"), nullable=False)
    title: Mapped[str] = mapped_column(String, nullable=True)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    url: Mapped[str] = mapped_column(String, nullable=True)
    page_url: Mapped[str] = mapped_column(String, nullable=True)
    page_title: Mapped[str] = mapped_column(String, nullable=True)
    renderer_type: Mapped[str] = mapped_column(String, nullable=True, default="unknown")
    canvas_context: Mapped[dict] = mapped_column(JSON, nullable=True)
    marker_number: Mapped[int] = mapped_column(nullable=True, default=0)
    agent_version: Mapped[str] = mapped_column(String, nullable=True, default="1.0")
    xpath: Mapped[str] = mapped_column(Text, nullable=True)
    css_selector: Mapped[str] = mapped_column(Text, nullable=True)
    inner_text: Mapped[str] = mapped_column(Text, nullable=True)
    viewport: Mapped[dict] = mapped_column(JSON, nullable=True)   # {width, height}
    browser: Mapped[str] = mapped_column(String, nullable=True)
    os: Mapped[str] = mapped_column(String, nullable=True)
    scroll_position: Mapped[dict] = mapped_column(JSON, nullable=True)  # {x, y}
    console_errors: Mapped[list] = mapped_column(JSON, nullable=True)
    network_errors: Mapped[list] = mapped_column(JSON, nullable=True)
    screenshot_url: Mapped[str] = mapped_column(String, nullable=True)
    priority: Mapped[PriorityEnum] = mapped_column(SAEnum(PriorityEnum), default=PriorityEnum.medium)
    status: Mapped[StatusEnum] = mapped_column(SAEnum(StatusEnum), default=StatusEnum.open)
    assignee_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=True)
    ai_summary: Mapped[str] = mapped_column(Text, nullable=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    session: Mapped["Session"] = relationship(back_populates="markers")

class ShareLink(Base):
    __tablename__ = "share_links"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    session_id: Mapped[str] = mapped_column(ForeignKey("sessions.id"), nullable=False)
    token: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    can_comment: Mapped[bool] = mapped_column(Boolean, default=True)
    password_hash: Mapped[str] = mapped_column(String, nullable=True)
    expires_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    session: Mapped["Session"] = relationship(back_populates="share_links")

class PageVisit(Base):
    __tablename__ = "page_visits"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    session_id: Mapped[str] = mapped_column(ForeignKey("sessions.id"), nullable=False)
    page_url: Mapped[str] = mapped_column(String, nullable=False)
    page_title: Mapped[str] = mapped_column(String, nullable=True)
    visited_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    renderer_type: Mapped[str] = mapped_column(String, nullable=True)
    screenshot_url: Mapped[str] = mapped_column(String, nullable=True)
    session: Mapped["Session"] = relationship(back_populates="page_visits")
