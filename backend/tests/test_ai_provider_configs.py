import sys
import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import StaticPool
from sqlalchemy import select

# Setup path to import backend modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from main import app
from dependencies import get_db, get_current_user
from database import Base
from models import User, Project, Session as DbSession, OrgMember, Organization
from models.core import UserAIProviderConfig
from utils.encryption import decrypt_secret

# In-memory SQLite for testing
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"
engine = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

# Override dependencies
async def get_test_db():
    async with TestingSessionLocal() as session:
        yield session

MOCK_USER_ID = "user-123"
MOCK_USER_EMAIL = "user123@stage.dev"

MOCK_OTHER_USER_ID = "user-456"
MOCK_OTHER_USER_EMAIL = "user456@stage.dev"

current_test_user_id = MOCK_USER_ID

async def mock_get_current_user():
    return User(id=current_test_user_id, email=MOCK_USER_EMAIL)

@pytest.fixture(autouse=True, scope="function")
def override_dependencies():
    app.dependency_overrides[get_db] = get_test_db
    app.dependency_overrides[get_current_user] = mock_get_current_user
    yield
    app.dependency_overrides.clear()

client = TestClient(app)

@pytest.fixture(autouse=True, scope="function")
async def setup_db():
    # Recreate tables before each test function to guarantee a clean slate
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
    async with TestingSessionLocal() as session:
        # Seed test users
        u1 = User(id=MOCK_USER_ID, email=MOCK_USER_EMAIL, hashed_password="hash")
        u2 = User(id=MOCK_OTHER_USER_ID, email=MOCK_OTHER_USER_EMAIL, hashed_password="hash")
        session.add_all([u1, u2])
        await session.commit()
        
    yield
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.anyio
async def test_create_provider_config():
    global current_test_user_id
    current_test_user_id = MOCK_USER_ID
    
    raw_key = "sk-openai-12345"
    resp = client.post("/ai/providers", json={
        "provider": "openai",
        "display_name": "My OpenAI Key",
        "api_key": raw_key,
        "base_url": "https://api.openai.com/v1",
        "model_name": "gpt-4o-mini"
    })
    
    assert resp.status_code == 200
    data = resp.json()
    assert "api_key" not in data
    assert data["has_api_key"] is True
    assert data["provider"] == "openai"
    
    # Check DB encryption
    async with TestingSessionLocal() as session:
        result = await session.execute(
            select(UserAIProviderConfig).where(UserAIProviderConfig.user_id == MOCK_USER_ID)
        )
        config = result.scalar_one()
        assert config.encrypted_api_key != raw_key
        assert decrypt_secret(config.encrypted_api_key) == raw_key


@pytest.mark.anyio
async def test_list_provider_configs():
    global current_test_user_id
    
    # Create config for user 1
    async with TestingSessionLocal() as session:
        c1 = UserAIProviderConfig(
            id="c-1",
            user_id=MOCK_USER_ID,
            provider="groq",
            display_name="Groq Key",
            encrypted_api_key="encrypted-val",
            is_active=True,
            is_default=True
        )
        c2 = UserAIProviderConfig(
            id="c-2",
            user_id=MOCK_OTHER_USER_ID,
            provider="openai",
            display_name="Other User Key",
            encrypted_api_key="encrypted-val",
            is_active=True,
            is_default=True
        )
        session.add_all([c1, c2])
        await session.commit()
        
    current_test_user_id = MOCK_USER_ID
    resp = client.get("/ai/providers")
    assert resp.status_code == 200
    configs = resp.json()
    assert len(configs) == 1
    assert configs[0]["id"] == "c-1"
    assert "api_key" not in configs[0]


@pytest.mark.anyio
async def test_update_provider_config():
    global current_test_user_id
    current_test_user_id = MOCK_USER_ID
    
    async with TestingSessionLocal() as session:
        c1 = UserAIProviderConfig(
            id="c-1",
            user_id=MOCK_USER_ID,
            provider="openai",
            display_name="Old Name",
            encrypted_api_key="old-encrypted",
            is_active=True,
            is_default=True
        )
        session.add(c1)
        await session.commit()
        
    new_raw_key = "sk-new-key-value"
    resp = client.patch("/ai/providers/c-1", json={
        "display_name": "New Name",
        "api_key": new_raw_key
    })
    
    assert resp.status_code == 200
    data = resp.json()
    assert "api_key" not in data
    assert data["display_name"] == "New Name"
    
    async with TestingSessionLocal() as session:
        result = await session.execute(
            select(UserAIProviderConfig).where(UserAIProviderConfig.id == "c-1")
        )
        config = result.scalar_one()
        assert decrypt_secret(config.encrypted_api_key) == new_raw_key


@pytest.mark.anyio
async def test_set_default_provider():
    global current_test_user_id
    current_test_user_id = MOCK_USER_ID
    
    async with TestingSessionLocal() as session:
        c1 = UserAIProviderConfig(
            id="c-1", user_id=MOCK_USER_ID, provider="openai", is_default=True
        )
        c2 = UserAIProviderConfig(
            id="c-2", user_id=MOCK_USER_ID, provider="groq", is_default=False
        )
        session.add_all([c1, c2])
        await session.commit()
        
    resp = client.post("/ai/providers/c-2/set-default")
    assert resp.status_code == 200
    
    async with TestingSessionLocal() as session:
        r1 = await session.execute(select(UserAIProviderConfig).where(UserAIProviderConfig.id == "c-1"))
        r2 = await session.execute(select(UserAIProviderConfig).where(UserAIProviderConfig.id == "c-2"))
        config1 = r1.scalar_one()
        config2 = r2.scalar_one()
        assert config1.is_default is False
        assert config2.is_default is True


@pytest.mark.anyio
async def test_delete_provider_reassign_default():
    global current_test_user_id
    current_test_user_id = MOCK_USER_ID
    
    async with TestingSessionLocal() as session:
        c1 = UserAIProviderConfig(
            id="c-1", user_id=MOCK_USER_ID, provider="openai", is_default=True, is_active=True
        )
        c2 = UserAIProviderConfig(
            id="c-2", user_id=MOCK_USER_ID, provider="groq", is_default=False, is_active=True
        )
        session.add_all([c1, c2])
        await session.commit()
        
    resp = client.delete("/ai/providers/c-1")
    assert resp.status_code == 200
    
    async with TestingSessionLocal() as session:
        # c-1 should be gone
        r1 = await session.execute(select(UserAIProviderConfig).where(UserAIProviderConfig.id == "c-1"))
        assert r1.scalar_one_or_none() is None
        
        # c-2 should now be default
        r2 = await session.execute(select(UserAIProviderConfig).where(UserAIProviderConfig.id == "c-2"))
        config2 = r2.scalar_one()
        assert config2.is_default is True


@pytest.mark.anyio
async def test_cross_user_boundaries():
    global current_test_user_id
    
    async with TestingSessionLocal() as session:
        c1 = UserAIProviderConfig(
            id="c-1", user_id=MOCK_OTHER_USER_ID, provider="openai", is_default=True
        )
        session.add(c1)
        await session.commit()
        
    # User 1 tries to access User 2's config
    current_test_user_id = MOCK_USER_ID
    
    resp_get = client.patch("/ai/providers/c-1", json={"display_name": "Hacked"})
    assert resp_get.status_code == 404
    
    resp_del = client.delete("/ai/providers/c-1")
    assert resp_del.status_code == 404
