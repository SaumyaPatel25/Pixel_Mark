import urllib.parse
import re
from bs4 import BeautifulSoup

def rewrite_html(
    html: str, 
    session_id: str, 
    page_url: str, 
    base_url: str, 
    api_base: str = "",
    allow_external_assets: bool = True
) -> str:
    """
    Rewrites a retrieved HTML page to stay inside the session's proxy.
    
    1. Anchors: stay in proxy (/proxy/session/{session_id}/page?url={encoded})
    2. Assets (img, script, link, video, source, srcset): route via /proxy/session/{session_id}/asset?url={encoded}
    3. Inline CSS background images: rewritten via asset proxy
    4. Forms: action routed via /proxy/session/{session_id}/form?action={encoded}
    5. JavaScript: Injects session configuration block
    6. Agent Injection: injects pixelmark-agent.js before </body>
    7. Neutralizes <base> tags.
    """
    import json
    soup = BeautifulSoup(html, "html.parser")
    
    # Extract allowed target domain info
    parsed_base = urllib.parse.urlparse(base_url)
    base_domain = parsed_base.netloc
    
    # ─── 0. Neutralize <base href> tags to prevent context distortion ───
    for base_tag in soup.find_all("base"):
        base_tag.decompose()
        
    # Helper to resolve relative path against current page URL
    def resolve_url(url: str) -> str:
        url_stripped = url.strip()
        if not url_stripped:
            return ""
        # Keep protocol-relative URLs as absolute HTTP/S
        if url_stripped.startswith("//"):
            return f"{parsed_base.scheme}:{url_stripped}"
        return urllib.parse.urljoin(page_url, url_stripped)

    # Helper to check if URL is within target domain
    def is_internal(url: str) -> bool:
        parsed = urllib.parse.urlparse(url)
        return parsed.netloc == base_domain or not parsed.netloc

    # Helper to build path-based asset URL
    def make_proxied_asset_url(url_val: str) -> str:
        url_stripped = url_val.strip()
        if not url_stripped or url_stripped.startswith(("data:", "javascript:", "blob:")):
            return url_stripped
        
        abs_url = resolve_url(url_stripped)
        parsed = urllib.parse.urlparse(abs_url)
        scheme = parsed.scheme or "http"
        host = parsed.netloc
        path_part = parsed.path.lstrip("/")
        if parsed.query:
            path_part = f"{path_part}?{parsed.query}"
            
        if not host:
            return f"/proxy/session/{session_id}/asset?url={urllib.parse.quote(abs_url)}"
            
        return f"/proxy/session/{session_id}/asset/{scheme.lower()}/{host.lower()}/{path_part}"

    # ─── 1. Rewrite Anchor Links ───
    for a in soup.find_all("a", href=True):
        href = a["href"].strip()
        if not href or href.startswith(("javascript:", "mailto:", "tel:", "data:")):
            continue
        # Skip pure anchor clicks (hash-only)
        if href.startswith("#"):
            continue
            
        abs_url = resolve_url(href)
        if is_internal(abs_url):
            a["href"] = f"/proxy/session/{session_id}/page?url={urllib.parse.quote(abs_url)}"
        else:
            # External link: force open in a new window/tab to prevent frame escaping
            a["target"] = "_blank"

    # ─── 2. Rewrite Assets (src, href, video, source) ───
    asset_tags = [
        ("link", "href"),
        ("script", "src"),
        ("img", "src"),
        ("video", "src"),
        ("source", "src"),
        ("iframe", "src")
    ]
    for tag_name, attr in asset_tags:
        for el in soup.find_all(tag_name, **{attr: True}):
            url = el[attr].strip()
            if not url or url.startswith(("data:", "javascript:", "blob:")):
                continue
            
            el[attr] = make_proxied_asset_url(url)

    # ─── 2.5. Rewrite inline importmaps ───
    for el in soup.find_all("script", type="importmap"):
        if el.string:
            try:
                data = json.loads(el.string)
                if "imports" in data:
                    for k, v in data["imports"].items():
                        if isinstance(v, str) and not v.startswith(("data:", "blob:", "javascript:", "#")):
                            data["imports"][k] = make_proxied_asset_url(v)
                el.string = json.dumps(data)
            except Exception:
                pass

    # ─── 3. Rewrite srcset Attributes ───
    for el in soup.find_all(lambda t: t.has_attr("srcset")):
        srcset = el["srcset"]
        new_parts = []
        for part in srcset.split(","):
            part = part.strip()
            if not part:
                continue
            subparts = part.split()
            if not subparts:
                continue
            img_url = subparts[0]
            if not img_url.startswith(("data:", "javascript:", "blob:")):
                img_url = make_proxied_asset_url(img_url)
            if len(subparts) > 1:
                new_parts.append(f"{img_url} {subparts[1]}")
            else:
                new_parts.append(img_url)
        el["srcset"] = ", ".join(new_parts)

    # ─── 4. Rewrite CSS Inline background-image: url() ───
    for el in soup.find_all(style=True):
        style = el["style"]
        # Match url('...') or url("...") or url(...)
        urls = re.findall(r'url\(\s*[\'"]?([^\'")]+)[\'"]?\s*\)', style)
        for u in urls:
            if u.startswith(("data:", "javascript:", "blob:")):
                continue
            proxied_url = make_proxied_asset_url(u)
            style = style.replace(u, proxied_url)
        el["style"] = style

    # ─── 5. Rewrite Form Actions ───
    for form in soup.find_all("form", action=True):
        action = form["action"].strip()
        if not action or action.startswith(("javascript:", "#")):
            continue
        abs_url = resolve_url(action)
        # Always route forms through the /form proxy path
        form["action"] = f"/proxy/session/{session_id}/form?action={urllib.parse.quote(abs_url)}"

    # ─── 6. JavaScript Global Injections ───
    api_base_clean = api_base.rstrip('/')
    config_script = soup.new_tag("script")
    config_script.string = f"""
    if (window.location.pathname.startsWith('/proxy/session/')) {{
      var redirectPath = '/';
      var params = new URLSearchParams(window.location.search);
      var targetUrl = params.get('url');
      if (targetUrl) {{
        try {{
          var parsed = new URL(targetUrl);
          redirectPath = parsed.pathname + parsed.search + parsed.hash;
        }} catch(e) {{}}
      }}
      window.history.replaceState(null, '', redirectPath);
    }}
    window.__PIXELMARK_BASE__ = "{api_base_clean}/proxy/session/{session_id}";
    window.__PIXELMARK_SESSION__ = {{
      session_id: "{session_id}",
      proxy_base_url: "{api_base_clean}/proxy/session/{session_id}"
    }};
    window.__PIXELMARK__ = {{
      sessionId: "{session_id}",
      pageUrl: "{page_url}",
      apiBase: "{api_base}",
      agentVersion: "2.1.0"
    }};
    """
    
    # Injected agent script tag
    agent_script = soup.new_tag("script", src="/static/pixelmark-agent.js")
    agent_script["data-session-id"] = session_id

    # Service worker disabler snippet tag
    sw_disabler = soup.new_tag("script")
    sw_disabler.string = """
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(regs => {
        regs.forEach(r => r.unregister());
      });
    }
    """

    # Append config and agent at the start of head so they execute before other scripts
    if soup.head:
        existing_agents = soup.find_all("script", src=re.compile(r"pixelmark-agent\.js"))
        if not existing_agents:
            soup.head.insert(0, agent_script)
            soup.head.insert(0, config_script)
        soup.head.append(sw_disabler)
    elif soup.body:
        existing_agents = soup.find_all("script", src=re.compile(r"pixelmark-agent\.js"))
        if not existing_agents:
            soup.body.insert(0, agent_script)
            soup.body.insert(0, config_script)
        soup.body.insert(0, sw_disabler)
    else:
        soup.insert(0, agent_script)
        soup.insert(0, config_script)
        soup.insert(0, sw_disabler)

    # ─── 7. Remove CSP / frame security restrictions ───
    for meta in soup.find_all("meta"):
        http_equiv = meta.get("http-equiv", "").lower()
        if http_equiv in ("content-security-policy", "x-frame-options", "frame-ancestors"):
            meta.decompose()

    return str(soup)
