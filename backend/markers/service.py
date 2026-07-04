from fastapi import HTTPException, status
from markers.contracts import MarkerAnchorKind, CreatorRole, MarkerStatus, MarkerPriority
from markers.models import Marker, ReviewerIdentity
from markers.schemas import MarkerCreate, MarkerUpdate, MarkerPositionPatch
from typing import Optional

class MarkerService:
    @staticmethod
    def validate_coordinate_invariants(payload: MarkerCreate) -> None:
        """
        Enforce allowed anchor fields by anchor kind and reject invalid coordinate combinations.
        """
        kind = payload.anchor_kind

        if kind == MarkerAnchorKind.DOM_RELATIVE:
            if not (payload.target_selector or payload.target_xpath):
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="DOM-relative markers require target_selector or target_xpath"
                )
            if payload.offset_x_ratio is None or payload.offset_y_ratio is None:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="DOM-relative markers require offset_x_ratio and offset_y_ratio"
                )
            # Check conflicts
            conflicts = [
                payload.viewport_x, payload.viewport_y,
                payload.canvas_x_ratio, payload.canvas_y_ratio,
                payload.webgl_clip_x, payload.webgl_clip_y
            ]
            if any(x is not None for x in conflicts):
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Conflicting coordinate systems provided for DOM-relative anchor"
                )

        elif kind == MarkerAnchorKind.VIEWPORT_ABSOLUTE:
            if payload.viewport_x is None or payload.viewport_y is None:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="viewport-absolute markers require viewport_x and viewport_y"
                )
            if payload.viewport_width is None or payload.viewport_height is None:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="viewport-absolute markers require viewport_width and viewport_height"
                )
            # Check conflicts
            conflicts = [
                payload.target_selector, payload.target_xpath,
                payload.offset_x_ratio, payload.offset_y_ratio,
                payload.canvas_x_ratio, payload.canvas_y_ratio,
                payload.webgl_clip_x, payload.webgl_clip_y
            ]
            if any(x is not None for x in conflicts):
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Conflicting coordinate systems provided for viewport-absolute anchor"
                )

        elif kind == MarkerAnchorKind.CANVAS_RELATIVE:
            if payload.canvas_x_ratio is None or payload.canvas_y_ratio is None:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="canvas-relative markers require canvas_x_ratio and canvas_y_ratio"
                )
            # Check conflicts
            conflicts = [
                payload.target_selector, payload.target_xpath,
                payload.offset_x_ratio, payload.offset_y_ratio,
                payload.viewport_x, payload.viewport_y,
                payload.webgl_clip_x, payload.webgl_clip_y
            ]
            if any(x is not None for x in conflicts):
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Conflicting coordinate systems provided for canvas-relative anchor"
                )

        elif kind == MarkerAnchorKind.WEBGL_CLIP_SPACE:
            if payload.webgl_clip_x is None or payload.webgl_clip_y is None:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="webgl-clip-space markers require webgl_clip_x and webgl_clip_y"
                )
            # Check conflicts
            conflicts = [
                payload.target_selector, payload.target_xpath,
                payload.offset_x_ratio, payload.offset_y_ratio,
                payload.viewport_x, payload.viewport_y,
                payload.canvas_x_ratio, payload.canvas_y_ratio
            ]
            if any(x is not None for x in conflicts):
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Conflicting coordinate systems provided for webgl-clip-space anchor"
                )

    @staticmethod
    def validate_position_patch_invariants(marker: Marker, patch: MarkerPositionPatch) -> None:
        """
        Validate position invariants for patch movements based on anchor kind.
        """
        kind = marker.anchor_kind

        if kind == MarkerAnchorKind.DOM_RELATIVE:
            if patch.offset_x_ratio is None or patch.offset_y_ratio is None:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="DOM-relative marker requires offset_x_ratio and offset_y_ratio for move"
                )
        elif kind == MarkerAnchorKind.VIEWPORT_ABSOLUTE:
            if patch.viewport_x is None or patch.viewport_y is None:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="viewport-absolute marker requires viewport_x and viewport_y for move"
                )
        elif kind == MarkerAnchorKind.CANVAS_RELATIVE:
            if patch.canvas_x_ratio is None or patch.canvas_y_ratio is None:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="canvas-relative marker requires canvas_x_ratio and canvas_y_ratio for move"
                )
        elif kind == MarkerAnchorKind.WEBGL_CLIP_SPACE:
            if patch.webgl_clip_x is None or patch.webgl_clip_y is None:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="webgl-clip-space marker requires webgl_clip_x and webgl_clip_y for move"
                )

    @staticmethod
    def check_mutation_permission(actor_role: Optional[str], actor_id: Optional[str], marker: Marker) -> None:
        """
        Centralize update/delete/move permission checks.
        - Developers can update and delete any marker.
        - Reviewers can update and delete only markers they created.
        """
        if actor_role == CreatorRole.DEVELOPER.value:
            return

        if actor_role == CreatorRole.REVIEWER.value:
            if marker.creator_id and marker.creator_id == actor_id:
                return
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Reviewers can only modify markers they created"
            )

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to modify marker"
        )

    @staticmethod
    def prepare_marker_creation(payload: MarkerCreate, actor_role: Optional[str], actor_id: Optional[str], actor_name: Optional[str], actor_color: Optional[str]) -> Marker:
        # Enforce coordinate invariants
        MarkerService.validate_coordinate_invariants(payload)

        # Map actor credentials
        creator_id = actor_id
        creator_name = actor_name or "Anonymous"
        creator_role = actor_role or CreatorRole.REVIEWER.value

        # Assign default color token if absent
        color_token = payload.color_token or actor_color or "#8b5cf6"

        # Construct SQLAlchemy Model
        marker = Marker(
            project_id=payload.project_id,
            page_visit_id=payload.page_visit_id,
            creator_id=creator_id,
            creator_name=creator_name,
            creator_role=creator_role,
            color_token=color_token,
            anchor_kind=payload.anchor_kind.value,
            anchor_mode=payload.anchor_mode or "dom",
            page_url=payload.page_url,
            page_title=payload.page_title,
            target_selector=payload.target_selector,
            target_xpath=payload.target_xpath,
            dom_text_excerpt=payload.dom_text_excerpt,
            offset_x_ratio=payload.offset_x_ratio,
            offset_y_ratio=payload.offset_y_ratio,
            viewport_x=payload.viewport_x,
            viewport_y=payload.viewport_y,
            page_x=payload.page_x,
            page_y=payload.page_y,
            viewport_width=payload.viewport_width,
            viewport_height=payload.viewport_height,
            element_rect_json=payload.element_rect_json,
            scroll_x=payload.scroll_x,
            scroll_y=payload.scroll_y,
            canvas_id=payload.canvas_id,
            canvas_x_ratio=payload.canvas_x_ratio,
            canvas_y_ratio=payload.canvas_y_ratio,
            webgl_clip_x=payload.webgl_clip_x,
            webgl_clip_y=payload.webgl_clip_y,
            renderer_type=payload.renderer_type.value if payload.renderer_type else None,
            title=payload.title,
            description=payload.description,
            status=payload.status.value if payload.status else MarkerStatus.OPEN.value,
            priority=payload.priority.value if payload.priority else MarkerPriority.MEDIUM.value,
            browser=payload.browser,
            os=payload.os,
            device_pixel_ratio=payload.device_pixel_ratio,
            console_errors_json=payload.console_errors_json,
            network_errors_json=payload.network_errors_json,
            screenshot_url=payload.screenshot_url,
            encrypted_context=payload.encrypted_context,
            version=1
        )
        return marker

    @staticmethod
    def apply_marker_update(marker: Marker, update_payload: MarkerUpdate, actor_role: Optional[str], actor_id: Optional[str]) -> Marker:
        # Verify permissions
        MarkerService.check_mutation_permission(actor_role, actor_id, marker)

        # Optimistic lock check
        if update_payload.expected_version is not None and marker.version != update_payload.expected_version:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Conflict: Marker version mismatch. Expected {update_payload.expected_version}, but server has {marker.version}"
            )

        # Apply content changes
        if update_payload.title is not None:
            marker.title = update_payload.title
        if update_payload.description is not None:
            marker.description = update_payload.description
        if update_payload.status is not None:
            marker.status = update_payload.status.value
        if update_payload.priority is not None:
            marker.priority = update_payload.priority.value
        if update_payload.color_token is not None:
            marker.color_token = update_payload.color_token
        if update_payload.screenshot_url is not None:
            marker.screenshot_url = update_payload.screenshot_url
        if update_payload.browser is not None:
            marker.browser = update_payload.browser
        if update_payload.os is not None:
            marker.os = update_payload.os
        if update_payload.device_pixel_ratio is not None:
            marker.device_pixel_ratio = update_payload.device_pixel_ratio
        if update_payload.console_errors_json is not None:
            marker.console_errors_json = update_payload.console_errors_json
        if update_payload.network_errors_json is not None:
            marker.network_errors_json = update_payload.network_errors_json
        if update_payload.anchor_mode is not None:
            marker.anchor_mode = update_payload.anchor_mode

        # Increment version on mutation
        marker.version += 1
        return marker

    @staticmethod
    def apply_position_patch(marker: Marker, position_payload: MarkerPositionPatch, actor_role: Optional[str], actor_id: Optional[str]) -> Marker:
        # Verify permissions (follows same rules as update)
        MarkerService.check_mutation_permission(actor_role, actor_id, marker)

        # Optimistic lock check
        if position_payload.expected_version is not None and marker.version != position_payload.expected_version:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Conflict: Marker version mismatch. Expected {position_payload.expected_version}, but server has {marker.version}"
            )

        # Validate coordinate invariants
        MarkerService.validate_position_patch_invariants(marker, position_payload)

        # Apply position fields
        if position_payload.anchor_mode is not None:
            marker.anchor_mode = position_payload.anchor_mode
        if position_payload.offset_x_ratio is not None:
            marker.offset_x_ratio = position_payload.offset_x_ratio
        if position_payload.offset_y_ratio is not None:
            marker.offset_y_ratio = position_payload.offset_y_ratio
        if position_payload.target_selector is not None:
            marker.target_selector = position_payload.target_selector
        if position_payload.target_xpath is not None:
            marker.target_xpath = position_payload.target_xpath
        if position_payload.dom_text_excerpt is not None:
            marker.dom_text_excerpt = position_payload.dom_text_excerpt

        if position_payload.viewport_x is not None:
            marker.viewport_x = position_payload.viewport_x
        if position_payload.viewport_y is not None:
            marker.viewport_y = position_payload.viewport_y
        if position_payload.page_x is not None:
            marker.page_x = position_payload.page_x
        if position_payload.page_y is not None:
            marker.page_y = position_payload.page_y
        if position_payload.viewport_width is not None:
            marker.viewport_width = position_payload.viewport_width
        if position_payload.viewport_height is not None:
            marker.viewport_height = position_payload.viewport_height
        if position_payload.scroll_x is not None:
            marker.scroll_x = position_payload.scroll_x
        if position_payload.scroll_y is not None:
            marker.scroll_y = position_payload.scroll_y

        if position_payload.canvas_x_ratio is not None:
            marker.canvas_x_ratio = position_payload.canvas_x_ratio
        if position_payload.canvas_y_ratio is not None:
            marker.canvas_y_ratio = position_payload.canvas_y_ratio
        if position_payload.webgl_clip_x is not None:
            marker.webgl_clip_x = position_payload.webgl_clip_x
        if position_payload.webgl_clip_y is not None:
            marker.webgl_clip_y = position_payload.webgl_clip_y

        # Increment version on mutation
        marker.version += 1
        return marker
