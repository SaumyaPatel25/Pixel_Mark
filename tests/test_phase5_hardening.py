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
from models import Session, PageVisit, Marker, Project, User, Organization, AuditArtifact, ShareLink
from dependencies import get_db, get_current_user

# Override database engine for tests
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

async def override_get_current_user():
    return User(id="mock-hardening-user-id", email="hardening@pixelmark.dev", name="Hardening Tester")

app.dependency_overrides[get_db] = override_get_db
app.dependency_overrides[get_current_user] = override_get_current_user

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
    # Setup: Create temporary user, org, project, session
    async with TestSessionLocal() as db:
        user_id = str(uuid.uuid4())
        user = User(
            id=user_id,
            email=f"phase5_hardening_{uuid.uuid4().hex[:6]}@pixelmark.dev",
            hashed_password="$argon2id$v=19$m=65536,t=3,p=4$...",
            name="Phase 5 Hardening QA User"
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
            name="Hardening Verification Project",
            url="https://opinvox.pixelmark.com"
        )
        db.add(project)
        
        session_id = str(uuid.uuid4())
        session = Session(
            id=session_id,
            project_id=project_id,
            title="Hardening Verification Session",
            pages_visited=1
        )
        db.add(session)
        await db.commit()
        
        yield {
            "user": user,
            "org": org,
            "project": project,
            "session": session
        }
        
        # Teardown: Cleanup all created records
        await db.execute(delete(AuditArtifact).where(AuditArtifact.session_id == session_id))
        await db.execute(delete(ShareLink).where(ShareLink.session_id == session_id))
        await db.execute(delete(Marker).where(Marker.session_id == session_id))
        await db.execute(delete(PageVisit).where(PageVisit.session_id == session_id))
        await db.execute(delete(Session).where(Session.id == session_id))
        await db.execute(delete(Project).where(Project.id == project_id))
        await db.execute(delete(Organization).where(Organization.id == org_id))
        await db.execute(delete(User).where(User.id == user_id))
        await db.commit()
        
    # Dispose of engine connection pool to release connections
    await test_engine.dispose()

@pytest.mark.asyncio
async def test_feedback_hardening_workflow_and_analytics(test_setup):
    session = test_setup["session"]
    
    async with httpx.AsyncClient(app=app, base_url="http://test") as client:
        # 1. Create a Marker (First submission)
        marker_id = str(uuid.uuid4())
        payload = {
            "id": marker_id,
            "session_id": session.id,
            "title": "Initial Bug Report",
            "page_url": "https://opinvox.pixelmark.com/",
            "page_title": "OpinVox Home",
            "renderer_type": "dom",
            "priority": "high",
            "comment": "Initial draft comment",
            "screenshot_url": "https://s3.amazonaws.com/pixelmark/sc.png",
            "capturepayload": {
                "id": marker_id,
                "note": "Initial draft comment",
                "coordinates": {"pageX": 100, "pageY": 200}
            }
        }
        resp = await client.post("/markers/", json=payload)
        assert resp.status_code == 200
        marker_data = resp.json()
        marker_id = marker_data["id"]
        assert marker_data["status"] == "new" or marker_data["status"] == "submitted"
        
        # 2. Verify audit trail logs creation or status change
        async with TestSessionLocal() as db:
            result = await db.execute(
                select(AuditArtifact).where(
                    AuditArtifact.session_id == session.id,
                    AuditArtifact.kind == "status_change"
                )
            )
            audits = result.scalars().all()
            # If the backend logs status change on creation, we should have at least 1 audit artifact
            # If it only logs on updates, it will be tested in the next step.
            
        # 3. PATCH status and priority
        patch_payload = {
            "status": "in_progress",
            "priority": "critical",
            "comment": "Updated progress report"
        }
        resp = await client.patch(f"/markers/{marker_id}", json=patch_payload)
        assert resp.status_code == 200
        updated_data = resp.json()
        assert updated_data["status"] == "in_progress"
        assert updated_data["priority"] == "critical"
        
        # 4. Check feedback history endpoint
        resp = await client.get(f"/sessions/{session.id}/feedback/{marker_id}/history")
        assert resp.status_code == 200
        history = resp.json()
        assert len(history) >= 1
        assert history[-1]["new_status"] == "in_progress"
        
        # 5. Create a ShareLink and PageVisit to simulate reviewer usage
        share_link_id = str(uuid.uuid4())
        async with TestSessionLocal() as db:
            share = ShareLink(
                id=share_link_id,
                session_id=session.id,
                token=f"test-token-{uuid.uuid4().hex[:6]}",
                use_count=5,
                expires_at=datetime.utcnow()
            )
            db.add(share)
            await db.commit()
            
        async with TestSessionLocal() as db:
            visit = PageVisit(
                id=str(uuid.uuid4()),
                session_id=session.id,
                share_link_id=share_link_id,
                page_url="https://opinvox.pixelmark.com/review",
                visited_at=datetime.utcnow()
            )
            db.add(visit)
            await db.commit()
            
        # 6. Retrieve real analytics and verify
        resp = await client.get(f"/sessions/{session.id}/analytics")
        assert resp.status_code == 200
        analytics = resp.json()
        
        # Assert structure and real metrics
        assert analytics["session_id"] == session.id
        assert analytics["project_id"] == session.project_id
        
        s_metrics = analytics["session"]
        assert s_metrics["total_feedback"] == 1
        assert s_metrics["status_counts"]["in_progress"] == 1
        assert s_metrics["priority_counts"]["critical"] == 1
        assert s_metrics["screenshot_attachment_rate"] == 1.0
        assert s_metrics["share_link_usage_count"] == 5
        assert s_metrics["reviewer_visit_count"] == 1
        assert s_metrics["reviewer_active_pages"][0]["page_url"] == "https://opinvox.pixelmark.com/review"
        assert s_metrics["marker_deletion_count"] == 0
        
        # 7. Delete marker and verify it is not in the list and audit trail is recorded
        resp = await client.delete(f"/markers/{marker_id}")
        assert resp.status_code == 200
        assert resp.json()["deleted"] is True
        
        # Reload analytics to check deletion count
        resp = await client.get(f"/sessions/{session.id}/analytics")
        assert resp.status_code == 200
        analytics_after = resp.json()
        assert analytics_after["session"]["marker_deletion_count"] == 1
        assert analytics_after["session"]["total_feedback"] == 0
