# PixelMark — Enhanced Core Rebuild
# Phase-by-Phase IDE Prompts
# Multi-page DOM + Three.js / WebGL support + production hardening

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ARCHITECTURE OVERVIEW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PixelMark enhanced core has three layers:

LAYER 1 — Proxy Engine (backend)
  - Fetches target URLs via HTTPX
  - Rewrites all internal links to stay within the proxy
  - Injects the PixelMark audit agent script into every page
  - Tracks multi-page navigation within a session

LAYER 2 — Audit Agent (injected JavaScript)
  - Runs inside the proxied page in the client browser
  - Captures DOM markers (click, xpath, css, innerText)
  - Captures Three.js / WebGL markers (raycasting, scene object names, camera state)
  - Detects renderer type: DOM | Canvas2D | WebGL | Three.js
  - Communicates back to PixelMark via postMessage

LAYER 3 — Command Center (frontend)
  - Receives marker events via WebSocket
  - Stores full context per marker per page per session
  - Shows markers grouped by page URL
  - Exports per-page or whole-session

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 0 — Enhanced Data Schema
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PROMPT 0A — Database schema upgrade
-----------------------------------------
Paste into Cursor / Claude Dev / Windsurf

You are a senior backend engineer.

Project: PixelMark — visual feedback SaaS.
Stack: FastAPI, SQLAlchemy 2.0 async, asyncpg, NeonDB (Postgres).

Task:
Upgrade the existing Marker model and schema to support:
1. Multi-page sessions (each marker tracks which page URL it was on)
2. Renderer type detection (DOM, Canvas2D, WebGL, Three.js)
3. Three.js / WebGL specific context fields
4. Screenshot blob URL per marker

Changes to the Marker model:

ADD these columns:
  - page_url: String (the exact URL of the page where the marker was placed)
  - page_title: String (document.title at time of capture)
  - renderer_type: String (one of: "dom", "canvas2d", "webgl", "threejs", "unknown")
  - canvas_context: JSON (for non-DOM renderers, stores):
      {
        "type": "threejs" | "webgl" | "canvas2d",
        "object_name": str,          // THREE.Object3D.name if available
        "object_uuid": str,          // THREE.Object3D.uuid
        "object_type": str,          // Mesh | Group | Sprite | etc
        "ray_origin": [x, y, z],     // raycaster origin
        "ray_direction": [x, y, z],  // raycaster direction
        "intersection_point": [x, y, z],
        "camera_position": [x, y, z],
        "camera_rotation": [x, y, z],
        "canvas_coords": {"x": px, "y": py},
        "gl_program_count": int,     // WebGL programs active
        "fragment_shader_hint": str, // first 100 chars of fragment shader if accessible
      }
  - screenshot_url: String (URL to screenshot blob stored on object storage or base64 dataURL)
  - marker_number: Integer (sequential number within the session, auto-incremented)
  - agent_version: String (version of the injected agent that captured this, default "1.0")

KEEP all existing columns:
  xpath, css_selector, inner_text, viewport, browser, os,
  scroll_position, console_errors, network_errors, priority, status,
  ai_summary, created_at, session_id, title, description, url

Note: existing "url" column is the target site URL, keep it.
New "page_url" is the exact page within a multi-page session.

Also:
- Create a new PageVisit model:
    id: UUID
    session_id: FK → sessions.id
    page_url: String
    page_title: String
    visited_at: DateTime
    renderer_type: String
    screenshot_url: String (page-level screenshot)

  This tracks every page the client navigated to in the session.

- Add session.current_page_url: String (last active page)
- Add session.pages_visited: Integer (count, default 0)

Rules:
- Keep all changes backward-compatible
- Add Alembic migration or auto-create via lifespan
- Update all Pydantic schemas (MarkerCreate, MarkerRead, PageVisitCreate, PageVisitRead)
- Ensure JSON columns use postgresql JSONB type on Postgres and JSON on SQLite

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 1 — Enhanced Proxy Engine (Backend)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PROMPT 1A — Multi-page proxy engine
-----------------------------------------

