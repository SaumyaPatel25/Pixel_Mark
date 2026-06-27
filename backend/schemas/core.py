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
    heavy_mode: bool = False
    conservative_render_mode: bool = False
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
class MarkerCreate(BaseModel):
    session_id: Optional[str] = None
    project_id: Optional[str] = None
    page_visit_id: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    url: Optional[str] = None
    page_url: Optional[str] = None
    page_title: Optional[str] = None
    renderer_type: Optional[str] = "dom"
    canvas_context: Optional[dict] = None
    agent_version: Optional[str] = "2.0"
    xpath: Optional[str] = None
    css_selector: Optional[str] = None
    inner_text: Optional[str] = None
    viewport: Optional[dict] = None
    browser: Optional[str] = None
    os: Optional[str] = None
    scroll_position: Optional[dict] = None
    console_errors: Optional[List[Any]] = None
    network_errors: Optional[List[Any]] = None
    screenshot_url: Optional[str] = None
    priority: Optional[PriorityEnum] = PriorityEnum.medium
    is_inside_shadow_dom: Optional[bool] = False
    shadow_root_depth: Optional[int] = None
    shadow_host_tag: Optional[str] = None
    shadow_host_id: Optional[str] = None
    shadow_host_class_list: Optional[List[str]] = None
    shadow_path: Optional[str] = None
    
    # Step 2B ingestion fields
    share_token: Optional[str] = None
    x: Optional[float] = None
    y: Optional[float] = None
    viewport_x: Optional[float] = None
    viewport_y: Optional[float] = None
    norm_x: Optional[float] = None
    norm_y: Optional[float] = None
    canvas_snapshot: Optional[str] = None
    element_selector: Optional[str] = None
    element_text: Optional[str] = None
    element_tag: Optional[str] = None
    note: Optional[str] = None
    severity: Optional[str] = "medium"
    screenshot_required: Optional[bool] = False
    created_via: Optional[str] = "agent"
    share_link_id: Optional[str] = None
    user_id: Optional[str] = None

    # Step 2v2 structured issue fields
    issue_type: Optional[str] = "other"  # layout | copy | interaction | navigation | rendering | canvas_webgl | other
    aria_label: Optional[str] = None
    aria_role: Optional[str] = None
    bounding_box: Optional[dict] = None   # {x, y, width, height, top, right, bottom, left}
    browser_info: Optional[dict] = None   # {name, version, os, platform, user_agent}

class MarkerUpdate(BaseModel):
    status: Optional[str] = None
    priority: Optional[PriorityEnum] = None
    assignee_id: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None

class MarkerRead(BaseModel):
    id: str
    session_id: str
    page_visit_id: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    url: Optional[str] = None
    page_url: Optional[str] = None
    page_title: Optional[str] = None
    renderer_type: Optional[str] = None
    canvas_context: Optional[dict] = None
    marker_number: int
    agent_version: Optional[str] = None
    xpath: Optional[str] = None
    css_selector: Optional[str] = None
    inner_text: Optional[str] = None
    viewport: Optional[dict] = None
    browser: Optional[str] = None
    os: Optional[str] = None
    scroll_position: Optional[dict] = None
    console_errors: Optional[List[Any]] = None
    network_errors: Optional[List[Any]] = None
    screenshot_url: Optional[str] = None
    priority: PriorityEnum
    status: str
    ai_summary: Optional[str] = None
    is_inside_shadow_dom: Optional[bool] = False
    shadow_root_depth: Optional[int] = None
    shadow_host_tag: Optional[str] = None
    shadow_host_id: Optional[str] = None
    shadow_host_class_list: Optional[List[str]] = None
    shadow_path: Optional[str] = None
    
    # Step 2B ingestion fields
    x: Optional[float] = None
    y: Optional[float] = None
    viewport_x: Optional[float] = None
    viewport_y: Optional[float] = None
    norm_x: Optional[float] = None
    norm_y: Optional[float] = None
    canvas_snapshot: Optional[str] = None
    element_selector: Optional[str] = None
    element_text: Optional[str] = None
    element_tag: Optional[str] = None
    note: Optional[str] = None
    severity: Optional[str] = "medium"
    screenshot_required: Optional[bool] = False
    created_via: Optional[str] = "agent"
    share_link_id: Optional[str] = None
    user_id: Optional[str] = None

    # Step 2v2 structured issue fields
    issue_type: Optional[str] = "other"
    aria_label: Optional[str] = None
    aria_role: Optional[str] = None
    bounding_box: Optional[dict] = None
    browser_info: Optional[dict] = None
    
    # Step 3 feedback models
    project_id: Optional[str] = None
    comment: Optional[str] = None
    capture_payload: Optional[dict] = None
    coordinates: Optional[dict] = None
    target: Optional[dict] = None
    source: Optional[dict] = None
    screenshots: Optional[dict] = None
    diagnostics: Optional[dict] = None
    created_by: Optional[str] = None
    parent_page_id: Optional[str] = None
    
    created_at: datetime
    updated_at: Optional[datetime] = None
    class Config: from_attributes = True

class MarkerOut(MarkerRead):
    pass

# Feedback schemas (Step 3)
class FeedbackCreate(BaseModel):
    pageurl: str
    pagetitle: Optional[str] = None
    issuetype: Optional[str] = "other"
    priority: Optional[str] = "medium"
    comment: Optional[str] = ""
    renderertype: Optional[str] = "dom"
    createdvia: Optional[str] = "agent"
    capturepayload: dict
    share_token: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None

class FeedbackUpdate(BaseModel):
    status: Optional[str] = None
    issuetype: Optional[str] = None
    priority: Optional[str] = None
    comment: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None

class FeedbackOut(BaseModel):
    id: str
    sessionid: str
    pageurl: str
    pagetitle: Optional[str] = None
    status: str
    issuetype: Optional[str] = None
    priority: Optional[str] = None
    comment: Optional[str] = None
    renderertype: Optional[str] = None
    createdvia: Optional[str] = None
    createdat: datetime
    updatedat: Optional[datetime] = None
    capturepayload: Optional[dict] = None
    
    # Metadata for frontend mapping
    project_id: Optional[str] = None
    marker_number: Optional[int] = None
    share_link_id: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None

class FeedbackListOut(BaseModel):
    items: List[FeedbackOut]
    total: int

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

class CanvasMarkerSummary(BaseModel):
    title: Optional[str] = None
    priority: str

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
    marker_count: int = 0
    top_markers: List[CanvasMarkerSummary] = []
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

class PageMarkersGroup(BaseModel):
    page_url: str
    page_title: Optional[str] = None
    marker_count: int
    markers: List[MarkerOut]

class PageGroupedMarkersRead(BaseModel):
    pages: List[PageMarkersGroup]


