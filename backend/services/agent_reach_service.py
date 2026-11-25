"""
Agent-Reach & Read-Only API Discovery Service for STAGE Inbuilt Agent.

Follows the Agent-Reach skill guardrails:
- Strictly read-only (no posting, liking, commenting, or credential/cookie harvesting).
- Public-web first, routing through `proxy_pool` (ROTATING_PROXY_URLS) when configured.
- Circuit-breaker on RATE_LIMITED (429) or PLATFORM_BLOCKED (CAPTCHA/verification gate).
- Summarizes passively observed public JSON/GraphQL endpoints from `stage-agent.js`
  so the Copilot understands the target website's live data/API architecture.
"""

from __future__ import annotations

import asyncio
import json
import logging
import re
import shutil
import time
from typing import Any, Dict, List, Optional

import httpx

from proxy.proxy_rotator import proxy_pool, is_captcha_or_bot_gate
from utils.ssrf_guard import is_ssrf_safe

logger = logging.getLogger("stage.services.agent_reach")

_LAST_FETCH_BY_HOST: Dict[str, float] = {}
MIN_HOST_PACING_SECONDS = 2.5


async def read_public_url(url: str, prefer_cli: bool = True) -> Dict[str, Any]:
    """
    Read-only public URL/platform content reader.
    1. Checks SSRF safety.
    2. If `agent-reach` CLI is installed and prefer_cli=True, invokes `agent-reach read <url> --backend public-web`.
    3. Otherwise performs a lightweight public-web HTTP GET via `proxy_pool` (rotating proxy IPs).
    """
    if not url or not isinstance(url, str):
        return {"ok": False, "error": {"code": "BAD_INPUT", "message": "URL is required"}}

    if not is_ssrf_safe(url):
        return {"ok": False, "error": {"code": "BAD_INPUT", "message": "Blocked unsafe URL"}}

    # Try local agent-reach CLI if installed
    cli_path = shutil.which("agent-reach") if prefer_cli else None
    if cli_path:
        try:
            proc = await asyncio.create_subprocess_exec(
                cli_path,
                "read",
                url,
                "--backend",
                "public-web",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=15.0)
            out_text = (stdout or b"").decode("utf-8", errors="ignore").strip()
            if out_text:
                try:
                    parsed = json.loads(out_text)
                    if isinstance(parsed, dict):
                        return parsed
                except Exception:
                    pass
        except Exception as e:
            logger.debug(f"[AGENT_REACH] CLI fallback to public-web HTTP: {e}")

    # Pacing guardrail per host
    try:
        from urllib.parse import urlparse

        host = (urlparse(url).hostname or "").lower()
    except Exception:
        host = ""

    if host:
        now = time.time()
        last = _LAST_FETCH_BY_HOST.get(host, 0.0)
        if now - last < MIN_HOST_PACING_SECONDS:
            await asyncio.sleep(MIN_HOST_PACING_SECONDS - (now - last))
        _LAST_FETCH_BY_HOST[host] = time.time()

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
    }

    proxy_url = proxy_pool.next_proxy() if proxy_pool.has_proxies else None
    try:
        if proxy_url:
            client = proxy_pool.get_httpx_client(proxy_url, follow_redirects=True)
            resp = await client.get(url, headers=headers)
        else:
            async with httpx.AsyncClient(verify=False, follow_redirects=True, timeout=12.0) as direct:
                resp = await direct.get(url, headers=headers)

        if resp.status_code == 429:
            proxy_pool.mark_failure(proxy_url, 429)
            return {
                "ok": False,
                "error": {"code": "RATE_LIMITED", "message": "Rate limited by upstream", "retry_after_seconds": 60},
            }

        body = resp.text or ""
        if is_captcha_or_bot_gate(resp.status_code, body):
            proxy_pool.mark_failure(proxy_url, resp.status_code)
            return {
                "ok": False,
                "error": {"code": "PLATFORM_BLOCKED", "message": "Verification/CAPTCHA gate encountered"},
            }

        if resp.status_code >= 400:
            proxy_pool.mark_failure(proxy_url, resp.status_code)
            return {
                "ok": False,
                "error": {"code": "UPSTREAM_BROKEN", "message": f"HTTP {resp.status_code}"},
            }

        proxy_pool.mark_success(proxy_url)

        title_match = re.search(r"<title[^>]*>(.*?)</title>", body, flags=re.IGNORECASE | re.DOTALL)
        title = re.sub(r"\s+", " ", title_match.group(1)).strip() if title_match else url
        text_clean = re.sub(r"<script[\s\S]*?</script>|<style[\s\S]*?</style>", " ", body, flags=re.IGNORECASE)
        text_clean = re.sub(r"<[^>]+>", " ", text_clean)
        text_clean = re.sub(r"\s+", " ", text_clean).strip()[:2500]

        return {
            "ok": True,
            "backend": "public-web",
            "proxy_rotated": bool(proxy_url),
            "items": [
                {
                    "title": title[:180],
                    "url": str(resp.url),
                    "text": text_clean,
                }
            ],
        }
    except Exception as exc:
        proxy_pool.mark_failure(proxy_url)
        return {"ok": False, "error": {"code": "TIMEOUT", "message": str(exc)}}


def summarize_observed_apis(observed_apis: Optional[List[Dict[str, Any]]]) -> List[Dict[str, Any]]:
    """
    Sanitizes and summarizes passively observed XHR/fetch API endpoints from `stage-agent.js`.
    Strips query tokens/secrets and keeps only method, path, status, and response key schema.
    """
    if not observed_apis or not isinstance(observed_apis, list):
        return []

    seen = set()
    cleaned: List[Dict[str, Any]] = []
    for item in observed_apis:
        if not isinstance(item, dict):
            continue
        method = str(item.get("method") or "GET").upper()[:10]
        path = str(item.get("path") or "").strip()[:160]
        if not path or path in seen:
            continue
        seen.add(path)
        keys = item.get("keys")
        safe_keys = [str(k)[:40] for k in keys[:10]] if isinstance(keys, list) else []
        cleaned.append({
            "method": method,
            "path": path,
            "status": item.get("status"),
            "keys": safe_keys,
        })
        if len(cleaned) >= 12:
            break
    return cleaned
