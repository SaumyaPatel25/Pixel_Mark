import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from utils.encryption import encrypt_secret, decrypt_secret, mask_secret

def test_encryption_decryption():
    raw = "sk-proj-123456789abcdef"
    ciphertext = encrypt_secret(raw)
    assert ciphertext != raw
    decrypted = decrypt_secret(ciphertext)
    assert decrypted == raw

def test_legacy_fallback():
    # If a value cannot be decrypted (e.g. legacy plain text), it should be returned as-is
    legacy = "sk-legacy-plaintext-key"
    decrypted = decrypt_secret(legacy)
    assert decrypted == legacy

def test_mask_secret():
    assert mask_secret("sk-proj-12345") == "sk-...2345"
    assert mask_secret("short") == "sk-..."
    assert mask_secret("") == ""
