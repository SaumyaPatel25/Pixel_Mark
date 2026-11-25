import os
import re
import json
import logging
from openai import AsyncOpenAI

logger = logging.getLogger(__name__)

AI_TRIAGE_MAX_MARKERS = int(os.getenv("AI_TRIAGE_MAX_MARKERS", "50"))

async def run_provider_json_completion(
    provider_config: dict,
    system_prompt: str,
    user_prompt: str,
    max_tokens: int = 400,
    _per_provider_timeout: float = 6.0,
    _attempted_providers: set = None,
    _original_max_tokens: int = None
) -> dict:
    """
    _per_provider_timeout: seconds each individual provider attempt gets.
    Keep it tight (6s) so the fallback chain completes well inside the frontend
    deadline even when a provider is slow or down.
    _attempted_providers: prevents infinite recursive fallback loops.
    """
    if _attempted_providers is None:
        _attempted_providers = set()
    orig_tokens = _original_max_tokens or max_tokens

    provider = provider_config["provider"]
    api_key = provider_config["api_key"]
    base_url = provider_config.get("base_url")
    model_name = provider_config.get("model_name", "gpt-4o-mini")
    supports_compat = provider_config.get("supports_openai_compat", False)

    # Free Omni-Route & OpenAI-compatible provider defaults
    if provider == "groq":
        base_url = base_url or "https://api.groq.com/openai/v1"
        model_name = model_name or os.getenv("GROQ_FREE_MODEL", "qwen/qwen3.8-27b")
        supports_compat = True
    elif provider == "openrouter":
        base_url = base_url or "https://openrouter.ai/api/v1"
        model_name = model_name or os.getenv("OPENROUTER_FREE_MODEL", "google/gemma-4-26b-a4b-it:free")
        supports_compat = True
    elif provider in ("nvidia", "nim"):
        base_url = base_url or "https://integrate.api.nvidia.com/v1"
        model_name = model_name or os.getenv("NVIDIA_FREE_MODEL", "minimaxai/minimax-m3.1-flash")
        supports_compat = True
    elif provider in ("gemini", "google"):
        base_url = base_url or "https://generativelanguage.googleapis.com/v1beta/openai/"
        model_name = model_name or "gemini-1.5-flash"
        supports_compat = True
    elif provider == "openai":
        model_name = model_name or "gpt-4o-mini"
        supports_compat = True
    
    if supports_compat or provider == "ollama":
        if not api_key and provider != "ollama":
            raise RuntimeError("API key is required for this provider")
            
        try:
            client = AsyncOpenAI(
                api_key=api_key or "sk-dummy",
                base_url=base_url if base_url else None,
                timeout=_per_provider_timeout,
                max_retries=0
            )
            # Ensure sufficient tokens for JSON completions across all providers
            effective_tokens = max(max_tokens, 1024)
            
            # Format parameters: only use response_format for models that support it
            create_kwargs = {
                "model": model_name,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                "temperature": 0.2,
                "max_tokens": effective_tokens
            }
            # OpenRouter free models, OpenAI, and Groq support json_object mode
            if provider in ("groq", "openai", "openrouter"):
                create_kwargs["response_format"] = {"type": "json_object"}

            try:
                response = await client.chat.completions.create(**create_kwargs)
            except Exception as create_err:
                # If provider complained about response_format or unsupported schema, retry once without it
                if "response_format" in create_kwargs and any(term in str(create_err).lower() for term in ("response_format", "json_object", "400", "invalid")):
                    create_kwargs.pop("response_format", None)
                    response = await client.chat.completions.create(**create_kwargs)
                else:
                    raise create_err

            raw = response.choices[0].message.content or ""
            logger.debug(f"Raw AI response: {raw}")
            
            # Robust JSON parser: handles direct JSON, markdown code blocks, and embedded objects
            clean = raw.strip()
            # Strip markdown fences ```json ... ```
            if clean.startswith("```"):
                clean = re.sub(r"^```(?:json)?\s*", "", clean)
                clean = re.sub(r"\s*```$", "", clean)

            try:
                return json.loads(clean)
            except json.JSONDecodeError:
                # Extract first balanced or greedily matched JSON object
                match = re.search(r"(\{[\s\S]*\})", raw)
                if match:
                    try:
                        return json.loads(match.group(1))
                    except Exception:
                        pass
                logger.error(f"Failed to parse JSON response from {provider} ({model_name})")
                raise RuntimeError("AI returned invalid response")
                
        except Exception as e:
            from utils.encryption import mask_secret
            err_str = str(e)
            masked_key = mask_secret(api_key) if api_key else ""
            if api_key and api_key in err_str:
                err_str = err_str.replace(api_key, masked_key)
            logger.error(f"AI API call failed for provider {provider} (key: {masked_key}): {err_str}")

            _attempted_providers.add(provider)

            # 1. Key rotation: If openrouter fails (402 credits, token limit exceeded, or 401), try other keys in pool
            if provider == "openrouter":
                keys_str = os.getenv("OPENROUTER_API_KEYS") or os.getenv("OPENROUTER_API_KEY", "")
                all_keys = [k.strip() for k in keys_str.split(",") if k.strip()]
                if api_key in all_keys:
                    curr_idx = all_keys.index(api_key)
                    if curr_idx + 1 < len(all_keys):
                        next_key = all_keys[curr_idx + 1]
                        logger.info(f"OpenRouter key exhausted or failed; rotating to key {curr_idx + 1}...")
                        rotated_cfg = dict(provider_config)
                        rotated_cfg["api_key"] = next_key
                        return await run_provider_json_completion(
                            provider_config=rotated_cfg,
                            system_prompt=system_prompt,
                            user_prompt=user_prompt,
                            max_tokens=orig_tokens,
                            _per_provider_timeout=_per_provider_timeout,
                            _attempted_providers=_attempted_providers,
                            _original_max_tokens=orig_tokens
                        )

            # 2. Provider Rollup Failover: Try Groq if not yet attempted (Free model)
            groq_key = os.getenv("GROQ_API_KEY")
            if "groq" not in _attempted_providers and groq_key and groq_key.strip():
                logger.info(f"AI provider '{provider}' failed; rolling up to Groq (free model)...")
                groq_cfg = {
                    "provider": "groq",
                    "api_key": groq_key.strip(),
                    "base_url": "https://api.groq.com/openai/v1",
                    "model_name": os.getenv("GROQ_FREE_MODEL", "qwen/qwen3.8-27b"),
                    "supports_openai_compat": True
                }
                return await run_provider_json_completion(
                    provider_config=groq_cfg,
                    system_prompt=system_prompt,
                    user_prompt=user_prompt,
                    max_tokens=1024,
                    _per_provider_timeout=_per_provider_timeout,
                    _attempted_providers=_attempted_providers,
                    _original_max_tokens=orig_tokens
                )

            # 3. Provider Rollup Failover: Try OpenRouter if not yet attempted (Free model)
            openrouter_key = os.getenv("OPENROUTER_API_KEY")
            if "openrouter" not in _attempted_providers and openrouter_key and openrouter_key.strip():
                first_key = openrouter_key.split(",")[0].strip()
                if first_key:
                    logger.info(f"AI provider '{provider}' failed; rolling up to OpenRouter (free model)...")
                    or_cfg = {
                        "provider": "openrouter",
                        "api_key": first_key,
                        "base_url": "https://openrouter.ai/api/v1",
                        "model_name": os.getenv("OPENROUTER_FREE_MODEL", "google/gemma-4-26b-a4b-it:free"),
                        "supports_openai_compat": True
                    }
                    return await run_provider_json_completion(
                        provider_config=or_cfg,
                        system_prompt=system_prompt,
                        user_prompt=user_prompt,
                        max_tokens=orig_tokens,
                        _per_provider_timeout=_per_provider_timeout,
                        _attempted_providers=_attempted_providers,
                        _original_max_tokens=orig_tokens
                    )

            # 4. Provider Rollup Failover: Try NVIDIA NIM if available (Free model)
            nim_key = os.getenv("NVIDIA_NIM_KEY")
            if "nvidia" not in _attempted_providers and nim_key and nim_key.strip():
                logger.info(f"AI provider '{provider}' failed; rolling up to NVIDIA NIM (free model)...")
                nim_cfg = {
                    "provider": "nvidia",
                    "api_key": nim_key.strip(),
                    "base_url": "https://integrate.api.nvidia.com/v1",
                    "model_name": os.getenv("NVIDIA_FREE_MODEL", "minimaxai/minimax-m3.1-flash"),
                    "supports_openai_compat": True
                }
                return await run_provider_json_completion(
                    provider_config=nim_cfg,
                    system_prompt=system_prompt,
                    user_prompt=user_prompt,
                    max_tokens=orig_tokens,
                    _per_provider_timeout=_per_provider_timeout,
                    _attempted_providers=_attempted_providers,
                    _original_max_tokens=orig_tokens
                )

            if isinstance(e, RuntimeError):
                raise
            raise RuntimeError("AI service unavailable") from e
            
    elif provider in ("anthropic", "google"):
        raise RuntimeError(f"This provider ({provider}) is saved, but AI triage is not implemented for it yet")
    else:
        raise RuntimeError("Unsupported AI provider for triage")

