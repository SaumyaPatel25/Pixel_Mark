import sys
import os
import time
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

SCREENSHOTS_DIR = Path("C:/Users/saumy/.gemini/antigravity/brain/b6ce7eda-ced7-4bca-9074-62df5044770f")
SCREENSHOTS_DIR.mkdir(parents=True, exist_ok=True)

def run_test():
    print("🚀 Starting WebGL Visual E2E Test Sequence via Playwright", flush=True)
    base_url = os.environ.get("BASE_URL", "http://localhost:3000").rstrip("/")
    print(f"🌍 Using Base URL: {base_url}", flush=True)
    
    with sync_playwright() as p:
        # Launch Chromium headfully or headlessly
        # Using headless mode but simulating typical screen size
        browser = p.chromium.launch(headless=True, args=["--no-sandbox", "--disable-setuid-sandbox"])
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()
        
        # Enable console log forwarding
        page.on("console", lambda msg: print(f"🖥️ [Browser Console] {msg.type}: {msg.text}", flush=True))
        
        # 1. Navigate to landing page / register
        print(f"🔗 Navigating to {base_url}/register...", flush=True)
        page.goto(f"{base_url}/register")
        time.sleep(2)
        page.screenshot(path=str(SCREENSHOTS_DIR / "01_register_page.png"))
        print("📸 Saved 01_register_page.png", flush=True)
        
        # Fill register form
        email_addr = f"webgl_test_auditor_{int(time.time())}@stage.dev"
        try:
            print(f"✍️ Filling out registration form for {email_addr}...", flush=True)
            page.fill("input[placeholder='Pro Bro']", "WebGL Auditor")
            page.fill("input[type='email']", email_addr)
            page.fill("input[type='password']", "Password123!")
            page.click("button[type='submit']")
            
            # Wait for navigation to dashboard
            print("⏳ Waiting for redirection to dashboard...", flush=True)
            page.wait_for_url("**/dashboard", timeout=15000)
        except Exception as e:
            print(f"⚠️ Registration or redirect failed: {e}", flush=True)
            page.screenshot(path=str(SCREENSHOTS_DIR / "01_error_state.png"))
            
            # Fallback to login
            if "dashboard" not in page.url:
                print("Trying fallback login...", flush=True)
                page.goto(f"{base_url}/login")
                time.sleep(2)
                page.fill("input[type='email']", email_addr)
                page.fill("input[type='password']", "Password123!")
                page.click("button[type='submit']")
                try:
                    page.wait_for_url("**/dashboard", timeout=10000)
                except Exception as ex:
                    print(f"⚠️ Login redirect failed: {ex}", flush=True)
            
        # Verify dashboard
        print(f"📍 Current URL after login/register: {page.url}", flush=True)
        if "dashboard" not in page.url:
            page.screenshot(path=str(SCREENSHOTS_DIR / "01_final_failure.png"))
            print(f"📄 Final page text: {page.inner_text('body')[:500]}", flush=True)
        assert "dashboard" in page.url, f"❌ Failed to reach dashboard. URL is {page.url}"
        page.screenshot(path=str(SCREENSHOTS_DIR / "02_dashboard.png"))
        print("📸 Saved 02_dashboard.png", flush=True)
        
        # 3. Create project or select existing
        project_name = "Webrox WebGL Test Project"
        target_url = "https://webrox.xyz"
        
        # Check if project card already exists
        project_card = page.locator(f"text={project_name}")
        if project_card.count() > 0:
            print(f"👉 Project '{project_name}' already exists. Clicking card...", flush=True)
            project_card.first.click()
        else:
            print(f"➕ Creating new project '{project_name}'...", flush=True)
            page.click("text=New Project")
            time.sleep(1)
            page.fill("input[placeholder='Project Observation Name (e.g. Acme Web)']", project_name)
            page.fill("input[placeholder='Target URL (e.g. https://acme.com)']", target_url)
            page.screenshot(path=str(SCREENSHOTS_DIR / "02b_new_project_dialog.png"))
            page.click("button[type='submit']")
            time.sleep(3)
            # Click the newly created project card
            page.click(f"text={project_name}")
            
        time.sleep(3)
        print(f"📍 Current URL after project select: {page.url}", flush=True)
        page.screenshot(path=str(SCREENSHOTS_DIR / "03_project_page_loaded.png"))
        print("📸 Saved 03_project_page_loaded.png", flush=True)
        
        # Wait for the iframe or session container to resolve
        print("⏳ Waiting for proxy session iframe to initialize...", flush=True)
        page.wait_for_selector("iframe[title='Proxied review site']", timeout=30000)
        
        # Give some time for the page inside the iframe to load (webgl website is heavy)
        print("⏳ Waiting 15 seconds for heavy WebGL site (https://webrox.xyz) to load inside proxy...", flush=True)
        time.sleep(15)
        page.screenshot(path=str(SCREENSHOTS_DIR / "04_webgl_session_rendering.png"))
        print("📸 Saved 04_webgl_session_rendering.png", flush=True)
        
        # 6. Verify visual presence of WebGL mode indicator badge and FPS counter
        print("🔍 Verifying WebGL mode label and FPS stats...", flush=True)
        renderer_badge = page.locator("text=WebGL / Canvas Mode")
        fps_badge = page.locator("text=FPS")
        
        has_webgl_badge = renderer_badge.count() > 0
        has_fps = fps_badge.count() > 0
        
        print(f"ℹ️ WebGL Badge found: {has_webgl_badge}", flush=True)
        print(f"ℹ️ FPS Indicator found: {has_fps}", flush=True)
        
        # 7. Drop a feedback pin using manual placement overlay
        print("🎯 Activating Visual Feedback Mode...", flush=True)
        page.click("#leave-feedback-btn")
        time.sleep(1)
        page.screenshot(path=str(SCREENSHOTS_DIR / "05_feedback_overlay_active.png"))
        print("📸 Saved 05_feedback_overlay_active.png", flush=True)
        
        # Click on the manual overlay to drop a pin.
        # The manual overlay is the div with aria-label="Click anywhere to place a feedback pin"
        print("📍 Dropping visual pin on overlay...", flush=True)
        overlay = page.locator("div[aria-label='Click anywhere to place a feedback pin']")
        # Click near the center of the overlay
        box = overlay.bounding_box()
        if box:
            page.mouse.click(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2)
        else:
            page.click("div[aria-label='Click anywhere to place a feedback pin']")
            
        time.sleep(2)
        page.screenshot(path=str(SCREENSHOTS_DIR / "06_feedback_drawer_open.png"))
        print("📸 Saved 06_feedback_drawer_open.png", flush=True)
        
        # 8. Check drawer elements and submit feedback
        print("✍️ Filling in feedback drawer...", flush=True)
        # Select "Canvas / 3D" issue type button
        page.click("button:has-text('Canvas / 3D')")
        # Click High severity
        page.click("button:has-text('high')")
        # Enter note text
        page.fill("textarea[placeholder*='What\\'s wrong here?']", "Playwright WebGL e2e visual check - Torus mesh looks correct.")
        
        page.screenshot(path=str(SCREENSHOTS_DIR / "07_feedback_drawer_filled.png"))
        print("📸 Saved 07_feedback_drawer_filled.png", flush=True)
        
        # Submit feedback
        print("📤 Submitting feedback pin...", flush=True)
        page.click("button[type='submit']")
        time.sleep(3)
        page.screenshot(path=str(SCREENSHOTS_DIR / "08_feedback_submitted.png"))
        print("📸 Saved 08_feedback_submitted.png", flush=True)
        
        # Verify success toast / banner
        success_toast = page.locator("text=Feedback Pinned!")
        has_success = success_toast.count() > 0
        print(f"ℹ️ Feedback Pinned Success Toast visible: {has_success}", flush=True)
        
        # 10. Test "Capture Frame" action
        print("📸 Testing 'Capture Frame' fallback button...", flush=True)
        capture_btn = page.locator("#capture-frame-btn")
        if capture_btn.count() > 0:
            capture_btn.click()
            time.sleep(2)
            page.screenshot(path=str(SCREENSHOTS_DIR / "09_capture_frame_triggered.png"))
            print("📸 Saved 09_capture_frame_triggered.png", flush=True)
        else:
            print("⚠️ Capture Frame button not found or hidden.", flush=True)
            
        print("✨ E2E Playwright test sequence complete!", flush=True)
        
        browser.close()

if __name__ == "__main__":
    run_test()
