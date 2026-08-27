import urllib.parse
import re
import os
import logging
import json
import time

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

// Force-enable 3D features by setting common flags
window.DISABLE_3D = false;
window.__DISABLE_3D__ = false;
window.NEXT_PUBLIC_DISABLE_3D = false;

// Mark as production environment (many sites disable 3D in dev/test)
window.__NEXT_PUBLIC_ENV__ = 'production';
window.__ENV__ = window.__ENV__ || {{}};
window.__ENV__.NEXT_PUBLIC_ENV = 'production';
window.process = window.process || {{}};
window.process.env = window.process.env || {{}};
window.process.env.NODE_ENV = 'production';

// Disable debug mode (some sites disable heavy features in debug)
window.DEBUG = false;
window.__DEBUG__ = false;

// Signal that we're in a "real" browser context
window.__STAGE_PROXY__ = true;

// Public canonical aliases (no double-underscores) — used by agent and external consumers
window.STAGE_SESSION_ID = window.__STAGE_SESSION_ID__;
window.STAGE_TARGET_URL = window.__STAGE_TARGET_URL__;
window.STAGE_TARGET_ORIGIN = window.__STAGE_TARGET_ORIGIN__;

window.STAGE = window.STAGE || {{}};
window.STAGE.sessionId = window.__STAGE_SESSION_ID__;
window.STAGE.proxyOrigin = window.__STAGE_PROXY_ORIGIN__;
window.STAGE.assetBase = window.__STAGE_PROXY_ORIGIN__ + '/proxy/session/' + window.__STAGE_SESSION_ID__ + '/asset';
window.STAGE.pageBase = window.__STAGE_PROXY_ORIGIN__ + '/proxy/session/' + window.__STAGE_SESSION_ID__ + '/page';
window.STAGE.pageUrl = window.__STAGE_TARGET_URL__;
window.STAGE.targetUrl = window.__STAGE_TARGET_URL__;
window.STAGE.targetOrigin = window.__STAGE_TARGET_ORIGIN__;
window.STAGE.transportUrl = window.__STAGE_TRANSPORT_URL__;

function buildStageAssetUrl(absoluteUrl) {{
  var assetBase = window.STAGE && window.STAGE.assetBase;
  if (!assetBase || !absoluteUrl) return absoluteUrl;
  try {{
    var target = new URL(absoluteUrl);
    var scheme = target.protocol.replace(':', '');
    var host = target.host;
    var path = target.pathname.replace(/^\\/+/, '');
    var query = target.search || '';
    return assetBase + '/' + scheme + '/' + host + '/' + path + query;
  }} catch (e) {{
    return absoluteUrl;
  }}
}}
window.buildStageAssetUrl = buildStageAssetUrl;

