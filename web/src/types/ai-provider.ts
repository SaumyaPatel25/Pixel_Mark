export type ProviderName =
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'openrouter'
  | 'groq'
  | 'together'
  | 'mistral'
  | 'fireworks'
  | 'xai'
  | 'openai_compatible'
  | 'ollama'

export interface AIProviderConfig {
  id: string
  provider: ProviderName
  display_name?: string | null
  base_url?: string | null
  model_name?: string | null
  is_active: boolean
  is_default: boolean
  supports_openai_compat: boolean
  has_api_key: boolean
}

export interface CreateAIProviderConfigInput {
  provider: ProviderName
  api_key: string
  display_name?: string | null
  base_url?: string | null
  model_name?: string | null
}

export interface UpdateAIProviderConfigInput {
  api_key?: string | null
  display_name?: string | null
  base_url?: string | null
  model_name?: string | null
  is_active?: boolean
  is_default?: boolean
}

export interface TestAIProviderConfigResult {
  success: boolean
  message: string
}
