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
    class Config: from_attributes = True

class SessionOut(SessionRead):
    pass

class SessionUpdate(BaseModel):
    title: Optional[str] = None
    current_page_url: Optional[str] = None
    pages_visited_count: Optional[int] = None

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
    status: Optional[StatusEnum] = None
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
    status: StatusEnum
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
    
    created_at: datetime
    updated_at: Optional[datetime] = None
    class Config: from_attributes = True

class MarkerOut(MarkerRead):
    pass

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
class CanvasFrameOut(BaseModel):
    id: str
    project_id: str
    title: str
    position_x: float
    position_y: float
    width: float
    height: float
    snapshot_url: Optional[str]
    class Config: from_attributes = True

class CanvasFrameUpdate(BaseModel):
    position_x: Optional[float] = None
    position_y: Optional[float] = None
    width: Optional[float] = None
    height: Optional[float] = None
    title: Optional[str] = None

class CanvasFlowOut(BaseModel):
    id: str
    project_id: str
    name: str
    frame_sequence: List[str]
    class Config: from_attributes = True

class CanvasData(BaseModel):
    frames: List[CanvasFrameOut]
    flows: List[CanvasFlowOut]

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


