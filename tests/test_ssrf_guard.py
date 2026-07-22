import pytest
import os
os.environ["RUNNING_SSRF_TEST"] = "true"
from utils.ssrf_guard import is_ssrf_safe, is_domain_allowed

def test_ssrf_guard_ip_blocking():
    # 1. Blocks localhost/loopbacks
    assert not is_ssrf_safe("http://127.0.0.1")
    assert not is_ssrf_safe("http://localhost/home")
    assert not is_ssrf_safe("http://[::1]")
    
    # 2. Blocks private subnets
    assert not is_ssrf_safe("http://192.168.1.1/dashboard")
    assert not is_ssrf_safe("https://10.0.0.5/admin")
    assert not is_ssrf_safe("http://172.16.2.3")
    
    # 3. Allows valid public URLs
    assert is_ssrf_safe("https://example.com")
    assert is_ssrf_safe("http://8.8.8.8")

def test_ssrf_guard_domain_scoping():
    base_url = "https://originalsite.com"
    
    # 1. Allows same domain / subdomains
    assert is_domain_allowed("https://originalsite.com/home", base_url)
    assert is_domain_allowed("http://originalsite.com/about", base_url)
    assert is_domain_allowed("https://sub.originalsite.com/page", base_url)
    
    # 2. Rejects off-domain transitions
    assert not is_domain_allowed("https://evilsite.com", base_url)
    assert not is_domain_allowed("https://google.com/search", base_url)
    
    # 3. Asset exceptions
    assert is_domain_allowed("https://cdnjs.cloudflare.com/ajax/libs/react/umd.js", base_url, is_asset=True)
    assert not is_domain_allowed("https://evilsite.com/image.png", base_url, is_asset=True)
