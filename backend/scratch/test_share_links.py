from supabase import create_client
import os
from dotenv import load_dotenv
import uuid

load_dotenv('c:/Users/saumy/OneDrive/Desktop/STAGE/backend/.env')

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")

def check_sharing():
    db = create_client(url, key)
    
    print(f"--- Checking share_links on {url} ---")
    
    # 1. Try to fetch a project to use its ID
    try:
        p = db.table("projects").select("id").limit(1).execute()
        if not p.data:
            print("[FAIL] No projects found. Create one first.")
            return
        proj_id = p.data[0]["id"]
        print(f"Found project: {proj_id}")
    except Exception as e:
        print(f"[FAIL] Could not access projects table: {str(e)}")
        return

    # 2. Try to insert into share_links
    dummy_link = {
        "project_id": proj_id,
        "token": "diag_share_" + str(uuid.uuid4())[:8],
        "label": "Diagnostic Link",
        "role": "tester"
    }
    
    try:
        r = db.table("share_links").insert(dummy_link).execute()
        print("SUCCESS: Inserted share_link successfully.")
        # Cleanup
        db.table("share_links").delete().eq("token", dummy_link["token"]).execute()
    except Exception as e:
        print(f"\n!!! SHARING ERROR !!!")
        print(f"Type: {type(e).__name__}")
        print(f"Message: {str(e)}")
        
        if "row-level security" in str(e).lower():
            print("\n[CONFIRMED] RLS is blocking inserts. You MUST run:")
            print("ALTER TABLE share_links DISABLE ROW LEVEL SECURITY;")
        elif "relation" in str(e).lower() and "does not exist" in str(e).lower():
            print("\n[CONFIRMED] Table 'share_links' is missing. You MUST run the full migration.")
        else:
            print("\nUnknown error. Check the message above for clues.")

if __name__ == "__main__":
    check_sharing()
