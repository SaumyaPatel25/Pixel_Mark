import urllib.request

class NoRedirectHandler(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, hdrs, newurl):
        # Prevent redirecting, just return the redirect URL
        raise urllib.request.HTTPError(newurl, code, msg, hdrs, fp)

opener = urllib.request.build_opener(NoRedirectHandler)
try:
    response = opener.open("http://127.0.0.1:8765/auth/oauth/github/start")
    print("No redirect, status:", response.status)
except urllib.request.HTTPError as e:
    print("Redirecting to:", e.url)
except Exception as ex:
    print("Error:", ex)
