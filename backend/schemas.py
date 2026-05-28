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

class SessionOut(BaseModel):
    id: str
    project_id: str
    title: Optional[str]
    current_page_url: Optional[str] = None
    pages_visited: Optional[int] = 0
    created_at: datetime
    class Config: from_attributes = True

# Markers
class MarkerCreate(BaseModel):
    session_id: Optional[str] = None
    project_id: Optional[str] = None
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

class MarkerUpdate(BaseModel):
    status: Optional[StatusEnum] = None
    priority: Optional[PriorityEnum] = None
    assignee_id: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None

class MarkerOut(BaseModel):
    id: str
    session_id: str
    title: Optional[str]
    description: Optional[str]
    url: Optional[str]
    page_url: Optional[str]
    page_title: Optional[str]
    renderer_type: Optional[str]
    canvas_context: Optional[dict]
    marker_number: int
    agent_version: Optional[str]
    xpath: Optional[str]
    css_selector: Optional[str]
    inner_text: Optional[str]
    viewport: Optional[dict]
    browser: Optional[str]
    os: Optional[str]
    scroll_position: Optional[dict]
    console_errors: Optional[List[Any]]
    network_errors: Optional[List[Any]]
    screenshot_url: Optional[str]
    priority: PriorityEnum
    status: StatusEnum
    ai_summary: Optional[str]
    created_at: datetime
    class Config: from_attributes = True

# Share links
class ShareLinkCreate(BaseModel):
    session_id: str
    can_comment: bool = True
    password: Optional[str] = None
    expires_at: Optional[datetime] = None

class ShareLinkOut(BaseModel):
    id: str
    token: str
    can_comment: bool
    expires_at: Optional[datetime]
    class Config: from_attributes = True

class ShareLinkAccess(BaseModel):
    password: Optional[str] = None

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

class PageVisitOut(BaseModel):
    id: str
    session_id: str
    page_url: str
    page_title: Optional[str]
    visited_at: datetime
    renderer_type: Optional[str]
    screenshot_url: Optional[str]
    class Config: from_attributes = True


