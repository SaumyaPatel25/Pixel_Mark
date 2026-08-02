import socket
import urllib.request

def check_port(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(1.0)
        return s.connect_ex(('127.0.0.1', port)) == 0

def check_http(url):
    try:
        resp = urllib.request.urlopen(url, timeout=2.0)
        return resp.getcode()
    except Exception as e:
        return str(e)

print(f"Backend (8765) port open: {check_port(8765)}")
print(f"Frontend (3000) port open: {check_port(3000)}")
print(f"Backend HTTP: {check_http('http://127.0.0.1:8765/health')}")
print(f"Frontend HTTP: {check_http('http://127.0.0.1:3000/')}")
