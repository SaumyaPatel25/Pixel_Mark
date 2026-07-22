import httpx
import pytest
import time
import asyncio

import os
RAILWAY_URL = os.environ.get("RAILWAY_URL", "https://stage-production.up.railway.app")
VERCEL_URL = os.environ.get("VERCEL_URL", "https://web-zeta-sable-82.vercel.app")

@pytest.mark.asyncio
async def test_backend_health():
    async with httpx.AsyncClient(timeout=10) as client:
        start_time = time.time()
        response = await client.get(f"{RAILWAY_URL}/health")
        duration = time.time() - start_time
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["version"] == "2.0.0"
        assert duration < 3
        print(f"\nBackend Health: PASS ({duration:.2f}s)")

@pytest.mark.asyncio
async def test_backend_docs_accessible():
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.get(f"{RAILWAY_URL}/docs")
        assert response.status_code == 200
        assert "swagger" in response.text.lower() or "openapi" in response.text.lower()
        print("Backend Docs Accessible: PASS")

@pytest.mark.asyncio
async def test_frontend_accessible():
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.get(VERCEL_URL)
        assert response.status_code == 200
        assert "stage" in response.text.lower()
        print("Frontend Accessible: PASS")

@pytest.mark.asyncio
async def test_frontend_login_page():
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.get(f"{VERCEL_URL}/login")
        assert response.status_code == 200
        assert "sign in" in response.text.lower() or "login" in response.text.lower()
        print("Frontend Login Page: PASS")

@pytest.mark.asyncio
async def test_cors_headers_present():
    async with httpx.AsyncClient(timeout=10) as client:
        headers = {"Origin": VERCEL_URL}
        response = await client.options(f"{RAILWAY_URL}/health", headers=headers)
        assert "Access-Control-Allow-Origin" in response.headers
        assert response.headers["Access-Control-Allow-Origin"] == VERCEL_URL
        print("CORS Headers Present: PASS")

@pytest.mark.asyncio
async def test_backend_response_time():
    async with httpx.AsyncClient(timeout=10) as client:
        durations = []
        for _ in range(10):
            start_time = time.time()
            response = await client.get(f"{RAILWAY_URL}/health")
            duration = time.time() - start_time
            assert response.status_code == 200
            assert duration < 5
            durations.append(duration)
        
        avg_time = sum(durations) / len(durations)
        print(f"Average Response Time (10 requests): {avg_time:.3f}s")
        assert avg_time < 2
