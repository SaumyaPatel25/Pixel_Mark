import pytest
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
        <h1>PixelMark Test</h1>
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
    
    # 1. Base tag removed
    assert "<base" not in rewritten
    
    # 2. Link rewriting (stays inside proxy for internal link)
    assert 'href="/proxy/session/12345678-1234-1234-1234-123456789012/page?url=https%3A//originalsite.com/about.html"' in rewritten or 'href="/proxy/session/12345678-1234-1234-1234-123456789012/page?url=https%253A//originalsite.com/about.html"' in rewritten or "about.html" in rewritten
    # Let's verify the exact quote of 'https://originalsite.com/about.html'
    # urllib.parse.quote('https://originalsite.com/about.html') -> 'https%3A//originalsite.com/about.html' (Note: '/' is safe by default unless we specify safe='')
    # Wait, urllib.parse.quote('https://originalsite.com/about.html') under Python defaults to quoting '/' as well if we don't pass safe='/' or by default quote quotes '/' unless safe is passed. Actually, urllib.parse.quote(url) quotes '/' by default (safe='/'). Wait! Let's check python default quote: by default, urllib.parse.quote has safe='/'! So '/' is NOT quoted! Let's check: Yes, 'https%3A//originalsite.com/about.html'.
    assert 'url=https%3A//originalsite.com/about.html' in rewritten
    assert 'url=https%3A//originalsite.com/contact' in rewritten
    
    # External link forced to _blank and NOT rewritten
    assert 'href="https://external.com/out" target="_blank"' in rewritten
    
    # Anchor-only link NOT rewritten
    assert 'href="#anchor-only"' in rewritten
    
    # JS link NOT rewritten
    assert 'href="javascript:void(0)"' in rewritten
    
    # 3. Asset rewriting
    assert 'href="/proxy/session/12345678-1234-1234-1234-123456789012/asset?url=https%3A//originalsite.com/style.css"' in rewritten
    assert 'src="/proxy/session/12345678-1234-1234-1234-123456789012/asset?url=https%3A//originalsite.com/js/app.js"' in rewritten
    assert 'src="/proxy/session/12345678-1234-1234-1234-123456789012/asset?url=https%3A//originalsite.com/logo.png"' in rewritten
    assert 'src="/proxy/session/12345678-1234-1234-1234-123456789012/asset?url=https%3A//cdn.originalsite.com/video.mp4"' in rewritten
    
    # 4. srcset rewriting
    assert 'srcset="/proxy/session/12345678-1234-1234-1234-123456789012/asset?url=https%3A//originalsite.com/logo.png 1x, /proxy/session/12345678-1234-1234-1234-123456789012/asset?url=https%3A//originalsite.com/logo%402x.png 2x"' in rewritten
    
    # 5. CSS inline background-image url() rewriting
    assert 'style="background-image: url(\'/proxy/session/12345678-1234-1234-1234-123456789012/asset?url=https%3A//originalsite.com/images/bg.png\');' in rewritten
    
    # 6. Form actions rewriting
    assert 'action="/proxy/session/12345678-1234-1234-1234-123456789012/form?action=https%3A//originalsite.com/login"' in rewritten
    
    # 7. JavaScript session variables and agent script injected
    assert 'window.__PIXELMARK_SESSION__' in rewritten
    assert 'window.__PIXELMARK__' in rewritten
    assert 'src="/static/pixelmark-agent.js"' in rewritten
    assert 'data-session-id="12345678-1234-1234-1234-123456789012"' in rewritten
    
    # 8. CSP meta tags removed
    assert "Content-Security-Policy" not in rewritten
