import sys
import os
import pytest
import uuid
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import StaticPool
from sqlalchemy import select
from datetime import datetime, timedelta

# Setup path to import backend modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from main import app
from dependencies import get_db, get_current_user
from database import Base
from models import User, Project, Session as DbSession, OrgMember, Organization, ShareLink, DOMEdit
from auth import create_access_token

# In-memory SQLite for testing
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"
engine = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

# Override dependencies
async def get_test_db():
    async with TestingSessionLocal() as session:
        yield session

MOCK_USER_ID = str(uuid.uuid4())
MOCK_USER_EMAIL = "owner@pixelmark.dev"
MOCK_ORG_ID = str(uuid.uuid4())
MOCK_MEMBER_ID = str(uuid.uuid4())
MOCK_PROJECT_ID = str(uuid.uuid4())
MOCK_SESSION_ID = str(uuid.uuid4())
MOCK_SHARE_TOKEN_ACTIVE = "token_active_comment_true"
MOCK_SHARE_TOKEN_NO_COMMENT = "token_active_comment_false"
MOCK_SHARE_TOKEN_INACTIVE = "token_inactive"

@pytest.fixture(autouse=True, scope="function")
def override_dependencies():
    app.dependency_overrides[get_db] = get_test_db
    yield
    app.dependency_overrides.clear()

client = TestClient(app)

@pytest.fixture(autouse=True, scope="function")
async def setup_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
    async with TestingSessionLocal() as session:
        # Seed user, org, membership, project, session
        u = User(id=MOCK_USER_ID, email=MOCK_USER_EMAIL, hashed_password="pwd")
        session.add(u)
        
        org = Organization(id=MOCK_ORG_ID, name="My Org", slug="my-org")
        session.add(org)
        
        member = OrgMember(id=MOCK_MEMBER_ID, org_id=MOCK_ORG_ID, user_id=MOCK_USER_ID, role="owner")
        session.add(member)
        
        proj = Project(id=MOCK_PROJECT_ID, org_id=MOCK_ORG_ID, name="My Proj", url="https://pixelmark.dev")
        session.add(proj)
        
        sess = DbSession(id=MOCK_SESSION_ID, project_id=MOCK_PROJECT_ID, title="Audit Session")
        session.add(sess)
        
        # ShareLink with can_comment=True
        sl_comment = ShareLink(
            id=str(uuid.uuid4()),
            session_id=MOCK_SESSION_ID,
            token=MOCK_SHARE_TOKEN_ACTIVE,
            can_comment=True,
            is_active=True
        )
        session.add(sl_comment)
        
        # ShareLink with can_comment=False
        sl_nocomment = ShareLink(
            id=str(uuid.uuid4()),
            session_id=MOCK_SESSION_ID,
            token=MOCK_SHARE_TOKEN_NO_COMMENT,
            can_comment=False,
            is_active=True
        )
        session.add(sl_nocomment)
        
        # ShareLink that is inactive
        sl_inactive = ShareLink(
            id=str(uuid.uuid4()),
            session_id=MOCK_SESSION_ID,
            token=MOCK_SHARE_TOKEN_INACTIVE,
            can_comment=True,
            is_active=False
        )
        session.add(sl_inactive)
        
        await session.commit()
        
    yield
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


def get_auth_headers():
    token = create_access_token({"sub": MOCK_USER_ID})
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.anyio
async def test_create_dom_edit_unauthenticated():
    resp = client.post(
        f"/sessions/{MOCK_SESSION_ID}/dom-edits",
        json={
            "session_id": MOCK_SESSION_ID,
            "selector": ".button-submit",
            "property": "background-color",
            "old_value": "red",
            "new_value": "blue",
            "element_tag": "BUTTON",
            "page_url": "https://pixelmark.dev/checkout"
        }
    )
    assert resp.status_code == 401