You are a senior backend engineer building a production proxy engine.

Project: PixelMark — visual feedback SaaS.
Stack: FastAPI, HTTPX (async), BeautifulSoup4.

Current problem:
- Only single-page is audited
- Proxy does not rewrite internal links
- Proxy does not track page navigation within a session
- PixelMark agent script is not injected into every page

Task:
Build/rebuild backend/routers/proxy.py completely.

ROUTES TO IMPLEMENT:

1) GET /proxy/session/{session_id}
   - Load the session from DB, get its project, get the project environment base_url
   - Fetch that URL via HTTPX
   - Run the HTML through the rewriter (see below)
   - Return as HTML response
   - Record a PageVisit entry for this page

2) GET /proxy/session/{session_id}/page
   Query param: url (encoded target URL)
   - This handles navigation within the session (when client clicks an internal link)
   - Fetch the requested URL via HTTPX
   - Run through rewriter
   - Return as HTML
   - Record a PageVisit for this new page
   - Update session.current_page_url

3) GET /proxy/session/{session_id}/asset
   Query param: url (encoded asset URL)
   - Proxy CSS, JS, image, font assets
   - Stream response with correct Content-Type
   - Do NOT inject script into assets

HTML REWRITER (a function: rewrite_html(html, session_id, page_url, base_url) → str):

Use BeautifulSoup4 to:

A) Rewrite all internal links so they stay inside the proxy:
   - <a href="/path"> → <a href="/proxy/session/{id}/page?url={encoded_full_url}">
   - <a href="https://same-domain/path"> → same pattern
   - External links (different domain) → leave as-is (open in new tab)
   - <form action="/path"> → rewrite action similarly

B) Rewrite all asset URLs:
   - <link href="/style.css"> → /proxy/session/{id}/asset?url={encoded}
   - <script src="/app.js"> → /proxy/session/{id}/asset?url={encoded}
   - <img src="/img.png"> → /proxy/session/{id}/asset?url={encoded}
   - <source srcset="..."> → rewrite each URL in srcset

C) Remove all CSP/X-Frame-Options meta tags:
   - Remove: <meta http-equiv="Content-Security-Policy" ...>
   - Remove: <meta http-equiv="X-Frame-Options" ...>

D) Inject the PixelMark Audit Agent script as the LAST tag before </body>:
   <script>
   window.__PIXELMARK__ = {
     sessionId: "{session_id}",
     pageUrl: "{page_url}",
     apiBase: "{api_base}",
     agentVersion: "2.0"
   };
   </script>
   <script src="/static/pixelmark-agent.js"></script>

E) Inject a top status bar into the proxied page (before <body> content):
   A small fixed-top bar (40px height) with:
   - "PixelMark Audit Active" label
   - Current page URL (truncated)
   - "Exit Audit" button (calls window.parent.postMessage({type:"EXIT_AUDIT"}, "*"))
   Do this by injecting a <div> at the start of <body> using BeautifulSoup.

HTTPX client config:
- follow_redirects=True
- timeout=15
- headers: set User-Agent to a real Chrome UA
- Do NOT verify SSL for local/staging sites (verify=False for non-production)

Response headers to set on proxied pages:
- Remove: Content-Security-Policy, X-Frame-Options
- Add: X-PixelMark-Session: {session_id}
- Add: X-PixelMark-Page: {page_url}

Error handling:
- If target site is unreachable: return a styled 503 page explaining the site is offline
- If URL is blocked (SSRF protection): return 403 with explanation
- Block private IPs: 127.0.0.1, 10.x, 172.16.x, 192.168.x, localhost

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 2 — Enhanced Audit Agent (Injected JS)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PROMPT 2A — Core DOM audit agent
-----------------------------------------

You are a senior JavaScript engineer.

Project: PixelMark — visual feedback SaaS.
Context: This script is injected into every proxied page.

Task:
Create backend/static/pixelmark-agent.js

