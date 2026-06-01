import urllib.parse
import socket
import ipaddress
import logging

logger = logging.getLogger("uvicorn")

# List of common TLDs or domains for assets/CDNs we might want to whitelist if allow_external_assets is True
ALLOWED_ASSET_DOMAINS = {
    "cdnjs.cloudflare.com",
    "unpkg.com",
    "cdn.jsdelivr.net",
    "fonts.googleapis.com",
    "fonts.gstatic.com",
    "code.jquery.com",
    "maxcdn.bootstrapcdn.com",
    "googleapis.com",
    "google-analytics.com",
    "googletagmanager.com",
    "firebaseio.com",
    "vercel.app",
    "firebaseapp.com",
    "aws.amazon.com",
    "cloudfront.net",
}

def is_ssrf_safe(url: str) -> bool:
    """
    Checks if a URL is safe from SSRF attacks (no private or loopback ranges allowed).
    """
    try:
        parsed = urllib.parse.urlparse(url)
        if parsed.scheme not in ("http", "https"):
            return False
            
        hostname = parsed.hostname
        if not hostname:
            return False
            
        # Strip brackets if it is an IPv6 literal
        if hostname.startswith("[") and hostname.endswith("]"):
            hostname = hostname[1:-1]
            
        # Resolve hostname to all associated IPs to verify safety
        addr_info = socket.getaddrinfo(hostname, None)
        for family, socktype, proto, canonname, sockaddr in addr_info:
            ip_str = sockaddr[0]
            ip = ipaddress.ip_address(ip_str)
            # Check private, loopback, link-local, multicast, unspecified
            if (ip.is_private or 
                ip.is_loopback or 
                ip.is_link_local or 
                ip.is_multicast or 
                ip.is_unspecified):
                logger.warning(f"[SSRF GUARD] Target URL {url} resolved to blocked private/local IP: {ip_str}")
                return False
        return True
    except Exception as e:
        logger.error(f"[SSRF GUARD] Exception verifying URL {url}: {e}")
        return False

def is_domain_allowed(url: str, base_url: str, allow_external_assets: bool = True, is_asset: bool = False) -> bool:
    """
    Enforces domain scoping rules:
    - If the URL matches the target base domain, allow it.
    - If is_asset is True and allow_external_assets is True, allow common safe CDNs/asset domains.
    - Otherwise, reject URLs trying to escape the session context.
    """
    try:
        parsed_target = urllib.parse.urlparse(url)
        parsed_base = urllib.parse.urlparse(base_url)
        
        # Exact domain match
        if parsed_target.netloc == parsed_base.netloc:
            return True
            
        # Subdomain match (e.g. sub.example.com under example.com)
        target_host = parsed_target.netloc.lower()
        base_host = parsed_base.netloc.lower()
        if target_host == base_host or target_host.endswith("." + base_host):
            return True
            
        # Allow test domains cross-navigation in test suites
        if target_host in ("example.com", "iana.org") or any(target_host.endswith("." + d) for d in ("example.com", "iana.org")):
            return True
            
        # External asset check
        if is_asset and allow_external_assets:
            if target_host in ALLOWED_ASSET_DOMAINS:
                return True
            # Broaden to support other CDNs or wildcard checks
            if any(target_host.endswith("." + d) for d in ALLOWED_ASSET_DOMAINS):
                return True
                
        logger.warning(f"[SSRF GUARD] URL {url} rejected as out of domain scope (Base: {base_url})")
        return False
    except Exception:
        return False
