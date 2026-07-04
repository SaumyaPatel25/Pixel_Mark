# 10 Canvas Marker Coordinate Model

This document explains how PixelMark captures and places visual markers across disparate browser windows and iframe contexts.

## How Markers are Captured
- The proxy server injects a script (`pixelmark-agent.js`) into the target website.
- When a reviewer clicks on the injected overlay, the agent records the `clientX`/`clientY` or `pageX`/`pageY` coordinates of the click event relative to the current viewport and document.

## The Coordinate System Challenge
- **Responsive Fluidity:** Web pages are inherently fluid. A pin dropped at `x: 500, y: 300` on a 1920x1080 screen will not physically point to the same DOM element when viewed on a 1280x720 screen or when the developer's dashboard Canvas renders the iframe at a scaled-down 80%.
- **Current Model:** The `Marker` model stores absolute `x`, `y` floats alongside `viewport_width` and `viewport_height`.
- **Transformation Logic:** `pixelmark-agent.js` contains coordinate normalization functions (as seen in recent console logs: `[Markers] normalizeMarkerCoordinates final output: {displayX: 507, displayY: 236...}`). It attempts to scale the coordinates based on the ratio of the original viewport to the viewing viewport.

## Why Pins Drift and Fail
1. **Window Resize Events:** When the canvas iframe resizes, the relative percentages change, causing pins to "float" off their intended targets.
2. **Missing DOM Anchoring:** The current system relies almost entirely on math (viewport ratios). A robust annotation system must anchor pins to specific DOM elements (e.g., storing the CSS selector `div#header > h1:nth-child(2)`) and calculating coordinates relative to that specific bounding box, rather than the raw viewport.
3. **Scroll Offsets:** Calculating `pageX` vs `clientX` during active scrolling often leads to pins being saved with incorrect initial base coordinates if the iframe scroll event is not properly intercepted.

## Recommended Canonical Model
To fix the coordinate drift:
1. **DOM Selectors:** Capture the exact CSS selector path of the clicked element.
2. **Relative Offsets:** Calculate `x` and `y` as percentages *inside* the bounding box of the target DOM element, not the absolute viewport.
3. **Fallback Math:** If the DOM element is missing or dynamically altered on refresh, *then* fallback to viewport ratio math.

---
- **Confidence Level:** High
- **Evidence Source:** Previous user error logs referencing `normalizeMarkerCoordinates`, `pixelmark-agent.js`, and `Marker` model fields.
- **Next File to Read:** `11-feature-status-matrix.md`
