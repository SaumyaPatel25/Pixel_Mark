from pydantic import BaseModel, EmailStr
from typing import Optional, List, Any, Literal, Dict
from datetime import datetime
from models import PriorityEnum, StatusEnum

# Auth
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: Optional[str] = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class UserOut(BaseModel):
    id: str
    email: str
    name: Optional[str]
    class Config: from_attributes = True

class UserAIProviderConfigRead(BaseModel):
    id: str
    provider: str
    display_name: Optional[str]
    base_url: Optional[str]
    model_name: Optional[str]
    is_active: bool
    is_default: bool
    supports_openai_compat: bool
    has_api_key: bool

    class Config: 
        from_attributes = True
        protected_namespaces = ()

class UserAIProviderConfigCreate(BaseModel):
    provider: str
    display_name: Optional[str] = None
    api_key: str
    base_url: Optional[str] = None
    model_name: Optional[str] = None

    class Config:
        protected_namespaces = ()

class UserAIProviderConfigUpdate(BaseModel):
    display_name: Optional[str] = None
    api_key: Optional[str] = None
    base_url: Optional[str] = None
    model_name: Optional[str] = None
    is_active: Optional[bool] = None
    is_default: Optional[bool] = None

    class Config:
        protected_namespaces = ()



# Projects
class ProjectCreate(BaseModel):
    name: str
    url: Optional[str] = None

class ProjectOut(BaseModel):
    id: str
    name: str
    url: Optional[str]
    created_at: datetime
    class Config: from_attributes = True

# Sessions
class SessionCreate(BaseModel):
    project_id: str
    title: Optional[str] = None

class SessionRead(BaseModel):
    id: str
    project_id: str
    title: Optional[str]
    current_page_url: Optional[str] = None
    pages_visited_count: int = 0
    pages_visited: Optional[int] = 0  # backward compatibility mapping
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    # Heavy render metadata (Step 2E)
    renderer_type: Optional[str] = None
    heavy_mode: Optional[bool] = False
    conservative_render_mode: Optional[bool] = False
    render_detected_at: Optional[datetime] = None
    canvas_count: Optional[int] = None
    has_webgl: Optional[bool] = None
    has_three_js: Optional[bool] = None
    
    class Config: from_attributes = True

class SessionOut(SessionRead):
    pass

class SessionUpdate(BaseModel):
    title: Optional[str] = None
    current_page_url: Optional[str] = None
    pages_visited_count: Optional[int] = None
    renderer_type: Optional[str] = None
    heavy_mode: Optional[bool] = None
    conservative_render_mode: Optional[bool] = None
    render_detected_at: Optional[datetime] = None
    canvas_count: Optional[int] = None
    has_webgl: Optional[bool] = None
    has_three_js: Optional[bool] = None

class SessionRendererUpdate(BaseModel):
    renderer_type: str
    has_canvas: bool
    canvas_count: int
    raf_detected: bool
    three_detected: bool

# Markers
class CanonicalAnchor(BaseModel):
    page_x: float
    page_y: float
    viewport_width: float
    viewport_height: float
    scroll_x: float
    scroll_y: float
    css_selector: Optional[str] = None
    xpath: Optional[str] = None
    element_tag: Optional[str] = None
    element_text_excerpt: Optional[str] = None
    offset_x_ratio: Optional[float] = None
    offset_y_ratio: Optional[float] = None
    element_rect: Optional[dict] = None

# Environments
class EnvironmentCreate(BaseModel):
    name: str
    base_url: str

class EnvironmentOut(BaseModel):
    id: str
    project_id: str
    name: str
    base_url: str
    class Config: from_attributes = True

# Canvas
class CanvasFrameCreate(BaseModel):
    project_id: str
    session_id: Optional[str] = None
    title: str
    position_x: Optional[float] = 0.0
    position_y: Optional[float] = 0.0
    width: Optional[float] = 320.0
    height: Optional[float] = 200.0
    color: Optional[str] = "#1c1b19"

class CanvasFrameUpdate(BaseModel):
    position_x: Optional[float] = None
    position_y: Optional[float] = None
    width: Optional[float] = None
    height: Optional[float] = None
    color: Optional[str] = None
    title: Optional[str] = None
    session_id: Optional[str] = None

