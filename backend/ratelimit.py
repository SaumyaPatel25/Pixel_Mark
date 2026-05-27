from fastapi import Request, HTTPException
from collections import defaultdict
import time
from logger import logger

# Storage: { ip: [timestamp1, timestamp2, ...] }
_windows = defaultdict(list)

def rate_limit(max_requests: int, window_seconds: int):
    """
    Returns a dependency that enforces a sliding window rate limit per IP.
    """
    async def dependency(request: Request):
        # Extract IP (respecting X-Forwarded-For if behind a proxy)
        forwarded = request.headers.get("X-Forwarded-For")
        ip = forwarded.split(",")[0] if forwarded else (request.client.host if request.client else "unknown")
        
        now = time.time()
        window_start = now - window_seconds
        
        # Clean up old timestamps
        _windows[ip] = [t for t in _windows[ip] if t > window_start]
        
        if len(_windows[ip]) >= max_requests:
            logger.warning(f"Rate limit exceeded for IP: {ip}")
            raise HTTPException(
                status_code=429,
                detail="Too Many Requests",
                headers={"Retry-After": str(window_seconds)}
            )
        
        _windows[ip].append(now)
        return True

    return dependency

def check_rate_limit(request: Request, action_name: str, max_requests: int = 20, window_seconds: int = 60):
    """
    Standalone version for manual checking inside a route.
    """
    forwarded = request.headers.get("X-Forwarded-For")
    ip = forwarded.split(",")[0] if forwarded else (request.client.host if request.client else "unknown")
    key = f"{ip}:{action_name}"
    
    now = time.time()
    window_start = now - window_seconds
    _windows[key] = [t for t in _windows[key] if t > window_start]
    
    if len(_windows[key]) >= max_requests:
        logger.warning(f"Manual rate limit exceeded for {key}")
        from errors import AppError
        raise AppError("RATE_LIMIT_EXCEEDED", "Too many requests. Please try again later.", 429)
    
    _windows[key].append(now)
