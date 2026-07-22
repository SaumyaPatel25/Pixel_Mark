import os
import json
import logging
from openai import AsyncOpenAI

logger = logging.getLogger(__name__)

AI_TRIAGE_MAX_MARKERS = int(os.getenv("AI_TRIAGE_MAX_MARKERS", "50"))

async def run_provider_json_completion(
    provider_config: dict,
    system_prompt: str,
    user_prompt: str,
    max_tokens: int = 2000
) -> dict:
    provider = provider_config["provider"]
    api_key = provider_config["api_key"]
    base_url = provider_config.get("base_url")
    model_name = provider_config.get("model_name", "gpt-4o-mini")
    supports_compat = provider_config.get("supports_openai_compat", False)
    
    if supports_compat or provider == "ollama":
        if not api_key and provider != "ollama":
            raise RuntimeError("API key is required for this provider")
            
        try:
            client = AsyncOpenAI(api_key=api_key or "sk-dummy", base_url=base_url if base_url else None)
            response = await client.chat.completions.create(
                model=model_name,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.2,
                max_tokens=max_tokens,
                response_format={"type": "json_object"}
            )
            raw = response.choices[0].message.content
            logger.debug(f"Raw AI response: {raw}")
            
            try:
                result = json.loads(raw)
                return result
            except json.JSONDecodeError as e:
                logger.error("Failed to parse JSON response")
                raise RuntimeError("AI returned invalid response") from e
                
        except Exception as e:
            from utils.encryption import mask_secret
            err_str = str(e)
            masked_key = mask_secret(api_key) if api_key else ""
            if api_key and api_key in err_str:
                err_str = err_str.replace(api_key, masked_key)
            logger.error(f"AI API call failed for provider {provider} (key: {masked_key}): {err_str}")
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
        max_tokens=2000
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
        max_tokens=2000
    )