This script:
1. Detects the renderer type of the current page
2. Registers Ctrl+Click to create markers on DOM elements
3. Captures full DOM context per click
4. Captures page-level context (console errors, network errors)
5. Sends all data to parent window via postMessage
6. Handles multi-page navigation by notifying parent on unload

RENDERER DETECTION (run once on load):

function detectRenderer() {
  const canvases = document.querySelectorAll("canvas");
  if (canvases.length === 0) return "dom";

  for (const canvas of canvases) {
    // Three.js detection
    if (canvas.__three || window.THREE || canvas._threeRenderer) return "threejs";

    // Check for THREE in global scope
    if (typeof THREE !== "undefined") return "threejs";

    // WebGL detection
    const gl = canvas.getContext("webgl") || canvas.getContext("webgl2");
    if (gl) return "webgl";

    // Canvas2D
    const ctx = canvas.getContext("2d");
    if (ctx) return "canvas2d";
  }
  return "dom";
}

Store result in window.__PIXELMARK__.rendererType

CONSOLE ERROR CAPTURE (start immediately):

Patch window.console.error and window.onerror:
- Keep a circular buffer of last 20 console.error / onerror messages
- Each entry: { message: str, timestamp: ISO string, stack: str }
Store in window.__PIXELMARK__.consoleErrors = []

NETWORK ERROR CAPTURE:

Patch window.XMLHttpRequest and window.fetch:
- Intercept every response
- If status >= 400: push to window.__PIXELMARK__.networkErrors
  Entry: { url: str, status: int, method: str, timestamp: ISO }
- Keep last 20 entries

DOM CONTEXT CAPTURE (on Ctrl+Click for DOM renderer):

function getDOMContext(element) {
  return {
    xpath: getXPath(element),         // robust xpath builder
    css_selector: getCSSSelector(element),
    inner_text: element.innerText?.trim().substring(0, 200),
    tag_name: element.tagName,
    element_id: element.id,
    class_list: Array.from(element.classList).slice(0, 10),
    bounding_rect: element.getBoundingClientRect(),
    is_visible: isElementVisible(element),
    computed_role: element.getAttribute("role") || null,
    aria_label: element.getAttribute("aria-label") || null,
  };
}

getXPath(element): build a robust unique XPath that:
- Prefers id: //*[@id="submit-btn"]
- Falls back to positional: /html/body/div[2]/section[1]/button[3]
- Never exceeds 200 characters

getCSSSelector(element): build a unique CSS selector that:
- Uses ID if available: #submit-btn
- Falls back to class combo: .checkout-form .submit-btn
- Falls back to nth-child: body > div:nth-child(2) > button:nth-child(3)

VIEWPORT AND DEVICE CONTEXT:

function getViewportContext() {
  return {
    viewport: { width: window.innerWidth, height: window.innerHeight },
    device_pixel_ratio: window.devicePixelRatio,
    scroll_position: { x: window.scrollX, y: window.scrollY },
    user_agent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    color_scheme: window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light",
    touch_support: navigator.maxTouchPoints > 0,
  };
}

SCREENSHOT CAPTURE:

Use html2canvas (loaded dynamically if not present) to capture:
- A 400x300 crop around the clicked element
- Convert to base64 PNG
- Include in the marker payload as screenshot_data_url
If html2canvas fails or canvas is blocked: skip screenshot, set null.

CTRL+CLICK HANDLER (DOM renderer):

document.addEventListener("click", async (e) => {
  if (!e.ctrlKey) return;   // Only fire on Ctrl+Click
  e.preventDefault();
  e.stopPropagation();

  const element = e.target;
  const domCtx = getDOMContext(element);
  const viewCtx = getViewportContext();
  const screenshot = await captureScreenshot(element);

  const payload = {
    type: "PIXELMARK_CREATE_MARKER",
    sessionId: window.__PIXELMARK__.sessionId,
    pageUrl: window.location.href,
    pageTitle: document.title,
    rendererType: window.__PIXELMARK__.rendererType,
    clickCoords: { x: e.clientX, y: e.clientY },
    ...domCtx,
    ...viewCtx,
    console_errors: window.__PIXELMARK__.consoleErrors.slice(-5),
    network_errors: window.__PIXELMARK__.networkErrors.slice(-5),
    screenshot_data_url: screenshot,
    timestamp: new Date().toISOString(),
  };

  window.parent.postMessage(payload, "*");
  showMarkerConfirmation(e.clientX, e.clientY);
});