function assertStageProxyContract() {{
  var s = window.STAGE || {{}};
  var ok = typeof s.sessionId === 'string' && typeof s.assetBase === 'string' && s.assetBase.indexOf('/proxy/session/' + s.sessionId + '/asset') !== -1;
  if (!ok) {{
    try {{
      if (window.parent && window.parent !== window) {{
        window.parent.postMessage({{
          type: 'STAGE_DIAGNOSTIC',
          code: 'ASSET_ROUTE_CONTRACT_INVALID',
          assetBase: s.assetBase || null,
          sessionId: s.sessionId || null
        }}, '*');
      }}
    }} catch (_) {{}}
  }}
}}
assertStageProxyContract();

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
    '.glb', '.gltf', '.hdr', '.exr', '.fbx', '.bin', '.splinecode', '.spline',
    '.obj', '.mtl', '.usdz', '.ply', '.splat', '.ktx2', '.basis', '.drc',
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

    // Route through canonical proxy asset builder — preserves absolute target URL in the path
    return buildStageAssetUrl(absoluteUrl);
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

  // ─── Turbopack & Webpack Dynamic Chunk Unwrapper ─────────────────────────
  (function installChunkUnwrapper() {{
    function unwrapScriptUrl(url) {{
      if (!url || typeof url !== 'string') return url;
      var match = url.match(/\/proxy\/session\/[^\/]+\/asset\/(?:https?\/[^\/]+)?(\/[^?#]*)/);
      if (match && match[1]) {{
        return match[1];
      }}
      return url;
    }}

    // Intercept document.currentScript getter
    try {{
      var currentScriptDesc = Object.getOwnPropertyDescriptor(Document.prototype, 'currentScript');
      if (!currentScriptDesc) {{
        currentScriptDesc = Object.getOwnPropertyDescriptor(HTMLDocument.prototype, 'currentScript');
      }}
      if (currentScriptDesc && currentScriptDesc.get) {{
        var origCurrentScriptGet = currentScriptDesc.get;
        Object.defineProperty(document, 'currentScript', {{
          get: function() {{
            var el = origCurrentScriptGet.call(this);
            if (!el) return el;
            try {{
              if (el.src && typeof el.src === 'string' && el.src.indexOf('/proxy/session/') !== -1) {{
                var logical = unwrapScriptUrl(el.src);
                if (logical !== el.src) {{
                  return new Proxy(el, {{
                    get: function(target, prop, receiver) {{
                      if (prop === 'src') return logical;
                      if (prop === 'getAttribute') {{
                        return function(attr) {{
                          if (attr === 'src') return logical;
                          return target.getAttribute(attr);
                        }};
                      }}
                      var val = Reflect.get(target, prop, target);
                      return typeof val === 'function' ? val.bind(target) : val;
                    }}
                  }});
                }}
              }}
            }} catch (_) {{}}
            return el;
          }},
          configurable: true
        }});
      }}
    }} catch (_) {{}}

    // Intercept TURBOPACK.push
    function wrapTurbopack(turbopackArr) {{
      if (!turbopackArr || turbopackArr.__stage_wrapped__) return turbopackArr;
      var origPush = turbopackArr.push;
      turbopackArr.push = function() {{
        for (var i = 0; i < arguments.length; i++) {{
          var item = arguments[i];
          if (Array.isArray(item) && item.length >= 1) {{
            var first = item[0];
            if (first && typeof first === 'object' && first.src) {{
              var unwrapped = unwrapScriptUrl(first.src);
              if (unwrapped !== first.src) {{
                item[0] = {{
                  src: unwrapped,
                  getAttribute: function(attr) {{
                    if (attr === 'src') return unwrapped;
                    return first.getAttribute ? first.getAttribute(attr) : null;
                  }}
                }};
              }}
            }}
          }}
        }}
        return origPush.apply(this, arguments);
      }};
      turbopackArr.__stage_wrapped__ = true;
      return turbopackArr;
    }}

    var _turbopack = globalThis.TURBOPACK;
    if (_turbopack) {{
      wrapTurbopack(_turbopack);
    }}
    try {{
      Object.defineProperty(globalThis, 'TURBOPACK', {{
        get: function() {{ return _turbopack; }},
        set: function(val) {{
          _turbopack = wrapTurbopack(val);
        }},
        configurable: true
      }});
    }} catch (_) {{}}
  }})();

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

  // Do NOT redefine window.location.pathname/search/hash/etc. – modern browsers reject this.
  // We normalize the URL via history.replaceState and patch toString + document.URL surfaces.
  define(document, 'URL', () => getLogicalUrlObject().href);
  define(document, 'documentURI', () => getLogicalUrlObject().href);
  define(document, 'baseURI', () => getLogicalUrlObject().href);
  define(document, 'referrer', () => '');

  // ─── document.location alias ───────────────────────────────────────────────
  // document.location is a separately addressable accessor used by some SPA
  // routers (e.g. Remix, older Reach Router) as a alternative to window.location.
  // We alias it to our patched window.location object.
  try {{
    define(document, 'location', () => window.location);
  }} catch (e) {{}}

  // ─── location.assign / replace intercept ──────────────────────────────────
  // Some SPA frameworks call location.assign(url) or location.replace(url)
  // directly after reading logical paths. We intercept these to log the
  // redirect target (for diagnostics) and let the browser handle it normally.
  // These MUST NOT be swallowed — they are real navigation intents.
  try {{
    const _nativeAssign  = Location.prototype.assign;
    const _nativeReplace = Location.prototype.replace;
    Location.prototype.assign = function(url) {{
      if (window.__STAGE_DIAG__) _log('[STAGE Diag] location.assign called with: ' + url);
      const logicalUrl = resolveLogicalTargetUrl(url);
      if (window.__STAGE_DIAG__ && logicalUrl !== url) _log('[STAGE Diag] location.assign → logical: ' + logicalUrl);
      return _nativeAssign.call(this, url);
    }};
    Location.prototype.replace = function(url) {{
      if (window.__STAGE_DIAG__) _log('[STAGE Diag] location.replace called with: ' + url);
      const logicalUrl = resolveLogicalTargetUrl(url);
      if (window.__STAGE_DIAG__ && logicalUrl !== url) _log('[STAGE Diag] location.replace → logical: ' + logicalUrl);
      return _nativeReplace.call(this, url);
    }};
  }} catch (e) {{}}

  // Patch window.location.toString and Location.prototype.toString
  try {{ Location.prototype.toString = function () {{ return getLogicalUrlObject().href; }}; }} catch (e) {{}}
  try {{
    Object.defineProperty(window.location, 'toString', {{
      value: function () {{ return getLogicalUrlObject().href; }},
      writable: true,
      configurable: true
    }});
  }} catch (e) {{
    try {{ window.location.toString = function () {{ return getLogicalUrlObject().href; }}; }} catch (_) {{}}
  }}
  try {{
    window.STAGE_GET_LOGICAL_URL = function () {{ return getLogicalUrlObject().href; }};
    if (window.STAGE_DEBUG_ROUTER_LEAKS) {{
      console.assert(
        String(window.location) === window.STAGE_GET_LOGICAL_URL(),
        "[STAGE SHIM ERROR] Location stringification bypassed logical URL: " + String(window.location)
      );
    }}
  }} catch (e) {{}}

  // ─── URL constructor leak guard ────────────────────────────────────────────
  // When app code does `new URL(location)` or `new URL(location.href)` it could
  // capture the TRANSPORT path /proxy/session/:id/page... as a base. We shim
  // the URL constructor: if the first argument is (or resolves to) a transport
  // path we silently substitute the logical URL so the resulting URL object
  // reflects the real target origin.
  //
  // CRITICAL: We preserve ALL static methods (createObjectURL, revokeObjectURL,
  // canParse, parse, etc.) using Object.getOwnPropertyNames and explicit definitions,
  // preventing 3D/WebGL and Web Worker libraries from crashing.
  try {{
    const _NativeURL = window.URL;
    function _CustomURL(input, base) {{
      if (!(this instanceof _CustomURL)) {{
        return new _CustomURL(input, base);
      }}
      try {{
        const inputStr = (input !== null && typeof input === 'object' && input.href) ? input.href : String(input);
        if (typeof inputStr === 'string' && inputStr.indexOf('/proxy/session/') !== -1 && inputStr.indexOf('/page') !== -1) {{
          const _u = new _NativeURL(inputStr, base);
          const _urlParam = _u.searchParams.get('url');
          if (_urlParam) {{
            if (window.__STAGE_DIAG__) _log('[STAGE Diag] URL() constructor intercepted transport → ' + _urlParam);
            return new _NativeURL(_urlParam);
          }}
        }}
      }} catch (_) {{}}
      return new _NativeURL(input, base);
    }}

    _CustomURL.prototype = _NativeURL.prototype;

    try {{
      Object.getOwnPropertyNames(_NativeURL).forEach(function(prop) {{
        if (prop !== 'prototype' && prop !== 'length' && prop !== 'name') {{
          try {{
            const desc = Object.getOwnPropertyDescriptor(_NativeURL, prop);
            if (desc) {{
              Object.defineProperty(_CustomURL, prop, desc);
            }}
          }} catch (_) {{
            _CustomURL[prop] = _NativeURL[prop];
          }}
        }}
      }});
    }} catch (_) {{}}

    if (typeof _NativeURL.createObjectURL === 'function') {{
      _CustomURL.createObjectURL = function(obj) {{ return _NativeURL.createObjectURL(obj); }};
    }}
    if (typeof _NativeURL.revokeObjectURL === 'function') {{
      _CustomURL.revokeObjectURL = function(url) {{ return _NativeURL.revokeObjectURL(url); }};
    }}
    if (typeof _NativeURL.canParse === 'function') {{
      _CustomURL.canParse = function(url, base) {{ return _NativeURL.canParse(url, base); }};
    }}
    if (typeof _NativeURL.parse === 'function') {{
      _CustomURL.parse = function(url, base) {{ return _NativeURL.parse(url, base); }};
    }}

    window.URL = _CustomURL;
  }} catch(e) {{}}

  // ─── Diagnostic mode ──────────────────────────────────────────────────────
  // Set window.__STAGE_DIAG__ = true from the console (or via URL param
  // ?__stage_diag=1) to enable verbose URL-surface tracing. Never always-on.
  try {{
    const _params = new URLSearchParams(_nativeSearch());
    if (_params.get('__stage_diag') === '1') {{
      window.__STAGE_DIAG__ = true;
      _log('[STAGE] Diagnostic mode ON (?__stage_diag=1)');
    }}
  }} catch (_) {{}}

  if (window.__STAGE_DIAG__) {{
    _log('[STAGE Diag] targetUrl=' + window.__STAGE_TARGET_URL__ +
         ' targetOrigin=' + window.__STAGE_TARGET_ORIGIN__ +
         ' sessionId=' + window.__STAGE_SESSION_ID__);
  }}

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

  // ─── window.top / window.parent location guard (safe for 3D/WebGL sites) ──
  (function () {{
    var _realParent = window.parent;
    var _realTop = window.top;

    var _safeTopLocation = {{
      get href()     {{ return getLogicalUrlObject().href; }},
      get origin()   {{ return (window.STAGE && window.STAGE.targetOrigin) || getLogicalUrlObject().origin; }},
      get protocol() {{ return getLogicalUrlObject().protocol; }},
      get host()     {{ return getLogicalUrlObject().host; }},
      get hostname() {{ return getLogicalUrlObject().hostname; }},
      get pathname() {{ return getLogicalUrlObject().pathname; }},
      get search()   {{ return getLogicalUrlObject().search; }},
      get hash()     {{ return getLogicalUrlObject().hash; }},
      toString: function () {{ return getLogicalUrlObject().href; }},
      assign: function (url) {{ window.location.assign(url); }},
      replace: function (url) {{ window.location.replace(url); }},
      reload: function (force) {{ window.location.reload(force); }}
    }};

    function _createSafeWrapper(targetWindow) {{
      var base = {{
        location: _safeTopLocation,
        document: window.document,
        addEventListener: function () {{
          try {{
            return window.addEventListener.apply(window, arguments);
          }} catch (e) {{
            try {{ return window.document.addEventListener.apply(window.document, arguments); }} catch (_) {{}}
          }}
        }},
        removeEventListener: function () {{
          try {{
            return window.removeEventListener.apply(window, arguments);
          }} catch (e) {{
            try {{ return window.document.removeEventListener.apply(window.document, arguments); }} catch (_) {{}}
          }}
        }},
        postMessage: function () {{
          try {{
            return targetWindow.postMessage.apply(targetWindow, arguments);
          }} catch (e) {{}}
        }},
        STAGE: window.STAGE,
        __STAGE__: window.__STAGE__
      }};

      if (typeof Proxy !== 'undefined') {{
        return new Proxy(base, {{
          get: function (target, prop) {{
            if (prop in target) {{
              return target[prop];
            }}
            try {{
              var val = window[prop];
              if (typeof val === 'function') {{
                return val.bind(window);
              }}
              return val;
            }} catch (_) {{
              return undefined;
            }}
          }},
          has: function (target, prop) {{
            return prop in target || prop in window;
          }}
        }});
      }}
      return base;
    }}

    // Patch window.top safely
    try {{
      Object.defineProperty(window, 'top', {{
        get: function () {{
          try {{
            if (_realTop === window) return window;
          }} catch (e) {{}}
          return _createSafeWrapper(_realTop);
        }},
        configurable: true
      }});
    }} catch (e) {{
      // If defineProperty fails, leave native top alone
    }}

    // Patch window.parent safely
    try {{
      var _origParentDesc = Object.getOwnPropertyDescriptor(window, 'parent');
      if (!_origParentDesc) {{
        Object.defineProperty(window, 'parent', {{
          get: function () {{
            try {{
              if (_realParent === window) return window;
            }} catch (e) {{}}
            return _createSafeWrapper(_realParent);
          }},
          configurable: true
        }});
      }}
    }} catch (e) {{
      // If defineProperty fails, leave native parent alone
    }}
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

  // ─── Intercept target="_blank" window.open and anchor clicks ─────────────
  try {{
    const originalOpen = window.open;
    window.open = function(url, target, features) {{
      const lowerTarget = String(target || '').toLowerCase();
      if (lowerTarget === '_blank') {{
        const logicalUrl = resolveLogicalTargetUrl(url || 'about:blank');
        try {{
          if (window.parent && window.parent !== window) {{
            window.parent.postMessage({{
              type: 'STAGE_OPEN_NEW_TAB',
              payload: {{
                url: logicalUrl,
                source: 'window.open',
                sessionId: window.__STAGE_SESSION_ID__
              }}
            }}, '*');
            _log('[STAGE] Intercepted window.open(_blank) to parent: ' + logicalUrl);
            return null;
          }}
        }} catch (err) {{
          _error('Error posting STAGE_OPEN_NEW_TAB from window.open:', err);
        }}
      }}
      return originalOpen.apply(this, arguments);
    }};
  }} catch (e) {{
    _error('Failed to patch window.open:', e);
  }}

  window.addEventListener('click', function(e) {{
    try {{
      const anchor = e.target.closest('a');
      if (!anchor) return;

      const href = anchor.getAttribute('href');
      const target = anchor.getAttribute('target');

      if (!href) return;
      const trimmedHref = href.trim();
      if (trimmedHref.startsWith('mailto:') ||
          trimmedHref.startsWith('tel:') ||
          trimmedHref.startsWith('javascript:') ||
          trimmedHref.startsWith('#') ||
          anchor.hasAttribute('download')) {{
        return;
      }}

      if (target && target.toLowerCase() === '_blank') {{
        const logicalUrl = resolveLogicalTargetUrl(href);
        if (window.parent && window.parent !== window) {{
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          
          window.parent.postMessage({{
            type: 'STAGE_OPEN_NEW_TAB',
            payload: {{
              url: logicalUrl,
              source: 'anchor',
              sessionId: window.__STAGE_SESSION_ID__
            }}
          }}, '*');
          _log('[STAGE] Intercepted anchor target=_blank to parent: ' + logicalUrl);
        }}
      }}
    }} catch (err) {{
      _error('Error in anchor target=_blank click interception:', err);
    }}
  }}, true);

  // Ensure window.lastpageurl is set initially
  window.lastpageurl = window.__STAGE_TARGET_URL__;
}})();
</script>
<!-- STAGE_BOOTSTRAP_END -->"""

    # Add environment flag injection (no location spoofing)
    env_flags = f"""
    <script>
    (function() {{
      // Store target URL for STAGE agent
      window.__STAGE_TARGET_URL__ = '{page_url}';
      
      // Force-enable 3D features by setting common flags
      window.DISABLE_3D = false;
      window.__DISABLE_3D__ = false;
      window.NEXT_PUBLIC_DISABLE_3D = false;
      
      // Mark as production environment (many sites disable 3D in dev/test)
      window.__NEXT_PUBLIC_ENV__ = 'production';
      window.__ENV__ = window.__ENV__ || {{}};
      window.__ENV__.NEXT_PUBLIC_ENV = 'production';
      
      // Disable debug mode (some sites disable heavy features in debug)
      window.DEBUG = false;
      window.__DEBUG__ = false;
      
      // Signal that we're in a "real" browser context
      window.__STAGE_PROXY__ = true;
      
      console.log('[STAGE] Environment flags injected for', '{page_url}');
      console.log('[STAGE] Flags:', {{
        DISABLE_3D: window.DISABLE_3D,
        NEXT_PUBLIC_ENV: window.__NEXT_PUBLIC_ENV__,
        DEBUG: window.DEBUG
      }});
    }})();
    </script>
    """

    head_match = re.search(r'</head>', html, re.IGNORECASE)
    if head_match:
        idx = head_match.start()
        return html[:idx] + f"\n{env_flags}\n{bootstrap}\n" + html[idx:]
    else:
        # head tag missing, create one
        html_match = re.search(r'<html\b[^>]*>', html, re.IGNORECASE)
        head_html = f"<head>\n{env_flags}\n{bootstrap}\n</head>"
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

  // ─── 2. Patch addEventListener ───────────────────────────────────────────
  var _origAdd = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function(type, listener, opts) {
    if (type === 'mousemove' || type === 'pointermove') {
      try { window.__STAGE_HAS_CURSOR_EFFECTS__ = true; } catch(_) {}
    }
    return _origAdd.call(this, type, listener, opts);
  };

  // ─── 3. Fire a synthetic center-of-viewport mousemove ─────────────────────
  // Defer until WebGL and core libraries have initialized (300ms after DOMContentLoaded)
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

  if (document.readyState === 'complete') {
    setTimeout(_dispatchCenter, 300);
  } else {
    document.addEventListener('DOMContentLoaded', function() {
      setTimeout(_dispatchCenter, 300);
    });
  }
  setTimeout(_dispatchCenter, 800);
  setTimeout(_dispatchCenter, 2000);
})();
</script>"""

    head_match = __import__('re').search(r'</head>', html, __import__('re').IGNORECASE)
    if head_match:
        idx = head_match.start()
        return html[:idx] + f"\n{bridge}\n" + html[idx:]
    return bridge + html


# ── STEP 3: WebGL Context Preservation & Diagnostics ──────────────────────────
def inject_webgl_patch(html: str) -> str:
    """
    Patch WebGL context creation to ensure capture compatibility.
    - Preserves site's explicit preserveDrawingBuffer choice
    - Forces preserveDrawingBuffer: true ONLY if site doesn't specify
    - Attaches context lost/restored listeners for diagnostics
    - Marks canvas with context type for agent detection
    """
    patch = """<script>
(function() {
  const nativeGetContext = HTMLCanvasElement.prototype.getContext;

  function markCanvasContext(canvas, type, context) {
    if (!canvas) return;
    try {
      canvas.__stage_context_type = type;
      canvas.stagecontexttype = type;
      canvas.__stage_gl = context || null;
    } catch (_) {}
    window.STAGE = window.STAGE || {};
    window.STAGE.hasWebGL = window.STAGE.hasWebGL || /webgl/i.test(type);
    if (/webgl/i.test(type) && context) {
      window.STAGE.glContext = context;
    }
  }
  window.markCanvasContext = markCanvasContext;

  function getCanvasContextType(canvas) {
    if (!canvas) return null;
    return (
      canvas.__stage_context_type ||
      canvas.stagecontexttype ||
      (typeof canvas.__stage_gl === "string" ? canvas.__stage_gl : null) ||
      null
    );
  }
  window.getCanvasContextType = getCanvasContextType;

  function inspectCanvasesSafely() {
    var canvases = Array.prototype.slice.call(document.querySelectorAll("canvas"));
    return canvases.map(function(c) {
      return {
        width: c.width,
        height: c.height,
        clientWidth: c.clientWidth,
        clientHeight: c.clientHeight,
        contextType: getCanvasContextType(c)
      };
    });
  }
  window.inspectCanvasesSafely = inspectCanvasesSafely;

  HTMLCanvasElement.prototype.getContext = function(type, attrs) {
    const isWebGL = type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl';

    if (!isWebGL) {
      const ctx = nativeGetContext.apply(this, arguments);
      if (ctx && type === '2d') {
        markCanvasContext(this, type, ctx);
      }
      return ctx;
    }

    // Preserve site's explicit choice
    const originalAttrs = attrs && typeof attrs === 'object' ? attrs : {};
    const patchedAttrs = { ...originalAttrs };

    // Only force preserveDrawingBuffer during an active capture — never during normal rendering
    if (!('preserveDrawingBuffer' in patchedAttrs)) {
      patchedAttrs.preserveDrawingBuffer = !!(window.STAGE && window.STAGE.captureMode);
    }

    // Desynchronized contexts are unsuitable for deterministic capture
    if (window.STAGE && window.STAGE.captureMode) {
      patchedAttrs.desynchronized = false;
    }

    let context = null;
    try {
      context = nativeGetContext.call(this, type, patchedAttrs);
    } catch (firstError) {
      // Native fallback: never break the target site
      try {
        context = nativeGetContext.apply(this, arguments);
      } catch (secondError) {
        console.warn('[STAGE WebGL] Context creation failed:', secondError);
        return null;
      }
    }

    if (!context) {
      console.warn('[STAGE WebGL] Context is null');
      return null;
    }

    // Mark canvas with context type for agent detection
    markCanvasContext(this, type, context);

    // Attach context lifecycle listeners (guarded against duplicate accumulation)
    if (this.addEventListener && !this.__stage_listeners_attached) {
      this.__stage_listeners_attached = true;
      this.addEventListener('webglcontextlost', (event) => {
        console.warn('[STAGE] WebGL context lost:', event.statusMessage);
        if (window.parent) {
          window.parent.postMessage({
            type: 'STAGE_WEBGL_CONTEXT_LOST',
            contextType: type,
            statusMessage: event.statusMessage
          }, '*');
        }
      }, false);

      this.addEventListener('webglcontextrestored', () => {
        console.log('[STAGE] WebGL context restored');
        if (window.parent) {
          window.parent.postMessage({
            type: 'STAGE_WEBGL_CONTEXT_RESTORED',
            contextType: type
          }, '*');
        }
      }, false);
    }

    return context;
  };

  console.log('[STAGE WebGL Patch] Installed');
})();
</script>"""
    head_match = re.search(r'</head>', html, re.IGNORECASE)
    if head_match:
        idx = head_match.start()
        return html[:idx] + f"\n{patch}\n" + html[idx:]
    return patch + "\n" + html


def inject_offscreen_canvas_patch(html: str) -> str:
    """
    Patch OffscreenCanvas for WebGPU/WebGL compatibility.
    """
    patch = """<script>
(function() {
  if (typeof OffscreenCanvas === 'undefined') return;

  const nativeOffscreenGetContext = OffscreenCanvas.prototype.getContext;

  OffscreenCanvas.prototype.getContext = function(type, attrs) {
    const isWebGL = type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl';

    if (!isWebGL) {
      return nativeOffscreenGetContext.apply(this, arguments);
    }

    const patchedAttrs = attrs ? { ...attrs } : {};

    if (!('preserveDrawingBuffer' in patchedAttrs)) {
      patchedAttrs.preserveDrawingBuffer = !!(window.STAGE && window.STAGE.captureMode);
    }

    let context = null;
    try {
      context = nativeOffscreenGetContext.call(this, type, patchedAttrs);
    } catch (error) {
      console.warn('[STAGE OffscreenCanvas] Context creation failed:', error);
      throw error;
    }

    if (context) {
      try {
        this.__stage_context_type = type;
        this.stagecontexttype = type;
      } catch (_) {}
    }

    return context;
  };

  console.log('[STAGE OffscreenCanvas Patch] Installed');
})();
</script>"""
    head_match = re.search(r'</head>', html, re.IGNORECASE)
    if head_match:
        idx = head_match.start()
        return html[:idx] + f"\n{patch}\n" + html[idx:]
    return patch + "\n" + html


# ── STEP 4: Service Worker Neutralizer ─────────────────────────────────────────
def inject_sw_killer(html: str) -> str:
    """
    Safely unregisters Service Workers and blocks new registrations without throwing in restricted frames.
    """
    sw_killer = """<script>
(function() {
  try {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(function(regs) {
        for (var i = 0; i < regs.length; i++) {
          regs[i].unregister().catch(function() {});
        }
      }).catch(function() {});
    }
  } catch(e) {}
  try {
    if ('serviceWorker' in navigator) {
      var origRegister = navigator.serviceWorker.register;
      navigator.serviceWorker.register = function(scriptURL, options) {
        console.log('[STAGE] Service Worker registration blocked:', scriptURL);
        return Promise.resolve({
          scope: (options && options.scope) || '/',
          active: null, installing: null, waiting: null,
          unregister: function() { return Promise.resolve(true); },
          addEventListener: function() {}, removeEventListener: function() {}
        });
      };
    }
  } catch(e) {}
})();
</script>"""
    head_match = re.search(r'</head>', html, re.IGNORECASE)
    if head_match:
        idx = head_match.start()
        return html[:idx] + f"\n{sw_killer}\n" + html[idx:]
    return sw_killer + html


# ── STEP 5: Base Tag Injector ──────────────────────────────────────────────────
def inject_base_tag(html: str, target_url: str) -> str:
    """
    Injects/updates a <base href="..."> tag pointing to the target URL.
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
    head_match = re.search(r'</head>', html, re.IGNORECASE)
    if head_match:
        idx = head_match.start()
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
        if not href or href.startswith("data:") or href.startswith("blob:") or "proxy/session" in href or href.startswith("/static/") or "/static/" in href:
            return None
        # Resolve against origin root so root-relative paths are correct
        if href.startswith('//'):
            parsed_origin = urllib.parse.urlparse(origin)
            resolved_url = f"{parsed_origin.scheme}:{href}"
        elif href.startswith('http://') or href.startswith('https://'):
            resolved_url = href
        else:
            resolved_url = urllib.parse.urljoin(origin + '/', href.lstrip('/') if href.startswith('/') else href)
        parsed_res = urllib.parse.urlparse(resolved_url)
        proxy_url = f"{api_base.rstrip('/')}/proxy/session/{session_id}/asset/{parsed_res.scheme}/{parsed_res.netloc}{parsed_res.path}"
        if parsed_res.query:
            proxy_url += f"?{parsed_res.query}"
        return proxy_url

    def link_replacer(match):
        tag = match.group(0)
        is_stylesheet = re.search(r'rel=["\']?stylesheet["\']?', tag, re.IGNORECASE)
        is_font_preload = re.search(r'rel=["\']?preload["\']?', tag, re.IGNORECASE) and re.search(r'as=["\']?font["\']?', tag, re.IGNORECASE)
        is_script_preload = re.search(r'rel=["\']?preload["\']?', tag, re.IGNORECASE) and re.search(r'as=["\']?script["\']?', tag, re.IGNORECASE)
        is_modulepreload = re.search(r'rel=["\']?modulepreload["\']?', tag, re.IGNORECASE)

        if not (is_stylesheet or is_font_preload or is_script_preload or is_modulepreload):
            return tag

        href_match = re.search(r'href=(?:["\']([^"\']+)["\']|([^\s>]+))', tag, re.IGNORECASE)
        if not href_match:
            return tag

        href = href_match.group(1) or href_match.group(2)
        if not href:
            return tag
        proxy_url = _make_asset_proxy_url(href)
        if proxy_url is None:
            return tag

        val_start = href_match.start(1) if href_match.group(1) is not None else href_match.start(2)
        val_end = href_match.end(1) if href_match.group(1) is not None else href_match.end(2)

        # Rewrite href
        tag = tag[:val_start] + proxy_url + tag[val_end:]

        # Strip integrity and crossorigin attributes
        tag = re.sub(r'\s+integrity=["\'][^"\']*["\']', '', tag, flags=re.IGNORECASE)
        tag = re.sub(r'\s+crossorigin(?:=["\'][^"\']*["\'])?', '', tag, flags=re.IGNORECASE)
        return tag

    def script_src_replacer(match):
        tag = match.group(0)
        # Skip inline scripts (no src attr) and already-proxied scripts
        src_match = re.search(r'\bsrc=(?:["\']([^"\']+)["\']|([^\s>]+))', tag, re.IGNORECASE)
        if not src_match:
            return tag

        src = src_match.group(1) or src_match.group(2)
        if not src:
            return tag
        # Never rewrite the STAGE agent itself or static local assets
        if "stage-agent.js" in src or "/static/" in src:
            return tag
        # Skip data: URLs and already-proxied
        if src.startswith("data:") or "proxy/session" in src:
            return tag

        proxy_url = _make_asset_proxy_url(src)
        if proxy_url is None:
            return tag

        val_start = src_match.start(1) if src_match.group(1) is not None else src_match.start(2)
        val_end = src_match.end(1) if src_match.group(1) is not None else src_match.end(2)

        tag = tag[:val_start] + proxy_url + tag[val_end:]
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
            if url.startswith('//'):
                parsed_origin = urllib.parse.urlparse(origin)
                resolved_url = f"{parsed_origin.scheme}:{url}"
            elif url.startswith('http://') or url.startswith('https://'):
                resolved_url = url
            else:
                resolved_url = urllib.parse.urljoin(origin + '/', url.lstrip('/') if url.startswith('/') else url)
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
        if src_val.startswith('//'):
            parsed_origin = urllib.parse.urlparse(origin)
            resolved_url = f"{parsed_origin.scheme}:{src_val}"
        elif src_val.startswith('http://') or src_val.startswith('https://'):
            resolved_url = src_val
        else:
            resolved_url = urllib.parse.urljoin(origin + '/', src_val.lstrip('/') if src_val.startswith('/') else src_val)
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
                if url.startswith('//'):
                    parsed_origin = urllib.parse.urlparse(origin)
                    resolved_url = f"{parsed_origin.scheme}:{url}"
                elif url.startswith('http://') or url.startswith('https://'):
                    resolved_url = url
                else:
                    resolved_url = urllib.parse.urljoin(origin + '/', url.lstrip('/') if url.startswith('/') else url)
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


# ── __NEXT_DATA__ sanitization ───────────────────────────────────────────────
def sanitize_next_data(html: str, api_base: str, session_id: str) -> str:
    """
    Parses <script id="__NEXT_DATA__" type="application/json"> blocks and strips
    any transport proxy paths (e.g. http://...proxy/session/ID/page?url=...) from
    the JSON values, replacing them with the logical target URL embedded in `url=`.

    This prevents Next.js client-side hydration from receiving a router `assetPrefix`
    or `canonicalBase` containing the transport path, which would corrupt client-side
    routing state on first SPA navigation.

    Only mutates string values that contain the transport session path. Preserves
    all other JSON structure verbatim.
    """
    import re as _re
    import json as _json

    proxy_pattern = _re.compile(
        r'(?:https?://[^/\s]*)?/proxy/session/' + _re.escape(str(session_id)) + r'/page\?url=([^"\s&]+)',
        _re.IGNORECASE
    )

    def _sanitize_value(v):
        """Recursively sanitize a JSON value."""
        if isinstance(v, str):
            def _replace(m):
                try:
                    import urllib.parse as _up
                    logical = _up.unquote(m.group(1))
                    return logical
                except Exception:
                    return v
            return proxy_pattern.sub(_replace, v)
        elif isinstance(v, dict):
            return {k: _sanitize_value(val) for k, val in v.items()}
        elif isinstance(v, list):
            return [_sanitize_value(item) for item in v]
        return v

    def _replace_next_data(m: re.Match) -> str:
        tag_open = m.group(1)  # opening <script ...>
        content  = m.group(2)  # raw JSON text
        tag_close = m.group(3) # </script>
        try:
            data = _json.loads(content)
            sanitized = _sanitize_value(data)
            return tag_open + _json.dumps(sanitized, separators=(',', ':'), ensure_ascii=False) + tag_close
        except Exception as exc:
            logger.warning(f"[PROXY_REWRITE] __NEXT_DATA__ JSON parse failed, leaving unchanged: {exc}")
            return m.group(0)

    pattern = re.compile(
        r'(<script\b[^>]*\bid=["\']__NEXT_DATA__["\'][^>]*>)([\s\S]*?)(</script>)',
        re.IGNORECASE
    )
    return pattern.sub(_replace_next_data, html)


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

    # ── Phase 2: snapshot_mode — strip all target script tags ──────────────────
    if snapshot_mode:
        logger.info(
            "[PROXY_REWRITE] Snapshot Mode Active — stripping all script tags."
        )
        html = re.sub(
            r"<script\b[\s\S]*?</script>",
            "",
            html,
            flags=re.IGNORECASE,
        )

    # ── Phase 3: Inject STAGE shims ───────────────────────────────────────────
    proxy_base_url = f"{api_base.rstrip('/')}/proxy/session/{session_id}"

    agent_script_url = os.getenv(
        "PROXY_AGENT_SCRIPT_URL",
        f"{api_base.rstrip('/')}/static/stage-agent.js?v={int(time.time())}",
    )

    if conservative_render_mode:
        logger.info("[PROXY_REWRITE] Conservative Render Mode Active - injecting scripts at the end of <head>")

        bootstrap_script = inject_bootstrap("<html><head></head></html>", page_url, str(session_id), proxy_base_url, api_base)
        webgl_script = inject_webgl_patch("<html><head></head></html>")
        offscreen_script = inject_offscreen_canvas_patch("<html><head></head></html>")
        cursor_script = inject_cursor_relay_bridge("<html><head></head></html>")
        sw_script = inject_sw_killer("<html><head></head></html>")
        base_script = inject_base_tag("<html><head></head></html>", page_url)
        guard_script = inject_chunk_guard("<html><head></head></html>")

        def extract_script(h):
            scripts = []
            for item in re.finditer(r'(<!--.*?-->|<script\b[^>]*>[\s\S]*?</script>)', h):
                scripts.append(item.group(1))
            return "\n".join(scripts)

        combined_shims = "\n".join([
            extract_script(bootstrap_script),
            extract_script(webgl_script),
            extract_script(offscreen_script),
            extract_script(cursor_script),
            extract_script(sw_script),
            extract_script(base_script),
            extract_script(guard_script)
        ])

        head_end_match = re.search(r'</head>', html, re.IGNORECASE)
        if head_end_match:
            idx = head_end_match.start()
            html = html[:idx] + f"\n{combined_shims}\n" + html[idx:]
        else:
            html = inject_bootstrap(html, page_url, str(session_id), proxy_base_url, api_base)
            html = inject_webgl_patch(html)
            html = inject_offscreen_canvas_patch(html)
            html = inject_cursor_relay_bridge(html)
            html = inject_sw_killer(html)
            html = inject_base_tag(html, page_url)
            html = inject_chunk_guard(html)
    else:
        html = inject_bootstrap(html, page_url, str(session_id), proxy_base_url, api_base)
        html = inject_webgl_patch(html)
        html = inject_offscreen_canvas_patch(html)
        html = inject_cursor_relay_bridge(html)
        html = inject_sw_killer(html)
        html = inject_base_tag(html, page_url)
        html = inject_chunk_guard(html)
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

    # ── Phase 6: Sanitize __NEXT_DATA__ hydration payload ─────────────────────
    # Must run AFTER all script tags are processed so we target the final HTML.
    # Only mutates values containing the transport session path; all other JSON
    # is left byte-for-byte identical.
    if not snapshot_mode:
        html = sanitize_next_data(html, api_base, session_id)

    return html
