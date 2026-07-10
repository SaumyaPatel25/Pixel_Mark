import requests

BASE_URL = "http://localhost:8765"
EMAIL = "test_ai_triage@example.com"
PASSWORD = "password123"

def get_token():
    r = requests.post(f"{BASE_URL}/auth/login", json={"email": EMAIL, "password": PASSWORD})
    if r.status_code != 200:
        print("Login failed!", r.text)
        return None
    return r.json()["access_token"]

def main():
    token = get_token()
    if not token:
        return
    headers = {"Authorization": f"Bearer {token}"}

    print("\n--- 1. List (empty) ---")
    r = requests.get(f"{BASE_URL}/ai/providers", headers=headers)
    print(r.status_code, r.json())

    print("\n--- 2. Create openai-compatible ---")
    r = requests.post(
        f"{BASE_URL}/ai/providers", 
        headers=headers,
        json={
            "provider": "openai_compatible",
            "display_name": "My Custom Provider",
            "api_key": "sk-dummy-custom",
            "base_url": "https://api.custom.com/v1",
            "model_name": "custom-model"
        }
    )
    print(r.status_code, r.json())
    config_id = r.json().get("id")

    print("\n--- 3. List ---")
    r = requests.get(f"{BASE_URL}/ai/providers", headers=headers)
    print(r.status_code, r.json())

    print("\n--- 4. Update ---")
    r = requests.patch(
        f"{BASE_URL}/ai/providers/{config_id}",
        headers=headers,
        json={"display_name": "Updated Provider"}
    )
    print(r.status_code, r.json())

    print("\n--- 5. Test ---")
    r = requests.post(f"{BASE_URL}/ai/providers/{config_id}/test", headers=headers)
    print(r.status_code, r.json())

    print("\n--- 6. Delete ---")
    r = requests.delete(f"{BASE_URL}/ai/providers/{config_id}", headers=headers)
    print(r.status_code, r.json())

    print("\n--- 7. List (should be empty again) ---")
    r = requests.get(f"{BASE_URL}/ai/providers", headers=headers)
    print(r.status_code, r.json())

if __name__ == "__main__":
    main()
