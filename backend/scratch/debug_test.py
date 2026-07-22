import asyncio
import uuid
import sys
import os

sys.path.append(os.path.join(os.path.dirname(os.path.dirname(__file__))))

from main import app
from database import DATABASE_URL, AsyncSessionLocal
from sqlalchemy import select, delete
from models import Session, PageVisit, Marker, Project, User, Organization
from dependencies import get_db, get_current_user
import httpx

async def override_get_db():
    async with AsyncSessionLocal() as session:
        yield session

async def override_get_current_user():
    return User(id="mock-shadow-user-id", email="shadow@stage.dev", name="Shadow User")

app.dependency_overrides[get_db] = override_get_db
app.dependency_overrides[get_current_user] = override_get_current_user

async def run_debug():
    print("Starting debug script...")
    
    # Setup
    print("Connecting and creating test records...")
    async with AsyncSessionLocal() as db:
        user_id = str(uuid.uuid4())
        user = User(
            id=user_id,
            email=f"phase4_qa_debug_{uuid.uuid4().hex[:6]}@stage.dev",
            hashed_password="$argon2id$v=19$m=65536,t=3,p=4$...",
            name="Phase 4 Shadow QA Debug User"
        )
        db.add(user)
        
        org_id = str(uuid.uuid4())
        org = Organization(
            id=org_id, 
            name="Phase 4 Org Debug", 
            slug=f"phase-4-org-debug-{uuid.uuid4().hex[:6]}"
        )
        db.add(org)
        
        project_id = str(uuid.uuid4())
        project = Project(
            id=project_id,
            org_id=org_id,
            name="Phase 4 WebComponents Project Debug",
            url="https://opinvox.stage.com"
        )
        db.add(project)
        
        session_id = str(uuid.uuid4())
        session = Session(
            id=session_id,
            project_id=project_id,
            title="Phase 4 Shadow DOM Session Debug",
            pages_visited=0
        )
        db.add(session)
        await db.commit()
        print(f"Created session: {session_id}")

    try:
        async with httpx.AsyncClient(app=app, base_url="http://test") as client:
            # 1. Create Standard DOM Marker
            print("1. Creating standard DOM marker...")
            dom_payload = {
                "session_id": session_id,
                "title": "Main DOM Element Error",
                "page_url": "https://opinvox.stage.com/index",
                "page_title": "OpinVox Home",
                "renderer_type": "dom",
                "priority": "low"
            }
            resp = await client.post("/markers/", json=dom_payload)
            print(f"Standard Marker Response Code: {resp.status_code}")
            print(f"Response: {resp.json()}")
            
            # 2. Create Shadow DOM Marker
            print("2. Creating shadow DOM marker...")
            shadow_payload = {
                "session_id": session_id,
                "title": "Visual Shift inside Custom Shadow Element",
                "page_url": "https://opinvox.stage.com/arena/3d",
                "page_title": "Arena 3D Map",
                "renderer_type": "shadow_dom",
                "priority": "critical",
                "is_inside_shadow_dom": True,
                "shadow_root_depth": 2,
                "shadow_host_tag": "user-card",
                "shadow_host_id": "profile-host",
                "shadow_host_class_list": ["flex", "w-full", "card-wrapper"],
                "shadow_path": "app-shell#root >> shadow-root >> user-card#profile-host >> shadow-root >> button#save"
            }
            resp = await client.post("/markers/", json=shadow_payload)
            print(f"Shadow Marker Response Code: {resp.status_code}")
            print(f"Response: {resp.json()}")

            # 3. Get markers grouped by page
            print("3. Getting markers grouped by page...")
            resp = await client.get(f"/markers/session/{session_id}/by-page")
            print(f"By page Response Code: {resp.status_code}")
            print(f"Response: {resp.json()}")

            # 4. Get markdown export
            print("4. Getting markdown export...")
            resp = await client.get(f"/export/session/{session_id}/markdown")
            print(f"Markdown Response Code: {resp.status_code}")
            print(f"Markdown snippet: {resp.text[:300]}")

            # 5. Get CSV export
            print("5. Getting CSV export...")
            resp = await client.get(f"/export/session/{session_id}/csv")
            print(f"CSV Response Code: {resp.status_code}")
            print(f"CSV snippet: {resp.text[:300]}")

            # 6. Get JSON export
            print("6. Getting JSON export...")
            resp = await client.get(f"/export/session/{session_id}/json")
            print(f"JSON Response Code: {resp.status_code}")
            print(f"JSON snippet: {str(resp.json())[:300]}")

    finally:
        # Cleanup
        print("Teardown: Cleaning up records...")
        async with AsyncSessionLocal() as db:
            await db.execute(delete(Marker).where(Marker.session_id == session_id))
            await db.execute(delete(PageVisit).where(PageVisit.session_id == session_id))
            await db.execute(delete(Session).where(Session.id == session_id))
            await db.execute(delete(Project).where(Project.id == project_id))
            await db.execute(delete(Organization).where(Organization.id == org_id))
            await db.execute(delete(User).where(User.id == user_id))
            await db.commit()
            print("Cleanup successful.")

if __name__ == "__main__":
    # Load env manually to use correct backend/.env
    import dotenv
    dotenv.load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"))
    asyncio.run(run_debug())
