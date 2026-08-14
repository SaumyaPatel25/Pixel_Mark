import pytest
import re
from utils.proxy_rewriter import rewrite_html

def test_proxy_rewriter_all_rules():
    sample_html = """
    <!DOCTYPE html>
    <html>
    <head>
        <base href="https://originalsite.com/sub/"/>
        <link rel="stylesheet" href="style.css"/>
        <script src="/js/app.js"></script>
        <meta http-equiv="Content-Security-Policy" content="default-src 'self'"/>
    </head>
    <body style="background-image: url('images/bg.png'); color: black;">
        <h1>STAGE Test</h1>
        <a href="about.html">About Page</a>
        <a href="https://originalsite.com/contact">Contact Us</a>
        <a href="https://external.com/out">External Link</a>
        <a href="#anchor-only">Anchor Link</a>
        <a href="javascript:void(0)">JS Link</a>
        
        <img src="logo.png" srcset="logo.png 1x, logo@2x.png 2x" />
        <video src="//cdn.originalsite.com/video.mp4"></video>
        
        <form action="/login" method="POST">
            <input type="text" name="username"/>
        </form>
    </body>
    </html>
    """
    
    session_id = "12345678-1234-1234-1234-123456789012"
    page_url = "https://originalsite.com/home"
    base_url = "https://originalsite.com"
    api_base = "http://localhost:8765"
    
    rewritten = rewrite_html(
        html=sample_html,
        session_id=session_id,
        page_url=page_url,
        base_url=base_url,
        api_base=api_base
    )
    
    # 1. Old base tag removed; no new <base> is injected server-side (the JS bootstrap
    #    handles document.baseURI at runtime via a getter shim instead).
    assert 'href="https://originalsite.com/sub/"' not in rewritten
    assert '<base href="https://originalsite.com/home">' not in rewritten

    # 2. Stylesheets and scripts ARE rewritten through the asset proxy endpoint
    assert '/proxy/session/12345678-1234-1234-1234-123456789012/asset/' in rewritten
    
    # 3. Bootstrap is injected immediately after <head>
    assert 'window.__STAGE_TARGET_URL__ = "https://originalsite.com/home";' in rewritten
    assert 'window.__STAGE_SESSION_ID__ = "12345678-1234-1234-1234-123456789012";' in rewritten
    assert 'window.__STAGE_PROXY_ORIGIN__ = "http://localhost:8765";' in rewritten
    assert "define(document, 'URL'" in rewritten
    
    # 4. WebGL patch is injected
    assert 'HTMLCanvasElement.prototype.getContext' in rewritten
    assert 'preserveDrawingBuffer: true' in rewritten
    
    # 5. Service Worker killer is injected
    assert 'navigator.serviceWorker.getRegistrations' in rewritten
    assert 'navigator.serviceWorker.register =' in rewritten
    
    # 6. Chunk Guard is injected
    assert 'ChunkLoadError' in rewritten
    assert 'pm_chunk_reload' in rewritten
    
    assert '<script src="http://localhost:8765/static/stage-agent.js" defer></script></body>' in rewritten
    
    # 8. CSP meta tags removed
    assert "Content-Security-Policy" not in rewritten

    # 9. New hardening shims are injected
    assert "document.location" in rewritten
    assert "Location.prototype.assign" in rewritten
    assert "URL constructor leak guard" in rewritten
    assert "__STAGE_DIAG__" in rewritten

    # 9. target="_blank" window.open and link click interception shims are injected
    assert 'STAGE_OPEN_NEW_TAB' in rewritten
    assert 'window.open = function(url, target, features)' in rewritten
    assert "closest('a')" in rewritten


def test_sanitize_next_data_strips_transport_paths():
    from utils.proxy_rewriter import sanitize_next_data
    import json

    session_id = "aaaa-bbbb-cccc"
    api_base = "https://stage.example.com"

    # A simulated __NEXT_DATA__ payload where assetPrefix and url contain the transport path
    data = {
        "props": {"pageProps": {}},
        "page": "/about",
        "query": {},
        "buildId": "abc123",
        "assetPrefix": f"https://stage.example.com/proxy/session/{session_id}/page?url=https%3A//myapp.com/about",
        "canonicalBase": f"http://localhost:8765/proxy/session/{session_id}/page?url=https%3A//myapp.com",
        "runtimeConfig": {},
        "nextExport": False,
        "autoExport": False,
        "isFallback": False,
        "dynamicIds": [],
    }
    next_data_json = json.dumps(data)
    html = f'<html><head><script id="__NEXT_DATA__" type="application/json">{next_data_json}</script></head><body></body></html>'

    result = sanitize_next_data(html, api_base, session_id)

    # Transport prefix must be stripped — logical URL should remain
    assert f"/proxy/session/{session_id}/page?url=" not in result
    # Logical URL should be preserved
    assert "https://myapp.com" in result
    # JSON must still be valid inside the script tag
    import re
    m = re.search(r'<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)</script>', result, re.IGNORECASE)
    assert m, "__NEXT_DATA__ script tag not found after sanitization"
    parsed = json.loads(m.group(1))
    assert "assetPrefix" in parsed


def test_sanitize_next_data_leaves_non_transport_json_intact():
    from utils.proxy_rewriter import sanitize_next_data
    import json

    session_id = "1234-5678"
    html = '<html><head><script id="__NEXT_DATA__" type="application/json">{"page":"/","query":{},"buildId":"build1","props":{"pageProps":{"title":"hello"}}}</script></head><body></body></html>'
    result = sanitize_next_data(html, "http://localhost:8765", session_id)

    # Nothing should change
    assert result == html


def test_rewrite_html_sanitizes_next_data():
    """End-to-end: rewrite_html must strip transport paths from __NEXT_DATA__."""
    from utils.proxy_rewriter import rewrite_html
    import json, re

    session_id = "zzzz-yyyy-xxxx"
    page_url = "https://myapp.com/shop"
    api_base = "http://localhost:8765"

    transport_prefix = f"http://localhost:8765/proxy/session/{session_id}/page?url=https%3A//myapp.com/shop"
    data = {"page": "/shop", "props": {}, "buildId": "b1", "assetPrefix": transport_prefix}
    next_data_json = json.dumps(data)
    sample_html = f"""<!DOCTYPE html>
<html><head>
  <script id="__NEXT_DATA__" type="application/json">{next_data_json}</script>
</head><body></body></html>"""

    rewritten = rewrite_html(html=sample_html, session_id=session_id, page_url=page_url, base_url="https://myapp.com", api_base=api_base)

    m = re.search(r'<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)</script>', rewritten, re.IGNORECASE)
    assert m, "__NEXT_DATA__ script missing from output"
    parsed = json.loads(m.group(1))
    assert "/proxy/session/" not in parsed.get("assetPrefix", ""), \
        f"Transport path leaked into assetPrefix: {parsed.get('assetPrefix')}"


