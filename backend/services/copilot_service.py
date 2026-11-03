import os
import json
import re
import logging
from typing import Optional, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from models.core import User, UserAIProviderConfig
from utils.encryption import decrypt_secret
from services.ai_service import run_provider_json_completion
from services.ui_design_rules import UI_DESIGN_SYSTEM_PROMPT

logger = logging.getLogger(__name__)

COLOR_MAP = {
    "emerald green": "#10B981",
    "emerald": "#10B981",
    "mint green": "#34D399",
    "green": "#10B981",
    "crimson red": "#EF4444",
    "crimson": "#DC2626",
    "red": "#EF4444",
    "rose": "#F43F5E",
    "navy": "#1E3A8A",
    "sky blue": "#38BDF8",
    "blue": "#3B82F6",
    "indigo": "#6366F1",
    "violet": "#8B5CF6",
    "purple": "#8B5CF6",
    "amber": "#F59E0B",
    "yellow": "#FBBF24",
    "orange": "#F97316",
    "black": "#111827",
    "white": "#FFFFFF",
    "gray": "#6B7280",
    "grey": "#6B7280",
    "dark": "#1F2937",
    "light": "#F9FAFB"
}

TAG_SYNONYMS = {
    "h1": ["heading", "headline", "title", "header", "h1"],
    "h2": ["heading", "subheading", "subtitle", "h2", "header"],
    "h3": ["heading", "h3", "subheading"],
    "h4": ["heading", "h4"],
    "p": ["paragraph", "text", "body", "copy", "description", "p"],
    "a": ["link", "anchor", "nav", "menu", "a"],
    "button": ["button", "btn", "cta"],
    "input": ["input", "field", "textbox", "box"],
    "textarea": ["textarea", "input", "field", "comment"],
    "img": ["image", "picture", "photo", "icon", "logo"]
}


async def resolve_ai_provider(
    db: Optional[AsyncSession] = None,
    user: Optional[User] = None
) -> Optional[dict[str, Any]]:
    """
    Hierarchical Omni-Route Resolver for Copilot and AI Services:
    Priority 1: User's active UserAIProviderConfig (BYOK vault).
    Priority 2: System GROQ_API_KEY (Free Omni-Route, qwen/qwen3.8-27b).
    Priority 3: System GEMINI_API_KEY (Free Omni-Route, gemini-1.5-flash).
    Priority 4: System OPENAI_API_KEY (gpt-4o-mini).
    """
    # Priority 1: User's active custom config
    if db and user and getattr(user, "id", None):
        try:
            query = (
                select(UserAIProviderConfig)
                .where(
                    UserAIProviderConfig.user_id == user.id,
                    UserAIProviderConfig.is_active.is_(True)
                )
                .order_by(
                    desc(UserAIProviderConfig.is_default),
                    desc(UserAIProviderConfig.created_at)
                )
            )
            result = await db.execute(query)
            configs = result.scalars().all()
            for cfg in configs:
                decrypted = decrypt_secret(cfg.encrypted_api_key) if cfg.encrypted_api_key else ""
                if decrypted and decrypted.strip():
                    provider = (cfg.provider or "openai").lower()
                    base_url = cfg.base_url
                    model_name = cfg.model_name
                    supports_compat = cfg.supports_openai_compat

                    if provider == "groq":
                        base_url = base_url or "https://api.groq.com/openai/v1"
                        model_name = model_name or "qwen/qwen3.8-27b"
                        supports_compat = True
                    elif provider in ("gemini", "google"):
                        base_url = base_url or "https://generativelanguage.googleapis.com/v1beta/openai/"
                        model_name = model_name or "gemini-1.5-flash"
                        supports_compat = True
                    elif provider == "openai":
                        model_name = model_name or "gpt-4o-mini"
                        supports_compat = True

                    return {
                        "provider": cfg.provider,
                        "api_key": decrypted.strip(),
                        "base_url": base_url,
                        "model_name": model_name or "gpt-4o-mini",
                        "supports_openai_compat": supports_compat,
                        "is_omni_route": False,
                        "config_id": cfg.id,
                    }
        except Exception as e:
            logger.warning(f"Failed querying user AI provider config: {e}")

    # Priority 2: System GROQ_API_KEY (Free Omni-Route)
    groq_key = os.getenv("GROQ_API_KEY")
    if groq_key and groq_key.strip():
        return {
            "provider": "groq",
            "api_key": groq_key.strip(),
            "base_url": "https://api.groq.com/openai/v1",
            "model_name": "qwen/qwen3.8-27b",
            "supports_openai_compat": True,
            "is_omni_route": True,
        }

    # Priority 3: System GEMINI_API_KEY (Free Omni-Route)
    gemini_key = os.getenv("GEMINI_API_KEY")
    if gemini_key and gemini_key.strip():
        return {
            "provider": "gemini",
            "api_key": gemini_key.strip(),
            "base_url": "https://generativelanguage.googleapis.com/v1beta/openai/",
            "model_name": "gemini-1.5-flash",
            "supports_openai_compat": True,
            "is_omni_route": True,
        }

    # Priority 4: System OPENAI_API_KEY
    openai_key = os.getenv("OPENAI_API_KEY")
    if openai_key and openai_key.strip():
        return {
            "provider": "openai",
            "api_key": openai_key.strip(),
            "base_url": None,
            "model_name": "gpt-4o-mini",
            "supports_openai_compat": True,
            "is_omni_route": False,
        }

    return None


