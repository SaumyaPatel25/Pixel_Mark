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

# Async helper to record/upsert PageVisits cleanly
async def record_page_visit(
    db: AsyncSession,
    session_id: str,
    page_url: str,
    page_title: str = None,
    share_link_id: str = None,
    parent_page_id: str = None
) -> PageVisit:
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

async def resolve_session_base_url(session_id: str, db: AsyncSession) -> tuple[str, str]:
    """
    Given a session_id, queries session and project details and returns (base_url, project_id).
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
        
    return base_url, project.id

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


@router.get("/session/{session_id}")
async def proxy_initial(
    session_id: str,
    share_token: str = Query(None),
    db: AsyncSession = Depends(get_db)
):
    try:
        uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid UUID format")
        
    base_url, project_id = await resolve_session_base_url(session_id, db)
    
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
                return Response(
                    content=f"<html><body style='font-family:sans-serif;background:#0d0d14;color:#fff;padding:40px;text-align:center;'><h2>Service Unavailable</h2><p>Target site {base_url} returned status code {resp.status_code}.</p></body></html>",
                    media_type="text/html",
                    status_code=503
                )
                
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
                    api_base=api_base
                )
                
                response = Response(content=rewritten_html.encode("utf-8"), media_type="text/html")
                response.headers["X-PixelMark-Session"] = session_id
                response.headers["X-PixelMark-Page"] = base_url
                
                response.set_cookie("pixelmark_session_id", session_id, path="/", httponly=True, max_age=86400)
                
                if "Content-Security-Policy" in response.headers:
                    del response.headers["Content-Security-Policy"]
                if "X-Frame-Options" in response.headers:
                    del response.headers["X-Frame-Options"]
                return response
            else:
                return Response(content=resp.content, media_type=content_type)
                
    except Exception as e:
        return Response(
            content=f"<html><body style='font-family:sans-serif;background:#0d0d14;color:#fff;padding:40px;text-align:center;'><h2>Service Unavailable</h2><p>Target site {base_url} is unreachable.</p><p style='color:gray;'>{str(e)}</p></body></html>",
            media_type="text/html",
            status_code=503
        )


@router.get("/session/{session_id}/page")
async def proxy_page(
    session_id: str,
    url: str,
    parent_page_id: str = Query(None),
    share_token: str = Query(None),
    db: AsyncSession = Depends(get_db)
):
    try:
        uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid UUID format")
        
    base_url, project_id = await resolve_session_base_url(session_id, db)
    
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
                return Response(
                    content=f"<html><body style='font-family:sans-serif;background:#0d0d14;color:#fff;padding:40px;text-align:center;'><h2>Service Unavailable</h2><p>Target page {url} returned status code {resp.status_code}.</p></body></html>",
                    media_type="text/html",
                    status_code=503
                )
                
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
                    api_base=api_base
                )
                
                response = Response(content=rewritten_html.encode("utf-8"), media_type="text/html")
                response.headers["X-PixelMark-Session"] = session_id
                response.headers["X-PixelMark-Page"] = url
                
                response.set_cookie("pixelmark_session_id", session_id, path="/", httponly=True, max_age=86400)
                
                if "Content-Security-Policy" in response.headers:
                    del response.headers["Content-Security-Policy"]
                if "X-Frame-Options" in response.headers:
                    del response.headers["X-Frame-Options"]
                return response
            else:
                return Response(content=resp.content, media_type=content_type)
                
    except Exception as e:
        return Response(
            content=f"<html><body style='font-family:sans-serif;background:#0d0d14;color:#fff;padding:40px;text-align:center;'><h2>Service Unavailable</h2><p>Target page {url} is unreachable.</p><p style='color:gray;'>{str(e)}</p></body></html>",
            media_type="text/html",
            status_code=503
        )


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
    cachable_types = ("image/", "font/", "application/javascript", "text/css", "application/wasm", "model/gltf", "application/octet-stream")
    cachable_exts = (".js", ".css", ".png", ".jpg", ".jpeg", ".gif", ".svg", ".woff", ".woff2", ".ttf", ".eot", ".otf", ".glb", ".gltf", ".wasm", ".ico")
    
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
    base_url, _ = await resolve_session_base_url(session_id, db)
    
    if not is_ssrf_safe(url):
        raise HTTPException(status_code=403, detail="SSRF target blocked")
    if not is_domain_allowed(url, base_url, is_asset=True):
        if ".js" in url or "javascript" in url:
            return Response(
                content=f'console.warn("PixelMark Warning: Script asset blocked by domain scoping: {url}");'.encode("utf-8"),
                media_type="application/javascript"
            )
        raise HTTPException(status_code=403, detail="Asset target blocked: Out of domain scope")

    cached_content, cached_type = get_cached_asset(url)
    if cached_content is not None:
        response = Response(content=cached_content, media_type=cached_type)
        response.headers["Cache-Control"] = "public, max-age=31536000, immutable"
        response.headers["X-PixelMark-Cache"] = "HIT"
        return response

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

        async with httpx.AsyncClient(follow_redirects=True, timeout=15.0, verify=False) as client:
            resp = await client.get(url, headers=headers)
            
            if resp.status_code >= 400:
                if ".js" in url or "javascript" in url:
                    return Response(
                        content=f'console.warn("PixelMark Warning: Script asset returned status {resp.status_code}: {url}");'.encode("utf-8"),
                        media_type="application/javascript"
                    )
                raise HTTPException(status_code=resp.status_code, detail=f"Asset fetch returned {resp.status_code}")
                
            content_type = resp.headers.get("content-type", "application/octet-stream")
            save_cached_asset(url, resp.content, content_type)
            
            response = Response(content=resp.content, media_type=content_type)
            for header_name in ("Content-Security-Policy", "X-Frame-Options", "Frame-Ancestors"):
                if header_name in response.headers:
                    del response.headers[header_name]
                    
            response.headers["Cache-Control"] = "public, max-age=31536000, immutable"
            response.headers["X-PixelMark-Cache"] = "MISS"
            return response
    except Exception as e:
        if ".js" in url or "javascript" in url:
            return Response(
                content=f'console.warn("PixelMark Warning: Script asset failed to connect: {url} ({str(e)})");'.encode("utf-8"),
                media_type="application/javascript"
            )
        raise HTTPException(status_code=500, detail=str(e))

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
    base_url, _ = await resolve_session_base_url(session_id, db)
    
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
                    api_base=api_base
                )
                response = Response(content=rewritten_html.encode("utf-8"), media_type="text/html")
                return response
            else:
                return Response(content=resp.content, media_type=content_type)
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
        
    base_url, project_id = await resolve_session_base_url(session_id, db)
    
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

