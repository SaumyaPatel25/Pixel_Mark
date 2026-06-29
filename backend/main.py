from fastapi import FastAPI
import os
import httpx
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from database import engine, Base
import asyncio
import logging
from routes import auth, projects, sessions, markers, proxy, export, websocket, canvas, shares, flags, screenshot
from routers.share_links import router as share_links_router
from routers.review import router as review_router
from routers.ai import router as ai_router
from routers.ai_provider_configs import router as ai_provider_configs_router
from routers.dom_edits import router as dom_edits_router
from routers.settings import router as settings_router


logger = logging.getLogger("uvicorn")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Production-grade Neon DB reconnection retry backoff loop on startup
    retries = 5
    delay = 3
    for i in range(1, retries + 1):
        try:
            logger.info(f"Connecting to Neon DB (Attempt {i}/{retries})...")
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
            logger.info("✓ Neon DB connection successful & tables verified!")
            break
        except Exception as e:
            logger.warning(f"⚠ Database connection attempt {i} failed: {e}")
            if i == retries:
                logger.error("❌ Neon DB connection saturated or failed. Shutting down application.")
                raise e
            logger.info(f"Retrying database connection in {delay} seconds...")
            await asyncio.sleep(delay)
            delay *= 1.5
    yield

app = FastAPI(title="PixelMark API", version="2.0.0", lifespan=lifespan)

from errors import AppError, app_error_handler, validation_error_handler, unhandled_exception_handler
from fastapi.exceptions import RequestValidationError

app.add_exception_handler(AppError, app_error_handler)
app.add_exception_handler(RequestValidationError, validation_error_handler)
app.add_exception_handler(Exception, unhandled_exception_handler)

from config import settings

ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:8765",
    "http://localhost:8765",
    "https://tailwindcss.com",
]

if settings.frontend_url and settings.frontend_url not in ALLOWED_ORIGINS:
    ALLOWED_ORIGINS.append(settings.frontend_url)

from fastapi import Request, Response as FAResponse
import re
import urllib.parse
from database import AsyncSessionLocal
from sqlalchemy import select
from models import Session, Project, Environment