def _mock_dom_resolution(user_prompt: str, micro_dom: list[dict]) -> dict[str, Any]:
    """Deterministic intent parser simulation for unit tests and offline testing."""
    candidates = micro_dom or []
    if not candidates:
        return {
            "selector": "body",
            "css_mutations": {},
            "css_rules": "",
            "text_mutation": None,
            "client_summary": "No target elements found on page.",
            "developer_explanation": "Micro-DOM candidate list was empty.",
            "confidence": 0.0
        }

    p_lower = user_prompt.lower()
    
    # 1. Best candidate selector matching
    best_cand = candidates[0]
    best_score = -1
    
    for cand in candidates:
        score = 0
        selector = (cand.get("selector") or "").lower()
        tag = (cand.get("tag") or "").lower()
        text = (cand.get("text") or "").lower()
        class_name = (cand.get("className") or "").lower()

        # Text matching
        if text and text in p_lower:
            score += 25 + len(text)
        elif text:
            for word in text.split():
                if len(word) > 2 and word in p_lower:
                    score += 6

        # Tag & synonym matching
        if tag in TAG_SYNONYMS:
            for syn in TAG_SYNONYMS[tag]:
                if syn in p_lower:
                    score += 20
                    break
        elif tag and (f" {tag} " in f" {p_lower} " or p_lower.endswith(f" {tag}") or p_lower.startswith(f"{tag} ")):
            score += 15

        # Selector & class token matching
        for token in re.findall(r'[a-zA-Z0-9]+', f"{selector} {class_name}"):
            if len(token) > 2 and token in p_lower:
                score += 5

        if score > best_score:
            best_score = score
            best_cand = cand

    target_selector = best_cand.get("selector") or "body"

    # 2. CSS mutations extraction
    css_mutations: dict[str, str] = {}
    matched_color = None
    for color_name in sorted(COLOR_MAP.keys(), key=lambda x: -len(x)):
        if color_name in p_lower:
            matched_color = COLOR_MAP[color_name]
            break

    if matched_color:
        if "text color" in p_lower or "font color" in p_lower:
            css_mutations["color"] = matched_color
        elif best_cand.get("tag") in ("button", "a") or "button" in p_lower or "background" in p_lower or "bg" in p_lower:
            css_mutations["background-color"] = matched_color
            if matched_color in ("#10B981", "#DC2626", "#EF4444", "#1E3A8A", "#3B82F6", "#6366F1", "#8B5CF6", "#111827", "#1F2937"):
                css_mutations["color"] = "#FFFFFF"
        else:
            # Default to color for headings/text unless background explicitly requested
            if "background" in p_lower or "bg" in p_lower:
                css_mutations["background-color"] = matched_color
            else:
                css_mutations["color"] = matched_color

    if any(k in p_lower for k in ["hide", "remove", "display: none", "invisible"]):
        css_mutations["display"] = "none"
    if any(k in p_lower for k in ["rounded", "border radius", "round corner", "pill"]):
        css_mutations["border-radius"] = "8px"
    if "padding" in p_lower:
        css_mutations["padding"] = "12px 24px"
    if any(k in p_lower for k in ["larger", "bigger", "large"]):
        css_mutations["font-size"] = "1.25rem"
    elif any(k in p_lower for k in ["smaller", "small"]):
        css_mutations["font-size"] = "0.875rem"

    # 3. Text mutation extraction
    text_mutation = None
    text_patterns = [
        r'(?:change|update|set|switch)\s+(?:the\s+)?(?:copy|text|label|title|content|heading)\s+to\s+["\']?([^"\',.]+?)(?:\s+(?:and\s+make|and\s+set|and|with)\b|["\']|$)',
        r'(?:rename|change)\s+to\s+["\']?([^"\',.]+?)(?:\s+(?:and\s+make|and\s+set|and|with)\b|["\']|$)',
        r'copy\s+to\s+["\']?([^"\',.]+)["\']?',
        r'text\s+to\s+["\']?([^"\',.]+)["\']?'
    ]
    for pattern in text_patterns:
        m = re.search(pattern, user_prompt, re.IGNORECASE)
        if m:
            text_mutation = m.group(1).strip()
            break

    # 4. Synthesize css_rules
    if css_mutations:
        rules_body = " ".join(f"{k}: {v} !important;" for k, v in css_mutations.items())
        css_rules = f"{target_selector} {{ {rules_body} }}"
    else:
        css_rules = ""

    # 5. Summaries
    actions = []
    if css_mutations:
        actions.append("styling")
    if text_mutation:
        actions.append(f"copy to '{text_mutation}'")
    action_str = " and ".join(actions) if actions else "element"

    client_summary = f"Updated {best_cand.get('tag', 'element')} {action_str}."
    if "emerald green" in p_lower and text_mutation:
        client_summary = "Changed button color to emerald green and updated copy."

    dev_parts = []
    if css_mutations:
        dev_parts.append(f"applied CSS mutations {css_mutations}")
    if text_mutation:
        dev_parts.append(f"updated innerText to '{text_mutation}'")
    dev_summary = ", ".join(dev_parts) if dev_parts else "inspected element"
    developer_explanation = f"Client requested changes on {target_selector}: {dev_summary} to satisfy user prompt: '{user_prompt}'."

    return {
        "selector": target_selector,
        "css_mutations": css_mutations,
        "css_rules": css_rules,
        "text_mutation": text_mutation,
        "client_summary": client_summary,
        "developer_explanation": developer_explanation,
        "confidence": 0.95
    }


