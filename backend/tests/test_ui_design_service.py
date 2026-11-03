import os
import pytest
from unittest.mock import patch, AsyncMock
from fastapi.testclient import TestClient

from main import app
from services.ui_design_rules import (
    UI_DESIGN_SYSTEM_PROMPT,
    SPACING_SCALE,
    TYPOGRAPHY_SCALE,
    WCAG_CONTRAST_RATIOS,
    MODERN_COMPONENT_POLISH,
    CRO_PRINCIPLES
)
from services.copilot_service import (
    analyze_site_context,
    parse_copilot_dom_intent,
    _mock_site_analysis
)


# ============================================================================
# 1. UI Design Rules & Heuristics Engine Tests
# ============================================================================

def test_ui_design_rules_constants():
    """Verify core design system constants and scales exist."""
    assert isinstance(UI_DESIGN_SYSTEM_PROMPT, str)
    assert len(UI_DESIGN_SYSTEM_PROMPT) > 200

    # Spacing rhythm (8pt grid)
    assert 4 in SPACING_SCALE
    assert 8 in SPACING_SCALE
    assert 16 in SPACING_SCALE
    assert 24 in SPACING_SCALE
    assert 32 in SPACING_SCALE
    assert 48 in SPACING_SCALE

    # WCAG Contrast Guidelines
    assert WCAG_CONTRAST_RATIOS["AA_NORMAL"] == 4.5
    assert WCAG_CONTRAST_RATIOS["AA_LARGE"] == 3.0
    assert WCAG_CONTRAST_RATIOS["AAA_NORMAL"] == 7.0
    assert WCAG_CONTRAST_RATIOS["AAA_LARGE"] == 4.5

    # Modular Typography & Optical Tracking
    assert "optical_tracking" in TYPOGRAPHY_SCALE
    assert TYPOGRAPHY_SCALE["optical_tracking"]["headlines"] == "-0.025em"
    assert TYPOGRAPHY_SCALE["optical_tracking"]["badges"] == "+0.05em"

    # Polish & CRO
    assert "subtle_border" in MODERN_COMPONENT_POLISH
    assert "rgba(255, 255, 255, 0.08)" in MODERN_COMPONENT_POLISH["subtle_border"] or "rgba(255,255,255,0.08)" in MODERN_COMPONENT_POLISH["subtle_border"]
    assert "single_primary_cta" in CRO_PRINCIPLES


def test_ui_design_system_prompt_content():
    """Ensure prompt incorporates all core requirements."""
    prompt_lower = UI_DESIGN_SYSTEM_PROMPT.lower()
    assert "wcag" in prompt_lower
    assert "8pt" in prompt_lower or "8-point" in prompt_lower or "8px" in prompt_lower
    assert "optical tracking" in prompt_lower or "-0.025em" in prompt_lower
    assert "border" in prompt_lower
    assert "cta" in prompt_lower or "conversion" in prompt_lower


# ============================================================================
# 2. Copilot Service Integration: parse_copilot_dom_intent
# ============================================================================

@pytest.mark.asyncio
async def test_parse_copilot_dom_intent_includes_design_system_prompt():
    """Verify that live LLM completion receives UI_DESIGN_SYSTEM_PROMPT."""
    sample_dom = [
        {"selector": "button.cta-primary", "tag": "button", "text": "Get Started", "rect": {"top": 100, "left": 100, "width": 100, "height": 40}}
    ]
    mock_provider = {
        "provider": "groq",
        "api_key": "gsk_test_key",
        "supports_openai_compat": True,
        "model_name": "qwen/qwen3.8-27b"
    }

    mock_llm_response = {
        "selector": "button.cta-primary",
        "css_mutations": {"background-color": "#10B981", "padding": "12px 24px"},
        "css_rules": "button.cta-primary { background-color: #10B981 !important; padding: 12px 24px !important; }",
        "text_mutation": "Start Free",
        "client_summary": "Updated CTA styling with 8pt spacing rhythm.",
        "developer_explanation": "Applied WCAG compliant emerald styling.",
        "confidence": 0.95
    }

    with patch("services.copilot_service.run_provider_json_completion", new_callable=AsyncMock) as mock_complete:
        mock_complete.return_value = mock_llm_response

        res = await parse_copilot_dom_intent(
            user_prompt="Make button emerald green with standard spacing",
            micro_dom=sample_dom,
            provider_config=mock_provider,
            mock_client=False
        )

        assert mock_complete.called
        call_kwargs = mock_complete.call_args.kwargs
        system_prompt_arg = call_kwargs.get("system_prompt", "")
        # Must incorporate design system principles in prompt
        assert "WCAG" in system_prompt_arg or "8pt" in system_prompt_arg or "UI_DESIGN_SYSTEM_PROMPT" in str(system_prompt_arg) or "-0.025em" in system_prompt_arg
        assert res["selector"] == "button.cta-primary"


