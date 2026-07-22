import os
import sys
from supabase import create_client, Client
from dotenv import load_dotenv

# Pathing to ensure we load the right .env
load_dotenv('c:/Users/saumy/OneDrive/Desktop/STAGE/backend/.env')

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")

if not url or not key:
    print("[ERROR] Missing SUPABASE_URL or SUPABASE_KEY in .env")
    sys.exit(1)

db: Client = create_client(url, key)

SQL = """
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

CREATE INDEX IF NOT EXISTS idx_share_links_token      ON share_links(token);
CREATE INDEX IF NOT EXISTS idx_share_links_project_id ON share_links(project_id);
ALTER TABLE share_links DISABLE ROW LEVEL SECURITY;
"""

print(f"Attempting migration on {url}...")
try:
    # Most Supabase clients don't allow arbitrary SQL via the main client for security.
    # However, we can try to do a dummy insert to see if the table exists, 
    # but that doesn't help create it.
    
    # We will try to use the postgrest 'rpc' if a custom function exists, 
    # OR we just inform the user we lack permissions for Raw SQL via the client.
    
    r = db.postgrest.rpc('exec_sql', {'query': SQL}).execute()
    print("✓ Migration successful via RPC.")
except Exception as e:
    print(f"[FAIL] Direct SQL injection blocked via 'anon' key: {str(e)}")
    print("\n[ACTION REQUIRED] Please paste the SQL into the Supabase Dashboard SQL Editor.")
    print("The 'anon' key provided in .env does not have permissions to CREATE TABLE.")