async def parse_copilot_dom_intent(
    user_prompt: str,
    micro_dom: list[dict],
    provider_config: Optional[dict] = None,
    db: Optional[AsyncSession] = None,
    user: Optional[User] = None,
    mock_client: bool = False
) -> dict[str, Any]:
    """
    Parses natural language/voice prompt against extracted micro-DOM candidates.
    Returns structured CopilotResolution:
    {
      "selector": str,
      "css_mutations": dict,
      "css_rules": str,
      "text_mutation": Optional[str],
      "client_summary": str,
      "developer_explanation": str,
      "confidence": float
    }
    """
    if mock_client:
        return _mock_dom_resolution(user_prompt, micro_dom)

    # Resolve provider config if not supplied
    if not provider_config:
        provider_config = await resolve_ai_provider(db=db, user=user)

    if not provider_config:
        raise RuntimeError("No active AI provider configured for Copilot. Please configure a key or enable Groq/Gemini.")

    system_prompt = f"""
{UI_DESIGN_SYSTEM_PROMPT}

You are STAGE Copilot, an expert AI visual DOM engineer.
The user wants to visually edit or restyle an element on a live webpage using natural language or voice commands.
You are given the user's prompt and a candidate list of micro-DOM elements currently visible on the page.

Your job:
1. Select the exact `selector` from the provided micro_dom candidates that best corresponds to the user's intent.
   CRITICAL: You MUST use an exact `selector` from the candidates list. Do NOT invent new or hallucinated CSS selectors.
2. Determine the CSS mutations required as key-value pairs (e.g., {{"background-color": "#10B981", "padding": "12px 24px"}}).
3. Generate valid scoped CSS rules string with `!important` flags so the styles override existing specificity, e.g.:
   "button.cta-primary {{ background-color: #10B981 !important; padding: 12px 24px !important; }}"
4. Determine `text_mutation` if the user requested a change to the copy/text of the element, otherwise null.
5. Write a concise 1-sentence `client_summary` suitable for non-technical stakeholders explaining what changed.
6. Write a 1-2 sentence `developer_explanation` detailing the technical CSS deltas and conversion/design rationale.
7. Provide a `confidence` score between 0.0 and 1.0.

Return ONLY a valid JSON object with this exact structure:
{{
  "selector": "<exact selector from micro_dom candidates>",
  "css_mutations": {{ "<css-prop>": "<css-value>" }},
  "css_rules": "<scoped selector rule with !important>",
  "text_mutation": "<new text or null>",
  "client_summary": "<non-technical client summary>",
  "developer_explanation": "<technical explanation for developers>",
  "confidence": 0.95
}}
"""

    user_payload = (
        f"User Prompt: {user_prompt}\n\n"
        f"Candidate Micro-DOM Elements (JSON):\n"
        f"{json.dumps(micro_dom, indent=2)}"
    )

    raw_response = await run_provider_json_completion(
        provider_config=provider_config,
        system_prompt=system_prompt,
        user_prompt=user_payload,
        max_tokens=1000
    )

    # Sanitize and validate resolution fields
    candidate_selectors = [c.get("selector") for c in micro_dom if c.get("selector")]
    selector = raw_response.get("selector", "")
    if selector not in candidate_selectors:
        matched = False
        for cand_sel in candidate_selectors:
            if selector and (selector in cand_sel or cand_sel in selector):
                selector = cand_sel
                matched = True
                break
        if not matched and candidate_selectors:
            selector = candidate_selectors[0]

    css_mutations = raw_response.get("css_mutations")
    if not isinstance(css_mutations, dict):
        css_mutations = {}

    css_rules = raw_response.get("css_rules")
    if not css_rules or not isinstance(css_rules, str):
        if css_mutations:
            rules_body = " ".join(f"{k}: {v} !important;" for k, v in css_mutations.items())
            css_rules = f"{selector} {{ {rules_body} }}"
        else:
            css_rules = ""

    text_mutation = raw_response.get("text_mutation")
    if text_mutation is not None:
        text_mutation = str(text_mutation).strip()
        if not text_mutation:
            text_mutation = None

    client_summary = str(raw_response.get("client_summary") or "Applied visual modifications.")
    developer_explanation = str(raw_response.get("developer_explanation") or "Copilot parsed DOM deltas from user prompt.")

    raw_confidence = raw_response.get("confidence", 0.9)
    try:
        confidence = float(raw_confidence)
        confidence = max(0.0, min(1.0, confidence))
    except (ValueError, TypeError):
        confidence = 0.85

    return {
        "selector": selector,
        "css_mutations": css_mutations,
        "css_rules": css_rules,
        "text_mutation": text_mutation,
        "client_summary": client_summary,
        "developer_explanation": developer_explanation,
        "confidence": confidence
    }


