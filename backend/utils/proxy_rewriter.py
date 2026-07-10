import urllib.parse
import re
import os
import logging
import json

logger = logging.getLogger("pixelmark.proxy_rewriter")


# ── STEP 1 ────────────────────────────────────────────────────────────────────
def inject_bootstrap(html: str, page_url: str, session_id: str, proxy_base_url: str, api_base: str) -> str:
    """
    Injects a bootstrap script as the FIRST <script> inside <head>.
    If <head> exists, prepend to head. If missing, create one.
    Exposes __PIXELMARK_SESSION_ID__, __PIXELMARK_PROXY_ORIGIN__, __PIXELMARK_TRANSPORT_URL__,
    __PIXELMARK_TARGET_URL__ and window.PIXELMARK globals.
    """
    # Safe JSON serializations to prevent injection/syntax errors
    escaped_session = json.dumps(str(session_id))
    escaped_proxy_origin = json.dumps(api_base.rstrip('/'))
    escaped_logical_target_url = json.dumps(page_url)
    
    transport_url = f"{api_base.rstrip('/')}/proxy/session/{session_id}/page?url={urllib.parse.quote(page_url)}"
    escaped_transport_url = json.dumps(transport_url)
    
    bootstrap = f"""<!-- PIXELMARK_BOOTSTRAP_START -->
<script>
window.__PIXELMARK_SESSION_ID__ = {escaped_session};
window.__PIXELMARK_PROXY_ORIGIN__ = {escaped_proxy_origin};
window.__PIXELMARK_TRANSPORT_URL__ = {escaped_transport_url};
window.__PIXELMARK_TARGET_URL__ = {escaped_logical_target_url};
window.__PIXELMARK_BASE__ = window.__PIXELMARK_PROXY_ORIGIN__ + '/proxy/session/' + window.__PIXELMARK_SESSION_ID__;

window.PIXELMARK = window.PIXELMARK || {{}};
window.PIXELMARK.sessionId = window.__PIXELMARK_SESSION_ID__;
window.PIXELMARK.pageUrl = window.__PIXELMARK_TARGET_URL__;
window.PIXELMARK.transportUrl = window.__PIXELMARK_TRANSPORT_URL__;
window.PIXELMARK.targetUrl = window.__PIXELMARK_TARGET_URL__;

window.__PM__ = {{
  domEditMode: false,
  sessionId: {escaped_session},
  targetUrl: {escaped_logical_target_url},
  overlay: null,
  highlight: null,
  panel: null,
  lastTarget: null,
  ready: false
}};

// Register message listener IMMEDIATELY — before agent loads
window.addEventListener('message', function(e) {{
  if (!e.data || !e.data.type) return;
  
  var type = e.data.type;
  
  if (type === 'PIXELMARK_ACTIVATE_DOM_EDIT') {{
    window.__PM__.domEditMode = true;
    if (window.__PM__.ready) {{
      window.__PM__.activate();
    }} else {{
      window.__PM__.pendingActivate = true;
    }}
    // Confirm receipt
    window.parent.postMessage({{ type: 'PIXELMARK_AGENT_ACK', action: 'activate_dom_edit' }}, '*');
  }}
  
  if (type === 'PIXELMARK_DEACTIVATE_DOM_EDIT') {{
    window.__PM__.domEditMode = false;
    if (window.__PM__.deactivate) window.__PM__.deactivate();
    window.parent.postMessage({{ type: 'PIXELMARK_AGENT_ACK', action: 'deactivate_dom_edit' }}, '*');
  }}
  
  if (type === 'PIXELMARK_REPLAY_EDITS') {{
    var edits = e.data.edits || [];
    edits.forEach(function(edit) {{
      try {{
        var el = document.querySelector(edit.selector);
        if (el) el.style.setProperty(edit.property, edit.new_value);
      }} catch(err) {{}}
    }});
  }}
}});

console.debug("[PixelMark URL Model] targetUrl=" + window.__PIXELMARK_TARGET_URL__);
console.debug("[PixelMark URL Model] transportUrl=" + window.__PIXELMARK_TRANSPORT_URL__);

(function() {{
  const proxyBase = window.__PIXELMARK_PROXY_ORIGIN__ + '/proxy/session/' + window.__PIXELMARK_SESSION_ID__;

  function rewriteUrl(url) {{
    if (!url || typeof url !== 'string') return url;
    const trimmed = url.trim();
    if (!trimmed || trimmed.startsWith('data:') || trimmed.startsWith('blob:') || trimmed.startsWith('javascript:')) {{
      return url;
    }}
    if (trimmed.includes('/proxy/session/')) {{
      return url;
    }}
    
    let absoluteUrl = url;
    try {{
      absoluteUrl = new URL(url, window.__PIXELMARK_TARGET_URL__).href;
    }} catch(e) {{
      return url;
    }}
    
    try {{
      const parsed = new URL(absoluteUrl);
      const host = parsed.hostname.toLowerCase();
      
      const PASSTHROUGH_ORIGINS = [
        'firebaseinstallations.googleapis.com',
        'firebase.googleapis.com',
        'identitytoolkit.googleapis.com',
        'securetoken.googleapis.com',
        'firebaseapp.com',
        'auth0.com',
        'accounts.google.com',
        'www.google-analytics.com', 'google-analytics.com',
        'www.googletagmanager.com', 'googletagmanager.com',
        'connect.facebook.net', 'static.hotjar.com', 'script.hotjar.com',
        'segment.io', 'api.segment.io'
      ];
      
      const isExact = PASSTHROUGH_ORIGINS.some(o => host === o);
      const isSuffix = PASSTHROUGH_ORIGINS.some(o => host.endsWith('.' + o));
      const isGoogleCollect = (host === 'www.google.com' || host === 'google.com') && parsed.pathname.startsWith('/g/collect');
      if (isExact || isSuffix || isGoogleCollect) return absoluteUrl;
    }} catch(e) {{}}

    return proxyBase + '/asset?url=' + encodeURIComponent(absoluteUrl);
  }}

  try {{
    const linkHrefDesc = Object.getOwnPropertyDescriptor(HTMLLinkElement.prototype, 'href');
    if (linkHrefDesc && linkHrefDesc.set) {{
      Object.defineProperty(HTMLLinkElement.prototype, 'href', {{
        get: function() {{ return linkHrefDesc.get.call(this); }},
        set: function(val) {{ linkHrefDesc.set.call(this, rewriteUrl(val)); }},
        configurable: true
      }});
    }}
  }} catch(e) {{}}

  try {{
    const scriptSrcDesc = Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, 'src');
    if (scriptSrcDesc && scriptSrcDesc.set) {{
      Object.defineProperty(HTMLScriptElement.prototype, 'src', {{
        get: function() {{ return scriptSrcDesc.get.call(this); }},
        set: function(val) {{ scriptSrcDesc.set.call(this, rewriteUrl(val)); }},
        configurable: true
      }});
    }}
  }} catch(e) {{}}

  try {{
    const imgSrcDesc = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
    if (imgSrcDesc && imgSrcDesc.set) {{
      Object.defineProperty(HTMLImageElement.prototype, 'src', {{
        get: function() {{ return imgSrcDesc.get.call(this); }},
        set: function(val) {{ imgSrcDesc.set.call(this, rewriteUrl(val)); }},
        configurable: true
      }});
    }}
  }} catch(e) {{}}

  try {{
    const originalSetAttribute = Element.prototype.setAttribute;
    Element.prototype.setAttribute = function(name, value) {{
      let val = value;
      try {{
        const tagName = this.tagName.toLowerCase();
        if ((tagName === 'link' && name.toLowerCase() === 'href') ||
            (tagName === 'script' && name.toLowerCase() === 'src') ||
            (tagName === 'img' && name.toLowerCase() === 'src')) {{
          val = rewriteUrl(value);
        }}
      }} catch(e) {{}}
      return originalSetAttribute.call(this, name, val);
    }};
  }} catch(e) {{}}

  const originalFetch = window.fetch;
  window.fetch = async function(input, init) {{
    let url = typeof input === 'string' ? input : input?.url;
    const method = (init && init.method) || (input && input.method) || 'GET';
    if (url && typeof url === 'string') {{
      const rewritten = rewriteUrl(url);
      if (rewritten !== url) {{
        if (typeof input === 'string') {{
          input = rewritten;
        }} else if (input && typeof input === 'object') {{
          try {{
            input = new Request(rewritten, input);
          }} catch (e) {{
            try {{ Object.defineProperty(input, 'url', {{ value: rewritten }}); }} catch (_) {{}}
          }}
        }}
      }}
    }}
    return originalFetch.call(this, input, init);
  }};

  const originalXHROpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url, ...args) {{
    if (url && typeof url === 'string') {{
      url = rewriteUrl(url);
    }}
    this._method = method;
    return originalXHROpen.apply(this, [method, url, ...args]);
  }};

  const nativePushState = History.prototype.pushState;
  const nativeReplaceState = History.prototype.replaceState;

  function getCurrentLogicalUrl() {{
    try {{
      const params = new URLSearchParams(window.location.search);
      const urlParam = params.get('url');
      if (urlParam) {{
        return new URL(urlParam).href;
      }}
    }} catch (_) {{}}
    return window.__PIXELMARK_TARGET_URL__;
  }}

  function resolveLogicalTargetUrl(inputUrl) {{
    try {{
      if (!inputUrl) return window.__PIXELMARK_TARGET_URL__;
      const str = String(inputUrl);
      if (str.includes('/proxy/session/')) {{
        try {{
          const absoluteProxyUrl = new URL(str, window.location.origin);
          const urlParam = absoluteProxyUrl.searchParams.get('url');
          if (urlParam) {{
            return new URL(urlParam).href;
          }}
          const baseOrigin = new URL(window.__PIXELMARK_TARGET_URL__).origin;
          return baseOrigin + '/';
        }} catch (e) {{
          return window.__PIXELMARK_TARGET_URL__;
        }}
      }}
      const resolved = new URL(str, window.__PIXELMARK_TARGET_URL__);
      return resolved.href;
    }} catch (e) {{
      return window.__PIXELMARK_TARGET_URL__;
    }}
  }}

  function normalizeToTransportUrl(inputUrl) {{
    try {{
      if (inputUrl === null || inputUrl === undefined || String(inputUrl).trim() === '') {{
        return window.location.pathname + window.location.search + window.location.hash;
      }}
      const str = String(inputUrl);
      if (str.startsWith('/proxy/session/')) {{
        return str;
      }}
      try {{
        const parsedProxy = new URL(str);
        if (parsedProxy.origin === window.__PIXELMARK_PROXY_ORIGIN__ && parsedProxy.pathname.startsWith('/proxy/session/')) {{
          return parsedProxy.pathname + parsedProxy.search + parsedProxy.hash;
        }}
      }} catch (_) {{}}

      const resolved = new URL(str, window.__PIXELMARK_TARGET_URL__);
      const targetOrigin = new URL(window.__PIXELMARK_TARGET_URL__).origin;

      if (resolved.origin === targetOrigin) {{
        return '/proxy/session/' + window.__PIXELMARK_SESSION_ID__ + '/page?url=' + encodeURIComponent(resolved.href);
      }} else {{
        return window.location.pathname + window.location.search + window.location.hash;
      }}
    }} catch (e) {{
      return window.location.pathname + window.location.search + window.location.hash;
    }}
  }}

  function safeCallNativePushReplace(nativeMethod, state, unused, safeTransportUrl) {{
    const baseTag = document.querySelector('base');
    const originalHref = baseTag ? baseTag.getAttribute('href') : null;
    
    if (baseTag) {{
      baseTag.removeAttribute('href'); // Temporarily remove base href so URL resolves relative to document origin (localhost:8765) without SecurityError
    }}
    
    try {{
      nativeMethod.call(this, state, unused || '', safeTransportUrl);
    }} catch (err) {{
      console.warn("[PixelMark History Shim] Failed native call", err);
      try {{
        nativeMethod.call(this, state, unused || '', window.location.pathname + window.location.search);
      }} catch (_) {{}}
    }} finally {{
      if (baseTag && originalHref !== null) {{
        baseTag.setAttribute('href', originalHref);
      }}
    }}
  }}

  History.prototype.pushState = function(state, unused, url) {{
    const logicalTargetUrl = resolveLogicalTargetUrl(url);
    const safeTransportUrl = normalizeToTransportUrl(url);
    console.debug("[PixelMark History Shim] input=" + url + " logical=" + logicalTargetUrl + " transport=" + safeTransportUrl + " type=pushState");
    safeCallNativePushReplace.call(this, nativePushState, state, unused, safeTransportUrl);
    window.__PIXELMARK_TARGET_URL__ = logicalTargetUrl;
    if (window.PIXELMARK) {{
      window.PIXELMARK.pageUrl = logicalTargetUrl;
      window.PIXELMARK.targetUrl = logicalTargetUrl;
    }}
    try {{
      const baseTag = document.querySelector('base');
      if (baseTag) {{
        baseTag.setAttribute('href', logicalTargetUrl);
      }}
    }} catch (_) {{}}
    window.dispatchEvent(new CustomEvent('pixelmark:navigation', {{
      detail: {{
        type: 'pushState',
        logicalTargetUrl: logicalTargetUrl,
        transportUrl: safeTransportUrl
      }}
    }}));
  }};

  History.prototype.replaceState = function(state, unused, url) {{
    const logicalTargetUrl = resolveLogicalTargetUrl(url);
    const safeTransportUrl = normalizeToTransportUrl(url);
    console.debug("[PixelMark History Shim] input=" + url + " logical=" + logicalTargetUrl + " transport=" + safeTransportUrl + " type=replaceState");
    safeCallNativePushReplace.call(this, nativeReplaceState, state, unused, safeTransportUrl);
    window.__PIXELMARK_TARGET_URL__ = logicalTargetUrl;
    if (window.PIXELMARK) {{
      window.PIXELMARK.pageUrl = logicalTargetUrl;
      window.PIXELMARK.targetUrl = logicalTargetUrl;
    }}
    try {{
      const baseTag = document.querySelector('base');
      if (baseTag) {{
        baseTag.setAttribute('href', logicalTargetUrl);
      }}
    }} catch (_) {{}}
    window.dispatchEvent(new CustomEvent('pixelmark:navigation', {{
      detail: {{
        type: 'replaceState',
        logicalTargetUrl: logicalTargetUrl,
        transportUrl: safeTransportUrl
      }}
    }}));
  }};

  history.pushState = History.prototype.pushState.bind(history);
  history.replaceState = History.prototype.replaceState.bind(history);

  window.addEventListener('popstate', function() {{
    const logicalTargetUrl = getCurrentLogicalUrl();
    const transportUrl = window.location.pathname + window.location.search + window.location.hash;
    window.__PIXELMARK_TARGET_URL__ = logicalTargetUrl;
    if (window.PIXELMARK) {{
      window.PIXELMARK.pageUrl = logicalTargetUrl;
      window.PIXELMARK.targetUrl = logicalTargetUrl;
    }}
    try {{
      const baseTag = document.querySelector('base');
      if (baseTag) {{
        baseTag.setAttribute('href', logicalTargetUrl);
      }}
    }} catch (_) {{}}
    console.debug("[PixelMark History Shim] input=" + window.location.href + " logical=" + logicalTargetUrl + " transport=" + transportUrl + " type=popstate");
    window.dispatchEvent(new CustomEvent('pixelmark:navigation', {{
      detail: {{
        type: 'popstate',
        logicalTargetUrl: logicalTargetUrl,
        transportUrl: transportUrl
      }}
    }}));
  }});

  function getLogicalUrlObject() {{
    try {{
      return new URL(getCurrentLogicalUrl());
    }} catch (e) {{
      try {{
        return new URL(window.__PIXELMARK_TARGET_URL__);
      }} catch (_) {{
        return {{
          href: window.__PIXELMARK_TARGET_URL__,
          origin: '',
          protocol: '',
          host: '',
          hostname: '',
          pathname: '',
          search: '',
          hash: ''
        }};
      }}
    }}
  }}

  const define = (obj, prop, getter) => {{
    try {{ Object.defineProperty(obj, prop, {{ get: getter, configurable: true }}); }} catch(e) {{}}
  }};
  
  define(document, 'URL', () => getLogicalUrlObject().href);
  define(document, 'documentURI', () => getLogicalUrlObject().href);
  define(document, 'baseURI', () => getLogicalUrlObject().href);
  define(document, 'referrer', () => '');

  define(window.location, 'href', () => getLogicalUrlObject().href);
  define(window.location, 'origin', () => getLogicalUrlObject().origin);
  define(window.location, 'protocol', () => getLogicalUrlObject().protocol);
  define(window.location, 'host', () => getLogicalUrlObject().host);
  define(window.location, 'hostname', () => getLogicalUrlObject().hostname);
  define(window.location, 'pathname', () => getLogicalUrlObject().pathname);
  define(window.location, 'search', () => getLogicalUrlObject().search);
  define(window.location, 'hash', () => getLogicalUrlObject().hash);

  window.__PIXELMARK_LOGICAL_LOCATION__ = {{
    get href() {{ return getLogicalUrlObject().href; }},
    get origin() {{ return getLogicalUrlObject().origin; }},
    get host() {{ return getLogicalUrlObject().host; }},
    get hostname() {{ return getLogicalUrlObject().hostname; }},
    get protocol() {{ return getLogicalUrlObject().protocol; }},
    get pathname() {{ return getLogicalUrlObject().pathname; }},
    get search() {{ return getLogicalUrlObject().search; }},
    get hash() {{ return getLogicalUrlObject().hash; }},
    assign: function(url) {{ window.location.assign(url); }},
    replace: function(url) {{ window.location.replace(url); }},
    reload: function(force) {{ window.location.reload(force); }},
    toString: function() {{ return getLogicalUrlObject().href; }}
  }};

  window.__PIXELMARK_GET_LOGICAL_URL__ = function() {{
    return getLogicalUrlObject().href;
  }};
  
  // Ensure window.lastpageurl is set initially
  window.lastpageurl = window.__PIXELMARK_TARGET_URL__;
}})();
</script>
<!-- PIXELMARK_BOOTSTRAP_END -->"""

    head_match = re.search(r'<head\b[^>]*>', html, re.IGNORECASE)
    if head_match:
        idx = head_match.end()
        return html[:idx] + f"\n{bootstrap}\n" + html[idx:]
    else:
        # head tag missing, create one
        html_match = re.search(r'<html\b[^>]*>', html, re.IGNORECASE)
        head_html = f"<head>\n{bootstrap}\n</head>"
        if html_match:
            idx = html_match.end()
            return html[:idx] + f"\n{head_html}\n" + html[idx:]
        else:
            return f"{head_html}\n" + html


