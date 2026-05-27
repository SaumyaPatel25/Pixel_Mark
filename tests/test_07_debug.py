from playwright.sync_api import sync_playwright
import pytest
import uuid
import time

VERCEL_URL = "https://web-zeta-sable-82.vercel.app"
state = {
    "email": f"e2e_{uuid.uuid4().hex[:6]}@test.com",
    "password": "E2eTest1234!"
}

def on_console(msg):
    print(f"CONSOLE: {msg.type}: {msg.text}")

def on_request_failed(request):
    print(f"REQUEST FAILED: {request.method} {request.url} - {request.failure.error_text}")

def test_register_flow_debug():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        # Capture logs
        page.on("console", on_console)
        page.on("requestfailed", on_request_failed)
        
        page.goto(f"{VERCEL_URL}/register")
        
        print(f"\nRegistering with {state['email']}...")
        page.locator('input[type="text"]').first.fill("E2E Tester")
        page.locator('input[type="email"]').fill(state["email"])
        page.locator('input[type="password"]').fill(state["password"])
        
        # Click button and wait for response
        page.get_by_role("button", name="Create Account").click()
        
        # Wait to see what happens
        time.sleep(10)
        
        print(f"Current URL: {page.url}")
        page.screenshot(path="debug_register_flow.png")
        
        browser.close()

def test_login_page_source():
    # Just to verify where it redirects
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto(VERCEL_URL)
        # Check links
        links = page.locator("a").all_inner_texts()
        print(f"Links on home: {links}")
        browser.close()
