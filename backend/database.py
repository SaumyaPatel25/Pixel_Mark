from sqlalchemy.ext.asyncio import (
    create_async_engine,
    AsyncSession,
    async_sessionmaker
)
from sqlalchemy.orm import DeclarativeBase
import os
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(dotenv_path=Path(__file__).parent / ".env")
load_dotenv(dotenv_path=Path(__file__).parent.parent / ".env")

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./test.db")

if DATABASE_URL.startswith("sqlite+aiosqlite:///"):
    db_file = DATABASE_URL.replace("sqlite+aiosqlite:///", "")
    if db_file.startswith("./"):
        db_file = db_file[2:]
    db_path = Path(db_file)
    if not db_path.is_absolute():
        absolute_db_path = (Path(__file__).parent / db_path).resolve()
        DATABASE_URL = f"sqlite+aiosqlite:///{absolute_db_path.as_posix()}"


# Ensure we use the asyncpg driver for PostgreSQL
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)
elif DATABASE_URL.startswith("postgres://"):
    # Heroku and some other providers use 'postgres://'
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+asyncpg://", 1)

# asyncpg doesn't support 'sslmode' in the query string. 
# We strip it to avoid TypeError: connect() got an unexpected keyword argument 'sslmode'
if "sslmode=" in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.split("?")[0]

if "neon.tech" in DATABASE_URL or "render.com" in DATABASE_URL:
    engine = create_async_engine(
        DATABASE_URL,
        echo=False,
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=10,
        connect_args={
            "ssl": True,
            "statement_cache_size": 0,
            "prepared_statement_cache_size": 0
        },
    )
else:
    engine = create_async_engine(DATABASE_URL, echo=False)

AsyncSessionLocal = async_sessionmaker(
    engine,
    expire_on_commit=False,
    class_=AsyncSession
)

class Base(DeclarativeBase):
    pass
