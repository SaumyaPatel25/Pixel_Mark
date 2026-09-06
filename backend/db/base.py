import sys

# Ensure singleton Base across both `database` and `backend.database` module imports
if "database" in sys.modules:
    Base = sys.modules["database"].Base
elif "backend.database" in sys.modules:
    Base = sys.modules["backend.database"].Base
else:
    try:
        from database import Base
    except ImportError:
        from backend.database import Base

__all__ = ["Base"]
