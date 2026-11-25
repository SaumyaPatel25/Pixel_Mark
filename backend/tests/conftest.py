import os
import sys
from pathlib import Path

# Force DATABASE_URL to point to a test database so pytest does not wipe the development database.
# Must run before any database module imports.
test_db_path = (Path(__file__).parent.parent / "test_temp.db").resolve()
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{test_db_path.as_posix()}"

# Cleanup test_temp.db if it exists on startup
if test_db_path.exists():
    try:
        test_db_path.unlink()
    except Exception:
        pass
