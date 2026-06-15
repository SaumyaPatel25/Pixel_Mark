import httpx

def main():
    session_id = "6ba1f9ed-13e7-4056-a54c-c101bdeefc3e"
    url = f"https://pixelmark-production.up.railway.app/proxy/session/{session_id}"
    print(f"Sending GET request to: {url}...")
    
    resp = httpx.get(url, follow_redirects=True, timeout=20.0, verify=False)
    print(f"Response Status Code: {resp.status_code}")
    print("Response Headers:")
    for k, v in resp.headers.items():
        print(f"  {k}: {v}")
    
    print("\nResponse Body Snippet (first 500 chars):")
    print(resp.text[:500])

if __name__ == "__main__":
    main()
