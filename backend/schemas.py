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
    created_at: datetime
    class Config: from_attributes = True

# Markers
class MarkerCreate(BaseModel):
    session_id: str
    title: Optional[str] = None
    description: Optional[str] = None
    url: Optional[str] = None
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
    xpath: Optional[str]
    css_selector: Optional[str]
    inner_text: Optional[str]
    viewport: Optional[dict]
    browser: Optional[str]
    os: Optional[str]
    scroll_position: Optional[dict]
    console_errors: Optional[List[Any]]
    network_errors: Optional[List[Any]]
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

# Project Update
class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    url: Optional[str] = None

