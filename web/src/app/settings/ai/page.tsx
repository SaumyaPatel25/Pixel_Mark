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
    <div className="max-w-4xl mx-auto p-6 space-y-8 text-pm-text transition-colors duration-300">
      <div>
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-2xl font-extrabold text-pm-text">AI Providers</h1>
          <Link href="/settings" className="text-sm font-bold text-pm-muted hover:text-pm-accent transition-colors font-mono uppercase tracking-wider">
            ← Back to Settings
          </Link>
        </div>
        <p className="text-pm-muted font-medium text-sm mb-2">
          Connect your own AI provider to use AI triage and session summaries in STAGE.
        </p>
        <p className="text-pm-muted/60 text-xs font-semibold leading-relaxed">
          STAGE uses your provider key server-side for AI requests. Your usage is billed by your provider, not by STAGE.
        </p>
      </div>

      {/* Supported Providers Block */}
      <div className="p-5 rounded-2xl border border-pm-border bg-pm-surface shadow-sm space-y-3">
        <h3 className="text-sm font-bold text-pm-text">Supported Providers</h3>
        <div className="flex flex-wrap gap-2 text-xs">
          {["OpenAI", "OpenRouter", "Groq", "Together", "Mistral", "Fireworks", "xAI", "Ollama", "OpenAI-compatible"].map((p) => (
            <span key={p} className="px-2.5 py-1 rounded-md bg-pm-surface-2 border border-pm-border text-pm-text/80 font-bold shadow-sm">{p}</span>
          ))}
          {["Anthropic", "Google Gemini"].map((p) => (
            <span key={p} className="px-2.5 py-1 rounded-md bg-pm-bg border border-pm-border text-pm-muted font-bold" title="Live triage support may be limited.">{p} *</span>
          ))}
        </div>
        <p className="text-xs font-medium text-pm-muted leading-relaxed pt-1">
          Most OpenAI-compatible providers work with a base URL and model name. Some providers can be saved now even if live triage support is still limited.
        </p>
      </div>

      {store.error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 font-bold text-sm shadow-sm">
          {store.error}
        </div>
      )}

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold text-pm-text">Configured Providers</h2>
          {!showAddForm && !editingConfig && (
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-pm-accent hover:bg-pm-accent-bright rounded-xl transition-all shadow-md shadow-black/10 active:scale-95 cursor-pointer"
            >
              <Plus size={16} /> Add Provider
            </button>
          )}
        </div>

        {store.isLoading ? (
          <div className="text-pm-muted animate-pulse font-bold text-sm">Loading configurations...</div>
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
              <div className="col-span-full py-12 text-center border-2 border-dashed border-pm-border rounded-2xl bg-pm-surface/50">
                <p className="text-pm-muted font-bold text-sm mb-4">No AI providers configured yet.</p>
                <button
                  onClick={() => setShowAddForm(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-pm-accent bg-pm-surface border border-pm-border hover:bg-pm-surface-2 hover:border-pm-border-bright rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer"
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
            <div className="p-6 rounded-3xl border border-pm-border bg-pm-surface shadow-xl relative mt-4">
              <button
                onClick={() => {
                  setShowAddForm(false)
                  setEditingConfig(null)
                }}
                className="absolute top-5 right-5 text-pm-muted hover:text-pm-text transition-colors p-1.5 rounded-lg hover:bg-pm-surface-2 cursor-pointer"
              >
                <X size={20} />
              </button>
              <h3 className="text-lg font-bold text-pm-text mb-6 border-b border-pm-border pb-4">
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
      <div className="pt-8 border-t border-pm-border grid gap-6 md:grid-cols-3 text-sm">
        <div className="space-y-1">
          <h4 className="font-extrabold text-pm-text">Does STAGE provide the model?</h4>
          <p className="text-pm-muted leading-relaxed text-xs">No. You connect your own provider.</p>
        </div>
        <div className="space-y-1">
          <h4 className="font-extrabold text-pm-text">Where is my key used?</h4>
          <p className="text-pm-muted leading-relaxed text-xs">STAGE uses it server-side for triage and summary requests.</p>
        </div>
        <div className="space-y-1">
          <h4 className="font-extrabold text-pm-text">Why did my test fail?</h4>
          <p className="text-pm-muted leading-relaxed text-xs">The most common causes are an invalid key, wrong base URL, or unsupported provider adapter.</p>
        </div>
      </div>
    </div>
  )
}