class CanvasPriorityDistribution(BaseModel):
    critical: int = 0
    high: int = 0
    medium: int = 0
    low: int = 0

class CanvasFrameRead(BaseModel):
    id: str
    project_id: str
    session_id: Optional[str] = None
    title: str
    position_x: float
    position_y: float
    width: float
    height: float
    color: str
    snapshot_url: Optional[str] = None
    created_at: datetime
    priority_distribution: CanvasPriorityDistribution = CanvasPriorityDistribution()
    class Config: from_attributes = True

class CanvasFlowCreate(BaseModel):
    project_id: str
    source_frame_id: str
    target_frame_id: str
    label: Optional[str] = None

class CanvasFlowRead(BaseModel):
    id: str
    project_id: str
    source_frame_id: str
    target_frame_id: str
    label: Optional[str] = None
    created_at: datetime
    class Config: from_attributes = True

class CanvasData(BaseModel):
    frames: List[CanvasFrameRead]
    flows: List[CanvasFlowRead]

# Legacy compatibility aliases
CanvasFrameOut = CanvasFrameRead
CanvasFlowOut = CanvasFlowRead

# Project Update
class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    url: Optional[str] = None

# Page Visits
class PageVisitCreate(BaseModel):
    session_id: str
    page_url: str
    page_title: Optional[str] = None
    renderer_type: Optional[str] = None
    screenshot_url: Optional[str] = None
    visit_metadata: Optional[dict] = None
    
    share_link_id: Optional[str] = None
    page_order: Optional[int] = 1
    time_on_page_seconds: Optional[int] = None
    parent_page_id: Optional[str] = None

class PageVisitRead(BaseModel):
    id: str
    session_id: str
    page_url: str
    page_title: Optional[str]
    visited_at: datetime
    renderer_type: Optional[str]
    screenshot_url: Optional[str]
    visit_metadata: Optional[dict] = None
    
    share_link_id: Optional[str] = None
    page_order: Optional[int] = 1
    first_visited_at: Optional[datetime] = None
    last_visited_at: Optional[datetime] = None
    visit_count: Optional[int] = 1
    time_on_page_seconds: Optional[int] = None
    screenshot_captured_at: Optional[datetime] = None
    parent_page_id: Optional[str] = None
    
    class Config: from_attributes = True

class PageVisitOut(PageVisitRead):
    pass

# Stats and Grouped Queries
class SessionStatsRead(BaseModel):
    total: int
    by_priority: dict
    by_status: dict
    by_renderer: dict
    pages_visited: int
    unique_pages: int



from pydantic import Field
import uuid

class DOMEditCreate(BaseModel):
    session_id: uuid.UUID
    selector: str
    xpath: Optional[str] = None
    property: str
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    element_tag: Optional[str] = None
    element_text: Optional[str] = Field(None, max_length=80)
    page_url: str
    created_by: Optional[str] = None

class DOMEditRead(BaseModel):
    id: uuid.UUID
    session_id: uuid.UUID
    selector: str
    xpath: Optional[str] = None
    property: str
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    element_tag: Optional[str] = None
    element_text: Optional[str] = Field(None, max_length=80)
    page_url: str
    created_at: datetime
    created_by: Optional[str] = None

    class Config:
        from_attributes = True

# Email Auth Flow Schemas
class VerifyEmailRequest(BaseModel):
    token: str

class RequestPasswordResetRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    password: Optional[str] = None
    new_password: Optional[str] = None

class ResendVerificationRequest(BaseModel):
    email: EmailStr

class MessageResponse(BaseModel):
    message: str
    dev_link: Optional[str] = None


class ApiKeyCreate(BaseModel):
    name: str

class ApiKeyRead(BaseModel):
    id: str
    name: str
    created_at: datetime
    last_used_at: Optional[datetime] = None
    revoked_at: Optional[datetime] = None
    masked_token: str

    class Config:
        from_attributes = True

class ApiKeyCreatedResponse(BaseModel):
    id: str
    name: str
    created_at: datetime
    raw_token: str

    class Config:
        from_attributes = True


