# Phase 2: Marker Coordinate Resilience

## The Problem
Previously, PixelMark placed markers using a combination of viewport percentages (`click.normalized_x/y`) and hardcoded viewport pixel offsets during the agent pin resolution phase (`getBoundingClientRect().left` - `clickVx`).

While this math was correct if the viewport size remained completely unchanged since the moment of capture, it broke immediately if the target iframe was resized or if the element shifted via layout reflows. The fallback mechanism for invisible/missing elements would subtract the live scroll offset from the old absolute pixel position, causing severe marker drift.

## The Solution: Canonical Anchor Model

We refactored the coordinate tracking into a **Canonical Anchor Model** which separates the structural DOM context from the positional viewport context. 

### 1. Relative Anchor Capture
In `pixelmark-agent.js` (`buildCapturePayload`), we explicitly calculate `offset_x_ratio` and `offset_y_ratio` relative to the bounding box of the target element exactly at the moment of click. 

These ratios are stored in `canonical_anchor`:
```json
{
  "page_x": 1200,
  "page_y": 800,
  "viewport_width": 1440,
  "viewport_height": 900,
  "scroll_x": 0,
  "scroll_y": 100,
  "css_selector": "button#submit",
  "offset_x_ratio": 0.5,
  "offset_y_ratio": 0.5,
  "element_rect": { "x": 1150, "y": 780, "width": 100, "height": 40 }
}
```

### 2. Resolution Strategy (`resolveAndSendPins`)
When restoring pins on the page, the agent uses the following resolution hierarchy:
1. **Primary Anchor (DOM + Ratio)**: Tries to find the element using `canonical_anchor.css_selector` or `canonical_anchor.xpath`. If found, computes the new exact position using: `new_rect.left + offset_x_ratio * new_rect.width`.
2. **Backward Compatibility**: If no `offset_x_ratio` exists (old pins), it calculates a temporary ratio using the old bounding box dimensions and old viewport click position.
3. **Absolute Fallback**: If the element is missing from the DOM (e.g., hidden tab, removed), it uses `canonical_anchor.page_x - window.scrollX`.
4. **Degraded State**: If the absolute fallback is used, the pin is marked `degraded: true`.

### 3. Visual Degraded Indicator
In `MarkerPinLayer.tsx`, if a marker is resolved in a degraded state, it visually changes:
- 75% opacity
- Orange dashed border

This informs the user that the marker is floating in an absolute position and is no longer attached to its original underlying element.
