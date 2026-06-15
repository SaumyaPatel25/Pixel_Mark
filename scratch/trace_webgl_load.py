import asyncio
from playwright.async_api import async_playwright
import time

async def main():
    print("🚀 Running WebGL tracing script against production proxy...")
    async with async_playwright() as p:
        # Launch browser
        browser = await p.chromium.launch(headless=True, args=["--no-sandbox", "--disable-setuid-sandbox"])
        context = await browser.new_context(viewport={"width": 1440, "height": 900})
        page = await context.new_page()
        
        # Track requests and console messages
        requests = []
        page.on("request", lambda r: requests.append(r))
        
        console_logs = []
        page.on("console", lambda msg: console_logs.append(f"[{msg.type}] {msg.text}"))
        
        # Navigate directly to the login and register first, then go to the project page
        # Or wait, we can navigate directly to the proxy session page of webrox.xyz!
        # Let's find a valid session ID for webrox.xyz.
        # Wait, from our database check, we have a project 'Webrox WebGL Test Project'
        # Let's query the database to get a valid session ID for this project!
        import sys
        import os
        sys.path.append(os.path.join(os.path.dirname(os.path.dirname(__file__)), "backend"))
        from database import DATABASE_URL
        from sqlalchemy.ext.asyncio import create_async_engine
        from sqlalchemy import text
        
        session_id = None
        engine = create_async_engine(DATABASE_URL)
        async with engine.connect() as conn:
            res = await conn.execute(
                text("SELECT s.id FROM sessions s JOIN projects p ON s.project_id = p.id WHERE p.url LIKE '%webrox.xyz%' ORDER BY s.created_at DESC LIMIT 1")
            )
            row = res.fetchone()
            if row:
                session_id = row[0]
                
        await engine.dispose()
        
        if not session_id:
            print("❌ No session found for webrox.xyz. Exiting.")
            await browser.close()
            return
            
        proxy_url = f"https://pixelmark-production.up.railway.app/proxy/session/{session_id}"
        print(f"🔗 Direct proxy URL: {proxy_url}")
        
        # Navigate to proxy URL
        await page.goto(proxy_url)
        print("⏳ Waiting 15 seconds for assets to load...")
        await asyncio.sleep(15)
        
        # Save screenshot
        await page.screenshot(path="scratch/trace_webgl_loaded.png")
        print("📸 Saved scratch/trace_webgl_loaded.png")
        
        # Print all requests that failed
        print("\n❌ FAILED NETWORK REQUESTS:")
        print("="*60)
        failed_count = 0
        for req in requests:
            resp = await req.response()
            if resp and resp.status >= 400:
                print(f"URL: {req.url} | Status: {resp.status} | Method: {req.method}")
                failed_count += 1
        if failed_count == 0:
            print("No failed requests detected.")
        print("="*60)
        
        # Print all console logs
        print("\n🖥️ BROWSER CONSOLE LOGS:")
        print("="*60)
        for log in console_logs:
            print(log)
        print("="*60)
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
