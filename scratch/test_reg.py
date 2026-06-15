import os
import time
from playwright.sync_api import sync_playwright

def test_register():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()
        
        # Track console messages
        page.on("console", lambda msg: print(f"[Console {msg.type}] {msg.text}"))
        
        # Track response errors
        def handle_response(res):
            if res.status >= 400:
                print(f"[Response Error] {res.url} -> {res.status}")
        page.on("response", handle_response)
        
        email = f"test_{int(time.time())}@pixelmark.com"
        print(f"Attempting to register with email: {email}")
        
        try:
            page.goto("http://localhost:3000/register")
            page.wait_for_load_state("networkidle")
            
            page.fill('input[placeholder="Pro Bro"]', "Test User")
            page.fill('input[placeholder="name@company.com"]', email)
            page.fill('input[placeholder="••••••••"]', "password123")
            
            page.screenshot(path="C:/Users/saumy/OneDrive/Desktop/Entrext/screenshots/reg_before_click.png")
            print("Before click screenshot saved.")
            
            # Click register
            page.click('button[type="submit"]')
            print("Submit button clicked, waiting for redirect...")
            
            page.wait_for_url("**/dashboard", timeout=15000)
            print("Successfully registered and redirected!")
            page.screenshot(path="C:/Users/saumy/OneDrive/Desktop/Entrext/screenshots/reg_success.png")
        except Exception as e:
            print(f"Error occurred: {str(e)}")
            page.screenshot(path="C:/Users/saumy/OneDrive/Desktop/Entrext/screenshots/reg_error.png")
            print("Error screenshot saved.")
        finally:
            browser.close()

if __name__ == "__main__":
    test_register()
