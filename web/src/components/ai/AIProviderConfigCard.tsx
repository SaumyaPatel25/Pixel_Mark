import React, { useState } from 'react'
import { AIProviderConfig } from '../../types/ai-provider'
import { useAIProviderStore } from '../../store/aiProviderStore'
import { CheckCircle2, Star, Edit2, Trash2, Shield, Activity, RefreshCw } from 'lucide-react'

interface CardProps {
  config: AIProviderConfig
  onEdit: () => void
}

export function AIProviderConfigCard({ config, onEdit }: CardProps) {
  const store = useAIProviderStore()
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)

  const isTesting = store.isTestingId === config.id
  const isSaving = store.isSaving

  const handleTest = async () => {
    setTestResult(null)
    const result = await store.testConfig(config.id)
    setTestResult(result)
    setTimeout(() => setTestResult(null), 5000)
  }

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this provider configuration?')) {
      await store.deleteConfig(config.id)
    }
  }

  return (
    <div className={`p-4 rounded-lg border ${config.is_default ? 'border-blue-500/50 bg-blue-500/5' : 'border-slate-800 bg-slate-800/50'} relative transition-colors`}>
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-semibold text-white flex items-center gap-2">
            {config.display_name || config.provider}
            {config.is_default && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-500/20 text-blue-400">
                <Star size={12} className="fill-current" /> Default
              </span>
            )}
            {!config.is_active && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-gray-500/20 text-gray-400">
                Inactive
              </span>
            )}
          </h3>
          <p className="text-sm text-gray-400 mt-1 capitalize">{config.provider}</p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={onEdit}
            disabled={isSaving}
            className="p-1.5 text-gray-400 hover:text-white rounded-md hover:bg-slate-700 transition-colors"
            title="Edit"
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={handleDelete}
            disabled={isSaving}
            className="p-1.5 text-red-400 hover:text-red-300 rounded-md hover:bg-red-500/10 transition-colors"
            title="Delete"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Shield size={14} />
          {config.has_api_key ? (
            <span className="text-green-400 flex items-center gap-1">
              <CheckCircle2 size={12} /> API Key saved securely
            </span>
          ) : (
            <span className="text-yellow-500">No API Key</span>
          )}
        </div>
        {config.model_name && (
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <span className="font-mono text-xs bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700 text-gray-300">
              {config.model_name}
            </span>
          </div>
        )}
        {config.base_url && (
          <div className="text-xs text-gray-500 truncate" title={config.base_url}>
            {config.base_url}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 pt-3 border-t border-slate-700/50">
        {!config.is_default && config.is_active && (
          <button
            onClick={() => store.setDefaultConfig(config.id)}
            disabled={isSaving}
            className="text-sm font-medium text-blue-400 hover:text-blue-300 disabled:opacity-50 transition-colors"
          >
            Set as Default
          </button>
        )}
        <button
          onClick={handleTest}
          disabled={isTesting || isSaving}
          className="text-sm font-medium flex items-center gap-1 text-gray-300 hover:text-white disabled:opacity-50 transition-colors"
        >
          {isTesting ? <RefreshCw size={14} className="animate-spin" /> : <Activity size={14} />}
          Test Connection
        </button>
      </div>

      {testResult && (
        <div className={`mt-3 p-2 rounded text-xs border ${testResult.success ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
          {testResult.message}
        </div>
      )}
    </div>
  )
}
