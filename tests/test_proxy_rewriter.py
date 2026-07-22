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
    
    # 1. Old base tag removed, and new base tag injected pointing to target page URL
    assert 'href="https://originalsite.com/sub/"' not in rewritten
    assert '<base href="https://originalsite.com/home">' in rewritten
    
    # 2. Assets and links are NOT mutated in proxy_rewriter.py now (we do not regex rewrite them)
    assert 'href="about.html"' in rewritten
    assert 'src="/js/app.js"' in rewritten
    
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
