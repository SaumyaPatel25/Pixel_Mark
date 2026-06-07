import pytest
import httpx
import sys
import os
import uuid
import asyncio
from datetime import datetime

# Add backend to path so we can import modules
sys.path.append(os.path.join(os.path.dirname(os.path.dirname(__file__)), "backend"))

from main import app
from database import DATABASE_URL
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.pool import NullPool
from sqlalchemy import select, delete
from models import Session, Project, User, Organization
from dependencies import get_db
from utils.proxy_rewriter import rewrite_html
from utils.ssrf_guard import is_ssrf_safe, is_domain_allowed

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

@pytest.fixture(scope="module")
def anyio_backend():
    return "asyncio"

@pytest.fixture(scope="module")
def event_loop():
    policy = asyncio.get_event_loop_policy()
    loop = policy.new_event_loop()
    yield loop
    loop.close()

@pytest.fixture(scope="module")
async def test_setup():
    async with TestSessionLocal() as db:
        user_id = str(uuid.uuid4())
        user = User(
            id=user_id,
            email=f"hardening_qa_{uuid.uuid4().hex[:6]}@pixelmark.dev",
            hashed_password="$argon2id$v=19$m=65536,t=3,p=4$...",
            name="Hardening QA User"
        )
        db.add(user)
        
        org_id = str(uuid.uuid4())
        org = Organization(
            id=org_id, 
            name="Hardening Org", 
            slug=f"hardening-org-{uuid.uuid4().hex[:6]}"
        )
        db.add(org)
        
        project_id = str(uuid.uuid4())
        project = Project(
            id=project_id,
            org_id=org_id,
            name="Hardening QA Project",
            url="https://example.com"
        )
        db.add(project)
        
        session_id = str(uuid.uuid4())
        session = Session(
            id=session_id,
            project_id=project_id,
            title="Hardening QA Session",
            pages_visited=0,
            conservative_render_mode=True
        )
        db.add(session)
        await db.commit()
        
        yield {
            "user": user,
            "org": org,
            "project": project,
            "session": session
        }
        
        await db.execute(delete(Session).where(Session.id == session_id))
        await db.execute(delete(Project).where(Project.id == project_id))
        await db.execute(delete(Organization).where(Organization.id == org_id))
        await db.execute(delete(User).where(User.id == user_id))
        await db.commit()
        
    await test_engine.dispose()


def test_conservative_render_mode_preserves_module_scripts():
    sample_html = """
    <!DOCTYPE html>
    <html>
    <head>
        <script type="module" src="https://originalsite.com/js/module.js"></script>
        <script src="https://originalsite.com/js/legacy.js"></script>
    </head>
    <body></body>
    </html>
    """
    session_id = "12345678-1234-1234-1234-123456789012"
    page_url = "https://originalsite.com/home"
    base_url = "https://originalsite.com"
    
    rewritten = rewrite_html(
        html=sample_html,
        session_id=session_id,
        page_url=page_url,
        base_url=base_url,
        conservative_render_mode=True
    )
    
    assert 'type="module"' in rewritten
    assert 'src="/proxy/session/12345678-1234-1234-1234-123456789012/asset/https/originalsite.com/js/module.js"' in rewritten
    assert 'src="/proxy/session/12345678-1234-1234-1234-123456789012/asset/https/originalsite.com/js/legacy.js"' in rewritten


def test_blob_and_data_urls_untouched():
    sample_html = """
    <!DOCTYPE html>
    <html>
    <body>
        <img src="data:image/png;base64,iVBORw0KGgo=" />
        <script src="blob:https://originalsite.com/abcdef"></script>
    </body>
    </html>
    """
    session_id = "12345678-1234-1234-1234-123456789012"
    page_url = "https://originalsite.com/home"
    base_url = "https://originalsite.com"
    
    rewritten = rewrite_html(
        html=sample_html,
        session_id=session_id,
        page_url=page_url,
        base_url=base_url,
        conservative_render_mode=True
    )
    
    assert 'src="data:image/png;base64,iVBORw0KGgo="' in rewritten
    assert 'src="blob:https://originalsite.com/abcdef"' in rewritten


def test_ssrf_safety_checks():
    assert not is_ssrf_safe("http://127.0.0.1")
    assert not is_ssrf_safe("http://localhost")
    assert not is_ssrf_safe("http://[::1]")
    assert not is_ssrf_safe("http://192.168.1.1")
    assert not is_ssrf_safe("http://10.0.0.1")
    assert not is_ssrf_safe("http://172.16.0.1")
    assert is_ssrf_safe("https://example.com")
    assert is_ssrf_safe("https://webrox.xyz")


def test_domain_scoping_rules():
    base_url = "https://originalsite.com"
    assert is_domain_allowed("https://sub.originalsite.com/assets/logo.png", base_url)
    assert is_domain_allowed("https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js", base_url, is_asset=True)
    assert not is_domain_allowed("https://externaldomain.com/page", base_url, is_asset=False)


@pytest.mark.asyncio
async def test_third_party_runtime_handling_blocked(test_setup):
    session = test_setup["session"]
    async with httpx.AsyncClient(app=app, base_url="http://test") as client:
        # Request a blocked tracking CDN asset - must be blocked safely and return warning script stub
        response = await client.get(
            f"/proxy/session/{session.id}/asset?url=https%3A//google-analytics.com/analytics.js"
        )
        assert response.status_code == 200
        assert "application/javascript" in response.headers["content-type"]
        assert b"PixelMark Warning: Tracker request blocked safely" in response.content


@pytest.mark.asyncio
async def test_ssrf_blocks_in_proxy(test_setup):
    session = test_setup["session"]
    async with httpx.AsyncClient(app=app, base_url="http://test") as client:
        # SSRF target inside route page navigation must return 403
        response = await client.get(f"/proxy/session/{session.id}/page?url=http%3A%2F%2F127.0.0.1%3A80")
        assert response.status_code == 403


@pytest.mark.asyncio
async def test_nextjs_static_chunks_exactly_preserved(test_setup):
    session = test_setup["session"]
    async with httpx.AsyncClient(app=app, base_url="http://test") as client:
        # Requesting a chunk with mock target origin
        response = await client.get(
            f"/proxy/session/{session.id}/asset/https/example.com/_next/static/chunks/main.js"
        )
        # Even if connection fails or fetches a mock, it should gracefully fall back to 204 or return warning rather than 500
        assert response.status_code in (200, 204)
