from fastapi import FastAPI
import os
from fastapi.middleware.cors import CORSMiddleware
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
]

if settings.frontend_url and settings.frontend_url not in ALLOWED_ORIGINS:
    ALLOWED_ORIGINS.append(settings.frontend_url)

# Optionally include vercel app for preview builds
ALLOWED_ORIGINS.append("https://*.vercel.app")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
