import asyncio
import os
import sys
import uuid
import urllib.parse
from playwright.async_api import async_playwright

# Setup path to import backend modules
sys.path.append(os.path.join(os.path.dirname(os.path.dirname(__file__)), "backend"))

from database import AsyncSessionLocal
from models import User, Organization, Project, Session, SubscriptionModel
from sqlalchemy import select, delete

TARGETS = [
    {"name": "Webrox Reference", "url": "https://webrox.xyz"},
    {"name": "ThreeJS FBX Loader", "url": "https://threejs.org/examples/webgl_loader_fbx.html"},
    {"name": "ThreeJS GLTF Loader", "url": "https://threejs.org/examples/webgl_loader_gltf.html"},
    {"name": "ThreeJS Texture KTX2", "url": "https://threejs.org/examples/webgl_loader_texture_ktx2.html"}
]

async def seed_data():
    print("[SEED] Seeding test projects and sessions...")
    sessions = {}
    async with AsyncSessionLocal() as db:
        # Create test user if not exists
        user_res = await db.execute(select(User).where(User.email == "diagnostic_test@stage.dev"))
        user = user_res.scalar_one_or_none()
        if not user:
            user = User(
                id=str(uuid.uuid4()),
                email="diagnostic_test@stage.dev",
                hashed_password="mock_password_hash",
                name="Diagnostic Auditor"
            )
            db.add(user)
            await db.flush()

        # Create organization
        org_res = await db.execute(select(Organization).where(Organization.name == "Diagnostic Org"))
        org = org_res.scalar_one_or_none()
        if not org:
            org = Organization(
                id=str(uuid.uuid4()),
                name="Diagnostic Org",
                slug="diagnostic-org"
            )
            db.add(org)
            await db.flush()

            # Seed paid subscription to allow all features
            sub = SubscriptionModel(
                id=str(uuid.uuid4()),
                org_id=org.id,
                plan_type="dev_team",
                status="active",
                seats_allowed=5,
                projects_allowed=10
            )
            db.add(sub)
            await db.flush()

        # Create projects & sessions
        for t in TARGETS:
            proj_res = await db.execute(select(Project).where(Project.url == t["url"]))
            proj = proj_res.scalar_one_or_none()
            if not proj:
                proj = Project(
                    id=str(uuid.uuid4()),
                    org_id=org.id,
                    name=t["name"],
                    url=t["url"]
                )
                db.add(proj)
                await db.flush()

            # Always create a new session to be fresh
            sess = Session(
                id=str(uuid.uuid4()),
                project_id=proj.id,
                title=f"Diagnostic Session - {t['name']}"
            )
            db.add(sess)
            await db.flush()
            sessions[t["name"]] = sess.id

        await db.commit()
    print("Seeding complete.")
    return sessions

async def run_diagnostics(sessions):
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, args=["--no-sandbox", "--disable-setuid-sandbox"])
        
        for name, session_id in sessions.items():
            print(f"\n========================================\nDIAGNOSING: {name}\n========================================")
            context = await browser.new_context(viewport={"width": 1440, "height": 900})
            page = await context.new_page()
            
            requests = []
            console_logs = []
            
            # Listen to request/response
            page.on("request", lambda r: requests.append(r))
            page.on("console", lambda msg: console_logs.append(f"[{msg.type}] {msg.text}"))
            
            proxy_url = f"http://localhost:8765/proxy/session/{session_id}"
            print(f"Navigating to proxied session URL: {proxy_url}")
            
            try:
                await page.goto(proxy_url, wait_until="load", timeout=20000)
                # Wait 8 seconds to allow runtime JS/WebGL requests to execute
                await asyncio.sleep(8)
            except Exception as e:
                print(f"Page load timed out or failed: {str(e)}")
            
            # Analyze requests for models/textures/binaries/wasm/workers
            asset_extensions = (".fbx", ".glb", ".gltf", ".bin", ".wasm", ".jpg", ".png", ".webp", ".js")
            
            print("\n--- ASSET REQUEST ANALYSIS ---")
            for req in requests:
                parsed_url = urllib.parse.urlparse(req.url)
                path = parsed_url.path.lower()
                
                # Check if it matches asset extension or is XHR/fetch
                is_asset = any(path.endswith(ext) for ext in asset_extensions) or "xhr" in req.resource_type or "fetch" in req.resource_type or "worker" in req.resource_type
                if not is_asset:
                    continue
                    
                resp = await req.response()
                status_code = resp.status if resp else "NO_RESPONSE"
                headers = dict(resp.headers) if resp else {}
                content_type = headers.get("content-type", "N/A")
                cors_header = headers.get("access-control-allow-origin", "N/A")
                content_len = headers.get("content-length", "N/A")
                
                # Determine if URL is proxied or original origin
                is_proxied = "/proxy/session/" in req.url
                
                # Print details
                print(f"URL: {req.url}")
                print(f"  Proxied: {is_proxied} | Type: {req.resource_type} | Status: {status_code}")
                print(f"  Content-Type: {content_type} | CORS Allow Origin: {cors_header} | Content-Length: {content_len}")
            
            print("\n--- CONSOLE ERRORS ---")
            errors_found = False
            for log in console_logs:
                if "[error]" in log.lower() or "failed to load" in log.lower() or "cors" in log.lower() or "exception" in log.lower():
                    print(log)
                    errors_found = True
            if not errors_found:
                print("No critical console errors detected.")
                
            await context.close()
            
        await browser.close()

async def main():
    sessions = await seed_data()
    await run_diagnostics(sessions)

if __name__ == "__main__":
    asyncio.run(main())