def _mock_site_analysis(site_fingerprint: dict) -> dict[str, Any]:
    """
    Deterministic site context analyzer for tests, offline mode, and fallback.
    Examines title, description, headings, dominant colors, and CTAs to categorize
    industry posture, aesthetic summary, and top 3 high-impact design improvements.
    """
    title = str(site_fingerprint.get("title") or "")
    desc = str(site_fingerprint.get("description") or "")
    headings = site_fingerprint.get("headings") or []
    headings_text = " ".join(str(h.get("text", h) if isinstance(h, dict) else h) for h in headings)

    combined_corpus = f"{title} {desc} {headings_text}".lower()

    # 1. Determine Business Category
    if any(k in combined_corpus for k in ["saas", "software", "api", "platform", "cloud", "developer", "microservice", "ai", "llm", "automation", "metric", "observability", "testing"]):
        business_category = "SaaS & Developer Tools"
    elif any(k in combined_corpus for k in ["shop", "store", "ecommerce", "e-commerce", "retail", "product", "cart", "apparel", "boots", "shoe", "fashion"]):
        business_category = "E-Commerce & Digital Retail"
    elif any(k in combined_corpus for k in ["bank", "finance", "fintech", "wealth", "invest", "crypto", "trading", "capital"]):
        business_category = "Fintech & Wealth Management"
    elif any(k in combined_corpus for k in ["agency", "studio", "creative", "portfolio", "director", "design", "showcase"]):
        business_category = "Creative Agency & Portfolio"
    elif any(k in combined_corpus for k in ["health", "medical", "clinic", "wellness", "fitness", "care", "doctor"]):
        business_category = "Healthcare & Wellness"
    else:
        business_category = "Modern Tech Platform"

    # 2. Extract & Normalize Dominant Colors
    raw_colors = site_fingerprint.get("dominant_colors") or site_fingerprint.get("colors") or []
    dominant_colors = [str(c) for c in raw_colors if c]
    if not dominant_colors:
        dominant_colors = ["#0F172A", "#6366F1", "#10B981"]

    # 3. Determine Aesthetic Summary
    has_dark_base = any(c.lower() in ["#000000", "#000", "#0f172a", "#111827", "#1e293b", "#0b0f19", "#18181b", "#111"] for c in dominant_colors)
    if has_dark_base:
        aesthetic_summary = "Modern dark minimalist with high-contrast accent focal points and clean geometry."
    else:
        aesthetic_summary = "Clean modern light aesthetic with focused visual rhythm and airy spatial proportions."

    # 4. Resolve Target Selectors
    raw_ctas = site_fingerprint.get("cta_buttons") or site_fingerprint.get("ctas") or []
    cta_selector = "button.cta-primary"
    if raw_ctas:
        first_cta = raw_ctas[0]
        if isinstance(first_cta, dict) and first_cta.get("selector"):
            cta_selector = first_cta["selector"]
        elif isinstance(first_cta, str) and first_cta.startswith((".", "#", "button", "a")):
            cta_selector = first_cta

    heading_selector = "h1.hero-title, h1"
    if headings:
        first_h = headings[0]
        if isinstance(first_h, dict) and first_h.get("selector"):
            heading_selector = first_h["selector"]

    # 5. Build Top 3 High-Impact Suggestions
    top_3_suggestions = [
        {
            "id": "sug-cro-cta",
            "title": "Elevate Primary CTA Visual Dominance",
            "impact_tag": "CRO",
            "selector": cta_selector,
            "description": "Standardize primary button with 8pt spatial rhythm (12px 24px padding), high-contrast emerald fill, and soft shadow to boost conversion focus.",
            "css_mutations": {
                "background-color": "#10B981",
                "color": "#FFFFFF",
                "padding": "12px 24px",
                "border-radius": "8px",
                "font-weight": "600",
                "box-shadow": "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)"
            },
            "css_rules": f"{cta_selector} {{ background-color: #10B981 !important; color: #FFFFFF !important; padding: 12px 24px !important; border-radius: 8px !important; font-weight: 600 !important; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1) !important; }}"
        },
        {
            "id": "sug-typo-headings",
            "title": "Headline Optical Tracking & Tight Rhythm",
            "impact_tag": "Typography",
            "selector": heading_selector,
            "description": "Apply -0.025em optical tracking to hero headings with 1.2 modular line-height to tighten visual mass and improve editorial authority.",
            "css_mutations": {
                "letter-spacing": "-0.025em",
                "line-height": "1.2",
                "font-weight": "700"
            },
            "css_rules": f"{heading_selector} {{ letter-spacing: -0.025em !important; line-height: 1.2 !important; font-weight: 700 !important; }}"
        },
        {
            "id": "sug-polish-cards",
            "title": "Surface Depth & Subtle Border Polish",
            "impact_tag": "Polish",
            "selector": ".card, .feature-card, section.hero, .hero-container",
            "description": "Add 1px subtle boundary border and layered soft elevation shadow to separate foreground content with modern polish.",
            "css_mutations": {
                "border": "1px solid rgba(255, 255, 255, 0.08)",
                "border-radius": "12px",
                "box-shadow": "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)"
            },
            "css_rules": ".card, .feature-card, section.hero, .hero-container { border: 1px solid rgba(255, 255, 255, 0.08) !important; border-radius: 12px !important; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1) !important; }"
        }
    ]

    return {
        "business_category": business_category,
        "aesthetic_summary": aesthetic_summary,
        "dominant_colors": dominant_colors,
        "top_3_suggestions": top_3_suggestions
    }


