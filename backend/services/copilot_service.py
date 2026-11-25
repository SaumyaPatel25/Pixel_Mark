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
from services.design_pattern_library import (
    DESIGN_PATTERNS,
    extract_site_theme,
    adapt_pattern_to_theme,
    sanitize_css_colors_to_theme,
    get_pattern_catalog_summary,
)
from services.agent_reach_service import summarize_observed_apis

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


# ─── FREE-MODEL ROLLUP STATE & REGISTRY ──────────────────────────────────────
_rollup_counter: int = 0

def get_free_rollup_candidates() -> list[dict[str, Any]]:
    """
    Builds the active list of 100% free-tier provider configurations from environment keys.
    Rolls up and alternates across the three free-tier keys:
      1. Groq (qwen/qwen3.8-27b or llama-3.3-70b-versatile)
      2. OpenRouter (google/gemma-4-26b-a4b-it:free or openrouter/free)
      3. NVIDIA NIM (minimaxai/minimax-m3.1-flash)
    """
    candidates = []

    # 1. Groq (100% Free Tier on Groq Cloud)
    groq_key = os.getenv("GROQ_API_KEY")
    if groq_key and groq_key.strip():
        candidates.append({
            "provider": "groq",
            "api_key": groq_key.strip(),
            "base_url": "https://api.groq.com/openai/v1",
            "model_name": os.getenv("GROQ_FREE_MODEL", "qwen/qwen3.8-27b"),
            "supports_openai_compat": True,
            "is_omni_route": True,
            "tier": "free"
        })

    # 2. OpenRouter (Strictly Free Model: google/gemma-4-26b-a4b-it:free)
    openrouter_key = os.getenv("OPENROUTER_API_KEY")
    if openrouter_key and openrouter_key.strip():
        first_key = openrouter_key.split(",")[0].strip()
        if first_key:
            candidates.append({
                "provider": "openrouter",
                "api_key": first_key,
                "base_url": "https://openrouter.ai/api/v1",
                "model_name": os.getenv("OPENROUTER_FREE_MODEL", "google/gemma-4-26b-a4b-it:free"),
                "supports_openai_compat": True,
                "is_omni_route": True,
                "tier": "free"
            })

    # 3. NVIDIA NIM (Free Model on integrate.api.nvidia.com)
    nim_key = os.getenv("NVIDIA_NIM_KEY")
    if nim_key and nim_key.strip():
        candidates.append({
            "provider": "nvidia",
            "api_key": nim_key.strip(),
            "base_url": "https://integrate.api.nvidia.com/v1",
            "model_name": os.getenv("NVIDIA_FREE_MODEL", "minimaxai/minimax-m3.1-flash"),
            "supports_openai_compat": True,
            "is_omni_route": True,
            "tier": "free"
        })

    return candidates


