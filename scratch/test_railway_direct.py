import httpx
import uuid

RAILWAY_URL = "https://pixelmark-production.up.railway.app"

def main():
    email = f"qatest_{uuid.uuid4().hex[:6]}@pixelmark.dev"
    with httpx.Client(timeout=10) as client:
        # Register
        resp = client.post(
            f"{RAILWAY_URL}/auth/register",
            json={"email": email, "password": "QaTest1234!", "name": "Chain Tester"}
        )
        assert resp.status_code == 200
        token = resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Create Project
        response = client.post(
            f"{RAILWAY_URL}/projects/",
            json={"name": "QA Project", "url": "https://staging.test.com"},
            headers=headers
        )
        project_id = response.json()["id"]

        # Create Session
        response = client.post(
            f"{RAILWAY_URL}/sessions/",
            json={"project_id": project_id, "title": "QA Session"},
            headers=headers
        )
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
            "severity": "medium",
            "priority": "high"
        }
        response = client.post(f"{RAILWAY_URL}/markers/", json=marker_data, headers=headers)
        if response.status_code == 200:
            priority = response.json().get("priority")
            print(f"DEPLOY STATUS: Received priority = '{priority}' (expected 'high' if deployed, 'medium' if old version)")
        else:
            print(f"Error: {response.status_code} - {response.text}")

if __name__ == "__main__":
    main()
