import httpx
import pytest
import uuid

import os
RAILWAY_URL = os.environ.get("RAILWAY_URL", "https://stage-production.up.railway.app")
state = {
    "email": f"qatest_{uuid.uuid4().hex[:6]}@stage.dev",
    "password": "QaTest1234!",
    "token": None
}

@pytest.mark.asyncio
async def test_register_new_user():
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.post(
            f"{RAILWAY_URL}/auth/register",
            json={
                "email": state["email"],
                "password": state["password"],
                "name": "QA Tester"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        state["token"] = data["access_token"]
        print(f"\nRegister New User: PASS (Email: {state['email']})")

@pytest.mark.asyncio
async def test_register_duplicate_rejected():
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.post(
            f"{RAILWAY_URL}/auth/register",
            json={
                "email": state["email"],
                "password": state["password"],
                "name": "QA Tester"
            }
        )
        assert response.status_code == 400
        assert "detail" in response.json()
        print("Register Duplicate Rejected: PASS")

@pytest.mark.asyncio
async def test_login_success():
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.post(
            f"{RAILWAY_URL}/auth/login",
            json={
                "email": state["email"],
                "password": state["password"]
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        state["token"] = data["access_token"]
        print("Login Success: PASS")

@pytest.mark.asyncio
async def test_login_wrong_password():
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.post(
            f"{RAILWAY_URL}/auth/login",
            json={
                "email": state["email"],
                "password": "WrongPassword123!"
            }
        )
        assert response.status_code == 401
        print("Login Wrong Password Rejected: PASS")

@pytest.mark.asyncio
async def test_login_nonexistent_email():
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.post(
            f"{RAILWAY_URL}/auth/login",
            json={
                "email": "nobody@nowhere.com",
                "password": state["password"]
            }
        )
        assert response.status_code == 401
        print("Login Nonexistent Email Rejected: PASS")

@pytest.mark.asyncio
async def test_get_me_with_token():
    async with httpx.AsyncClient(timeout=10) as client:
        headers = {"Authorization": f"Bearer {state['token']}"}
        response = await client.get(f"{RAILWAY_URL}/auth/me", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["email"] == state["email"]
        assert data["name"] == "QA Tester"
        print("Get Me With Token: PASS")

@pytest.mark.asyncio
async def test_get_me_no_token():
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.get(f"{RAILWAY_URL}/auth/me")
        # FastAPI/OAuth2 usually returns 401 or 403 depending on implementation
        assert response.status_code in [401, 403]
        print("Get Me No Token Rejected: PASS")

@pytest.mark.asyncio
async def test_get_me_invalid_token():
    async with httpx.AsyncClient(timeout=10) as client:
        headers = {"Authorization": "Bearer fake.invalid.token"}
        response = await client.get(f"{RAILWAY_URL}/auth/me", headers=headers)
        assert response.status_code == 401
        print("Get Me Invalid Token Rejected: PASS")

@pytest.mark.asyncio
async def test_get_me_expired_token():
    async with httpx.AsyncClient(timeout=10) as client:
        # Fake expired token structure
        headers = {"Authorization": "Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0IiwiZXhwIjoxfQ.fake"}
        response = await client.get(f"{RAILWAY_URL}/auth/me", headers=headers)
        assert response.status_code == 401
        print("Get Me Expired Token Rejected: PASS")
