from supabase import create_client
import os
from dotenv import load_dotenv

def check():
    load_dotenv()
    url = os.environ.get('SUPABASE_URL')
    key = os.environ.get('SUPABASE_KEY')
    db = create_client(url, key)
    try:
        db.table('share_links').select('id').limit(1).execute()
        print('DB_STATUS: EXISTS')
    except Exception as e:
        print(f'DB_STATUS: MISSING ({str(e)})')

if __name__ == "__main__":
    check()
