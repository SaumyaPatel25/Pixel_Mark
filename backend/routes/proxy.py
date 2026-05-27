from fastapi import APIRouter, HTTPException, Response, Query
import httpx
import re
import socket
import ipaddress
from urllib.parse import urlparse, urljoin

router = APIRouter(prefix="/proxy", tags=["proxy"])

def is_ssrf_safe(url: str) -> bool:
    try:
        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https"):
            return False
        
        hostname = parsed.hostname
        if not hostname:
            return False
            
        if hostname.startswith("[") and hostname.endswith("]"):
            hostname = hostname[1:-1]
            
        # Resolve all IPs
        addr_info = socket.getaddrinfo(hostname, None)
        for family, socktype, proto, canonname, sockaddr in addr_info:
            ip_str = sockaddr[0]
            ip = ipaddress.ip_address(ip_str)
            if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_multicast or ip.is_unspecified:
                return False
        return True
    except Exception:
        return False

def rewrite_html_links(html_content: str, base_url: str) -> str:
    def replace_url(match):
        attribute = match.group(1)
        quote = match.group(2)
        url = match.group(3)
        
        if url.startswith(("http://", "https://", "javascript:", "#", "mailto:", "data:")):
            return match.group(0)
            
        absolute_url = urljoin(base_url, url)
        return f'{attribute}={quote}{absolute_url}{quote}'

    pattern = re.compile(r'(src|href)=([\'"])(.*?)\2', re.IGNORECASE)
    return pattern.sub(replace_url, html_content)

@router.get("")
@router.get("/")
async def proxy_url(url: str, project_id: str = Query(None)):
    if not is_ssrf_safe(url):
        raise HTTPException(status_code=400, detail="SSRF target blocked: Loopback or private IP ranges are restricted.")
        
    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=10.0) as client:
            resp = await client.get(url)
            
            content_type = resp.headers.get("content-type", "text/html")
            
            # Only rewrite and inject into HTML content
            if "text/html" in content_type:
                html_text = resp.text
                
                # Rewrite links
                html_text = rewrite_html_links(html_text, url)
                
                # Inject overlay script
                pid = project_id or ""
                script = f"""
                <script>
                (function() {{
                    var consoleErrors = [];
                    var networkErrors = [];
                    
                    window.addEventListener('error', function(e) {{
                        if (e.target && (e.target.src || e.target.href)) {{
                            networkErrors.push({{
                                url: e.target.src || e.target.href,
                                tagName: e.target.tagName,
                                timestamp: Date.now()
                            }});
                        }} else {{
                            consoleErrors.push({{
                                message: e.message,
                                filename: e.filename,
                                lineno: e.lineno,
                                colno: e.colno,
                                timestamp: Date.now()
                            }});
                        }}
                    }}, true);

                    var originalConsoleError = console.error;
                    console.error = function() {{
                        var args = Array.prototype.slice.call(arguments);
                        consoleErrors.push({{
                            message: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '),
                            timestamp: Date.now()
                        }});
                        originalConsoleError.apply(console, arguments);
                    }};

                    function getElementXPath(element) {{
                        if (!element) return '';
                        if (element.id) {{
                            return '//*[@id="' + element.id + '"]';
                        }}
                        if (element === document.body) {{
                            return '/html/body';
                        }}
                        var ix = 0;
                        var siblings = element.parentNode ? element.parentNode.childNodes : [];
                        for (var i = 0; i < siblings.length; i++) {{
                            var sibling = siblings[i];
                            if (sibling === element) {{
                                return getElementXPath(element.parentNode) + '/' + element.tagName.toLowerCase() + '[' + (ix + 1) + ']';
                            }}
                            if (sibling.nodeType === 1 && sibling.tagName === element.tagName) {{
                                ix++;
                            }}
                        }}
                        return '';
                    }}

                    function getElementSelector(element) {{
                        if (!element) return '';
                        if (element.id) return '#' + element.id;
                        var path = [];
                        while (element && element.nodeType === Node.ELEMENT_NODE) {{
                            var selector = element.nodeName.toLowerCase();
                            if (element.className) {{
                                var classes = element.className.trim().split(/\\s+/).filter(Boolean).join('.');
                                if (classes) {{
                                    selector += '.' + classes;
                                }}
                            }}
                            path.unshift(selector);
                            element = element.parentNode;
                        }}
                        return path.join(' > ');
                    }}

                    window.addEventListener('click', function(e) {{
                        if (!e.ctrlKey) return;
                        
                        e.preventDefault();
                        e.stopPropagation();

                        var target = e.target;
                        if (!target) return;

                        var rect = target.getBoundingClientRect();
                        var payload = {{
                            source: 'entrext-overlay',
                            type: 'MARKER_DROPPED',
                            projectId: '{pid}',
                            selector: getElementSelector(target),
                            xpath: getElementXPath(target),
                            tagName: target.tagName,
                            innerText: target.innerText || '',
                            pageUrl: window.location.href,
                            clientX: e.clientX,
                            clientY: e.clientY,
                            elementRect: {{
                                x: rect.left,
                                y: rect.top,
                                width: rect.width,
                                height: rect.height
                            }},
                            viewport: {{
                                width: window.innerWidth,
                                height: window.innerHeight
                            }},
                            browser: navigator.userAgent,
                            os: navigator.platform,
                            console_errors: consoleErrors,
                            network_errors: networkErrors
                        }};

                        window.parent.postMessage(payload, '*');
                    }}, true);
                }})();
                </script>
                """
                
                # Append script before </body>
                if "</body>" in html_text:
                    html_text = html_text.replace("</body>", f"{script}</body>")
                elif "</html>" in html_text:
                    html_text = html_text.replace("</html>", f"{script}</html>")
                else:
                    html_text = html_text + script
                    
                return Response(content=html_text.encode("utf-8"), media_type=content_type)
            else:
                return Response(content=resp.content, media_type=content_type)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
