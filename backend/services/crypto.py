"""
Crypto helpers for API key generation and verification.

Design: one-way SHA-256 hashing (irreversible). The raw token is returned
to the user ONCE and never stored. Only the hash lives in the DB.
"""
import hashlib
import hmac
import secrets


# ─── Token Generation ────────────────────────────────────────────────────────

def generate_token(nbytes: int = 32) -> str:
    """
    Generate a cryptographically-secure URL-safe token.
    Returns the raw token string (e.g. "pm_live_<random>").
    The prefix makes keys identifiable in logs / pastes.
    """
    raw = secrets.token_urlsafe(nbytes)
    return f"pm_{raw}"


# ─── One-Way Hash ─────────────────────────────────────────────────────────────

def hash_token(raw_token: str) -> str:
    """
    Returns the SHA-256 hex digest of the raw token.
    Stored in the DB; raw_token is never persisted.
    """
    return hashlib.sha256(raw_token.encode()).hexdigest()


def verify_token(raw_token: str, stored_hash: str) -> bool:
    """
    Constant-time comparison to prevent timing attacks.
    """
    computed = hash_token(raw_token)
    return hmac.compare_digest(computed, stored_hash)


# ─── Display Masking ──────────────────────────────────────────────────────────

def mask_token(raw_token: str, visible: int = 6) -> str:
    """
    Returns a masked version suitable for display in the UI.
    E.g.  "pm_abc…xyz"  (first <visible> chars + "…" + last <visible> chars)
    """
    if len(raw_token) <= visible * 2:
        return raw_token
    return f"{raw_token[:visible]}…{raw_token[-visible:]}"
