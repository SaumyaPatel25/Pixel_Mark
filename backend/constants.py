PROVIDER_METADATA = {
    "openai": {
        "default_base_url": "https://api.openai.com/v1",
        "supports_openai_compat": True,
        "default_model": "gpt-4o-mini"
    },
    "openrouter": {
        "default_base_url": "https://openrouter.ai/api/v1",
        "supports_openai_compat": True,
        "default_model": "openai/gpt-4o-mini"
    },
    "groq": {
        "default_base_url": "https://api.groq.com/openai/v1",
        "supports_openai_compat": True,
        "default_model": "llama-3.1-70b-versatile"
    },
    "together": {
        "default_base_url": "https://api.together.xyz/v1",
        "supports_openai_compat": True,
        "default_model": "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo"
    },
    "anthropic": {
        "default_base_url": "https://api.anthropic.com/v1",
        "supports_openai_compat": False,
        "default_model": "claude-3-5-sonnet-latest"
    },
    "google": {
        "default_base_url": "https://generativelanguage.googleapis.com/v1beta",
        "supports_openai_compat": False,
        "default_model": "gemini-1.5-flash"
    },
    "mistral": {
        "default_base_url": "https://api.mistral.ai/v1",
        "supports_openai_compat": True,
        "default_model": "mistral-large-latest"
    },
    "fireworks": {
        "default_base_url": "https://api.fireworks.ai/inference/v1",
        "supports_openai_compat": True,
        "default_model": "accounts/fireworks/models/llama-v3p1-70b-instruct"
    },
    "xai": {
        "default_base_url": "https://api.x.ai/v1",
        "supports_openai_compat": True,
        "default_model": "grok-beta"
    },
    "openai_compatible": {
        "default_base_url": "",
        "supports_openai_compat": True,
        "default_model": ""
    },
    "ollama": {
        "default_base_url": "http://localhost:11434/v1",
        "supports_openai_compat": True,
        "default_model": "llama3.1"
    }
}
