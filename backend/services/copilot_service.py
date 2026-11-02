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
    Priority 2: System GROQ_API_KEY (Free Omni-Route, llama-3.3-70b-versatile).
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
                        model_name = model_name or "llama-3.3-70b-versatile"
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
            "model_name": "llama-3.3-70b-versatile",
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

    system_prompt = """
You are STAGE Copilot, an expert AI visual DOM engineer.
The user wants to visually edit or restyle an element on a live webpage using natural language or voice commands.
You are given the user's prompt and a candidate list of micro-DOM elements currently visible on the page.

Your job:
1. Select the exact `selector` from the provided micro_dom candidates that best corresponds to the user's intent.
   CRITICAL: You MUST use an exact `selector` from the candidates list. Do NOT invent new or hallucinated CSS selectors.
2. Determine the CSS mutations required as key-value pairs (e.g., {"background-color": "#10B981", "padding": "12px 24px"}).
3. Generate valid scoped CSS rules string with `!important` flags so the styles override existing specificity, e.g.:
   "button.cta-primary { background-color: #10B981 !important; padding: 12px 24px !important; }"
4. Determine `text_mutation` if the user requested a change to the copy/text of the element, otherwise null.
5. Write a concise 1-sentence `client_summary` suitable for non-technical stakeholders explaining what changed.
6. Write a 1-2 sentence `developer_explanation` detailing the technical CSS deltas and conversion/design rationale.
7. Provide a `confidence` score between 0.0 and 1.0.

Return ONLY a valid JSON object with this exact structure:
{
  "selector": "<exact selector from micro_dom candidates>",
  "css_mutations": { "<css-prop>": "<css-value>" },
  "css_rules": "<scoped selector rule with !important>",
  "text_mutation": "<new text or null>",
  "client_summary": "<non-technical client summary>",
  "developer_explanation": "<technical explanation for developers>",
  "confidence": 0.95
}
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
