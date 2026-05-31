from playwright.sync_api import sync_playwright
import pytest
import uuid
import time

VERCEL_URL = "https://web-zeta-sable-82.vercel.app"
state = {
    "email": f"e2e_{uuid.uuid4().hex[:6]}@test.com",
    "password": "E2eTest1234!"
}

def test_login_page_renders():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto(f"{VERCEL_URL}/login")
        assert "PixelMark" in page.title() or "Sign in" in page.content()
        # Look for inputs by type
        assert page.locator('input[type="email"]').is_visible()
        assert page.locator('input[type="password"]').is_visible()
        browser.close()
        print("\nLogin Page Renders: PASS")

def test_register_page_renders():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto(f"{VERCEL_URL}/register")
        assert page.locator('input[type="email"]').is_visible()
        assert page.locator('input[type="password"]').is_visible()
        browser.close()
        print("Register Page Renders: PASS")

def test_register_flow():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto(f"{VERCEL_URL}/register")
        
        # Fill registration form using type selectors
        page.locator('input[type="text"]').first.fill("E2E Tester")
        page.locator('input[type="email"]').fill(state["email"])
        page.locator('input[type="password"]').fill(state["password"])
        
        # Click Create Account
        page.get_by_role("button", name="Create Account").click()
        
        # Should redirect to dashboard
        try:
            page.wait_for_url("**/dashboard", timeout=20000)
            assert "/dashboard" in page.url
            print(f"Register Flow: PASS (Email: {state['email']})")
        except Exception as e:
            page.screenshot(path="failure_register_flow.png")
            raise e
        finally:
            browser.close()

def test_login_flow():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto(f"{VERCEL_URL}/login")
        
        page.locator('input[type="email"]').fill(state["email"])
        page.locator('input[type="password"]').fill(state["password"])
        page.get_by_role("button", name="Sign in").click()
        
        try:
            page.wait_for_url("**/dashboard", timeout=15000)
            assert "/dashboard" in page.url
            print("Login Flow: PASS")
        except Exception as e:
            page.screenshot(path="failure_login_flow.png")
            raise e
        finally:
            browser.close()

def test_protected_route_redirect():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        # Navigate to dashboard without login
        page.goto(f"{VERCEL_URL}/dashboard")
        # Should redirect to login
        page.wait_for_url("**/login", timeout=10000)
        assert "/login" in page.url
        browser.close()
        print("Protected Route Redirect: PASS")