MARKER CONFIRMATION (brief visual pulse):

function showMarkerConfirmation(x, y) {
  const dot = document.createElement("div");
  dot.style = `
    position: fixed; z-index: 999999;
    left: ${x - 12}px; top: ${y - 12}px;
    width: 24px; height: 24px;
    border-radius: 50%;
    background: rgba(124, 58, 237, 0.85);
    border: 2px solid white;
    animation: pm-pulse 0.6s ease-out forwards;
    pointer-events: none;
  `;
  document.body.appendChild(dot);
  setTimeout(() => dot.remove(), 700);
}
Add CSS keyframe pm-pulse (scale + fade out) via injected <style>.

PAGE NAVIGATION NOTIFICATION:

window.addEventListener("beforeunload", () => {
  window.parent.postMessage({
    type: "PIXELMARK_PAGE_UNLOAD",
    fromUrl: window.location.href,
  }, "*");
});

Also fire PIXELMARK_PAGE_LOAD on DOMContentLoaded:
window.parent.postMessage({
  type: "PIXELMARK_PAGE_LOAD",
  url: window.location.href,
  title: document.title,
  rendererType: window.__PIXELMARK__.rendererType,
}, "*");

Rules:
- IIFE wrapped (no global pollution except window.__PIXELMARK__)
- Works without any npm dependencies
- Dynamically load html2canvas only if needed
- Must not break if parent is same origin OR cross-origin

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 3 — Three.js / WebGL Audit Agent Extension
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PROMPT 3A — Three.js and WebGL marker capture
-----------------------------------------

You are a senior JavaScript/WebGL engineer.

Project: PixelMark — visual feedback SaaS.
Context: Extension of pixelmark-agent.js for Three.js and WebGL pages.

Task:
Add Three.js and WebGL marker capture to pixelmark-agent.js.
This code runs when rendererType is "threejs" or "webgl".

THREE.JS MARKER CAPTURE:

When renderer is "threejs":

1) Find the Three.js renderer and scene:
   - Check: window.THREE, canvas.__three, window.__threeRenderer
   - Walk all global variables to find THREE.WebGLRenderer instances
   - Store reference: window.__PIXELMARK__.threeRenderer, window.__PIXELMARK__.threeScene, window.__PIXELMARK__.threeCamera

2) On Ctrl+Click on a canvas element:
   - Get canvas bounding rect
   - Convert click coordinates to NDC (Normalized Device Coordinates):
       x_ndc = (clientX - rect.left) / rect.width * 2 - 1
       y_ndc = -(clientY - rect.top) / rect.height * 2 + 1
   - Create THREE.Vector2(x_ndc, y_ndc)
   - Create THREE.Raycaster
   - raycaster.setFromCamera(ndc, camera)
   - raycaster.intersectObjects(scene.children, recursive=true)
   - Get first intersection (if any)

