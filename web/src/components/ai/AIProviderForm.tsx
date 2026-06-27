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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {localError && (
        <div className="p-3 text-sm text-red-500 bg-red-500/10 rounded-md border border-red-500/20">
          {localError}
        </div>
      )}
      
      {!isEditing && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Provider</label>
          <select 
            value={provider} 
            onChange={e => setProvider(e.target.value as ProviderName)}
            className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-white focus:ring-1 focus:ring-blue-500"
          >
            {Object.keys(PROVIDER_DEFAULTS).map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Display Name</label>
        <input 
          type="text" 
          value={displayName} 
          onChange={e => setDisplayName(e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-white"
          placeholder="My API Key"
        />
      </div>

      {provider === 'openai_compatible' && (
        <div className="p-3 text-xs bg-blue-500/10 rounded-md border border-blue-500/20 text-blue-455">
          Enter the provider’s OpenAI-compatible base URL and model name.
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          API Key {isEditing && <span className="text-gray-500 font-normal">(Leave blank to keep existing)</span>}
          {!isEditing && provider === 'ollama' && <span className="text-gray-500 font-normal">(Optional)</span>}
        </label>
        <input 
          type="password" 
          value={apiKey} 
          onChange={e => setApiKey(e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-white"
          placeholder={isEditing ? '••••••••••••••••' : 'sk-...'}
        />
        <p className="text-xs text-gray-500 mt-1">Stored securely and never shown again after save.</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Base URL</label>
        <input 
          type="url" 
          value={baseUrl} 
          onChange={e => setBaseUrl(e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-white"
          placeholder="https://api.openai.com/v1"
        />
        <p className="text-xs text-gray-500 mt-1">Required for custom or OpenAI-compatible endpoints.</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Model Name</label>
        <input 
          type="text" 
          value={modelName} 
          onChange={e => setModelName(e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-white"
          placeholder="gpt-4o-mini"
        />
        <p className="text-xs text-gray-500 mt-1">Used for AI triage and session summaries.</p>
      </div>

      {isEditing && (
        <div className="flex items-center space-x-2 pt-2">
          <input 
            type="checkbox" 
            id="is_active"
            checked={isActive}
            onChange={e => setIsActive(e.target.checked)}
            className="rounded border-slate-700 bg-slate-800 text-blue-500"
          />
          <label htmlFor="is_active" className="text-sm font-medium text-gray-300">
            Active
          </label>
        </div>
      )}

      <div className="flex justify-end space-x-3 pt-4 border-t border-slate-700">
        {onCancel && (
          <button 
            type="button" 
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
        )}
        <button 
          type="submit" 
          disabled={store.isSaving}
          className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-md disabled:opacity-50 transition-colors"
        >
          {store.isSaving ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>
    </form>
  )
}
