from fastapi import APIRouter, Depends, HTTPException, Query, Response, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from dependencies import get_db
from models import Session, Project, PageVisit, Environment, ShareLink
from schemas import PageVisitOut
from utils.proxy_rewriter import rewrite_html
from utils.ssrf_guard import is_ssrf_safe, is_domain_allowed
import httpx
import urllib.parse
import uuid
import os
import hashlib
from datetime import datetime

router = APIRouter(prefix="/proxy", tags=["proxy"])

import logging
logger = logging.getLogger("pixelmark.proxy")

# Active IP sessions tracking for fallback resolution
ACTIVE_IP_SESSIONS = {}

# Async helper to record/upsert PageVisits cleanly
async def record_page_visit(
    db: AsyncSession,
    session_id: str,
    page_url: str,
    page_title: str = None,
    share_link_id: str = None,
    parent_page_id: str = None
) -> PageVisit:
    try:
        # Check if a PageVisit for this session + page_url exists
        result = await db.execute(
            select(PageVisit).where(
                PageVisit.session_id == session_id,
                PageVisit.page_url == page_url
            ).order_by(PageVisit.visited_at.desc())
        )
        pv = result.scalars().first()
        
        if pv:
            pv.visit_count = (pv.visit_count or 0) + 1
            pv.last_visited_at = datetime.utcnow()
            if page_title:
                pv.page_title = page_title
        else:
            # Determine the page order
            order_res = await db.execute(
                select(func.count(PageVisit.id)).where(PageVisit.session_id == session_id)
            )
            count = order_res.scalar() or 0
            
            pv = PageVisit(
                id=str(uuid.uuid4()),
                session_id=session_id,
                page_url=page_url,
                page_title=page_title,
                share_link_id=share_link_id,
                parent_page_id=parent_page_id,
                page_order=count + 1,
                visit_count=1,
                first_visited_at=datetime.utcnow(),
                last_visited_at=datetime.utcnow()
            )
            db.add(pv)
            
        # Update session details
        sess_res = await db.execute(
            select(Session).where(Session.id == session_id)
        )
        sess = sess_res.scalar_one_or_none()
        if sess:
            sess.current_page_url = page_url
            sess.pages_visited = (sess.pages_visited or 0) + 1
            
        await db.commit()
        return pv
    except Exception as e:
        logger.error(f"[OBSERVABILITY] [PAGE_VISIT_RECORD_FAILURE] Failed to record page visit. session={session_id}, url={page_url}, error={str(e)}")
        raise e