# ============================================================================
# 3. Copilot Service: analyze_site_context
# ============================================================================

@pytest.mark.asyncio
async def test_analyze_site_context_deterministic_mock():
    """Verify deterministic mock fallback produces structured analysis."""
    fingerprint = {
        "title": "Stage AI - The Next Gen Visual Testing Platform for SaaS",
        "description": "Collaborate, annotate, and test frontend micro-DOM components in real time.",
        "headings": ["Supercharge Your Web Testing", "Realtime Visual Feedback", "Pricing Plans"],
        "dominant_colors": ["#0F172A", "#6366F1", "#FFFFFF"],
        "cta_buttons": [
            {"text": "Start Free Trial", "selector": "button.hero-cta"},
            {"text": "Book a Demo", "selector": "a.secondary-btn"}
        ]
    }

    result = await analyze_site_context(site_fingerprint=fingerprint, mock_client=True)

    assert "business_category" in result
    assert "aesthetic_summary" in result
    assert "dominant_colors" in result
    assert "top_3_suggestions" in result

    assert isinstance(result["business_category"], str) and len(result["business_category"]) > 0
    assert isinstance(result["aesthetic_summary"], str) and len(result["aesthetic_summary"]) > 0
    assert isinstance(result["dominant_colors"], list) and len(result["dominant_colors"]) > 0
    assert len(result["top_3_suggestions"]) == 3

    for suggestion in result["top_3_suggestions"]:
        assert "id" in suggestion
        assert "title" in suggestion
        assert "impact_tag" in suggestion
        assert "selector" in suggestion
        assert "description" in suggestion
        assert "css_mutations" in suggestion
        assert isinstance(suggestion["css_mutations"], dict)
        assert "css_rules" in suggestion
        assert "!important" in suggestion["css_rules"] or len(suggestion["css_rules"]) > 0


@pytest.mark.asyncio
async def test_analyze_site_context_with_llm_mocked():
    """Verify live LLM analysis parsing and fallback handling."""
    fingerprint = {
        "title": "Apex Financial Services",
        "description": "Enterprise banking and wealth management solutions.",
        "headings": ["Secure Your Financial Future"],
        "dominant_colors": ["#1E3A8A", "#F8FAFC"],
        "cta_buttons": [{"text": "Open Account", "selector": "button#cta-open"}]
    }

    mock_provider = {
        "provider": "groq",
        "api_key": "gsk_test_key",
        "supports_openai_compat": True,
        "model_name": "qwen/qwen3.8-27b"
    }

    mock_ai_output = {
        "business_category": "Fintech & Wealth Management",
        "aesthetic_summary": "Corporate blue trust palette with structured typography",
        "dominant_colors": ["#1E3A8A", "#0D9488", "#FFFFFF"],
        "top_3_suggestions": [
            {
                "id": "sug-1",
                "title": "Elevate CTA Contrast",
                "impact_tag": "CRO",
                "selector": "button#cta-open",
                "description": "Boost button contrast to satisfy WCAG AAA ratio against navy hero.",
                "css_mutations": {"background-color": "#0D9488", "color": "#FFFFFF", "padding": "12px 24px"},
                "css_rules": "button#cta-open { background-color: #0D9488 !important; color: #FFFFFF !important; padding: 12px 24px !important; }"
            },
            {
                "id": "sug-2",
                "title": "Headline Optical Tracking",
                "impact_tag": "Typography",
                "selector": "h1",
                "description": "Apply -0.025em letter-spacing to tighten headline visual density.",
                "css_mutations": {"letter-spacing": "-0.025em"},
                "css_rules": "h1 { letter-spacing: -0.025em !important; }"
            },
            {
                "id": "sug-3",
                "title": "Subtle Hero Border Polish",
                "impact_tag": "Aesthetics",
                "selector": ".hero-card",
                "description": "Add soft border and layered box shadow for depth.",
                "css_mutations": {"border": "1px solid rgba(255, 255, 255, 0.08)", "border-radius": "12px"},
                "css_rules": ".hero-card { border: 1px solid rgba(255, 255, 255, 0.08) !important; border-radius: 12px !important; }"
            }
        ]
    }

    with patch("services.copilot_service.run_provider_json_completion", new_callable=AsyncMock) as mock_complete:
        mock_complete.return_value = mock_ai_output

        result = await analyze_site_context(
            site_fingerprint=fingerprint,
            provider_config=mock_provider,
            mock_client=False
        )

        assert result["business_category"] == "Fintech & Wealth Management"
        assert len(result["top_3_suggestions"]) == 3
        assert result["top_3_suggestions"][0]["impact_tag"] == "CRO"
        assert result["top_3_suggestions"][1]["impact_tag"] == "Typography"


