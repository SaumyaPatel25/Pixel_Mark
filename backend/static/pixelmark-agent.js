(function() {
  if (window.__PIXELMARK_INSTALLED__) return;
  window.__PIXELMARK_INSTALLED__ = true;

  const TARGETURL = window.__PIXELMARK_TARGET_URL__ || window.PIXELMARKTARGETURL || window.location.href;
  const TARGET_URL = TARGETURL;
  const SESSION_ID = window.__PIXELMARK_SESSION_ID__ || null;

  // ─── Namespace ───────────────────────────────────────────────────────────
  window.__PIXELMARK__ = window.__PIXELMARK__ || {};
  window.__PIXELMARK__.sessionId = SESSION_ID;
  window.__PIXELMARK__.pageUrl = TARGET_URL;
  window.__PIXELMARK__.consoleErrors = [];
  window.__PIXELMARK__.networkErrors = [];
  window.__PIXELMARK__.rendererType = "dom";
  window.__PIXELMARK__.agentVersion = "2.3.0";

  window.PIXELMARK = window.PIXELMARK || {};
  window.PIXELMARK.sessionId = window.PIXELMARK.sessionId || SESSION_ID;
  window.PIXELMARK.pageUrl = window.PIXELMARK.pageUrl || TARGET_URL;
  window.PIXELMARK.transportUrl = window.PIXELMARK.transportUrl || window.__PIXELMARK_TRANSPORT_URL__;
  window.PIXELMARK.targetUrl = window.PIXELMARK.targetUrl || window.__PIXELMARK_TARGET_URL__;

  window.lastpageurl = window.lastpageurl || window.__PIXELMARK_TARGET_URL__ || TARGET_URL;

  let feedbackModeActive = false;

  // ─── RAF Hook & FPS Tracker ───────────────────────────────────────────────
  let rAFCount = 0;
  let rAFActive = false;
  let frames = 0;
  let fps = 60;
  let lastFpsTime = window.performance ? window.performance.now() : Date.now();

  const originalRAF = window.requestAnimationFrame;
  window.requestAnimationFrame = function(cb) {
    rAFCount++;
    rAFActive = true;
    return originalRAF.call(window, function(timestamp) {
      frames++;
      cb(timestamp);
    });
  };

  function calculateFps() {
    const now = window.performance ? window.performance.now() : Date.now();
    if (now >= lastFpsTime + 1000) {
      fps = Math.round((frames * 1000) / (now - lastFpsTime));
      frames = 0;
      lastFpsTime = now;
      if (rAFCount > 0) {
        rAFActive = true;
      }
      rAFCount = 0;

      // Broadcast performance stats to parent
      window.parent.postMessage({
        type: "PIXELMARK_PERFORMANCE_UPDATE",
        fps: fps,
        rAFActive: rAFActive
      }, "*");
    }
    originalRAF.call(window, calculateFps);
  }
  originalRAF.call(window, calculateFps);

  // ─── Circular buffer ──────────────────────────────────────────────────────
  function pushCircular(arr, item) {
    arr.push(item);
    if (arr.length > 20) arr.shift();
  }

  // ─── Console error interception ───────────────────────────────────────────
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

  // ─── Client-side Asset URL Rewrite Helper ─────────────────────────────────
  function rewriteAssetUrl(url, method = 'GET') {
    if (!url || typeof url !== 'string') return url;
    const raw = url.trim();
    if (!raw) return url;
    if (raw.startsWith('data:') || raw.startsWith('blob:') || raw.startsWith('javascript:')) {
      return url;
    }
    if (url.includes('/proxy/session/')) {
      return url;
    }

    let absoluteUrl = url;
    try {
      const pageUrl = getAbsoluteTargetUrl();
      absoluteUrl = new URL(url, pageUrl).href;
    } catch (e) {
      return url;
    }

    try {
      const parsed = new URL(absoluteUrl);
      const host = parsed.hostname.toLowerCase();
      
      const PASSTHROUGH_ORIGINS = [
        'firebaseinstallations.googleapis.com',
        'firebase.googleapis.com',
        'identitytoolkit.googleapis.com',
        'securetoken.googleapis.com',
        'firebaseapp.com',
        'auth0.com',
        'accounts.google.com'
      ];
      
      if (PASSTHROUGH_ORIGINS.some(o => host === o || host.endsWith('.' + o))) {
        return absoluteUrl;
      }
      
      const bypass = new Set([
        'www.google-analytics.com', 'google-analytics.com',
        'www.googletagmanager.com', 'googletagmanager.com',
        'connect.facebook.net', 'static.hotjar.com', 'script.hotjar.com',
        'segment.io', 'api.segment.io'
      ]);
      const suffix = ['.google-analytics.com', '.googletagmanager.com', '.hotjar.com', '.segment.io'];
      
      const isExact = bypass.has(host);
      const isSuffix = suffix.some(s => host.endsWith(s));
      const isGoogleCollect = (host === 'www.google.com' || host === 'google.com') && parsed.pathname.startsWith('/g/collect');
      if (isExact || isSuffix || isGoogleCollect) return absoluteUrl;
    } catch {
      return url;
    }

    const pmBase = window.__PIXELMARK_BASE__ || (window.__PIXELMARK_SESSION__?.proxy_base_url) || (window.__PIXELMARK__?.proxy_base_url);
    if (pmBase) {
      return `${pmBase}/asset?url=${encodeURIComponent(absoluteUrl)}`;
    }
    return url;
  }

  // ─── Network error interception & fetch/XHR proxy rewriting ────────────────
  const originalFetch = window.fetch;
  window.fetch = async function(input, init) {
    let url = typeof input === 'string' ? input : input?.url;
    const method = (init && init.method) || (input && input.method) || 'GET';
    if (url && typeof url === 'string') {
      const rewritten = rewriteAssetUrl(url, method);
      if (rewritten !== url) {
        if (typeof input === 'string') {
          input = rewritten;
        } else if (input && typeof input === 'object') {
          try {
            input = new Request(rewritten, input);
          } catch (e) {
            try { Object.defineProperty(input, 'url', { value: rewritten }); } catch (_) {}
          }
        }
      }
    }
    try {
      const response = await originalFetch.call(this, input, init);
      if (response && response.status >= 400) {
        pushCircular(window.__PIXELMARK__.networkErrors, {
          url: response.url,
          status: response.status,
          method: method,
          timestamp: new Date().toISOString()
        });
      }
      return response;
    } catch (err) {
      pushCircular(window.__PIXELMARK__.networkErrors, {
        url: typeof input === 'string' ? input : input?.url || "unknown",
        status: 0,
        method: method,
        timestamp: new Date().toISOString()
      });
      throw err;
    }
  };

  const originalXHROpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url, ...args) {
    if (url && typeof url === 'string') {
      url = rewriteAssetUrl(url, method);
    }
    this._method = method;
    return originalXHROpen.apply(this, [method, url, ...args]);
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
    const canvases = Array.from(document.querySelectorAll("canvas"));
    const hasCanvas = canvases.length > 0;
    
    // 1. Canvas with non-zero dimensions
    let hasNonZeroCanvas = false;
    if (hasCanvas) {
      for (const canvas of canvases) {
        if (canvas.width > 0 && canvas.height > 0) {
          hasNonZeroCanvas = true;
          break;
        }
      }
    }

    // 2. WebGL contexts available
    const webglCtxAvailable = !!(window.WebGLRenderingContext || window.WebGL2RenderingContext);

    // 3. Canvas element has active WebGL context
    let hasActiveWebGLContext = false;
    let activeWebGL2Context = false;
    let hasCanvas2D = false;
    if (hasCanvas) {
      for (const canvas of canvases) {
        var ctxType = canvas.__pixelmark_context_type;
        if (ctxType) {
          if (ctxType === "webgl2") {
            hasActiveWebGLContext = true;
            activeWebGL2Context = true;
          } else if (ctxType === "webgl" || ctxType === "experimental-webgl") {
            hasActiveWebGLContext = true;
          } else if (ctxType === "2d") {
            hasCanvas2D = true;
          }
        }
      }
    }

    // 4. Global presence of Three.js / R3F / Babylon / pc / Phaser / PIXI
    const hasThree = typeof THREE !== "undefined" || !!window.__PIXELMARK__?.threeRenderer || !!window.__r3f;
    const hasPixi = typeof PIXI !== "undefined" || !!window.PIXI;
    const hasBabylon = typeof BABYLON !== "undefined" || !!window.BABYLON;
    const hasPhaser = typeof Phaser !== "undefined" || !!window.Phaser;
    const hasPlayCanvas = typeof pc !== "undefined" || !!window.pc;
    const threeDetected = hasThree || hasPixi || hasBabylon || hasPhaser || hasPlayCanvas;

    // 5. requestAnimationFrame calls in a 1-second window
    const rafDetected = rAFActive || (rAFCount > 3);

    // 6. CSS animations or keyframes on > 10 elements
    let cssAnimCount = 0;
    try {
      document.querySelectorAll("*").forEach(el => {
        const styles = window.getComputedStyle(el);
        if (styles.animationName && styles.animationName !== "none") {
          cssAnimCount++;
        }
      });
    } catch (e) {}
    const hasCssAnimations = cssAnimCount > 10;

    // 7. Large hero elements with transform/translate styles
    let hasLargeHeroTransforms = false;
    try {
      document.querySelectorAll("*").forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.width > window.innerWidth * 0.5 && rect.height > window.innerHeight * 0.5) {
          const styles = window.getComputedStyle(el);
          if (styles.transform && styles.transform !== "none") {
            hasLargeHeroTransforms = true;
          }
        }
      });
    } catch (e) {}

    // Check client-side routing / SPA frameworks
    const hasSPA = !!(
      window.next || 
      window.__NEXT_DATA__ || 
      window.react || 
      window.__REACT_DEVTOOLS_GLOBAL_HOOK__ || 
      window.vue || 
      window.Svelte || 
      window.angular ||
      (window.history && window.history.pushState)
    );

    // Mixed mode heuristic: has canvas/WebGL/Three and a significant DOM layout (> 15 interactive elements)
    const paragraphs = document.querySelectorAll("p, span, a, button, h1, h2, h3, h4, h5, h6, input, label").length;
    const isMixed = (hasActiveWebGLContext || hasCanvas2D) && paragraphs > 15;

    let detectedType = "dom";
    if (activeWebGL2Context) {
      detectedType = isMixed ? "mixed" : "webgl2";
    } else if (hasActiveWebGLContext) {
      detectedType = isMixed ? "mixed" : "webgl";
    } else if (hasCanvas2D) {
      detectedType = isMixed ? "mixed" : "canvas2d";
    } else if (hasSPA) {
      detectedType = "spa";
    }

    // Set globally on window
    window.__PIXELMARK_RENDERER__ = detectedType;

    return detectedType;
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
          .filter(c => !c.includes(':') && !c.includes('/') && !c.includes('[') && !c.includes(']'))
          .map(c => CSS.escape(c))
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
    const isCanvasElement = element.tagName === "CANVAS";
    if (isCanvasElement) {
      return {
        xpath: "",
        css_selector: "visual-canvas-context",
        inner_text: "",
        tag_name: element.tagName,
        element_id: element.id || null,
        class_list: Array.from(element.classList).slice(0, 10),
        is_visible: true,
        computed_role: null,
        aria_label: element.getAttribute("aria-label") || null,
        aria_role: element.getAttribute("role") || element.tagName.toLowerCase() || null,
        placeholder: null,
      };
    }
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
  // ─── Screenshot capture & Serialization (Phase 3.5 Upgrade) ────────────────
  async function loadHtml2Canvas() {
    if (window.html2canvas) return window.html2canvas;
    
    const origin = window.__PIXELMARK_PROXY_ORIGIN__ || window.location.origin;
    const localSrc = origin.replace(/\/$/, "") + "/static/html2canvas.min.js";
    const cdnSrc = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
    
    function loadScriptWithTimeout(src, timeoutMs = 3000) {
      return new Promise((resolve) => {
        const script = document.createElement("script");
        script.src = src;
        const timer = setTimeout(() => {
          script.onload = null;
          script.onerror = null;
          resolve(null);
        }, timeoutMs);
        script.onload = () => {
          clearTimeout(timer);
          resolve(window.html2canvas || null);
        };
        script.onerror = () => {
          clearTimeout(timer);
          resolve(null);
        };
        document.head.appendChild(script);
      });
    }

    // First try local with 3s timeout
    const loadedLocal = await loadScriptWithTimeout(localSrc, 3000);
    if (loadedLocal) return loadedLocal;
    
    // Fallback to CDN with 3s timeout
    return loadScriptWithTimeout(cdnSrc, 3000);
  }

  // Preload html2canvas early
  if (document.readyState === "complete" || document.readyState === "interactive") {
    loadHtml2Canvas().catch(() => {});
  } else {
    window.addEventListener("DOMContentLoaded", () => {
      loadHtml2Canvas().catch(() => {});
    });
  }

  function createHighlightOverlay(element) {
    try {
      const rect = element.getBoundingClientRect();
      const overlay = document.createElement('div');
      overlay.id = 'pixelmark-screenshot-highlight';
      overlay.style.position = 'absolute';
      overlay.style.pointerEvents = 'none';
      overlay.style.zIndex = '2147483647';
      overlay.style.boxSizing = 'border-box';
      overlay.style.border = '2px solid #7c3aed';
      overlay.style.left = (rect.left + window.scrollX) + 'px';
      overlay.style.top = (rect.top + window.scrollY) + 'px';
      overlay.style.width = rect.width + 'px';
      overlay.style.height = rect.height + 'px';
      document.body.appendChild(overlay);
      return overlay;
    } catch (e) {
      return null;
    }
  }

  function createPlaceholderScreenshot({ title, subtitle, elementTag, selector, xpath, reason }) {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 400;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      // Dark background
      ctx.fillStyle = '#0a0a0f';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Purple border/accent line
      ctx.strokeStyle = '#7c3aed';
      ctx.lineWidth = 8;
      ctx.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);

      // Header block background
      ctx.fillStyle = '#12121a';
      ctx.fillRect(8, 8, canvas.width - 16, 60);
      
      // Header text
      ctx.fillStyle = '#ef4444'; // Red-ish accent for warning
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText('⚠ SCREENSHOT UNAVAILABLE', 24, 44);

      // Metadata text layout
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '12px sans-serif';
      
      let y = 100;
      const drawField = (label, value) => {
        if (!value) return;
        ctx.fillStyle = '#a855f7'; // Purple label
        ctx.font = 'bold 11px monospace';
        ctx.fillText(label.toUpperCase() + ':', 24, y);
        ctx.fillStyle = '#e2e8f0'; // White text
        ctx.font = '11px sans-serif';
        // Wrap text if too long
        const maxW = canvas.width - 150;
        if (ctx.measureText(value).width > maxW) {
          const words = value.split(' ');
          let line = '';
          for (let n = 0; n < words.length; n++) {
            let testLine = line + words[n] + ' ';
            let testWidth = ctx.measureText(testLine).width;
            if (testWidth > maxW && n > 0) {
              ctx.fillText(line, 120, y);
              line = words[n] + ' ';
              y += 18;
            } else {
              line = testLine;
            }
          }
          ctx.fillText(line, 120, y);
        } else {
          ctx.fillText(value, 120, y);
        }
        y += 24;
      };

      drawField('Page Title', title);
      drawField('Element Tag', elementTag);
      drawField('Selector', selector);
      if (xpath) drawField('XPath', xpath);
      drawField('Reason', reason);
      drawField('Timestamp', subtitle || new Date().toISOString());

      // Bottom watermark
      ctx.fillStyle = '#a855f7';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('PIXELMARK DIAGNOSTICS CAPTURE PIPELINE v3.5', 24, canvas.height - 24);

      return canvas.toDataURL('image/png');
    } catch (e) {
      console.error("[PixelMark Capture] Failed to create placeholder canvas:", e);
      return null;
    }
  }

  function createDOMFallbackScreenshot({ target, reason }) {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 400;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      // Draw standard browser shell background
      ctx.fillStyle = '#1e1e2e';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Browser Header bar
      ctx.fillStyle = '#11111b';
      ctx.fillRect(0, 0, canvas.width, 40);

      // Address bar
      ctx.fillStyle = '#313244';
      ctx.fillRect(80, 8, canvas.width - 100, 24);
      
      // Address bar text
      ctx.fillStyle = '#a6adc8';
      ctx.font = '10px monospace';
      ctx.fillText(window.location.href, 90, 24);

      // Mock tabs/dots
      ctx.fillStyle = '#f38ba8'; // Red
      ctx.beginPath(); ctx.arc(15, 20, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f9e2af'; // Yellow
      ctx.beginPath(); ctx.arc(30, 20, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#a6e3a1'; // Green
      ctx.beginPath(); ctx.arc(45, 20, 5, 0, Math.PI * 2); ctx.fill();

      // Draw a wireframe representing the page shell
      ctx.fillStyle = '#181825';
      // Mock Sidebar
      ctx.fillRect(10, 50, 80, 330);
      // Mock Main Content
      ctx.fillRect(100, 50, canvas.width - 110, 330);

      // Get target bounding box
      const rect = target.getBoundingClientRect();
      const viewW = window.innerWidth || 1;
      const viewH = window.innerHeight || 1;

      // Scale the element's position to fit our mock viewport
      const scaleX = (canvas.width - 110) / viewW;
      const scaleY = 330 / viewH;

      const mockX = 100 + rect.left * scaleX;
      const mockY = 50 + rect.top * scaleY;
      const mockW = Math.max(10, rect.width * scaleX);
      const mockH = Math.max(10, rect.height * scaleY);

      // Draw simulated other elements on page (wireframe)
      ctx.fillStyle = '#313244';
      const divs = document.querySelectorAll('div, section, header, nav, footer');
      let count = 0;
      for (let i = 0; i < divs.length && count < 15; i++) {
        const d = divs[i];
        if (d === target) continue;
        const r = d.getBoundingClientRect();
        if (r.width > 20 && r.height > 20) {
          const dx = 100 + r.left * scaleX;
          const dy = 50 + r.top * scaleY;
          const dw = r.width * scaleX;
          const dh = r.height * scaleY;
          if (dx >= 100 && dx + dw <= canvas.width && dy >= 50 && dy + dh <= canvas.height) {
            ctx.fillRect(dx, dy, dw, dh);
            count++;
          }
        }
      }

      // Draw highlighted target element in purple
      ctx.strokeStyle = '#cba6f7'; // Lavender/purple outline
      ctx.lineWidth = 2;
      ctx.strokeRect(mockX, mockY, mockW, mockH);
      ctx.fillStyle = 'rgba(203, 166, 247, 0.15)'; // Semitransparent fill
      ctx.fillRect(mockX, mockY, mockW, mockH);

      // Crop zoom overlay (inset in bottom right)
      const zoomW = 200;
      const zoomH = 120;
      const zoomX = canvas.width - zoomW - 15;
      const zoomY = canvas.height - zoomH - 15;

      ctx.fillStyle = '#11111b';
      ctx.strokeStyle = '#cba6f7';
      ctx.lineWidth = 3;
      ctx.fillRect(zoomX, zoomY, zoomW, zoomH);
      ctx.strokeRect(zoomX, zoomY, zoomW, zoomH);

      // Zoom Content: Text preview
      ctx.fillStyle = '#cba6f7';
      ctx.font = 'bold 10px sans-serif';
      ctx.fillText(`CROP VIEWPORT PREVIEW: <${target.tagName.toLowerCase()}>`, zoomX + 10, zoomY + 20);

      ctx.fillStyle = '#bac2de';
      ctx.font = '9px monospace';
      
      const selector = getCSSSelector(target);
      const cleanSelector = selector.length > 30 ? selector.substring(0, 27) + '...' : selector;
      ctx.fillText(`Selector: ${cleanSelector}`, zoomX + 10, zoomY + 38);

      const dimensions = `${Math.round(rect.width)}x${Math.round(rect.height)} @ (${Math.round(rect.left)}, ${Math.round(rect.top)})`;
      ctx.fillText(`Bounds: ${dimensions}`, zoomX + 10, zoomY + 54);

      // Text snippet
      const textVal = (target.innerText || target.value || "").trim().replace(/\s+/g, ' ');
      const cleanText = textVal.length > 50 ? textVal.substring(0, 47) + '...' : textVal;
      if (cleanText) {
        ctx.fillText(`Content: "${cleanText}"`, zoomX + 10, zoomY + 70);
      }

      // Diagnostic note
      ctx.fillStyle = '#f38ba8';
      ctx.fillText(`Note: ${reason}`, zoomX + 10, zoomY + 95);

      // Overlay text title
      ctx.fillStyle = '#cba6f7';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText('DOM VIEWPORT LAYOUT SHELL', 110, 80);

      return canvas.toDataURL('image/png');
    } catch (e) {
      console.error("[PixelMark Capture] Failed to create DOM fallback viewport snapshot:", e);
      return null;
    }
  }

  async function getScreenshotData(target, rendererType) {
    // Strategy is now handled in the parent shell via orchestrator
    return {
      dataUrl: null,
      strategy: "pending",
      timestamp: new Date().toISOString()
    };
  }

  // ─── DOM snapshot serialization ───────────────────────────────────────────
  function cleanInnerHTML(html) {
    if (!html) return '';
    html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    html = html.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
    html = html.replace(/\s+on[a-z]+\s*=\s*(['"])(.*?)\1/gi, '');
    html = html.replace(/\s+on[a-z]+\s*=\s*([^\s>]+)/gi, '');
    try {
      const proxyBase = window.location.origin + "/proxy/session/" + (window.__PIXELMARK__?.sessionId || "") + "/url/";
      html = html.split(proxyBase).join("");
      html = html.replace(/https?:\/\/localhost:\d+\/proxy\/session\/[a-f0-9-]+\/url\//gi, "");
    } catch(e) {}
    return html.trim();
  }

  function getRelevantComputedStyles(element) {
    const styles = {};
    try {
      const computed = window.getComputedStyle(element);
      const keys = [
        'display', 'position', 'width', 'height', 'top', 'left', 'z-index',
        'color', 'background-color', 'font-size', 'font-weight',
        'visibility', 'opacity', 'overflow',
        'border-radius', 'box-shadow'
      ];
      keys.forEach(k => {
        const val = computed.getPropertyValue(k);
        if (val) {
          styles[k] = val;
          if (k === 'z-index') {
            styles['zIndex'] = val;
          }
        }
      });

      const flexGridKeys = [
        'flex-direction', 'flex-wrap', 'justify-content', 'align-items', 'align-content',
        'flex-grow', 'flex-shrink', 'flex-basis',
        'grid-template-columns', 'grid-template-rows', 'grid-gap', 'gap'
      ];
      const displayVal = computed.getPropertyValue('display') || '';
      if (displayVal.indexOf('flex') !== -1 || displayVal.indexOf('grid') !== -1) {
        flexGridKeys.forEach(k => {
          const val = computed.getPropertyValue(k);
          if (val && val !== 'initial' && val !== 'unset' && val !== 'normal') {
            styles[k] = val;
          }
        });
      }
    } catch (e) {}
    return styles;
  }

  function getAncestorChain(element) {
    const chain = [];
    try {
      let current = element.parentElement;
      let depth = 0;
      while (current && current.tagName !== 'HTML' && depth < 4) {
        const classList = Array.from(current.classList || []).slice(0, 5);
        chain.push({
          tagname: current.tagName.toLowerCase(),
          tagName: current.tagName.toLowerCase(),
          id: current.id || null,
          classlist: classList,
          role: current.getAttribute('role') || null
        });
        if (current.tagName === 'BODY') break;
        current = current.parentElement;
        depth++;
      }
    } catch (e) {}
    return chain;
  }

  function getSiblingInfo(sibling) {
    if (!sibling || sibling.nodeType !== Node.ELEMENT_NODE) return null;
    const classList = Array.from(sibling.classList || []).slice(0, 2);
    const text = (sibling.innerText || sibling.textContent || '').trim().substring(0, 80);
    return {
      tagname: sibling.tagName.toLowerCase(),
      id: sibling.id || null,
      classlist: classList,
      innerText: text
    };
  }

  function getElementAttributes(element) {
    const attrs = {};
    try {
      if (element.attributes) {
        for (let i = 0; i < element.attributes.length; i++) {
          const attr = element.attributes[i];
          const name = attr.name.toLowerCase();
          if (name.startsWith('on')) continue;
          if (name === 'style' && attr.value.length > 100) continue;
          attrs[attr.name] = attr.value;
        }
      }
    } catch (e) {}
    return attrs;
  }

  function capSnapshotSize(snapshot) {
    let serialized = JSON.stringify(snapshot);
    if (serialized.length <= 12288) return snapshot;

    if (snapshot.innerHTML && snapshot.innerHTML.length > 100) {
      snapshot.innerHTML = snapshot.innerHTML.substring(0, 100) + "... [truncated]";
      serialized = JSON.stringify(snapshot);
      if (serialized.length <= 12288) return snapshot;
    }
    
    if (snapshot.innerHTML) {
      snapshot.innerHTML = "[truncated due to size]";
      serialized = JSON.stringify(snapshot);
      if (serialized.length <= 12288) return snapshot;
    }

    if (snapshot.computedStyles) {
      const minimalStyles = {};
      const essentialKeys = ['display', 'position', 'width', 'height', 'z-index', 'zIndex'];
      essentialKeys.forEach(k => {
        if (snapshot.computedStyles[k] !== undefined) {
          minimalStyles[k] = snapshot.computedStyles[k];
        }
      });
      snapshot.computedStyles = minimalStyles;
      serialized = JSON.stringify(snapshot);
      if (serialized.length <= 12288) return snapshot;
    }

    snapshot.computedStyles = {};
    return snapshot;
  }

  function serializeDOMSnapshot(element) {
    if (!element) return null;
    try {
      const tagname = element.tagName.toLowerCase();
      const id = element.id || null;
      const classlist = Array.from(element.classList || []);
      const attributes = getElementAttributes(element);
      const innerText = (element.innerText || element.textContent || '').trim().substring(0, 500);
      const innerHTML = cleanInnerHTML(element.innerHTML || '').substring(0, 2000);
      const computedStyles = getRelevantComputedStyles(element);
      
      const bbox = element.getBoundingClientRect();
      const boundingBox = {
        x: bbox.x,
        y: bbox.y,
        width: bbox.width,
        height: bbox.height,
        top: bbox.top,
        right: bbox.right,
        bottom: bbox.bottom,
        left: bbox.left
      };
      
      const isVisible = !!(element.offsetWidth || element.offsetHeight || element.getClientRects().length);
      const domCtx = getDOMContext(element);
      const xpath = domCtx.xpath || "";
      const cssselector = domCtx.css_selector || "";
      const ariaLabel = element.getAttribute('aria-label') || element.ariaLabel || null;
      const ariaRole = element.getAttribute('role') || null;
      const placeholder = element.getAttribute('placeholder') || null;
      const rendererType = window.__PIXELMARK__?.rendererType || 'dom';
      
      const shadowCtx = captureShadowContext(element);
      const previousSibling = getSiblingInfo(element.previousElementSibling);
      const nextSibling = getSiblingInfo(element.nextElementSibling);
      const ancestorChain = getAncestorChain(element);

      const snapshot = {
        tagname,
        id,
        classlist,
        attributes,
        innerText,
        innerHTML,
        computedStyles,
        boundingBox,
        isVisible,
        xpath,
        cssselector,
        ariaLabel,
        ariaRole,
        placeholder,
        rendererType,
        shadow_context: shadowCtx,
        previousSibling,
        nextSibling,
        ancestorChain,
        ancestors: ancestorChain
      };

      return capSnapshotSize(snapshot);
    } catch (err) {
      console.error("[PixelMark Capture] error in serializeDOMSnapshot:", err);
      return null;
    }
  }

  function serializeCanvasDOMSnapshot(canvas, rendererType) {
    if (!canvas || canvas.tagName !== 'CANVAS') return null;
    try {
      const tagname = 'canvas';
      const id = canvas.id || null;
      const classlist = Array.from(canvas.classList || []);
      
      const computed = window.getComputedStyle(canvas);
      const styleAttributes = {
        width: computed.getPropertyValue('width') || null,
        height: computed.getPropertyValue('height') || null,
        position: computed.getPropertyValue('position') || null,
        'z-index': computed.getPropertyValue('z-index') || null
      };

      const bbox = canvas.getBoundingClientRect();
      const boundingBox = {
        x: bbox.x,
        y: bbox.y,
        width: bbox.width,
        height: bbox.height,
        top: bbox.top,
        right: bbox.right,
        bottom: bbox.bottom,
        left: bbox.left
      };

      const parent = canvas.parentElement;
      const parentInfo = parent ? {
        tagname: parent.tagName.toLowerCase(),
        id: parent.id || null,
        classlist: Array.from(parent.classList || [])
      } : null;

      const siblingCount = parent ? parent.children.length - 1 : 0;
      const isFullscreen = (bbox.width > window.innerWidth * 0.8) && (bbox.height > window.innerHeight * 0.8);

      let activeContextType = null;
      if (canvas.getContext("webgl2")) {
        activeContextType = "webgl2";
      } else if (canvas.getContext("webgl") || canvas.getContext("experimental-webgl")) {
        activeContextType = "webgl";
      } else if (canvas.getContext("2d")) {
        activeContextType = "canvas-2d";
      }

      let rendererHint = 'unknown';
      if (rendererType === 'threejs' || window.THREE || canvas.__three) {
        rendererHint = 'three.js';
      } else if (activeContextType === 'webgl2') {
        rendererHint = 'webgl2';
      } else if (activeContextType === 'webgl') {
        rendererHint = 'webgl';
      } else if (activeContextType === 'canvas-2d') {
        rendererHint = 'canvas2d';
      }

      return {
        tagname,
        id,
        classlist,
        styleAttributes,
        boundingBox,
        parent: parentInfo,
        siblingCount,
        isFullscreen,
        rendererHint,
        activeContextType
      };
    } catch (e) {
      console.error("[PixelMark Capture] error in serializeCanvasDOMSnapshot:", e);
      return null;
    }
  }

  // ─── WebGL/Three.js context ────────────────────────────────────────────────
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

  // ─── Visual confirmation pulse ─────────────────────────────────────────────
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

  // ─── Cursor-reactive effect relay ───────────────────────────────────────────
  //
  // Many target sites have cursor-glow / spotlight / WebGL mouse-follow effects.
  // When the site is inside a proxy iframe the browser delivers real mousemove
  // events normally when the pointer is physically over the iframe.
  // However, when the PixelMark overlay (in the parent) intercepts mouse events
  // (e.g. in feedback mode, or when the drawer is open) the iframe stops
  // receiving native pointer events and the cursor effects freeze.
  //
  // Fix: the parent sends PIXELMARK_CURSOR_MOVE messages with the pointer
  // position (in iframe coordinate space). We relay them as synthetic
  // mousemove + pointermove events on document so all listeners—including
  // inline event handlers, addEventListener calls, and canvas RAF loops—
  // receive continuous cursor updates.
  //
  // Rules:
  //  • Only runs when feedback mode is OFF (when ON the overlay owns the cursor)
  //  • Dispatches on document AND on every <canvas> element found
  //  • Uses bubbling so any deeply-nested listener receives the event
  //  • Does NOT create a continuous fake loop — only fires when the parent sends
  //

  let lastRelayX = -1;
  let lastRelayY = -1;
  let relayPending = false;

  function relayCursorEvent(x, y) {
    lastRelayX = x;
    lastRelayY = y;

    if (relayPending) return; // batch into next rAF
    relayPending = true;

    originalRAF.call(window, () => {
      relayPending = false;
      const cx = lastRelayX;
      const cy = lastRelayY;

      const makeEvent = (type) => {
        try {
          return new MouseEvent(type, {
            bubbles: true,
            cancelable: false,
            clientX: cx,
            clientY: cy,
            screenX: cx,
            screenY: cy,
            movementX: 0,
            movementY: 0,
            view: window
          });
        } catch (e) { return null; }
      };

      const makePointer = (type) => {
        try {
          return new PointerEvent(type, {
            bubbles: true,
            cancelable: false,
            clientX: cx,
            clientY: cy,
            screenX: cx,
            screenY: cy,
            pointerId: 1,
            pointerType: 'mouse',
            isPrimary: true,
            view: window
          });
        } catch (e) { return null; }
      };

      // 1. Fire on document so global listeners receive it
      try {
        const mm = makeEvent('mousemove');
        const pm = makePointer('pointermove');
        if (mm) document.dispatchEvent(mm);
        if (pm) document.dispatchEvent(pm);
      } catch (_) {}

      // 2. Also fire on every canvas so WebGL/Three.js effects that listen
      //    directly on canvas elements receive the move.
      try {
        document.querySelectorAll('canvas').forEach(canvas => {
          try {
            const rect = canvas.getBoundingClientRect();
            // Only relay when the logical cursor is within (or near) canvas bounds
            const margin = 64;
            if (
              cx >= rect.left - margin && cx <= rect.right + margin &&
              cy >= rect.top - margin && cy <= rect.bottom + margin
            ) {
              const cMM = makeEvent('mousemove');
              const cPM = makePointer('pointermove');
              if (cMM) canvas.dispatchEvent(cMM);
              if (cPM) canvas.dispatchEvent(cPM);
            }
          } catch (_) {}
        });
      } catch (_) {}

      // 3. Update any global cursor state objects the site might be reading
      //    (common patterns: window.mouse, window.cursor, window.mousePos, etc.)
      try {
        const cursorObj = window.mouse || window.cursor || window.mousePos ||
                          window.Mouse || window.Cursor || null;
        if (cursorObj && typeof cursorObj === 'object') {
          if ('x' in cursorObj) cursorObj.x = cx;
          if ('y' in cursorObj) cursorObj.y = cy;
          if ('clientX' in cursorObj) cursorObj.clientX = cx;
          if ('clientY' in cursorObj) cursorObj.clientY = cy;
        }
      } catch (_) {}
    });
  }

  // ─── Feedback Mode HUD badge ───────────────────────────────────────────────
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
          ? ` ┬╖ ${window.__PIXELMARK__.rendererType.toUpperCase()}`
          : "";
        badgeEl.innerHTML = `
          <span style="display:inline-block;width:7px;height:7px;background:#a78bfa;border-radius:50%;animation:pm-ping 1s infinite alternate;"></span>
          Feedback Mode ON${rendererLabel} ΓÇö Click to report
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

  // ─── Hover Inspector ──────────────────────────────────────────────────────
  class HoverInspector {
    constructor() {
      this.root = document.createElement('div');
      this.root.id = INSPECTOR_ROOT_ID;
      this.root.style.cssText = `position:fixed;pointer-events:none;z-index:2147483646;`;
      document.body.appendChild(this.root);
      this.box = document.createElement('div');
      this.box.style.cssText = `border:2px solid #7c3aed;border-radius:4px;box-shadow:0 0 8px rgba(124,58,237,0.6);`;
      this.tooltip = document.createElement('div');
      this.tooltip.style.cssText = `position:absolute;background:#7c3aed;color:white;padding:2px 6px;font-size:10px;border-radius:3px;top:-24px;left:0;transform:translateX(-50%);white-space:nowrap;`;
      this.root.appendChild(this.box);
      this.root.appendChild(this.tooltip);
      this.active = false;
      this.bound = this.onMouseMove.bind(this);
    }
    start() {
      if (this.active) return;
      window.addEventListener('mousemove', this.bound);
      this.active = true;
    }
    stop() {
      if (!this.active) return;
      window.removeEventListener('mousemove', this.bound);
      this.root.style.display = 'none';
      this.active = false;
    }
    onMouseMove(e) {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      if (!el || isPixelMarkOwnedNode(el) || el.id === INSPECTOR_ROOT_ID) {
        this.root.style.display = 'none';
        return;
      }
      const rect = el.getBoundingClientRect();
      this.box.style.cssText = `position:absolute;left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;height:${rect.height}px;border:2px solid #7c3aed;border-radius:4px;pointer-events:none;`;
      const tag = el.tagName.toLowerCase();
      const role = el.getAttribute('role') || '';
      const hint = detectIssueType(el, window.__PIXELMARK__.rendererType);
      this.tooltip.textContent = `${tag}${role ? '['+role+']' : ''} • ${hint}`;
      this.tooltip.style.left = `${e.clientX}px`;
      this.root.style.display = 'block';
    }
  }

  const INSPECTOR_ROOT_ID = "pixelmark-inspector-root";
  const hoverInspector = new HoverInspector();

  // ─── Pin manager ──────────────────────────────────────────────────────────
  class PinManager {
    constructor() {
      this.root = document.createElement('div');
      this.root.id = PIN_ROOT_ID;
      this.root.style.cssText = `position:fixed;pointer-events:none;z-index:2147483645;`;
      document.body.appendChild(this.root);
      this.pins = new Map();
    }
    createPin(payload) {
      const id = payload.id || crypto.randomUUID();
      const el = document.createElement('div');
      el.dataset.pixelmarkPin = id;
      el.style.cssText = `position:absolute;width:12px;height:12px;background:#7c3aed;border-radius:50%;border:2px solid white;box-shadow:0 0 4px rgba(0,0,0,0.4);cursor:pointer;pointer-events:auto;`;
      const { viewport_x, viewport_y } = payload.click || {};
      if (viewport_x !== undefined && viewport_y !== undefined) {
        el.style.left = `${viewport_x * 100}%`;
        el.style.top = `${viewport_y * 100}%`;
        el.style.transform = 'translate(-50%,-50%)';
      } else if (payload.bounding_box) {
        const { x, y, width, height } = payload.bounding_box;
        const vw = window.innerWidth, vh = window.innerHeight;
        el.style.left = `${(x + width/2) / vw * 100}%`;
        el.style.top = `${(y + height/2) / vh * 100}%`;
        el.style.transform = 'translate(-50%,-50%)';
      }
      
      el.addEventListener('click', (ev) => {
        ev.stopPropagation();
        window.parent.postMessage({ type: 'PIXELMARK_OPEN_FEEDBACK_DRAWER', payload }, '*');
      });
      this.root.appendChild(el);
      this.pins.set(id, el);
      return id;
    }
    removePin(id) {
      const el = this.pins.get(id);
      if (el) { el.remove(); this.pins.delete(id); }
    }
    clearAll() {
      this.root.innerHTML = '';
      this.pins.clear();
    }
  }
  const PIN_ROOT_ID = "pixelmark-pin-root";
  const pinManager = new PinManager();

  // Helper to detect if a element is owned by PixelMark
  function isPixelMarkOwnedNode(node) {
    if (!node) return false;
    if (node.id === PIN_ROOT_ID || node.id === INSPECTOR_ROOT_ID || node.id === "pixelmark-hud-badge") return true;
    if (node.closest && (node.closest(`#${PIN_ROOT_ID}`) || node.closest(`#${INSPECTOR_ROOT_ID}`))) return true;
    return false;
  }

  // ─── Payload builder (canonical) ──────────────────────────────────────────
  function buildCapturePayload(event, target, canvasCtx = null) {
    const clickX = event.clientX, clickY = event.clientY;
    const pageX = Math.round(clickX + window.scrollX), pageY = Math.round(clickY + window.scrollY);
    const viewport = { width: window.innerWidth, height: window.innerHeight };
    const rendererType = window.__PIXELMARK__.rendererType;
    const domCtx = getDOMContext(target);
    const viewportCtx = getViewportContext();
    const shadowCtx = captureShadowContext(target);
    const bbox = getBoundingBox(target);
    const browserInfo = getBrowserInfo();
    const issueHint = detectIssueType(target, rendererType);
    const logicalUrl = getAbsoluteTargetUrl();
    
    const payload = {
      id: crypto.randomUUID(),
      session_id: SESSION_ID,
      pageurl: logicalUrl,
      page_url: logicalUrl,
      page_title: document.title,
      created_via: feedbackModeActive ? 'feedback-mode' : (event.altKey ? 'alt-click' : 'unknown'),
      click: {
        page_x: pageX,
        page_y: pageY,
        viewport_x: clickX,
        viewport_y: clickY,
        client_x: clickX,
        client_y: clickY,
        normalized_x: clickX / viewport.width,
        normalized_y: clickY / viewport.height
      },
      displayX: clickX,
        displayY: clickY,
        pageX: pageX,
        pageY: pageY,
        viewport_x: clickX,
        viewport_y: clickY,
      canvas_context: canvasCtx,
      norm_x: canvasCtx ? (canvasCtx.canvas_coords.x / canvasCtx.canvas_rect.width) : null,
      norm_y: canvasCtx ? (canvasCtx.canvas_coords.y / canvasCtx.canvas_rect.height) : null,
      target: domCtx,
      bounding_box: bbox,
      viewport_context: viewportCtx,
      shadow_context: shadowCtx,
      issue_type_hint: issueHint,
      renderer_type: rendererType,
      screenshot: { method: null, data_url: null },
      diagnostics: { console_errors: window.__PIXELMARK__.consoleErrors.slice(), network_errors: window.__PIXELMARK__.networkErrors.slice(), browser: browserInfo },
    };
    return payload;
  }

  // ─── Interaction Model ───────────────────────────────────────────────────
  function toggleFeedbackMode(state) {
    feedbackModeActive = typeof state === 'boolean' ? state : !feedbackModeActive;
    updateFeedbackModeUI();
    if (feedbackModeActive) hoverInspector.start(); else hoverInspector.stop();
  }

  // Keyboard shortcut – Alt+Shift+F
  window.addEventListener('keydown', (e) => {
    if (e.altKey && e.shiftKey && e.key.toLowerCase() === 'f') {
      e.preventDefault();
      toggleFeedbackMode();
    }
  });

  // Main capture handler – wired to click events when appropriate
  function handleFeedbackCapture(e) {
    try {
      const isAlt = e.altKey;
      const isMode = feedbackModeActive;
      console.log("[PixelMark Pins] click captured. feedbackModeActive=" + feedbackModeActive + ", altKey=" + e.altKey);
      if (!isAlt && !isMode) return;
      
      const now = Date.now();
      if (window.__lastFeedbackTime && (now - window.__lastFeedbackTime < 600)) return; // throttle
      window.__lastFeedbackTime = now;
      
      const target = e.composedPath?.()[0] || e.target;
      if (!target) return;
      if (isPixelMarkOwnedNode(target)) return; // prevent self-capture
      
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

      // Synchronous DOM Snapshots (PART 2 & PART 3)
      const startMs = performance.now();
      const domSnapshot = serializeDOMSnapshot(target);
      const canvasDomSnapshot = isCanvas ? serializeCanvasDOMSnapshot(target, rendererType) : null;
      const domSnapshotStr = JSON.stringify(domSnapshot || {});
      const domSnapshotKb = (domSnapshotStr.length / 1024).toFixed(2);
      console.log(`[PixelMark Capture] domsnapshot size: ${domSnapshotKb}kb`);

      let canvasCtx = null;
      if (isCanvas) {
        const canvasBbox = target.getBoundingClientRect();
        const gl = target.getContext("webgl") || target.getContext("webgl2") || target.getContext("experimental-webgl");
        let baseCtx = {};
        if (rendererType === "threejs" || window.THREE || target.__three) {
          baseCtx = getThreeJSContext(e, target);
        } else if (gl) {
          baseCtx = getWebGLContext(e, target) || {};
        }
        canvasCtx = {
          ...baseCtx,
          hit_detail: baseCtx.hit_found ? baseCtx : null,
          type: gl ? "webgl" : "canvas2d",
          canvas_coords: { x: Math.round(clickX - canvasBbox.left), y: Math.round(clickY - canvasBbox.top) },
          canvas_rect: {
            x: Math.round(canvasBbox.x),
            y: Math.round(canvasBbox.y),
            width: Math.round(canvasBbox.width),
            height: Math.round(canvasBbox.height),
            top: Math.round(canvasBbox.top),
            left: Math.round(canvasBbox.left)
          },
          scene_hint: (rendererType === "threejs" || window.THREE || target.__three) ? "Three.js Scene" : gl ? "WebGL Context" : "Canvas 2D Context",
          pixel_ratio: window.devicePixelRatio || 1,
          draw_call_hint: gl ? (gl.getParameter(gl.MAX_DRAW_BUFFERS) || 1) : null
        };
        
        if (!domCtx.css_selector || domCtx.css_selector === "canvas" || domCtx.css_selector.split(" > ").pop() === "canvas") {
          domCtx.css_selector = "visual-canvas-context";
        }
      }

      // Call preventDefault and stopPropagation ONLY after pin data is captured
      e.preventDefault();
      e.stopPropagation();

      const createdVia = isAlt ? "alt_click" : "agent";
      
      // Build canonical payload
      const payload = buildCapturePayload(e, target, canvasCtx);
      payload.domsnapshot = domSnapshot;
      payload.canvasdomsnapshot = canvasDomSnapshot;

      // Initially set screenshot to pending
      payload.screenshot.data_url = 'pending';
      payload.screenshot.method = 'pending';
      
      payload.screenshot_data_url = 'pending';
      payload.screenshotdataurl = 'pending';
      payload.screenshottype = 'pending';
      payload.screenshotttype = 'pending';
      payload.screenshotsource = 'pending';
      payload.screenshottimestamp = new Date().toISOString();
      payload.screenshot_required = true;
      payload.screenshotrequired = true;

      const elapsed = (performance.now() - startMs).toFixed(0);
      console.log(`[PixelMark Capture] payload ready in ${elapsed}ms`);

      // Post message to parent to open feedback drawer (PART 4)
      window.parent.postMessage({
        type: "PIXELMARK_OPEN_FEEDBACK_DRAWER",
        payload: payload,
        
        // Top-level fields for backwards compatibility
        session_id: window.__PIXELMARK__.sessionId,
        sessionid: window.__PIXELMARK__.sessionId,
        page_url: getAbsoluteTargetUrl(),
        pageurl: getAbsoluteTargetUrl(),
        page_title: document.title,
        pagetitle: document.title,
        displayX: clickX,
        displayY: clickY,
        pageX: pageX,
        pageY: pageY,
        viewport_x: clickX,
        viewport_y: clickY,

        // Element context
        element_selector: domCtx.css_selector || "",
        element_text: domCtx.inner_text || "",
        element_tag: domCtx.tag_name || "",
        aria_label: domCtx.aria_label || null,
        aria_role: domCtx.aria_role || null,
        bounding_box: bbox,

        // Issue type hint
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
        norm_x: isCanvas && canvasCtx ? (canvasCtx.canvas_coords.x / canvasCtx.canvas_rect.width) : null,
        norm_y: isCanvas && canvasCtx ? (canvasCtx.canvas_coords.y / canvasCtx.canvas_rect.height) : null,
        canvas_snapshot: null,

        // Screenshot
        screenshot_data_url: payload.screenshot_data_url,
        screenshotdataurl: payload.screenshotdataurl,
        screenshottype: payload.screenshottype,
        screenshotttype: payload.screenshotttype,
        screenshotsource: payload.screenshotsource,
        screenshottimestamp: payload.screenshottimestamp,
        screenshot_required: payload.screenshot_required,
        screenshotrequired: payload.screenshotrequired,

        // Snapshots
        domsnapshot: domSnapshot,
        canvasdomsnapshot: canvasDomSnapshot,

        // Diagnostics
        console_errors: window.__PIXELMARK__.consoleErrors.slice(-10),
        network_errors: window.__PIXELMARK__.networkErrors.slice(-10),

        // Meta
        browser_info: browserInfo,
        created_via: createdVia,
        agent_version: window.__PIXELMARK__.agentVersion,
        timestamp: new Date().toISOString(),
      }, "*");

      // Decoupled screenshot: Trigger async capture in the background
      setTimeout(() => {
        getScreenshotData(target, rendererType).then((result) => {
          window.parent.postMessage({
            type: "PIXELMARK_UPDATE_SCREENSHOT",
            id: payload.id,
            screenshotdataurl: result.dataUrl,
            screenshot_data_url: result.dataUrl,
            screenshottype: result.strategy,
            screenshotttype: result.strategy,
            screenshotsource: result.strategy,
            screenshottimestamp: result.timestamp,
            canvasSnapshot: isCanvas ? result.dataUrl : null
          }, "*");
          console.log(`[PixelMark Capture] background screenshot completed: strategy=${result.strategy}`);
        }).catch((err) => {
          console.error("[PixelMark Capture] background screenshot failed:", err);
          window.parent.postMessage({
            type: "PIXELMARK_UPDATE_SCREENSHOT",
            id: payload.id,
            screenshotdataurl: null,
            screenshot_data_url: null,
            screenshottype: 'failed',
            screenshotttype: 'failed',
            screenshotsource: 'failed',
            screenshottimestamp: new Date().toISOString(),
            canvasSnapshot: null
          }, "*");
        });
      }, 0);

      // Do NOT trigger any overlay UI before the pin is stored
      showClickConfirmation(clickX, clickY);

      console.log(`[PixelMark Pins] created x=${clickX} y=${clickY} source=iframe`);
      console.log("[PixelMark Pins] clicked id=" + payload.id);
      console.log("[PixelMark Pins] drawer opened from pin id=" + payload.id);
    } catch (err) {
      console.error("[PixelMark Agent] handleFeedbackCapture error:", err);
    }
  }

  window.__trackedPins = [];

  function normalizeUrl(url) {
    if (!url) return "";
    try {
      const parsed = new URL(url.indexOf("://") === -1 ? "http://localhost" + url : url);
      return parsed.origin + parsed.pathname.replace(/\/+$/, "").toLowerCase();
    } catch (e) {
      return url.split("?")[0].split("#")[0].replace(/\/+$/, "").toLowerCase();
    }
  }

  function resolveAndSendPins() {
    if (!window.__trackedPins || !window.__trackedPins.length) return;
    const currentUrl = getAbsoluteTargetUrl();

    // Filter pins that belong to the current page
    const pinsToResolve = window.__trackedPins.filter(pin => {
      return normalizeUrl(pin.pageUrl) === normalizeUrl(currentUrl);
    });

    const resolvedPins = pinsToResolve.map(pin => {
      let el = null;
      let resolved = false;
      let clientX = null;
      let clientY = null;
      let source = "none";

      if (pin.selector && pin.selector !== "visual-canvas-context") {
        try { el = document.querySelector(pin.selector); } catch(e) {}
      }
      if (!el && pin.xpath) {
        try {
          const result = document.evaluate(
            pin.xpath,
            document,
            null,
            XPathResult.FIRST_ORDERED_NODE_TYPE,
            null
          );
          el = result.singleNodeValue;
        } catch(e) {}
      }

      if (el instanceof Element) {
        try {
          const rect = el.getBoundingClientRect();
          let relX = 0.5;
          let relY = 0.5;

          const bbox = pin.boundingBox;
          if (bbox && bbox.width && bbox.height) {
            const origLeft = bbox.left !== undefined ? bbox.left : bbox.x || 0;
            const origTop = bbox.top !== undefined ? bbox.top : bbox.y || 0;
            
            const clickVx = pin.viewportX !== undefined ? pin.viewportX : (pin.click?.viewport_x !== undefined ? pin.click.viewport_x : (pin.click?.client_x !== undefined ? pin.click.client_x : null));
            const clickVy = pin.viewportY !== undefined ? pin.viewportY : (pin.click?.viewport_y !== undefined ? pin.click.viewport_y : (pin.click?.client_y !== undefined ? pin.click.client_y : null));

            if (typeof clickVx === 'number' && typeof clickVy === 'number' && !isNaN(clickVx) && !isNaN(clickVy)) {
              relX = (clickVx - origLeft) / bbox.width;
              relY = (clickVy - origTop) / bbox.height;
              relX = Math.max(0, Math.min(1, relX));
              relY = Math.max(0, Math.min(1, relY));
            }
          }

          clientX = rect.left + relX * rect.width;
          clientY = rect.top + relY * rect.height;
          resolved = true;
          source = "element";
        } catch (e) {
          console.error("[PixelMark Agent] failed getBoundingClientRect for element", e);
        }
      }

      if (!resolved && pin.boundingBox) {
        const captureScrollX = pin.scrollPosition?.x || 0;
        const captureScrollY = pin.scrollPosition?.y || 0;
        const width = pin.boundingBox.width || 0;
        const height = pin.boundingBox.height || 0;
        const left = pin.boundingBox.left !== undefined ? pin.boundingBox.left : pin.boundingBox.x || 0;
        const top = pin.boundingBox.top !== undefined ? pin.boundingBox.top : pin.boundingBox.y || 0;

        let relX = 0.5;
        let relY = 0.5;
        
        const clickVx = pin.viewportX !== undefined ? pin.viewportX : (pin.click?.viewport_x !== undefined ? pin.click.viewport_x : (pin.click?.client_x !== undefined ? pin.click.client_x : null));
        const clickVy = pin.viewportY !== undefined ? pin.viewportY : (pin.click?.viewport_y !== undefined ? pin.click.viewport_y : (pin.click?.client_y !== undefined ? pin.click.client_y : null));
        
        if (typeof clickVx === 'number' && typeof clickVy === 'number' && !isNaN(clickVx) && !isNaN(clickVy)) {
          relX = (clickVx - left) / width;
          relY = (clickVy - top) / height;
          relX = Math.max(0, Math.min(1, relX));
          relY = Math.max(0, Math.min(1, relY));
        }

        // Bounding box is viewport-relative at capture time. Subtract scroll delta to get current viewport position.
        const deltaX = window.scrollX - captureScrollX;
        const deltaY = window.scrollY - captureScrollY;
        clientX = (left + relX * width) - deltaX;
        clientY = (top + relY * height) - deltaY;
        resolved = true;
        source = "bbox";
      }

      if (!resolved) {
        // Fallback using page coordinates (x/y in payload) and current scroll
        const pageX = pin.x || 0;
        const pageY = pin.y || 0;
        clientX = pageX - window.scrollX;
        clientY = pageY - window.scrollY;
        resolved = true;
        source = "pagexy";
      }

      return {
        id: pin.id,
        clientX: Math.round(clientX),
        clientY: Math.round(clientY),
        source: source
      };
    });

    console.log(`[PixelMark Agent] Resolved ${resolvedPins.length} pins`);

    window.parent.postMessage({
      type: "PIXELMARK_PINS_RESOLVED",
      resolvedPins: resolvedPins
    }, "*");
  }

  let resolveTimeout = null;
  function throttleResolvePins() {
    if (resolveTimeout) return;
    resolveTimeout = setTimeout(() => {
      resolveTimeout = null;
      resolveAndSendPins();
    }, 16);
  }

  // ─── Attach listeners ─────────────────────────────────────────────────────
  let pointerListenersAttached = false;

  function attachPointerListeners() {
    if (pointerListenersAttached) return;
    pointerListenersAttached = true;

    document.addEventListener("pointerdown", (e) => {
      if (feedbackModeActive) {
        e.stopPropagation();
      }
    }, { passive: true, capture: true });

    // Relay native mousemove events from within the iframe up to the parent
    // so the parent can echo them back to sites that need cross-document mouse tracking.
    // This is intentionally passive and fires only when the pointer is inside the iframe.
    let nativeMoveThrottle = null;
    document.addEventListener('mousemove', (e) => {
      if (feedbackModeActive) return;
      if (nativeMoveThrottle) return;
      nativeMoveThrottle = setTimeout(() => { nativeMoveThrottle = null; }, 16);
      window.parent.postMessage({
        type: 'PIXELMARK_IFRAME_MOUSEMOVE',
        x: e.clientX,
        y: e.clientY
      }, '*');
    }, { passive: true });
  }

  function attachListeners() {
    // Dispatch scroll events to parent so pins can stay anchored to the page
    window.addEventListener('scroll', () => {
      window.parent.postMessage({
        type: 'PIXELMARK_SCROLL',
        scrollX: window.scrollX,
        scrollY: window.scrollY
      }, '*');
      throttleResolvePins();
    }, { passive: true, capture: true });

    window.addEventListener('resize', () => {
      window.parent.postMessage({
        type: 'PIXELMARK_RESIZE',
        width: window.innerWidth,
        height: window.innerHeight
      }, '*');
      throttleResolvePins();
    }, { passive: true });

    // Keyboard shortcut – Ctrl+Z or Cmd+Z for undo
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        const target = e.target;
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
          return;
        }
        e.preventDefault();
        window.parent.postMessage({ type: 'PIXELMARK_UNDO_LAST' }, '*');
      }
    });

    // Attach a MutationObserver to catch layout changes / dynamic shifts
    if (typeof MutationObserver !== 'undefined') {
      const observer = new MutationObserver(throttleResolvePins);
      observer.observe(document.body || document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true
      });
    }

    attachPointerListeners();
  }

  function handleParentMessage(event) {
    const data = event.data;
    if (!data || typeof data !== "object") return;

    if (data.type === "PIXELMARK_TRACK_PINS") {
      window.__trackedPins = data.pins || [];
      resolveAndSendPins();
    }

    // ── Cursor relay — receive parent cursor position and re-emit as real events
    if (data.type === "PIXELMARK_CURSOR_MOVE") {
      if (typeof data.x === 'number' && typeof data.y === 'number') {
        relayCursorEvent(data.x, data.y);
      }
    }

    if (data.type === "PIXELMARK_TOGGLE_MARKER_MODE") {
      feedbackModeActive = !!data.active;
      updateFeedbackModeUI();
      if (feedbackModeActive) hoverInspector.start(); else hoverInspector.stop();
    }

    if (data.type === "PIXELMARK_SET_CONTEXT") {
      if (data.sessionId) {
        window.__PIXELMARK__.sessionId = data.sessionId;
        window.PIXELMARK.sessionId = data.sessionId;
      }
      if (data.pageUrl) {
        window.__PIXELMARK__.pageUrl = data.pageUrl;
        window.PIXELMARK.pageUrl = data.pageUrl;
      }
    }

    if (data.type === "PIXELMARK_TRIGGER_FRAME_CAPTURE") {
      (async () => {
        const canvases = document.querySelectorAll("canvas");
        let screenshotDataUrl = null;
        let canvasCtx = null;
        let target = document.body;
        
        if (canvases.length > 0) {
          let largestCanvas = canvases[0];
          let largestArea = largestCanvas.width * largestCanvas.height;
          for (const c of canvases) {
            const area = c.width * c.height;
            if (area > largestArea) {
              largestCanvas = c;
              largestArea = area;
            }
          }
          target = largestCanvas;
          try { screenshotDataUrl = largestCanvas.toDataURL("image/png"); } catch (_) {}
          
          const bbox = largestCanvas.getBoundingClientRect();
          const gl = largestCanvas.getContext("webgl") || largestCanvas.getContext("webgl2") || largestCanvas.getContext("experimental-webgl");
          canvasCtx = {
            type: gl ? "webgl" : "canvas2d",
            canvas_coords: { x: Math.round(window.innerWidth / 2 - bbox.left), y: Math.round(window.innerHeight / 2 - bbox.top) },
            canvas_rect: {
              x: Math.round(bbox.x),
              y: Math.round(bbox.y),
              width: Math.round(bbox.width),
              height: Math.round(bbox.height),
              top: Math.round(bbox.top),
              left: Math.round(bbox.left)
            },
            scene_hint: gl ? "WebGL Context" : "Canvas 2D Context",
            pixel_ratio: window.devicePixelRatio || 1,
            draw_call_hint: gl ? (gl.getParameter(gl.MAX_DRAW_BUFFERS) || 1) : null
          };
        } else {
          screenshotDataUrl = await captureScreenshot(target);
        }
        
        const payload = {
          id: crypto.randomUUID(),
          session_id: window.__PIXELMARK__.sessionId,
          pageurl: getAbsoluteTargetUrl(),
          page_url: getAbsoluteTargetUrl(),
          page_title: document.title,
          created_via: "fallback",
          click: { page_x: Math.round(window.innerWidth / 2 + window.scrollX), page_y: Math.round(window.innerHeight / 2 + window.scrollY), viewport_x: 0.5, viewport_y: 0.5, client_x: Math.round(window.innerWidth / 2), client_y: Math.round(window.innerHeight / 2) },
          displayX: Math.round(window.innerWidth / 2),
            displayY: Math.round(window.innerHeight / 2),
            pageX: Math.round(window.innerWidth / 2 + window.scrollX),
            pageY: Math.round(window.innerHeight / 2 + window.scrollY),
          viewport_x: Math.round(window.innerWidth / 2),
          viewport_y: Math.round(window.innerHeight / 2),
          canvas_context: canvasCtx,
          norm_x: canvasCtx ? (canvasCtx.canvas_coords.x / canvasCtx.canvas_rect.width) : null,
          norm_y: canvasCtx ? (canvasCtx.canvas_coords.y / canvasCtx.canvas_rect.height) : null,
          target: { xpath: "", css_selector: "visual-canvas-context", inner_text: "Captured Frame Viewport", tag_name: "CANVAS", element_id: null, class_list: [], is_visible: true, computed_role: null, aria_label: null, aria_role: null, placeholder: null },
          bounding_box: getBoundingBox(target),
          viewport_context: getViewportContext(),
          shadow_context: { is_inside_shadow_dom: false, shadow_root_depth: 0, shadow_host_tag: null, shadow_host_id: null, shadow_host_class_list: null, shadow_path: null },
          issue_type_hint: "canvas_webgl",
          renderer_type: window.__PIXELMARK__.rendererType,
          screenshot: { method: 'fallback', data_url: screenshotDataUrl },
          diagnostics: { console_errors: window.__PIXELMARK__.consoleErrors.slice(), network_errors: window.__PIXELMARK__.networkErrors.slice(), browser: getBrowserInfo() },
        };

        window.parent.postMessage({
          type: "PIXELMARK_OPEN_FEEDBACK_DRAWER",
          payload: payload,
          session_id: window.__PIXELMARK__.sessionId,
          sessionid: window.__PIXELMARK__.sessionId,
          page_url: getAbsoluteTargetUrl(),
          pageurl: getAbsoluteTargetUrl(),
          page_title: document.title,
          pagetitle: document.title,
          displayX: Math.round(window.innerWidth / 2),
            displayY: Math.round(window.innerHeight / 2),
            pageX: Math.round(window.innerWidth / 2 + window.scrollX),
            pageY: Math.round(window.innerHeight / 2 + window.scrollY),
          viewport_x: Math.round(window.innerWidth / 2),
          viewport_y: Math.round(window.innerHeight / 2),
          element_selector: "visual-canvas-context",
          element_text: "Captured Frame Viewport",
          element_tag: "CANVAS",
          aria_label: null,
          aria_role: null,
          bounding_box: getBoundingBox(target),
          issue_type_hint: "canvas_webgl",
          xpath: "",
          viewport: getViewportContext().viewport,
          scroll_position: getViewportContext().scroll_position,
          renderer_type: window.__PIXELMARK__.rendererType,
          canvas_context: canvasCtx,
          norm_x: canvasCtx ? (canvasCtx.canvas_coords.x / canvasCtx.canvas_rect.width) : null,
          norm_y: canvasCtx ? (canvasCtx.canvas_coords.y / canvasCtx.canvas_rect.height) : null,
          canvas_snapshot: screenshotDataUrl,
          screenshot_data_url: screenshotDataUrl,
          screenshot_required: !!screenshotDataUrl,
          console_errors: window.__PIXELMARK__.consoleErrors.slice(-10),
          network_errors: window.__PIXELMARK__.networkErrors.slice(-10),
          browser_info: getBrowserInfo(),
          created_via: "fallback",
          agent_version: window.__PIXELMARK__.agentVersion,
          timestamp: new Date().toISOString(),
        }, "*");
      })();
    }

    window.addEventListener('pixelmark:navigation', (e) => {
      const logicalTargetUrl = e.detail?.logicalTargetUrl;
      if (!logicalTargetUrl) return;
      try {
        console.log("[PixelMark NAV] logicalTargetUrl=" + logicalTargetUrl);

        const targetUrlObj = new URL(logicalTargetUrl);
        const sessionUrlObj = new URL(window.__PIXELMARK_TARGET_URL__);
        if (targetUrlObj.host !== sessionUrlObj.host) {
          return;
        }

        window.parent.postMessage({
          type: 'PIXELMARK_NAV',
          pageurl: logicalTargetUrl,
          page_url: logicalTargetUrl,
          pagetitle: document.title,
          page_title: document.title,
          sessionid: window.PIXELMARK.sessionId,
          session_id: window.PIXELMARK.sessionId,
          referrerurl: window.lastpageurl || window.__PIXELMARK_TARGET_URL__,
          referrer_url: window.lastpageurl || window.__PIXELMARK_TARGET_URL__,
          isspa: true,
          is_spa: true
        }, '*');

        window.lastpageurl = logicalTargetUrl;
        window.PIXELMARK.pageUrl = logicalTargetUrl;
        window.__PIXELMARK__.pageUrl = logicalTargetUrl;
      } catch (err) {
        console.error("[PixelMark NAV] Error handling navigation event", err);
      }
    });
  }

  // ─── DOMContentLoaded init ────────────────────────────────────────────────
  function getAbsoluteTargetUrl() {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlParam = params.get('url');
      if (urlParam) {
        return new URL(urlParam).href;
      }
    } catch (_) {}
    if (window.PIXELMARK && window.PIXELMARK.pageUrl) {
      return window.PIXELMARK.pageUrl;
    }
    if (window.__PIXELMARK_TARGET_URL__) {
      return window.__PIXELMARK_TARGET_URL__;
    }
    return TARGETURL;
  }

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

      // Resolve URL absolutely relative to target base URL
      const targetBase = getAbsoluteTargetUrl();
      let resolvedUrl;
      try {
        resolvedUrl = new URL(hrefStripped, targetBase).href;
      } catch (_) {
        return;
      }
      
      // Determine if it is internal to the proxied application
      const targetHost = new URL(resolvedUrl).host;
      const originalHost = new URL(targetBase).host;
      const isInternal = targetHost === originalHost;

      if (isInternal) {
        window.parent.postMessage({
          type: "PIXELMARK_NAV",
          page_url: resolvedUrl,
          pageurl: resolvedUrl,
          page_title: document.title || "",
          pagetitle: document.title || "",
          session_id: window.__PIXELMARK__.sessionId || "",
          sessionid: window.__PIXELMARK__.sessionId || "",
          referrer_url: window.lastpageurl || targetBase,
          referrerurl: window.lastpageurl || targetBase,
          isspa: false,
          is_spa: false
        }, "*");
        window.lastpageurl = resolvedUrl;
        window.PIXELMARK.pageUrl = resolvedUrl;
        window.__PIXELMARK__.pageUrl = resolvedUrl;
      }
    }, true);
  }

  function postRendererDetected(rendererType) {
    const canvases = document.querySelectorAll("canvas");
    const hasThree = typeof THREE !== "undefined" || !!window.__PIXELMARK__?.threeRenderer || !!window.__r3f;
    const hasPixi = typeof PIXI !== "undefined" || !!window.PIXI;
    const hasBabylon = typeof BABYLON !== "undefined" || !!window.BABYLON;
    const hasPhaser = typeof Phaser !== "undefined" || !!window.Phaser;
    const hasPlayCanvas = typeof pc !== "undefined" || !!window.pc;
    const threeDetected = hasThree || hasPixi || hasBabylon || hasPhaser || hasPlayCanvas;

    window.parent.postMessage({
      type: "PIXELMARK_RENDERER_DETECTED",
      renderer_type: rendererType,
      has_canvas: canvases.length > 0,
      canvas_count: canvases.length,
      raf_detected: rAFActive || (rAFCount > 3),
      three_detected: threeDetected,
      session_id: window.__PIXELMARK__.sessionId || ""
    }, "*");
  }

  function dispatchLayoutEvents() {
    window.dispatchEvent(new Event('resize'));
    document.dispatchEvent(new Event('visibilitychange'));
  }

  function initializeAgentListeners() {
    if (isAgentReady) return;
    isAgentReady = true;
    attachListeners();
    
    // Process any queued feedback mode toggles
    if (typeof window.__pendingToggle !== 'undefined') {
      feedbackModeActive = window.__pendingToggle;
      delete window.__pendingToggle;
      updateFeedbackModeUI();
      if (feedbackModeActive) hoverInspector.start(); else hoverInspector.stop();
    }
    
    dispatchLayoutEvents();
    window.dispatchEvent(new Event('resize'));
  }

  let isAgentReady = false;

  window.addEventListener("beforeunload", () => {
    console.log("[PixelMark PAGEUNLOAD] logicalTargetUrl=" + getAbsoluteTargetUrl());
    window.parent.postMessage({
      type: "PIXELMARK_PAGE_UNLOAD",
      fromUrl: getAbsoluteTargetUrl(),
      fromurl: getAbsoluteTargetUrl(),
    }, "*");
  });

  document.addEventListener("DOMContentLoaded", () => {
    window.__PIXELMARK__.rendererType = detectRenderer();
    discoverThreeScene();
    setupNavigationInterceptor();

    console.log("[PixelMark PAGELOAD] logicalTargetUrl=" + getAbsoluteTargetUrl());
    window.parent.postMessage({
      type: "PIXELMARK_PAGE_LOAD",
      url: getAbsoluteTargetUrl(),
      pageurl: getAbsoluteTargetUrl(),
      title: document.title,
      rendererType: window.__PIXELMARK__.rendererType,
      scrollX: window.scrollX,
      scrollY: window.scrollY,
    }, "*");

    const currentRenderer = window.__PIXELMARK__.rendererType;
    postRendererDetected(currentRenderer);

    // Check if it's a heavy render page (contains canvas or WebGL renderer)
    const isHeavyPage = (currentRenderer !== "dom" && currentRenderer !== "spa") || 
                         document.querySelector("canvas") !== null;

    if (isHeavyPage) {
      if (window.requestIdleCallback) {
        window.requestIdleCallback(() => {
          setTimeout(initializeAgentListeners, 1000);
        });
      } else {
        setTimeout(initializeAgentListeners, 2000);
      }
    } else {
      if (window.requestIdleCallback) {
        window.requestIdleCallback(() => {
          initializeAgentListeners();
        });
      } else {
        setTimeout(initializeAgentListeners, 100);
      }
    }

    // Run detection again after 2000ms to catch late rendering elements
    setTimeout(() => {
      const lateRenderer = detectRenderer();
      postRendererDetected(lateRenderer);
    }, 2000);

    // Periodic renderer type checks (useful for late-initialized WebGL canvases)
    let lastDetectedType = window.__PIXELMARK__.rendererType;
    setInterval(() => {
      const currentType = detectRenderer();
      if (currentType !== lastDetectedType) {
        lastDetectedType = currentType;
        window.__PIXELMARK__.rendererType = currentType;
        postRendererDetected(currentType);
      }
    }, 1000);
  });

  // ─── Immediate Event Listener Registration ──────────────────────────────
  // We register both message and click capture listeners immediately upon script execution.
  // This bypasses any delays from heavy-rendering detection or DOMContentLoaded.
  document.addEventListener("click", handleFeedbackCapture, true);
  window.addEventListener("message", handleParentMessage, false);

  // Dispatch layout events immediately on script injection
  dispatchLayoutEvents();

  // Retry Three.js discovery and layout hints after dynamic load
  setTimeout(() => {
    discoverThreeScene();
    dispatchLayoutEvents();
  }, 500);

  setTimeout(() => {
    discoverThreeScene();
    dispatchLayoutEvents();
  }, 1500);

  setTimeout(() => {
    discoverThreeScene();
    dispatchLayoutEvents();
  }, 3000);

})();
