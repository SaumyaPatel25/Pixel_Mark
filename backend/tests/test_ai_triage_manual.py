import requests
import json

EMAIL = "test_ai_triage@example.com"
PASSWORD = "password123"
BASE_URL = "http://localhost:8765"

def test_ai_endpoints():
    print("=== 1. Login ===")
    res = requests.post(f"{BASE_URL}/auth/login", json={"email": EMAIL, "password": PASSWORD})
    if res.status_code != 200:
        print("Login failed!", res.text)
        return
        
    token = res.json().get("access_token")
    headers = {"Authorization": f"Bearer {token}"}
    print(f"Logged in successfully. Token: {token[:10]}...")

    print("\n=== 2. Find Session with Markers ===")
    sessions_res = requests.get(f"{BASE_URL}/sessions/project/some_id", headers=headers)
    # The instruction says: GET http://localhost:8765/sessions
    # But PixelMark has GET /sessions/project/{project_id}.
    # Let me just use the hardcoded session ID I found that has 20 markers: '56daf2dc-714d-4c8f-ad57-0481ca31fd77'
    session_id = '56daf2dc-714d-4c8f-ad57-0481ca31fd77'
    print(f"Using Session ID: {session_id}")

    print("\n=== 3. Triage Endpoint ===")
    triage_res = requests.post(f"{BASE_URL}/ai/triage/session/{session_id}", headers=headers)
    print("Status Code:", triage_res.status_code)
    if triage_res.status_code == 200:
        triage_data = triage_res.json()
        print("triaged_count:", triage_data.get("triaged_count"))
        print("session_summary:", triage_data.get("session_summary"))
        print("First 2 marker results:")
        for m in triage_data.get("markers", [])[:2]:
            print(f"  - ID: {m.get('id')}, Priority: {m.get('priority')}, Summary: {m.get('ai_summary')}")
    else:
        print("Triage Failed:", triage_res.text)

    print("\n=== 4. Summary Endpoint ===")
    summary_res = requests.get(f"{BASE_URL}/ai/summary/session/{session_id}", headers=headers)
    print("Status Code:", summary_res.status_code)
    if summary_res.status_code == 200:
        summary_data = summary_res.json()
        print("overall_health:", summary_data.get("overall_health"))
        print("total_markers:", summary_data.get("total_markers"))
        print("session_summary:", summary_data.get("session_summary"))
        print("Top Issues:")
        for issue in summary_data.get("top_issues", []):
            print(f"  - {issue}")
    else:
        print("Summary Failed:", summary_res.text)

if __name__ == "__main__":
    test_ai_endpoints()
