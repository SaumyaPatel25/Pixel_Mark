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
        try {
          const gl2 = canvas.getContext("webgl2");
          if (gl2) {
            hasActiveWebGLContext = true;
            activeWebGL2Context = true;
          } else {
            const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
            if (gl) {
              hasActiveWebGLContext = true;
            } else {
              const ctx = canvas.getContext("2d");
              if (ctx) hasCanvas2D = true;
            }
          }
        } catch (e) {}
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
    const isHeavy = window.__PIXELMARK__.rendererType && window.__PIXELMARK__.rendererType !== "dom";
    if (isHeavy) {
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
  function buildCapturePayload(event, target) {
    const clickX = event.clientX, clickY = event.clientY;
    const pageX = Math.round(clickX + window.scrollX), pageY = Math.round(clickY + window.scrollY);
    const viewport = { width: window.innerWidth, height: window.innerHeight };
    const viewportX = clickX / viewport.width, viewportY = clickY / viewport.height;
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
      click: { page_x: pageX, page_y: pageY, viewport_x: viewportX, viewport_y: viewportY, client_x: clickX, client_y: clickY },
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
  async function handleFeedbackCapture(e) {
    const isAlt = e.altKey && !feedbackModeActive;
    const isMode = feedbackModeActive && !e.altKey;
    const isBoth = e.altKey && feedbackModeActive;
    if (!isAlt && !isMode && !isBoth) return;
    
    const now = Date.now();
    if (window.__lastFeedbackTime && (now - window.__lastFeedbackTime < 600)) return; // throttle
    window.__lastFeedbackTime = now;
    
    e.preventDefault();
    e.stopPropagation();
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

    let screenshotDataUrl = null;
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
      
      try { screenshotDataUrl = target.toDataURL("image/png"); } catch (_) {}
      
      if (!domCtx.css_selector || domCtx.css_selector === "canvas" || domCtx.css_selector.split(" > ").pop() === "canvas") {
        domCtx.css_selector = "visual-canvas-context";
      }
    } else {
      screenshotDataUrl = await captureScreenshot(target);
    }

    showClickConfirmation(clickX, clickY);

    const createdVia = isAlt ? "alt_click" : "agent";
    const payload = buildCapturePayload(e, target);
    
    if (screenshotDataUrl) {
      payload.screenshot.method = isCanvas ? 'toDataURL' : 'html2canvas';
      payload.screenshot.data_url = screenshotDataUrl;
    } else {
      payload.screenshot.method = 'none';
    }

    pinManager.createPin(payload);

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
      canvas_snapshot: isCanvas ? screenshotDataUrl : null,

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

  // ─── Attach listeners ─────────────────────────────────────────────────────
  let pointerListenersAttached = false;

  function attachPointerListeners() {
    if (pointerListenersAttached) return;
    pointerListenersAttached = true;

    document.addEventListener("pointerdown", (e) => {
      if (e.altKey || feedbackModeActive) {
        e.stopPropagation();
      }
    }, { passive: true, capture: true });

    document.addEventListener("click", handleFeedbackCapture, true);
  }

  function attachListeners() {
    attachPointerListeners();

    window.addEventListener("message", (event) => {
      const data = event.data;
      if (!data || typeof data !== "object") return;

      if (data.type === "PIXELMARK_TOGGLE_MARKER_MODE") {
        if (!isAgentReady) {
          window.__pendingToggle = !!data.active;
          return;
        }
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
            x: Math.round(window.innerWidth / 2 + window.scrollX),
            y: Math.round(window.innerHeight / 2 + window.scrollY),
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
    });

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