async def resolve_session_base_url(session_id: str, db: AsyncSession) -> tuple[str, str, Session]:
    """
    Given a session_id, queries session and project details and returns (base_url, project_id, session).
    Raises HTTPException if not found or config is missing.
    """
    result = await db.execute(select(Session).where(Session.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    proj_result = await db.execute(select(Project).where(Project.id == session.project_id))
    project = proj_result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    env_result = await db.execute(select(Environment).where(Environment.project_id == project.id))
    envs = env_result.scalars().all()
    
    base_url = None
    if envs:
        base_url = envs[0].base_url
        for env in envs:
            if env.name.lower() in ("prod", "production"):
                base_url = env.base_url
                break
                
    if not base_url:
        base_url = project.url
        
    if not base_url:
        raise HTTPException(status_code=400, detail="No base URL configured for the project.")
        
    return base_url, project.id, session

async def validate_public_access(session_id: str, share_token: str, db: AsyncSession) -> ShareLink:
    """
    Validates a public reviewer session token.
    """
    if not share_token:
        raise HTTPException(status_code=401, detail="Public access token is required")
        
    result = await db.execute(
        select(ShareLink).where(
            ShareLink.token == share_token,
            ShareLink.session_id == session_id
        )
    )
    link = result.scalar_one_or_none()
    if not link:
        raise HTTPException(status_code=404, detail="Share link not found")
    if not link.is_active:
        raise HTTPException(status_code=403, detail="Share link has been deactivated")
    if link.expires_at and link.expires_at < datetime.utcnow():
        raise HTTPException(status_code=410, detail="Share link has expired")
        
    return link


def prepare_proxy_response(response: Response) -> Response:
    headers_to_remove = [
        "x-frame-options",
        "content-security-policy",
        "content-security-policy-report-only",
        "x-content-type-options",
        "permissions-policy",
    ]
    for h in list(response.headers.keys()):
        if h.lower() in headers_to_remove:
            response.headers.pop(h, None)
            
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "*"
    return response


@router.get("/session/{session_id}")
async def proxy_initial(
    session_id: str,
    request: Request,
    share_token: str = Query(None),
    snapshot_mode: bool = Query(False),
    db: AsyncSession = Depends(get_db)
):
    from utils.guardrails import check_navigation_loop
    check_navigation_loop(request)
    
    try:
        uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid UUID format")
        
    client_host = request.client.host if request.client else "unknown"
    ACTIVE_IP_SESSIONS[client_host] = session_id
        
    base_url, project_id, session = await resolve_session_base_url(session_id, db)
    
    share_link_id = None
    if share_token:
        link = await validate_public_access(session_id, share_token, db)
        share_link_id = link.id
        
    if not is_ssrf_safe(base_url):
        raise HTTPException(status_code=403, detail="SSRF target blocked: Loopback or private IP ranges are restricted.")

    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "X-PixelMark-Session": session_id
        }
        async with httpx.AsyncClient(follow_redirects=True, timeout=15.0, verify=False) as client:
            resp = await client.get(base_url, headers=headers)
            
            if resp.status_code >= 400:
                return prepare_proxy_response(Response(
                    content=f"<html><body style='font-family:sans-serif;background:#0d0d14;color:#fff;padding:40px;text-align:center;'><h2>Service Unavailable</h2><p>Target site {base_url} returned status code {resp.status_code}.</p></body></html>",
                    media_type="text/html",
                    status_code=503
                ))
                
            content_type = resp.headers.get("content-type", "text/html")
            
            if "text/html" in content_type:
                # Upsert PageVisit
                await record_page_visit(
                    db=db,
                    session_id=session_id,
                    page_url=base_url,
                    page_title=None,
                    share_link_id=share_link_id
                )
                
                api_base = os.getenv("API_BASE", "")
                rewritten_html = rewrite_html(
                    html=resp.text, 
                    session_id=session_id, 
                    page_url=base_url, 
                    base_url=base_url, 
                    api_base=api_base,
                    conservative_render_mode=session.conservative_render_mode,
                    snapshot_mode=snapshot_mode
                )
                
                response = Response(content=rewritten_html.encode("utf-8"), media_type="text/html")
                response.headers["X-PixelMark-Session"] = session_id
                response.headers["X-PixelMark-Page"] = base_url
                
                response.set_cookie(
                    "pixelmark_session_id", 
                    session_id, 
                    path="/", 
                    httponly=True, 
                    max_age=86400,
                    samesite="none",
                    secure=True
                )
                
                return prepare_proxy_response(response)
            else:
                return prepare_proxy_response(Response(content=resp.content, media_type=content_type))
                
    except Exception as e:
        return prepare_proxy_response(Response(
            content=f"<html><body style='font-family:sans-serif;background:#0d0d14;color:#fff;padding:40px;text-align:center;'><h2>Service Unavailable</h2><p>Target site {base_url} is unreachable.</p><p style='color:gray;'>{str(e)}</p></body></html>",
            media_type="text/html",
            status_code=503
        ))


@router.get("/session/{session_id}/page")
async def proxy_page(
    session_id: str,
    url: str,
    request: Request,
    parent_page_id: str = Query(None),
    share_token: str = Query(None),
    snapshot_mode: bool = Query(False),
    db: AsyncSession = Depends(get_db)
):
    from utils.guardrails import check_navigation_loop
    check_navigation_loop(request)

    try:
        uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid UUID format")
        
    client_host = request.client.host if request.client else "unknown"
    ACTIVE_IP_SESSIONS[client_host] = session_id
        
    base_url, project_id, session = await resolve_session_base_url(session_id, db)
    
    share_link_id = None
    if share_token:
        link = await validate_public_access(session_id, share_token, db)
        share_link_id = link.id
 
    # Enforce domain scoping and SSRF safety
    if not is_ssrf_safe(url):
        raise HTTPException(status_code=403, detail="SSRF target blocked: Loopback or private IP ranges are restricted.")
    if not is_domain_allowed(url, base_url):
        raise HTTPException(status_code=403, detail="Navigation blocked: Exiting session allowed domain boundary.")
 
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "X-PixelMark-Session": session_id
        }
        async with httpx.AsyncClient(follow_redirects=True, timeout=15.0, verify=False) as client:
            resp = await client.get(url, headers=headers)
            
            if resp.status_code >= 400:
                return prepare_proxy_response(Response(
                    content=f"<html><body style='font-family:sans-serif;background:#0d0d14;color:#fff;padding:40px;text-align:center;'><h2>Service Unavailable</h2><p>Target page {url} returned status code {resp.status_code}.</p></body></html>",
                    media_type="text/html",
                    status_code=503
                ))
                
            content_type = resp.headers.get("content-type", "text/html")
            
            if "text/html" in content_type:
                # Upsert PageVisit
                await record_page_visit(
                    db=db,
                    session_id=session_id,
                    page_url=url,
                    page_title=None,
                    share_link_id=share_link_id,
                    parent_page_id=parent_page_id
                )
                
                api_base = os.getenv("API_BASE", "")
                rewritten_html = rewrite_html(
                    html=resp.text, 
                    session_id=session_id, 
                    page_url=url, 
                    base_url=base_url, 
                    api_base=api_base,
                    conservative_render_mode=session.conservative_render_mode,
                    snapshot_mode=snapshot_mode
                )
                
                response = Response(content=rewritten_html.encode("utf-8"), media_type="text/html")
                response.headers["X-PixelMark-Session"] = session_id
                response.headers["X-PixelMark-Page"] = url
                
                response.set_cookie(
                    "pixelmark_session_id", 
                    session_id, 
                    path="/", 
                    httponly=True, 
                    max_age=86400,
                    samesite="none",
                    secure=True
                )
                
                return prepare_proxy_response(response)
            else:
                return prepare_proxy_response(Response(content=resp.content, media_type=content_type))
                
    except Exception as e:
        return prepare_proxy_response(Response(
            content=f"<html><body style='font-family:sans-serif;background:#0d0d14;color:#fff;padding:40px;text-align:center;'><h2>Service Unavailable</h2><p>Target page {url} is unreachable.</p><p style='color:gray;'>{str(e)}</p></body></html>",
            media_type="text/html",
            status_code=503
        ))


