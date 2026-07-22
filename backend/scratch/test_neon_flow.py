import httpx
import random
import sys

BASE_URL = "http://localhost:8765"

def test_integration():
    email = f"tester_{random.randint(1000, 9999)}@stage.dev"
    password = "SecurePassword123"
    name = "Neon QA Tester"

    print("--- Phase 1: Registering User ---")
    client = httpx.Client(base_url=BASE_URL, timeout=10.0)
    
    # 1. Register
    try:
        r = client.post("/auth/register", json={"email": email, "password": password, "name": name})
        print(f"Register status: {r.status_code}")
        print(f"Register response: {r.text}")
        assert r.status_code == 200, "Registration failed"
        token_data = r.json()
        token = token_data["access_token"]
        assert token, "No access token in response"
    except Exception as e:
        print(f"Registration/Connection failed: {e}")
        sys.exit(1)

    # 2. Login
    print("\n--- Phase 2: Logging in User ---")
    r = client.post("/auth/login", json={"email": email, "password": password})
    print(f"Login status: {r.status_code}")
    assert r.status_code == 200, "Login failed"
    token = r.json()["access_token"]

    # Authenticated client headers
    headers = {"Authorization": f"Bearer {token}"}

    # 3. GET /auth/me
    print("\n--- Phase 3: Getting User Details (/auth/me) ---")
    r = client.get("/auth/me", headers=headers)
    print(f"Me status: {r.status_code}")
    print(f"Me body: {r.text}")
    assert r.status_code == 200, "Failed to fetch me"

    # 4. Create Project
    print("\n--- Phase 4: Creating Project ---")
    r = client.post("/projects/", headers=headers, json={"name": "Neon Test Project", "url": "https://stage.dev"})
    print(f"Create project status: {r.status_code}")
    print(f"Create project response: {r.text}")
    assert r.status_code == 200, "Project creation failed"
    project_id = r.json()["id"]

    # 5. List Projects
    print("\n--- Phase 5: Listing Projects ---")
    r = client.get("/projects/", headers=headers)
    print(f"List projects status: {r.status_code}")
    print(f"List projects body: {r.text}")
    assert r.status_code == 200, "Listing projects failed"
    assert any(p["id"] == project_id for p in r.json()), "Created project not listed"

    # 6. Create Session
    print("\n--- Phase 6: Creating Session ---")
    r = client.post("/sessions/", headers=headers, json={"project_id": project_id, "title": "Initial Bug Hunting"})
    print(f"Create session status: {r.status_code}")
    print(f"Create session response: {r.text}")
    assert r.status_code == 200, "Session creation failed"
    session_id = r.json()["id"]

    # 7. Create Marker
    print("\n--- Phase 7: Creating Marker ---")
    marker_payload = {
        "session_id": session_id,
        "title": "Broken CSS Button Alignment",
        "description": "The login button is shifted to the left by 10px on small screens.",
        "url": "https://stage.dev/login",
        "xpath": "//button[@id='login']",
        "css_selector": "#login",
        "inner_text": "Sign In",
        "viewport": {"width": 375, "height": 812},
        "browser": "Chrome Mobile",
        "os": "iOS",
        "scroll_position": {"x": 0, "y": 120},
        "console_errors": [{"level": "error", "message": "Failed to load resource: the server responded with a status of 404"}],
        "network_errors": []
    }
    r = client.post("/markers/", headers=headers, json=marker_payload)
    print(f"Create marker status: {r.status_code}")
    print(f"Create marker response: {r.text}")
    assert r.status_code == 200, "Marker creation failed"
    marker_id = r.json()["id"]

    # 8. List Markers
    print("\n--- Phase 8: Listing Markers for Session ---")
    r = client.get(f"/markers/session/{session_id}", headers=headers)
    print(f"List markers status: {r.status_code}")
    print(f"List markers response: {r.text}")
    assert r.status_code == 200, "Listing markers failed"
    assert len(r.json()) > 0, "No markers found in session"
    assert r.json()[0]["id"] == marker_id, "Marker ID mismatch"

    print("\n=============================================")
    print("ALL SMOKE TESTS PASSED FLAWLESSLY ON NEON DB!")
    print("=============================================")

if __name__ == "__main__":
    test_integration()
