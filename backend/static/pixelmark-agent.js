(function() {
  if (window.__PIXELMARK_INSTALLED__) return;
  window.__PIXELMARK_INSTALLED__ = true;

  // Initialize global namespace safely
  window.__PIXELMARK__ = window.__PIXELMARK__ || {};
  window.__PIXELMARK__.consoleErrors = [];
  window.__PIXELMARK__.networkErrors = [];
  window.__PIXELMARK__.rendererType = "dom";

  // Circular buffers of size 20
  function pushCircular(arr, item) {
    arr.push(item);
    if (arr.length > 20) {
      arr.shift();
    }
  }

  // Intercept Console Errors
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

  // Intercept Network Errors (Fetch & XHR)
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

  const originalXHROpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, ...args) {
    this._method = method;
    return originalXHROpen.apply(this, [method, ...args]);
  };

  // Detect Renderer type
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

  // Three.js automatic scene discoverer
  function discoverThreeScene() {
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
      
      if (obj && obj.renderer?.isWebGLRenderer) window.__PIXELMARK__.threeRenderer = obj.renderer;
      if (obj && obj.scene?.isScene) window.__PIXELMARK__.threeScene = obj.scene;
      if (obj && obj.camera?.isCamera) window.__PIXELMARK__.threeCamera = obj.camera;
    }
    
    document.querySelectorAll("canvas").forEach(c => {
      if (c.__three?.renderer) window.__PIXELMARK__.threeRenderer = c.__three.renderer;
      if (c.__three?.scene) window.__PIXELMARK__.threeScene = c.__three.scene;
      if (c.__three?.camera) window.__PIXELMARK__.threeCamera = c.__three.camera;
    });
  }

  // XPath builder
  function getXPath(element) {
    if (!element) return "";
    if (element.id) {
      return `//*[@id="${element.id}"]`;
    }
    if (element === document.body) {
      return "/html/body";
    }
    let ix = 0;
    const siblings = element.parentNode ? element.parentNode.childNodes : [];
    for (let i = 0; i < siblings.length; i++) {
      const sibling = siblings[i];
      if (sibling === element) {
        return getXPath(element.parentNode) + '/' + element.tagName.toLowerCase() + '[' + (ix + 1) + ']';
      }
      if (sibling.nodeType === 1 && sibling.tagName === element.tagName) {
        ix++;
      }
    }
    return "";
  }

  // CSS selector builder
  function getCSSSelector(element) {
    if (!element) return "";
    if (element.id) return `#${element.id}`;
    const path = [];
    let current = element;
    while (current && current.nodeType === Node.ELEMENT_NODE) {
      let selector = current.nodeName.toLowerCase();
      if (current.className) {
        const classes = Array.from(current.classList).join('.');
        if (classes) {
          selector += '.' + classes;
        }
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

  // getDOMContext
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
    };
  }

  // Viewport context
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

  // Dynamic html2canvas screenshot regional crops
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
      const canvas = await html2canvas(document.body, {
        logging: false,
        useCORS: true,
        allowTaint: true
      });
      const rect = element.getBoundingClientRect();
      const cropCanvas = document.createElement("canvas");
      cropCanvas.width = 400;
      cropCanvas.height = 300;
      const ctx = cropCanvas.getContext("2d");
      if (ctx) {
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const startX = Math.max(0, centerX - 200);
        const startY = Math.max(0, centerY - 150);
        ctx.drawImage(
          canvas,
          startX,
          startY,
          400,
          300,
          0,
          0,
          400,
          300
        );
        return cropCanvas.toDataURL("image/png");
      }
      return canvas.toDataURL("image/png");
    } catch (err) {
      console.warn("Screenshot capture failed:", err);
      return null;
    }
  }

  // 3D Three.js Context
  function getThreeJSContext(e, canvas) {
    const renderer = window.__PIXELMARK__.threeRenderer;
    const scene = window.__PIXELMARK__.threeScene;
    const camera = window.__PIXELMARK__.threeCamera;

    if (!renderer || !scene || !camera || typeof THREE === "undefined") {
      // Dynamic fallback
      return {
        type: "threejs",
        canvas_coords: { x: e.clientX, y: e.clientY },
        hit_found: false,
        detail: "Three.js dependencies or structures not resolved globally"
      };
    }

    const rect = canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
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

  // WebGL Context
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
      gl_program_count: null,
      max_texture_size: gl.getParameter(gl.MAX_TEXTURE_SIZE),
      active_texture_units: gl.getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS),
    };
  }

  // Pulse effect
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
    const style = document.createElement("style");
    style.innerHTML = `
      @keyframes pm-pulse {
        0% { transform: scale(0.5); opacity: 1; }
        100% { transform: scale(2); opacity: 0; }
      }
    `;
    document.body.appendChild(dot);
    document.body.appendChild(style);
    setTimeout(() => {
      dot.remove();
      style.remove();
    }, 700);
  }

  // Unload notifier
  window.addEventListener("beforeunload", () => {
    window.parent.postMessage({
      type: "PIXELMARK_PAGE_UNLOAD",
      fromUrl: window.location.href,
    }, "*");
  });

  // Initialization lifecycle
  document.addEventListener("DOMContentLoaded", () => {
    window.__PIXELMARK__.rendererType = detectRenderer();
    discoverThreeScene();
    
    // Page load event
    window.parent.postMessage({
      type: "PIXELMARK_PAGE_LOAD",
      url: window.location.href,
      title: document.title,
      rendererType: window.__PIXELMARK__.rendererType,
    }, "*");

    // Hook listeners for DOM click markers
    document.addEventListener("click", async (e) => {
      if (!e.ctrlKey) return;
      
      const target = e.target;
      if (!target || target.tagName === "CANVAS") return; // Canvas has separate click listener
      
      e.preventDefault();
      e.stopPropagation();

      const domCtx = getDOMContext(target);
      const viewCtx = getViewportContext();
      const screenshot = await captureScreenshot(target);

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
    }, true);

    // Canvas unified listener
    document.querySelectorAll("canvas").forEach(canvas => {
      canvas.addEventListener("click", async (e) => {
        if (!e.ctrlKey) return;
        
        e.preventDefault();
        e.stopPropagation();

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
        let screenshot = null;
        try {
          screenshot = canvas.toDataURL("image/png");
        } catch (err) {
          console.warn("Canvas directly tainted, no screenshot captured.");
        }

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
      }, true);
    });
  });

  // Short delay scene discovery to capture dynamic canvasses
  setTimeout(() => {
    discoverThreeScene();
  }, 300);

})();
