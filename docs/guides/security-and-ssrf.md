# Security and Privacy

This document outlines the security architecture, data isolation practices, SSRF protections, and CORS rules built into STAGE.

---

## 1. Authentication and Secret Storage
STAGE supports multiple security authentication options depending on the client scope:

- **JWT Tokens**: HS256 JWT tokens containing `sub` (User ID) and expiry fields. Signatures are signed using `JWT_SECRET_KEY` on the server and verified by the frontend layout guards.
  - *Evidence: backend/auth.py*
- **API Keys**: User-generated tokens prefixed with `pm_...`. In the database table `api_keys`, the backend stores only the SHA-256 hashed value (`token_hash`) and a masked string (`masked_token` e.g. `pm_test...1a2b`).
  - *Evidence: backend/routers/settings.py:53-68*
- **Database Config Encryption**: AI provider credentials and keys are encrypted at rest using Fernet symmetric encryption keys.

---

## 2. SSRF (Server-Side Request Forgery) Protections
Because the proxy middleware (`backend/routes/proxy.py`) requests arbitrary URLs on behalf of users, strict SSRF blocks are implemented:
- **SSRF Guard (`backend/utils/ssrf_guard.py`)**:
  - Resolves target hostnames using `socket.getaddrinfo`.
  - Enforces checks on IP addresses, rejecting private ranges (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), loopbacks (`127.0.0.1`, `::1`), and link-local ranges (`169.254.0.0/16`).
  - Allows loopback address resolutions only in development environments (`DEBUG=True`).
  - *Evidence: backend/utils/ssrf_guard.py:10-32*

---

## 3. Domain Locking and Scope Restrictions
To prevent review sessions from escaping into external targets:
- **Domain Scope Checks (`is_domain_allowed`)**:
  - Verifies that target assets or clicked navigation URLs match the project's base URL domain or subdomain.
  - Whitelists common asset CDNs (Cloudflare, Tailwind CSS, Google Fonts, unpkg) for static assets loading.
  - If a user clicks a link that leaves the allowed domain scopes, the proxy rewriter blocks the request and returns a `403 Forbidden`.
  - *Evidence: backend/utils/ssrf_guard.py:34-48*

---

## 4. X-Frame-Options and Frame Prevention Header Stripping
Because standard sites prevent being loaded inside iframes using browser security headers, the proxy fallback rewriter dynamically modifies responses:
- **Headers Stripped**:
  - `X-Frame-Options`
  - `Content-Security-Policy` (CSP) directives containing `frame-ancestors` or `sandbox` restrictions.
  - `X-Content-Type-Options` (under specific MIME matches).
- **MIME Security Enforcement**: Rewritten assets inherit correct `Content-Type` headers to prevent browser MIME-sniffing exploits.
- *Evidence: backend/main.py:270-310*

---

## 5. Client Data Isolation and CORS Rules
- **Organization Boundaries**: All projects, sessions, and markers database queries enforce scoping parameters (`org_id`). API routes ensure users cannot query resources outside their organization membership.
  - *Evidence: backend/dependencies.py:55-80*
- **CORS Middlewares (`CORSMiddleware`)**:
  - Configures allowed origins to match trusted domains.
  - Supports credential transfers (cookies and auth headers) for WebSocket handshakes.
  - *Evidence: backend/main.py:68-84*
- **XSS Protections**: Click coordinates and DOM excerpt strings are stored as text and escaped in React outputs, preventing script injections via annotation payloads.
- **Review Mode Password Gates**: Share link endpoints support bcrypt password hashes checks to gate access to guest workspaces.
  - *Evidence: backend/models/share_link.py*