3) Build Three.js context object:
   function getThreeJSContext(e, canvas) {
     const renderer = window.__PIXELMARK__.threeRenderer;
     const scene = window.__PIXELMARK__.threeScene;
     const camera = window.__PIXELMARK__.threeCamera;

     if (!renderer || !scene || !camera) return null;

     const rect = canvas.getBoundingClientRect();
     const ndc = new THREE.Vector2(
       (e.clientX - rect.left) / rect.width * 2 - 1,
       -((e.clientY - rect.top) / rect.height) * 2 + 1
     );

     const raycaster = new THREE.Raycaster();
     raycaster.setFromCamera(ndc, camera);
     const hits = raycaster.intersectObjects(scene.children, true);
     const hit = hits[0] || null;

     return {
       type: "threejs",
       object_name: hit?.object?.name || null,
       object_uuid: hit?.object?.uuid || null,
       object_type: hit?.object?.type || null,
       material_name: hit?.object?.material?.name || null,
       geometry_type: hit?.object?.geometry?.type || null,
       intersection_point: hit ? [hit.point.x, hit.point.y, hit.point.z] : null,
       distance: hit?.distance || null,
       face_index: hit?.faceIndex || null,
       ray_origin: [raycaster.ray.origin.x, raycaster.ray.origin.y, raycaster.ray.origin.z],
       ray_direction: [raycaster.ray.direction.x, raycaster.ray.direction.y, raycaster.ray.direction.z],
       camera_position: [camera.position.x, camera.position.y, camera.position.z],
       camera_rotation: [camera.rotation.x, camera.rotation.y, camera.rotation.z],
       camera_fov: camera.fov || null,
       scene_children_count: scene.children.length,
       renderer_size: { width: renderer.domElement.width, height: renderer.domElement.height },
       canvas_coords: { x: e.clientX - rect.left, y: e.clientY - rect.top },
       hit_found: hit !== null,
     };
   }

4) Take a canvas screenshot:
   - renderer.domElement.toDataURL("image/png")
   - Crop a 400x300 area around click point

WEBGL MARKER CAPTURE (fallback when no THREE found):

function getWebGLContext(e, canvas) {
  const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
  if (!gl) return null;

  return {
    type: "webgl",
    canvas_coords: { x: e.clientX, y: e.clientY },
    canvas_size: { width: canvas.width, height: canvas.height },
    gl_version: gl.getParameter(gl.VERSION),
    gl_vendor: gl.getParameter(gl.VENDOR),
    gl_renderer: gl.getParameter(gl.RENDERER),
    gl_program_count: null, // hard to get without instrumentation
    max_texture_size: gl.getParameter(gl.MAX_TEXTURE_SIZE),
    active_texture_units: gl.getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS),
  };
}

UNIFIED CTRL+CLICK for canvas/WebGL/Three.js:

Add a separate listener on canvas elements:

document.querySelectorAll("canvas").forEach(canvas => {
  canvas.addEventListener("click", async (e) => {
    if (!e.ctrlKey) return;
    e.preventDefault();

    const rendererType = window.__PIXELMARK__.rendererType;
    let canvasCtx = null;

    if (rendererType === "threejs") {
      canvasCtx = getThreeJSContext(e, canvas);
    } else if (rendererType === "webgl") {
      canvasCtx = getWebGLContext(e, canvas);
    } else if (rendererType === "canvas2d") {
      canvasCtx = { type: "canvas2d", canvas_coords: { x: e.clientX, y: e.clientY } };
    }

    const viewCtx = getViewportContext();
    const screenshot = canvas.toDataURL("image/png");

    const payload = {
      type: "PIXELMARK_CREATE_MARKER",
      sessionId: window.__PIXELMARK__.sessionId,
      pageUrl: window.location.href,
      pageTitle: document.title,
      rendererType,
      canvas_context: canvasCtx,
      clickCoords: { x: e.clientX, y: e.clientY },
      ...viewCtx,
      console_errors: window.__PIXELMARK__.consoleErrors.slice(-5),
      network_errors: window.__PIXELMARK__.networkErrors.slice(-5),
      screenshot_data_url: screenshot,
      timestamp: new Date().toISOString(),
    };

    window.parent.postMessage(payload, "*");
    showMarkerConfirmation(e.clientX, e.clientY);
  });
});

SCENE DISCOVERY (try to find Three.js scene automatically):

Run once after DOMContentLoaded + a short delay (300ms):

