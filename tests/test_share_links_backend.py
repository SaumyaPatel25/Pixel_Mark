import pytest
import httpx
import asyncio
from datetime import datetime, timedelta

# Note: These tests assume the backend is running at http://localhost:8765
# and that a test user test@example.com / password123 exists.
# If not, you might need to run a setup script first.

BASE_URL = "http://127.0.0.1:8765"

@pytest.mark.asyncio
async def test_share_link_lifecycle():
    async with httpx.AsyncClient(base_url=BASE_URL, timeout=10.0) as client:
        # 1. Login
        login_resp = await client.post("/auth/login", json={
            "email": "test@example.com",
            "password": "password123"
        })
        if login_resp.status_code != 200:
            # Try to register if login fails
            await client.post("/auth/register", json={
                "email": "test@example.com",
                "password": "password123",
                "name": "Test User"
            })
            login_resp = await client.post("/auth/login", json={
                "email": "test@example.com",
                "password": "password123"
            })
        
        auth_token = login_resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {auth_token}"}

        # 2. Ensure we have a project and session
        projects_resp = await client.get("/projects/", headers=headers)
        projects = projects_resp.json()
        if not projects:
            await client.post("/projects/", headers=headers, json={"name": "Test Project", "url": "https://example.com"})
            projects_resp = await client.get("/projects/", headers=headers)
            projects = projects_resp.json()
        
        project = projects[0]
        
        sessions_resp = await client.get(f"/sessions/project/{project['id']}", headers=headers)
        sessions = sessions_resp.json()
        if not sessions:
            await client.post("/sessions/", headers=headers, json={"project_id": project["id"], "title": "Test Session"})
            sessions_resp = await client.get(f"/sessions/project/{project['id']}", headers=headers)
            sessions = sessions_resp.json()
            
        session = sessions[0]

        # 3. Create a share link
        share_resp = await client.post("/share-links/", headers=headers, json={
            "session_id": session["id"],
            "label": "QA Review Link",
            "can_comment": True
        })
        assert share_resp.status_code == 200
        share_data = share_resp.json()
        token = share_data["token"]
        share_id = share_data["id"]
        assert "review" in share_data["share_url"]

        # 4. Get info (Public)
        info_resp = await client.get(f"/share-links/{token}/info")
        assert info_resp.status_code == 200
        assert info_resp.json()["is_password_protected"] is False

        # 5. Resolve token (Public)
        resolve_resp = await client.post("/share-links/resolve", json={"token": token})
        assert resolve_resp.status_code == 200
        res_data = resolve_resp.json()
        assert res_data["session_id"] == session["id"]
        assert res_data["project_name"] == project["name"]

        # 6. Test Password Protection
        pwd_share_resp = await client.post("/share-links/", headers=headers, json={
            "session_id": session["id"],
            "label": "Protected Link",
            "password": "secure-password"
        })
        pwd_token = pwd_share_resp.json()["token"]

        # Resolve without password (should fail 403)
        bad_resolve = await client.post("/share-links/resolve", json={"token": pwd_token})
        assert bad_resolve.status_code == 403

        # Resolve with WRONG password (should fail 403)
        wrong_pwd = await client.post("/share-links/resolve", json={"token": pwd_token, "password": "wrong"})
        assert wrong_pwd.status_code == 403

        # Resolve with CORRECT password
        good_pwd = await client.post("/share-links/resolve", json={"token": pwd_token, "password": "secure-password"})
        assert good_pwd.status_code == 200

        # 7. Test Expiry
        expired_share_resp = await client.post("/share-links/", headers=headers, json={
            "session_id": session["id"],
            "expires_at": (datetime.utcnow() - timedelta(hours=1)).isoformat()
        })
        exp_token = expired_share_resp.json()["token"]
        
        exp_resolve = await client.post("/share-links/resolve", json={"token": exp_token})
        assert exp_resolve.status_code == 410

        # 8. List and Deactivate
        list_resp = await client.get(f"/share-links/session/{session['id']}", headers=headers)
        assert len(list_resp.json()) >= 2
        
        await client.delete(f"/share-links/{share_id}", headers=headers)
        
        # Resolve deleted link (should fail 404)
        del_resolve = await client.post("/share-links/resolve", json={"token": token})
        assert del_resolve.status_code == 404

        print("\n✓ Share Link Backend Tests Passed!")

if __name__ == "__main__":
    asyncio.run(test_share_link_lifecycle())
