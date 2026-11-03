import os
import pytest
from unittest.mock import patch, AsyncMock
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import StaticPool

from database import Base
from models.core import User, UserAIProviderConfig
from utils.encryption import encrypt_secret
from services.copilot_service import parse_copilot_dom_intent, resolve_ai_provider
from services.ai_service import resolve_ai_provider as ai_service_resolve_ai_provider


@pytest.fixture
async def test_db():
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_maker = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    async with session_maker() as session:
        yield session

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest.mark.asyncio
async def test_parse_copilot_dom_intent_matching():
    sample_dom = [
        {"selector": "button.cta-primary", "tag": "button", "text": "Start Free Trial", "rect": {"top": 100, "left": 200, "width": 150, "height": 45}},
        {"selector": "h1.hero-title", "tag": "h1", "text": "Build Faster", "rect": {"top": 40, "left": 200, "width": 400, "height": 60}}
    ]
    prompt = "Make the primary start free trial button emerald green and change copy to Get Started Now"
    
    # Mocked provider config test
    mock_config = {
        "provider": "groq",
        "api_key": "dummy_key",
        "supports_openai_compat": True,
        "model_name": "llama-3.3-70b-versatile"
    }
    
    result = await parse_copilot_dom_intent(prompt, sample_dom, mock_config, mock_client=True)
    assert result["selector"] == "button.cta-primary"
    assert "background" in str(result["css_mutations"]).lower() or "color" in str(result["css_mutations"]).lower()
    assert result["text_mutation"] == "Get Started Now"
    assert len(result["developer_explanation"]) > 0
    assert result["confidence"] >= 0.8
    assert "button.cta-primary" in result["css_rules"]


@pytest.mark.asyncio
async def test_parse_copilot_dom_intent_heading_matching():
    sample_dom = [
        {"selector": "button.cta-primary", "tag": "button", "text": "Start Free Trial", "rect": {"top": 100, "left": 200, "width": 150, "height": 45}},
        {"selector": "h1.hero-title", "tag": "h1", "text": "Build Faster", "rect": {"top": 40, "left": 200, "width": 400, "height": 60}}
    ]
    prompt = "Change heading to Launch in Minutes and make it crimson red"
    result = await parse_copilot_dom_intent(prompt, sample_dom, None, mock_client=True)
    assert result["selector"] == "h1.hero-title"
    assert result["text_mutation"] == "Launch in Minutes"
    assert "#EF4444" in str(result["css_mutations"]) or "#DC2626" in str(result["css_mutations"])


@pytest.mark.asyncio
async def test_parse_copilot_dom_intent_empty_dom():
    prompt = "Make it blue"
    result = await parse_copilot_dom_intent(prompt, [], None, mock_client=True)
    assert result["selector"] == "body"
    assert result["confidence"] == 0.0


@pytest.mark.asyncio
async def test_resolve_ai_provider_user_priority(test_db: AsyncSession):
    # Setup test user and provider config
    user = User(id="user-copilot-1", email="copilot1@test.com", hashed_password="pwd")
    test_db.add(user)
    
    cfg = UserAIProviderConfig(
        id="cfg-1",
        user_id=user.id,
        provider="groq",
        display_name="My User Groq",
        encrypted_api_key=encrypt_secret("gsk_user_secret_123"),
        model_name="llama-3.3-70b-versatile",
        is_active=True,
        is_default=True,
        supports_openai_compat=True
    )
    test_db.add(cfg)
    await test_db.commit()

    with patch.dict(os.environ, {"GROQ_API_KEY": "sys_groq", "OPENAI_API_KEY": "sys_openai"}, clear=True):
        resolved = await resolve_ai_provider(db=test_db, user=user)
        assert resolved is not None
        assert resolved["provider"] == "groq"
        assert resolved["api_key"] == "gsk_user_secret_123"
        assert resolved["is_omni_route"] is False
        assert resolved["config_id"] == "cfg-1"


