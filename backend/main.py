from fastapi import FastAPI
import os
import httpx
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from database import engine, Base
import asyncio
import logging

from routes import auth, projects, sessions, markers, shares, proxy, export, websocket, canvas

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

from config import settings

ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:3001",
    "https://web-zeta-sable-82.vercel.app",
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
    # Capture _next assets, webpack chunks, or icons
    if path.startswith("/_next/") or path in ("/icon.svg", "/favicon.ico") or path.endswith((".js", ".css", ".png", ".jpg", ".jpeg", ".woff2", ".woff", ".ttf")):
        # Check if the path is actually handled by our mounted static files
        if path.startswith("/static"):
            return await call_next(request)
            
        referer = request.headers.get("referer", "")
        session_id = None
        
        # 1. Try to extract session ID from Referer header
        match = re.search(r"/proxy/session/([a-f0-9\-]{36})", referer)
        if match:
            session_id = match.group(1)
            
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
                                
                            try:
                                headers = {
                                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                                }
                                async with httpx.AsyncClient(follow_redirects=True, timeout=15.0, verify=False) as client:
                                    resp = await client.get(target_url, headers=headers)
                                    content_type = resp.headers.get("content-type", "application/octet-stream")
                                    return FAResponse(content=resp.content, media_type=content_type, status_code=resp.status_code)
                            except Exception as e:
                                pass
                                
    return await call_next(request)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"https://.*\.vercel\.app",
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
app.include_router(proxy.router)
app.include_router(export.router)
app.include_router(websocket.router)

@app.get("/health")
async def health():
    return {"status": "ok", "version": "2.0.0"}
