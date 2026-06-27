import os
import logging
from cryptography.fernet import Fernet

logger = logging.getLogger(__name__)

# Load the secret encryption key from env
ENCRYPTION_KEY = os.getenv("PROVIDER_SECRETS_ENCRYPTION_KEY")

# Static fallback key for local development to prevent server crashes
DEV_FALLBACK_KEY = "JG1-aTZ2ATkfy6agszAkONP0F9PQE2Gmu4diCJL9H3s="

_fernet = None

if ENCRYPTION_KEY:
    try:
        _fernet = Fernet(ENCRYPTION_KEY.encode())
    except Exception as e:
        logger.error(
            f"Invalid PROVIDER_SECRETS_ENCRYPTION_KEY format. "
            f"Falling back to dev key. Error: {e}"
        )
        _fernet = Fernet(DEV_FALLBACK_KEY.encode())
else:
    logger.warning(
        "PROVIDER_SECRETS_ENCRYPTION_KEY is not set! "
        "Using development fallback key. DO NOT run in production like this."
    )
    _fernet = Fernet(DEV_FALLBACK_KEY.encode())


def encrypt_secret(raw: str) -> str:
    """Encrypt a raw API key string using Fernet symmetric encryption."""
    if not raw:
        return ""
    try:
        return _fernet.encrypt(raw.encode()).decode()
    except Exception as e:
        logger.error(f"Failed to encrypt secret: {e}")
        # Never raise raw key in errors
        raise RuntimeError("Secret encryption failed") from None


def decrypt_secret(ciphertext: str) -> str:
    """
    Decrypt a ciphertext API key using Fernet.
    If decryption fails, falls back to returning the ciphertext as-is (legacy plaintext support).
    """
    if not ciphertext:
        return ""
    try:
        return _fernet.decrypt(ciphertext.encode()).decode()
    except Exception as e:
        # Backward compatibility fallback: if decryption fails (e.g. invalid Fernet token),
        # treat the stored value as legacy plain text.
        # TODO: Run migrate_provider_keys.py script to encrypt legacy rows later.
        logger.debug(
            f"Decryption failed, treating value as legacy plain-text: {e}"
        )
        return ciphertext


def mask_secret(key: str) -> str:
    """Mask a secret key to prevent accidental leakage in logs/forms/responses."""
    if not key:
        return ""
    if len(key) <= 8:
        return "sk-..."
    # Keep sk-...abcd style masking
    prefix = key[:3]
    suffix = key[-4:]
    return f"{prefix}...{suffix}"