# ── STEP 2 (NEW) ───────────────────────────────────────────────────────────────
def inject_cursor_relay_bridge(html: str) -> str:
    """
    Injects a cursor-relay bridge script that:
    1. Pre-initializes common global cursor-state objects so cursor-reactive
       effects don't crash when they read mouse state before the first real
       mousemove event.
    2. Patches common cursor-tracking patterns so they work in the proxied context.
    3. Fires a synthetic mousemove at the viewport center on DOMContentLoaded
       so spotlight / cursor-glow effects activate immediately without requiring
       an initial physical mouse move.

    This script must run BEFORE any site scripts, so it is injected as the
    first child of <head> (right after the PixelMark bootstrap).
    """
    bridge = """\
<script>
(function() {
  // ─── 1. Pre-initialize common global cursor-state patterns ──────────────
  // Many cursor-reactive sites keep a global object they update on mousemove.
  // We seed it with a center-of-viewport default so effects don't start at 0,0.
  var _cx = Math.round((window.innerWidth  || 1280) / 2);
  var _cy = Math.round((window.innerHeight || 800)  / 2);

  function _seed(obj) {
    if (!obj || typeof obj !== 'object') return;
    try { if ('x'       in obj) obj.x       = _cx; } catch(_) {}
    try { if ('y'       in obj) obj.y       = _cy; } catch(_) {}
    try { if ('clientX' in obj) obj.clientX = _cx; } catch(_) {}
    try { if ('clientY' in obj) obj.clientY = _cy; } catch(_) {}
  }

  // Create proxy stubs so code that reads window.mouse / window.cursor /
  // window.mousePos before setting them gets a valid object instead of
  // undefined.  The stub is replaced by the site's own object if one is
  // later assigned.
  var _cursorStubs = {};
  ['mouse','cursor','mousePos','Mouse','Cursor','pointer','pointerPos'].forEach(function(k) {
    if (window[k] === undefined || window[k] === null) {
      _cursorStubs[k] = { x: _cx, y: _cy, clientX: _cx, clientY: _cy };
      try {
        Object.defineProperty(window, k, {
          get: function() { return _cursorStubs[k]; },
          set: function(v) {
            _cursorStubs[k] = v;
            _seed(v);
          },
          configurable: true
        });
      } catch(_) {}
    }
  });

  // ─── 2. Patch addEventListener to detect cursor-reactive listeners ────────
  // If a site attaches mousemove/pointermove to window, document or body,
  // flag the page so the PixelMark agent can optimise cursor relay frequency.
  var _origAdd = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function(type, listener, opts) {
    if (type === 'mousemove' || type === 'pointermove') {
      try { window.__PIXELMARK_HAS_CURSOR_EFFECTS__ = true; } catch(_) {}
    }
    return _origAdd.call(this, type, listener, opts);
  };

  // ─── 3. Fire a synthetic center-of-viewport mousemove on DOMContentLoaded ─
  // This ensures spotlight / glow / WebGL cursor effects activate immediately
  // without requiring the user to physically move the mouse first.
  function _dispatchCenter() {
    var cx = Math.round((window.innerWidth  || 1280) / 2);
    var cy = Math.round((window.innerHeight || 800)  / 2);
    try {
      var mm = new MouseEvent('mousemove', {
        bubbles: true, cancelable: false,
        clientX: cx, clientY: cy, screenX: cx, screenY: cy,
        movementX: 0, movementY: 0, view: window
      });
      document.dispatchEvent(mm);
      document.querySelectorAll('canvas').forEach(function(c) {
        try { c.dispatchEvent(mm.constructor ? new mm.constructor('mousemove', mm) : mm); } catch(_) {}
      });
    } catch(_) {}
    try {
      var pm = new PointerEvent('pointermove', {
        bubbles: true, cancelable: false,
        clientX: cx, clientY: cy, screenX: cx, screenY: cy,
        pointerId: 1, pointerType: 'mouse', isPrimary: true, view: window
      });
      document.dispatchEvent(pm);
    } catch(_) {}
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(_dispatchCenter, 200);
  } else {
    document.addEventListener('DOMContentLoaded', function() {
      setTimeout(_dispatchCenter, 200);
    });
  }
  // Also fire after a short delay to catch late-initialized effects
  setTimeout(_dispatchCenter, 800);
  setTimeout(_dispatchCenter, 2000);
})();
</script>"""

    head_match = __import__('re').search(r'<head\b[^>]*>', html, __import__('re').IGNORECASE)
    if head_match:
        idx = head_match.end()
        return html[:idx] + f"\n{bridge}\n" + html[idx:]
    return bridge + html


