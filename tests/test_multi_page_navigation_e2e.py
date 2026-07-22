from playwright.sync_api import sync_playwright
import pytest
import uuid
import time

LOCAL_FRONTEND = "http://localhost:3000"
state = {
    "email": f"e2enav_{uuid.uuid4().hex[:6]}@test.com",
    "password": "E2eTest1234!"
}

def test_multi_page_proxy_navigation_e2e():
    with sync_playwright() as p:
        print("\n[E2E] Starting multi-page navigation E2E test suite...")
        
        # Launch browser
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()
        
        # 1. Register a developer account
        print("[E2E] Registering a developer account...")
        page.goto(f"{LOCAL_FRONTEND}/register")
        page.wait_for_selector('input[type="email"]')
        page.locator('input[type="text"]').first.fill("E2E Nav Tester")
        page.fill('input[type="email"]', state["email"])
        page.fill('input[type="password"]', state["password"])
        page.get_by_role("button", name="Create Account").click()
        
        # Wait for redirect to dashboard
        page.wait_for_url("**/dashboard", timeout=25000)
        assert "/dashboard" in page.url
        print("[OK] Registered and logged in successfully!")
        
        # 2. Create a test project pointing to our mock sample target or a simple multi-page public sandbox
        print("[E2E] Creating a new multi-page audit project...")
        page.get_by_role("button", name="New Project").click()
        page.fill('input[placeholder="Project Observation Name (e.g. Acme Web)"]', "E2E Navigation Audit Proj")
        
        # Use our built-in next.js sample target or example.com (which has subpages/nav links)
        # Note: STAGE includes a sample-target page! Let's check if we can inspect a subpath
        page.fill('input[placeholder="Target URL (e.g. https://acme.com)"]', "https://example.com")
        page.get_by_role("button", name="Create Project").click()
        
        # Wait for the project list to update
        page.wait_for_selector("text=E2E Navigation Audit Proj")
        
        # Click on Open Inspection link
        page.get_by_role("link", name="Open Inspection").first.click()
        
        # Wait for project page redirect
        page.wait_for_url("**/project/*", timeout=20000)
        print("[OK] Inspection page loaded successfully.")
        
        # Wait for iframe to mount
        page.wait_for_selector("iframe", timeout=20000)
        print("[OK] Substrate iframe found.")
        
        # 3. Verify that the PageTabBar component is rendered
        print("[E2E] Verifying PageTabBar component is present...")
        # PageTabBar displays "Visited: 1 pages" as initial state
        page.wait_for_selector("text=Visited:", timeout=15000)
        print("[OK] Premium PageTabBar verified (initial page synced).")
        
        # 4. Simulate a page load transition
        # We can trigger a manual pushState/navigation to verify contract bridge or test tab additions
        # Let's post a simulated STAGE_NAV or STAGE_PAGE_LOAD message directly to the page window
        # to replicate in-iframe SPA transitions safely in headless mode.
        print("[E2E] Simulating dynamic multi-page transitions...")
        
        page.evaluate("""() => {
            window.postMessage({
                type: 'STAGE_NAV',
                page_url: 'https://example.com/about',
                page_title: 'About Us',
                session_id: window.location.pathname.split('/').pop(),
                referrer_url: 'https://example.com'
            }, '*');
        }""")
        
        # Wait for the tab bar to update with the new tab and "Visited: 2 pages"
        page.wait_for_selector("text=Visited: 2 pages", timeout=15000)
        print("[OK] First navigation detected! Second tab added successfully.")
        
        # Verify the title tab exists
        assert page.locator("text=About Us").is_visible()
        print("[OK] Tab label 'About Us' rendered beautifully.")
        
        # 5. Simulate third page transition
        page.evaluate("""() => {
            window.postMessage({
                type: 'STAGE_NAV',
                page_url: 'https://example.com/contact',
                page_title: 'Contact Support',
                session_id: window.location.pathname.split('/').pop(),
                referrer_url: 'https://example.com/about'
            }, '*');
        }""")
        
        page.wait_for_selector("text=Visited: 3 pages", timeout=15000)
        print("[OK] Second navigation detected! Third tab added successfully.")
        assert page.locator("text=Contact Support").is_visible()
        
        # 6. Click on the first tab ("/") or click on the "About Us" tab to navigate back
        print("[E2E] Clicking a visited tab to navigate back...")
        about_tab = page.locator("text=About Us")
        about_tab.click()
        
        # Wait for loading indicator
        page.wait_for_selector("text=Loading page…", timeout=8000)
        print("[OK] Navigation triggered via tab click successfully (Loading overlay shown)!")
        
        # Close browser
        browser.close()
        print("\n[SUCCESS] E2E Multi-Page Navigation Traversal Tests Passed!")
