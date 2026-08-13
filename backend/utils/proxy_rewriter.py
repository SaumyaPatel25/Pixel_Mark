import urllib.parse
import re
import os
import logging
import json

logger = logging.getLogger("stage.proxy_rewriter")


def _target_origin(page_url: str) -> str:
    """
    Returns the canonical origin (scheme + host, no trailing slash) of a page URL.
    e.g. 'https://sohospace.entrext.in/pricing' → 'https://sohospace.entrext.in'
    """
    parsed = urllib.parse.urlparse(page_url)
    return f"{parsed.scheme}://{parsed.netloc}"


# ── STEP 1 ────────────────────────────────────────────────────────────────────
def inject_bootstrap(html: str, page_url: str, session_id: str, proxy_base_url: str, api_base: str) -> str:
    """
    Injects a bootstrap script as the FIRST <script> inside <head>.
    If <head> exists, prepend to head. If missing, create one.

    Exposes:
      window.__STAGE_SESSION_ID__
      window.__STAGE_PROXY_ORIGIN__       — proxy app origin (http://localhost:8765)
      window.__STAGE_TARGET_URL__         — real current page URL on the target site
      window.__STAGE_TARGET_ORIGIN__      — real target site origin (https://target.com)
      window.__STAGE_TRANSPORT_URL__      — proxy session URL for this page
      window.STAGE_TARGET_URL             — alias (no underscores) per public API contract
      window.STAGE_TARGET_ORIGIN          — alias (no underscores) per public API contract
      window.STAGE_SESSION_ID             — alias (no underscores) per public API contract
      window.STAGE.*                      — structured session object
      window.__PM__.*                     — legacy DOM-edit object
    """
    origin = _target_origin(page_url)

    # Safe JSON serializations to prevent injection/syntax errors
    escaped_session = json.dumps(str(session_id))
    escaped_proxy_origin = json.dumps(api_base.rstrip('/'))
    escaped_target_origin = json.dumps(origin)
    escaped_logical_target_url = json.dumps(page_url)

    transport_url = f"{api_base.rstrip('/')}/proxy/session/{session_id}/page?url={urllib.parse.quote(page_url)}"
    escaped_transport_url = json.dumps(transport_url)

    bootstrap = f"""<!-- STAGE_BOOTSTRAP_START -->
<script>
// ─── STAGE URL Model ──────────────────────────────────────────────────────────
// These three globals are the canonical source of truth for URL identity inside
// the proxy context. The injected agent and all client-side shims read ONLY
// these values — never window.location.href — for page tracking and analytics.
//
//   STAGE_TARGET_URL     = real page URL on the target site (analytics / page visits)
//   STAGE_TARGET_ORIGIN  = real target site origin (asset URL resolution base)
//   STAGE_SESSION_ID     = STAGE session identifier
//   __STAGE_PROXY_ORIGIN__ = proxy app origin (do NOT use for asset URLs)

window.__STAGE_SESSION_ID__ = {escaped_session};
window.__STAGE_PROXY_ORIGIN__ = {escaped_proxy_origin};
window.__STAGE_TARGET_ORIGIN__ = {escaped_target_origin};
window.__STAGE_TARGET_URL__ = {escaped_logical_target_url};
window.__STAGE_TRANSPORT_URL__ = {escaped_transport_url};
window.__STAGE_BASE__ = window.__STAGE_PROXY_ORIGIN__ + '/proxy/session/' + window.__STAGE_SESSION_ID__;

// Public canonical aliases (no double-underscores) — used by agent and external consumers
window.STAGE_SESSION_ID = window.__STAGE_SESSION_ID__;
window.STAGE_TARGET_URL = window.__STAGE_TARGET_URL__;
window.STAGE_TARGET_ORIGIN = window.__STAGE_TARGET_ORIGIN__;

window.STAGE = window.STAGE || {{}};
window.STAGE.sessionId = window.__STAGE_SESSION_ID__;
window.STAGE.pageUrl = window.__STAGE_TARGET_URL__;
window.STAGE.targetUrl = window.__STAGE_TARGET_URL__;
window.STAGE.targetOrigin = window.__STAGE_TARGET_ORIGIN__;
window.STAGE.transportUrl = window.__STAGE_TRANSPORT_URL__;

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

// Suppress Next.js Hydration Errors from polluting the console and STAGE overlay
window.addEventListener('error', function(e) {{
  var msg = (e.error && e.error.message) || e.message || '';
  // Absorb Next.js hydration errors
  if (msg.indexOf('Minified React error #418') !== -1 || msg.indexOf('Minified React error #423') !== -1 || msg.indexOf('Hydration failed') !== -1) {{
    e.preventDefault();
    e.stopImmediatePropagation();
    return;
  }}
  // Absorb cross-origin SecurityErrors from third-party scripts (e.g. frame-busting
  // widgets like Memberstack that read window.top.location.href). We log them for
  // debugging but prevent them from cascading and breaking subsequent script execution.
  if (e.error instanceof DOMException && e.error.name === 'SecurityError') {{
    console.warn('[STAGE] Absorbed cross-origin SecurityError from third-party script:', msg);
    e.preventDefault();
    e.stopImmediatePropagation();
    return;
  }}
  if (msg.indexOf('SecurityError') !== -1 && (msg.indexOf('Location') !== -1 || msg.indexOf('cross-origin') !== -1 || msg.indexOf('blocked a frame') !== -1)) {{
    console.warn('[STAGE] Absorbed cross-origin error:', msg);
    e.preventDefault();
    e.stopImmediatePropagation();
    return;
  }}
}}, true);

window.addEventListener('unhandledrejection', function(e) {{
  var msg = e.reason && (e.reason.message || String(e.reason));
  if (msg && (msg.indexOf('SecurityError') !== -1 || msg.indexOf('cross-origin') !== -1)) {{
    console.warn('[STAGE] Absorbed unhandled cross-origin rejection:', msg);
    e.preventDefault();
  }}
}});

// Patch console.error to filter out Next.js hydration logs
(function() {{
  var origError = console.error;
  console.error = function() {{
    var msg = arguments[0];
    if (typeof msg === 'string' && (
      msg.indexOf('Minified React error #418') !== -1 ||
      msg.indexOf('Minified React error #423') !== -1 ||
      msg.indexOf('Hydration failed') !== -1 ||
      msg.indexOf('suppressHydrationWarning') !== -1
    )) {{
      return;
    }}
    return origError.apply(this, arguments);
  }};
}})();

// Register message listener IMMEDIATELY — before agent loads
window.addEventListener('message', function(e) {{
  if (!e.data || !e.data.type) return;

  var type = e.data.type;

  if (type === 'STAGE_ACTIVATE_DOM_EDIT') {{
    window.__PM__.domEditMode = true;
    if (window.__PM__.ready) {{
      window.__PM__.activate();
    }} else {{
      window.__PM__.pendingActivate = true;
    }}
    // Confirm receipt
    window.parent.postMessage({{ type: 'STAGE_AGENT_ACK', action: 'activate_dom_edit' }}, '*');
  }}

  if (type === 'STAGE_DEACTIVATE_DOM_EDIT') {{
    window.__PM__.domEditMode = false;
    if (window.__PM__.deactivate) window.__PM__.deactivate();
    window.parent.postMessage({{ type: 'STAGE_AGENT_ACK', action: 'deactivate_dom_edit' }}, '*');
  }}

  if (type === 'STAGE_REPLAY_EDITS') {{
    var edits = e.data.edits || [];
    edits.forEach(function(edit) {{
      try {{
        var el = document.querySelector(edit.selector);
        if (el) el.style.setProperty(edit.property, edit.new_value);
      }} catch(err) {{}}
    }});
  }}
}});

console.debug("[STAGE URL Model] targetUrl=" + window.__STAGE_TARGET_URL__);
console.debug("[STAGE URL Model] targetOrigin=" + window.__STAGE_TARGET_ORIGIN__);
console.debug("[STAGE URL Model] transportUrl=" + window.__STAGE_TRANSPORT_URL__);

(function() {{
  // ─── Key architectural rule (enforced here) ───────────────────────────────
  //
  //   DOCUMENTS  → navigate through the session proxy route
  //   ASSETS     → resolve to absolute target origin URLs, fetched via asset proxy
  //   TRACKING   → always use window.STAGE_TARGET_URL / window.__STAGE_TARGET_URL__
  //
  // The rewriteUrl() function below implements this split.
  // The History shim keeps window.__STAGE_TARGET_URL__ updated so tracking always
  // reflects the real target page rather than the proxy transport URL.

  const proxyBase = window.__STAGE_PROXY_ORIGIN__ + '/proxy/session/' + window.__STAGE_SESSION_ID__;
  const targetOrigin = window.__STAGE_TARGET_ORIGIN__;

  // ─── URL classifier ────────────────────────────────────────────────────────
  // Returns 'navigation' or 'asset' for a resolved absolute URL.
  // Navigation URLs are page documents; asset URLs are scripts/styles/fonts/images.
  const ASSET_EXTENSIONS = new Set([
    '.js', '.mjs', '.cjs', '.ts', '.tsx',
    '.css', '.scss', '.sass', '.less',
    '.woff', '.woff2', '.ttf', '.eot', '.otf',
    '.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.ico', '.avif',
    '.mp4', '.webm', '.ogg', '.mp3', '.wav',
    '.json', '.xml', '.wasm',
    '.glb', '.gltf', '.hdr', '.exr', '.fbx', '.bin',
    '.pdf', '.zip', '.map'
  ]);

  function getExtension(path) {{
    var parts = path.split('?')[0].split('#')[0].split('.');
    if (parts.length < 2) return '';
    return '.' + parts[parts.length - 1].toLowerCase();
  }}

  function isAssetUrl(absoluteUrl) {{
    try {{
      var p = new URL(absoluteUrl);
      var ext = getExtension(p.pathname);
      if (ext && ASSET_EXTENSIONS.has(ext)) return true;
      // Next.js static chunks are always assets even without extension in path
      if (p.pathname.startsWith('/_next/static/')) return true;
      if (p.pathname.startsWith('/_next/image')) return true;
      if (p.pathname.includes('/webpack-hmr')) return true;
    }} catch(e) {{}}
    return false;
  }}

  // ─── Core URL rewriter ─────────────────────────────────────────────────────
  function rewriteUrl(url) {{
    if (!url || typeof url !== 'string') return url;
    const trimmed = url.trim();
    if (!trimmed || trimmed.startsWith('data:') || trimmed.startsWith('blob:') || trimmed.startsWith('javascript:')) {{
      return url;
    }}
    // Already a proxy URL — pass through unchanged
    if (trimmed.includes('/proxy/session/')) {{
      return url;
    }}

    // Resolve to absolute URL — use target URL as base so root-relative paths
    // like /_next/static/... anchor against the target origin, not the proxy.
    let absoluteUrl = url;
    try {{
      absoluteUrl = new URL(url, window.__STAGE_TARGET_URL__).href;
    }} catch(e) {{
      return url;
    }}

    // Parse for origin comparison
    let parsedAbsolute;
    try {{
      parsedAbsolute = new URL(absoluteUrl);
    }} catch(e) {{
      return url;
    }}

    const absoluteHost = parsedAbsolute.hostname.toLowerCase();

    // Analytics / third-party passthrough origins — never proxy-route these
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

    const isExact = PASSTHROUGH_ORIGINS.some(o => absoluteHost === o);
    const isSuffix = PASSTHROUGH_ORIGINS.some(o => absoluteHost.endsWith('.' + o));
    const isGoogleCollect = (absoluteHost === 'www.google.com' || absoluteHost === 'google.com') && parsedAbsolute.pathname.startsWith('/g/collect');
    if (isExact || isSuffix || isGoogleCollect) return absoluteUrl;

    // Bypass: URLs that are already on the proxy app origin itself
    try {{
      const proxyHost = new URL(window.__STAGE_PROXY_ORIGIN__).host.toLowerCase();
      if (absoluteHost === proxyHost) return url;
    }} catch(e) {{}}

    // Route through proxy asset endpoint — preserves absolute target URL in the path
    // Format: /proxy/session/{{id}}/asset/{{scheme}}/{{host}}/{{path...}}
    try {{
      const scheme = parsedAbsolute.protocol.replace(':', '');
      const host = parsedAbsolute.host;
      const pathAndQuery = parsedAbsolute.pathname.slice(1) + parsedAbsolute.search + parsedAbsolute.hash;
      return proxyBase + '/asset/' + scheme + '/' + host + '/' + pathAndQuery;
    }} catch(e) {{
      return proxyBase + '/asset?url=' + encodeURIComponent(absoluteUrl);
    }}
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
    Object.defineProperty(HTMLScriptElement.prototype, 'integrity', {{
      get: function() {{ return ''; }},
      set: function() {{ /* ignore and strip */ }},
      configurable: true
    }});
    Object.defineProperty(HTMLLinkElement.prototype, 'integrity', {{
      get: function() {{ return ''; }},
      set: function() {{ /* ignore and strip */ }},
      configurable: true
    }});
  }} catch(e) {{}}

  try {{
    const originalSetAttribute = Element.prototype.setAttribute;
    Element.prototype.setAttribute = function(name, value) {{
      const lowerName = name.toLowerCase();
      if (lowerName === 'integrity') {{
        return; // Strip integrity attributes dynamically to prevent SRI blockages
      }}
      let val = value;
      try {{
        const tagName = this.tagName.toLowerCase();
        if ((tagName === 'link' && lowerName === 'href') ||
            (tagName === 'script' && lowerName === 'src') ||
            (tagName === 'img' && lowerName === 'src')) {{
          val = rewriteUrl(value);
        }} else if (lowerName === 'srcset') {{
          val = String(value).split(',').map(part => {{
            const parts = part.trim().split(/\s+/);
            if (parts[0]) parts[0] = rewriteUrl(parts[0]);
            return parts.join(' ');
          }}).join(', ');
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

  try {{
    const originalWorker = window.Worker;
    window.Worker = function(scriptURL, options) {{
      if (scriptURL && typeof scriptURL === 'string') {{
        scriptURL = rewriteUrl(scriptURL);
      }} else if (scriptURL instanceof URL) {{
        scriptURL = new URL(rewriteUrl(scriptURL.href));
      }}
      return new originalWorker(scriptURL, options);
    }};
  }} catch(e) {{}}

  try {{
    const originalSharedWorker = window.SharedWorker;
    window.SharedWorker = function(scriptURL, options) {{
      if (scriptURL && typeof scriptURL === 'string') {{
        scriptURL = rewriteUrl(scriptURL);
      }} else if (scriptURL instanceof URL) {{
        scriptURL = new URL(rewriteUrl(scriptURL.href));
      }}
      return new originalSharedWorker(scriptURL, options);
    }};
  }} catch(e) {{}}

  const nativePushState = History.prototype.pushState;
  const nativeReplaceState = History.prototype.replaceState;

  // ─── Capture native location getters BEFORE we patch them ─────────────────
  // All internal shim functions must use these, never the patched window.location.*
  // properties, to avoid infinite recursion (patched getter → getLogicalUrlObject
  // → getCurrentLogicalUrl → patched getter → ...).
  const _nativeLocationDesc = Object.getOwnPropertyDescriptor(window.location, 'search')
    || Object.getOwnPropertyDescriptor(Location.prototype, 'search');
  const _nativeSearch   = _nativeLocationDesc ? () => _nativeLocationDesc.get.call(window.location) : () => window.location.search;

  const _nativePathnameDesc = Object.getOwnPropertyDescriptor(window.location, 'pathname')
    || Object.getOwnPropertyDescriptor(Location.prototype, 'pathname');
  const _nativePathname = _nativePathnameDesc ? () => _nativePathnameDesc.get.call(window.location) : () => window.location.pathname;

  const _nativeHashDesc = Object.getOwnPropertyDescriptor(window.location, 'hash')
    || Object.getOwnPropertyDescriptor(Location.prototype, 'hash');
  const _nativeHash     = _nativeHashDesc ? () => _nativeHashDesc.get.call(window.location) : () => window.location.hash;

  const _nativeHref     = _nativeHrefDesc ? () => _nativeHrefDesc.get.call(window.location) : () => window.location.href;

  const _log = function(...args) {{
    try {{
      if (window.parent && window.parent !== window && window.parent.console) {{
        window.parent.console.log("[STAGE Frame Bootstrap]", ...args);
      }} else {{
        console.log("[STAGE Frame Bootstrap]", ...args);
      }}
    }} catch (_) {{
      console.log("[STAGE Frame Bootstrap]", ...args);
    }}
  }};
  const _warn = function(...args) {{
    try {{
      if (window.parent && window.parent !== window && window.parent.console) {{
        window.parent.console.warn("[STAGE Frame Bootstrap WARN]", ...args);
      }} else {{
        console.warn("[STAGE Frame Bootstrap WARN]", ...args);
      }}
    }} catch (_) {{
      console.warn("[STAGE Frame Bootstrap WARN]", ...args);
    }}
  }};
  const _error = function(...args) {{
    try {{
      if (window.parent && window.parent !== window && window.parent.console) {{
        window.parent.console.error("[STAGE Frame Bootstrap ERROR]", ...args);
      }} else {{
        console.error("[STAGE Frame Bootstrap ERROR]", ...args);
      }}
    }} catch (_) {{
      console.error("[STAGE Frame Bootstrap ERROR]", ...args);
    }}
  }};

  // Returns the real current page URL on the TARGET site (not the proxy URL).
  // Always reads via native search getter to avoid circular patching.
  function getCurrentLogicalUrl() {{
    try {{
      const params = new URLSearchParams(_nativeSearch());
      const urlParam = params.get('url');
      if (urlParam) {{
        return new URL(urlParam).href;
      }}
      const currentPath = _nativePathname() + _nativeSearch() + _nativeHash();
      if (currentPath && !currentPath.startsWith('/proxy/session/')) {{
        return new URL(currentPath, window.__STAGE_TARGET_ORIGIN__).href;
      }}
    }} catch (_) {{}}
    return window.__STAGE_TARGET_URL__;
  }}

  function resolveLogicalTargetUrl(inputUrl) {{
    try {{
      if (!inputUrl) return window.__STAGE_TARGET_URL__;
      const str = String(inputUrl);
      if (str.includes('/proxy/session/')) {{
        try {{
          const absoluteProxyUrl = new URL(str, window.__STAGE_PROXY_ORIGIN__);
          const urlParam = absoluteProxyUrl.searchParams.get('url');
          if (urlParam) {{
            return new URL(urlParam).href;
          }}
          const baseOrigin = new URL(window.__STAGE_TARGET_URL__).origin;
          return baseOrigin + '/';
        }} catch (e) {{
          return window.__STAGE_TARGET_URL__;
        }}
      }}
      const resolved = new URL(str, window.__STAGE_TARGET_URL__);
      return resolved.href;
    }} catch (e) {{
      return window.__STAGE_TARGET_URL__;
    }}
  }}

  function _nativeTransportPath() {{
    // Returns the actual browser transport path using native (unpatched) getters.
    return _nativePathname() + _nativeSearch() + _nativeHash();
  }}

  function extractLogicalRelativePath(inputUrl) {{
    try {{
      const resolved = resolveLogicalTargetUrl(inputUrl);
      const u = new URL(resolved);
      return u.pathname + u.search + u.hash;
    }} catch (_) {{
      return '/';
    }}
  }}

  function safeCallNativePushReplace(nativeMethod, state, unused, relativePath) {{
    const baseTag = document.querySelector('base');
    const originalHref = baseTag ? baseTag.getAttribute('href') : null;

    if (baseTag) {{
      baseTag.removeAttribute('href'); // Temporarily remove base href so URL resolves relative to document origin (localhost:8765) without SecurityError
    }}

    try {{
      nativeMethod.call(this, state, unused || '', relativePath);
    }} catch (err) {{
      console.warn("[STAGE History Shim] Failed native call", err);
      try {{
        nativeMethod.call(this, state, unused || '', _nativePathname() + _nativeSearch());
      }} catch (_) {{}}
    }} finally {{
      if (baseTag && originalHref !== null) {{
        baseTag.setAttribute('href', originalHref);
      }}
    }}
  }}

  _log("Initializing...");
  _log("Native URL info: pathname=" + _nativePathname() + " search=" + _nativeSearch());
  try {{
    const _initTarget = new URL(window.__STAGE_TARGET_URL__);
    const _initRelativePath = _initTarget.pathname + _initTarget.search + _initTarget.hash;
    _log("Performing initial replaceState alignment to relative path:", _initRelativePath);
    safeCallNativePushReplace.call(history, nativeReplaceState, history.state, '', _initRelativePath);
    _log("Post-alignment Native URL info: pathname=" + _nativePathname() + " search=" + _nativeSearch());
  }} catch (err) {{
    _error("Initial replaceState alignment threw an error:", err);
  }}

  History.prototype.pushState = function(state, unused, url) {{
    const logicalTargetUrl = resolveLogicalTargetUrl(url);
    const relativePath = extractLogicalRelativePath(url);
    console.debug("[STAGE History Shim] input=" + url + " logical=" + logicalTargetUrl + " relativePath=" + relativePath + " type=pushState");
    safeCallNativePushReplace.call(this, nativePushState, state, unused, relativePath);
    window.__STAGE_TARGET_URL__ = logicalTargetUrl;
    window.STAGE_TARGET_URL = logicalTargetUrl;
    if (window.STAGE) {{
      window.STAGE.pageUrl = logicalTargetUrl;
      window.STAGE.targetUrl = logicalTargetUrl;
    }}
    try {{
      const baseTag = document.querySelector('base');
      if (baseTag) {{
        baseTag.setAttribute('href', window.__STAGE_TARGET_ORIGIN__ + '/');
      }}
    }} catch (_) {{}}
    window.dispatchEvent(new CustomEvent('stage:navigation', {{
      detail: {{
        type: 'pushState',
        logicalTargetUrl: logicalTargetUrl,
        relativePath: relativePath
      }}
    }}));
  }};

  History.prototype.replaceState = function(state, unused, url) {{
    const logicalTargetUrl = resolveLogicalTargetUrl(url);
    const relativePath = extractLogicalRelativePath(url);
    console.debug("[STAGE History Shim] input=" + url + " logical=" + logicalTargetUrl + " relativePath=" + relativePath + " type=replaceState");
    safeCallNativePushReplace.call(this, nativeReplaceState, state, unused, relativePath);
    window.__STAGE_TARGET_URL__ = logicalTargetUrl;
    window.STAGE_TARGET_URL = logicalTargetUrl;
    if (window.STAGE) {{
      window.STAGE.pageUrl = logicalTargetUrl;
      window.STAGE.targetUrl = logicalTargetUrl;
    }}
    try {{
      const baseTag = document.querySelector('base');
      if (baseTag) {{
        baseTag.setAttribute('href', window.__STAGE_TARGET_ORIGIN__ + '/');
      }}
    }} catch (_) {{}}
    window.dispatchEvent(new CustomEvent('stage:navigation', {{
      detail: {{
        type: 'replaceState',
        logicalTargetUrl: logicalTargetUrl,
        relativePath: relativePath
      }}
    }}));
  }};

  history.pushState = History.prototype.pushState.bind(history);
  history.replaceState = History.prototype.replaceState.bind(history);

  window.addEventListener('popstate', function() {{
    const logicalTargetUrl = getCurrentLogicalUrl();
    const transportUrl = _nativeTransportPath();
    window.__STAGE_TARGET_URL__ = logicalTargetUrl;
    window.STAGE_TARGET_URL = logicalTargetUrl;
    if (window.STAGE) {{
      window.STAGE.pageUrl = logicalTargetUrl;
      window.STAGE.targetUrl = logicalTargetUrl;
    }}
    try {{
      const baseTag = document.querySelector('base');
      if (baseTag) {{
        baseTag.setAttribute('href', window.__STAGE_TARGET_ORIGIN__ + '/');
      }}
    }} catch (_) {{}}
    console.debug("[STAGE History Shim] input=" + window.location.href + " logical=" + logicalTargetUrl + " transport=" + transportUrl + " type=popstate");
    window.dispatchEvent(new CustomEvent('stage:navigation', {{
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
        return new URL(window.__STAGE_TARGET_URL__);
      }} catch (_) {{
        return {{
          href: window.__STAGE_TARGET_URL__,
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
    try {{
      Object.defineProperty(obj, prop, {{ get: getter, configurable: true }});
    }} catch(e) {{
      _warn("Failed to define " + prop + " on object:", e.message);
    }}
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

  try {{ Location.prototype.toString = function() {{ return getLogicalUrlObject().href; }}; }} catch (e) {{}}
  try {{ window.location.toString = function() {{ return getLogicalUrlObject().href; }}; }} catch (e) {{}}
  try {{
    window.STAGE_GET_LOGICAL_URL = function() {{ return getLogicalUrlObject().href; }};
    if (String(window.location) !== window.STAGE_GET_LOGICAL_URL()) {{
      _error("Location stringification bypassed logical URL: " + String(window.location));
    }} else {{
      _log("Location stringification assertion passed: " + String(window.location));
    }}
  }} catch (e) {{}}

  window.__STAGE_LOGICAL_LOCATION__ = {{
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

  window.__STAGE_GET_LOGICAL_URL__ = function() {{
    return getLogicalUrlObject().href;
  }};

  // ─── window.top / window.parent location guard ──────────────────────────
  // Third-party scripts (Memberstack, Intercom, etc.) read window.top.location
  // or window.parent.location which throws a SecurityError in a cross-origin iframe.
  // We patch them to return the logical location object so the check succeeds
  // without throwing, while keeping the page's own scripts functional.
  (function() {{
    var _safeTopLocation = {{
      get href()     {{ return getLogicalUrlObject().href; }},
      get origin()   {{ return getLogicalUrlObject().origin; }},
      get protocol() {{ return getLogicalUrlObject().protocol; }},
      get host()     {{ return getLogicalUrlObject().host; }},
      get hostname() {{ return getLogicalUrlObject().hostname; }},
      get pathname() {{ return getLogicalUrlObject().pathname; }},
      get search()   {{ return getLogicalUrlObject().search; }},
      get hash()     {{ return getLogicalUrlObject().hash; }},
      toString: function() {{ return getLogicalUrlObject().href; }},
      assign: function() {{}},
      replace: function() {{}},
      reload: function() {{}}
    }};
    // Patch window.top — safe accessor that catches SecurityError and returns our stub
    try {{
      Object.defineProperty(window, 'top', {{
        get: function() {{
          try {{ var t = window.parent; if (t === window) return window; }} catch(_) {{}}
          // Return a stub that looks like window but has our safe location
          return {{
            location: _safeTopLocation,
            document: {{}},
            STAGE: window.STAGE,
            __STAGE__: window.__STAGE__
          }};
        }},
        configurable: true
      }});
    }} catch(_) {{}}
    // Also patch window.parent.location in case top succeeds but parent.location throws
    try {{
      var _origParentDesc = Object.getOwnPropertyDescriptor(window, 'parent');
      if (!_origParentDesc) {{
        Object.defineProperty(window, 'parent', {{
          get: function() {{
            return {{ location: _safeTopLocation }};
          }},
          configurable: true
        }});
      }}
    }} catch(_) {{}}
  }})();

  // Rewrite CSS rules containing url(...)
  function rewriteCSS(cssText) {{
    if (!cssText || typeof cssText !== 'string') return cssText;
    try {{
      // NOTE: The character class [^'")\\] requires exactly the chars shown.
      // Previous bug: missing backslash before ] causing "missing /" SyntaxError.
      return cssText.replace(/url\((['"]?)([^'"\\)]+)\1\)/gi, function(match, quote, url) {{
        try {{
          return "url('" + rewriteUrl(url) + "')";
        }} catch(e) {{
          return match; // Leave unchanged on error
        }}
      }});
    }} catch(e) {{
      return cssText; // Return unchanged if regex itself fails
    }}
  }}

  // 1. Patch CSSStyleSheet.prototype.insertRule
  try {{
    const originalInsertRule = CSSStyleSheet.prototype.insertRule;
    CSSStyleSheet.prototype.insertRule = function(rule, index) {{
      return originalInsertRule.call(this, rewriteCSS(rule), index);
    }};
  }} catch(e) {{}}

  // 2. Patch Node.prototype.textContent & Element.prototype.innerHTML for <style> elements
  try {{
    const nodeTextDesc = Object.getOwnPropertyDescriptor(Node.prototype, 'textContent');
    if (nodeTextDesc && nodeTextDesc.set) {{
      Object.defineProperty(Node.prototype, 'textContent', {{
        get: function() {{ return nodeTextDesc.get.call(this); }},
        set: function(val) {{
          let value = val;
          if (this.tagName && this.tagName.toLowerCase() === 'style') {{
            value = rewriteCSS(val);
          }}
          nodeTextDesc.set.call(this, value);
        }},
        configurable: true
      }});
    }}
  }} catch(e) {{}}

  try {{
    const elementHTMLDesc = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
    if (elementHTMLDesc && elementHTMLDesc.set) {{
      Object.defineProperty(Element.prototype, 'innerHTML', {{
        get: function() {{ return elementHTMLDesc.get.call(this); }},
        set: function(val) {{
          let value = val;
          if (this.tagName && this.tagName.toLowerCase() === 'style') {{
            value = rewriteCSS(val);
          }}
          elementHTMLDesc.set.call(this, value);
        }},
        configurable: true
      }});
    }}
  }} catch(e) {{}}

  // 3. Patch CSSStyleDeclaration.prototype.setProperty and cssText
  try {{
    const originalSetProperty = CSSStyleDeclaration.prototype.setProperty;
    CSSStyleDeclaration.prototype.setProperty = function(property, value, priority) {{
      let val = value;
      if (typeof val === 'string' && val.includes('url(')) {{
        val = rewriteCSS(val);
      }}
      return originalSetProperty.call(this, property, val, priority);
    }};
  }} catch(e) {{}}

  try {{
    const cssTextDesc = Object.getOwnPropertyDescriptor(CSSStyleDeclaration.prototype, 'cssText');
    if (cssTextDesc && cssTextDesc.set) {{
      Object.defineProperty(CSSStyleDeclaration.prototype, 'cssText', {{
        get: function() {{ return cssTextDesc.get.call(this); }},
        set: function(val) {{
          cssTextDesc.set.call(this, rewriteCSS(val));
        }},
        configurable: true
      }});
    }}
  }} catch(e) {{}}

  // Ensure window.lastpageurl is set initially
  window.lastpageurl = window.__STAGE_TARGET_URL__;
}})();
</script>
<!-- STAGE_BOOTSTRAP_END -->"""

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
    first child of <head> (right after the STAGE bootstrap).
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
  // flag the page so the STAGE agent can optimise cursor relay frequency.
  var _origAdd = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function(type, listener, opts) {
    if (type === 'mousemove' || type === 'pointermove') {
      try { window.__STAGE_HAS_CURSOR_EFFECTS__ = true; } catch(_) {}
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
    Triggers STAGE_WEBGL_FAILED postMessage on context creation failures to handle degradation warning.
    """
    patch = """<script>
(function() {
  try {
    var _origGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type, attribs) {
      try { this.__stage_context_type = type; } catch(_) {}
      var rest = Array.prototype.slice.call(arguments, 2);
      if (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl') {
        try {
          var newAttribs = Object.assign({}, attribs || {}, { preserveDrawingBuffer: true });
          var args = [type, newAttribs].concat(rest);
          var ctx = _origGetContext.apply(this, args);
          if (!ctx) {
            console.warn('[STAGE] WebGL context creation failed. Degrading to static layer.');
            window.parent.postMessage({ type: 'STAGE_WEBGL_FAILED' }, '*');
          }
          return ctx;
        } catch(err) {
          console.error('[STAGE] WebGL error:', err);
          window.parent.postMessage({ type: 'STAGE_WEBGL_FAILED' }, '*');
          return null;
        }
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
        console.log('[STAGE] Service Worker registration blocked:', scriptURL);
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
def strip_or_fix_base_tag(html: str) -> str:
    """
    Removes cross-origin <base href="..."> tags from the HTML.
    Cross-origin <base> tags break window.history.pushState / replaceState in Chrome
    with SecurityError: A history state object cannot be created for a document in another origin.
    Removing cross-origin base tags keeps document.baseURI same-origin so React Router
    and client-side SPA routing can freely update history state.
    """
    base_regex = re.compile(r'<base\s+[^>]*>', re.IGNORECASE)
    return base_regex.sub('', html)


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
    Appends the STAGE agent script tag just before </body>.
    """
    if not agent_url:
        return html
    # Check if stage-agent.js is already present in the HTML (exactly-once injection check)
    if "stage-agent.js" in html:
        return html
    agent_tag = f'<script src="{agent_url}" defer></script>'
    if "</body>" in html:
        return html.replace("</body>", f"{agent_tag}</body>", 1)
    elif "</BODY>" in html:
        return html.replace("</BODY>", f"{agent_tag}</BODY>", 1)
    return html + agent_tag


# ── STEP 7 ────────────────────────────────────────────────────────────────────
def proxy_stylesheets_and_fonts(html: str, api_base: str, session_id: str, page_url: str) -> str:
    """
    Rewrites <link rel="stylesheet">, <link rel="preload" as="font">,
    <script src="...">, and inline <style> blocks to route through the
    proxy's asset endpoint.
    """
    origin = _target_origin(page_url)

    def _make_asset_proxy_url(href: str) -> str:
        """Build the proxy asset URL for a given href relative to the target origin."""
        if href.startswith("data:") or href.startswith("blob:") or "proxy/session" in href:
            return None
        # Resolve against origin root so root-relative paths are correct
        resolved_url = urllib.parse.urljoin(origin + '/', href.lstrip('/') if href.startswith('/') else href)
        # For absolute URLs on a different origin, use as-is
        if href.startswith('http://') or href.startswith('https://'):
            resolved_url = href
        parsed_res = urllib.parse.urlparse(resolved_url)
        proxy_url = f"{api_base.rstrip('/')}/proxy/session/{session_id}/asset/{parsed_res.scheme}/{parsed_res.netloc}{parsed_res.path}"
        if parsed_res.query:
            proxy_url += f"?{parsed_res.query}"
        return proxy_url

    def link_replacer(match):
        tag = match.group(0)
        is_stylesheet = re.search(r'rel=["\']stylesheet["\']', tag, re.IGNORECASE)
        is_font_preload = re.search(r'rel=["\']preload["\']', tag, re.IGNORECASE) and re.search(r'as=["\']font["\']', tag, re.IGNORECASE)
        is_script_preload = re.search(r'rel=["\']preload["\']', tag, re.IGNORECASE) and re.search(r'as=["\']script["\']', tag, re.IGNORECASE)
        is_modulepreload = re.search(r'rel=["\']modulepreload["\']', tag, re.IGNORECASE)

        if not (is_stylesheet or is_font_preload or is_script_preload or is_modulepreload):
            return tag

        href_match = re.search(r'href=["\']([^"\']+)["\']', tag, re.IGNORECASE)
        if not href_match:
            return tag

        href = href_match.group(1)
        proxy_url = _make_asset_proxy_url(href)
        if proxy_url is None:
            return tag

        # Rewrite href
        tag = tag[:href_match.start(1)] + proxy_url + tag[href_match.end(1):]

        # Strip integrity and crossorigin attributes
        tag = re.sub(r'\s+integrity=["\'][^"\']*["\']', '', tag, flags=re.IGNORECASE)
        tag = re.sub(r'\s+crossorigin(?:=["\'][^"\']*["\'])?', '', tag, flags=re.IGNORECASE)
        return tag

    def script_src_replacer(match):
        tag = match.group(0)
        # Skip inline scripts (no src attr) and already-proxied scripts
        src_match = re.search(r'\bsrc=["\']([^"\']+)["\']', tag, re.IGNORECASE)
        if not src_match:
            return tag

        src = src_match.group(1)
        # Never rewrite the STAGE agent itself
        if "stage-agent.js" in src:
            return tag
        # Skip data: URLs and already-proxied
        if src.startswith("data:") or "proxy/session" in src:
            return tag

        proxy_url = _make_asset_proxy_url(src)
        if proxy_url is None:
            return tag

        tag = tag[:src_match.start(1)] + proxy_url + tag[src_match.end(1):]
        # Strip SRI
        tag = re.sub(r'\s+integrity=["\'][^"\']*["\']', '', tag, flags=re.IGNORECASE)
        tag = re.sub(r'\s+crossorigin(?:=["\'][^"\']*["\'])?', '', tag, flags=re.IGNORECASE)
        return tag

    def style_replacer(match):
        content = match.group(0)
        def url_replacer(m):
            url = m.group(1)
            if url.startswith("data:") or "proxy/session" in url:
                return m.group(0)
            resolved_url = urllib.parse.urljoin(origin + '/', url.lstrip('/') if url.startswith('/') else url)
            if url.startswith('http://') or url.startswith('https://'):
                resolved_url = url
            parsed_res = urllib.parse.urlparse(resolved_url)
            proxy_url = f"{api_base.rstrip('/')}/proxy/session/{session_id}/asset/{parsed_res.scheme}/{parsed_res.netloc}{parsed_res.path}"
            if parsed_res.query:
                proxy_url += f"?{parsed_res.query}"
            return f"url('{proxy_url}')"
        return re.sub(r'url\([\'"]?([^\'"\\)]+)[\'"]?\)', url_replacer, content, flags=re.IGNORECASE)

    html = re.sub(r'<link\s+[^>]+>', link_replacer, html, flags=re.IGNORECASE)
    html = re.sub(r'<script\b[^>]+>', script_src_replacer, html, flags=re.IGNORECASE)
    html = re.sub(r'<style[^>]*>[\s\S]*?</style>', style_replacer, html, flags=re.IGNORECASE)
    return html


# ── Media rewriting ───────────────────────────────────────────────────────────
def proxy_media_attributes(html: str, api_base: str, session_id: str, page_url: str) -> str:
    """
    Rewrites src attributes on <img>, <video>, <audio>, <source>, <embed>, and data on <object>
    to route through the proxy's asset endpoint.
    """
    origin = _target_origin(page_url)

    def media_replacer(match):
        tag = match.group(0)
        src_match = re.search(r'\b(src|data)=["\']([^"\']+)["\']', tag, re.IGNORECASE)
        if not src_match:
            return tag
        src_val = src_match.group(2)
        if src_val.startswith("data:") or src_val.startswith("blob:") or "proxy/session" in src_val:
            return tag
        resolved_url = urllib.parse.urljoin(origin + '/', src_val.lstrip('/') if src_val.startswith('/') else src_val)
        if src_val.startswith('http://') or src_val.startswith('https://'):
            resolved_url = src_val
        parsed_res = urllib.parse.urlparse(resolved_url)
        proxy_url = f"{api_base.rstrip('/')}/proxy/session/{session_id}/asset/{parsed_res.scheme}/{parsed_res.netloc}{parsed_res.path}"
        if parsed_res.query:
            proxy_url += f"?{parsed_res.query}"
        tag = tag[:src_match.start(2)] + proxy_url + tag[src_match.end(2):]
        # Strip integrity/crossorigin
        tag = re.sub(r'\s+integrity=["\'][^"\']*["\']', '', tag, flags=re.IGNORECASE)
        tag = re.sub(r'\s+crossorigin(?:=["\'][^"\']*["\'])?', '', tag, flags=re.IGNORECASE)
        return tag

    return re.sub(r'<(?:img|video|audio|source|embed|object)\b[^>]+>', media_replacer, html, flags=re.IGNORECASE)


# ── Srcset rewriting ──────────────────────────────────────────────────────────
def proxy_srcset_attributes(html: str, api_base: str, session_id: str, page_url: str) -> str:
    """
    Rewrites srcset attributes on all elements (usually <img> or <source>) in the HTML
    to route the image URLs through the proxy's asset endpoint.
    """
    origin = _target_origin(page_url)

    def srcset_replacer(match):
        tag = match.group(0)
        srcset_match = re.search(r'srcset=["\']([^"\']+)["\']', tag, re.IGNORECASE)
        if not srcset_match:
            return tag

        srcset_val = srcset_match.group(1)
        parts = []
        for part in srcset_val.split(','):
            part = part.strip()
            if not part:
                continue
            subparts = part.split()
            if not subparts:
                continue
            url = subparts[0]
            if not (url.startswith("data:") or "proxy/session" in url):
                resolved_url = urllib.parse.urljoin(origin + '/', url.lstrip('/') if url.startswith('/') else url)
                if url.startswith('http://') or url.startswith('https://'):
                    resolved_url = url
                parsed_res = urllib.parse.urlparse(resolved_url)
                proxy_url = f"{api_base.rstrip('/')}/proxy/session/{session_id}/asset/{parsed_res.scheme}/{parsed_res.netloc}{parsed_res.path}"
                if parsed_res.query:
                    proxy_url += f"?{parsed_res.query}"
                subparts[0] = proxy_url
            parts.append(" ".join(subparts))

        new_srcset = ", ".join(parts)
        return tag[:srcset_match.start(1)] + new_srcset + tag[srcset_match.end(1):]

    return re.sub(r'<[^>]+\bsrcset=["\'][^"\']+["\'][^>]*>', srcset_replacer, html, flags=re.IGNORECASE)


# ── SRI stripping ─────────────────────────────────────────────────────────────
def strip_sri_attributes(html: str) -> str:
    """
    Strips `integrity` and matching `crossorigin` attributes from ALL <link>,
    <script>, and <img> tags in the rewritten HTML.
    """
    def _strip_sri(m: re.Match) -> str:
        tag = m.group(0)
        tag = re.sub(r'\s+integrity=["\'][^"\']*["\']', '', tag, flags=re.IGNORECASE)
        tag = re.sub(r'\s+crossorigin(?:=["\'][^"\']*["\'])?', '', tag, flags=re.IGNORECASE)
        return tag

    html = re.sub(r'<link\b[^>]+>', _strip_sri, html, flags=re.IGNORECASE)
    html = re.sub(r'<script\b[^>]+>', _strip_sri, html, flags=re.IGNORECASE)
    html = re.sub(r'<img\b[^>]+>', _strip_sri, html, flags=re.IGNORECASE)
    return html


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

    Architectural rules enforced here:
      DOCUMENTS  → navigate through the session proxy route (/proxy/session/{id}/page?url=)
      ASSETS     → resolve to absolute target origin URLs, fetched via asset proxy
      TRACKING   → page_url is always the real target URL (never the proxy transport URL)
    """
    logger.info(
        f"[PROXY_REWRITE] Starting HTML rewrite for session={session_id}, "
        f"page_url={page_url}, snapshot={snapshot_mode}, "
        f"conservative={conservative_render_mode}"
    )

    # ── Phase 1: Rewrite static HTML asset references ─────────────────────────
    html = proxy_stylesheets_and_fonts(html, api_base, session_id, page_url)
    html = proxy_media_attributes(html, api_base, session_id, page_url)
    html = proxy_srcset_attributes(html, api_base, session_id, page_url)

    # Strip SRI attributes globally
    html = strip_sri_attributes(html)
    logger.info("[PROXY_REWRITE] SRI integrity attributes stripped from all link/script tags")

    # Strip any cross-origin <base> tag that could break window.history in the browser
    html = strip_or_fix_base_tag(html)

    # ── Phase 2: snapshot_mode — strip all script tags ────────────────────────
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

    # ── Phase 3: Inject STAGE shims ───────────────────────────────────────────
    proxy_base_url = f"{api_base.rstrip('/')}/proxy/session/{session_id}"

    agent_script_url = os.getenv(
        "PROXY_AGENT_SCRIPT_URL",
        f"{api_base.rstrip('/')}/static/stage-agent.js",
    )

    if conservative_render_mode:
        logger.info("[PROXY_REWRITE] Conservative Render Mode Active - injecting scripts at the end of <head>")

        bootstrap_script = inject_bootstrap("<html><head></head></html>", page_url, str(session_id), proxy_base_url, api_base)
        cursor_script = inject_cursor_relay_bridge("<html><head></head></html>")
        webgl_script = inject_webgl_patch("<html><head></head></html>")
        sw_script = inject_sw_killer("<html><head></head></html>")
        guard_script = inject_chunk_guard("<html><head></head></html>")

        def extract_script(h):
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

        head_start_match = re.search(r'<head\b[^>]*>', html, re.IGNORECASE)
        if head_start_match:
            idx = head_start_match.end()
            html = html[:idx] + f"\n{combined_shims}\n" + html[idx:]
        else:
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
        html = inject_chunk_guard(html)

    # ── Phase 4: Agent ────────────────────────────────────────────────────────
    # Append-only before </body>, never touch existing scripts
    html = inject_agent(html, agent_script_url)

    # ── Phase 5: Remove CSP / frame security meta tags ────────────────────────
    html = re.sub(
        r'<meta\s+[^>]*http-equiv=["\']?(?:content-security-policy|x-frame-options|frame-ancestors)["\']?[^>]*>',
        "",
        html,
        flags=re.IGNORECASE,
    )

    return html
