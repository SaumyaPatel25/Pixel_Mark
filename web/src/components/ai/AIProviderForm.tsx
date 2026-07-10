import React, { useState, useEffect } from 'react'
import { ProviderName, AIProviderConfig, CreateAIProviderConfigInput, UpdateAIProviderConfigInput } from '../../types/ai-provider'
import { useAIProviderStore } from '../../store/aiProviderStore'

interface AIProviderFormProps {
  initialConfig?: AIProviderConfig | null
  onSuccess?: () => void
  onCancel?: () => void
}

const PROVIDER_DEFAULTS: Record<ProviderName, { base_url: string; model_name: string }> = {
  openai: { base_url: 'https://api.openai.com/v1', model_name: 'gpt-4o-mini' },
  openrouter: { base_url: 'https://openrouter.ai/api/v1', model_name: 'openai/gpt-4o-mini' },
  groq: { base_url: 'https://api.groq.com/openai/v1', model_name: 'llama-3.1-70b-versatile' },
  together: { base_url: 'https://api.together.xyz/v1', model_name: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo' },
  anthropic: { base_url: 'https://api.anthropic.com/v1', model_name: 'claude-3-5-sonnet-latest' },
  google: { base_url: 'https://generativelanguage.googleapis.com/v1beta', model_name: 'gemini-1.5-flash' },
  mistral: { base_url: 'https://api.mistral.ai/v1', model_name: 'mistral-large-latest' },
  fireworks: { base_url: 'https://api.fireworks.ai/inference/v1', model_name: 'accounts/fireworks/models/llama-v3p1-70b-instruct' },
  xai: { base_url: 'https://api.x.ai/v1', model_name: 'grok-beta' },
  openai_compatible: { base_url: '', model_name: '' },
  ollama: { base_url: 'http://localhost:11434/v1', model_name: 'llama3.1' }
}

export function AIProviderForm({ initialConfig, onSuccess, onCancel }: AIProviderFormProps) {
  const isEditing = !!initialConfig
  const store = useAIProviderStore()
  
  const [provider, setProvider] = useState<ProviderName>(initialConfig?.provider || 'openai')
  const [displayName, setDisplayName] = useState(initialConfig?.display_name || '')
  const [apiKey, setApiKey] = useState('')
  const [baseUrl, setBaseUrl] = useState(initialConfig?.base_url || PROVIDER_DEFAULTS['openai'].base_url)
  const [modelName, setModelName] = useState(initialConfig?.model_name || PROVIDER_DEFAULTS['openai'].model_name)
  const [isActive, setIsActive] = useState(initialConfig?.is_active ?? true)
  
  const [localError, setLocalError] = useState<string | null>(null)

  useEffect(() => {
    if (!isEditing && provider) {
      setBaseUrl(PROVIDER_DEFAULTS[provider].base_url)
      setModelName(PROVIDER_DEFAULTS[provider].model_name)
      if (provider === 'openai_compatible') {
        setDisplayName('Custom Provider')
      } else {
        setDisplayName(provider.charAt(0).toUpperCase() + provider.slice(1))
      }
    }
  }, [provider, isEditing])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError(null)

    try {
      if (isEditing) {
        const updateData: UpdateAIProviderConfigInput = {
          display_name: displayName,
          base_url: baseUrl,
          model_name: modelName,
          is_active: isActive,
        }
        if (apiKey) updateData.api_key = apiKey
        
        await store.updateConfig(initialConfig.id, updateData)
      } else {
        if (!apiKey && provider !== 'ollama') {
          setLocalError('API Key is required for this provider')
          return
        }
        
        const createData: CreateAIProviderConfigInput = {
          provider,
          api_key: apiKey,
          display_name: displayName,
          base_url: baseUrl,
          model_name: modelName
        }
        
        await store.createConfig(createData)
      }
      
      if (onSuccess) onSuccess()
    } catch (err: any) {
      setLocalError(err.message || 'Failed to save configuration')
    }
  }

  const inputClass = "w-full bg-[#F8F7F4] border border-[#253B80]/8 hover:border-[#253B80]/15 rounded-xl px-4 py-2.5 text-sm font-medium text-[#1E2022] focus:outline-none focus:border-[#253B80] focus:ring-1 focus:ring-[#253B80]/20 shadow-inner transition-all placeholder:text-[#1E2022]/30"

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {localError && (
        <div className="p-3 text-sm font-bold text-red-600 bg-red-50 rounded-xl border border-red-200">
          {localError}
        </div>
      )}
      
      {!isEditing && (
        <div>
          <label className="block text-xs font-bold text-[#1E2022] mb-1.5 ml-1">Provider</label>
          <select 
            value={provider} 
            onChange={e => setProvider(e.target.value as ProviderName)}
            className={inputClass}
          >
            {Object.keys(PROVIDER_DEFAULTS).map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="block text-xs font-bold text-[#1E2022] mb-1.5 ml-1">Display Name</label>
        <input 
          type="text" 
          value={displayName} 
          onChange={e => setDisplayName(e.target.value)}
          className={inputClass}
          placeholder="My API Key"
        />
      </div>

      {provider === 'openai_compatible' && (
        <div className="p-3 text-xs font-bold bg-blue-50 rounded-xl border border-blue-100 text-[#253B80]">
          Enter the provider’s OpenAI-compatible base URL and model name.
        </div>
      )}

      <div>
        <label className="block text-xs font-bold text-[#1E2022] mb-1.5 ml-1">
          API Key {isEditing && <span className="text-[#1E2022]/40 font-semibold">(Leave blank to keep existing)</span>}
          {!isEditing && provider === 'ollama' && <span className="text-[#1E2022]/40 font-semibold">(Optional)</span>}
        </label>
        <input 
          type="password" 
          value={apiKey} 
          onChange={e => setApiKey(e.target.value)}
          className={inputClass}
          placeholder={isEditing ? '••••••••••••••••' : 'sk-...'}
        />
        <p className="text-[11px] font-semibold text-[#1E2022]/40 mt-1 ml-1">Stored securely and never shown again after save.</p>
      </div>

      <div>
        <label className="block text-xs font-bold text-[#1E2022] mb-1.5 ml-1">Base URL</label>
        <input 
          type="url" 
          value={baseUrl} 
          onChange={e => setBaseUrl(e.target.value)}
          className={inputClass}
          placeholder="https://api.openai.com/v1"
        />
        <p className="text-[11px] font-semibold text-[#1E2022]/40 mt-1 ml-1">Required for custom or OpenAI-compatible endpoints.</p>
      </div>

      <div>
        <label className="block text-xs font-bold text-[#1E2022] mb-1.5 ml-1">Model Name</label>
        <input 
          type="text" 
          value={modelName} 
          onChange={e => setModelName(e.target.value)}
          className={inputClass}
          placeholder="gpt-4o-mini"
        />
        <p className="text-[11px] font-semibold text-[#1E2022]/40 mt-1 ml-1">Used for AI triage and session summaries.</p>
      </div>

      {isEditing && (
        <div className="flex items-center space-x-2 pt-2 ml-1">
          <input 
            type="checkbox" 
            id="is_active"
            checked={isActive}
            onChange={e => setIsActive(e.target.checked)}
            className="rounded border-[#253B80]/20 bg-white text-[#253B80] focus:ring-[#253B80]/20"
          />
          <label htmlFor="is_active" className="text-sm font-bold text-[#1E2022]">
            Active
          </label>
        </div>
      )}

      <div className="flex justify-end space-x-3 pt-6 border-t border-[#253B80]/8">
        {onCancel && (
          <button 
            type="button" 
            onClick={onCancel}
            className="px-5 py-2.5 text-xs font-bold text-[#1E2022]/60 hover:text-[#1E2022] hover:bg-slate-50 rounded-xl transition-colors"
          >
            Cancel
          </button>
        )}
        <button 
          type="submit" 
          disabled={store.isSaving}
          className="px-5 py-2.5 text-xs font-bold bg-[#253B80] hover:bg-[#1E2E66] text-white rounded-xl shadow-md shadow-[#253B80]/20 disabled:opacity-50 transition-colors active:scale-95"
        >
          {store.isSaving ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>
    </form>
  )
}
