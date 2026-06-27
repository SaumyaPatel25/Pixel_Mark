'use client'

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAIProviderStore } from '@/store/aiProviderStore'
import { AIProviderConfigCard } from '@/components/ai/AIProviderConfigCard'
import { AIProviderForm } from '@/components/ai/AIProviderForm'
import { Plus, X } from 'lucide-react'
import { AIProviderConfig } from '@/types/ai-provider'
import Link from 'next/link'
import { posthog } from '@/lib/posthog'

export default function AISettingsPage() {
  const store = useAIProviderStore()
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingConfig, setEditingConfig] = useState<AIProviderConfig | null>(null)

  useEffect(() => {
    store.fetchConfigs()
    const params = new URLSearchParams(window.location.search)
    const sourceParam = params.get('source')
    const allowed = ['nav', 'session_cta', 'empty_state']
    const source = allowed.includes(sourceParam || '') ? sourceParam : 'unknown'
    posthog.capture('ai_settings_opened', { source })
  }, [])

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div>
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-2xl font-semibold text-white">AI Providers</h1>
          <Link href="/settings" className="text-sm text-gray-400 hover:text-white transition-colors">
            ← Back to Settings
          </Link>
        </div>
        <p className="text-gray-400 text-sm mb-2">
          Connect your own AI provider to use AI triage and session summaries in PixelMark.
        </p>
        <p className="text-gray-500 text-xs leading-relaxed">
          PixelMark uses your provider key server-side for AI requests. Your usage is billed by your provider, not by PixelMark.
        </p>
      </div>

      {/* Supported Providers Block */}
      <div className="p-5 rounded-xl border border-slate-800 bg-slate-800/20 space-y-3">
        <h3 className="text-sm font-semibold text-white">Supported Providers</h3>
        <div className="flex flex-wrap gap-2 text-xs">
          {["OpenAI", "OpenRouter", "Groq", "Together", "Mistral", "Fireworks", "xAI", "Ollama", "OpenAI-compatible"].map((p) => (
            <span key={p} className="px-2 py-1 rounded bg-slate-850 border border-slate-800 text-gray-300 font-medium">{p}</span>
          ))}
          {["Anthropic", "Google Gemini"].map((p) => (
            <span key={p} className="px-2 py-1 rounded bg-slate-850/50 border border-slate-800/60 text-gray-500 font-medium" title="Live triage support may be limited.">{p} *</span>
          ))}
        </div>
        <p className="text-xs text-gray-400 leading-relaxed pt-1">
          Most OpenAI-compatible providers work with a base URL and model name. Some providers can be saved now even if live triage support is still limited.
        </p>
      </div>

      {store.error && (
        <div className="p-4 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {store.error}
        </div>
      )}

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-medium text-white">Configured Providers</h2>
          {!showAddForm && !editingConfig && (
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-md transition-colors"
            >
              <Plus size={16} /> Add Provider
            </button>
          )}
        </div>

        {store.isLoading ? (
          <div className="text-gray-400 animate-pulse text-sm">Loading configurations...</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <AnimatePresence>
              {store.configs.map((config) => (
                <motion.div
                  key={config.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                >
                  <AIProviderConfigCard
                    config={config}
                    onEdit={() => {
                      setEditingConfig(config)
                      setShowAddForm(false)
                    }}
                  />
                </motion.div>
              ))}
            </AnimatePresence>

            {store.configs.length === 0 && !store.isLoading && !showAddForm && !editingConfig && (
              <div className="col-span-full py-12 text-center border border-dashed border-slate-700 rounded-lg bg-slate-800/30">
                <p className="text-gray-400 text-sm mb-4">No AI providers configured yet.</p>
                <button
                  onClick={() => setShowAddForm(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-md transition-colors"
                >
                  <Plus size={16} /> Setup First Provider
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {(showAddForm || editingConfig) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-6 rounded-lg border border-slate-700 bg-slate-800/50 relative">
              <button
                onClick={() => {
                  setShowAddForm(false)
                  setEditingConfig(null)
                }}
                className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
              <h3 className="text-lg font-medium text-white mb-4">
                {editingConfig ? 'Edit AI Provider' : 'Add AI Provider'}
              </h3>
              <AIProviderForm
                initialConfig={editingConfig}
                onSuccess={() => {
                  setShowAddForm(false)
                  setEditingConfig(null)
                }}
                onCancel={() => {
                  setShowAddForm(false)
                  setEditingConfig(null)
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAQ Strip */}
      <div className="pt-8 border-t border-slate-800 grid gap-6 md:grid-cols-3 text-sm">
        <div>
          <h4 className="font-semibold text-white mb-2">Does PixelMark provide the model?</h4>
          <p className="text-gray-400 leading-relaxed">No. You connect your own provider.</p>
        </div>
        <div>
          <h4 className="font-semibold text-white mb-2">Where is my key used?</h4>
          <p className="text-gray-400 leading-relaxed">PixelMark uses it server-side for triage and summary requests.</p>
        </div>
        <div>
          <h4 className="font-semibold text-white mb-2">Why did my test fail?</h4>
          <p className="text-gray-400 leading-relaxed">The most common causes are an invalid key, wrong base URL, or unsupported provider adapter.</p>
        </div>
      </div>
    </div>
  )
}
