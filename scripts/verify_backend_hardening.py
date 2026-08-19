import httpx
import json
import uuid
import asyncio

BASE_URL = "http://127.0.0.1:8765"

async def test_endpoint(name, method, path, data=None):
    url = f"{BASE_URL}{path}"
    print(f"\n--- Testing: {name} ---")
    async with httpx.AsyncClient(timeout=10) as client:
        try:
            if method == "POST":
                resp = await client.post(url, json=data)
            elif method == "GET":
                resp = await client.get(url, params=data)
            else:
                return
                
            print(f"Status: {resp.status_code}")
            if resp.status_code != 200 and resp.status_code != 201:
                # Truncate large error output like validation details
                error_text = resp.text[:500] if len(resp.text) > 500 else resp.text
                print(f"Response: {error_text}")
            else:
                print("Success!")
            return resp.status_code
        except Exception as e:
            print(f"Failed to connect: {e}")
            return None

async def main():
    results = []
    
    # 1. Empty name - Expect 422
    results.append(await test_endpoint("Empty Name", "POST", "/projects/", {"name": "", "target_url": "https://example.com"}) == 422)
    
    # 2. Bad URL scheme - Expect 422
    results.append(await test_endpoint("Bad URL Scheme", "POST", "/projects/", {"name": "Test", "target_url": "javascript:alert(1)"}) == 422)
    
    # 3. Coordinate out of range - Expect 422
    results.append(await test_endpoint("Coordinate Out of Range", "POST", "/comments/", {
        "project_id": "00000000-0000-4000-8000-000000000000", # Fixed UUID4 for consistency
        "text": "test", 
        "x": 999
    }) == 422)
    
    # 4. Localhost Proxy - Expect 400
    results.append(await test_endpoint("Localhost Proxy", "GET", "/proxy", {"url": "http://127.0.0.1"}) == 400)
    
    # 5. IPv6 Proxy - Expect 400
    results.append(await test_endpoint("IPv6 Proxy", "GET", "/proxy", {"url": "http://[::1]/"}) == 400)
    
    # 6. Metadata Proxy - Expect 400
    results.append(await test_endpoint("Metadata Proxy", "GET", "/proxy", {"url": "http://169.254.169.254"}) == 400)
    
    # 7. Valid Project - Expect 201
    results.append(await test_endpoint("Valid Project", "POST", "/projects/", {"name": "Valid Project", "target_url": "https://example.com"}) == 201)

    print("\n" + "="*20)
    if all(results):
        print("ALL TESTS PASSED!")
    else:
        print(f"SOME TESTS FAILED: {results}")

if __name__ == "__main__":
    asyncio.run(main())