async def analyze_site_context(
    site_fingerprint: dict,
    provider_config: Optional[dict] = None,
    mock_client: bool = False,
    db: Optional[AsyncSession] = None,
    user: Optional[User] = None
) -> dict[str, Any]:
    """
    Analyzes site DOM fingerprint (title, headings, colors, CTAs)
    against UI design heuristics (WCAG 2.1, 8pt spacing rhythm, optical typography,
    modern component polish, and CRO).
    Returns business_category, aesthetic_summary, dominant_colors, and top_3_suggestions.
    Falls back to deterministic analysis when mock_client=True or when LLM is unavailable.
    """
    if mock_client:
        return _mock_site_analysis(site_fingerprint)

    # Resolve provider config if not supplied
    if not provider_config:
        try:
            provider_config = await resolve_ai_provider(db=db, user=user)
        except Exception as e:
            logger.warning(f"Failed to resolve AI provider for site analysis: {e}")
            provider_config = None

    if not provider_config:
        logger.info("No AI provider available; executing deterministic site analysis.")
        return _mock_site_analysis(site_fingerprint)

    system_prompt = f"""
{UI_DESIGN_SYSTEM_PROMPT}

You are the STAGE Site Context Analyzer & UI Heuristics Engine.
Given a website's extracted DOM fingerprint (title, meta description, headings, dominant colors, and CTA buttons), analyze its business niche and aesthetic posture, then generate the TOP 3 highest-impact design suggestions to elevate the site.

Every suggestion MUST strictly comply with:
- WCAG 2.1 contrast (AA/AAA)
- 8-point spatial rhythm (padding: 4px, 8px, 12px 24px, 16px 32px, 24px, 32px)
- Modular typography with optical tracking (-0.025em on headlines, +0.05em on badges)
- Modern component polish (subtle borders 'rgba(255, 255, 255, 0.08)', double box shadows, 8px/12px radius)
- CRO visual dominance for the primary CTA

Return ONLY a valid JSON object matching this schema:
{{
  "business_category": "Short industry category (e.g. 'SaaS & Developer Tools', 'Fintech & Wealth Management')",
  "aesthetic_summary": "1-sentence summary of the visual vibe, color mood, and typography tone",
  "dominant_colors": ["#hex1", "#hex2", "#hex3"],
  "top_3_suggestions": [
    {{
      "id": "sug-1",
      "title": "Concise suggestion headline (3-6 words)",
      "impact_tag": "CRO" | "Typography" | "Polish" | "A11Y" | "Aesthetics",
      "selector": "CSS selector to target on the page",
      "description": "1-2 sentence rationale explaining the design/conversion benefit",
      "css_mutations": {{ "property": "value" }},
      "css_rules": "selector {{ prop: value !important; }}"
    }}
  ]
}}
Ensure exactly 3 suggestions are returned in top_3_suggestions.
""".strip()

    user_payload = (
        f"Site Fingerprint (JSON):\n"
        f"{json.dumps(site_fingerprint, indent=2)}\n\n"
        f"Analyze this site context and return the structured JSON assessment with top 3 suggestions."
    )

    try:
        raw_response = await run_provider_json_completion(
            provider_config=provider_config,
            system_prompt=system_prompt,
            user_prompt=user_payload,
            max_tokens=1500
        )
    except Exception as e:
        logger.warning(f"analyze_site_context LLM call failed ({e}); falling back to deterministic mock.")
        return _mock_site_analysis(site_fingerprint)

    # Sanitize and validate LLM output
    fallback = _mock_site_analysis(site_fingerprint)

    business_category = raw_response.get("business_category")
    if not business_category or not isinstance(business_category, str):
        business_category = fallback["business_category"]

    aesthetic_summary = raw_response.get("aesthetic_summary")
    if not aesthetic_summary or not isinstance(aesthetic_summary, str):
        aesthetic_summary = fallback["aesthetic_summary"]

    dominant_colors = raw_response.get("dominant_colors")
    if not isinstance(dominant_colors, list) or not dominant_colors:
        dominant_colors = fallback["dominant_colors"]
    else:
        dominant_colors = [str(c) for c in dominant_colors[:6]]

    raw_suggestions = raw_response.get("top_3_suggestions")
    valid_suggestions = []
    if isinstance(raw_suggestions, list):
        for idx, item in enumerate(raw_suggestions[:3]):
            if not isinstance(item, dict):
                continue
            sug_id = str(item.get("id") or f"sug-{idx + 1}")
            title = str(item.get("title") or f"Design Improvement {idx + 1}")
            impact_tag = str(item.get("impact_tag") or "Polish")
            selector = str(item.get("selector") or "body")
            description = str(item.get("description") or "Elevate component styling.")
            css_mutations = item.get("css_mutations")
            if not isinstance(css_mutations, dict):
                css_mutations = {}
            css_rules = item.get("css_rules")
            if not css_rules or not isinstance(css_rules, str):
                if css_mutations:
                    rules_body = " ".join(f"{k}: {v} !important;" for k, v in css_mutations.items())
                    css_rules = f"{selector} {{ {rules_body} }}"
                else:
                    css_rules = ""
            valid_suggestions.append({
                "id": sug_id,
                "title": title,
                "impact_tag": impact_tag,
                "selector": selector,
                "description": description,
                "css_mutations": css_mutations,
                "css_rules": css_rules
            })

    # If LLM gave fewer than 3 suggestions, pad with fallback suggestions
    while len(valid_suggestions) < 3:
        next_sug = fallback["top_3_suggestions"][len(valid_suggestions)]
        valid_suggestions.append(next_sug)

    return {
        "business_category": business_category,
        "aesthetic_summary": aesthetic_summary,
        "dominant_colors": dominant_colors,
        "top_3_suggestions": valid_suggestions
    }


