import logging
import urllib.parse
import os
from fastapi import Response

logger = logging.getLogger("pixelmark.proxy.asset_resolver")

COMMON_ASSET_EXTENSIONS = {
    ".js", ".mjs", ".css", ".woff", ".woff2", ".ttf", ".glb", ".gltf", 
    ".hdr", ".exr", ".png", ".jpg", ".jpeg", ".webp", ".svg", ".ico", ".wasm"
}

def resolve_asset_url(url: str, target_origin: str) -> tuple[str, str]:
    """
    Resolves relative asset paths against the original target_origin.
    Special cases Next.js paths.
    Returns (resolved_url, strategy).
    """
    parsed = urllib.parse.urlparse(url)
    
    # 1. Next.js passthrough check
    if parsed.path.startswith("/_next/"):
        resolved = urllib.parse.urljoin(target_origin, url)
        return resolved, "next-static-passthrough"
        
    # 2. Resolve relative or empty host paths against target origin
    if not parsed.netloc:
        resolved = urllib.parse.urljoin(target_origin, url)
        return resolved, "target-origin-relative"
        
    # 3. Check for common asset extensions to ensure correct resolution strategy
    ext = os.path.splitext(parsed.path)[1].lower()
    if ext in COMMON_ASSET_EXTENSIONS:
        return url, "common-asset-extension"
        
    return url, "default-passthrough"

def get_asset_failure_fallback(url: str, status_code: int = 404) -> Response:
    """
    Returns a graceful fallback instead of failing with 500 when an asset fails to resolve.
    """
    parsed = urllib.parse.urlparse(url)
    ext = os.path.splitext(parsed.path)[1].lower()
    
    logger.info(f"[ASSET RESOLVER] Resolution failure fallback for {url} (code={status_code})")
    
    if ext == ".css":
        return Response(content=b"", media_type="text/css", status_code=200)
    if ext in (".js", ".mjs"):
        return Response(content=b"", media_type="application/javascript", status_code=200)
    if ext in (".png", ".jpg", ".jpeg", ".webp", ".gif"):
        # Return transparent 1x1 GIF
        transparent_gif = b"GIF89a\x01\x00\x01\x00\x80\x00\x00\x00\x00\x00\xff\xff\xff!\xf9\x04\x01\x00\x00\x00\x00,\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02D\x01\x00;"
        return Response(content=transparent_gif, media_type="image/gif", status_code=200)
    if ext == ".svg":
        transparent_svg = b'<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>'
        return Response(content=transparent_svg, media_type="image/svg+xml", status_code=200)
        
    return Response(content=b"", status_code=204)
