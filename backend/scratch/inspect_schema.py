from supabase import create_client
import os
import json
from dotenv import load_dotenv

def check():
    load_dotenv()
    url = os.environ.get('SUPABASE_URL')
    key = os.environ.get('SUPABASE_KEY')
    if not url or not key:
        print("Missing env vars")
        return
    db = create_client(url, key)
    
    print("--- Table: comments ---")
    try:
        # Get one row to see columns
        r = db.table('comments').select('*').limit(1).execute()
        if r.data:
            print("Columns:", list(r.data[0].keys()))
        else:
            print("Table exists but is empty. Cannot determine columns via SELECT *.")
            # Try a dummy insert and rollback? No, just try to list columns another way if possible.
            # Postgrest doesn't allow DESCRIBE.
    except Exception as e:
        print(f"Error accessing comments: {str(e)}")

    print("\n--- Table: share_links ---")
    try:
        r = db.table('share_links').select('*').limit(1).execute()
        if r.data:
            print("Columns:", list(r.data[0].keys()))
        else:
            print("Table exists but is empty.")
    except Exception as e:
        print(f"Error accessing share_links: {str(e)}")

if __name__ == "__main__":
    check()