CACHE_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "cache")
os.makedirs(CACHE_DIR, exist_ok=True)


def get_cached_asset(url: str) -> tuple[bytes, str]:
    url_hash = hashlib.sha256(url.encode('utf-8')).hexdigest()
    cache_path = os.path.join(CACHE_DIR, url_hash)
    meta_path = cache_path + ".meta"
    if os.path.exists(cache_path) and os.path.exists(meta_path):
        try:
            with open(meta_path, "r", encoding="utf-8") as f:
                content_type = f.read().strip()
            with open(cache_path, "rb") as f:
                content = f.read()
            return content, content_type
        except Exception:
            pass
    return None, None


def save_cached_asset(url: str, content: bytes, content_type: str):
    cachable_types = ("image/", "font/", "application/javascript", "text/css", "application/wasm", "model/gltf", "application/octet-stream", "image/vnd.radiance")
    cachable_exts = (".js", ".css", ".png", ".jpg", ".jpeg", ".gif", ".svg", ".woff", ".woff2", ".ttf", ".eot", ".otf", ".glb", ".gltf", ".wasm", ".ico", ".hdr", ".exr")
    
    parsed = urllib.parse.urlparse(url)
    ext = os.path.splitext(parsed.path)[1].lower()
    
    should_cache = any(content_type.startswith(t) for t in cachable_types) or (ext in cachable_exts)
    if not should_cache:
        return
        
    url_hash = hashlib.sha256(url.encode('utf-8')).hexdigest()
    cache_path = os.path.join(CACHE_DIR, url_hash)
    meta_path = cache_path + ".meta"
    try:
        with open(cache_path, "wb") as f:
            f.write(content)
        with open(meta_path, "w", encoding="utf-8") as f:
            f.write(content_type)
    except Exception:
        pass

