import time
from collections import defaultdict
from typing import Dict, Tuple, List
from fastapi import Request, HTTPException
import urllib.parse
import hashlib

# ─── Duplicate Marker Filter Storage ───
# Keys: (session_id, page_url, x, y, note_hash) -> timestamp
_marker_click_history: Dict[Tuple[str, str, float, float, str], float] = {}

class GuardrailError(Exception):
    def __init__(self, code: str, message: str, status_code: int = 400):
        self.code = code
        self.message = message
        self.status_code = status_code

def check_duplicate_marker(session_id: str, page_url: str, x: float, y: float, note: str):
    """
    Blocks identical coordinate pin drops submitted within a 3-second window.
    """
    now = time.time()
    # Clean up older records periodically (older than 10s)
    for k in list(_marker_click_history.keys()):
        if now - _marker_click_history[k] > 10.0:
            _marker_click_history.pop(k, None)
            
    note_hash = hashlib.sha256((note or "").encode("utf-8")).hexdigest()
    key = (session_id, page_url, round(x or 0.0, 1), round(y or 0.0, 1), note_hash)
    
    if key in _marker_click_history:
        elapsed = now - _marker_click_history[key]
        if elapsed < 3.0:
            raise GuardrailError(
                code="DUPLICATE_MARKER_SPAM",
                message="Duplicate marker detected. Please wait a moment before clicking again.",
                status_code=409
            )
            
    _marker_click_history[key] = now

# ─── Proxy Assets Circuit Breaker Storage ───
# domain -> list of failure timestamps
_domain_failures: Dict[str, List[float]] = defaultdict(list)
# domain -> timestamp when circuit breaker was triggered
_tripped_domains: Dict[str, float] = {}

class CircuitBreakerTripped(Exception):
    pass

def check_circuit_breaker(url: str):
    """
    Inspects if the target host of a URL is currently blocked by the Circuit Breaker.
    Breaker opens for 30s after 5 errors within 60s.
    """
    parsed = urllib.parse.urlparse(url)
    domain = parsed.netloc or "unknown"
    
    now = time.time()
    if domain in _tripped_domains:
        tripped_at = _tripped_domains[domain]
        if now - tripped_at < 30.0:
            raise CircuitBreakerTripped(f"Circuit breaker active for domain: {domain}")
        else:
            # Cooldown passed, reset failures and close breaker
            _tripped_domains.pop(domain, None)
            _domain_failures[domain].clear()

def record_domain_failure(url: str):
    """
    Records a target asset network/server failure. Tripping the breaker if count > 5.
    """
    parsed = urllib.parse.urlparse(url)
    domain = parsed.netloc or "unknown"
    
    now = time.time()
    failures = _domain_failures[domain]
    # Clean up errors older than 60s
    failures = [t for t in failures if now - t < 60.0]
    failures.append(now)
    _domain_failures[domain] = failures
    
    if len(failures) >= 5:
        _tripped_domains[domain] = now
        import logging
        logger = logging.getLogger("pixelmark.proxy")
        logger.warning(f"[CIRCUIT_BREAKER] [TRIPPED] Too many failures for domain: {domain}. Circuit open for 30 seconds.")

def record_domain_success(url: str):
    """
    Resets failures on a successful response, reinforcing self-healing.
    """
    parsed = urllib.parse.urlparse(url)
    domain = parsed.netloc or "unknown"
    _domain_failures.pop(domain, None)

# ─── Infinite Re-Navigation Loop Guard ───
def check_navigation_loop(request: Request):
    """
    Blocks deep proxy re-navigation chains (e.g. infinite redirect loops or iframe nests).
    Uses a standard depth header or query parameter threshold.
    """
    depth_str = request.headers.get("x-pixelmark-depth") or request.query_params.get("depth") or "0"
    try:
        depth = int(depth_str)
    except ValueError:
        depth = 0
        
    if depth > 10:
        raise HTTPException(
            status_code=403,
            detail="Infinite re-navigation loop blocked: Maximum depth threshold reached."
        )

# ─── Render Retry Throttling ───
# session_id -> list of update timestamps
_render_updates: Dict[str, List[float]] = defaultdict(list)

def check_render_retry_limits(session_id: str):
    """
    Enforces a maximum of 10 renderer state updates/retries within a 10-second sliding window.
    """
    now = time.time()
    updates = _render_updates[session_id]
    updates = [t for t in updates if now - t < 10.0]
    _render_updates[session_id] = updates
    
    if len(updates) >= 10:
        raise GuardrailError(
            code="RENDER_RETRY_THROTTLED",
            message="Renderer updates rate limit exceeded. Please wait 10 seconds.",
            status_code=429
        )
        
    _render_updates[session_id].append(now)
