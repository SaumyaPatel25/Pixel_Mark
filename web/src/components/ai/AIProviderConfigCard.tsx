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
    <div className={`p-4 rounded-xl border ${config.is_default ? 'border-[#253B80]/30 bg-blue-50/50' : 'border-[#253B80]/15 bg-white shadow-sm'} relative transition-colors`}>
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-bold text-[#1E2022] flex items-center gap-2">
            {config.display_name || config.provider}
            {config.is_default && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-extrabold bg-[#253B80]/10 text-[#253B80]">
                <Star size={12} className="fill-current" /> Default
              </span>
            )}
            {!config.is_active && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-extrabold bg-slate-100 text-slate-500">
                Inactive
              </span>
            )}
          </h3>
          <p className="text-xs font-semibold text-[#1E2022]/50 mt-1 capitalize">{config.provider}</p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={onEdit}
            disabled={isSaving}
            className="p-1.5 text-slate-400 hover:text-[#253B80] rounded-md hover:bg-[#F8F7F4] transition-colors"
            title="Edit"
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={handleDelete}
            disabled={isSaving}
            className="p-1.5 text-red-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors"
            title="Delete"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-xs font-medium text-[#1E2022]/60">
          <Shield size={14} />
          {config.has_api_key ? (
            <span className="text-emerald-600 flex items-center gap-1 font-bold">
              <CheckCircle2 size={12} /> API Key saved securely
            </span>
          ) : (
            <span className="text-amber-500 font-bold">No API Key</span>
          )}
        </div>
        {config.model_name && (
          <div className="flex items-center gap-2 text-sm">
            <span className="font-mono font-medium text-[10px] bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200 text-[#253B80]">
              {config.model_name}
            </span>
          </div>
        )}
        {config.base_url && (
          <div className="text-[11px] font-medium text-[#1E2022]/40 truncate" title={config.base_url}>
            {config.base_url}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 pt-3 border-t border-[#253B80]/8">
        {!config.is_default && config.is_active && (
          <button
            onClick={() => store.setDefaultConfig(config.id)}
            disabled={isSaving}
            className="text-xs font-bold text-[#253B80] hover:text-[#1E2E66] disabled:opacity-50 transition-colors"
          >
            Set as Default
          </button>
        )}
        <button
          onClick={handleTest}
          disabled={isTesting || isSaving}
          className="text-xs font-bold flex items-center gap-1.5 text-[#1E2022]/50 hover:text-[#1E2022] disabled:opacity-50 transition-colors ml-auto"
        >
          {isTesting ? <RefreshCw size={12} className="animate-spin" /> : <Activity size={12} />}
          Test Connection
        </button>
      </div>

      {testResult && (
        <div className={`mt-3 p-2.5 rounded-lg text-xs font-bold border ${testResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
          {testResult.message}
        </div>
      )}
    </div>
  )
}
