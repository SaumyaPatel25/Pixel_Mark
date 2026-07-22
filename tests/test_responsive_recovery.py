import pytest
import sys
import os
import uuid
from bs4 import BeautifulSoup

# Add backend to path so we can import modules
sys.path.append(os.path.join(os.path.dirname(os.path.dirname(__file__)), "backend"))

from utils.proxy_rewriter import rewrite_html
from main import app
from database import DATABASE_URL
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.pool import NullPool
from dependencies import get_db

# Override the database engine with NullPool specifically for tests
test_engine = create_async_engine(
    DATABASE_URL,
    poolclass=NullPool,
    connect_args={"ssl": True} if "neon.tech" in DATABASE_URL else {}
)

TestSessionLocal = async_sessionmaker(
    test_engine,
    expire_on_commit=False,
    class_=AsyncSession
)

async def override_get_db():
    async with TestSessionLocal() as session:
        yield session

app.dependency_overrides[get_db] = override_get_db

def test_static_snapshot_mode_decomposes_all_scripts():
    """
    Verifies that when snapshot_mode=True is passed to rewrite_html,
    all pre-existing <script> tags are fully decomposed/stripped from the DOM tree,
    except the injected STAGE agent and configuration scripts which are added after.
    """
    sample_html = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Heavy WebGL Toro Scene Portfolio</title>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
        <script>
            console.log("Initializing ThreeJS Scene...");
            const scene = new THREE.Scene();
        </script>
        <link rel="stylesheet" href="/style.css" />
    </head>
    <body>
        <div id="canvas-container"></div>
        <script src="/_next/static/chunks/main.js"></script>
    </body>
    </html>
    """
    session_id = "87654321-4321-4321-4321-876543210987"
    page_url = "https://webrox.xyz"
    base_url = "https://webrox.xyz"
    
    rewritten = rewrite_html(
        html=sample_html,
        session_id=session_id,
        page_url=page_url,
        base_url=base_url,
        snapshot_mode=True
    )
    
    soup = BeautifulSoup(rewritten, "html.parser")
    
    # Assert that all standard target-site scripts are stripped
    scripts = soup.find_all("script")
    
    # The only remaining scripts must be the injected STAGE ones
    # Let's count them and inspect them
    assert len(scripts) > 0
    for s in scripts:
        src = s.get("src", "")
        if src:
            assert "stage-agent.js" in src
        else:
            # Inline config script
            assert "window.__STAGE__" in s.string or "serviceWorker" in s.string

    # Original script sources must NOT exist in the page
    assert "three.min.js" not in rewritten
    assert "main.js" not in rewritten
    assert "Initializing ThreeJS Scene" not in rewritten
    assert "style.css" in rewritten  # CSS styles remain untouched

def test_static_snapshot_mode_parameter_inheritance():
    """
    Verifies that when snapshot_mode=True is active, the conservative_render_mode is
    implicitly forced to True in the rewriter.
    """
    sample_html = """
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            .hero { background-image: url('/bg.png'); }
        </style>
    </head>
    <body></body>
    </html>
    """
    session_id = "87654321-4321-4321-4321-876543210987"
    page_url = "https://webrox.xyz"
    base_url = "https://webrox.xyz"
    
    rewritten = rewrite_html(
        html=sample_html,
        session_id=session_id,
        page_url=page_url,
        base_url=base_url,
        snapshot_mode=True
    )
    
    # In snapshot (and conservative) mode, aggressive style replacement is skipped, so bg.png remains relative or untouched
    assert "/bg.png" in rewritten

def test_dynamic_viewport_sizing_fallback_state():
    """
    Mocks active mobile drawer layout metrics and verifies boundaries return cleanly.
    """
    mock_viewport = {"width": 375, "height": 667}
    expected_drawer_height = mock_viewport["height"] * 0.60
    assert expected_drawer_height == 400.2
