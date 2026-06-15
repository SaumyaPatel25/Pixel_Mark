import re
import os

WEB_DIR = r"c:\Users\saumy\OneDrive\Desktop\Entrext\web"
BACKEND_DIR = r"c:\Users\saumy\OneDrive\Desktop\Entrext\backend"

# 1. Update pixelmark-agent.js
agent_js_path = os.path.join(BACKEND_DIR, "static", "pixelmark-agent.js")
with open(agent_js_path, "r", encoding="utf-8") as f:
    content = f.read()

# Replace x and y with displayX, displayY, pageX, pageY in buildCapturePayload and handleFeedbackCapture
content = re.sub(
    r"x: pageX,\s*y: pageY,\s*viewport_x: clickX,\s*viewport_y: clickY,",
    r"displayX: clickX,\n        displayY: clickY,\n        pageX: pageX,\n        pageY: pageY,\n        viewport_x: clickX,\n        viewport_y: clickY,",
    content
)

# Fix drawer test fallback (x/y to displayX/displayY)
content = re.sub(
    r"x: Math\.round\(window\.innerWidth / 2 \+ window\.scrollX\),\s*y: Math\.round\(window\.innerHeight / 2 \+ window\.scrollY\),",
    r"displayX: Math.round(window.innerWidth / 2),\n            displayY: Math.round(window.innerHeight / 2),\n            pageX: Math.round(window.innerWidth / 2 + window.scrollX),\n            pageY: Math.round(window.innerHeight / 2 + window.scrollY),",
    content
)

with open(agent_js_path, "w", encoding="utf-8") as f:
    f.write(content)

# 2. Update normalizeCapturePayload.ts
normalize_ts_path = os.path.join(WEB_DIR, "src", "utils", "normalizeCapturePayload.ts")
with open(normalize_ts_path, "r", encoding="utf-8") as f:
    content = f.read()

content = re.sub(r"x\?: number\s*y\?: number", r"displayX?: number\n  displayY?: number\n  pageX?: number\n  pageY?: number", content)
content = re.sub(r"normX\?: number \| null\s*normY\?: number \| null", r"normX: number | null\n    normY: number | null\n    displayX: number | null\n    displayY: number | null", content)

content = re.sub(
    r"renderedPosition: raw\.renderedPosition \|\| raw\.renderedposition \|\| raw\.rendered_position \|\| null,",
    r"renderedPosition: raw.renderedPosition || raw.renderedposition || raw.rendered_position || null,\n    displayX: raw.displayX ?? raw.display_x ?? raw.click?.client_x ?? raw.click?.viewport_x ?? null,\n    displayY: raw.displayY ?? raw.display_y ?? raw.click?.client_y ?? raw.click?.viewport_y ?? null,\n    pageX: raw.pageX ?? raw.page_x ?? raw.coordinates?.pageX ?? raw.x ?? raw.click?.page_x ?? null,\n    pageY: raw.pageY ?? raw.page_y ?? raw.coordinates?.pageY ?? raw.y ?? raw.click?.page_y ?? null,",
    content
)

content = re.sub(
    r"normX: raw\.coordinates\?\.normX.*?,",
    r"normX: raw.coordinates?.normX ?? raw.normX ?? raw.normx ?? raw.norm_x ?? raw.click?.norm_x ?? raw.click?.normX ?? null,\n      displayX: raw.coordinates?.displayX ?? raw.displayX ?? raw.display_x ?? raw.click?.client_x ?? raw.click?.viewport_x ?? null,\n      displayY: raw.coordinates?.displayY ?? raw.displayY ?? raw.display_y ?? raw.click?.client_y ?? raw.click?.viewport_y ?? null,",
    content, count=1
)

