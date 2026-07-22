import httpx
import uuid

RAILWAY_URL = "https://stage-production.up.railway.app"

def main():
    email = f"qatest_{uuid.uuid4().hex[:6]}@stage.dev"
    with httpx.Client(timeout=10) as client:
        # Register
        resp = client.post(
            f"{RAILWAY_URL}/auth/register",
            json={"email": email, "password": "QaTest1234!", "name": "Chain Tester"}
        )
        assert resp.status_code == 200, f"Register failed: {resp.text}"
        token = resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Create Project
        response = client.post(
            f"{RAILWAY_URL}/projects/",
            json={"name": "QA Project", "url": "https://staging.test.com"},
            headers=headers
        )
        assert response.status_code in [200, 201], f"Project creation failed: {response.text}"
        project_id = response.json()["id"]

        # Create Session
        response = client.post(
            f"{RAILWAY_URL}/sessions/",
            json={"project_id": project_id, "title": "QA Session"},
            headers=headers
        )
        assert response.status_code in [200, 201], f"Session creation failed: {response.text}"
        session_id = response.json()["id"]

        # Create Marker
        marker_data = {
            "session_id": session_id,
            "title": "Button broken on mobile",
            "description": "Submit button misaligned",
            "url": "https://staging.test.com/checkout",
            "xpath": "/html/body/div/main/button",
            "css_selector": "#submit-btn",
            "inner_text": "Submit",
            "viewport": {"width": 375, "height": 812},
            "browser": "Safari",
            "os": "iOS 17",
            "scroll_position": {"x": 0, "y": 320},
            "console_errors": ["TypeError: null is not an object"],
            "network_errors": [{"url": "/api/order", "status": 500}],
            "priority": "high"
        }
        response = client.post(f"{RAILWAY_URL}/markers/", json=marker_data, headers=headers)
        print(f"Create Marker Status Code: {response.status_code}")
        if response.status_code != 200:
            print(f"Create Marker Response: {response.text}")
            return
        marker_id = response.json()["id"]

        # List Markers
        response = client.get(f"{RAILWAY_URL}/markers/session/{session_id}", headers=headers)
        print(f"List Markers Status Code: {response.status_code}")
        print(f"List Markers Response: {response.text}")

        # Update Marker Status to in_progress
        response = client.patch(
            f"{RAILWAY_URL}/markers/{marker_id}",
            json={"status": "in_progress"},
            headers=headers
        )
        print(f"Patch Marker Status Code: {response.status_code}")
        print(f"Patch Marker Response: {response.text}")

        # Update Marker Priority to critical
        response = client.patch(
            f"{RAILWAY_URL}/markers/{marker_id}",
            json={"priority": "critical"},
            headers=headers
        )
        print(f"Patch Marker Priority Status Code: {response.status_code}")
        print(f"Patch Marker Priority Response: {response.text}")

if __name__ == "__main__":
    main()
