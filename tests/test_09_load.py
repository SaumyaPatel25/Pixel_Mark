import httpx
import asyncio
import time
import pytest
import uuid

RAILWAY_URL = "https://pixelmark-production.up.railway.app"

async def test_concurrent_health_checks():
    async with httpx.AsyncClient(timeout=10) as client:
        tasks = [client.get(f"{RAILWAY_URL}/health") for _ in range(50)]
        start_time = time.time()
        responses = await asyncio.gather(*tasks)
        duration = time.time() - start_time
        
        for r in responses:
            assert r.status_code == 200
            
        print(f"\nConcurrent Health Checks (50 reqs): PASS ({duration:.2f}s)")
        print(f"Avg response time: {duration/50:.3f}s")

async def test_concurrent_registrations():
    async with httpx.AsyncClient(timeout=20) as client:
        def make_user():
            uid = uuid.uuid4().hex[:6]
            return {"email": f"load_{uid}@test.com", "password": "Pass1234!", "name": "Load Tester"}
            
        tasks = [client.post(f"{RAILWAY_URL}/auth/register", json=make_user()) for _ in range(10)]
        start_time = time.time()
        responses = await asyncio.gather(*tasks)
        duration = time.time() - start_time
        
        for r in responses:
            assert r.status_code == 200
            assert "access_token" in r.json()
            
        print(f"Concurrent Registrations (10 reqs): PASS ({duration:.2f}s)")
        print(f"Avg registration time: {duration/10:.3f}s")

async def test_rapid_marker_creation():
    async with httpx.AsyncClient(timeout=20) as client:
        # Setup
        email = f"rapid_{uuid.uuid4().hex[:6]}@test.com"
        resp = await client.post(f"{RAILWAY_URL}/auth/register", json={"email": email, "password": "Pass1234!", "name": "Rapid"})
        token = resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        resp = await client.post(f"{RAILWAY_URL}/projects/", json={"name": "Rapid Project"}, headers=headers)
        pid = resp.json()["id"]
        
        resp = await client.post(f"{RAILWAY_URL}/sessions/", json={"project_id": pid, "title": "Rapid Session"}, headers=headers)
        sid = resp.json()["id"]
        
        # Sequentially create 20 markers
        start_time = time.time()
        for i in range(20):
            await client.post(f"{RAILWAY_URL}/markers/", json={"session_id": sid, "title": f"Marker {i}"}, headers=headers)
        duration = time.time() - start_time
        
        # Verify
        resp = await client.get(f"{RAILWAY_URL}/markers/session/{sid}", headers=headers)
        assert len(resp.json()) == 20
        
        print(f"Rapid Marker Creation (20 markers): PASS ({duration:.2f}s)")
        print(f"Rate: {20/duration:.2f} markers/sec")