# Blueprint DOM Edit Subsystem Schemas
class BlueprintDomTargetUpsert(BaseModel):
    page_url: Optional[str] = None
    selector_primary: Optional[str] = None
    selector_fallback: Optional[str] = None
    xpath: Optional[str] = None
    target_signature_json: Optional[dict] = None
    element_tag: Optional[str] = None
    element_label: Optional[str] = None
    text_excerpt: Optional[str] = None


class BlueprintDomTargetOut(BaseModel):
    id: str
    project_id: str
    canvas_frame_id: str
    page_url: Optional[str] = None
    selector_primary: Optional[str] = None
    selector_fallback: Optional[str] = None
    xpath: Optional[str] = None
    target_signature_json: Optional[dict] = None
    element_tag: Optional[str] = None
    element_label: Optional[str] = None
    text_excerpt: Optional[str] = None
    created_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class BlueprintDomEditOperationCreate(BaseModel):
    op_type: Literal["style", "content", "attribute", "class_toggle"]
    property_key: str
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    unit: Optional[str] = None
    selector_override: Optional[str] = None
    sort_order: int = 0


class BlueprintDomEditOperationUpdate(BaseModel):
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    unit: Optional[str] = None
    selector_override: Optional[str] = None
    sort_order: Optional[int] = None


class BlueprintDomEditOperationOut(BaseModel):
    id: str
    edit_set_id: str
    op_type: str
    property_key: str
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    unit: Optional[str] = None
    selector_override: Optional[str] = None
    sort_order: int
    created_at: datetime

    class Config:
        from_attributes = True


class BlueprintDomEditSetCreate(BaseModel):
    target_id: Optional[str] = None
    name: Optional[str] = None
    status: Literal["draft", "saved", "archived"] = "draft"
    base_snapshot_json: Optional[dict] = None
    notes: Optional[str] = None


class BlueprintDomEditSetOut(BaseModel):
    id: str
    project_id: str
    canvas_frame_id: str
    target_id: Optional[str] = None
    name: Optional[str] = None
    version_number: int
    status: str
    base_snapshot_json: Optional[dict] = None
    notes: Optional[str] = None
    created_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    operations: List[BlueprintDomEditOperationOut] = []

    class Config:
        from_attributes = True


class BlueprintMutationCreate(BaseModel):
    id: Optional[str] = None
    targetSelector: str
    actionType: str
    presetId: Optional[str] = None
    presetName: Optional[str] = None
    htmlPayload: Optional[str] = None
    timestamp: Optional[str] = None
    pageUrl: Optional[str] = None


class BlueprintMutationRead(BaseModel):
    id: str
    project_id: str
    targetSelector: str
    actionType: str
    presetId: Optional[str] = None
    presetName: Optional[str] = None
    htmlPayload: Optional[str] = None
    timestamp: Optional[str] = None
    pageUrl: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class BlueprintBatchSaveRequest(BaseModel):
    mutations: List[BlueprintMutationCreate]


class BlueprintPublicationCreate(BaseModel):
    name: str
    metadata_json: Optional[dict] = None


class BlueprintPublicationRead(BaseModel):
    id: str
    project_id: str
    name: str
    blueprint_version: int
    status: str = "draft"
    metadata_json: Optional[dict] = None
    share_token: Optional[str] = None
    created_by: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class BlueprintCommentCreate(BaseModel):
    canvas_frame_id: Optional[str] = None
    blueprint_edit_id: Optional[str] = None
    target_selector: Optional[str] = None
    page_url: Optional[str] = None
    author_name: Optional[str] = None
    body: str
    parent_comment_id: Optional[str] = None


class BlueprintCommentUpdate(BaseModel):
    body: Optional[str] = None
    status: Optional[str] = None  # open | resolved


class BlueprintCommentRead(BaseModel):
    id: str
    project_id: str
    canvas_frame_id: Optional[str] = None
    blueprint_edit_id: Optional[str] = None
    target_selector: Optional[str] = None
    page_url: Optional[str] = None
    author_id: Optional[str] = None
    author_name: Optional[str] = None
    body: str
    status: str
    parent_comment_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    replies: List['BlueprintCommentRead'] = []

    class Config:
        from_attributes = True


