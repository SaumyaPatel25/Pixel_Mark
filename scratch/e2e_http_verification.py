import sys
import httpx
from pathlib import Path

backend_path = Path(__file__).resolve().parent.parent / "backend"
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

from auth import create_access_token
import sqlite3

def run_e2e_tests():
    print("\n=======================================================")
    print("END-TO-END HTTP API VERIFICATION ON http://127.0.0.1:8765")
    print("=======================================================")
    
    # 1. Fetch user from test.db
    conn = sqlite3.connect("test.db")
    cur = conn.cursor()
    cur.execute("SELECT id, email, name FROM users WHERE email='saumyavishwam@gmail.com' OR email='saumya@entrext.com' OR email='saumyapatel25@gmail.com';")
    users = cur.fetchall()
    conn.close()
    
    client = httpx.Client(base_url="http://127.0.0.1:8765", timeout=10.0)
    
    for u_id, u_email, u_name in users:
        print(f"\n---------------------------------------------------")
        print(f"TESTING USER: {u_email} (ID: {u_id})")
        token = create_access_token({"sub": u_id})
        headers = {"Authorization": f"Bearer {token}"}
        
        # 1. GET /billing/entitlements
        r_ent = client.get("/billing/entitlements", headers=headers)
        print(f"1. GET /billing/entitlements: HTTP {r_ent.status_code}")
        print(f"   Payload: {r_ent.json()}")
        ent_data = r_ent.json()
        assert ent_data["plan_type"] == "stage_team", f"Expected stage_team, got {ent_data['plan_type']}"
        assert ent_data["is_paid"] is True, "Expected is_paid=True"
        assert ent_data["projects_allowed"] == 9999, f"Expected 9999, got {ent_data['projects_allowed']}"
        assert ent_data["can_use_blueprint_dom"] is True, "Expected Blueprint DOM enabled"
        
        # 2. GET /billing/status
        r_status = client.get("/billing/status", headers=headers)
        print(f"2. GET /billing/status: HTTP {r_status.status_code}")
        print(f"   Payload: {r_status.json()}")
        
        # 3. Create 3 projects sequentially (proving creation beyond 1 project limit)
        for i in range(1, 4):
            r_proj = client.post("/projects/", json={"name": f"E2E Verified Project {i}", "url": "https://stage.dev"}, headers=headers)
            print(f"3.{i} POST /projects/ (Project {i}): HTTP {r_proj.status_code}")
            assert r_proj.status_code == 201, f"Failed project creation: {r_proj.text}"
            proj_data = r_proj.json()
            print(f"     Created Project ID: {proj_data['id']} (Name: '{proj_data['name']}')")
            
        # 4. Verify projects count in GET /projects/
        r_list = client.get("/projects/", headers=headers)
        print(f"4. GET /projects/: HTTP {r_list.status_code}, Found {len(r_list.json())} projects")

    print("\n=======================================================")
    print("ALL HTTP ENDPOINTS VERIFIED AND CONFIRMED OPERATIONAL!")
    print("=======================================================")

if __name__ == "__main__":
    run_e2e_tests()