@pytest.mark.anyio
async def test_create_dom_edit_as_owner():
    headers = get_auth_headers()
    resp = client.post(
        f"/sessions/{MOCK_SESSION_ID}/dom-edits",
        headers=headers,
        json={
            "session_id": MOCK_SESSION_ID,
            "selector": ".button-submit",
            "property": "background-color",
            "old_value": "red",
            "new_value": "blue",
            "element_tag": "BUTTON",
            "element_text": "Submit Button",
            "page_url": "https://pixelmark.dev/checkout"
        }
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "id" in data
    assert data["selector"] == ".button-submit"
    assert data["property"] == "background-color"
    assert data["new_value"] == "blue"
    assert data["element_text"] == "Submit Button"


@pytest.mark.anyio
async def test_create_dom_edit_with_active_share_token():
    resp = client.post(
        f"/sessions/{MOCK_SESSION_ID}/dom-edits?share_token={MOCK_SHARE_TOKEN_ACTIVE}",
        json={
            "session_id": MOCK_SESSION_ID,
            "selector": ".button-submit",
            "property": "background-color",
            "old_value": "red",
            "new_value": "blue",
            "element_tag": "BUTTON",
            "page_url": "https://pixelmark.dev/checkout"
        }
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "id" in data
    assert data["property"] == "background-color"


@pytest.mark.anyio
async def test_create_dom_edit_with_no_comment_share_token():
    resp = client.post(
        f"/sessions/{MOCK_SESSION_ID}/dom-edits?share_token={MOCK_SHARE_TOKEN_NO_COMMENT}",
        json={
            "session_id": MOCK_SESSION_ID,
            "selector": ".button-submit",
            "property": "background-color",
            "old_value": "red",
            "new_value": "blue",
            "element_tag": "BUTTON",
            "page_url": "https://pixelmark.dev/checkout"
        }
    )
    assert resp.status_code == 403


@pytest.mark.anyio
async def test_create_dom_edit_with_inactive_share_token():
    resp = client.post(
        f"/sessions/{MOCK_SESSION_ID}/dom-edits?share_token={MOCK_SHARE_TOKEN_INACTIVE}",
        json={
            "session_id": MOCK_SESSION_ID,
            "selector": ".button-submit",
            "property": "background-color",
            "old_value": "red",
            "new_value": "blue",
            "element_tag": "BUTTON",
            "page_url": "https://pixelmark.dev/checkout"
        }
    )
    assert resp.status_code == 403


@pytest.mark.anyio
async def test_create_bulk_and_list_dom_edits():
    headers = get_auth_headers()
    
    # 1. Bulk Create
    resp = client.post(
        f"/sessions/{MOCK_SESSION_ID}/dom-edits/bulk",
        headers=headers,
        json=[
            {
                "session_id": MOCK_SESSION_ID,
                "selector": ".button-submit",
                "property": "background-color",
                "old_value": "red",
                "new_value": "blue",
                "element_tag": "BUTTON",
                "page_url": "https://pixelmark.dev/checkout"
            },
            {
                "session_id": MOCK_SESSION_ID,
                "selector": "h1",
                "property": "font-size",
                "old_value": "16px",
                "new_value": "24px",
                "element_tag": "H1",
                "page_url": "https://pixelmark.dev/landing"
            }
        ]
    )
    assert resp.status_code == 200
    bulk_data = resp.json()
    assert len(bulk_data) == 2
    assert bulk_data[0]["new_value"] == "blue"
    assert bulk_data[1]["new_value"] == "24px"

    # 2. List Grouped by page_url
    resp_list = client.get(
        f"/sessions/{MOCK_SESSION_ID}/dom-edits",
        headers=headers
    )
    assert resp_list.status_code == 200
    grouped_data = resp_list.json()
    assert "https://pixelmark.dev/checkout" in grouped_data
    assert "https://pixelmark.dev/landing" in grouped_data
    assert len(grouped_data["https://pixelmark.dev/checkout"]) == 1
    assert len(grouped_data["https://pixelmark.dev/landing"]) == 1


@pytest.mark.anyio
async def test_delete_endpoints():
    headers = get_auth_headers()
    
    # Create an edit
    resp_create = client.post(
        f"/sessions/{MOCK_SESSION_ID}/dom-edits",
        headers=headers,
        json={
            "session_id": MOCK_SESSION_ID,
            "selector": ".btn",
            "property": "color",
            "old_value": "black",
            "new_value": "white",
            "element_tag": "BUTTON",
            "page_url": "https://pixelmark.dev/test"
        }
    )
    assert resp_create.status_code == 200
    edit_id = resp_create.json()["id"]

    # Delete edit as share token (should be forbidden)
    resp_delete_share = client.delete(
        f"/sessions/{MOCK_SESSION_ID}/dom-edits/{edit_id}?share_token={MOCK_SHARE_TOKEN_ACTIVE}"
    )
    assert resp_delete_share.status_code == 403

    # Delete edit as owner
    resp_delete = client.delete(
        f"/sessions/{MOCK_SESSION_ID}/dom-edits/{edit_id}",
        headers=headers
    )
    assert resp_delete.status_code == 200
    assert resp_delete.json()["status"] == "success"

    # Verify deleted
    resp_list = client.get(
        f"/sessions/{MOCK_SESSION_ID}/dom-edits",
        headers=headers
    )
    assert resp_list.status_code == 200
    assert resp_list.json() == {}


@pytest.mark.anyio
async def test_delete_all_dom_edits():
    headers = get_auth_headers()
    
    # Create multiple edits
    client.post(
        f"/sessions/{MOCK_SESSION_ID}/dom-edits/bulk",
        headers=headers,
        json=[
            {
                "session_id": MOCK_SESSION_ID,
                "selector": ".button-submit",
                "property": "background-color",
                "old_value": "red",
                "new_value": "blue",
                "element_tag": "BUTTON",
                "page_url": "https://pixelmark.dev/checkout"
            },
            {
                "session_id": MOCK_SESSION_ID,
                "selector": "h1",
                "property": "font-size",
                "old_value": "16px",
                "new_value": "24px",
                "element_tag": "H1",
                "page_url": "https://pixelmark.dev/landing"
            }
        ]
    )

    # Delete all as owner
    resp_del_all = client.delete(
        f"/sessions/{MOCK_SESSION_ID}/dom-edits",
        headers=headers
    )
    assert resp_del_all.status_code == 200
    assert resp_del_all.json()["deleted_count"] == 2

    # Verify deleted
    resp_list = client.get(
        f"/sessions/{MOCK_SESSION_ID}/dom-edits",
        headers=headers
    )
    assert resp_list.status_code == 200
    assert resp_list.json() == {}


@pytest.mark.anyio
async def test_export_css():
    headers = get_auth_headers()
    
    # Create edits
    client.post(
        f"/sessions/{MOCK_SESSION_ID}/dom-edits/bulk",
        headers=headers,
        json=[
            {
                "session_id": MOCK_SESSION_ID,
                "selector": ".button-submit",
                "property": "background-color",
                "old_value": "red",
                "new_value": "blue",
                "element_tag": "BUTTON",
                "page_url": "https://pixelmark.dev/checkout"
            },
            {
                "session_id": MOCK_SESSION_ID,
                "selector": "h1",
                "property": "font-size",
                "old_value": "16px",
                "new_value": "24px",
                "element_tag": "H1",
                "page_url": "https://pixelmark.dev/landing"
            }
        ]
    )

    # Export CSS as share token (should be forbidden)
    resp_export_share = client.get(
        f"/sessions/{MOCK_SESSION_ID}/dom-edits/export/css?share_token={MOCK_SHARE_TOKEN_ACTIVE}"
    )
    assert resp_export_share.status_code == 403

    # Export CSS as owner
    resp_export = client.get(
        f"/sessions/{MOCK_SESSION_ID}/dom-edits/export/css",
        headers=headers
    )
    assert resp_export.status_code == 200
    assert resp_export.headers["content-type"].startswith("text/css")
    
    css = resp_export.text
    # Expected format:
    # /* PixelMark DOM Edit Export — Session: Audit Session */
    # /* Page: https://pixelmark.dev/checkout */
    # .button-submit {
    #   background-color: blue; /* was: red */
    # }
    # /* Page: https://pixelmark.dev/landing */
    # h1 {
    #   font-size: 24px; /* was: 16px */
    # }
    assert "/* PixelMark DOM Edit Export — Session: Audit Session */" in css
    assert "/* Page: https://pixelmark.dev/checkout */" in css
    assert ".button-submit {" in css
    assert "  background-color: blue; /* was: red */" in css
    assert "/* Page: https://pixelmark.dev/landing */" in css
    assert "h1 {" in css
    assert "  font-size: 24px; /* was: 16px */" in css
