// public/overlay.js
;(function () {
  'use strict'

  var scriptEl   = document.currentScript
  var PROJECT_ID = (scriptEl && scriptEl.getAttribute('data-project')) || ''
  var API_BASE   = (scriptEl && scriptEl.getAttribute('data-api'))     || 'http://localhost:8765'

  if (!PROJECT_ID) {
    console.warn('[Overlay] No data-project — markers disabled')
    return
  }

  var ctrlHeld    = false
  var markerCount = 0

  // ── Styles ──────────────────────────────────────────────────────────────
  var style = document.createElement('style')
  style.textContent = [
    '.ex-highlight {',
    '  outline: 2px dashed #a855f7 !important;',
    '  outline-offset: 3px !important;',
    '  cursor: crosshair !important;',
    '  background: rgba(168,85,247,0.06) !important;',
    '}',
    '.ex-marker {',
    '  position: fixed; z-index: 2147483647;',
    '  width: 26px; height: 26px; border-radius: 50%;',
    '  background: #a855f7; border: 2.5px solid #fff;',
    '  color: #fff; font-size: 11px; font-weight: 700;',
    '  display: flex; align-items: center; justify-content: center;',
    '  font-family: monospace; pointer-events: none;',
    '  box-shadow: 0 2px 12px rgba(168,85,247,0.7);',
    '  transform: scale(0); animation: ex-pop 0.2s ease forwards;',
    '}',
    '@keyframes ex-pop {',
    '  0%   { transform: scale(0); opacity: 0; }',
    '  70%  { transform: scale(1.2); }',
    '  100% { transform: scale(1); opacity: 1; }',
    '}',
  ].join('\n')
  document.head.appendChild(style)

  // ── Helpers ──────────────────────────────────────────────────────────────
  function getSelector(el) {
    if (!el || el.nodeType !== 1) return 'unknown'
    if (el.id) return '#' + el.id
    var testid = el.getAttribute('data-testid')
    if (testid) return '[data-testid="' + testid + '"]'
    var name = el.getAttribute('name')
    if (name) return el.tagName.toLowerCase() + '[name="' + name + '"]'
    var classes = []
    for (var i = 0; i < el.classList.length && i < 3; i++) {
      if (el.classList[i].length < 50) classes.push(el.classList[i])
    }
    var base = el.tagName.toLowerCase()
    return classes.length ? base + '.' + classes.join('.') : base
  }

  function getXPath(el) {
    if (!el || el === document.body) return '/html/body'
    var parts = []
    while (el && el.nodeType === 1) {
      var idx = 1
      var sib = el.previousSibling
      while (sib) {
        if (sib.nodeType === 1 && sib.tagName === el.tagName) idx++
        sib = sib.previousSibling
      }
      parts.unshift(el.tagName.toLowerCase() + '[' + idx + ']')
      el = el.parentNode
    }
    return '/' + parts.join('/')
  }

  function postUp(data) {
    try {
      window.parent.postMessage({ source: 'pixelmark-overlay', ...data }, '*')
    } catch(e) {
      console.warn('[Overlay] postMessage failed:', e)
    }
  }

  function dropMarker(x, y, num) {
    var dot = document.createElement('div')
    dot.className   = 'ex-marker'
    dot.textContent = String(num)
    dot.style.left  = (x - 13) + 'px'
    dot.style.top   = (y - 13) + 'px'
    document.body.appendChild(dot)
    return dot
  }

  // ── Renderer Detection ───────────────────────────────────────────────────
  function detectRenderer() {
    var hasCanvas = false;
    var canvasCount = 0;
    var isWebGL = false;
    var isWebGL2 = false;
    var rafDetected = false;
    var threeDetected = false;

    // Check globals
    if (window.THREE || window.BABYLON || window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
      threeDetected = true;
    }

    // Check canvases
    var canvases = document.querySelectorAll('canvas');
    canvasCount = canvases.length;
    if (canvasCount > 0) {
      for (var i = 0; i < canvases.length; i++) {
        var c = canvases[i];
        if (c.width > 0 && c.height > 0) {
          hasCanvas = true;
          // Heuristic: if it looks like a large canvas, check for webgl
          if (c.width > 300 || c.height > 300) {
            var gl = null;
            try { gl = c.getContext('webgl2'); if (gl) isWebGL2 = true; } catch(e) {}
            if (!gl) {
              try { gl = c.getContext('webgl') || c.getContext('experimental-webgl'); if (gl) isWebGL = true; } catch(e) {}
            }
          }
        }
      }
    }

    var rendererType = 'dom';
    if (isWebGL2) rendererType = 'webgl2';
    else if (isWebGL) rendererType = 'webgl';
    else if (hasCanvas || threeDetected) rendererType = 'canvas2d';

    // If there's a lot of DOM but also a canvas, call it mixed
    if (rendererType !== 'dom' && document.querySelectorAll('*').length > 100) {
      rendererType = 'mixed';
    }

    var info = {
      rendererType: rendererType,
      hasCanvas: hasCanvas,
      canvasCount: canvasCount,
      rafDetected: rafDetected,
      threeDetected: threeDetected
    };

    window.__PIXELMARK__ = window.__PIXELMARK__ || {};
    window.__PIXELMARK__.rendererInfo = info;

    postUp({ type: 'PIXELMARK_RENDERER_DETECTED', ...info });
    return info;
  }

  // ── Setup Listeners ──────────────────────────────────────────────────────
  function setupListeners() {
    // Keyboard
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Control' || e.key === 'Meta') {
      ctrlHeld = true
      document.body.style.cursor = 'crosshair'
    }
  })

  document.addEventListener('keyup', function(e) {
    if (e.key === 'Control' || e.key === 'Meta') {
      ctrlHeld = false
      document.body.style.cursor = ''
      document.querySelectorAll('.ex-highlight').forEach(function(el) {
        el.classList.remove('ex-highlight')
      })
    }
  })

  // ── Hover ────────────────────────────────────────────────────────────────
  document.addEventListener('mouseover', function(e) {
    if (!ctrlHeld || !e.target || e.target === document.body) return
    document.querySelectorAll('.ex-highlight').forEach(function(el) {
      el.classList.remove('ex-highlight')
    })
    e.target.classList.add('ex-highlight')
  }, { passive: true })

  // ── Click ────────────────────────────────────────────────────────────────
  document.addEventListener('click', function(e) {
    if (!ctrlHeld) return
    e.preventDefault()
    e.stopPropagation()

    markerCount++
    var el = e.target
    var rect = el ? el.getBoundingClientRect() : null
    
    // Check if inside shadow DOM
    var isShadow = false
    var rootNode = el ? el.getRootNode() : null
    if (rootNode instanceof ShadowRoot) {
      isShadow = true
    }

    // Attempt to detect basic canvas if clicked directly on canvas
    var rendererType = 'dom'
    var canvasId = null
    var isCanvas = el && el.tagName && el.tagName.toLowerCase() === 'canvas'
    
    // Enriched canvas metadata
    var canvasW = null, canvasH = null, dpr = null, glRenderer = null, screenshotUrl = null;

    if (isCanvas) {
      rendererType = window.__PIXELMARK__?.rendererInfo?.rendererType || 'canvas2d'
      if (rendererType === 'dom' || rendererType === 'mixed') rendererType = 'canvas2d' // Override if directly on canvas
      canvasId = el.id || null
      canvasW = el.width
      canvasH = el.height
      dpr = window.devicePixelRatio || 1

      // Try to extract WebGL info
      try {
        var gl = el.getContext('webgl2') || el.getContext('webgl') || el.getContext('experimental-webgl');
        if (gl) {
          var debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
          if (debugInfo) {
            glRenderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
          }
        }
      } catch (e) {
        console.debug('[Overlay] WebGL parameter extraction failed', e)
      }

      // Try to capture image (only if not tainted)
      try {
        screenshotUrl = el.toDataURL('image/png', 0.8);
      } catch (e) {
        console.debug('[Overlay] Canvas is tainted, skipping screenshot capture')
      }
    } else if (isShadow) {
      rendererType = 'shadow-dom'
    }

    var offsetXRatio = null
    var offsetYRatio = null
    if (rect && rect.width > 0 && rect.height > 0) {
      offsetXRatio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
      offsetYRatio = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height))
    }

    // dropMarker(e.clientX, e.clientY, markerCount) // Let the parent render via React overlay now
    if (el) el.classList.remove('ex-highlight')

    var payload = {
      type: 'PIXELMARK_CREATE_MARKER',
      markerNumber: markerCount,
      projectId: PROJECT_ID,
      anchor_kind: isCanvas ? 'canvas-relative' : 'dom-relative',
      renderer_type: rendererType,
      target_selector: getSelector(el),
      target_xpath: getXPath(el),
      dom_text_excerpt: el ? (el.innerText || '').slice(0, 120).trim() : null,
      offset_x_ratio: offsetXRatio,
      offset_y_ratio: offsetYRatio,
      viewport_x: e.clientX,
      viewport_y: e.clientY,
      page_x: e.pageX,
      page_y: e.pageY,
      viewport_width: window.innerWidth,
      viewport_height: window.innerHeight,
      scroll_x: window.scrollX,
      scroll_y: window.scrollY,
      page_url: window.location.href,
      page_title: document.title,
      canvas_id: canvasId,
      canvas_width: canvasW,
      canvas_height: canvasH,
      device_pixel_ratio: dpr,
      webgl_renderer_string: glRenderer,
      screenshot_url: screenshotUrl,
      element_rect_json: rect ? {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
        right: rect.right,
        bottom: rect.bottom
      } : null
    }

    postUp(payload)
  }, { capture: true, passive: false })

    console.log('[Overlay] ✓ Listeners bound')
  }

  // ── Boot Sequence ────────────────────────────────────────────────────────
  function boot() {
    var rInfo = detectRenderer();
    var isHeavy = rInfo.rendererType !== 'dom';

    if (isHeavy) {
      console.log('[Overlay] Heavy renderer detected (' + rInfo.rendererType + '), delaying agent boot by 1.2s to prevent jank');
      var delayedInit = function() {
        setupListeners();
        // Fire a resize event to help canvases realign to the iframe bounds after boot
        window.dispatchEvent(new Event('resize'));
      };
      
      if (window.requestIdleCallback) {
        setTimeout(function() {
          window.requestIdleCallback(delayedInit);
        }, 1200);
      } else {
        setTimeout(delayedInit, 1200);
      }
    } else {
      setupListeners();
    }
    
    // Re-run detection at 1.5s to catch lazy-loaded React/Three.js roots
    setTimeout(detectRenderer, 1500);
  }

  // Wait for DOM load if necessary
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  console.log('[Overlay] ✓ Ready — project:', PROJECT_ID)
})()