async def handle_proxy_asset_request(
    session_id: str,
    url: str,
    request: Request,
    db: AsyncSession
):
    base_url, _, session = await resolve_session_base_url(session_id, db)
    
    # Store target origin from base_url
    parsed_base = urllib.parse.urlparse(base_url)
    target_origin = f"{parsed_base.scheme}://{parsed_base.netloc}"
    
    # If the URL is relative or lacks a host, resolve it against target origin
    # to enforce target-origin asset resolution.
    parsed_target = urllib.parse.urlparse(url)
    if not parsed_target.netloc:
        url = urllib.parse.urljoin(target_origin, url)
        parsed_target = urllib.parse.urlparse(url)
        
    is_third_party = parsed_target.netloc != parsed_base.netloc
        
    # Guardrail: Circuit Breaker for failing asset routes
    from utils.guardrails import check_circuit_breaker, record_domain_failure, record_domain_success, CircuitBreakerTripped
    try:
        check_circuit_breaker(url)
    except CircuitBreakerTripped as cbt:
        logger.warning(f"[CIRCUIT_BREAKER] [TRIPPED] Short-circuiting request to {url} immediately.")
        return prepare_proxy_response(Response(content=b"", status_code=204))

    # Check allow/block policy for third-party requests
    if is_third_party:
        is_analytics_or_tracker = any(domain in url for domain in (
            "google-analytics.com", "googletagmanager.com", "mixpanel.com", 
            "hotjar.com", "doubleclick.net", "facebook.net", "facebook.com", "amplitude.com"
        ))
        is_firebase_or_config = any(term in url.lower() for term in ("firebase", "webconfig", "bootstrap", "manifest.json", "config.json"))
        
        if is_analytics_or_tracker:
            logger.info(f"[ASSET RESOLVER] [THIRD_PARTY POLICY] BLOCKED tracking/analytics request. Path: {request.url.path}, Resolved: {url}, Status: BLOCKED")
            if ".js" in url or "javascript" in url:
                return prepare_proxy_response(Response(
                    content=f'console.warn("PixelMark Warning: Tracker request blocked safely: {url}");'.encode("utf-8"),
                    media_type="application/javascript"
                ))
            content = b"{}" if "json" in url or "config" in url else b""
            media_type = "application/json" if "json" in url or "config" in url else "application/octet-stream"
            return prepare_proxy_response(Response(content=content, media_type=media_type, status_code=200))
        
        elif is_firebase_or_config:
            logger.info(f"[ASSET RESOLVER] [THIRD_PARTY POLICY] ALLOWED configuration request: {url}")
        else:
            logger.info(f"[ASSET RESOLVER] [THIRD_PARTY POLICY] ALLOWED standard CDN/asset request: {url}")

    if not is_ssrf_safe(url):
        logger.warning(f"[ASSET RESOLVER] SSRF target blocked: {url}")
        if is_third_party:
            return prepare_proxy_response(Response(content=b"", status_code=204))
        raise HTTPException(status_code=403, detail="SSRF target blocked")
        
    if not is_domain_allowed(url, base_url, is_asset=True):
        logger.warning(f"[ASSET RESOLVER] Asset domain scoping block: {url}")
        if ".js" in url or "javascript" in url:
            return prepare_proxy_response(Response(
                content=f'console.warn("PixelMark Warning: Script asset blocked by domain scoping: {url}");'.encode("utf-8"),
                media_type="application/javascript"
            ))
        if is_third_party:
            content = b"{}" if "json" in url or "config" in url else b""
            media_type = "application/json" if "json" in url or "config" in url else "application/octet-stream"
            return prepare_proxy_response(Response(content=content, media_type=media_type, status_code=200))
        raise HTTPException(status_code=403, detail="Asset target blocked: Out of domain scope")

    cached_content, cached_type = get_cached_asset(url)
    if cached_content is not None:
        logger.info(f"[ASSET RESOLVER] Requested URL: {request.url.path}, Resolved URL: {url}, Status: CACHE_HIT")
        response = Response(content=cached_content, media_type=cached_type)
        response.headers["Cache-Control"] = "public, max-age=31536000, immutable"
        response.headers["X-PixelMark-Cache"] = "HIT"
        return prepare_proxy_response(response)

    try:
        headers = {
            "User-Agent": request.headers.get("user-agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"),
            "Accept-Language": request.headers.get("accept-language", "en-US,en;q=0.9"),
            "X-PixelMark-Session": session_id
        }
        
        referer = request.headers.get("referer", "")
        if referer:
            parsed_referer = urllib.parse.urlparse(referer)
            if "proxy/session" in parsed_referer.path:
                query_params = urllib.parse.parse_qs(parsed_referer.query)
                if 'url' in query_params:
                    headers["Referer"] = query_params['url'][0]
                else:
                    parsed_target = urllib.parse.urlparse(url)
                    headers["Referer"] = f"{parsed_target.scheme}://{parsed_target.netloc}/"
            else:
                headers["Referer"] = referer

        # Manual redirect following & loop safety validation
        current_url = url
        redirect_count = 0
        max_redirects = 5
        resp = None
        
        async with httpx.AsyncClient(follow_redirects=False, timeout=10.0, verify=False) as client:
            while redirect_count < max_redirects:
                if not is_ssrf_safe(current_url):
                    logger.warning(f"[REDIRECT SAFEGUARD] SSRF target blocked: {current_url}")
                    return prepare_proxy_response(Response(content=b"", status_code=204))
                if not is_domain_allowed(current_url, base_url, is_asset=True):
                    logger.warning(f"[REDIRECT SAFEGUARD] Redirect escaped domain scope: {current_url}")
                    return prepare_proxy_response(Response(content=b"", status_code=204))
                
                resp = await client.get(current_url, headers=headers)
                if resp.status_code in (301, 302, 303, 307, 308):
                    redirect_url = resp.headers.get("location", "")
                    if not redirect_url:
                        break
                    current_url = urllib.parse.urljoin(current_url, redirect_url)
                    redirect_count += 1
                    logger.info(f"[REDIRECT SAFEGUARD] Following redirect {redirect_count}: {current_url}")
                else:
                    break

            if resp.status_code >= 400:
                record_domain_failure(url)
                logger.warning(f"[ASSET RESOLVER] Target server returned {resp.status_code} for URL: {url}")
                if ".js" in url or "javascript" in url:
                    return prepare_proxy_response(Response(
                        content=f'console.warn("PixelMark Warning: Script asset returned status {resp.status_code}: {url}");'.encode("utf-8"),
                        media_type="application/javascript"
                    ))
                if is_third_party:
                    content = b"{}" if "json" in url or "config" in url else b""
                    media_type = "application/json" if "json" in url or "config" in url else "application/octet-stream"
                    return prepare_proxy_response(Response(content=content, media_type=media_type, status_code=200))
                # Return standard 204 graceful fallback rather than a 500 error
                return prepare_proxy_response(Response(content=b"", status_code=204))
                
            content_type = resp.headers.get("content-type", "application/octet-stream")
            save_cached_asset(url, resp.content, content_type)
            
            record_domain_success(url)
            logger.info(f"[ASSET RESOLVER] Requested URL: {request.url.path}, Resolved URL: {url}, Status: {resp.status_code}")
            response = Response(content=resp.content, media_type=content_type)
            response.headers["Cache-Control"] = "public, max-age=31536000, immutable"
            response.headers["X-PixelMark-Cache"] = "MISS"
            return prepare_proxy_response(response)
            
    except Exception as e:
        record_domain_failure(url)
        logger.error(f"[ASSET RESOLVER] Exception resolving asset {url}: {str(e)}")
        if ".js" in url or "javascript" in url:
            return prepare_proxy_response(Response(
                content=f'console.warn("PixelMark Warning: Script asset failed to connect: {url} ({str(e)})");'.encode("utf-8"),
                media_type="application/javascript"
            ))
        if is_third_party:
            content = b"{}" if "json" in url or "config" in url else b""
            media_type = "application/json" if "json" in url or "config" in url else "application/octet-stream"
            return prepare_proxy_response(Response(content=content, media_type=media_type, status_code=200))
        # Graceful fallback response
        return prepare_proxy_response(Response(content=b"", status_code=204))


