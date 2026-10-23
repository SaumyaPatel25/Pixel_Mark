import os
import sys
import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool
from sqlalchemy import select

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from database import Base
from dependencies import get_db
from main import app
from models.core import User, UserIdentity, Organization, OrgMember

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"
engine = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = async_sessionmaker(
    bind=engine, class_=AsyncSession, expire_on_commit=False
)


@pytest.fixture(autouse=True)
async def setup_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


async def override_get_db():
    async with TestingSessionLocal() as session:
        yield session


app.dependency_overrides[get_db] = override_get_db


@pytest.mark.asyncio
async def test_capture_intent_creates_unverified_lead():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.post("/auth/capture-intent", json={
            "email": "leadtest@example.com",
            "name": "Alex Prospect"
        })
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "captured"
        assert data["email"] == "leadtest@example.com"
        assert data["is_verified"] is False

    # Verify user in database
    async with TestingSessionLocal() as db:
        user_res = await db.execute(select(User).where(User.email == "leadtest@example.com"))
        user = user_res.scalar_one_or_none()
        assert user is not None
        assert user.name == "Alex Prospect"
        assert user.is_verified is False

        # Verify identity link created
        ident_res = await db.execute(select(UserIdentity).where(UserIdentity.user_id == user.id))
        ident = ident_res.scalar_one_or_none()
        assert ident is not None
        assert ident.provider == "email_link"
        assert ident.email_verified is False


@pytest.mark.asyncio
async def test_capture_intent_handles_existing_user():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # First capture
        res1 = await ac.post("/auth/capture-intent", json={"email": "double@example.com"})
        assert res1.status_code == 200
        assert res1.json()["status"] == "captured"

        # Second capture
        res2 = await ac.post("/auth/capture-intent", json={"email": "double@example.com", "name": "Double Check"})
        assert res2.status_code == 200
        assert res2.json()["status"] == "existing"

    async with TestingSessionLocal() as db:
        count_res = await db.execute(select(User).where(User.email == "double@example.com"))
        users = count_res.scalars().all()
        assert len(users) == 1
        assert users[0].name == "Double Check"
