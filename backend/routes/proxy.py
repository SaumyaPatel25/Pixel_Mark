from fastapi import APIRouter, Depends, HTTPException, Query, Response, Request
from fastapi.responses import StreamingResponse, JSONResponse
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
from proxy.runtime_policy import check_third_party_policy, get_failure_fallback_response
from proxy.asset_resolver import resolve_asset_url, get_asset_failure_fallback

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
        # Resolve parent_page_id URL to actual PageVisit ID if needed
        if parent_page_id and (parent_page_id.startswith("http://") or parent_page_id.startswith("https://")):
            parent_pv_res = await db.execute(
                select(PageVisit).where(
                    PageVisit.session_id == session_id,
                    PageVisit.page_url == parent_page_id
                ).order_by(PageVisit.visited_at.desc())
            )
            parent_pv = parent_pv_res.scalars().first()
            if parent_pv:
                parent_page_id = parent_pv.id
            else:
                parent_page_id = None

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
    if link.expires_at:
        from datetime import timezone
        tz = link.expires_at.tzinfo
        now = datetime.now(tz) if tz else datetime.utcnow()
        if link.expires_at < now:
            raise HTTPException(status_code=410, detail="Share link has expired")
        
    return link


def prepare_proxy_response(response: Response) -> Response:
    HEADERS_TO_STRIP = [
        "x-frame-options",
        "content-security-policy",
        "content-security-policy-report-only",
        "permissions-policy",
        "access-control-allow-origin",
        "access-control-allow-methods",
        "access-control-allow-headers",
        "access-control-allow-credentials",
        "access-control-expose-headers",
    ]

    for header in HEADERS_TO_STRIP:
        for k in list(response.headers.keys()):
            if k.lower() == header:
                del response.headers[k]

    return response


def set_cache_headers(response: Response, path: str, query: str = ""):
    if path.startswith("/_next/static/"):
        response.headers["Cache-Control"] = "public, max-age=31536000, immutable"
    elif "_rsc=" in query or path.endswith(".json"):
        response.headers["Cache-Control"] = "private, no-cache, must-revalidate"
    else:
        response.headers["Cache-Control"] = "private, no-cache, must-revalidate"


