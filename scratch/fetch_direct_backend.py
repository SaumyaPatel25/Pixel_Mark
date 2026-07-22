import httpx

def main():
    session_id = "6ba1f9ed-13e7-4056-a54c-c101bdeefc3e"
    url = f"https://stage-production.up.railway.app/proxy/session/{session_id}"
    print(f"Fetching from {url}...")
    headers = {"Cache-Control": "no-cache", "Pragma": "no-cache"}
    resp = httpx.get(url, headers=headers, follow_redirects=True)
    print(f"Status: {resp.status_code}")
    print("Is redirect injected?")
    print("window.location.pathname.startsWith" in resp.text)
    
    # Save to file to inspect
    with open("scratch/verified_proxied.html", "w", encoding="utf-8") as f:
        f.write(resp.text)
    print("Saved to scratch/verified_proxied.html")

if __name__ == "__main__":
    main()