function discoverThreeScene() {
  // 1. Check common global names
  const candidates = ["renderer", "webglRenderer", "threeRenderer", "app", "game", "scene"];
  for (const name of candidates) {
    const obj = window[name];
    if (obj && obj.isWebGLRenderer) {
      window.__PIXELMARK__.threeRenderer = obj;
    }
    if (obj && obj.isScene) {
      window.__PIXELMARK__.threeScene = obj;
    }
    if (obj && obj.isCamera) {
      window.__PIXELMARK__.threeCamera = obj;
    }
    // nested: obj.renderer, obj.scene, obj.camera
    if (obj && obj.renderer?.isWebGLRenderer) window.__PIXELMARK__.threeRenderer = obj.renderer;
    if (obj && obj.scene?.isScene) window.__PIXELMARK__.threeScene = obj.scene;
    if (obj && obj.camera?.isCamera) window.__PIXELMARK__.threeCamera = obj.camera;
  }
  // 2. Search all canvas elements for .__three property
  document.querySelectorAll("canvas").forEach(c => {
    if (c.__three?.renderer) window.__PIXELMARK__.threeRenderer = c.__three.renderer;
    if (c.__three?.scene) window.__PIXELMARK__.threeScene = c.__three.scene;
    if (c.__three?.camera) window.__PIXELMARK__.threeCamera = c.__three.camera;
  });
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 4 — Frontend Audit Surface (Multi-page)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PROMPT 4A — Audit surface component (multi-page iframe + postMessage handler)
-----------------------------------------

You are a senior React/TypeScript engineer.

Project: PixelMark — Next.js 14 App Router, Tailwind, Zustand.

Task:
Build/rebuild: web/src/components/audit/AuditSurface.tsx

Props:
  sessionId: string
  projectId: string
  onMarkerCreated?: (marker: PendingMarker) => void
  onPageChanged?: (url: string, title: string) => void

Internal state:
  currentUrl: string
  pageHistory: { url: string, title: string, rendererType: string }[]
  isLoading: boolean

Computed:
  proxyUrl = `${process.env.NEXT_PUBLIC_API_URL}/proxy/session/${sessionId}`

IFRAME setup:
  <iframe
    ref={iframeRef}
    src={proxyUrl}
    sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
    allow="clipboard-read; clipboard-write"
    className="w-full h-full border-0"
    onLoad={handleIframeLoad}
  />

postMessage handler (useEffect on mount):
  window.addEventListener("message", handleAgentMessage);
  return () => window.removeEventListener("message", handleAgentMessage);

handleAgentMessage(event):
  Parse event.data as JSON
  Switch on event.data.type:

  case "PIXELMARK_CREATE_MARKER":
    Build a PendingMarker object from all fields in the payload
    Call onMarkerCreated(pendingMarker)
    Then immediately POST to api.createMarker({
      session_id: sessionId,
      page_url: event.data.pageUrl,
      page_title: event.data.pageTitle,
      renderer_type: event.data.rendererType,
      canvas_context: event.data.canvas_context || null,
      xpath: event.data.xpath,
      css_selector: event.data.css_selector,
      inner_text: event.data.inner_text,
      viewport: event.data.viewport,
      browser: parseBrowser(event.data.user_agent),
      os: parseOS(event.data.user_agent),
      scroll_position: event.data.scroll_position,
      console_errors: event.data.console_errors,
      network_errors: event.data.network_errors,
      screenshot_url: null,  // handle screenshot upload separately
      url: event.data.pageUrl,
    })
    On success: show toast "Marker #N saved"
    On error: show toast "Failed to save marker"

  case "PIXELMARK_PAGE_LOAD":
    setCurrentUrl(event.data.url)
    setPageHistory(prev => [...prev, { url: event.data.url, title: event.data.title, rendererType: event.data.rendererType }])
    setIsLoading(false)
    onPageChanged?.(event.data.url, event.data.title)

  case "PIXELMARK_PAGE_UNLOAD":
    setIsLoading(true)

  case "EXIT_AUDIT":
    router.push("/dashboard")

PAGE BREADCRUMB BAR (rendered above iframe):
  A slim bar showing:
  - Current page URL (truncated, 60 chars max)
  - Renderer type badge: "DOM" | "Three.js" | "WebGL" | "Canvas2D"
  - Page count: "3 pages visited"
  - Navigation: Back button (posts NAVIGATE_BACK to iframe)
  Design: bg-[#0d0d14] border-b border-white/5 text-white/60 text-xs px-4 h-9

LOADING OVERLAY:
  When isLoading: show a centered spinner with "Loading page..."
  Positioned absolute over iframe
  bg-[#0a0a0f]/80 backdrop-blur

CTRL+CLICK HINT (bottom-left, subtle):
  "Hold Ctrl + Click to mark any element"
  Fade out after 5 seconds

SCREENSHOT UPLOAD (helper):
  After marker is created, if screenshot_data_url is present:
  - Convert base64 to Blob
  - POST to /markers/{marker_id}/screenshot as multipart form
  - Store returned URL in marker record

Helper functions:
  parseBrowser(ua: string): extract browser name from user agent string
  parseOS(ua: string): extract OS name from user agent string

Rules:
- "use client"
- iframe sandbox must include allow-scripts and allow-same-origin
- Handle cross-origin postMessage safely: validate event.data.type before processing
- TypeScript strict mode
- Export: AuditSurface

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 5 — Enhanced Command Center (Multi-page)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PROMPT 5A — Multi-page Command Center
-----------------------------------------

You are a senior React/TypeScript engineer.

Project: PixelMark — Next.js 14 App Router, Tailwind.

Task:
Upgrade web/src/app/(dashboard)/sessions/[id]/page.tsx and
web/src/components/command-center/ to support multi-page sessions.

KEY CHANGES:

1) Group markers by page_url in the UI
   - Add a "Pages" tab bar above the marker grid
   - "All Pages" tab: shows all markers across all pages
   - Individual page tabs: one per unique page_url in the session
     Format: show truncated page path (not full URL) + marker count badge
   - Active tab highlights in purple

2) Per-marker show renderer type badge
   - Next to priority/status chips, add a renderer chip:
     - "DOM" → gray badge
     - "Three.js" → teal badge
     - "WebGL" → orange badge
     - "Canvas2D" → blue badge

3) For Three.js / WebGL markers, show a special context panel in MarkerCard:
   - Section title: "3D Context" or "WebGL Context"
   - Fields:
     - Object: {object_name || "Unnamed object"} ({object_type})
     - Hit point: ({x}, {y}, {z}) (formatted to 2dp)
     - Camera position: ({x}, {y}, {z})
     - Distance to hit: {distance}
   - For WebGL (non-Three.js): show GL Renderer, GL Version
   - Collapsed by default, expand on click
   - Style: monospace font, dark green text on very dark bg, code-like appearance

