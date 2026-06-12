from playwright.sync_api import sync_playwright
import pytest
import uuid
import time

LOCAL_FRONTEND = "http://localhost:3000"
state = {
    "email": f"e2eshare_{uuid.uuid4().hex[:6]}@test.com",
    "password": "E2eTest1234!",
    "share_url": None,
    "token": None
}

def test_full_share_link_e2e_flow():
    with sync_playwright() as p:
        # Launch browser (headless for speed/CI, set headless=False to debug)
        browser = p.chromium.launch(headless=True)
        
        # --- PHASE 1: Developer Context (Authenticated) ---
        context = browser.new_context()
        page = context.new_page()
        
        # 1. Register a new user
        print("\n[E2E] Registering a new developer account...")
        page.goto(f"{LOCAL_FRONTEND}/register")
        page.wait_for_selector('input[type="email"]')
        page.locator('input[type="text"]').first.fill("E2E Share Developer")
        page.locator('input[type="email"]').fill(state["email"])
        page.locator('input[type="password"]').fill(state["password"])
        page.get_by_role("button", name="Create Account").click()
        
        # Wait for redirect to dashboard
        page.wait_for_url("**/dashboard", timeout=20000)
        assert "/dashboard" in page.url
        print("✓ Registered and redirected to dashboard successfully!")
        
        # 2. Create a Project if none exists
        print("[E2E] Adding a test project...")
        page.get_by_role("button", name="New Project").click()
        page.fill('input[placeholder="Project Observation Name (e.g. Acme Web)"]', "E2E E-Commerce Audit")
        page.fill('input[placeholder="Target URL (e.g. https://acme.com)"]', "https://example.com")
        page.get_by_role("button", name="Create Project").click()
        
        # Wait for the project list to update with the new project
        page.wait_for_selector("text=E2E E-Commerce Audit")
        
        # Click on Open Inspection link to navigate to project details page
        page.get_by_role("link", name="Open Inspection").first.click()
        
        # Wait for project page redirect and project initialization
        page.wait_for_url("**/project/*", timeout=20000)
        project_url = page.url
        project_id = project_url.split("/")[-1]
        print(f"✓ Project initialized with ID: {project_id}")
        
        # Wait for Active Audit canvas shell to render
        page.wait_for_selector("text=Active Audit", timeout=15000)
        
        # Wait for session initialization response to finish
        print("[E2E] Waiting for session negotiation to complete...")
        try:
            page.locator("text=Negotiating Audit Session").wait_for(state="detached", timeout=20000)
        except Exception:
            pass
        time.sleep(6)  # Wait for full UI and state load
        
        # 3. Open Share Link Panel
        print("[E2E] Opening Share Link Panel...")
        share_btn = page.locator("button:has-text('Share Link')")
        share_btn.wait_for(state="visible", timeout=10000)
        share_btn.click()
        
        # Verify panel title
        page.wait_for_selector("text=Share This Audit")
        print("✓ Share Link Panel opened successfully!")
        
        # 4. Fill in Share Link details
        print("[E2E] Filling out share form...")
        page.fill('input[placeholder="e.g. Client Review - May 2026"]', "Staging Review Link")
        
        # Toggle comments off and on to verify interactive element works
        allow_comments_btn = page.locator("button:has(div.absolute)")
        allow_comments_btn.click() # Disable
        time.sleep(0.5)
        allow_comments_btn.click() # Re-enable
        
        # Set a password for security
        page.fill('input[placeholder="Set password (optional)"]', "secret123")
        
        # Select 24h expiration option
        page.click("button:has-text('24h')")
        
        # 5. Generate Link
        print("[E2E] Generating Share Link...")
        page.get_by_role("button", name="Generate Share Link").click()
        
        # Wait for the link to be created and verify it's listed
        try:
            page.wait_for_selector("text=Staging Review Link", timeout=10000)
        except Exception as e:
            print(f"\n[DIAGNOSTIC] wait_for_selector failed: {e}")
            print(f"[DIAGNOSTIC] Page URL: {page.url}")
            print(f"[DIAGNOSTIC] Body Content:\n{page.locator('body').text_content()[:1000]}")
            page.screenshot(path="failure_generate_link.png")
            raise e
        print("✓ Share Link generated and listed in panel!")
        
        # Locate the share url text
        url_element = page.locator("div.space-y-3 p.font-mono").first
        share_url = url_element.text_content()
        assert "review" in share_url or "t/" in share_url or "localhost:3000" in share_url
        state["share_url"] = share_url
        print(f"✓ Generated URL retrieved: {share_url}")
        
        # Close panel
        page.locator("button:has(svg.lucide-x)").first.click()
        
        # Close developer browser context
        context.close()
        
        # --- PHASE 2: Client Context (Unauthenticated / Public Review) ---
        print("\n[E2E] Testing Client Context (Unauthenticated)...")
        client_context = browser.new_context()
        client_page = client_context.new_page()
        
        # Go to the generated share link
        client_page.goto(share_url)
        
        # 1. Verify password protection page loads and blocks access
        print("[E2E] Verifying password protection prompt...")
        client_page.wait_for_selector("text=Secure Audit")
        assert "Enter password" in client_page.content()
        
        # Try entering correct password
        client_page.fill('input[type="password"]', "secret123")
        client_page.get_by_role("button", name="Access Audit").click()
        
        # Wait for public review session entry and minimal layout rendering
        client_page.wait_for_selector("text=Public Review", timeout=20000)
        assert "Powered by" in client_page.content()
        print("✓ Successfully authenticated with password and loaded public review surface!")
        
        # 2. Check that normal navigation bar/auth buttons are hidden
        assert not client_page.locator("text=Command Center").is_visible()
        assert not client_page.locator("text=Aesthetics Controller").is_visible()
        print("✓ Verified normal developer tools are hidden in client mode.")
        
        client_context.close()
        
        # --- PHASE 3: Revocation Check ---
        print("\n[E2E] Testing Revocation...")
        dev_context = browser.new_context()
        # Login again to delete
        dev_page = dev_context.new_page()
        dev_page.goto(f"{LOCAL_FRONTEND}/login")
        dev_page.fill('input[type="email"]', state["email"])
        dev_page.fill('input[type="password"]', state["password"])
        dev_page.get_by_role("button", name="Sign in").click()
        
        dev_page.wait_for_url("**/dashboard", timeout=15000)
        dev_page.goto(project_url)
        dev_page.wait_for_selector("text=Active Audit")
        
        # Wait for session initialization response to finish
        print("[E2E] Waiting for session negotiation on re-entry...")
        try:
            dev_page.locator("text=Negotiating Audit Session").wait_for(state="detached", timeout=20000)
        except Exception:
            pass
        time.sleep(6)  # Wait for state to sync
        
        # Open panel
        dev_page.locator("button:has-text('Share Link')").click()
        dev_page.wait_for_selector("text=Share This Audit")
        
        # Revoke the link
        dev_page.wait_for_selector("text=Staging Review Link", timeout=15000)
        print("[E2E] Deactivating the share link...")
        trash_btn = dev_page.locator("button:has(svg.lucide-trash-2)").first
        trash_btn.click()
        
        # Wait for it to disappear from the list
        dev_page.wait_for_selector("text=No active links", timeout=10000)
        print("✓ Share link revoked successfully and deleted from listed items!")
        
        # Open in clean client window and check for 404/410 Access Denied
        print("[E2E] Navigating to revoked URL...")
        revoked_context = browser.new_context()
        revoked_page = revoked_context.new_page()
        revoked_page.goto(share_url)
        
        revoked_page.wait_for_selector("text=Access Denied", timeout=10000)
        assert "expired" in revoked_page.content().lower() or "revoked" in revoked_page.content().lower() or "not found" in revoked_page.content().lower()
        print("✓ Verified that revoked link returns Access Denied!")
        
        revoked_context.close()
        dev_context.close()
        browser.close()
        print("\n✓ E2E Frontend Share Link Flow Passed Perfectly!")

if __name__ == "__main__":
    test_full_share_link_e2e_flow()