async def proxy_rsc_request(request: Request, target_url: str) -> Response:
    headers_to_pass = {
        k: v for k, v in request.headers.items()
        if k.lower().startswith("next-") or k.lower() == "rsc"
    }
    client = httpx.AsyncClient(verify=False, timeout=30.0)
    req = client.build_request(
        request.method, target_url, headers=headers_to_pass
    )
    response = await client.send(req, stream=True)
    
    if "text/x-component" in response.headers.get("content-type", ""):
        async def gen():
            try:
                async for chunk in response.aiter_bytes():
                    yield chunk
            finally:
                await response.aclose()
                await client.aclose()
                
        resp_headers = dict(response.headers)
        resp_headers.pop("content-encoding", None)
        resp_headers.pop("content-length", None)
        resp_headers["Cache-Control"] = "private, no-cache, must-revalidate"
        
        rsc_response = StreamingResponse(
            gen(),
            status_code=response.status_code,
            media_type="text/x-component",
            headers=resp_headers
        )
        return prepare_proxy_response(rsc_response)
    else:
        try:
            content = await response.aread()
            resp_headers = dict(response.headers)
            resp_headers.pop("content-encoding", None)
            resp_headers.pop("content-length", None)
            
            # Apply Cache-Control header policy (Prompt 12)
            path = urllib.parse.urlparse(target_url).path
            set_cache_headers(Response(content=content), path, urllib.parse.urlparse(target_url).query)
            
            FAResp = Response(
                content=content,
                status_code=response.status_code,
                headers=resp_headers,
                media_type=response.headers.get("content-type")
            )
            set_cache_headers(FAResp, path, urllib.parse.urlparse(target_url).query)
            return prepare_proxy_response(FAResp)
        finally:
            await response.aclose()
            await client.aclose()


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

    # Check if request is Next.js React Server Component (RSC) streaming request
    is_rsc_request = "rsc" in request.headers or any(k.lower().startswith("next-") for k in request.headers.keys())
    if is_rsc_request:
        return await proxy_rsc_request(request, base_url)

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
                
                proto = request.headers.get("x-forwarded-proto", "http")
                api_base = os.getenv("API_BASE", "") or str(request.base_url)
                if proto == "https" and api_base.startswith("http://"):
                    api_base = "https://" + api_base[7:]
                
                is_next_site = "_next/static" in resp.text or "__NEXT_DATA__" in resp.text
                if is_next_site and not session.conservative_render_mode:
                    session.conservative_render_mode = True
                    db.add(session)
                    await db.commit()
                    logger.info(f"[PROXY_REWRITE] Next.js detected via signature in proxy_initial. Flipping conservative_render_mode=True for session={session_id}")
                
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
                
                # Apply Cache-Control header policy (Prompt 12)
                set_cache_headers(response, urllib.parse.urlparse(base_url).path, request.url.query)
                return prepare_proxy_response(response)
            else:
                response = Response(content=resp.content, media_type=content_type)
                set_cache_headers(response, urllib.parse.urlparse(base_url).path, request.url.query)
                return prepare_proxy_response(response)
                
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
 
    # Check if request is Next.js React Server Component (RSC) streaming request
    is_rsc_request = "rsc" in request.headers or any(k.lower().startswith("next-") for k in request.headers.keys())
    if is_rsc_request:
        return await proxy_rsc_request(request, url)

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
                
                proto = request.headers.get("x-forwarded-proto", "http")
                api_base = os.getenv("API_BASE", "") or str(request.base_url)
                if proto == "https" and api_base.startswith("http://"):
                    api_base = "https://" + api_base[7:]
                
                is_next_site = "_next/static" in resp.text or "__NEXT_DATA__" in resp.text
                if is_next_site and not session.conservative_render_mode:
                    session.conservative_render_mode = True
                    db.add(session)
                    await db.commit()
                    logger.info(f"[PROXY_REWRITE] Next.js detected via signature in proxy_page. Flipping conservative_render_mode=True for session={session_id}")
                
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
                
                # Apply Cache-Control header policy (Prompt 12)
                set_cache_headers(response, urllib.parse.urlparse(url).path, request.url.query)
                return prepare_proxy_response(response)
            else:
                response = Response(content=resp.content, media_type=content_type)
                set_cache_headers(response, urllib.parse.urlparse(url).path, request.url.query)
                return prepare_proxy_response(response)
                
    except Exception as e:
        from services.cache import SYSTEM_METRICS
        SYSTEM_METRICS["fallback_to_screenshot"] += 1
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
    
    # 1. Resolve relative URLs using asset_resolver
    url, resolution_strategy = resolve_asset_url(url, target_origin)
    parsed_target = urllib.parse.urlparse(url)
    is_third_party = parsed_target.netloc != parsed_base.netloc
    
    # Log incoming request details with structured format
    logger.info(f"[ASSET RESOLVER] [REQUEST] Incoming asset request: session_id={session_id}, original_path={request.url.path}, method={request.method}")

    # Guardrail: Circuit Breaker for failing asset routes
    from utils.guardrails import check_circuit_breaker, record_domain_failure, record_domain_success, CircuitBreakerTripped
    try:
        check_circuit_breaker(url)
    except CircuitBreakerTripped as cbt:
        logger.warning(f"[CIRCUIT_BREAKER] [TRIPPED] Short-circuiting request to {url} immediately.")
        return prepare_proxy_response(Response(content=b"", status_code=204))

    # 2. Check third-party policy
    is_handled, policy_response = check_third_party_policy(url)
    if is_handled:
        logger.info(f"[ASSET RESOLVER] [DECISION] URL={url}, Strategy=third-party-policy (BLOCKED), Status=200")
        return prepare_proxy_response(policy_response)

    if not is_ssrf_safe(url):
        logger.warning(f"[ASSET RESOLVER] [DECISION] SSRF target blocked: {url}. Strategy=blocked, Status=403")
        if is_third_party:
            return prepare_proxy_response(Response(content=b"", status_code=204))
        raise HTTPException(status_code=403, detail="SSRF target blocked")
        
    if not is_domain_allowed(url, base_url, is_asset=True):
        logger.warning(f"[ASSET RESOLVER] [DECISION] Asset domain scoping block: {url}. Strategy=blocked, Status=mocked")
        if ".js" in url or "javascript" in url:
            return prepare_proxy_response(Response(
                content=f'console.warn("PixelMark Warning: Script asset blocked by domain scoping: {url}");'.encode("utf-8"),
                media_type="application/javascript"
            ))
        if is_third_party:
            content = b"{}" if "json" in url or "config" in url else b""
            media_type = "application/json" if "json" in url or "config" in url else "application/octet-stream"
            return prepare_proxy_response(Response(content=content, media_type=media_type, status_code=200))
    # Unconditional Next.js and RSC route forwarding (Prompts 2 and 11)
    is_rsc_request = "rsc" in request.headers or any(k.lower().startswith("next-") for k in request.headers.keys())
    if is_rsc_request or "/_next/" in url:
        return await proxy_rsc_request(request, url)

    # Only cache GET requests
    if request.method == "GET":
        cached_content, cached_type = get_cached_asset(url)
        if cached_content is not None:
            logger.info(f"[ASSET RESOLVER] [DECISION] Requested URL: {request.url.path}, Resolved URL: {url}, Strategy={resolution_strategy}, Status=CACHE_HIT")
            response = Response(content=cached_content, media_type=cached_type)
            set_cache_headers(response, urllib.parse.urlparse(url).path, request.url.query)
            response.headers["X-PixelMark-Cache"] = "HIT"
            return prepare_proxy_response(response)

    try:
        headers = {
            "User-Agent": request.headers.get("user-agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"),
            "Accept-Language": request.headers.get("accept-language", "en-US,en;q=0.9"),
            "X-PixelMark-Session": session_id
        }
        
        # Pass along Content-Type for POST requests
        if request.headers.get("content-type"):
            headers["Content-Type"] = request.headers.get("content-type")

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
        
        # Track initial redirect check
        start_time = datetime.utcnow()
        async with httpx.AsyncClient(follow_redirects=False, timeout=10.0, verify=False) as client:
            while redirect_count < max_redirects:
                if not is_ssrf_safe(current_url):
                    logger.warning(f"[REDIRECT SAFEGUARD] SSRF target blocked: {current_url}")
                    return prepare_proxy_response(Response(content=b"", status_code=204))
                if not is_domain_allowed(current_url, base_url, is_asset=True):
                    logger.warning(f"[REDIRECT SAFEGUARD] Redirect escaped domain scope: {current_url}")
                    return prepare_proxy_response(Response(content=b"", status_code=204))
                
                if request.method == "POST":
                    body = await request.body()
                    resp = await client.post(current_url, content=body, headers=headers)
                elif request.method == "OPTIONS":
                    resp = await client.options(current_url, headers=headers)
                else:
                    resp = await client.get(current_url, headers=headers)

                if resp.status_code in (301, 302, 303, 307, 308):
                    redirect_url = resp.headers.get("location", "")
                    if not redirect_url:
                        break
                    # Validate redirect safety check
                    next_url = urllib.parse.urljoin(current_url, redirect_url)
                    if not is_domain_allowed(next_url, base_url, is_asset=True):
                        logger.warning(f"[REDIRECT SAFEGUARD] Redirect to disallowed origin blocked: {next_url}")
                        return prepare_proxy_response(Response(content=b"", status_code=204))
                        
                    current_url = next_url
                    redirect_count += 1
                    logger.info(f"[REDIRECT SAFEGUARD] Following redirect {redirect_count}: {current_url}")
                else:
                    break

            duration = (datetime.utcnow() - start_time).total_seconds() * 1000
            
            if resp.status_code >= 400:
                record_domain_failure(url)
                logger.warning(f"[ASSET RESOLVER] Target server returned {resp.status_code} for URL: {url}")
                
                # Graceful fallback response for failure
                fallback_response = get_asset_failure_fallback(url, resp.status_code)
                logger.info(f"[ASSET RESOLVER] [DECISION] Requested URL: {request.url.path}, Resolved URL: {url}, Strategy={resolution_strategy} (FALLBACK), Status={resp.status_code}, Duration={duration:.1f}ms")
                return prepare_proxy_response(fallback_response)
                
            content_type = resp.headers.get("content-type", "application/octet-stream")
            if request.method == "GET":
                save_cached_asset(url, resp.content, content_type)
            
            record_domain_success(url)
            byte_size = len(resp.content)
            logger.info(f"[ASSET RESOLVER] [DECISION] Requested URL: {request.url.path}, Resolved URL: {url}, Strategy={resolution_strategy}, Status={resp.status_code}, Duration={duration:.1f}ms, Bytes={byte_size}")
            response = Response(content=resp.content, status_code=resp.status_code, media_type=content_type)
            set_cache_headers(response, urllib.parse.urlparse(url).path, request.url.query)
            response.headers["X-PixelMark-Cache"] = "MISS"
            return prepare_proxy_response(response)
            
    except Exception as e:
        record_domain_failure(url)
        logger.error(f"[ASSET RESOLVER] Exception resolving asset {url}: {str(e)}")
        
        # Upstream failure handling
        fallback_response = get_failure_fallback_response(url, str(e))
        logger.info(f"[ASSET RESOLVER] [DECISION] Requested URL: {request.url.path}, Resolved URL: {url}, Strategy={resolution_strategy} (UPSTREAM_FAIL), Status=500, Reason={str(e)}")
        return prepare_proxy_response(fallback_response)


@router.api_route("/session/{session_id}/asset", methods=["GET", "POST", "OPTIONS"])
async def proxy_asset(
    session_id: str,
    url: str,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    return await handle_proxy_asset_request(session_id, url, request, db)


@router.api_route("/session/{session_id}/asset/{scheme}/{host}/{path:path}", methods=["GET", "POST", "OPTIONS"])
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
                
                proto = request.headers.get("x-forwarded-proto", "http")
                api_base = os.getenv("API_BASE", "") or str(request.base_url)
                if proto == "https" and api_base.startswith("http://"):
                    api_base = "https://" + api_base[7:]
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

