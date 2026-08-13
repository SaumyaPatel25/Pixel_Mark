import sys
import sqlite3

def search_text(db_path, query):
    print(f"\n--- Searching in {db_path} for '{query}' ---")
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = [r[0] for r in cur.fetchall()]
    for t in tables:
        try:
            cur.execute(f"SELECT * FROM {t};")
            rows = cur.fetchall()
            for r in rows:
                if any(query.lower() in str(c).lower() for c in r):
                    print(f"  FOUND in table [{t}]: {r}")
        except Exception as e:
            pass
    conn.close()

def main():
    search_text("test.db", "designjoy")
    search_text("backend/test.db", "designjoy")

if __name__ == "__main__":
    main()