# ── STEP 3 ────────────────────────────────────────────────────────────────────
def inject_webgl_patch(html: str) -> str:
    """
    Forces preserveDrawingBuffer: true on WebGL/WebGL2 context creation so canvases can be captured.
    """
    patch = """<script>
(function() {
  try {
    var _origGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type, attribs) {
      try { this.__pixelmark_context_type = type; } catch(_) {}
      var rest = Array.prototype.slice.call(arguments, 2);
      if (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl') {
        var newAttribs = Object.assign({}, attribs || {}, { preserveDrawingBuffer: true });
        var args = [type, newAttribs].concat(rest);
        return _origGetContext.apply(this, args);
      }
      return _origGetContext.apply(this, arguments);
    };
  } catch(e) {}
})();
</script>"""
    head_match = re.search(r'<head\b[^>]*>', html, re.IGNORECASE)
    if head_match:
        idx = head_match.end()
        return html[:idx] + f"\n{patch}\n" + html[idx:]
    return patch + html


# ── STEP 3 ────────────────────────────────────────────────────────────────────
def inject_sw_killer(html: str) -> str:
    """
    Unregisters Service Workers to prevent proxy routing bypass.
    """
    sw_killer = """<script>
(function() {
  try {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(function(regs) {
        for (var i = 0; i < regs.length; i++) { regs[i].unregister(); }
      }).catch(function() {});
      var _origRegister = navigator.serviceWorker.register;
      navigator.serviceWorker.register = function(scriptURL, options) {
        console.log('[PixelMark] Service Worker registration blocked:', scriptURL);
        return Promise.resolve({
          scope: options && options.scope ? options.scope : '/',
          active: null, installing: null, waiting: null,
          unregister: function() { return Promise.resolve(true); },
          addEventListener: function() {}, removeEventListener: function() {}
        });
      };
    }
  } catch(e) {}
})();
</script>"""
    head_match = re.search(r'<head\b[^>]*>', html, re.IGNORECASE)
    if head_match:
        idx = head_match.end()
        return html[:idx] + f"\n{sw_killer}\n" + html[idx:]
    return sw_killer + html