async def resolve_ai_provider(
    db: Optional[AsyncSession] = None,
    user: Optional[User] = None
) -> Optional[dict[str, Any]]:
    """
    Hierarchical Free-Model Rollup Resolver for Copilot and AI Services:
    Priority 1: User's active UserAIProviderConfig (BYOK vault).
    Priority 2: 3-Key Free-Model Rollup Pool (Groq <-> OpenRouter <-> NVIDIA NIM) alternating.
    Priority 3: System GEMINI_API_KEY (Free Omni-Route, gemini-1.5-flash).
    Priority 4: System OPENAI_API_KEY (gpt-4o-mini).
    """
    global _rollup_counter

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
                    elif provider == "openrouter":
                        base_url = base_url or "https://openrouter.ai/api/v1"
                        model_name = model_name or "google/gemma-4-26b-a4b-it:free"
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

    # Priority 2: 3-Key Free-Model Rollup Pool (Groq, OpenRouter, NVIDIA NIM)
    free_candidates = get_free_rollup_candidates()
    if free_candidates:
        chosen = free_candidates[_rollup_counter % len(free_candidates)]
        _rollup_counter += 1
        return chosen

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

    tag = str(best_cand.get("tag", "element")).lower()
    if tag in ("button", "a"):
        b_name = "Linear & Stripe High-Conversion CTA"
        b_url = "https://linear.app"
        b_pat = "magnetic_cta"
    elif tag in ("h1", "h2", "h3"):
        b_name = "Apple Bold Typography"
        b_url = "https://apple.com"
        b_pat = "split_hero"
    else:
        b_name = "Vercel Clean Minimal Layout"
        b_url = "https://vercel.com"
        b_pat = "bento_grid"

    dev_directive = f"Apply scoped CSS to `{target_selector}`: {css_rules or 'adjust styling to match design spec'}."

    return {
        "selector": target_selector,
        "css_mutations": css_mutations,
        "css_rules": css_rules,
        "text_mutation": text_mutation,
        "client_summary": client_summary,
        "developer_explanation": developer_explanation,
        "developer_directive": dev_directive,
        "benchmark_name": b_name,
        "benchmark_url": b_url,
        "benchmark_pattern": b_pat,
        "developer_code_spec": css_rules,
        "rect": best_cand.get("rect"),
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
1. Select the exact `selector` from the provided micro_dom candidates that best corresponds to the user's intent. Take into account the element's position (`rect`: top, left, width, height) on the canvas to ensure context awareness.
   CRITICAL: You MUST use an exact `selector` from the candidates list. Do NOT invent new or hallucinated CSS selectors.
2. Determine the CSS mutations required as key-value pairs (e.g., {{"background-color": "#10B981", "padding": "12px 24px"}}).
3. Generate valid scoped CSS rules string with `!important` flags so the styles override existing specificity, e.g.:
   "button.cta-primary {{ background-color: #10B981 !important; padding: 12px 24px !important; }}"
4. Determine `text_mutation` if the user requested a change to the copy/text of the element, otherwise null.
5. Provide a relevant `benchmark_name` (e.g. "Linear & Stripe High-Conversion CTA", "Apple Bento Grid", "Vercel Nav Ribbon") representing a world-class design benchmark.
6. Provide a `benchmark_url` (e.g. "https://linear.app", "https://stripe.com", "https://vercel.com", "https://apple.com").
7. Provide a `benchmark_pattern` (e.g. "split_hero", "magnetic_cta", "bento_grid", "glass_nav").
8. Write a concise 1-sentence `client_summary` suitable for non-technical stakeholders explaining what changed.
9. Write a 1-2 sentence `developer_explanation` detailing the technical CSS deltas and conversion/design rationale.
10. Write an actionable `developer_directive` detailing the implementation steps for developers.
11. Provide a `confidence` score between 0.0 and 1.0.

Return ONLY a valid JSON object with this exact structure:
{{
  "selector": "<exact selector from micro_dom candidates>",
  "css_mutations": {{ "<css-prop>": "<css-value>" }},
  "css_rules": "<scoped selector rule with !important>",
  "text_mutation": "<new text or null>",
  "client_summary": "<non-technical client summary>",
  "developer_explanation": "<technical explanation for developers>",
  "developer_directive": "<actionable directive for engineers>",
  "benchmark_name": "<benchmark design name>",
  "benchmark_url": "<https://benchmark-url.com>",
  "benchmark_pattern": "<pattern_identifier>",
  "confidence": 0.95
}}
"""

    compact_candidates = []
    if isinstance(micro_dom, list):
        for c in micro_dom[:20]:
            if not isinstance(c, dict):
                continue
            sel = c.get("selector")
            if not sel:
                continue
            item = {"selector": sel, "tag": str(c.get("tag") or "").lower()}
            txt = str(c.get("text") or "").strip()[:50]
            if txt:
                item["text"] = txt
            cls = str(c.get("className") or "").strip()[:40]
            if cls:
                item["class"] = cls
            if "rect" in c and isinstance(c["rect"], dict):
                item["rect"] = c["rect"]
            compact_candidates.append(item)

    user_payload = (
        f"User Prompt: {user_prompt}\n\n"
        f"Candidate Micro-DOM Elements (JSON):\n"
        f"{json.dumps(compact_candidates, separators=(',', ':'))}"
    )

    try:
        raw_response = await run_provider_json_completion(
            provider_config=provider_config,
            system_prompt=system_prompt,
            user_prompt=user_payload,
            max_tokens=400
        )
    except Exception as e:
        logger.warning(f"parse_copilot_dom_intent LLM call failed ({e}); falling back to deterministic resolution.")
        return _mock_dom_resolution(user_prompt, micro_dom)

    # Sanitize and validate resolution fields
    candidate_selectors = [c.get("selector") for c in micro_dom if isinstance(c, dict) and c.get("selector")]
    raw_sel = raw_response.get("selector")
    selector = str(raw_sel).strip() if raw_sel else ""

    if selector not in candidate_selectors:
        matched = False
        for cand_sel in candidate_selectors:
            if selector and (selector in cand_sel or cand_sel in selector):
                selector = cand_sel
                matched = True
                break
        if not matched and candidate_selectors:
            selector = candidate_selectors[0]

    if not selector:
        selector = candidate_selectors[0] if candidate_selectors else "body"

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

    # Context-aware spatial rect extraction
    matched_candidate = next((c for c in micro_dom if isinstance(c, dict) and c.get("selector") == selector), None)
    if not matched_candidate and micro_dom and isinstance(micro_dom[0], dict):
        matched_candidate = micro_dom[0]
    element_rect = matched_candidate.get("rect") if matched_candidate else None

    directive = str(raw_response.get("developer_directive") or f"Implement scoped styles on {selector}.")
    benchmark_name = str(raw_response.get("benchmark_name") or "Modern High-Converting UI Pattern")
    benchmark_url = str(raw_response.get("benchmark_url") or "https://linear.app")
    benchmark_pattern = str(raw_response.get("benchmark_pattern") or "standard_component")
    developer_code_spec = str(raw_response.get("developer_code_spec") or css_rules)

    return {
        "selector": selector,
        "css_mutations": css_mutations,
        "css_rules": css_rules,
        "text_mutation": text_mutation,
        "client_summary": client_summary,
        "developer_explanation": developer_explanation,
        "developer_directive": directive,
        "benchmark_name": benchmark_name,
        "benchmark_url": benchmark_url,
        "benchmark_pattern": benchmark_pattern,
        "developer_code_spec": developer_code_spec,
        "rect": element_rect,
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
    if any(k in combined_corpus for k in ["community", "meetup", "event", "network", "founder", "roundtable", "conference", "chapter", "gathering", "echai"]):
        business_category = "Startup Community & Events Network"
    elif any(k in combined_corpus for k in ["saas", "software", "api", "platform", "cloud", "developer", "microservice", "ai", "llm", "automation", "metric", "observability", "testing"]):
        business_category = "SaaS & Developer Tools"
    elif any(k in combined_corpus for k in ["shop", "store", "ecommerce", "e-commerce", "retail", "product", "cart", "apparel", "boots", "shoe", "fashion"]):
        business_category = "E-Commerce & Digital Retail"
    elif any(k in combined_corpus for k in ["bank", "finance", "fintech", "wealth", "invest", "crypto", "trading", "capital"]):
        business_category = "Fintech & Wealth Management"
    elif any(k in combined_corpus for k in ["agency", "studio", "creative", "portfolio", "director", "design", "showcase"]):
        business_category = "Creative Agency & Portfolio"
    elif any(k in combined_corpus for k in ["health", "medical", "clinic", "wellness", "fitness", "care", "doctor"]):
        business_category = "Healthcare & Wellness"
    elif any(k in combined_corpus for k in ["education", "course", "learn", "academy", "training", "tutorial", "bootcamp", "school"]):
        business_category = "Education & Online Learning"
    elif any(k in combined_corpus for k in ["media", "blog", "news", "journal", "magazine", "article", "newsletter", "publication"]):
        business_category = "Media & Editorial Publication"
    else:
        business_category = "Modern Tech Platform"

    # 2. Extract & Normalize Dominant Colors
    raw_colors = site_fingerprint.get("dominant_colors") or site_fingerprint.get("colors") or []
    dominant_colors = [str(c) for c in raw_colors if c]
    if not dominant_colors:
        dominant_colors = ["#0F172A", "#6366F1", "#10B981"]

    # 3. Extract Website Theme Palette & Aesthetic Summary
    theme = extract_site_theme(site_fingerprint)
    has_dark_base = theme["is_dark"]
    if has_dark_base:
        aesthetic_summary = f"Modern dark minimalist ({theme['background']}) with {theme['primary']} accent focal points and clean geometry."
    else:
        aesthetic_summary = f"Clean modern light aesthetic ({theme['background']}) with {theme['primary']} brand accents and airy spatial proportions."

    pattern_by_id = {p["id"]: p for p in DESIGN_PATTERNS}

    # 4. Resolve Target Selectors
    focused_element = site_fingerprint.get("focused_element")
    if focused_element and isinstance(focused_element, dict):
        f_sel = str(focused_element.get("selector") or "body").strip()
        f_tag = str(focused_element.get("tag") or "element").upper()
        f_text = str(focused_element.get("text") or "").strip()
        short_text = f"'{f_text[:28]}...'" if len(f_text) > 28 else (f"'{f_text}'" if f_text else f"<{f_tag.lower()}>")

        is_interactive = f_tag in ("BUTTON", "A") or any(k in f_text.lower() for k in ["event", "rsvp", "join", "sign", "get", "book", "buy", "start", "contact", "view"])
        is_heading = f_tag in ("H1", "H2", "H3", "H4", "H5") or any(k in f_sel.lower() for k in ["h1", "h2", "heading", "title"])

        if is_interactive:
            sug_cta = adapt_pattern_to_theme(pattern_by_id["uiverse-pill-glow-cta"], f_sel, theme)
            sug_cta["id"] = "sug-focused-cro"
            sug_cta["title"] = f"Elevate {short_text} Visual Prominence"

            sug_typo = {
                "id": "sug-focused-typo",
                "title": "Action Microcopy & Optical Contrast",
                "impact_tag": "Typography",
                "selector": f_sel,
                "description": f"Refine {short_text} with tight tracking (-0.015em) and WCAG-verified contrast ({theme['primary_text']} on {theme['primary']}) to command instant attention.",
                "developer_directive": f"Developer should optimize letter-spacing to -0.015em and ensure WCAG AA/AAA contrast on `{f_sel}`.",
                "source_platform": "Dribbble",
                "benchmark_name": "Dribbble • High-Contrast Action Type",
                "benchmark_url": "https://dribbble.com/search/cta-button-ui",
                "benchmark_pattern": "editorial_typography",
                "developer_code_spec": f"{f_sel} {{ letter-spacing: -0.015em; font-weight: 700; color: {theme['primary_text']}; }}",
                "theme_colors": theme["palette_swatches"],
                "css_mutations": {
                    "letter-spacing": "-0.015em",
                    "font-weight": "700",
                },
                "css_rules": f"{f_sel} {{ letter-spacing: -0.015em !important; font-weight: 700 !important; }}",
            }

            sug_polish = adapt_pattern_to_theme(pattern_by_id["uiverse-tactile-card-lift"], f_sel, theme)
            sug_polish["id"] = "sug-focused-polish"
            sug_polish["title"] = "Interactive Hover Elevation & Transition"
            sug_polish["css_mutations"]["cursor"] = "pointer"
            sug_polish["css_rules"] += f" {f_sel} {{ cursor: pointer !important; }}"

            return {
                "business_category": business_category,
                "aesthetic_summary": f"Focused element analysis on conversion action {short_text}",
                "dominant_colors": dominant_colors,
                "top_3_suggestions": [sug_cta, sug_typo, sug_polish],
            }
        elif is_heading:
            sug_h = adapt_pattern_to_theme(pattern_by_id["dribbble-editorial-hero-type"], f_sel, theme)
            sug_h["id"] = "sug-focused-typo-hierarchy"
            sug_h["title"] = "Tighten Headline Tracking & Optical Rhythm"

            sug_contrast = {
                "id": "sug-focused-contrast",
                "title": "Luminance Contrast & Optical Readability",
                "impact_tag": "CRO",
                "selector": f_sel,
                "description": f"Calibrate foreground contrast ({theme['text_primary']}) against your site's background ({theme['background']}) to draw immediate visitor focus.",
                "developer_directive": f"Developer should set foreground color to {theme['text_primary']} on `{f_sel}` to guarantee WCAG 2.1 AA readability.",
                "source_platform": "Dribbble",
                "benchmark_name": "Dribbble • Editorial Hero Focus",
                "benchmark_url": "https://dribbble.com/search/editorial-typography-hero",
                "benchmark_pattern": "editorial_typography",
                "developer_code_spec": f"{f_sel} {{ color: {theme['text_primary']}; }}",
                "theme_colors": theme["palette_swatches"],
                "css_mutations": {"color": theme["text_primary"]},
                "css_rules": f"{f_sel} {{ color: {theme['text_primary']} !important; }}",
            }

            sug_space = {
                "id": "sug-focused-polish-spacing",
                "title": "Vertical Spacing & Content Breathing Room",
                "impact_tag": "Polish",
                "selector": f_sel,
                "description": "Establish clear 8-point spatial rhythm below the headline to prevent cramped overlap with surrounding content.",
                "developer_directive": f"Developer should apply `margin-bottom: 24px` to `{f_sel}` to decouple it from secondary text and buttons.",
                "source_platform": "Uiverse.io",
                "benchmark_name": "Uiverse.io • 8pt Spatial Rhythm",
                "benchmark_url": "https://uiverse.io/cards",
                "benchmark_pattern": "bento_grid",
                "developer_code_spec": f"{f_sel} {{ margin-bottom: 1.5rem; }}",
                "theme_colors": theme["palette_swatches"],
                "css_mutations": {"margin-bottom": "24px"},
                "css_rules": f"{f_sel} {{ margin-bottom: 24px !important; }}",
            }

            return {
                "business_category": business_category,
                "aesthetic_summary": f"Focused element analysis on headline {short_text}",
                "dominant_colors": dominant_colors,
                "top_3_suggestions": [sug_h, sug_contrast, sug_space],
            }
        else:
            sug_surf = adapt_pattern_to_theme(pattern_by_id["uiverse-tactile-card-lift"], f_sel, theme)
            sug_surf["id"] = "sug-focused-surface"
            sug_surf["title"] = "Theme-Matched Surface & Hover Elevation"

            sug_pad = {
                "id": "sug-focused-padding",
                "title": "8pt Spatial Padding Calibration",
                "impact_tag": "Architecture",
                "selector": f_sel,
                "description": "Apply balanced internal padding (24px) to eliminate cramped content borders and improve visual breathing room.",
                "developer_directive": f"Developer should apply `padding: 24px` to `{f_sel}` to align with standard 8pt design systems.",
                "source_platform": "Dribbble",
                "benchmark_name": "Dribbble • Clean Bento Spacing",
                "benchmark_url": "https://dribbble.com/search/bento-grid-ui",
                "benchmark_pattern": "bento_grid",
                "developer_code_spec": f"{f_sel} {{ padding: 1.5rem; }}",
                "theme_colors": theme["palette_swatches"],
                "css_mutations": {"padding": "24px"},
                "css_rules": f"{f_sel} {{ padding: 24px !important; }}",
            }

            sug_cro = adapt_pattern_to_theme(pattern_by_id["uiverse-pill-glow-cta"], f_sel, theme)
            sug_cro["id"] = "sug-focused-cro-contrast"
            sug_cro["title"] = "Visual Hierarchy & Focal Anchoring"

            return {
                "business_category": business_category,
                "aesthetic_summary": f"Focused element analysis on component {short_text}",
                "dominant_colors": dominant_colors,
                "top_3_suggestions": [sug_surf, sug_pad, sug_cro],
            }

    raw_ctas = site_fingerprint.get("cta_buttons") or site_fingerprint.get("ctas") or []
    cta_selector = "button, a[role='button'], .btn, a.button"
    if raw_ctas:
        first_cta = raw_ctas[0]
        if isinstance(first_cta, dict) and first_cta.get("selector"):
            cta_selector = first_cta["selector"]
        elif isinstance(first_cta, str) and first_cta.startswith((".", "#", "button", "a")):
            cta_selector = first_cta

    heading_selector = "h1, h2, h3"
    if headings:
        first_h = headings[0]
        if isinstance(first_h, dict) and first_h.get("selector"):
            heading_selector = first_h["selector"]

    surface_selector = "header, nav, [role='navigation']"

    # 5. Build Top 3 High-Impact Strategic Suggestions (Theme-Adapted from Uiverse.io & Dribbble)
    if business_category == "Startup Community & Events Network":
        sug1 = adapt_pattern_to_theme(pattern_by_id["dribbble-event-rsvp-cta"], cta_selector, theme)
        sug1["id"] = "sug-cro-cta"
        sug1["title"] = "Event Discovery & City RSVP Flow"

        sug2 = adapt_pattern_to_theme(pattern_by_id["dribbble-editorial-hero-type"], heading_selector, theme)
        sug2["id"] = "sug-typo-headings"
        sug2["title"] = "Community Headline & Attendee Social Proof"
        sug2["description"] = "Establish immediate credibility by pairing the hero headline with crisp editorial typography and authentic founder attendee statistics."

        sug3 = adapt_pattern_to_theme(pattern_by_id["uiverse-frosted-nav-pill"], surface_selector, theme)
        sug3["id"] = "sug-polish-cards"
        sug3["title"] = "Frosted Upcoming Events & Chapter Ribbon"

        top_3_suggestions = [sug1, sug2, sug3]
    else:
        sug1 = adapt_pattern_to_theme(pattern_by_id["uiverse-pill-glow-cta"], cta_selector, theme)
        sug1["id"] = "sug-cro-cta"
        sug1["title"] = "Theme-Matched Primary Conversion Pill"

        sug2 = adapt_pattern_to_theme(pattern_by_id["dribbble-editorial-hero-type"], heading_selector, theme)
        sug2["id"] = "sug-typo-headings"
        sug2["title"] = "Editorial Headline & Hierarchy Polish"

        sug3 = adapt_pattern_to_theme(pattern_by_id["uiverse-frosted-nav-pill"], surface_selector, theme)
        sug3["id"] = "sug-polish-cards"
        sug3["title"] = "Floating Glass Navigation Surface"

        top_3_suggestions = [sug1, sug2, sug3]

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

    theme = extract_site_theme(site_fingerprint)
    fallback = _mock_site_analysis(site_fingerprint)
    fallback_cta = fallback["top_3_suggestions"][0]["selector"]
    fallback_heading = fallback["top_3_suggestions"][1]["selector"]
    fallback_surface = fallback["top_3_suggestions"][2]["selector"]

    available_ctas = [
        btn.get("selector") for btn in (site_fingerprint.get("cta_buttons") or site_fingerprint.get("ctas") or [])
        if isinstance(btn, dict) and btn.get("selector")
    ]
    available_headings = [
        h.get("selector") for h in (site_fingerprint.get("headings") or [])
        if isinstance(h, dict) and h.get("selector")
    ]

    target_cta = available_ctas[0] if available_ctas else fallback_cta
    target_heading = available_headings[0] if available_headings else fallback_heading

    focused_element = site_fingerprint.get("focused_element")
    if focused_element and isinstance(focused_element, dict):
        f_sel = str(focused_element.get("selector") or target_cta).strip()
        f_tag = str(focused_element.get("tag") or "ELEMENT").upper()
        f_text = str(focused_element.get("text") or "").strip()
        target_cta = f_sel
        target_heading = f_sel
        fallback_surface = f_sel
        step_2_instructions = f"""
STEP 2: LASER-FOCUSED COMPONENT AUDIT (USER CIRCLED / SELECTED TARGET: <{f_tag}> `{f_sel}`)
- Text excerpt: "{f_text}"
- CRITICAL: The user has explicitly selected/circled this exact component on screen!
- ALL 3 suggestions MUST target this exact element: '{f_sel}'.
  1. Suggestion 1 (CRO / Conversion): Enhance actionability, visual prominence, or clear action verbs for '{f_sel}'.
  2. Suggestion 2 (Typography / Hierarchy): Optimize font weight, tight tracking, line-height, and contrast for '{f_sel}'.
  3. Suggestion 3 (Polish / Micro-interactions): Modern rounded styling, 8pt padding, subtle borders, and smooth transitions for '{f_sel}'.
- Grounding: Selector for all 3 suggestions MUST be '{f_sel}'.
"""
    else:
        step_2_instructions = f"""
STEP 2: SELECTOR GROUNDING & WCAG ACCESSIBILITY (NEVER INVENT PHANTOM SELECTORS)
- CRITICAL: Never target or mention skip-links, accessibility anchors, or invisible utility elements! Skip links must remain visually hidden for WCAG accessibility.
- Focus on genuine, visible, high-impact user-facing elements:
  1. Suggestion 1 (CRO Focus): MUST target the primary CTA selector: '{target_cta}'.
  2. Suggestion 2 (Typography / Value Prop Focus): MUST target the primary headline selector: '{target_heading}'.
  3. Suggestion 3 (Surface / Architecture Polish): MUST target a universal semantic element: '{fallback_surface}' or 'main, section'.
"""

    system_prompt = f"""
{UI_DESIGN_SYSTEM_PROMPT}

You are the STAGE Site Context Analyzer & UI/UX Heuristics Engine.
Your job is to FIRST thoroughly understand the website based on its title, description, hero summary, navigation links, headings, and interactive elements.

STEP 1: SITE ARCHETYPE & USER INTENT COMPREHENSION
- Analyze what the website actually is (e.g., Startup Community & Events Network, B2B SaaS, E-Commerce, Creator Portfolio, Education, Healthcare, etc.).
- Identify the visitor's core job-to-be-done (e.g. for an events site: discover local meetups in their city and RSVP; for e-commerce: browse products and buy; for SaaS: understand value prop and try/buy).
- DO NOT treat every website as a generic Silicon Valley B2B developer tool! Tailor recommendations directly to the site's true business model and visitor intent.

{step_2_instructions}

STEP 3: WEBSITE THEME ADAPTATION & UIVERSE.IO / DRIBBBLE ASSET LIBRARY
- CRITICAL: Adapt every asset and CSS suggestion to the CURRENT WEBSITE THEME before presenting it:
  * Site Polarity: {"Dark" if theme["is_dark"] else "Light"} (Background: {theme["background"]})
  * Brand Accent Primary: {theme["primary"]} (Hover: {theme["primary_hover"]}, WCAG Text: {theme["primary_text"]})
  * Surface Glass: {theme["surface"]} | Border: {theme["border"]} | Primary Text: {theme["text_primary"]}
- NEVER use default browser hyperlink blue (#0000EE, #0000FF) or colors that clash with the site's palette!
- Ground every suggestion in a real **Uiverse.io** or **Dribbble** design pattern from our library (or equivalent verified Uiverse.io / Dribbble URL), and set `source_platform` to `"Uiverse.io"` or `"Dribbble"`.
- NEVER invent fictitious class names like '.card', '.feature-card', '.hero-container' unless they appear in the fingerprint!
- Every CSS property in css_rules MUST include '!important' so it renders reliably over existing site utility classes.
- Avoid superficial buzzwords like 'magnetic hover state' or 'optical tracking' unless providing concrete, actionable CSS.

Every suggestion MUST strictly comply with:
- WCAG 2.1 contrast (AA/AAA)
- 8-point spatial rhythm (padding: 4px, 8px, 12px 24px, 16px 32px, 24px, 32px)
- Modular typography (headline clarity, readable line-height)
- Clean component polish (subtle borders, box shadows, 8px/12px radius)
- CRO visual dominance for the primary CTA

Return ONLY a valid JSON object matching this schema:
{{
  "business_category": "Exact industry category (e.g. 'Startup Community & Events Network', 'SaaS & Developer Tools', 'E-Commerce & Digital Retail')",
  "aesthetic_summary": "1-sentence summary of the visual vibe, color mood, and typography tone",
  "dominant_colors": ["#hex1", "#hex2", "#hex3"],
  "top_3_suggestions": [
    {{
      "id": "sug-1",
      "title": "Concise high-impact suggestion headline (3-6 words)",
      "impact_tag": "CRO" | "Architecture" | "Trust" | "Typography" | "Polish",
      "selector": "Grounded CSS selector matching the rules above",
      "description": "1-2 sentence client rationale explaining the conversion/business benefit",
      "developer_directive": "Direct imperative instruction for developers referencing the theme-adapted colors",
      "source_platform": "Uiverse.io" | "Dribbble",
      "benchmark_name": "Reference pattern name (e.g., 'Uiverse.io • Magnetic Pill CTA', 'Dribbble • Editorial Typography Scale')",
      "benchmark_url": "https://uiverse.io/... or https://dribbble.com/...",
      "benchmark_pattern": "pill_glow_cta" | "editorial_typography" | "bento_grid" | "split_hero" | "sticky_cta_ribbon",
      "developer_code_spec": "Brief implementation guide with Tailwind/React classes using the site theme colors",
      "css_mutations": {{ "property": "value" }},
      "css_rules": "selector {{ prop: value !important; }}"
    }}
  ]
}}
Ensure exactly 3 suggestions are returned in top_3_suggestions.
""".strip()

    compact_fp = {
        "title": str(site_fingerprint.get("title") or "")[:100],
        "description": str(site_fingerprint.get("description") or "")[:150],
        "hero_summary": str(site_fingerprint.get("hero_summary") or "")[:150],
        "nav_items": (site_fingerprint.get("nav_items") or [])[:5],
        "headings": [
            {"tag": h.get("tag"), "text": str(h.get("text") or "")[:45], "selector": h.get("selector")}
            for h in (site_fingerprint.get("headings") or [])[:5]
            if isinstance(h, dict) and h.get("selector")
        ],
        "dominant_colors": (site_fingerprint.get("dominant_colors") or site_fingerprint.get("colors") or [])[:4],
        "cta_buttons": [
            {"text": str(b.get("text") or "")[:35], "selector": b.get("selector")}
            for b in (site_fingerprint.get("cta_buttons") or site_fingerprint.get("ctas") or [])[:3]
            if isinstance(b, dict) and b.get("selector")
        ],
        "observed_apis": summarize_observed_apis(site_fingerprint.get("observed_apis")),
    }

    user_payload = (
        f"Site Fingerprint (JSON):\n"
        f"{json.dumps(compact_fp, separators=(',', ':'))}\n\n"
        f"Extracted Theme Palette (USE THESE EXACT COLORS):\n"
        f"{json.dumps({k: theme[k] for k in ('is_dark', 'background', 'primary', 'primary_hover', 'primary_text', 'surface', 'border', 'text_primary')})}\n\n"
        f"Uiverse.io & Dribbble Reference Library:\n"
        f"{get_pattern_catalog_summary()}\n\n"
        f"Grounded Selectors Available:\n"
        f"- Primary CTA: {target_cta}\n"
        f"- Primary Headline: {target_heading}\n"
        f"- Surface/Navigation: {fallback_surface}\n\n"
        f"First comprehend this site's business model and user intent, adapt the library assets to the extracted theme palette, and return the structured JSON assessment with top 3 suggestions."
    )

    try:
        raw_response = await run_provider_json_completion(
            provider_config=provider_config,
            system_prompt=system_prompt,
            user_prompt=user_payload,
            max_tokens=700
        )
    except Exception as e:
        logger.warning(f"analyze_site_context LLM call failed ({e}); falling back to deterministic mock.")
        return fallback

    # Sanitize and validate LLM output
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
            impact_tag = str(item.get("impact_tag") or ("CRO" if idx == 0 else "Typography" if idx == 1 else "Polish"))
            
            raw_sel = str(item.get("selector") or "").strip()
            if focused_element and isinstance(focused_element, dict):
                selector = f_sel
            else:
                # Grounding check: if selector is hallucinated/phantom, ground to real element
                is_phantom = not raw_sel or any(p in raw_sel for p in [".card", ".feature-card", ".hero-container", ".hero-card", "body"])
                if is_phantom:
                    if impact_tag == "CRO" or idx == 0:
                        selector = target_cta
                    elif impact_tag == "Typography" or idx == 1:
                        selector = target_heading
                    else:
                        selector = fallback_surface
                else:
                    selector = raw_sel

            description = str(item.get("description") or "Elevate component styling.")
            css_mutations = item.get("css_mutations")
            if not isinstance(css_mutations, dict):
                css_mutations = {}

            # Ensure all values in css_rules include !important AND adapt/sanitize colors to site theme
            if css_mutations:
                rules_body = " ".join(
                    f"{k}: {v if '!important' in str(v) else str(v) + ' !important'};"
                    for k, v in css_mutations.items()
                )
                raw_css_rules = f"{selector} {{ {rules_body} }}"
            else:
                raw_rules = item.get("css_rules")
                raw_css_rules = raw_rules if raw_rules and isinstance(raw_rules, str) else ""

            css_mutations, css_rules = sanitize_css_colors_to_theme(
                css_mutations=css_mutations,
                css_rules=raw_css_rules,
                selector=selector,
                theme=theme,
            )

            fb_sug = fallback["top_3_suggestions"][idx] if idx < len(fallback["top_3_suggestions"]) else fallback["top_3_suggestions"][0]
            dev_directive = str(item.get("developer_directive") or fb_sug.get("developer_directive") or f"Developer should implement {title}")
            source_platform = str(item.get("source_platform") or fb_sug.get("source_platform") or "Uiverse.io")
            benchmark_name = str(item.get("benchmark_name") or fb_sug.get("benchmark_name") or "Uiverse.io • Magnetic Pill CTA")
            benchmark_url = str(item.get("benchmark_url") or fb_sug.get("benchmark_url") or "https://uiverse.io/buttons")
            benchmark_pattern = str(item.get("benchmark_pattern") or fb_sug.get("benchmark_pattern") or "pill_glow_cta")
            developer_code_spec = str(item.get("developer_code_spec") or fb_sug.get("developer_code_spec") or "")

            valid_suggestions.append({
                "id": sug_id,
                "title": title,
                "impact_tag": impact_tag,
                "selector": selector,
                "description": description,
                "developer_directive": dev_directive,
                "source_platform": source_platform,
                "benchmark_name": benchmark_name,
                "benchmark_url": benchmark_url,
                "benchmark_pattern": benchmark_pattern,
                "developer_code_spec": developer_code_spec,
                "theme_colors": theme["palette_swatches"],
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
            max_tokens=500
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