new_normalizePinCoordinates = """export function normalizePinCoordinates(payload: any): { displayX: number; displayY: number; source: string } {
  console.log('[PixelMark Coordinates] Input payload:', payload);

  let displayX = 0;
  let displayY = 0;
  let source = 'fallback';

  const iframeRect = payload.iframeRect || null;
  const iframeLeft = iframeRect ? iframeRect.left : 0;
  const iframeTop = iframeRect ? iframeRect.top : 0;

  // Prefer coordinates object or top level display coords
  const clickVx = payload.coordinates?.displayX ?? payload.displayX ?? payload.coordinates?.viewportX ?? payload.viewportX ?? payload.click?.viewport_x ?? payload.click?.client_x ?? payload.click?.viewportX ?? null;
  const clickVy = payload.coordinates?.displayY ?? payload.displayY ?? payload.coordinates?.viewportY ?? payload.viewportY ?? payload.click?.viewport_y ?? payload.click?.client_y ?? payload.click?.viewportY ?? null;

  if (typeof clickVx === 'number' && typeof clickVy === 'number' && !isNaN(clickVx) && !isNaN(clickVy)) {
    // Already viewport coordinates
    // Translate from iframe viewport to parent viewport if from agent
    const isFromIframe = payload.createdVia === 'agent' || payload.createdVia === 'alt_click';
    if (isFromIframe) {
      displayX = clickVx + iframeLeft;
      displayY = clickVy + iframeTop;
      source = 'iframe_translated';
    } else {
      displayX = clickVx;
      displayY = clickVy;
      source = 'parent_viewport';
    }
  } else {
    // Fallback if missing
    const pageX = payload.pageX ?? payload.coordinates?.pageX ?? payload.x ?? 0;
    const pageY = payload.pageY ?? payload.coordinates?.pageY ?? payload.y ?? 0;
    const scrollX = payload.scrollPosition?.x ?? payload.viewport?.scrollX ?? 0;
    const scrollY = payload.scrollPosition?.y ?? payload.viewport?.scrollY ?? 0;
    
    displayX = pageX - scrollX + iframeLeft;
    displayY = pageY - scrollY + iframeTop;
    source = 'pagexy_fallback';
  }

  const result = { displayX: Math.round(displayX), displayY: Math.round(displayY), source };
  console.log('[PixelMark Coordinates] Output:', result);
  return result;
}"""

content = re.sub(
    r"export function normalizePinCoordinates\(payload: any\).*?return result;\n}",
    new_normalizePinCoordinates,
    content, flags=re.DOTALL
)

with open(normalize_ts_path, "w", encoding="utf-8") as f:
    f.write(content)

# 3. Update AuditSurface.tsx
audit_surface_path = os.path.join(WEB_DIR, "src", "components", "audit", "AuditSurface.tsx")
with open(audit_surface_path, "r", encoding="utf-8") as f:
    content = f.read()

# Fix context assignments
content = re.sub(
    r"x: Math\.round\(vx \+ scrollPos\.x\),\n\s*y: Math\.round\(vy \+ scrollPos\.y\),",
    r"displayX: Math.round(vx + iframeLeft),\n        displayY: Math.round(vy + iframeTop),\n        pageX: Math.round(vx + scrollPos.x),\n        pageY: Math.round(vy + scrollPos.y),",
    content
)
content = re.sub(
    r"x: capture\.coordinates\.pageX \|\| 0,\n\s*y: capture\.coordinates\.pageY \|\| 0,",
    r"x: capture.pageX || capture.coordinates.pageX || 0,\n          y: capture.pageY || capture.coordinates.pageY || 0,",
    content
)

content = re.sub(
    r"normalized\.x = stable\.x;\n\s*normalized\.y = stable\.y;",
    r"normalized.displayX = stable.displayX;\n          normalized.displayY = stable.displayY;",
    content
)
content = re.sub(
    r"created x=\$\{Math\.round\(stable\.x\)\} y=\$\{Math\.round\(stable\.y\)\}",
    r"created displayX=${Math.round(stable.displayX)} displayY=${Math.round(stable.displayY)}",
    content
)

with open(audit_surface_path, "w", encoding="utf-8") as f:
    f.write(content)


# 4. Update MarkerPinLayer.tsx
marker_pin_path = os.path.join(WEB_DIR, "src", "components", "audit", "MarkerPinLayer.tsx")
with open(marker_pin_path, "r", encoding="utf-8") as f:
    content = f.read()

content = re.sub(
    r"let parentX = capture\.x \|\| 0\n\s*let parentY = capture\.y \|\| 0",
    r"let parentX = capture.displayX || capture.x || 0\n        let parentY = capture.displayY || capture.y || 0",
    content
)

content = re.sub(
    r"if \(typeof capture\.x === 'number' && typeof capture\.y === 'number'\) \{\n\s*parentX = capture\.x - deltaX\n\s*parentY = capture\.y - deltaY",
    r"if (typeof capture.displayX === 'number' && typeof capture.displayY === 'number') {\n              parentX = capture.displayX\n              parentY = capture.displayY",
    content
)

with open(marker_pin_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Patch applied successfully.")