async def triage_markers(markers: list[dict], session_title: str, target_url: str, provider_config: dict) -> dict:
    markers = markers[:AI_TRIAGE_MAX_MARKERS]
    
    system_prompt = """
You are a QA triage assistant for STAGE, a visual feedback platform.
You receive a list of UI bug markers captured from a live website review session.

Your job:
1. Assign a final priority to each marker: critical, high, medium, or low.
2. Write a 1-2 sentence ai_summary for each marker explaining WHY it matters
   and what the developer should fix.
3. Write a 1-2 sentence session_summary covering the overall state of the session.

Priority rules:
- critical: breaks core functionality, data loss risk, accessibility failure,
            or 4xx/5xx network errors on critical paths
- high: visible layout break, wrong copy, broken interaction, console errors present
- medium: cosmetic issue, minor UX friction, low-impact copy error
- low: nitpick, enhancement request, out-of-scope suggestion

Return ONLY valid JSON in this exact structure, nothing else:
{
  "session_summary": "...",
  "markers": [
    { "id": "...", "priority": "critical|high|medium|low", "ai_summary": "..." }
  ]
}
"""

    user_prompt = f"Session: {session_title}\nSite: {target_url}\n\nMarkers:\n"
    for marker in markers:
        user_prompt += (
            "---\n"
            f"ID: {marker.get('id')}\n"
            f"Title: {marker.get('title', 'Untitled')}\n"
            f"Description: {marker.get('description', '')}\n"
            f"Issue Type: {marker.get('issue_type', '')}\n"
            f"User Severity: {marker.get('severity', '')}\n"
            f"Page URL: {marker.get('page_url', '')}\n"
            f"Element Text: {str(marker.get('inner_text', ''))[:100]}\n"
            f"Console Errors: {str(marker.get('console_errors', []))[:200]}\n"
            f"Network Errors: {str(marker.get('network_errors', []))[:200]}\n"
            f"Renderer: {marker.get('renderer_type', 'dom')}\n"
            "---\n"
        )

    return await run_provider_json_completion(
        provider_config=provider_config,
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        max_tokens=600
    )


