import asyncio
import httpx
import uuid

BASE_URL = "http://127.0.0.1:8765"

async def test_feedback_crud():
    async with httpx.AsyncClient(base_url=BASE_URL, timeout=10.0) as client:
        print("1. Log in or register user...")
        login_resp = await client.post("/auth/login", json={
            "email": "test@example.com",
            "password": "password123"
        })
        if login_resp.status_code != 200:
            await client.post("/auth/register", json={
                "email": "test@example.com",
                "password": "password123",
                "name": "Test User"
            })
            login_resp = await client.post("/auth/login", json={
                "email": "test@example.com",
                "password": "password123"
            })
        
        assert login_resp.status_code == 200
        auth_token = login_resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {auth_token}"}

        # Create a dedicated project for this test
        print("2. Creating dedicated test project...")
        proj_name = f"Feedback QA Project - {uuid.uuid4().hex[:6]}"
        proj_url = "https://opinvox.entrext.com"
        create_proj_resp = await client.post("/projects/", headers=headers, json={"name": proj_name, "url": proj_url})
        print("Create project status:", create_proj_resp.status_code)
        if create_proj_resp.status_code not in (200, 201):
            print("Project creation failed:", create_proj_resp.text)
            return
        project = create_proj_resp.json()
        project_id = project["id"]
        print(f"Created project: {project_id} with URL {proj_url}")
        
        # Create a dedicated session
        print("3. Creating dedicated test session...")
        create_sess_resp = await client.post("/sessions/", headers=headers, json={"project_id": project_id, "title": "Feedback QA Session"})
        print("Create session status:", create_sess_resp.status_code)
        if create_sess_resp.status_code not in (200, 201):
            print("Session creation failed:", create_sess_resp.text)
            return
        session = create_sess_resp.json()
        session_id = session["id"]
        print(f"Created session: {session_id}")

        # 4. Create Feedback Item (POST)
        print("4. Creating feedback item...")
        capture_payload = {
            "id": str(uuid.uuid4()),
            "status": "draft",
            "createdVia": "agent",
            "coordinates": {"pageX": 150, "pageY": 300, "viewportX": 150, "viewportY": 200},
            "target": {"tagName": "BUTTON", "text": "Click me", "selector": ".cta-button"},
            "screenshots": {"cropDataUrl": "data:image/png;base64,mock..."},
            "diagnostics": {"consoleErrors": [], "networkErrors": []},
            "viewport": {"width": 1024, "height": 768}
        }
        
        feedback_data = {
            "pageurl": "https://opinvox.entrext.com/home",
            "pagetitle": "OpinVox Home",
            "issuetype": "interaction",
            "priority": "high",
            "comment": "CTA button not clickable",
            "renderertype": "dom",
            "createdvia": "agent",
            "capturepayload": capture_payload
        }
        
        resp = await client.post(f"/sessions/{session_id}/feedback", json=feedback_data, headers=headers)
        print("Create response status:", resp.status_code)
        if resp.status_code != 201:
            print("Error details:", resp.text)
            return
            
        created_feedback = resp.json()
        print("Created feedback ID:", created_feedback["id"])
        assert created_feedback["status"] == "submitted"
        assert created_feedback["comment"] == "CTA button not clickable"
        
        # 5. List Feedback Items (GET)
        print("5. Listing feedback items...")
        list_resp = await client.get(f"/sessions/{session_id}/feedback", headers=headers)
        assert list_resp.status_code == 200
        items = list_resp.json()["items"]
        print(f"Total items found: {len(items)}")
        assert any(item["id"] == created_feedback["id"] for item in items)
        
        # Filter list by pageurl
        print("5b. Filtering feedback items by pageurl...")
        filter_resp = await client.get(f"/sessions/{session_id}/feedback?pageurl=https://opinvox.entrext.com/home", headers=headers)
        assert filter_resp.status_code == 200
        filtered_items = filter_resp.json()["items"]
        print(f"Filtered items found: {len(filtered_items)}")
        assert all(item["pageurl"] == "https://opinvox.entrext.com/home" for item in filtered_items)
        
        # 6. Get Single Feedback Item (GET)
        print("6. Getting single feedback item...")
        get_resp = await client.get(f"/sessions/{session_id}/feedback/{created_feedback['id']}", headers=headers)
        assert get_resp.status_code == 200
        single_item = get_resp.json()
        assert single_item["id"] == created_feedback["id"]
        
        # 7. Update Feedback Item (PATCH)
        print("7. Updating feedback item...")
        update_data = {
            "status": "resolved",
            "comment": "CTA button is fixed now",
            "priority": "low"
        }
        patch_resp = await client.patch(f"/sessions/{session_id}/feedback/{created_feedback['id']}", json=update_data, headers=headers)
        assert patch_resp.status_code == 200
        updated_item = patch_resp.json()
        assert updated_item["status"] == "resolved"
        assert updated_item["comment"] == "CTA button is fixed now"
        assert updated_item["priority"] == "low"
        print("Updated status successfully to resolved")

        # 8. SSRF & Domain Scope validation
        print("8. SSRF / Domain boundary security tests...")
        unsafe_ssrf = {
            "pageurl": "http://127.0.0.1:3000/home",
            "comment": "Should be rejected due to SSRF loopback",
            "capturepayload": capture_payload
        }
        ssrf_resp = await client.post(f"/sessions/{session_id}/feedback", json=unsafe_ssrf, headers=headers)
        print("SSRF response status:", ssrf_resp.status_code)
        assert ssrf_resp.status_code == 403 or ssrf_resp.status_code == 422 # 403 Forbidden or 422 Validation
        
        out_of_bounds = {
            "pageurl": "https://another-domain.com/home",
            "comment": "Should be rejected because domain is different",
            "capturepayload": capture_payload
        }
        oob_resp = await client.post(f"/sessions/{session_id}/feedback", json=out_of_bounds, headers=headers)
        print("OOB domain response status:", oob_resp.status_code)
        assert oob_resp.status_code == 403
        
        print("\nAll feedback CRUD and security checks PASSED!")

if __name__ == "__main__":
    asyncio.run(test_feedback_crud())
