import os
import time
from playwright.sync_api import sync_playwright

def run_tests():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        page.goto("https://tailwindcss.com/")
        time.sleep(3)
        html = page.content()
        with open("dump.html", "w", encoding="utf-8") as f:
            f.write(html)
        
        # Take a screenshot too
        page.screenshot(path="screenshot.png")
        browser.close()

if __name__ == "__main__":
    run_tests()
