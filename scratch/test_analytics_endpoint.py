import httpx
import time

def main():
    base_url = "https://stage-production.up.railway.app"
    email = f"analytics_test_{int(time.time())}@stage.dev"
    password = "Password123!"
    
    print(f"Registering user {email}...")
    resp = httpx.post(f"{base_url}/auth/register", json={
        "email": email,
        "password": password,
        "name": "Analytics Tester"
    })
    print(f"Register Status: {resp.status_code}")
    
    print("Logging in...")
    resp = httpx.post(f"{base_url}/auth/login", json={
        "email": email,
        "password": password
    })
    print(f"Login Status: {resp.status_code}")
    token = resp.json().get("access_token")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    print("Creating project...")
    resp = httpx.post(f"{base_url}/projects/", json={
        "name": "Analytics Verification Project",
        "url": "https://example.com"
    }, headers=headers)
    print(f"Create Project Status: {resp.status_code}")
    project_id = resp.json().get("id")
    
    print(f"Querying analytics for project {project_id}...")
    resp = httpx.get(f"{base_url}/projects/{project_id}/analytics", headers=headers)
    print(f"Analytics Status Code: {resp.status_code}")
    print("Analytics Response Body:")
    print(resp.json())

if __name__ == "__main__":
    main()
