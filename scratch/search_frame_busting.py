import httpx
import re

def main():
    # Let's list some key script URLs from webrox.xyz
    base = "https://webrox.xyz"
    scripts = [
        "/_next/static/chunks/0po.6l55co2_7.js",
        "/_next/static/chunks/0ct528hfsylh3.js",
        "/_next/static/chunks/0~rnrpz-e-o0m.js",
        "/_next/static/chunks/110q6k5sdl4es.js",
        "/_next/static/chunks/turbopack-10dj~~s215u99.js",
        "/_next/static/chunks/0dbhjjzl8qfwv.js",
        "/_next/static/chunks/0f4_~~ud61h2f.js",
        "/_next/static/chunks/0j1w6lvnwprxw.js",
        "/_next/static/chunks/0jj_v49jcsdmx.js"
    ]
    
    patterns = [
        r"window\.top",
        r"window\.parent",
        r"self\s*!==\s*top",
        r"self\s*!==\s*window\.top",
        r"parent\s*!==\s*self",
        r"window\.location\s*===\s*window\.top\.location",
        r"\.location\.href",
        r"\.location\.hostname"
    ]
    
    print("Scanning webrox.xyz JS scripts for frame checks...")
    for path in scripts:
        url = f"{base}{path}"
        try:
            resp = httpx.get(url, timeout=10.0)
            if resp.status_code == 200:
                js_content = resp.text
                for pattern in patterns:
                    matches = re.findall(pattern, js_content)
                    if matches:
                        print(f"🔥 Found pattern '{pattern}' in {path} ({len(matches)} times)!")
        except Exception as e:
            print(f"Failed to fetch {url}: {e}")

if __name__ == "__main__":
    main()
