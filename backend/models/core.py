from sqlalchemy import String, Text, Integer, ForeignKey, DateTime, Boolean, JSON, Enum as SAEnum, UniqueConstraint, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from database import Base
import uuid
import enum
from datetime import datetime

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

class AIProviderEnum(str, enum.Enum):
    openai = "openai"
    anthropic = "anthropic"
    google = "google"
    openrouter = "openrouter"
    groq = "groq"
    together = "together"
    mistral = "mistral"
    fireworks = "fireworks"
    xai = "xai"
    openai_compatible = "openai_compatible"
    ollama = "ollama"

class User(Base):
    __tablename__ = "users"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    email: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String, nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false", nullable=False)
    verification_token: Mapped[str] = mapped_column(String, nullable=True)
    verification_token_expires_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=True)
    reset_token: Mapped[str] = mapped_column(String, nullable=True)
    reset_token_expires_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=True)
    org_memberships: Mapped[list["OrgMember"]] = relationship(back_populates="user")
    ai_provider_configs: Mapped[list["UserAIProviderConfig"]] = relationship(back_populates="user", cascade="all, delete-orphan")

class UserAIProviderConfig(Base):
    __tablename__ = "user_ai_provider_configs"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)
    provider: Mapped[str] = mapped_column(String, nullable=False)
    display_name: Mapped[str] = mapped_column(String, nullable=True)
    encrypted_api_key: Mapped[str] = mapped_column(Text, nullable=True)
    base_url: Mapped[str] = mapped_column(String, nullable=True)
    model_name: Mapped[str] = mapped_column(String, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    supports_openai_compat: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    user: Mapped["User"] = relationship(back_populates="ai_provider_configs")


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
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    session_id: Mapped[str] = mapped_column(ForeignKey("sessions.id", ondelete="SET NULL"), nullable=True)
    title: Mapped[str] = mapped_column(String, nullable=False)
    position_x: Mapped[float] = mapped_column(nullable=False, default=0.0)
    position_y: Mapped[float] = mapped_column(nullable=False, default=0.0)
    width: Mapped[float] = mapped_column(nullable=False, default=320.0)
    height: Mapped[float] = mapped_column(nullable=False, default=200.0)
    color: Mapped[str] = mapped_column(String, nullable=False, default="#1c1b19")
    snapshot_url: Mapped[str] = mapped_column(String, nullable=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    project: Mapped["Project"] = relationship(back_populates="frames")
    session: Mapped["Session"] = relationship()

class CanvasFlow(Base):
    __tablename__ = "canvas_flows"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    source_frame_id: Mapped[str] = mapped_column(ForeignKey("canvas_frames.id", ondelete="CASCADE"), nullable=False)
    target_frame_id: Mapped[str] = mapped_column(ForeignKey("canvas_frames.id", ondelete="CASCADE"), nullable=False)
    label: Mapped[str] = mapped_column(String, nullable=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    project: Mapped["Project"] = relationship(back_populates="flows")
    source_frame: Mapped["CanvasFrame"] = relationship(foreign_keys=[source_frame_id])
    target_frame: Mapped["CanvasFrame"] = relationship(foreign_keys=[target_frame_id])

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
    status: Mapped[str] = mapped_column(String, default="active", server_default="active", nullable=False)
    last_heartbeat_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=True)

    project: Mapped["Project"] = relationship(back_populates="sessions")
    share_links: Mapped[list["ShareLink"]] = relationship(back_populates="session", cascade="all, delete-orphan")
    page_visits: Mapped[list["PageVisit"]] = relationship(back_populates="session", cascade="all, delete-orphan")

    @property
    def pages_visited(self) -> int:
        return self.pages_visited_count or 0

    @pages_visited.setter
    def pages_visited(self, value: int) -> None:
        self.pages_visited_count = value

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


from sqlalchemy import UUID
import uuid

class DOMEdit(Base):
    __tablename__ = "dom_edits"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id: Mapped[str] = mapped_column(ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    selector: Mapped[str] = mapped_column(String, nullable=False)
    xpath: Mapped[str] = mapped_column(String, nullable=True)
    property: Mapped[str] = mapped_column(String, nullable=False)
    old_value: Mapped[str] = mapped_column(String, nullable=True)
    new_value: Mapped[str] = mapped_column(String, nullable=True)
    element_tag: Mapped[str] = mapped_column(String, nullable=True)
    element_text: Mapped[str] = mapped_column(String(80), nullable=True)
    page_url: Mapped[str] = mapped_column(String, nullable=False, index=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    created_by: Mapped[str] = mapped_column(String, nullable=True)
    
    session: Mapped["Session"] = relationship()


class AuthToken(Base):
    __tablename__ = "auth_tokens"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token_hash: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    purpose: Mapped[str] = mapped_column(String, nullable=False)  # verify_email | login_link | password_reset
    expires_at: Mapped[DateTime] = mapped_column(DateTime, nullable=False)
    used_at: Mapped[DateTime] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now())


class UserIdentity(Base):
    __tablename__ = "user_identities"
    __table_args__ = (UniqueConstraint('provider', 'provider_user_id', name='uq_provider_user'),)

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    provider: Mapped[str] = mapped_column(String, nullable=False)  # google | github
    provider_user_id: Mapped[str] = mapped_column(String, nullable=False)
    provider_email: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Waitlist(Base):
    __tablename__ = "waitlist"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    email: Mapped[str] = mapped_column(String, nullable=False)
    source: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ApiKey(Base):
    __tablename__ = "api_keys"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    token_hash: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    masked_token: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    last_used_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=True)
    revoked_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=True)
    key_metadata: Mapped[dict] = mapped_column(JSON, nullable=True)


class BlueprintDomTarget(Base):
    __tablename__ = "blueprint_dom_targets"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    canvas_frame_id: Mapped[str] = mapped_column(ForeignKey("canvas_frames.id", ondelete="CASCADE"), nullable=False)
    page_url: Mapped[str] = mapped_column(String, nullable=True)
    selector_primary: Mapped[str] = mapped_column(String, nullable=True)
    selector_fallback: Mapped[str] = mapped_column(String, nullable=True)
    xpath: Mapped[str] = mapped_column(String, nullable=True)
    target_signature_json: Mapped[dict] = mapped_column(JSON, nullable=True)
    element_tag: Mapped[str] = mapped_column(String, nullable=True)
    element_label: Mapped[str] = mapped_column(String, nullable=True)
    text_excerpt: Mapped[str] = mapped_column(Text, nullable=True)
    created_by: Mapped[str] = mapped_column(String, nullable=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class BlueprintDomEditSet(Base):
    __tablename__ = "blueprint_dom_edit_sets"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    canvas_frame_id: Mapped[str] = mapped_column(ForeignKey("canvas_frames.id", ondelete="CASCADE"), nullable=False)
    target_id: Mapped[str] = mapped_column(ForeignKey("blueprint_dom_targets.id", ondelete="SET NULL"), nullable=True)
    name: Mapped[str] = mapped_column(String, nullable=True)
    version_number: Mapped[int] = mapped_column(Integer, default=1)
    status: Mapped[str] = mapped_column(String, default="draft")  # draft | saved | archived
    base_snapshot_json: Mapped[dict] = mapped_column(JSON, nullable=True)
    notes: Mapped[str] = mapped_column(Text, nullable=True)
    created_by: Mapped[str] = mapped_column(String, nullable=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class BlueprintDomEditOperation(Base):
    __tablename__ = "blueprint_dom_edit_operations"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    edit_set_id: Mapped[str] = mapped_column(ForeignKey("blueprint_dom_edit_sets.id", ondelete="CASCADE"), nullable=False)
    op_type: Mapped[str] = mapped_column(String, nullable=False)  # style | content | attribute | class_toggle
    property_key: Mapped[str] = mapped_column(String, nullable=False)
    old_value: Mapped[str] = mapped_column(Text, nullable=True)
    new_value: Mapped[str] = mapped_column(Text, nullable=True)
    unit: Mapped[str] = mapped_column(String, nullable=True)
    selector_override: Mapped[str] = mapped_column(String, nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())



