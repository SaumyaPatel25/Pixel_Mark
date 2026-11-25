import logging
import asyncio
from typing import Optional, Tuple
from utils.ssrf_guard import is_ssrf_safe
from proxy.proxy_rotator import proxy_pool, is_captcha_or_bot_gate

logger = logging.getLogger("stage.proxy.playwright")

async def fetch_with_playwright_fallback(url: str, timeout_ms: int = 15000) -> Tuple[Optional[str], Optional[int], str]:
    """
    Fallback fetcher using Headless Chromium via Playwright.
    Bypasses JavaScript challenges / basic WAF bot blocks for target documents.
    Returns (html_content, status_code, content_type).
    Returns (None, None, "") if fetching fails or Playwright is unavailable.
    """
    if not is_ssrf_safe(url):
        logger.warning(f"[PLAYWRIGHT FALLBACK] Blocked SSRF unsafe URL: {url}")
        return None, 403, "text/html"

    try:
        from playwright.async_api import async_playwright
    except ImportError:
        logger.warning("[PLAYWRIGHT FALLBACK] Playwright is not installed in environment.")
        return None, None, ""

    try:
        logger.info(f"[PLAYWRIGHT FALLBACK] Attempting Headless Chromium fetch for: {url}")
        pw_proxy = proxy_pool.get_playwright_proxy()
        launch_kwargs = {
            "headless": True,
            "args": [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-gpu",
                "--blink-settings=imagesEnabled=true"
            ]
        }
        if pw_proxy:
            launch_kwargs["proxy"] = pw_proxy
        async with async_playwright() as p:
            browser = await p.chromium.launch(**launch_kwargs)
            context = await browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
                viewport={"width": 1280, "height": 800},
                extra_http_headers={
                    "Accept-Language": "en-US,en;q=0.9",
                    "Sec-Fetch-Dest": "document",
                    "Sec-Fetch-Mode": "navigate",
                    "Sec-Fetch-Site": "none",
                    "Sec-Fetch-User": "?1",
                    "Upgrade-Insecure-Requests": "1"
                }
            )
            page = await context.new_page()
            
            response = await page.goto(url, wait_until="domcontentloaded", timeout=timeout_ms)
            status_code = response.status if response else 200
            
            # Wait briefly if page is executing bot verification / hydration scripts
            await asyncio.sleep(1.0)
            
            content = await page.content()
            content_type = response.headers.get("content-type", "text/html") if response else "text/html"
            
            await browser.close()
            if is_captcha_or_bot_gate(status_code, content):
                logger.warning(f"[PLAYWRIGHT FALLBACK] CAPTCHA/verification gate encountered for {url}; returning cleanly without bypass.")
            logger.info(f"[PLAYWRIGHT FALLBACK] Successfully retrieved {len(content)} bytes with status {status_code} for {url}")
            return content, status_code, content_type
            
    except Exception as e:
        logger.error(f"[PLAYWRIGHT FALLBACK] Error fetching {url} via Playwright: {e}")
        return None, None, ""