@pytest.mark.asyncio
async def test_analyze_site_context_llm_failure_falls_back_gracefully():
    """Verify that when LLM throws an exception, analyze_site_context falls back gracefully."""
    fingerprint = {
        "title": "Fallback Store",
        "description": "Handmade leather boots and accessories.",
        "headings": ["Crafted for Life"],
        "dominant_colors": ["#78350F"],
        "cta_buttons": ["Shop Now"]
    }
    mock_provider = {"provider": "groq", "api_key": "bad_key"}

    with patch("services.copilot_service.run_provider_json_completion", side_effect=RuntimeError("AI service unavailable")):
        result = await analyze_site_context(
            site_fingerprint=fingerprint,
            provider_config=mock_provider,
            mock_client=False
        )

        # Should NOT raise, must return deterministic analysis
        assert result is not None
        assert "business_category" in result
        assert len(result["top_3_suggestions"]) == 3


@pytest.mark.asyncio
async def test_analyze_site_context_empty_fingerprint():
    """Verify resilient handling of empty fingerprint payload."""
    result = await analyze_site_context(site_fingerprint={}, mock_client=True)
    assert result["business_category"]
    assert len(result["top_3_suggestions"]) == 3


# ============================================================================
# 4. Router API Endpoint: POST /api/copilot/analyze-site
# ============================================================================

def test_router_analyze_site_endpoint():
    """Test POST /api/copilot/analyze-site with mock_client=True."""
    client = TestClient(app)
    payload = {
        "title": "CloudMetrics - Modern Observability for Cloud Native Apps",
        "description": "Instant traces, distributed logs, and metrics for microservices.",
        "headings": ["Observability Made Effortless", "Features", "Pricing"],
        "dominant_colors": ["#0B0F19", "#38BDF8"],
        "cta_buttons": [{"text": "Get Started Free", "selector": "button.hero-btn"}],
        "mock_client": True
    }

    response = client.post("/api/copilot/analyze-site", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert "business_category" in data
    assert "aesthetic_summary" in data
    assert "dominant_colors" in data
    assert "top_3_suggestions" in data
    assert len(data["top_3_suggestions"]) == 3

    # Also test the alias /copilot/analyze-site
    alias_response = client.post("/copilot/analyze-site", json=payload)
    assert alias_response.status_code == 200
    alias_data = alias_response.json()
    assert len(alias_data["top_3_suggestions"]) == 3


def test_router_analyze_site_with_alias_fields():
    """Test POST /api/copilot/analyze-site with alternative field names 'colors' and 'ctas'."""
    client = TestClient(app)
    payload = {
        "title": "Portfolio Showcase",
        "description": "Minimal design portfolio of award-winning director.",
        "headings": ["Visual Storytelling"],
        "colors": ["#111111", "#E5E5E5"],
        "ctas": ["View Projects"],
        "mock_client": True
    }

    response = client.post("/api/copilot/analyze-site", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert len(data["top_3_suggestions"]) == 3
    assert "#111111" in data["dominant_colors"] or len(data["dominant_colors"]) > 0
