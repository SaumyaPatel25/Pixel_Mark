from pydantic import BaseModel, computed_field, ConfigDict
from typing import Optional
from datetime import datetime
import os

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

class ShareLinkCreate(BaseModel):
    session_id: str
    label: Optional[str] = None
    can_comment: bool = True
    password: Optional[str] = None
    expires_at: Optional[datetime] = None

class ShareLinkRead(BaseModel):
    id: str
    session_id: str
    token: str
    label: Optional[str]
    can_comment: bool
    is_active: bool
    expires_at: Optional[datetime]
    accessed_count: int
    created_at: datetime

    @computed_field
    @property
    def share_url(self) -> str:
        return f"{FRONTEND_URL.rstrip('/')}/review/{self.token}"

    model_config = ConfigDict(from_attributes=True)

class ShareLinkAccess(BaseModel):
    token: str
    password: Optional[str] = None

class ShareLinkOut(BaseModel):
    id: str
    token: str
    can_comment: bool
    expires_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

class ShareLinkPublicRead(BaseModel):
    token: str
    session_id: str
    can_comment: bool
    label: Optional[str]
    session_title: Optional[str]
    project_name: Optional[str]

    model_config = ConfigDict(from_attributes=True)
