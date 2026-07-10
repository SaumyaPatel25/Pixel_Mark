from enum import Enum

class MarkerAnchorKind(str, Enum):
    DOM_RELATIVE = "dom-relative"
    VIEWPORT_ABSOLUTE = "viewport-absolute"
    CANVAS_RELATIVE = "canvas-relative"
    WEBGL_CLIP_SPACE = "webgl-clip-space"
    MANUAL = "manual"

class MarkerRendererType(str, Enum):
    DOM = "dom"
    SHADOW_DOM = "shadow-dom"
    CANVAS2D = "canvas2d"
    WEBGL = "webgl"
    THREEJS = "threejs"

class CreatorRole(str, Enum):
    DEVELOPER = "developer"
    REVIEWER = "reviewer"

class MarkerStatus(str, Enum):
    OPEN = "open"
    RESOLVED = "resolved"

class MarkerPriority(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

# Reserved event names for future realtime integration
EVENT_MARKER_CREATED = "marker_created"
EVENT_MARKER_UPDATED = "marker_updated"
EVENT_MARKER_DELETED = "marker_deleted"
EVENT_MARKER_MOVED = "marker_moved"
EVENT_MARKER_RESOLVED = "marker_resolved"