4) Add a "Pages Visited" section to the session header stats:
   - New stat card: "Pages" with count of unique page_urls
   - New stat card: "Renderers" listing unique renderer types in the session

5) Page-level screenshot (if available):
   - In the per-page tab header, show a small thumbnail of the page screenshot
   - Clicking thumbnail opens it full-size in an overlay

6) Export changes:
   - Markdown export: group sections by page URL
   - CSV export: add page_url, page_title, renderer_type, canvas_context columns
   - JSON export: include all new fields

Rules:
- Maintain backward compat: if marker has no page_url, treat it as "Unknown Page"
- All new UI sections are collapsed/optional so the basic view is not cluttered
- TypeScript strict
- markerStore groupByPage() selector: Map<string, Marker[]>

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 6 — Backend Marker Routes Enhancement
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PROMPT 6A — Enhanced marker routes + screenshot upload
-----------------------------------------

You are a senior FastAPI engineer.

Project: PixelMark — FastAPI, SQLAlchemy 2.0, asyncpg, NeonDB.

Task:
Upgrade backend/routers/markers.py to support:

1) Enhanced marker creation (POST /markers/)
   - Accept all new fields: page_url, page_title, renderer_type, canvas_context, agent_version
   - Auto-increment marker_number within the session
     (SELECT MAX(marker_number) FROM markers WHERE session_id = X, then +1)
   - Broadcast WebSocket event: type="marker_created" with full marker data

