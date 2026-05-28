from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from dependencies import get_db
from models import Session, Project, PageVisit, Environment
import httpx
import re
import socket
import ipaddress
import urllib.parse
from bs4 import BeautifulSoup
import os
import uuid
from datetime import datetime

router = APIRouter(prefix="/proxy", tags=["proxy"])

def is_ssrf_safe(url: str) -> bool:
    try:
        parsed = urllib.parse.urlparse(url)
        if parsed.scheme not in ("http", "https"):
            return False
        
        hostname = parsed.hostname
        if not hostname:
            return False
            
        if hostname.startswith("[") and hostname.endswith("]"):
            hostname = hostname[1:-1]
            
        # Resolve all IPs
        addr_info = socket.getaddrinfo(hostname, None)
        for family, socktype, proto, canonname, sockaddr in addr_info:
            ip_str = sockaddr[0]
            ip = ipaddress.ip_address(ip_str)
            if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_multicast or ip.is_unspecified:
                return False
        return True
    except Exception:
        return False

def rewrite_html(html: str, session_id: str, page_url: str, base_url: str, api_base: str) -> str:
    soup = BeautifulSoup(html, "html.parser")
    
    # 1. Strip CSP / X-Frame-Options meta tags
    for meta in soup.find_all("meta"):
        http_equiv = meta.get("http-equiv", "").lower()
        if http_equiv in ("content-security-policy", "x-frame-options"):
            meta.decompose()
            
    parsed_base = urllib.parse.urlparse(base_url)
    base_domain = parsed_base.netloc
    
    def clean_and_absolute_url(url: str, current_url: str) -> str:
        return urllib.parse.urljoin(current_url, url)

    # A) Rewrite all internal links so they stay inside the proxy
    for a in soup.find_all("a", href=True):
        href = a["href"].strip()
        if not href or href.startswith(("javascript:", "#", "mailto:", "tel:", "data:")):
            continue
        abs_url = clean_and_absolute_url(href, page_url)
        parsed_abs = urllib.parse.urlparse(abs_url)
        if parsed_abs.netloc == base_domain:
            a["href"] = f"/proxy/session/{session_id}/page?url={urllib.parse.quote(abs_url)}"
        else:
            a["target"] = "_blank"

    # Rewrite forms
    for form in soup.find_all("form", action=True):
        action = form["action"].strip()
        if not action or action.startswith(("javascript:", "#")):
            continue
        abs_url = clean_and_absolute_url(action, page_url)
        parsed_abs = urllib.parse.urlparse(abs_url)
        if parsed_abs.netloc == base_domain:
            form["action"] = f"/proxy/session/{session_id}/page?url={urllib.parse.quote(abs_url)}"

    # B) Rewrite all asset URLs to go through asset proxy route
    for link in soup.find_all("link", href=True):
        href = link["href"].strip()
        if href and not href.startswith(("data:", "javascript:")):
            abs_url = clean_and_absolute_url(href, page_url)
            link["href"] = f"/proxy/session/{session_id}/asset?url={urllib.parse.quote(abs_url)}"

    for script in soup.find_all("script", src=True):
        src = script["src"].strip()
        if src and not src.startswith(("data:", "javascript:")):
            abs_url = clean_and_absolute_url(src, page_url)
            script["src"] = f"/proxy/session/{session_id}/asset?url={urllib.parse.quote(abs_url)}"

    for img in soup.find_all("img", src=True):
        src = img["src"].strip()
        if src and not src.startswith(("data:", "javascript:")):
            abs_url = clean_and_absolute_url(src, page_url)
            img["src"] = f"/proxy/session/{session_id}/asset?url={urllib.parse.quote(abs_url)}"
        
        # Rewrite srcset
        if img.get("srcset"):
            srcset = img["srcset"]
            new_srcset_parts = []
            for part in srcset.split(","):
                part = part.strip()
                if not part:
                    continue
                subparts = part.split()
                if not subparts:
                    continue
                img_url = subparts[0]
                if not img_url.startswith(("data:", "javascript:")):
                    abs_url = clean_and_absolute_url(img_url, page_url)
                    img_url = f"/proxy/session/{session_id}/asset?url={urllib.parse.quote(abs_url)}"
                if len(subparts) > 1:
                    new_srcset_parts.append(f"{img_url} {subparts[1]}")
                else:
                    new_srcset_parts.append(img_url)
            img["srcset"] = ", ".join(new_srcset_parts)

    for source in soup.find_all("source", srcset=True):
        srcset = source["srcset"]
        new_srcset_parts = []
        for part in srcset.split(","):
            part = part.strip()
            if not part:
                continue
            subparts = part.split()
            if not subparts:
                continue
            img_url = subparts[0]
            if not img_url.startswith(("data:", "javascript:")):
                abs_url = clean_and_absolute_url(img_url, page_url)
                img_url = f"/proxy/session/{session_id}/asset?url={urllib.parse.quote(abs_url)}"
            if len(subparts) > 1:
                new_srcset_parts.append(f"{img_url} {subparts[1]}")
            else:
                new_srcset_parts.append(img_url)
        source["srcset"] = ", ".join(new_srcset_parts)

    # D) Inject the PixelMark Audit Agent script as the LAST tag in body
    config_script = soup.new_tag("script")
    config_script.string = f"""
    window.__PIXELMARK__ = {{
      sessionId: "{session_id}",
      pageUrl: "{page_url}",
      apiBase: "{api_base}",
      agentVersion: "2.0"
    }};
    """
    
    agent_script = soup.new_tag("script", src="/static/pixelmark-agent.js")
    
    if soup.body:
        soup.body.append(config_script)
        soup.body.append(agent_script)
    else:
        soup.append(config_script)
        soup.append(agent_script)

    # E) Inject a top status bar (40px height) at the start of body
    status_bar_html = f"""
    <div id="pixelmark-status-bar" style="
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        height: 40px !important;
        background: #0f0f16 !important;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
        color: #ffffff !important;
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        padding: 0 16px !important;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
        font-size: 13px !important;
        z-index: 2147483647 !important;
        box-sizing: border-box !important;
    ">
        <div style="display: flex !important; align-items: center !important; gap: 8px !important;">
            <span style="display: inline-block !important; width: 8px !important; height: 8px !important; background: #7c3aed !important; border-radius: 50% !important;"></span>
            <strong style="color: #7c3aed !important; font-weight: 600 !important;">PixelMark Audit Active</strong>
        </div>
        <div style="color: rgba(255, 255, 255, 0.6) !important; max-width: 60% !important; overflow: hidden !important; text-overflow: ellipsis !important; white-space: nowrap !important;">
            {page_url}
        </div>
        <button onclick="window.parent.postMessage({{type:'EXIT_AUDIT'}}, '*')" style="
            background: rgba(255, 255, 255, 0.1) !important;
            border: none !important;
            color: #ffffff !important;
            padding: 4px 12px !important;
            border-radius: 4px !important;
            cursor: pointer !important;
            font-size: 12px !important;
            transition: background 0.2s !important;
        " onmouseover="this.style.background='rgba(255, 255, 255, 0.2)'" onmouseout="this.style.background='rgba(255, 255, 255, 0.1)'">
            Exit Audit
        </button>
    </div>
    <div style="height: 40px !important; display: block !important; width: 100% !important; box-sizing: border-box !important;"></div>
    """
    status_bar_soup = BeautifulSoup(status_bar_html, "html.parser")
    if soup.body:
        soup.body.insert(0, status_bar_soup)
    else:
        soup.insert(0, status_bar_soup)
    
    return str(soup)

