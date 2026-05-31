from playwright.sync_api import sync_playwright
import pytest
import uuid
import time

LOCAL_FRONTEND = "http://localhost:3000"
state = {
    "email": f"e2emarker_{uuid.uuid4().hex[:6]}@test.com",
    "password": "E2eTest1234!"
}

def test_marker_capture_and_fallback_e2e():
    with sync_playwright() as p:
        # Launch browser
        browser = p.chromium.launch(headless=True)
        
        # --- PHASE 1: Authenticated Developer Session ---
        context = browser.new_context()
        page = context.new_page()
        
        # 1. Register a new developer account
        print("\n[E2E] Registering a developer account...")
        page.goto(f"{LOCAL_FRONTEND}/register")
        page.wait_for_selector('input[type="email"]')
        page.locator('input[type="text"]').first.fill("E2E Marker Developer")
        page.locator('input[type="email"]').fill(state["email"])
        page.locator('input[type="password"]').fill(state["password"])
        page.get_by_role("button", name="Create Account").click()
        
        # Wait for redirect to dashboard
        page.wait_for_url("**/dashboard", timeout=20000)
        assert "/dashboard" in page.url
        print("✓ Registered and logged in successfully!")
        
        # 2. Add test project
        print("[E2E] Creating a new project...")
        page.get_by_role("button", name="New Project").click()
        page.fill('input[placeholder="Project Observation Name (e.g. Acme Web)"]', "E2E Marker Verification Proj")
        page.fill('input[placeholder="Target URL (e.g. https://acme.com)"]', "https://example.com")
        page.get_by_role("button", name="Create Project").click()
        
        # Wait for the project list to update with the new project
        page.wait_for_selector("text=E2E Marker Verification Proj")
        
        # Click on Open Inspection link to navigate to project details page
        page.get_by_role("link", name="Open Inspection").first.click()
        
        # Wait for project page redirect
        page.wait_for_url("**/project/*", timeout=20000)
        project_url = page.url
        project_id = project_url.split("/")[-1]
        print(f"✓ Project details page loaded with ID: {project_id}")
        
        # Wait for Active Audit header to render
        page.wait_for_selector("text=Active Audit", timeout=15000)
        
        # Wait for the proxy iframe or visual substrate wrapper to appear
        page.wait_for_selector("iframe", timeout=15000)
        print("✓ Substrate proxy iframe resolved.")

        # 3. Verify Marker UI Controls are rendered (Marker Mode Switch, Leave Feedback Button)
        print("[E2E] Verifying UI Controls...")
        # Check "Leave Feedback" button
        feedback_btn = page.locator("#leave-feedback-btn")
        assert feedback_btn.is_visible()
        
        # Check "Alt+Click" toggle label
        alt_click_lbl = page.locator('label[for="marker-mode-switch"]')
        assert alt_click_lbl.is_visible()
        print("✓ Toggle and buttons are present.")

        # 4. Trigger manual feedback placement flow
        print("[E2E] Clicking 'Leave Feedback' to activate manual drop mode...")
        feedback_btn.click()
        
        # Wait for transparent manual placement overlay to appear over the canvas
        page.wait_for_selector("text=Click to Point at a Problem", timeout=8000)
        print("✓ Manual placement overlay banner appeared.")

        # 5. Drop a manual feedback pin on the overlay
        print("[E2E] Dropping manual feedback pin at center...")
        # Let's locate the overlay and click it
        overlay = page.locator("text=Click to Point at a Problem")
        overlay.click()

        # 6. Verify that the Sliding Details Note Drawer has opened
        print("[E2E] Verifying Sliding Details Note Drawer opened...")
        page.wait_for_selector("text=Manual pin drop", timeout=8000)
        assert page.locator("text=Pin Coordinates").is_visible()
        print("✓ Details Note Drawer is visible.")

        # 7. Fill out the note details and submit
        print("[E2E] Filling manual feedback details...")
        note_textarea = page.locator('textarea[placeholder*="What\'s wrong here"]')
        note_textarea.fill("E2E manual comment drop text - brand logo misaligned on header")
        
        # Select high priority (low, medium, high, critical)
        page.get_by_role("button", name="high", exact=True).click()
        
        # Submit the feedback
        print("[E2E] Placing the Pin...")
        page.get_by_role("button", name="Submit Feedback").click()
        
        # Wait for success notification or drawer closure
        page.wait_for_selector("text=Feedback Pinned!", timeout=8000)
        print("✓ Pin successfully placed and recorded!")

        # Close browser safely
        browser.close()
        print("\n✓ E2E Visual Pin-Dropping & Manual Fallback Tests Passed!")