async def summarize_session(markers: list[dict], session_title: str, target_url: str, provider_config: dict) -> dict:
    markers = markers[:AI_TRIAGE_MAX_MARKERS]
    
    system_prompt = """
You are a QA analyst for STAGE, a visual feedback platform.
You receive a list of UI markers from a review session.

Your job: produce a structured session health summary.

Return ONLY valid JSON in this exact structure, nothing else:
{
  "overall_health": "critical|needs_work|good|clean",
  "top_issues": ["issue 1", "issue 2", "issue 3"],
  "suggested_fix_order": ["marker title or id 1", "marker title or id 2"],
  "session_summary": "2-3 sentence human-readable verdict"
}

overall_health rules:
- critical: any critical priority markers present
- needs_work: high priority markers present, no critical
- good: only medium/low markers
- clean: zero markers or all resolved
"""

    user_prompt = f"Session: {session_title}\nSite: {target_url}\n\nMarkers:\n"
    for marker in markers:
        user_prompt += (
            "---\n"
            f"ID: {marker.get('id')}\n"
            f"Title: {marker.get('title', 'Untitled')}\n"
            f"Description: {marker.get('description', '')}\n"
            f"Issue Type: {marker.get('issue_type', '')}\n"
            f"User Severity: {marker.get('severity', '')}\n"
            f"Page URL: {marker.get('page_url', '')}\n"
            f"Element Text: {str(marker.get('inner_text', ''))[:100]}\n"
            f"Console Errors: {str(marker.get('console_errors', []))[:200]}\n"
            f"Network Errors: {str(marker.get('network_errors', []))[:200]}\n"
            f"Renderer: {marker.get('renderer_type', 'dom')}\n"
            "---\n"
        )

    return await run_provider_json_completion(
        provider_config=provider_config,
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        max_tokens=600
    )


async def resolve_ai_provider(db=None, user=None):
    """Lazy delegation to hierarchical Omni-Route resolver in copilot_service."""
    from services.copilot_service import resolve_ai_provider as _resolver
    return await _resolver(db=db, user=user)
