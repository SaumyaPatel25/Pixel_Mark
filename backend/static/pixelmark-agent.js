(function() {
  if (window.__PIXELMARK_INSTALLED__) return;
  window.__PIXELMARK_INSTALLED__ = true;

  // ─── Namespace ───────────────────────────────────────────────────────────
  window.__PIXELMARK__ = window.__PIXELMARK__ || {};
  window.__PIXELMARK__.consoleErrors = [];
  window.__PIXELMARK__.networkErrors = [];
  window.__PIXELMARK__.rendererType = "dom";
  window.__PIXELMARK__.agentVersion = "2.1.0";

  let feedbackModeActive = false;

  // ─── Circular buffer ─────────────────────────────────────────────────────
  function pushCircular(arr, item) {
    arr.push(item);
    if (arr.length > 20) arr.shift();
  }

  // ─── Console error interception ──────────────────────────────────────────
  const originalConsoleError = console.error;
  console.error = function(...args) {
    const message = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
    pushCircular(window.__PIXELMARK__.consoleErrors, {
      message,
      timestamp: new Date().toISOString(),
      stack: new Error().stack || ""
    });
    originalConsoleError.apply(console, args);
  };

  window.addEventListener('error', function(e) {
    pushCircular(window.__PIXELMARK__.consoleErrors, {
      message: e.message || "Uncaught Error",
      timestamp: new Date().toISOString(),
      stack: e.error ? e.error.stack : ""
    });
  }, true);

  // ─── Network error interception ───────────────────────────────────────────
  const originalFetch = window.fetch;
  window.fetch = async function(...args) {
    try {
      const response = await originalFetch.apply(this, args);
      if (response && response.status >= 400) {
        pushCircular(window.__PIXELMARK__.networkErrors, {
          url: response.url,
          status: response.status,
          method: args[1]?.method || "GET",
          timestamp: new Date().toISOString()
        });
      }
      return response;
    } catch (err) {
      pushCircular(window.__PIXELMARK__.networkErrors, {
        url: typeof args[0] === 'string' ? args[0] : args[0]?.url || "unknown",
        status: 0,
        method: args[1]?.method || "GET",
        timestamp: new Date().toISOString()
      });
      throw err;
    }
  };

  const originalXHROpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, ...args) {
    this._method = method;
    return originalXHROpen.apply(this, [method, ...args]);
  };

  const originalXHRSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function(...args) {
    this.addEventListener('loadend', function() {
      if (this.status >= 400 || this.status === 0) {
        pushCircular(window.__PIXELMARK__.networkErrors, {
          url: this.responseURL,
          status: this.status,
          method: this._method || "unknown",
          timestamp: new Date().toISOString()
        });
      }
    });
    return originalXHRSend.apply(this, args);
  };

  // ─── Renderer detection ───────────────────────────────────────────────────
  function detectRenderer() {
    const canvases = document.querySelectorAll("canvas");
    if (canvases.length === 0) return "dom";

    for (const canvas of canvases) {
      if (canvas.__three || window.THREE || canvas._threeRenderer) return "threejs";
      if (typeof THREE !== "undefined") return "threejs";
      const gl = canvas.getContext("webgl") || canvas.getContext("webgl2");
      if (gl) return "webgl";
      const ctx = canvas.getContext("2d");
      if (ctx) return "canvas2d";
    }
    return "dom";
  }

  function discoverThreeScene() {
    const candidates = ["renderer", "webglRenderer", "threeRenderer", "app", "game", "scene"];
    for (const name of candidates) {
      const obj = window[name];
      if (!obj) continue;
      if (obj.isWebGLRenderer) window.__PIXELMARK__.threeRenderer = obj;
      if (obj.isScene) window.__PIXELMARK__.threeScene = obj;
      if (obj.isCamera) window.__PIXELMARK__.threeCamera = obj;
      if (obj.renderer?.isWebGLRenderer) window.__PIXELMARK__.threeRenderer = obj.renderer;
      if (obj.scene?.isScene) window.__PIXELMARK__.threeScene = obj.scene;
      if (obj.camera?.isCamera) window.__PIXELMARK__.threeCamera = obj.camera;
    }
    document.querySelectorAll("canvas").forEach(c => {
      if (c.__three?.renderer) window.__PIXELMARK__.threeRenderer = c.__three.renderer;
      if (c.__three?.scene) window.__PIXELMARK__.threeScene = c.__three.scene;
      if (c.__three?.camera) window.__PIXELMARK__.threeCamera = c.__three.camera;
    });
  }

  // ─── Issue type inference ─────────────────────────────────────────────────
  // Maps element context → structured issue category
  function detectIssueType(element, rendererType) {
    if (rendererType === "threejs" || rendererType === "webgl") return "canvas_webgl";
    if (!element || element.nodeType !== Node.ELEMENT_NODE) return "other";

    const tag = element.tagName.toLowerCase();
    const role = element.getAttribute("role") || "";
    const type = element.getAttribute("type") || "";

    // Navigation-related
    if (tag === "a" || tag === "nav" || role === "navigation" || role === "link") return "navigation";

    // Interaction-related
    if (["button", "input", "select", "textarea", "form"].includes(tag) ||
        ["button", "checkbox", "radio", "switch", "slider", "menuitem"].includes(role)) return "interaction";

    // Copy/text content
    if (["p", "span", "h1", "h2", "h3", "h4", "h5", "h6", "label", "li", "td", "th", "blockquote", "caption"].includes(tag) ||
        role === "heading") return "copy";

    // Rendering/visual
    if (["img", "video", "canvas", "svg", "picture", "figure"].includes(tag) ||
        role === "img") return "rendering";

    // Layout inference via class names
    try {
      const cls = Array.from(element.classList).join(" ").toLowerCase();
      if (/(layout|grid|flex|container|wrapper|section|row|col|margin|padding|spacing|gap|align|justify)/.test(cls)) {
        return "layout";
      }
    } catch (_) {}

    // Check parent chain briefly for layout context
    let parent = element.parentElement;
    for (let i = 0; i < 3 && parent; i++) {
      const pTag = parent.tagName.toLowerCase();
      if (["table", "aside", "header", "footer", "main", "section", "article"].includes(pTag)) {
        return "layout";
      }
      parent = parent.parentElement;
    }

    return "other";
  }

  // ─── Shadow DOM helpers ───────────────────────────────────────────────────
  function isInsideShadowDom(node) {
    if (!node) return false;
    try { return node.getRootNode() instanceof ShadowRoot; } catch (e) { return false; }
  }

  function getShadowHost(node) {
    if (!node) return null;
    try {
      const root = node.getRootNode();
      return root instanceof ShadowRoot ? root.host : null;
    } catch (e) { return null; }
  }

  function buildShadowPath(target) {
    if (!target) return "";
    try {
      const pathParts = [];
      let current = target;
      while (current) {
        let selector = current.tagName.toLowerCase();
        if (current.id) selector += `#${current.id}`;
        else if (current.className && typeof current.className === 'string') {
          const classes = Array.from(current.classList).join('.');
          if (classes) selector += `.${classes}`;
        }
        pathParts.unshift(selector);
        const host = getShadowHost(current);
        if (host) { pathParts.unshift("shadow-root"); current = host; }
        else break;
      }
      return pathParts.join(" >> ");
    } catch (e) { return ""; }
  }

  function captureShadowContext(target) {
    try {
      const inside = isInsideShadowDom(target);
      if (!inside) return { is_inside_shadow_dom: false, shadow_root_depth: 0, shadow_host_tag: null, shadow_host_id: null, shadow_host_class_list: null, shadow_path: null };
      let depth = 0, current = target, host = null;
      while (current) {
        const h = getShadowHost(current);
        if (h) { depth++; if (!host) host = h; current = h; }
        else { current = current.parentNode; }
      }
      return {
        is_inside_shadow_dom: true,
        shadow_root_depth: depth,
        shadow_host_tag: host ? host.tagName.toLowerCase() : null,
        shadow_host_id: host ? host.id || null : null,
        shadow_host_class_list: host ? Array.from(host.classList) : null,
        shadow_path: buildShadowPath(target)
      };
    } catch (e) {
      return { is_inside_shadow_dom: false, shadow_root_depth: 0, shadow_host_tag: null, shadow_host_id: null, shadow_host_class_list: null, shadow_path: null };
    }
  }

  // ─── XPath builder ────────────────────────────────────────────────────────
  function getXPath(element) {
    if (!element) return "";
    if (element.id) return `//*[@id="${element.id}"]`;
    if (element === document.body) return "/html/body";
    let ix = 0;
    const siblings = element.parentNode ? element.parentNode.childNodes : [];
    for (let i = 0; i < siblings.length; i++) {
      const sibling = siblings[i];
      if (sibling === element) return getXPath(element.parentNode) + '/' + element.tagName.toLowerCase() + '[' + (ix + 1) + ']';
      if (sibling.nodeType === 1 && sibling.tagName === element.tagName) ix++;
    }
    return "";
  }

  // ─── CSS selector builder ─────────────────────────────────────────────────
  function getCSSSelector(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) return "";
    const dataTestId = element.getAttribute("data-testid");
    if (dataTestId) return `[data-testid="${dataTestId}"]`;
    if (element.id && !element.id.match(/^\d/)) {
      try { if (document.querySelectorAll(`#${CSS.escape(element.id)}`).length === 1) return `#${element.id}`; } catch (_) {}
    }
    const ariaLabel = element.getAttribute("aria-label");
    if (ariaLabel) return `${element.tagName.toLowerCase()}[aria-label="${ariaLabel}"]`;

    const path = [];
    let current = element;
    while (current && current.nodeType === Node.ELEMENT_NODE) {
      let selector = current.nodeName.toLowerCase();
      if (current.id && !current.id.match(/^\d/)) {
        selector += `#${current.id}`;
        path.unshift(selector);
        break;
      }
      const testId = current.getAttribute("data-testid");
      if (testId) { selector += `[data-testid="${testId}"]`; path.unshift(selector); break; }
      const aLabel = current.getAttribute("aria-label");
      if (aLabel) {
        selector += `[aria-label="${aLabel}"]`;
      } else if (current.className && typeof current.className === 'string') {
        const classes = Array.from(current.classList)
          .filter(c => !c.startsWith("hover:") && !c.startsWith("focus:") && !c.startsWith("active:"))
          .join('.');
        if (classes) selector += '.' + classes;
      }
      if (current.parentNode) {
        const siblings = Array.from(current.parentNode.children);
        if (siblings.length > 1) selector += `:nth-child(${siblings.indexOf(current) + 1})`;
      }
      path.unshift(selector);
      current = current.parentNode;
    }
    return path.join(' > ');
  }

  function isElementVisible(element) {
    if (!element) return false;
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
  }

  // ─── DOM context builder ──────────────────────────────────────────────────
  function getDOMContext(element) {
    return {
      xpath: getXPath(element).substring(0, 200),
      css_selector: getCSSSelector(element).substring(0, 200),
      inner_text: element.innerText?.trim().substring(0, 200) || "",
      tag_name: element.tagName,
      element_id: element.id || null,
      class_list: Array.from(element.classList).slice(0, 10),
      is_visible: isElementVisible(element),
      computed_role: element.getAttribute("role") || null,
      aria_label: element.getAttribute("aria-label") || null,
      aria_role: element.getAttribute("role") || element.tagName.toLowerCase() || null,
      placeholder: element.getAttribute("placeholder") || null,
    };
  }

  // ─── Bounding box capture ─────────────────────────────────────────────────
  function getBoundingBox(element) {
    if (!element || !element.getBoundingClientRect) return null;
    try {
      const rect = element.getBoundingClientRect();
      return {
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        top: Math.round(rect.top),
        right: Math.round(rect.right),
        bottom: Math.round(rect.bottom),
        left: Math.round(rect.left),
      };
    } catch (e) { return null; }
  }

  // ─── Viewport context ─────────────────────────────────────────────────────
  function getViewportContext() {
    return {
      viewport: { width: window.innerWidth, height: window.innerHeight },
      device_pixel_ratio: window.devicePixelRatio,
      scroll_position: { x: window.scrollX, y: window.scrollY },
      color_scheme: window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light",
      touch_support: navigator.maxTouchPoints > 0,
    };
  }

  // ─── Browser info ─────────────────────────────────────────────────────────
  function getBrowserInfo() {
    const ua = navigator.userAgent;
    let name = "Unknown", version = "";
    if (/Firefox\/(\S+)/.test(ua)) { name = "Firefox"; version = ua.match(/Firefox\/(\S+)/)[1]; }
    else if (/Edg\/(\S+)/.test(ua)) { name = "Edge"; version = ua.match(/Edg\/(\S+)/)[1]; }
    else if (/Chrome\/(\S+)/.test(ua)) { name = "Chrome"; version = ua.match(/Chrome\/(\S+)/)[1]; }
    else if (/Safari\/(\S+)/.test(ua) && !/Chrome/.test(ua)) { name = "Safari"; version = ua.match(/Version\/(\S+)/)?.[1] || ""; }

    let os = "Unknown";
    if (/Windows/.test(ua)) os = "Windows";
    else if (/Macintosh|Mac OS/.test(ua)) os = "macOS";
    else if (/Linux/.test(ua)) os = "Linux";
    else if (/Android/.test(ua)) os = "Android";
    else if (/iPhone|iPad/.test(ua)) os = "iOS";

    return { name, version, os, platform: navigator.platform, user_agent: ua };
  }

  // ─── Screenshot capture ───────────────────────────────────────────────────
  async function loadHtml2Canvas() {
    if (window.html2canvas) return window.html2canvas;
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
      script.onload = () => resolve(window.html2canvas);
      script.onerror = () => resolve(null);
      document.head.appendChild(script);
    });
  }

  async function captureScreenshot(element) {
    try {
      const html2canvas = await loadHtml2Canvas();
      if (!html2canvas) return null;
      const canvas = await html2canvas(document.body, { logging: false, useCORS: true, allowTaint: true });
      const rect = element.getBoundingClientRect();
      const cropCanvas = document.createElement("canvas");
      cropCanvas.width = 480;
      cropCanvas.height = 320;
      const ctx = cropCanvas.getContext("2d");
      if (ctx) {
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        ctx.drawImage(canvas, Math.max(0, centerX - 240), Math.max(0, centerY - 160), 480, 320, 0, 0, 480, 320);
        return cropCanvas.toDataURL("image/png");
      }
      return canvas.toDataURL("image/png");
    } catch (err) { return null; }
  }

  // ─── WebGL/Three.js context ───────────────────────────────────────────────
  function getThreeJSContext(e, canvas) {
    const renderer = window.__PIXELMARK__.threeRenderer;
    const scene = window.__PIXELMARK__.threeScene;
    const camera = window.__PIXELMARK__.threeCamera;
    if (!renderer || !scene || !camera || typeof THREE === "undefined") {
      return { type: "threejs", canvas_coords: { x: e.clientX, y: e.clientY }, hit_found: false, detail: "Three.js not resolved globally" };
    }
    const rect = canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
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
      canvas_coords: { x: e.clientX - rect.left, y: e.clientY - rect.top },
      hit_found: hit !== null,
    };
  }

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
      max_texture_size: gl.getParameter(gl.MAX_TEXTURE_SIZE),
    };
  }

  // ─── Visual confirmation pulse ────────────────────────────────────────────
  function showClickConfirmation(x, y) {
    const dot = document.createElement("div");
    dot.style.cssText = `
      position: fixed; z-index: 2147483647;
      left: ${x - 16}px; top: ${y - 16}px;
      width: 32px; height: 32px;
      border-radius: 50%;
      background: rgba(124, 58, 237, 0.85);
      border: 2px solid white;
      pointer-events: none;
      animation: pm-burst 0.55s cubic-bezier(0, 0.9, 0.57, 1) forwards;
    `;
    const style = document.createElement("style");
    style.innerHTML = `@keyframes pm-burst { 0%{transform:scale(0.3);opacity:1} 100%{transform:scale(2.5);opacity:0} }`;
    document.body.appendChild(dot);
    document.body.appendChild(style);
    setTimeout(() => { dot.remove(); style.remove(); }, 600);
  }

  // ─── Feedback Mode HUD badge ──────────────────────────────────────────────
  let badgeEl = null;

  function updateFeedbackModeUI() {
    if (feedbackModeActive) {
      if (!badgeEl) {
        badgeEl = document.createElement("div");
        badgeEl.id = "pixelmark-hud-badge";
        badgeEl.style.cssText = `
          position: fixed !important;
          bottom: 16px !important;
          right: 16px !important;
          background: linear-gradient(135deg, #7c3aed, #5b21b6) !important;
          color: white !important;
          padding: 9px 18px !important;
          border-radius: 9999px !important;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, sans-serif !important;
          font-size: 11px !important;
          font-weight: 800 !important;
          text-transform: uppercase !important;
          letter-spacing: 0.07em !important;
          box-shadow: 0 4px 24px rgba(124, 58, 237, 0.5), 0 0 0 1px rgba(255,255,255,0.12) !important;
          z-index: 2147483647 !important;
          display: flex !important;
          align-items: center !important;
          gap: 9px !important;
          pointer-events: none !important;
          animation: pm-slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards !important;
        `;
        const rendererLabel = window.__PIXELMARK__.rendererType !== "dom"
          ? ` · ${window.__PIXELMARK__.rendererType.toUpperCase()}`
          : "";
        badgeEl.innerHTML = `
          <span style="display:inline-block;width:7px;height:7px;background:#a78bfa;border-radius:50%;animation:pm-ping 1s infinite alternate;"></span>
          Feedback Mode ON${rendererLabel} — Click to report
        `;
        const style = document.createElement("style");
        style.id = "pixelmark-hud-style";
        style.innerHTML = `
          @keyframes pm-slide-up { from{transform:translateY(24px);opacity:0} to{transform:translateY(0);opacity:1} }
          @keyframes pm-ping { from{transform:scale(1);opacity:1} to{transform:scale(1.5);opacity:0.4} }
        `;
        document.head.appendChild(style);
        document.body.appendChild(badgeEl);
      }
      document.body.style.cursor = "crosshair";
    } else {
      if (badgeEl) { badgeEl.remove(); badgeEl = null; }
      const style = document.getElementById("pixelmark-hud-style");
      if (style) style.remove();
      document.body.style.cursor = "";
    }
  }

  // ─── Main capture handler ─────────────────────────────────────────────────
  // NOTE: Ctrl is NOT checked here — only altKey and feedbackModeActive.
  async function handleFeedbackCapture(e) {
    // Determine trigger source
    const isAltClick = e.altKey && !feedbackModeActive;
    const isFeedbackModeClick = feedbackModeActive && !e.altKey;
    const isBoth = e.altKey && feedbackModeActive;

    if (!isAltClick && !isFeedbackModeClick && !isBoth) return;

    // Throttle rapid double-clicks
    const now = Date.now();
    if (window.__lastFeedbackTime && (now - window.__lastFeedbackTime < 600)) return;
    window.__lastFeedbackTime = now;

    e.preventDefault();
    e.stopPropagation();

    const target = e.composedPath()?.[0] || e.target;
    if (!target) return;

    const clickX = e.clientX;
    const clickY = e.clientY;
    const pageX = Math.round(clickX + window.scrollX);
    const pageY = Math.round(clickY + window.scrollY);

    const rendererType = window.__PIXELMARK__.rendererType;
    const isCanvas = target.tagName === "CANVAS";
    const domCtx = getDOMContext(target);
    const viewCtx = getViewportContext();
    const shadowCtx = captureShadowContext(target);
    const bbox = getBoundingBox(target);
    const browserInfo = getBrowserInfo();
    const issueTypeHint = detectIssueType(target, rendererType);

    let screenshotDataUrl = null;
    let canvasCtx = null;

    if (isCanvas) {
      if (rendererType === "threejs") canvasCtx = getThreeJSContext(e, target);
      else if (rendererType === "webgl") canvasCtx = getWebGLContext(e, target);
      else canvasCtx = { type: "canvas2d", canvas_coords: { x: clickX, y: clickY } };
      try { screenshotDataUrl = target.toDataURL("image/png"); } catch (_) {}
    } else {
      screenshotDataUrl = await captureScreenshot(target);
    }

    // Show visual confirmation at click point
    showClickConfirmation(clickX, clickY);

    // Resolve created_via
    const createdVia = isAltClick ? "alt_click" : "agent";

    // ── Send PIXELMARK_OPEN_FEEDBACK_DRAWER to parent (not direct save) ──
    // Parent opens the drawer pre-filled with this capture context.
    // The user can add a note, pick issue type, then submit.
    window.parent.postMessage({
      type: "PIXELMARK_OPEN_FEEDBACK_DRAWER",

      // Location
      session_id: window.__PIXELMARK__.sessionId,
      page_url: window.__PIXELMARK__.pageUrl || window.location.href,
      page_title: document.title,
      x: pageX,
      y: pageY,
      viewport_x: clickX,
      viewport_y: clickY,

      // Element context
      element_selector: domCtx.css_selector || "",
      element_text: domCtx.inner_text || "",
      element_tag: domCtx.tag_name || "",
      aria_label: domCtx.aria_label || null,
      aria_role: domCtx.aria_role || null,
      bounding_box: bbox,

      // Issue type hint (parent can pre-select in drawer)
      issue_type_hint: issueTypeHint,

      // DOM depth context
      xpath: domCtx.xpath || "",
      ...shadowCtx,

      // Viewport + scroll
      viewport: viewCtx.viewport,
      scroll_position: viewCtx.scroll_position,
      device_pixel_ratio: viewCtx.device_pixel_ratio,
      color_scheme: viewCtx.color_scheme,

      // Renderer
      renderer_type: shadowCtx.is_inside_shadow_dom ? "shadow_dom" : rendererType,
      canvas_context: canvasCtx,

      // Screenshot
      screenshot_data_url: screenshotDataUrl,
      screenshot_required: !!screenshotDataUrl,

      // Diagnostics
      console_errors: window.__PIXELMARK__.consoleErrors.slice(-10),
      network_errors: window.__PIXELMARK__.networkErrors.slice(-10),

      // Meta
      browser_info: browserInfo,
      created_via: createdVia,
      agent_version: window.__PIXELMARK__.agentVersion,
      timestamp: new Date().toISOString(),
    }, "*");
  }

  // ─── pointerdown: block default only for feedback interactions ────────────
  // NOTE: No ctrlKey checks anywhere.
  document.addEventListener("pointerdown", (e) => {
    if (e.altKey || feedbackModeActive) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);

  // ─── Page lifecycle messages to parent ────────────────────────────────────
  window.addEventListener("beforeunload", () => {
    window.parent.postMessage({
      type: "PIXELMARK_PAGE_UNLOAD",
      fromUrl: window.__PIXELMARK__.pageUrl || window.location.href,
    }, "*");
  });

  // ─── Receive messages from parent ────────────────────────────────────────
  window.addEventListener("message", (event) => {
    const data = event.data;
    if (!data || typeof data !== "object") return;

    if (data.type === "PIXELMARK_TOGGLE_MARKER_MODE") {
      feedbackModeActive = !!data.active;
      updateFeedbackModeUI();
    }

    // Parent can also set session/page context
    if (data.type === "PIXELMARK_SET_CONTEXT") {
      if (data.sessionId) window.__PIXELMARK__.sessionId = data.sessionId;
      if (data.pageUrl) window.__PIXELMARK__.pageUrl = data.pageUrl;
    }
  });

  // ─── DOMContentLoaded init ────────────────────────────────────────────────
  function setupNavigationInterceptor() {
    // 1. Intercept standard internal anchor clicks
    document.addEventListener("click", (e) => {
      if (feedbackModeActive) return;

      const anchor = e.composedPath().find(el => el && el.tagName === "A");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href) return;

      const hrefStripped = href.strip ? href.strip() : href.trim();
      if (!hrefStripped || hrefStripped.startsWith("javascript:") || hrefStripped.startsWith("mailto:") || hrefStripped.startsWith("tel:") || hrefStripped.startsWith("#")) {
        return;
      }

      // Resolve URL absolutely
      const resolvedUrl = new URL(hrefStripped, window.location.href).href;
      
      // Determine if it is internal to the proxied application
      const targetHost = new URL(resolvedUrl).host;
      const currentHost = window.location.host;
      const isInternal = targetHost === currentHost;

      if (isInternal) {
        window.parent.postMessage({
          type: "PIXELMARK_NAV",
          page_url: resolvedUrl,
          page_title: document.title || "",
          session_id: window.__PIXELMARK__.sessionId || "",
          referrer_url: window.location.href
        }, "*");
      }
    }, true);

    // 2. Intercept SPA pushState / replaceState
    const originalPushState = history.pushState;
    history.pushState = function(state, unused, url) {
      originalPushState.apply(this, arguments);
      handleSPAEvent();
    };

    const originalReplaceState = history.replaceState;
    history.replaceState = function(state, unused, url) {
      originalReplaceState.apply(this, arguments);
      handleSPAEvent();
    };

    window.addEventListener("popstate", handleSPAEvent);

    function handleSPAEvent() {
      window.parent.postMessage({
        type: "PIXELMARK_NAV",
        page_url: window.location.href,
        page_title: document.title || "",
        session_id: window.__PIXELMARK__.sessionId || "",
        referrer_url: window.__last_page_url || window.location.href,
        is_spa: true
      }, "*");
      window.__last_page_url = window.location.href;
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    window.__PIXELMARK__.rendererType = detectRenderer();
    discoverThreeScene();
    setupNavigationInterceptor();

    window.parent.postMessage({
      type: "PIXELMARK_PAGE_LOAD",
      url: window.__PIXELMARK__.pageUrl || window.location.href,
      title: document.title,
      rendererType: window.__PIXELMARK__.rendererType,
    }, "*");

    // Capture clicks — capture phase for maximum reliability across all sites
    document.addEventListener("click", handleFeedbackCapture, true);
  });

  // Retry Three.js discovery after dynamic load
  setTimeout(discoverThreeScene, 500);
  setTimeout(discoverThreeScene, 2000);

})();
