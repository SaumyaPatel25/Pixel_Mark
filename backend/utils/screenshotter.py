import os
import asyncio
from playwright.async_api import async_playwright
import logging
from utils.ssrf_guard import is_ssrf_safe, is_domain_allowed
import base64

logger = logging.getLogger(__name__)

async def take_screenshot(target_url: str, base_url: str) -> str:
    """
    Takes a screenshot using Playwright of the target URL.
    Enforces SSRF and domain safety.
    Returns the screenshot data as a base64 encoded png Data URL.
    """
    if not is_ssrf_safe(target_url):
        logger.warning(f"Playwright screenshot blocked due to SSRF risk: {target_url}")
        return ""
        
    if not is_domain_allowed(target_url, base_url, allow_external_assets=False):
        logger.warning(f"Playwright screenshot blocked due to out-of-scope domain: {target_url} (Base: {base_url})")
        return ""

    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page(viewport={"width": 1280, "height": 800})
            
            await page.goto(target_url, wait_until="networkidle", timeout=10000)
            
            screenshot_bytes = await page.screenshot(type="png", full_page=False)
            b64_string = base64.b64encode(screenshot_bytes).decode('utf-8')
            
            await browser.close()
            
            return f"data:image/png;base64,{b64_string}"
    except Exception as e:
        logger.error(f"Playwright screenshot failed for {target_url}: {str(e)}")
        return ""