class PublicationStatusUpdateRequest(BaseModel):
    status: str  # draft | in_review | approved | changes_requested
    note: Optional[str] = None
    changed_by_name: Optional[str] = None
    role: Optional[str] = None  # owner | admin | developer | reviewer | client


class BlueprintStatusHistoryRead(BaseModel):
    id: str
    publication_id: str
    previous_status: str
    new_status: str
    changed_by_id: Optional[str] = None
    changed_by_name: Optional[str] = None
    note: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class BlueprintActivityCreate(BaseModel):
    project_id: str
    event_type: str
    target_type: str
    summary_text: str
    actor_id: Optional[str] = None
    actor_name: Optional[str] = "STAGE Collaborator"
    target_id: Optional[str] = None
    metadata_json: Optional[Dict[str, Any]] = None


class BlueprintActivityRead(BaseModel):
    id: str
    project_id: str
    actor_id: Optional[str] = None
    actor_name: str
    event_type: str
    target_type: str
    target_id: Optional[str] = None
    summary_text: str
    metadata_json: Optional[Dict[str, Any]] = None
    created_at: datetime

    class Config:
        from_attributes = True


class BlueprintActivityListResponse(BaseModel):
    items: List[BlueprintActivityRead]
    has_more: bool
    next_cursor: Optional[str] = None


class BlueprintSummaryGenerateRequest(BaseModel):
    publication_id: Optional[str] = None
    edit_ids: Optional[List[str]] = None
    activity_window_hours: Optional[int] = 24
    tone: Optional[str] = "client_friendly"  # concise | detailed | client_friendly
    audience: Optional[str] = "client"  # client | developer | stakeholder


class BlueprintSummaryRead(BaseModel):
    id: str
    project_id: str
    blueprint_publication_id: Optional[str] = None
    generated_for_type: str
    input_range_json: Optional[Dict[str, Any]] = None
    title: str
    summary_text: str
    bullets_json: Optional[List[str]] = None
    risks_json: Optional[List[str]] = None
    followups_json: Optional[List[str]] = None
    model_name: str
    tokens_estimate: Optional[int] = None
    created_at: datetime
    created_by: Optional[str] = None

    class Config:
        from_attributes = True


class NotificationEventRead(BaseModel):
    id: str
    user_id: Optional[str] = None
    project_id: Optional[str] = None
    source_type: str  # blueprint | session
    event_type: str
    category: str  # critical | important | digest | presence
    entity_type: str
    entity_id: Optional[str] = None
    title: str
    body: str
    metadata_json: Optional[Dict[str, Any]] = None
    read_at: Optional[datetime] = None
    created_at: datetime
    delivered_email_at: Optional[datetime] = None
    delivered_digest_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class NotificationListResponse(BaseModel):
    items: List[NotificationEventRead]
    unread_count: int
    has_more: bool
    next_cursor: Optional[str] = None


class NotificationPreferencesRead(BaseModel):
    id: str
    user_id: str
    project_id: Optional[str] = None
    email_enabled: bool
    digest_enabled: bool
    allow_blueprint_events: bool
    allow_session_events: bool
    allow_critical: bool
    allow_important: bool
    allow_digest: bool
    quiet_hours_json: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class NotificationPreferencesUpdate(BaseModel):
    project_id: Optional[str] = None
    email_enabled: Optional[bool] = None
    digest_enabled: Optional[bool] = None
    allow_blueprint_events: Optional[bool] = None
    allow_session_events: Optional[bool] = None
    allow_critical: Optional[bool] = None
    allow_important: Optional[bool] = None
    allow_digest: Optional[bool] = None
    quiet_hours_json: Optional[Dict[str, Any]] = None


class DigestPreviewRequest(BaseModel):
    project_id: Optional[str] = None
    hours: Optional[int] = 24


class DigestPreviewResponse(BaseModel):
    project_id: Optional[str] = None
    subject: str
    event_count: int
    blueprint_count: int
    session_count: int
    digest_html: str
    digest_text: str