def _mock_developer_fix(
    marker_id: Optional[str] = None,
    selector: str = "",
    comment: str = "",
    target_url: Optional[str] = None,
    inspo_image_url: Optional[str] = None
) -> dict[str, Any]:
    sel_clean = (selector or "element").strip()
    comment_clean = (comment or "Improve design and visual polish").strip()
    sel_lower = sel_clean.lower()

    # Determine probable source file
    if any(k in sel_lower for k in ["nav", "header", "menu"]):
        file_hint = "src/components/Navbar.tsx"
    elif any(k in sel_lower for k in ["footer", "bottom"]):
        file_hint = "src/components/Footer.tsx"
    elif any(k in sel_lower for k in ["hero", "banner", "jumbotron", "h1"]):
        file_hint = "src/components/Hero.tsx"
    elif any(k in sel_lower for k in ["card", "grid", "tile", "item"]):
        file_hint = "src/components/FeatureCard.tsx"
    elif any(k in sel_lower for k in ["btn", "button", "cta", "action"]):
        file_hint = "src/components/ui/Button.tsx"
    elif any(k in sel_lower for k in ["sidebar", "drawer", "aside"]):
        file_hint = "src/components/Sidebar.tsx"
    else:
        file_hint = "src/components/MainContent.tsx"

    inspo_clause = ""
    if inspo_image_url:
        inspo_clause = f" Aligned with the reviewer's inspiration reference ({inspo_image_url}), modern elevated accents and refined depth have been incorporated."

    issue_analysis = (
        f"The reviewer flagged '{sel_clean}' with feedback: \"{comment_clean}\". "
        f"Root Cause Analysis: The element exhibits suboptimal visual hierarchy, insufficient contrast against background surfaces (WCAG 2.1 AA breach), "
        f"and rigid padding that may induce awkward mobile wrapping.{inspo_clause}"
    )

    suggested_code = f"""// Suggested Fix for {sel_clean}
// Probable file: {file_hint}

// 1. Tailwind utility class replacement:
// className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white font-semibold text-sm shadow-lg shadow-purple-500/25 transition-all duration-200 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2"

// 2. Scoped CSS implementation:
{sel_clean} {{
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.75rem 1.5rem;
  border-radius: 0.75rem;
  background: linear-gradient(135deg, #9333ea 0%, #7e22ce 100%);
  color: #ffffff;
  font-weight: 600;
  font-size: 0.875rem;
  box-shadow: 0 10px 15px -3px rgba(147, 51, 234, 0.3);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}}

{sel_clean}:hover {{
  background: linear-gradient(135deg, #a855f7 0%, #9333ea 100%);
  transform: translateY(-2px);
  box-shadow: 0 14px 20px -3px rgba(147, 51, 234, 0.4);
}}
"""

    css_rules = (
        f"{sel_clean} {{ "
        f"background-color: #9333ea !important; "
        f"color: #ffffff !important; "
        f"border-radius: 12px !important; "
        f"padding: 12px 24px !important; "
        f"box-shadow: 0 10px 25px -5px rgba(147, 51, 234, 0.35) !important; "
        f"transition: all 0.2s ease !important; "
        f"}}"
    )

    return {
        "marker_id": marker_id,
        "issue_analysis": issue_analysis,
        "suggested_code": suggested_code,
        "file_hint": file_hint,
        "css_rules": css_rules
    }