# ── STEP 4 ────────────────────────────────────────────────────────────────────
def inject_base_tag(html: str, target_url: str) -> str:
    """
    Injects/updates a <base href="..."> tag pointing to the target URL.
    """
    base_regex = re.compile(r'<base\s+[^>]*>', re.IGNORECASE)
    if base_regex.search(html):
        html = base_regex.sub(f'<base href="{target_url}">', html, count=1)
    else:
        base_tag = f'<base href="{target_url}">'
        head_match = re.search(r'<head\b[^>]*>', html, re.IGNORECASE)
        if head_match:
            idx = head_match.end()
            html = html[:idx] + f"\n{base_tag}\n" + html[idx:]
        else:
            html = f"{base_tag}\n" + html
    return html


# ── STEP 5 ────────────────────────────────────────────────────────────────────
def inject_chunk_guard(html: str) -> str:
    """
    Recovers from stale Next.js/Webpack chunk load failures by triggering a reload.
    """
    guard = """<script>
(function() {
  try {
    var PATTERNS = ['ChunkLoadError','Loading chunk','module factory is not available','Failed to fetch dynamically imported module'];
    var KEY = 'pm_chunk_reload';
    var COOLDOWN = 30000;
    function matches(m) {
      if (!m) return false;
      for (var i = 0; i < PATTERNS.length; i++) {
        if (String(m).indexOf(PATTERNS[i]) !== -1) return true;
      }
      return false;
    }
    function tryReload() {
      try {
        var last = Number(sessionStorage.getItem(KEY) || 0);
        if (Date.now() - last < COOLDOWN) return;
        sessionStorage.setItem(KEY, String(Date.now()));
      } catch(e) {}
      location.reload();
    }
    window.addEventListener('error', function(e) {
      var m = (e.error && e.error.message) || e.message;
      if (matches(m)) { e.preventDefault(); tryReload(); }
    }, true);
    window.addEventListener('unhandledrejection', function(e) {
      var m = (e.reason && e.reason.message) || e.reason;
      if (matches(m)) { e.preventDefault(); tryReload(); }
    });
  } catch(e) {}
})();
</script>"""
    head_match = re.search(r'<head\b[^>]*>', html, re.IGNORECASE)
    if head_match:
        idx = head_match.end()
        return html[:idx] + f"\n{guard}\n" + html[idx:]
    return guard + html


