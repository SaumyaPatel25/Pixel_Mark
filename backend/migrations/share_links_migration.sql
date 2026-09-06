-- Create share_links table
CREATE TABLE IF NOT EXISTS share_links (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  token         TEXT NOT NULL UNIQUE,
  label         TEXT NOT NULL DEFAULT 'Shared Link',
  role          TEXT NOT NULL DEFAULT 'tester'
                  CHECK (role IN ('tester', 'reviewer', 'viewer')),
  expires_at    TIMESTAMPTZ DEFAULT NULL,
  max_uses      INTEGER DEFAULT NULL,
  use_count     INTEGER NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  password_hash TEXT DEFAULT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast token lookup (called on every tester page load)
CREATE INDEX IF NOT EXISTS idx_share_links_token      ON share_links(token);
CREATE INDEX IF NOT EXISTS idx_share_links_project_id ON share_links(project_id);

-- Disable RLS for now (auth is removed)
ALTER TABLE share_links DISABLE ROW LEVEL SECURITY;
