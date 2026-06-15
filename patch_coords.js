const fs = require('fs');
const path = require('path');

const WEB_DIR = "c:\\Users\\saumy\\OneDrive\\Desktop\\Entrext\\web";
const BACKEND_DIR = "c:\\Users\\saumy\\OneDrive\\Desktop\\Entrext\\backend";

// 1. Update pixelmark-agent.js
const agentJsPath = path.join(BACKEND_DIR, "static", "pixelmark-agent.js");
let content = fs.readFileSync(agentJsPath, "utf-8");

content = content.replace(
    /x: pageX,\s*y: pageY,\s*viewport_x: clickX,\s*viewport_y: clickY,/g,
    "displayX: clickX,\n        displayY: clickY,\n        pageX: pageX,\n        pageY: pageY,\n        viewport_x: clickX,\n        viewport_y: clickY,"
);

content = content.replace(
    /x: Math\.round\(window\.innerWidth \/ 2 \+ window\.scrollX\),\s*y: Math\.round\(window\.innerHeight \/ 2 \+ window\.scrollY\),/g,
    "displayX: Math.round(window.innerWidth / 2),\n            displayY: Math.round(window.innerHeight / 2),\n            pageX: Math.round(window.innerWidth / 2 + window.scrollX),\n            pageY: Math.round(window.innerHeight / 2 + window.scrollY),"
);

fs.writeFileSync(agentJsPath, content, "utf-8");

// 2. Update normalizeCapturePayload.ts
const normalizeTsPath = path.join(WEB_DIR, "src", "utils", "normalizeCapturePayload.ts");
let contentTs = fs.readFileSync(normalizeTsPath, "utf-8");

contentTs = contentTs.replace(/x\?: number\s*y\?: number/, "displayX?: number\n  displayY?: number\n  pageX?: number\n  pageY?: number");
contentTs = contentTs.replace(/normX\?: number \| null\s*normY\?: number \| null/, "normX: number | null\n    normY: number | null\n    displayX: number | null\n    displayY: number | null");

contentTs = contentTs.replace(
    /renderedPosition: raw\.renderedPosition \|\| raw\.renderedposition \|\| raw\.rendered_position \|\| null,/,
    "renderedPosition: raw.renderedPosition || raw.renderedposition || raw.rendered_position || null,\n    displayX: raw.displayX ?? raw.display_x ?? raw.click?.client_x ?? raw.click?.viewport_x ?? null,\n    displayY: raw.displayY ?? raw.display_y ?? raw.click?.client_y ?? raw.click?.viewport_y ?? null,\n    pageX: raw.pageX ?? raw.page_x ?? raw.coordinates?.pageX ?? raw.x ?? raw.click?.page_x ?? null,\n    pageY: raw.pageY ?? raw.page_y ?? raw.coordinates?.pageY ?? raw.y ?? raw.click?.page_y ?? null,"
);

contentTs = contentTs.replace(
    /normX: raw\.coordinates\?\.normX(.*?)\,/,
    "normX: raw.coordinates?.normX ?? raw.normX ?? raw.normx ?? raw.norm_x ?? raw.click?.norm_x ?? raw.click?.normX ?? null,\n      displayX: raw.coordinates?.displayX ?? raw.displayX ?? raw.display_x ?? raw.click?.client_x ?? raw.click?.viewport_x ?? null,\n      displayY: raw.coordinates?.displayY ?? raw.displayY ?? raw.display_y ?? raw.click?.client_y ?? raw.click?.viewport_y ?? null,"
);

const newNormalizePinCoordinates = `export function normalizePinCoordinates(payload: any): { displayX: number; displayY: number; source: string } {
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
}`;

contentTs = contentTs.replace(
    /export function normalizePinCoordinates\(payload: any\)(.*?|\n)*?return result;\n\}/g,
    newNormalizePinCoordinates
);

fs.writeFileSync(normalizeTsPath, contentTs, "utf-8");

// 3. Update AuditSurface.tsx
const auditSurfacePath = path.join(WEB_DIR, "src", "components", "audit", "AuditSurface.tsx");
let contentAudit = fs.readFileSync(auditSurfacePath, "utf-8");

contentAudit = contentAudit.replace(
    /x: Math\.round\(vx \+ scrollPos\.x\),\n\s*y: Math\.round\(vy \+ scrollPos\.y\),/g,
    "displayX: Math.round(vx + iframeLeft),\n        displayY: Math.round(vy + iframeTop),\n        pageX: Math.round(vx + scrollPos.x),\n        pageY: Math.round(vy + scrollPos.y),"
);

contentAudit = contentAudit.replace(
    /x: capture\.coordinates\.pageX \|\| 0,\n\s*y: capture\.coordinates\.pageY \|\| 0,/g,
    "x: capture.pageX || capture.coordinates.pageX || 0,\n          y: capture.pageY || capture.coordinates.pageY || 0,"
);

contentAudit = contentAudit.replace(
    /normalized\.x = stable\.x;\n\s*normalized\.y = stable\.y;/g,
    "normalized.displayX = stable.displayX;\n          normalized.displayY = stable.displayY;"
);

contentAudit = contentAudit.replace(
    /created x=\$\{Math\.round\(stable\.x\)\} y=\$\{Math\.round\(stable\.y\)\}/g,
    "created displayX=${Math.round(stable.displayX)} displayY=${Math.round(stable.displayY)}"
);

fs.writeFileSync(auditSurfacePath, contentAudit, "utf-8");

// 4. Update MarkerPinLayer.tsx
const markerPinPath = path.join(WEB_DIR, "src", "components", "audit", "MarkerPinLayer.tsx");
let contentMarker = fs.readFileSync(markerPinPath, "utf-8");

contentMarker = contentMarker.replace(
    /let parentX = capture\.x \|\| 0\n\s*let parentY = capture\.y \|\| 0/g,
    "let parentX = capture.displayX || capture.x || 0\n        let parentY = capture.displayY || capture.y || 0"
);

contentMarker = contentMarker.replace(
    /if \(typeof capture\.x === 'number' && typeof capture\.y === 'number'\) \{\n\s*parentX = capture\.x - deltaX\n\s*parentY = capture\.y - deltaY/g,
    "if (typeof capture.displayX === 'number' && typeof capture.displayY === 'number') {\n              parentX = capture.displayX\n              parentY = capture.displayY"
);

fs.writeFileSync(markerPinPath, contentMarker, "utf-8");

console.log("Patch applied successfully.");
