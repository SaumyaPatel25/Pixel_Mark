import os
import sys
from pathlib import Path

# Force DATABASE_URL to point to a test database so pytest does not wipe the development database.
# Must run before any database module imports.
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///backend/test_temp.db"

# Cleanup test_temp.db if it exists on startup
test_db_path = Path(__file__).parent.parent / "test_temp.db"
if test_db_path.exists():
    try:
        test_db_path.unlink()
    except Exception:
        pass