@pytest.mark.asyncio
async def test_resolve_ai_provider_system_groq_fallback():
    with patch.dict(os.environ, {"GROQ_API_KEY": "gsk_system_free", "GEMINI_API_KEY": "gem_key", "OPENAI_API_KEY": "oai_key"}, clear=True):
        resolved = await resolve_ai_provider(db=None, user=None)
        assert resolved is not None
        assert resolved["provider"] == "groq"
        assert resolved["api_key"] == "gsk_system_free"
        assert resolved["model_name"] in ("llama-3.3-70b-versatile", "qwen/qwen3.8-27b")
        assert resolved["is_omni_route"] is True
        assert resolved["base_url"] == "https://api.groq.com/openai/v1"


@pytest.mark.asyncio
async def test_resolve_ai_provider_system_gemini_fallback():
    with patch.dict(os.environ, {"GEMINI_API_KEY": "gem_system_free", "OPENAI_API_KEY": "oai_key"}, clear=True):
        resolved = await resolve_ai_provider(db=None, user=None)
        assert resolved is not None
        assert resolved["provider"] == "gemini"
        assert resolved["api_key"] == "gem_system_free"
        assert resolved["model_name"] == "gemini-1.5-flash"
        assert resolved["is_omni_route"] is True
        assert resolved["base_url"] == "https://generativelanguage.googleapis.com/v1beta/openai/"


@pytest.mark.asyncio
async def test_resolve_ai_provider_system_openai_fallback():
    with patch.dict(os.environ, {"OPENAI_API_KEY": "sk_openai_test"}, clear=True):
        resolved = await resolve_ai_provider(db=None, user=None)
        assert resolved is not None
        assert resolved["provider"] == "openai"
        assert resolved["api_key"] == "sk_openai_test"
        assert resolved["model_name"] == "gpt-4o-mini"
        assert resolved["is_omni_route"] is False


@pytest.mark.asyncio
async def test_resolve_ai_provider_none():
    with patch.dict(os.environ, {}, clear=True):
        resolved = await resolve_ai_provider(db=None, user=None)
        assert resolved is None


@pytest.mark.asyncio
async def test_ai_service_delegates_to_copilot_resolver():
    with patch.dict(os.environ, {"GROQ_API_KEY": "gsk_delegate_test"}, clear=True):
        resolved = await ai_service_resolve_ai_provider(db=None, user=None)
        assert resolved is not None
        assert resolved["provider"] == "groq"
        assert resolved["api_key"] == "gsk_delegate_test"


@pytest.mark.asyncio
async def test_parse_copilot_dom_intent_live_flow_with_mocked_completion():
    sample_dom = [
        {"selector": "button.submit-btn", "tag": "button", "text": "Submit Form"}
    ]
    prompt = "Make the submit button larger with dark background"
    mock_provider = {
        "provider": "openai",
        "api_key": "dummy_key",
        "supports_openai_compat": True,
        "model_name": "gpt-4o-mini"
    }

    mock_llm_result = {
        "selector": "button.submit-btn",
        "css_mutations": {"background-color": "#111827", "font-size": "1.25rem"},
        "css_rules": "button.submit-btn { background-color: #111827 !important; font-size: 1.25rem !important; }",
        "text_mutation": None,
        "client_summary": "Made button larger with dark background.",
        "developer_explanation": "Client requested high contrast dark button.",
        "confidence": 0.98
    }

    with patch("services.copilot_service.run_provider_json_completion", new_callable=AsyncMock) as mock_complete:
        mock_complete.return_value = mock_llm_result
        result = await parse_copilot_dom_intent(prompt, sample_dom, mock_provider, mock_client=False)
        assert result["selector"] == "button.submit-btn"
        assert result["css_mutations"]["background-color"] == "#111827"
        assert result["confidence"] == 0.98
        assert "button.submit-btn" in result["css_rules"]
        mock_complete.assert_called_once()


@pytest.mark.asyncio
async def test_parse_copilot_dom_intent_no_provider_error():
    sample_dom = [{"selector": "div.hero", "tag": "div", "text": "Hero"}]
    with patch.dict(os.environ, {}, clear=True):
        with pytest.raises(RuntimeError, match="No active AI provider configured"):
            await parse_copilot_dom_intent("make it green", sample_dom, None, mock_client=False)
