"""
Rotating Proxy IP Pool for STAGE Proxy & Agent-Reach.

Reads proxy endpoints from `ROTATING_PROXY_URLS` (comma or newline separated,
supporting http://, https://, socks5://, with optional user:pass auth) and
rotates across healthy IPs with automatic cooldown on 403/429/connection errors.

Also detects CAPTCHA / human-verification gates so the proxy stops cleanly
instead of attempting to bypass bot challenges.
"""

from __future__ import annotations

import logging
import os
import time
import urllib.parse
from dataclasses import dataclass, field
from typing import Dict, List, Optional

import httpx

logger = logging.getLogger("stage.proxy.rotator")

DEFAULT_COOLDOWN_SECONDS = 60.0


@dataclass
class ProxyNode:
    url: str
    failures: int = 0
    cooldown_until: float = 0.0
    total_requests: int = 0

    def is_healthy(self, now: Optional[float] = None) -> bool:
        t = now if now is not None else time.time()
        return t >= self.cooldown_until


class RotatingProxyPool:
    """Round-robin rotating proxy pool with health cooldown & cached AsyncClients."""

    def __init__(self, proxy_urls: Optional[List[str]] = None, cooldown_seconds: float = DEFAULT_COOLDOWN_SECONDS):
        self.cooldown_seconds = cooldown_seconds
        self._nodes: List[ProxyNode] = []
        self._cursor: int = 0
        self._clients: Dict[str, httpx.AsyncClient] = {}
        self.reload(proxy_urls)

    def reload(self, proxy_urls: Optional[List[str]] = None) -> None:
        if proxy_urls is None:
            raw = os.getenv("ROTATING_PROXY_URLS", "") or os.getenv("PROXY_ROTATION_LIST", "")
            urls = [u.strip() for u in raw.replace("\n", ",").split(",") if u.strip()]
            if not urls:
                for env_key in ("HTTPS_PROXY", "HTTP_PROXY"):
                    val = (os.getenv(env_key) or "").strip()
                    if val and val not in urls:
                        urls.append(val)
        else:
            urls = [u.strip() for u in proxy_urls if u and u.strip()]

        # Deduplicate preserving order
        seen = set()
        unique_urls: List[str] = []
        for u in urls:
            if u not in seen:
                seen.add(u)
                unique_urls.append(u)

        self._nodes = [ProxyNode(url=u) for u in unique_urls]
        self._cursor = 0

    @property
    def has_proxies(self) -> bool:
        return len(self._nodes) > 0

    @property
    def pool_size(self) -> int:
        return len(self._nodes)

    def next_proxy(self, exclude: Optional[set] = None) -> Optional[str]:
        if not self._nodes:
            return None
        now = time.time()
        n = len(self._nodes)
        exclude = exclude or set()

        # First pass: pick next healthy proxy not in exclude
        for offset in range(n):
            idx = (self._cursor + offset) % n
            node = self._nodes[idx]
            if node.url in exclude:
                continue
            if node.is_healthy(now):
                self._cursor = (idx + 1) % n
                node.total_requests += 1
                return node.url

        # Fallback: pick least-recently-failed proxy not in exclude
        candidates = [node for node in self._nodes if node.url not in exclude]
        if not candidates:
            candidates = self._nodes
        best = min(candidates, key=lambda nd: nd.cooldown_until)
        best.total_requests += 1
        return best.url

    def mark_success(self, proxy_url: Optional[str]) -> None:
        if not proxy_url:
            return
        for node in self._nodes:
            if node.url == proxy_url:
                node.failures = 0
                node.cooldown_until = 0.0
                break

    def mark_failure(self, proxy_url: Optional[str], status_code: Optional[int] = None) -> None:
        if not proxy_url:
            return
        now = time.time()
        for node in self._nodes:
            if node.url == proxy_url:
                node.failures += 1
                backoff = min(self.cooldown_seconds * (2 ** min(node.failures - 1, 3)), 300.0)
                node.cooldown_until = now + backoff
                logger.warning(
                    f"[PROXY_ROTATOR] Cooldown {backoff:.0f}s for proxy {self._mask_proxy(proxy_url)} "
                    f"(status={status_code}, failures={node.failures})"
                )
                break

    def get_httpx_client(self, proxy_url: str, follow_redirects: bool = True) -> httpx.AsyncClient:
        cache_key = f"{proxy_url}|redir={follow_redirects}"
        client = self._clients.get(cache_key)
        if client is None or client.is_closed:
            limits = httpx.Limits(max_keepalive_connections=30, max_connections=100, keepalive_expiry=30.0)
            client = httpx.AsyncClient(
                proxy=proxy_url,
                limits=limits,
                verify=False,
                follow_redirects=follow_redirects,
                timeout=httpx.Timeout(15.0, connect=6.0),
            )
            self._clients[cache_key] = client
        return client

    def get_playwright_proxy(self) -> Optional[Dict[str, str]]:
        proxy_url = self.next_proxy()
        if not proxy_url:
            return None
        parsed = urllib.parse.urlparse(proxy_url)
        server = f"{parsed.scheme}://{parsed.hostname}:{parsed.port}" if parsed.port else f"{parsed.scheme}://{parsed.hostname}"
        cfg: Dict[str, str] = {"server": server}
        if parsed.username:
            cfg["username"] = urllib.parse.unquote(parsed.username)
        if parsed.password:
            cfg["password"] = urllib.parse.unquote(parsed.password)
        return cfg

    def status_summary(self) -> Dict[str, object]:
        now = time.time()
        return {
            "enabled": self.has_proxies,
            "total": len(self._nodes),
            "healthy": sum(1 for n in self._nodes if n.is_healthy(now)),
            "proxies": [
                {
                    "proxy": self._mask_proxy(n.url),
                    "healthy": n.is_healthy(now),
                    "failures": n.failures,
                    "requests": n.total_requests,
                }
                for n in self._nodes
            ],
        }

    @staticmethod
    def _mask_proxy(proxy_url: str) -> str:
        try:
            parsed = urllib.parse.urlparse(proxy_url)
            host = parsed.hostname or "unknown"
            port = f":{parsed.port}" if parsed.port else ""
            return f"{parsed.scheme}://{host}{port}"
        except Exception:
            return "proxy://***"


# Global singleton pool
proxy_pool = RotatingProxyPool()


CAPTCHA_MARKERS = (
    "cf-turnstile",
    "challenges.cloudflare.com",
    "g-recaptcha",
    "h-captcha",
    "hcaptcha.com/1/api.js",
    "verify you are human",
    "arkoselabs",
)


def is_captcha_or_bot_gate(status_code: Optional[int], body_text: str = "") -> bool:
    """Detects explicit CAPTCHA or human-verification gates so we stop cleanly."""
    if not body_text:
        return False
    lower = body_text[:12000].lower()
    if any(marker in lower for marker in CAPTCHA_MARKERS):
        return True
    if status_code in (403, 429, 503) and ("captcha" in lower or "attention required" in lower):
        return True
    return False