@app.middleware("http")
async def proxy_fallback_middleware(request: Request, call_next):
    path = request.url.path
    
    # 1. Determine if this path is reserved for the primary PixelMark backend API and static folders
    reserved_prefixes = (
        "/auth", "/projects", "/sessions", "/markers", "/canvas", "/shares", 
        "/proxy", "/export", "/websocket", "/health", "/static", "/docs", "/openapi.json",
        "/share-links", "/review", "/ai", "/waitlist", "/settings"
    )
    is_reserved = any(path.startswith(prefix) for prefix in reserved_prefixes)
    
    # 2. Trigger fallback proxy if the path is NOT reserved for PixelMark backend (so it's a website subpage/asset route)
    if not is_reserved:
        referer = request.headers.get("referer", "")
        session_id = None
        
        client_host = request.client.host if request.client else "unknown"
        
        # Try to extract session ID from Referer header
        match = re.search(r"/proxy/session/([a-f0-9\-]{36})", referer)
        if match:
            session_id = match.group(1)
        else:
            # Fall back to session cookie
            session_id = request.cookies.get("pixelmark_session_id")
            
        if not session_id:
            # Fall back to active IP session mapping
            from routes.proxy import ACTIVE_IP_SESSIONS
            session_id = ACTIVE_IP_SESSIONS.get(client_host)
            
        if session_id:
            async with AsyncSessionLocal() as db:
                result = await db.execute(
                    select(Session).where(Session.id == session_id)
                )
                session = result.scalar_one_or_none()
                if session:
                    proj_result = await db.execute(
                        select(Project).where(Project.id == session.project_id)
                    )
                    project = proj_result.scalar_one_or_none()
                    if project:
                        env_result = await db.execute(
                            select(Environment).where(Environment.project_id == project.id)
                        )
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
                            
                        if base_url:
                            target_url = urllib.parse.urljoin(base_url, path)
                            if request.url.query:
                                target_url = f"{target_url}?{request.url.query}"
                                
                            from utils.ssrf_guard import is_ssrf_safe, is_domain_allowed
                            import logging
                            logger = logging.getLogger("pixelmark.proxy")
                            
                            # Enforce SSRF safety
                            if not is_ssrf_safe(target_url):
                                from routes.proxy import prepare_proxy_response
                                logger.warning(f"[SSRF BLOCKED] Fallback block on: {target_url}")
                                return prepare_proxy_response(FAResponse(content=b"SSRF Target Blocked", status_code=403))
                                
                            # Unconditional forwarding for /_next/ routes (Prompt 2)
                            if path.startswith("/_next/"):
                                try:
                                    parsed_base = urllib.parse.urlparse(base_url)
                                    from fastapi.responses import StreamingResponse
                                    from routes.proxy import prepare_proxy_response
                                    client = httpx.AsyncClient(verify=False, timeout=30.0)
                                    headers = {
                                        k: v for k, v in request.headers.items()
                                        if k.lower() not in ("host", "connection", "accept-encoding")
                                    }
                                    headers["Host"] = parsed_base.netloc
                                    headers["X-PixelMark-Session"] = session_id
                                    
                                    req = client.build_request(
                                        request.method,
                                        target_url,
                                        headers=headers,
                                        content=await request.body() if request.method in ("POST", "PUT", "PATCH") else None
                                    )
                                    resp = await client.send(req, stream=True)
                                    
                                    async def gen():
                                        try:
                                            async for chunk in resp.aiter_bytes():
                                                yield chunk
                                        finally:
                                            await resp.aclose()
                                            await client.aclose()
                                            
                                    resp_headers = dict(resp.headers)
                                    resp_headers.pop("content-encoding", None)
                                    resp_headers.pop("content-length", None)
                                    
                                    response = StreamingResponse(
                                        gen(),
                                        status_code=resp.status_code,
                                        media_type=resp.headers.get("content-type"),
                                        headers=resp_headers
                                    )
                                    return prepare_proxy_response(response)
                                except Exception as e:
                                    logger.error(f"[PROXY_NEXT] Failed to proxy next route {target_url}: {str(e)}")
                                    from routes.proxy import prepare_proxy_response
                                    return prepare_proxy_response(FAResponse(content=b"", status_code=204))
                                
                            # Check allow/block policy for third-party requests (Prompt 10)
                            parsed_target = urllib.parse.urlparse(target_url)
                            parsed_base = urllib.parse.urlparse(base_url)
                            is_third_party = parsed_target.netloc != parsed_base.netloc
                            
                            if is_third_party:
                                BLOCKED_EXTERNAL_ORIGINS = [
                                    "firebase.googleapis.com",
                                    "firebaseapp.com",
                                    "firestore.googleapis.com",
                                    "google-analytics.com",
                                    "analytics.google.com",
                                    "googletagmanager.com",
                                    "hotjar.com",
                                    "segment.io",
                                ]
                                hostname = parsed_target.netloc.lower()
                                is_blocked = any(hostname == origin or hostname.endswith("." + origin) for origin in BLOCKED_EXTERNAL_ORIGINS)
                                
                                if is_blocked:
                                    from routes.proxy import prepare_proxy_response
                                    logger.info(f"[THIRD_PARTY POLICY] BLOCKED fallback external SDK/tracker request: {target_url}")
                                    if ".js" in target_url or "javascript" in target_url:
                                        return prepare_proxy_response(FAResponse(
                                            content=f'console.warn("Blocked by PixelMark proxy: {target_url}");'.encode("utf-8"),
                                            media_type="application/javascript"
                                        ))
                                    from fastapi.responses import JSONResponse
                                    return prepare_proxy_response(JSONResponse({
                                        "error": "blocked_by_pixelmark_proxy",
                                        "status": "mocked",
                                        "projectId": "pixelmark-mock"
                                    }, status_code=200))
                                else:
                                    logger.info(f"[THIRD_PARTY POLICY] ALLOWED standard fallback CDN/asset request: {target_url}")

                            # Check if request is Next.js React Server Component (RSC) streaming request
                            is_rsc_request = "rsc" in request.headers or any(k.lower().startswith("next-") for k in request.headers.keys())
                            if is_rsc_request:
                                from routes.proxy import proxy_rsc_request
                                return await proxy_rsc_request(request, target_url)

                            try:
                                # Check cache for asset requests (skip HTML pages to allow recording visits)
                                if not path.endswith((".html", "/")):
                                    from routes.proxy import get_cached_asset, prepare_proxy_response
                                    cached_content, cached_type = get_cached_asset(target_url)
                                    if cached_content is not None:
                                        response = FAResponse(content=cached_content, media_type=cached_type)
                                        from routes.proxy import set_cache_headers
                                        set_cache_headers(response, urllib.parse.urlparse(target_url).path, request.url.query)
                                        response.headers["X-PixelMark-Cache"] = "HIT"
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
                                        
                                headers = {
                                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                                    "X-PixelMark-Session": session_id
                                }
                                async with httpx.AsyncClient(follow_redirects=True, timeout=15.0, verify=False) as client:
                                    resp = await client.get(target_url, headers=headers)
                                    content_type = resp.headers.get("content-type", "application/octet-stream")
                                    
                                    if "text/html" in content_type:
                                        from routes.proxy import rewrite_html, record_page_visit, prepare_proxy_response
                                        
                                        # Record the subpage visit history robustly using core logic
                                        await record_page_visit(
                                            db=db,
                                            session_id=session.id,
                                            page_url=target_url,
                                            page_title=None
                                        )
                                        
                                        snapshot_mode = request.query_params.get("snapshot_mode") == "true"
                                        proto = request.headers.get("x-forwarded-proto", "http")
                                        api_base = os.getenv("API_BASE", "") or str(request.base_url)
                                        if proto == "https" and api_base.startswith("http://"):
                                            api_base = "https://" + api_base[7:]
                                        rewritten_html = rewrite_html(
                                            resp.text, 
                                            session.id, 
                                            target_url, 
                                            base_url, 
                                            api_base,
                                            conservative_render_mode=session.conservative_render_mode,
                                            snapshot_mode=snapshot_mode
                                        )
                                        response = FAResponse(content=rewritten_html.encode("utf-8"), media_type="text/html")
                                        from routes.proxy import set_cache_headers
                                        set_cache_headers(response, urllib.parse.urlparse(target_url).path, request.url.query)
                                    else:
                                        from routes.proxy import prepare_proxy_response, save_cached_asset
                                        save_cached_asset(target_url, resp.content, content_type)
                                        response = FAResponse(content=resp.content, media_type=content_type, status_code=resp.status_code)
                                        from routes.proxy import set_cache_headers
                                        set_cache_headers(response, urllib.parse.urlparse(target_url).path, request.url.query)
                                    
                                    # Set/Refresh session cookie
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
                            except Exception as e:
                                pass
                                
    return await call_next(request)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"https://.*\.tailwindcss\.com",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files
