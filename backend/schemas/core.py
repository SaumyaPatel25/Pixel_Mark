from pydantic import BaseModel, EmailStr
from typing import Optional, List, Any
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