@router.get("/session/{session_id}/asset")
async def proxy_asset(
    session_id: str,
    url: str,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    return await handle_proxy_asset_request(session_id, url, request, db)


@router.get("/session/{session_id}/asset/{scheme}/{host}/{path:path}")
async def proxy_asset_path(
    session_id: str,
    scheme: str,
    host: str,
    path: str,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    url = f"{scheme}://{host}/{path}"
    if request.url.query:
        url = f"{url}?{request.url.query}"
    return await handle_proxy_asset_request(session_id, url, request, db)


@router.post("/session/{session_id}/form")
async def proxy_form(
    session_id: str,
    action: str,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    base_url, _, session = await resolve_session_base_url(session_id, db)
    
    if not is_ssrf_safe(action):
        raise HTTPException(status_code=403, detail="SSRF target blocked")
    if not is_domain_allowed(action, base_url):
        raise HTTPException(status_code=403, detail="Form scoping block: Target is out of allowed bounds")
        
    try:
        # Read incoming form body
        form_data = await request.form()
        
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "X-PixelMark-Session": session_id
        }
        
        async with httpx.AsyncClient(follow_redirects=True, timeout=15.0, verify=False) as client:
            resp = await client.post(action, data=dict(form_data), headers=headers)
            content_type = resp.headers.get("content-type", "text/html")
            
            if "text/html" in content_type:
                # Log page visit on form landing URL (which could be different due to redirects)
                landing_url = str(resp.url)
                await record_page_visit(
                    db=db,
                    session_id=session_id,
                    page_url=landing_url,
                    page_title=None
                )
                
                api_base = os.getenv("API_BASE", "")
                rewritten_html = rewrite_html(
                    html=resp.text, 
                    session_id=session_id, 
                    page_url=landing_url, 
                    base_url=base_url, 
                    api_base=api_base,
                    conservative_render_mode=session.conservative_render_mode
                )
                response = Response(content=rewritten_html.encode("utf-8"), media_type="text/html")
                return prepare_proxy_response(response)
            else:
                return prepare_proxy_response(Response(content=resp.content, media_type=content_type))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/session/{session_id}/page-visit", response_model=PageVisitOut)
async def post_page_visit(
    session_id: str,
    page_url: str = Query(...),
    page_title: str = Query(None),
    parent_page_id: str = Query(None),
    share_token: str = Query(None),
    db: AsyncSession = Depends(get_db)
):
    try:
        uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid UUID format")
        
    base_url, project_id, session = await resolve_session_base_url(session_id, db)
    
    share_link_id = None
    if share_token:
        link = await validate_public_access(session_id, share_token, db)
        share_link_id = link.id
        
    # Enforce domain scoping and SSRF safety
    if not is_ssrf_safe(page_url):
        raise HTTPException(status_code=403, detail="SSRF target blocked: Loopback or private IP ranges are restricted.")
    if not is_domain_allowed(page_url, base_url):
        raise HTTPException(status_code=403, detail="Navigation blocked: Exiting session allowed domain boundary.")
        
    pv = await record_page_visit(
        db=db,
        session_id=session_id,
        page_url=page_url,
        page_title=page_title,
        share_link_id=share_link_id,
        parent_page_id=parent_page_id
    )
    return pv

