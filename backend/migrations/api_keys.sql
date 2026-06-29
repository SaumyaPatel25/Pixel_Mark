-- Migration: Add api_keys table
CREATE TABLE IF NOT EXISTS api_keys (
  id           VARCHAR(36) PRIMARY KEY,
  user_id      VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name         VARCHAR(255) NOT NULL,
  token_hash   VARCHAR(255) UNIQUE NOT NULL,
  masked_token VARCHAR(255) NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ DEFAULT NULL,
  revoked_at   TIMESTAMPTZ DEFAULT NULL,
  key_metadata JSONB DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_token_hash ON api_keys(token_hash);
