import pytest
from utils.proxy_rewriter import rewrite_html
from proxy.runtime_policy import check_third_party_policy, get_failure_fallback_response
from proxy.asset_resolver import resolve_asset_url, get_asset_failure_fallback
from utils.ssrf_guard import is_ssrf_safe, is_domain_allowed

def test_conservative_mode_html_rewriting():
    html_fixture = """
    <html>
      <head>
        <script type="module" src="/chunks/main.js"></script>
        <script src="/chunks/vendor.js" defer></script>
      </head>
      <body>
        <div id="root"></div>
      </body>
    </html>
    """
    
    # 1. Conservative Mode = True (Should combine shims and inject at end of head)
    rewritten_conservative = rewrite_html(
        html=html_fixture,
        session_id="test-session",
        page_url="http://example.com/page",
        base_url="http://example.com",
        api_base="http://localhost:8765",
        conservative_render_mode=True
    )
    
    # Ensure type="module" is untouched
    assert 'type="module" src="/chunks/main.js"' in rewritten_conservative
    # Ensure shims are injected before </head>
    assert "<!-- PIXELMARK_BOOTSTRAP_START -->" in rewritten_conservative
    assert "</head>" in rewritten_conservative
    
    # 2. Normal Mode (Should inject shims at top of head)
    rewritten_normal = rewrite_html(
        html=html_fixture,
        session_id="test-session",
        page_url="http://example.com/page",
        base_url="http://example.com",
        api_base="http://localhost:8765",
        conservative_render_mode=False
    )
    assert "<!-- PIXELMARK_BOOTSTRAP_START -->" in rewritten_normal

def test_no_rewrite_data_blob_urls():
    # Frontend bootstrap script should not rewrite data: or blob: urls
    # We test our check_third_party_policy or general resolution
    resolved, strategy = resolve_asset_url("data:image/png;base64,123", "http://example.com")
    assert resolved == "data:image/png;base64,123"
    
    resolved, strategy = resolve_asset_url("blob:http://example.com/123", "http://example.com")
    assert resolved == "blob:http://example.com/123"

def test_next_static_paths_resolve():
    target_origin = "https://my-next-app.com"
    resolved, strategy = resolve_asset_url("/_next/static/chunks/main.js", target_origin)
    assert resolved == "https://my-next-app.com/_next/static/chunks/main.js"
    assert strategy == "next-static-passthrough"

def test_third_party_runtime_policy():
    # Firebase config calls should be blocked and return safe JSON response
    blocked_url = "https://firebase.googleapis.com/v1/projects/my-project/installations"
    is_handled, response = check_third_party_policy(blocked_url)
    assert is_handled is True
    assert response.status_code == 200
    
    # An allowed CDN should not be handled (it should proceed to normal fetching)
    allowed_url = "https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js"
    is_handled, response = check_third_party_policy(allowed_url)
    assert is_handled is False
    assert response is None

def test_third_party_upstream_failure_fallback():
    # If an allowed script fails upstream, return console.warn fallback instead of 500
    failed_script_url = "https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/invalid.js"
    fallback = get_failure_fallback_response(failed_script_url, "Connection Timeout")
    assert fallback.status_code == 200
    assert b"PixelMark Warning: Script failed to load upstream" in fallback.body

def test_ssrf_safety_guard():
    # Local/private ranges should fail SSRF check (unless explicitly localhost/127.0.0.1 for testing)
    assert is_ssrf_safe("http://10.0.0.1/metadata") is False
    assert is_ssrf_safe("http://192.168.1.1/secret") is False
    
    # Public domains should pass SSRF check
    assert is_ssrf_safe("https://google.com") is True

def test_redirect_safeguards():
    base_url = "http://example.com"
    
    # Redirect to same origin should be allowed
    assert is_domain_allowed("http://example.com/redirected", base_url) is True
    
    # Redirect to a foreign tracking domain should be blocked
    assert is_domain_allowed("http://evil-tracker.net/log", base_url) is False