2) Screenshot upload (POST /markers/{marker_id}/screenshot)
   - Accept multipart/form-data with file field "screenshot"
   - Validate: must be image/png or image/jpeg
   - If STORAGE_URL env var is set: upload to object storage (R2/S3)
   - Otherwise: save as base64 string in screenshot_url column (for free-tier)
   - Return updated marker with screenshot_url

3) Page-grouped listing (GET /markers/session/{session_id}/by-page)
   - Returns markers grouped by page_url:
     {
       "pages": [
         {
           "page_url": "https://...",
           "page_title": "...",
           "marker_count": 5,
           "markers": [...MarkerRead]
         }
       ]
     }

4) Stats endpoint (GET /sessions/{session_id}/stats)
   Returns:
   {
     total: int,
     by_priority: { critical: int, high: int, medium: int, low: int },
     by_status: { open: int, in_progress: int, resolved: int },
     by_renderer: { dom: int, threejs: int, webgl: int, canvas2d: int },
     pages_visited: int,
     unique_pages: int,
   }

5) Page visits (GET /sessions/{session_id}/pages)
   Returns all PageVisit records for the session sorted by visited_at

Rules:
- All new endpoints require Bearer token auth
- Broadcast all CUD operations to WebSocket session room
- Use async DB queries throughout
- Pydantic v2 schemas for all inputs/outputs

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 7 — Tests for Enhanced Core
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PROMPT 7A — Complete test suite for enhanced core
-----------------------------------------

You are a senior QA engineer.

Project: PixelMark — FastAPI backend + Next.js frontend.

Task:
Create tests/test_enhanced_core.py

Test all new Phase 0-6 features:

A) Proxy Engine tests
  - test_proxy_loads_target_site: GET /proxy/session/{id} returns 200 HTML
  - test_proxy_injects_agent_script: response HTML contains "pixelmark-agent.js"
  - test_proxy_rewrites_links: <a href="/about"> becomes proxy URL
  - test_proxy_rewrites_assets: <script src="/app.js"> becomes proxy asset URL
  - test_proxy_removes_csp: no Content-Security-Policy meta tag in response
  - test_proxy_records_page_visit: PageVisit record created after proxy request
  - test_proxy_blocks_ssrf: GET /proxy/session/{id}/page?url=http://127.0.0.1 returns 403
  - test_proxy_multi_page: navigate to second page, both pages in /sessions/{id}/pages

B) Enhanced marker tests
  - test_marker_with_page_url: create marker with page_url, verify stored
  - test_marker_with_renderer_type: create DOM, threejs, webgl markers
  - test_marker_with_canvas_context: create marker with full canvas_context JSON, verify round-trip
  - test_marker_number_increments: create 3 markers, verify marker_number is 1, 2, 3
  - test_markers_by_page: GET /markers/session/{id}/by-page groups correctly
  - test_session_stats: GET /sessions/{id}/stats returns all counts correctly
  - test_screenshot_upload: POST /markers/{id}/screenshot with PNG file → screenshot_url set

C) WebSocket enhanced events
  - test_ws_marker_created_broadcast: create marker via API, ws client receives full payload with page_url
  - test_ws_page_load_event: (simulate) page load event broadcast to ws room

D) Agent script tests (unit-level logic in Python via js2py or just HTTP tests)
  - test_agent_script_served: GET /static/pixelmark-agent.js returns 200 JS
  - test_agent_script_contains_ctrl_click: response text contains "ctrlKey"
  - test_agent_script_contains_threejs: response text contains "THREE"
  - test_agent_script_contains_postmessage: response text contains "postMessage"

Rules:
- Use httpx for all HTTP tests
- Create real session and project in setup
- Use unique test user per test class
- Pytest compatible, verbose output