static_dir = os.path.join(os.path.dirname(__file__), "static")
os.makedirs(static_dir, exist_ok=True)
app.mount("/static", StaticFiles(directory=static_dir), name="static")

app.include_router(auth.router)
app.include_router(projects.router)
app.include_router(sessions.router)
app.include_router(markers.router)
app.include_router(canvas.router)
app.include_router(shares.router)
app.include_router(share_links_router, prefix="/share-links", tags=["share-links"])
app.include_router(review_router, prefix="/review", tags=["review"])
app.include_router(ai_router)
app.include_router(ai_provider_configs_router)
app.include_router(proxy.router)
app.include_router(export.router)
app.include_router(websocket.router)
app.include_router(flags.router)
app.include_router(screenshot.router)
app.include_router(dom_edits_router)
app.include_router(settings_router)

@app.get("/health")
async def health():
    return {"status": "ok", "version": "2.0.0"}

@app.post("/waitlist")
async def add_to_waitlist(request: Request):
    from database import AsyncSessionLocal
    from models import Waitlist
    from fastapi import HTTPException
    
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")
        
    email = body.get("email")
    source = body.get("source", "unknown")
    
    if not email or "@" not in email:
        raise HTTPException(status_code=422, detail="Invalid email address")
        
    async with AsyncSessionLocal() as session_db:
        entry = Waitlist(email=email, source=source)
        session_db.add(entry)
        await session_db.commit()
        
    return {"success": True, "message": "You're on the list! We'll email you when it launches."}

@app.post("/resolve-token/{token}")
async def resolve_token(token: str, request: Request):
    from database import AsyncSessionLocal
    from models import ShareLink, Session, Project
    from datetime import datetime
    from auth import verify_password
    from fastapi import HTTPException
    from fastapi.responses import JSONResponse
    
    body = {}
    try:
        body = await request.json()
    except Exception:
        pass
    
    password = body.get("password")
    
    async with AsyncSessionLocal() as session_db:
        result = await session_db.execute(select(ShareLink).where(ShareLink.token == token))
        link = result.scalar_one_or_none()
        if not link:
            return JSONResponse(status_code=404, content={"error": "not_found", "detail": "Invalid share link token"})
            
        # Check revoked
        if link.is_active is False:
            return JSONResponse(status_code=410, content={"error": "link_revoked", "detail": "Share link has been revoked"})
            
        # Check expiry
        if link.expires_at and link.expires_at < datetime.utcnow():
            return JSONResponse(status_code=410, content={"error": "link_expired", "detail": "Share link has expired"})
            
        # Check use limit
        if link.max_uses and (link.use_count or 0) >= link.max_uses:
            return JSONResponse(status_code=410, content={"error": "link_exhausted", "detail": "Share link has reached its maximum use limit"})
            
        # Check password
        if link.password_hash:
            if not password:
                return JSONResponse(status_code=403, content={"error": "password_required", "detail": "Password required"})
            if not verify_password(password, link.password_hash):
                return JSONResponse(status_code=403, content={"error": "wrong_password", "detail": "Incorrect password"})
                
        # Get session details
        session_result = await session_db.execute(select(Session).where(Session.id == link.session_id))
        session = session_result.scalar_one_or_none()
        if not session:
            return JSONResponse(status_code=404, content={"error": "not_found", "detail": "Associated session not found"})
            
        project_result = await session_db.execute(select(Project).where(Project.id == session.project_id))
        project = project_result.scalar_one_or_none()
        if not project:
            return JSONResponse(status_code=404, content={"error": "not_found", "detail": "Associated project not found"})
        
        # Increment use count
        link.use_count = (link.use_count or 0) + 1
        await session_db.commit()
            
        return {
            "session_id": session.id,
            "title": session.title,
            "can_comment": link.can_comment,
            "role": link.role or "tester",
            "id": project.id,
            "project_id": project.id,
            "name": project.name,
            "project_name": project.name,
            "url": project.url,
            "target_url": project.url,
            "token": token,
        }

