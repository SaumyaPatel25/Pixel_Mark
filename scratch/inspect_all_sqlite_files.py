import sys
import asyncio
from pathlib import Path

backend_path = Path(__file__).resolve().parent.parent / "backend"
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

import sqlite3

def dump_sqlite(path):
    print(f"\n==========================================")
    print(f"INSPECTING SQLITE FILE: {path}")
    print("==========================================")
    if not Path(path).exists():
        print("File does not exist.")
        return
    conn = sqlite3.connect(path)
    cur = conn.cursor()
    cur.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = [r[0] for r in cur.fetchall()]
    print(f"Tables: {tables}")
    
    if "users" in tables:
        cur.execute("SELECT id, email, name FROM users;")
        print(f"Users ({path}):")
        for r in cur.fetchall():
            print(f"  {r}")
            
    if "projects" in tables:
        cur.execute("SELECT id, name, org_id FROM projects;")
        print(f"Projects ({path}):")
        for r in cur.fetchall():
            print(f"  {r}")

    if "subscriptions" in tables:
        cur.execute("SELECT id, org_id, plan_type, status FROM subscriptions;")
        print(f"Subscriptions ({path}):")
        for r in cur.fetchall():
            print(f"  {r}")
            
    conn.close()

def main():
    dump_sqlite("test.db")
    dump_sqlite("backend/test.db")
    dump_sqlite("backend/pixelmark.db")

if __name__ == "__main__":
    main()
