import asyncio
from playwright.async_api import async_playwright
import sys

async def main():
    print("🚀 Loading https://webrox.xyz directly...", flush=True)
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, args=["--no-sandbox", "--disable-setuid-sandbox"])
        context = await browser.new_context(viewport={"width": 1440, "height": 900})
        page = await context.new_page()
        
        requests = []
        page.on("request", lambda r: requests.append(r))
        
        console_logs = []
        page.on("console", lambda msg: console_logs.append(f"[{msg.type}] {msg.text}"))
        
        print("🔗 Navigating to https://webrox.xyz...", flush=True)
        try:
            await page.goto("https://webrox.xyz", wait_until="commit", timeout=15000)
            print("✅ Navigation committed. Waiting 10 seconds...", flush=True)
        except Exception as e:
            print(f"⚠️ Navigation warning: {e}", flush=True)
            
        await asyncio.sleep(10)
        
        await page.screenshot(path="scratch/direct_webrox.png")
        print("📸 Saved scratch/direct_webrox.png", flush=True)
        
        print("\n❌ DIRECT FAILED REQUESTS:", flush=True)
        print("="*60, flush=True)
        failed = 0
        for req in requests:
            try:
                resp = await req.response()
                if resp and resp.status >= 400:
                    print(f"URL: {req.url} | Status: {resp.status}", flush=True)
                    failed += 1
            except Exception:
                pass
        if failed == 0:
            print("No failed requests.", flush=True)
        print("="*60, flush=True)
        
        print("\n🖥️ DIRECT CONSOLE LOGS:", flush=True)
        print("="*60, flush=True)
        for log in console_logs:
            print(log, flush=True)
        print("="*60, flush=True)
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
