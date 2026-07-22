import logging
import urllib.parse
from fastapi import Response
from fastapi.responses import JSONResponse

logger = logging.getLogger("stage.proxy.runtime_policy")

BLOCKED_THIRD_PARTY_DOMAINS = [
    "firebase.googleapis.com",
    "firebaseinstallations.googleapis.com",
    "firebaseapp.com",
    "firestore.googleapis.com",
    "google-analytics.com",
    "analytics.google.com",
    "googletagmanager.com",
    "hotjar.com",
    "segment.io",
    "api.segment.io",
    "facebook.net",
    "connect.facebook.net",
]

ALLOWED_CDN_DOMAINS = [
    "cdnjs.cloudflare.com",
    "unpkg.com",
    "cdn.jsdelivr.net",
    "fonts.googleapis.com",
    "fonts.gstatic.com",
    "code.jquery.com",
    "maxcdn.bootstrapcdn.com",
    "googleapis.com",
    "aws.amazon.com",
    "cloudfront.net",
]

def check_third_party_policy(url: str) -> tuple[bool, Response | None]:
    """
    Checks the URL against allow/block policies.
    Returns (is_handled, optional_response).
    If is_handled is True, the caller should return the optional_response directly.
    """
    try:
        parsed = urllib.parse.urlparse(url)
        hostname = parsed.hostname.lower() if parsed.hostname else ""
        path = parsed.path.lower()
        
        # Check blocked list
        is_blocked = any(hostname == domain or hostname.endswith("." + domain) for domain in BLOCKED_THIRD_PARTY_DOMAINS)
        
        if is_blocked:
            logger.info(f"[THIRD_PARTY POLICY] BLOCKED third-party endpoint: {url} (matched domain patterns)")
            
            # Graceful fallbacks
            if ".js" in path or "javascript" in path or "analytics" in path:
                return True, Response(
                    content=f'console.warn("Blocked by STAGE proxy: {url}");'.encode("utf-8"),
                    media_type="application/javascript",
                    status_code=200
                )
            
            # JSON config requests
            if "json" in path or "config" in path or "google.com" in hostname or "googleapis.com" in hostname:
                return True, JSONResponse({
                    "error": "blocked_by_stage_proxy",
                    "status": "mocked",
                    "projectId": "stage-mock",
                    "state": "inactive"
                }, status_code=200)
                
            return True, Response(content=b"{}", media_type="application/json", status_code=200)
            
        # Allow safe CDNs or assets
        is_allowed_cdn = any(hostname == domain or hostname.endswith("." + domain) for domain in ALLOWED_CDN_DOMAINS)
        if is_allowed_cdn:
            return False, None
            
        # For other external requests, allow read-only GET/OPTIONS requests to prevent breakage, block everything else
        return False, None
        
    except Exception as e:
        logger.error(f"[THIRD_PARTY POLICY] Error checking policy for {url}: {e}")
        return False, None

def get_failure_fallback_response(url: str, error_message: str) -> Response:
    """
    Constructs a safe fallback response for when an allowed third-party request fails upstream.
    """
    parsed = urllib.parse.urlparse(url)
    path = parsed.path.lower()
    
    logger.warning(f"[THIRD_PARTY POLICY] Upstream failure for allowed third party request: {url}. Error: {error_message}. Returning safe fallback.")
    
    if ".js" in path or "javascript" in path:
        return Response(
            content=f'console.warn("STAGE Warning: Script failed to load upstream: {url} ({error_message})");'.encode("utf-8"),
            media_type="application/javascript",
            status_code=200
        )
        
    if "json" in path or "config" in path:
        return JSONResponse({}, status_code=200)
        
    return Response(content=b"", status_code=204)