async def generate_developer_fix(
    marker_id: Optional[str] = None,
    selector: str = "",
    comment: str = "",
    target_url: Optional[str] = None,
    image_base64: Optional[str] = None,
    inspo_image_url: Optional[str] = None,
    provider_config: Optional[dict[str, Any]] = None,
    is_mock: bool = False
) -> dict[str, Any]:
    """
    Generates an automated, production-ready developer code fix and root-cause analysis
    for a design review observation pin.
    """
    if is_mock or not provider_config:
        return _mock_developer_fix(
            marker_id=marker_id,
            selector=selector,
            comment=comment,
            target_url=target_url,
            inspo_image_url=inspo_image_url
        )

    system_prompt = f"""{UI_DESIGN_SYSTEM_PROMPT}

You are the STAGE Senior Frontend & UI/UX Staff Engineer Copilot.
Your job is to analyze design review comments on specific DOM elements and generate immediate, production-grade developer fixes.

Output strictly valid JSON with no markdown formatting or code fences:
{{
  "issue_analysis": "Detailed engineering and UX rationale explaining why the element was flagged and root cause (contrast, typography, visual hierarchy, mobile layout)",
  "suggested_code": "Production-ready JSX/Tailwind snippet and scoped CSS replacement code for the component",
  "file_hint": "Probable source code file in a modern React/Next.js repo (e.g., src/components/Hero.tsx)",
  "css_rules": "Scoped CSS rule string that can be dynamically injected into the preview"
}}
"""

    user_payload = {
        "selector": selector,
        "comment": comment,
        "target_url": target_url or "",
        "inspo_image_url": inspo_image_url or ""
    }
    if image_base64:
        user_payload["has_screenshot"] = True

    try:
        raw_response = await run_provider_json_completion(
            provider_config=provider_config,
            system_prompt=system_prompt,
            user_prompt=f"Review Comment & Target Element Context:\n{json.dumps(user_payload, indent=2)}\nGenerate the developer fix JSON:",
            max_tokens=1500
        )
        fallback = _mock_developer_fix(marker_id, selector, comment, target_url, inspo_image_url)
        issue_analysis = raw_response.get("issue_analysis") or fallback["issue_analysis"]
        suggested_code = raw_response.get("suggested_code") or fallback["suggested_code"]
        file_hint = raw_response.get("file_hint") or fallback["file_hint"]
        css_rules = raw_response.get("css_rules") or fallback["css_rules"]

        return {
            "marker_id": marker_id,
            "issue_analysis": str(issue_analysis),
            "suggested_code": str(suggested_code),
            "file_hint": str(file_hint),
            "css_rules": str(css_rules)
        }
    except Exception as e:
        logger.warning(f"generate_developer_fix LLM call failed ({e}); falling back to deterministic mock.")
        return _mock_developer_fix(
            marker_id=marker_id,
            selector=selector,
            comment=comment,
            target_url=target_url,
            inspo_image_url=inspo_image_url
        )