@router.get("/session/{session_id}")
async def proxy_initial(session_id: str, db: AsyncSession = Depends(get_db)):
    try:
        uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid UUID format")
        
    result = await db.execute(
        select(Session).where(Session.id == session_id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    proj_result = await db.execute(
        select(Project).where(Project.id == session.project_id)
    )
    project = proj_result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    env_result = await db.execute(
        select(Environment).where(Environment.project_id == project.id)
    )
    envs = env_result.scalars().all()
    
    base_url = None
    if envs:
        base_url = envs[0].base_url
        for env in envs:
            if env.name.lower() in ("prod", "production"):
                base_url = env.base_url
                break
    
    if not base_url:
        base_url = project.url
        
    if not base_url:
        raise HTTPException(status_code=400, detail="No base URL configured for the project.")
        
    if not is_ssrf_safe(base_url):
        raise HTTPException(status_code=403, detail="SSRF target blocked: Loopback or private IP ranges are restricted.")

    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        async with httpx.AsyncClient(follow_redirects=True, timeout=15.0, verify=False) as client:
            resp = await client.get(base_url, headers=headers)
            
            if resp.status_code >= 400:
                return Response(
                    content=f"<html><body style='font-family:sans-serif;background:#0d0d14;color:#fff;padding:40px;text-align:center;'><h2>Service Unavailable</h2><p>Target site {base_url} returned status code {resp.status_code}.</p></body></html>",
                    media_type="text/html",
                    status_code=503
                )
                
            content_type = resp.headers.get("content-type", "text/html")
            
            if "text/html" in content_type:
                # Add PageVisit
                page_visit = PageVisit(
                    id=str(uuid.uuid4()),
                    session_id=session.id,
                    page_url=base_url,
                    page_title=None,
                    visited_at=datetime.utcnow(),
                    renderer_type="unknown"
                )
                db.add(page_visit)
                
                session.current_page_url = base_url
                session.pages_visited = (session.pages_visited or 0) + 1
                await db.commit()
                
                api_base = os.getenv("API_BASE", "")
                rewritten_html = rewrite_html(resp.text, session.id, base_url, base_url, api_base)
                
                response = Response(content=rewritten_html.encode("utf-8"), media_type="text/html")
                response.headers["X-PixelMark-Session"] = session.id
                response.headers["X-PixelMark-Page"] = base_url
                
                # Strip dynamic security headers
                response.headers.pop("Content-Security-Policy", None)
                response.headers.pop("X-Frame-Options", None)
                return response
            else:
                return Response(content=resp.content, media_type=content_type)
                
    except Exception as e:
        return Response(
            content=f"<html><body style='font-family:sans-serif;background:#0d0d14;color:#fff;padding:40px;text-align:center;'><h2>Service Unavailable</h2><p>Target site {base_url} is unreachable.</p><p style='color:gray;'>{str(e)}</p></body></html>",
            media_type="text/html",
            status_code=503
        )

@router.get("/session/{session_id}/page")
async def proxy_page(session_id: str, url: str, db: AsyncSession = Depends(get_db)):
    try:
        uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid UUID format")
        
    result = await db.execute(
        select(Session).where(Session.id == session_id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if not is_ssrf_safe(url):
        raise HTTPException(status_code=403, detail="SSRF target blocked: Loopback or private IP ranges are restricted.")

    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        async with httpx.AsyncClient(follow_redirects=True, timeout=15.0, verify=False) as client:
            resp = await client.get(url, headers=headers)
            
            if resp.status_code >= 400:
                return Response(
                    content=f"<html><body style='font-family:sans-serif;background:#0d0d14;color:#fff;padding:40px;text-align:center;'><h2>Service Unavailable</h2><p>Target page {url} returned status code {resp.status_code}.</p></body></html>",
                    media_type="text/html",
                    status_code=503
                )
                
            content_type = resp.headers.get("content-type", "text/html")
            
            if "text/html" in content_type:
                page_visit = PageVisit(
                    id=str(uuid.uuid4()),
                    session_id=session.id,
                    page_url=url,
                    page_title=None,
                    visited_at=datetime.utcnow(),
                    renderer_type="unknown"
                )
                db.add(page_visit)
                
                session.current_page_url = url
                session.pages_visited = (session.pages_visited or 0) + 1
                await db.commit()
                
                api_base = os.getenv("API_BASE", "")
                rewritten_html = rewrite_html(resp.text, session.id, url, url, api_base)
                
                response = Response(content=rewritten_html.encode("utf-8"), media_type="text/html")
                response.headers["X-PixelMark-Session"] = session.id
                response.headers["X-PixelMark-Page"] = url
                
                # Strip security headers
                response.headers.pop("Content-Security-Policy", None)
                response.headers.pop("X-Frame-Options", None)
                return response
            else:
                return Response(content=resp.content, media_type=content_type)
                
    except Exception as e:
        return Response(
            content=f"<html><body style='font-family:sans-serif;background:#0d0d14;color:#fff;padding:40px;text-align:center;'><h2>Service Unavailable</h2><p>Target page {url} is unreachable.</p><p style='color:gray;'>{str(e)}</p></body></html>",
            media_type="text/html",
            status_code=503
        )

@router.get("/session/{session_id}/asset")
async def proxy_asset(session_id: str, url: str):
    if not is_ssrf_safe(url):
        raise HTTPException(status_code=403, detail="SSRF target blocked: Loopback or private IP ranges are restricted.")
        
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        async with httpx.AsyncClient(follow_redirects=True, timeout=15.0, verify=False) as client:
            resp = await client.get(url, headers=headers)
            content_type = resp.headers.get("content-type", "application/octet-stream")
            return Response(content=resp.content, media_type=content_type)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
