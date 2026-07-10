import httpx
import json
import uuid

BASE_URL = "http://127.0.0.1:8000"
TOKEN_VALID = "VALID_TOKEN"
TOKEN_INVALID = "INVALID_TOKEN"
TOKEN_EXPIRED = "EXPIRED_TOKEN"
PID_VALID = "11111111-1111-4111-8111-111111111111"
SHARE_TOKEN_VALID = "mock-token-123"

def run_tests():
    total = 0
    passed = 0
    
    def assert_test(id, name, condition, details=""):
        nonlocal total, passed
        total += 1
        if condition:
            passed += 1
            print(f"PASS {id}: {name}")
        else:
            print(f"FAIL {id}: {name} (FAILED: {details})")

    with httpx.Client(base_url=BASE_URL, timeout=5.0) as client:
        # ─── PHASE 1: STARTUP ───
        r = client.get("/health")
        assert_test("HLT-001", "Health endpoint", r.status_code == 200, r.status_code)

        r = client.options("/projects/", headers={"Origin": "http://localhost:3000", "Access-Control-Request-Method": "GET"})
        assert_test("SEC-001", "CORS local 3000", "localhost:3000" in r.headers.get("access-control-allow-origin", ""), r.headers)

        r = client.options("/projects/", headers={"Origin": "http://evil.com", "Access-Control-Request-Method": "GET"})
        assert_test("SEC-003", "CORS block unknown origin", r.headers.get("access-control-allow-origin") is None, r.headers)

        # ─── PHASE 2: AUTH ───
        r = client.get("/projects/")
        assert_test("AUT-001", "Missing Auth Header", r.status_code == 401, r.status_code)

        r = client.get("/projects/", headers={"Authorization": f"Bearer {TOKEN_EXPIRED}"})
        assert_test("AUT-003", "Expired Token", r.status_code == 401, r.status_code)

        r = client.get("/projects/", headers={"Authorization": f"Bearer {TOKEN_VALID}"})
        assert_test("AUT-004", "Valid Token", r.status_code == 200, r.status_code)

        r = client.post("/projects/", json={"name": "Test", "target_url": "https://a.com"})
        assert_test("AUT-006", "Anon Create Blocked", r.status_code == 401, r.status_code)

        # ─── PHASE 3: CRUD Validations ───
        r = client.post("/projects/", headers={"Authorization": f"Bearer {TOKEN_VALID}"}, json={"name": "", "target_url": "https://a.com"})
        assert_test("PRJ-002", "Empty name rejected", r.status_code in [422, 400], r.status_code)

        # 300 chars
        long_name = "A" * 300
        r = client.post("/projects/", headers={"Authorization": f"Bearer {TOKEN_VALID}"}, json={"name": long_name, "target_url": "https://a.com"})
        assert_test("PRJ-004", "Long name rejected", r.status_code in [422, 400], r.status_code)

        r = client.post("/projects/", headers={"Authorization": f"Bearer {TOKEN_VALID}"}, json={"name": "App", "target_url": "ftp://example.com"})
        assert_test("PRJ-005", "FTP target rejected", r.status_code in [422, 400], r.status_code)

        r = client.get(f"/projects/by-id/invalid-uuid/", headers={"Authorization": f"Bearer {TOKEN_VALID}"})
        assert_test("PRJ-011", "Malformed UUID Read", r.status_code in [422, 400], r.status_code)

        # ─── PHASE 4: PUBLIC TESTER ───
        r = client.get(f"/projects/by-token/{SHARE_TOKEN_VALID}/")
        assert_test("PUB-001", "Valid public token", r.status_code == 200, r.status_code)

        r = client.get("/projects/by-token/fake-token/")
        assert_test("PUB-002", "Invalid public token", r.status_code in [404, 422], r.text)

        # ─── PHASE 5: COMMENTS ───
        r = client.post("/comments/", json={"project_id": PID_VALID, "text": "hello", "selector": "body", "x": 0, "y": 0})
        assert_test("CMT-001", "Valid anon comment", r.status_code in [201, 200], r.status_code)

        r = client.post("/comments/", json={"text": "hello", "selector": "body", "x": 0, "y": 0})
        assert_test("CMT-002", "Missing PID in comment", r.status_code == 422, r.status_code)

        r = client.post("/comments/", json={"project_id": PID_VALID, "selector": "body", "x": 0, "y": 0})
        assert_test("CMT-004", "Missing text in comment", r.status_code == 422, r.status_code)

        # ─── PHASE 6: PROXY SSRF ───
        r = client.get("/proxy?url=https://example.com")
        assert_test("PRX-001", "Proxy valid URL success", r.status_code == 200, r.status_code)

        r = client.get("/proxy?url=http://127.0.0.1/admin")
        assert_test("PRX-002", "Proxy loopback blocked", r.status_code == 400, r.status_code)

        r = client.get("/proxy?url=http://169.254.169.254/lastest")
        assert_test("PRX-004", "Proxy AWS Metadata blocked", r.status_code == 400, r.status_code)

        r = client.get("/proxy?url=file:///etc/passwd")
        assert_test("PRX-006", "Proxy bad scheme blocked", r.status_code == 400, r.status_code)

        # ─── PHASE 7: EXPORT ───
        r = client.get(f"/export?project_id={PID_VALID}", headers={"Authorization": f"Bearer {TOKEN_VALID}"})
        assert_test("EXP-001", "Export authenticated", r.status_code == 200, r.status_code)

        r = client.get(f"/export?project_id={PID_VALID}")
        assert_test("EXP-002", "Export unauth denied", r.status_code == 401, r.status_code)

        # ─── PHASE 9: ABUSE / ERRORS ───
        r = client.post("/projects/", headers={"Authorization": f"Bearer {TOKEN_VALID}"}, data="[bad json}")
        assert_test("ABU-005", "Structured 422 instead of 500", r.status_code == 422, r.status_code)

    print(f"\nTotal: {total} | Passed: {passed} | SCORE: {int((passed/total)*100)}%")

if __name__ == "__main__":
    run_tests()
