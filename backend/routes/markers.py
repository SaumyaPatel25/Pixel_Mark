"""
STAGE Markers Route Integration
Exposes marker creation and query endpoints, integrating emit_pin_event with the Transactional Outbox.
"""
from markers.router import router, create_marker, list_markers, resolve_actor_context

__all__ = ["router", "create_marker", "list_markers", "resolve_actor_context"]
