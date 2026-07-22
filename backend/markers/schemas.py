from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from markers.contracts import MarkerAnchorKind, MarkerRendererType, CreatorRole, MarkerStatus, MarkerPriority

class ReviewerIdentityCreate(BaseModel):
    display_name: str = Field(..., min_length=1, max_length=100)
    color_token: Optional[str] = Field(None, max_length=50)

class ReviewerIdentityRead(BaseModel):
    id: str
    session_id: str
    display_name: str
    role: str
    color_token: str
    created_at: datetime
    last_seen_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class MarkerCreate(BaseModel):
    project_id: str
    page_visit_id: Optional[str] = None
    creator_id: Optional[str] = None
    creator_name: Optional[str] = None
    creator_role: Optional[CreatorRole] = None
    color_token: Optional[str] = None

    anchor_kind: MarkerAnchorKind
    anchor_mode: Optional[str] = "dom"
    page_url: Optional[str] = None
    page_title: Optional[str] = None
    
    # DOM Placement
    target_selector: Optional[str] = None
    target_xpath: Optional[str] = None
    dom_text_excerpt: Optional[str] = None
    offset_x_ratio: Optional[float] = None
    offset_y_ratio: Optional[float] = None
    
    # Viewport placement
    viewport_x: Optional[float] = None
    viewport_y: Optional[float] = None
    page_x: Optional[float] = None
    page_y: Optional[float] = None
    viewport_width: Optional[float] = None
    viewport_height: Optional[float] = None
    element_rect_json: Optional[Dict[str, Any]] = None
    scroll_x: Optional[float] = None
    scroll_y: Optional[float] = None

    # Canvas/WebGL Placement
    canvas_id: Optional[str] = None
    canvas_x_ratio: Optional[float] = None
    canvas_y_ratio: Optional[float] = None
    webgl_clip_x: Optional[float] = None
    webgl_clip_y: Optional[float] = None
    renderer_type: Optional[MarkerRendererType] = None

    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[MarkerStatus] = MarkerStatus.OPEN
    priority: Optional[MarkerPriority] = MarkerPriority.MEDIUM

    browser: Optional[str] = None
    os: Optional[str] = None
    device_pixel_ratio: Optional[float] = None
    console_errors_json: Optional[List[Any]] = None
    network_errors_json: Optional[List[Any]] = None
    screenshot_url: Optional[str] = None
    encrypted_context: Optional[str] = None

    @field_validator('offset_x_ratio', 'offset_y_ratio', 'canvas_x_ratio', 'canvas_y_ratio')
    @classmethod
    def validate_ratios(cls, v: Optional[float]) -> Optional[float]:
        if v is not None:
            # Clamping to [0.0, 1.0]
            return max(0.0, min(1.0, v))
        return v

    @field_validator('webgl_clip_x', 'webgl_clip_y')
    @classmethod
    def validate_clip_space(cls, v: Optional[float]) -> Optional[float]:
        if v is not None:
            # Clamping to [-1.0, 1.0]
            return max(-1.0, min(1.0, v))
        return v

class MarkerUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[MarkerStatus] = None
    priority: Optional[MarkerPriority] = None
    color_token: Optional[str] = None
    screenshot_url: Optional[str] = None
    browser: Optional[str] = None
    os: Optional[str] = None
    device_pixel_ratio: Optional[float] = None
    console_errors_json: Optional[List[Any]] = None
    network_errors_json: Optional[List[Any]] = None
    expected_version: Optional[int] = None
    anchor_mode: Optional[str] = None

class MarkerPositionPatch(BaseModel):
    # DOM Placement
    anchor_mode: Optional[str] = None
    offset_x_ratio: Optional[float] = None
    offset_y_ratio: Optional[float] = None
    target_selector: Optional[str] = None
    target_xpath: Optional[str] = None
    dom_text_excerpt: Optional[str] = None

    # Viewport placement
    viewport_x: Optional[float] = None
    viewport_y: Optional[float] = None
    page_x: Optional[float] = None
    page_y: Optional[float] = None
    viewport_width: Optional[float] = None
    viewport_height: Optional[float] = None
    scroll_x: Optional[float] = None
    scroll_y: Optional[float] = None

    # Canvas/WebGL Placement
    canvas_x_ratio: Optional[float] = None
    canvas_y_ratio: Optional[float] = None
    webgl_clip_x: Optional[float] = None
    webgl_clip_y: Optional[float] = None
    expected_version: Optional[int] = None

    @field_validator('offset_x_ratio', 'offset_y_ratio', 'canvas_x_ratio', 'canvas_y_ratio')
    @classmethod
    def validate_ratios(cls, v: Optional[float]) -> Optional[float]:
        if v is not None:
            return max(0.0, min(1.0, v))
        return v

    @field_validator('webgl_clip_x', 'webgl_clip_y')
    @classmethod
    def validate_clip_space(cls, v: Optional[float]) -> Optional[float]:
        if v is not None:
            return max(-1.0, min(1.0, v))
        return v

class MarkerRead(BaseModel):
    id: str
    project_id: str
    session_id: str
    page_visit_id: Optional[str]
    creator_id: Optional[str]
    creator_name: Optional[str]
    creator_role: Optional[str]
    color_token: Optional[str]

    anchor_kind: str
    anchor_mode: str
    page_url: Optional[str]
    page_title: Optional[str]
    target_selector: Optional[str]
    target_xpath: Optional[str]
    dom_text_excerpt: Optional[str]
    offset_x_ratio: Optional[float]
    offset_y_ratio: Optional[float]
    viewport_x: Optional[float]
    viewport_y: Optional[float]
    page_x: Optional[float]
    page_y: Optional[float]
    viewport_width: Optional[float]
    viewport_height: Optional[float]
    element_rect_json: Optional[Dict[str, Any]]
    scroll_x: Optional[float]
    scroll_y: Optional[float]

    canvas_id: Optional[str]
    canvas_x_ratio: Optional[float]
    canvas_y_ratio: Optional[float]
    webgl_clip_x: Optional[float]
    webgl_clip_y: Optional[float]
    renderer_type: Optional[str]

    title: Optional[str]
    description: Optional[str]
    status: str
    priority: str
    is_deleted: bool
    created_at: datetime
    updated_at: Optional[datetime]
    version: int
    marker_number: Optional[int] = None

    browser: Optional[str]
    os: Optional[str]
    device_pixel_ratio: Optional[float]
    console_errors_json: Optional[List[Any]]
    network_errors_json: Optional[List[Any]]
    screenshot_url: Optional[str]
    encrypted_context: Optional[str]

    class Config:
        from_attributes = True

class MarkerListItem(BaseModel):
    id: str
    session_id: str
    page_url: Optional[str]
    anchor_kind: str
    anchor_mode: str
    title: Optional[str]
    status: str
    priority: str
    color_token: Optional[str]
    creator_name: Optional[str]
    creator_role: Optional[str]
    created_at: datetime
    version: int
    marker_number: Optional[int] = None

    class Config:
        from_attributes = True