# ── STEP 6 ────────────────────────────────────────────────────────────────────
def inject_agent(html: str, agent_url: str) -> str:
    """
    Appends the PixelMark agent script tag just before </body>.
    """
    if not agent_url:
        return html
    agent_tag = f'<script src="{agent_url}" defer></script>'
    if "</body>" in html:
        return html.replace("</body>", f"{agent_tag}</body>", 1)
    elif "</BODY>" in html:
        return html.replace("</BODY>", f"{agent_tag}</BODY>", 1)
    return html + agent_tag


# ── Main entry point ───────────────────────────────────────────────────────────
def rewrite_html(
    html: str,
    session_id: str,
    page_url: str,
    base_url: str,
    api_base: str = "",
    conservative_render_mode: bool = False,
    snapshot_mode: bool = False,
) -> str:
    """
    Rewrites a proxied HTML payload before it reaches the browser.
    """
    logger.info(
        f"[PROXY_REWRITE] Starting HTML rewrite for session={session_id}, "
        f"page_url={page_url}, snapshot={snapshot_mode}"
    )

    # snapshot_mode: strip all script tags so runtime JS doesn't execute
    if snapshot_mode:
        logger.info(
            "[PROXY_REWRITE] Snapshot Mode Active — stripping all script tags."
        )
        html = re.sub(
            r"<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>",
            "",
            html,
            flags=re.IGNORECASE,
        )

    # Derive proxy base URL (full session path for the agent)
    proxy_base_url = f"{api_base.rstrip('/')}/proxy/session/{session_id}"

    # Agent script URL — env override or default to /static/ path
    agent_script_url = os.getenv(
        "PROXY_AGENT_SCRIPT_URL",
        f"{api_base.rstrip('/')}/static/pixelmark-agent.js",
    )

    # 1. Bootstrap — window.__PIXELMARK_TARGET_URL__, SESSION_ID, BASE
    if conservative_render_mode:
        logger.info("[PROXY_REWRITE] Conservative Render Mode Active - injecting scripts at the end of <head>")
        
        # Inject base tag first (still early)
        html = inject_base_tag(html, page_url)
        
        # Build the combined script block of all pixelmark shims
        # We extract the script inner contents or just concatenate the tags
        bootstrap_script = inject_bootstrap("<html><head></head></html>", page_url, str(session_id), proxy_base_url, api_base)
        cursor_script = inject_cursor_relay_bridge("<html><head></head></html>")
        webgl_script = inject_webgl_patch("<html><head></head></html>")
        sw_script = inject_sw_killer("<html><head></head></html>")
        guard_script = inject_chunk_guard("<html><head></head></html>")
        
        # Extract the scripts from the dummy htmls
        def extract_script(h):
            m = re.findall(r'<!--.*?-->|<script\b[^>]*>([\s\S]*?)</script>', h)
            # Just grab the scripts
            scripts = []
            for item in re.finditer(r'(<!--.*?-->|<script\b[^>]*>[\s\S]*?</script>)', h):
                scripts.append(item.group(1))
            return "\n".join(scripts)
            
        combined_shims = "\n".join([
            extract_script(bootstrap_script),
            extract_script(cursor_script),
            extract_script(webgl_script),
            extract_script(sw_script),
            extract_script(guard_script)
        ])
        
        # Inject at the very end of <head>
        head_end_match = re.search(r'</head>', html, re.IGNORECASE)
        if head_end_match:
            idx = head_end_match.start()
            html = html[:idx] + f"\n{combined_shims}\n" + html[idx:]
        else:
            # Fallback if no head closing tag
            html = inject_bootstrap(html, page_url, str(session_id), proxy_base_url, api_base)
            html = inject_cursor_relay_bridge(html)
            html = inject_webgl_patch(html)
            html = inject_sw_killer(html)
            html = inject_chunk_guard(html)
    else:
        html = inject_bootstrap(html, page_url, str(session_id), proxy_base_url, api_base)
        html = inject_cursor_relay_bridge(html)
        html = inject_webgl_patch(html)
        html = inject_sw_killer(html)
        html = inject_base_tag(html, page_url)
        html = inject_chunk_guard(html)

    # 6. Agent — append-only before </body>, never touch existing scripts
    html = inject_agent(html, agent_script_url)

    # Remove CSP / frame security meta tags (http-equiv fallback)
    html = re.sub(
        r'<meta\s+[^>]*http-equiv=["\']?(?:content-security-policy|x-frame-options|frame-ancestors)["\']?[^>]*>',
        "",
        html,
        flags=re.IGNORECASE,
    )

    return html
