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

window.PIXELMARK = window.PIXELMARK || {{}};
window.PIXELMARK.sessionId = window.__PIXELMARK_SESSION_ID__;
window.PIXELMARK.pageUrl = window.__PIXELMARK_TARGET_URL__;
window.PIXELMARK.transportUrl = window.__PIXELMARK_TRANSPORT_URL__;
window.PIXELMARK.targetUrl = window.__PIXELMARK_TARGET_URL__;

console.debug("[PixelMark URL Model] targetUrl=" + window.__PIXELMARK_TARGET_URL__);
console.debug("[PixelMark URL Model] transportUrl=" + window.__PIXELMARK_TRANSPORT_URL__);

(function() {{
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
      const resolved = new URL(String(inputUrl), window.__PIXELMARK_TARGET_URL__);
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

  History.prototype.pushState = function(state, unused, url) {{
    const logicalTargetUrl = resolveLogicalTargetUrl(url);
    const safeTransportUrl = normalizeToTransportUrl(url);
    console.debug("[PixelMark History Shim] input=" + url + " logical=" + logicalTargetUrl + " transport=" + safeTransportUrl + " type=pushState");
    try {{
      nativePushState.call(this, state, unused || '', safeTransportUrl);
    }} catch (err) {{
      try {{
        nativePushState.call(this, state, unused || '', window.location.pathname + window.location.search);
      }} catch (_) {{}}
    }}
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
    try {{
      nativeReplaceState.call(this, state, unused || '', safeTransportUrl);
    }} catch (err) {{
      try {{
        nativeReplaceState.call(this, state, unused || '', window.location.pathname + window.location.search);
      }} catch (_) {{}}
    }}
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


# ── STEP 2 ────────────────────────────────────────────────────────────────────
def inject_webgl_patch(html: str) -> str:
    """
    Forces preserveDrawingBuffer: true on WebGL/WebGL2 context creation so canvases can be captured.
    """
    patch = """<script>
(function() {
  try {
    var _origGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type, attribs) {
      var rest = Array.prototype.slice.call(arguments, 2);
      if (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl') {
        var newAttribs = Object.assign({}, attribs || {}, { preserveDrawingBuffer: true });
        return _origGetContext.call(this, type, newAttribs);
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
    agent_tag = f'<script src="{agent_url}" type="module" defer></script>'
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
    html = inject_bootstrap(html, page_url, str(session_id), proxy_base_url, api_base)

    # 2. WebGL patch — preserveDrawingBuffer before any canvas library runs
    html = inject_webgl_patch(html)

    # 3. Service Worker killer — unregister + mock register()
    html = inject_sw_killer(html)

    # 4. Base tag — resolve all relative assets against target URL
    html = inject_base_tag(html, page_url)

    # 5. Chunk Guard — recover from bfcache stale chunk errors
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
