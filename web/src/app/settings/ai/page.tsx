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
          <h1 className="text-2xl font-extrabold text-[#1E2022]">AI Providers</h1>
          <Link href="/settings" className="text-sm font-bold text-[#1E2022]/40 hover:text-[#253B80] transition-colors">
            ← Back to Settings
          </Link>
        </div>
        <p className="text-[#1E2022]/60 font-medium text-sm mb-2">
          Connect your own AI provider to use AI triage and session summaries in PixelMark.
        </p>
        <p className="text-[#1E2022]/40 text-xs font-semibold leading-relaxed">
          PixelMark uses your provider key server-side for AI requests. Your usage is billed by your provider, not by PixelMark.
        </p>
      </div>

      {/* Supported Providers Block */}
      <div className="p-5 rounded-2xl border border-[#253B80]/8 bg-white shadow-sm space-y-3">
        <h3 className="text-sm font-bold text-[#1E2022]">Supported Providers</h3>
        <div className="flex flex-wrap gap-2 text-xs">
          {["OpenAI", "OpenRouter", "Groq", "Together", "Mistral", "Fireworks", "xAI", "Ollama", "OpenAI-compatible"].map((p) => (
            <span key={p} className="px-2.5 py-1 rounded-md bg-[#F8F7F4] border border-[#253B80]/10 text-[#1E2022]/70 font-bold shadow-sm">{p}</span>
          ))}
          {["Anthropic", "Google Gemini"].map((p) => (
            <span key={p} className="px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200 text-slate-500 font-bold" title="Live triage support may be limited.">{p} *</span>
          ))}
        </div>
        <p className="text-xs font-medium text-[#1E2022]/50 leading-relaxed pt-1">
          Most OpenAI-compatible providers work with a base URL and model name. Some providers can be saved now even if live triage support is still limited.
        </p>
      </div>

      {store.error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-600 font-bold text-sm shadow-sm">
          {store.error}
        </div>
      )}

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold text-[#1E2022]">Configured Providers</h2>
          {!showAddForm && !editingConfig && (
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-[#253B80] hover:bg-[#1E2E66] rounded-xl transition-all shadow-md shadow-[#253B80]/20 active:scale-95"
            >
              <Plus size={16} /> Add Provider
            </button>
          )}
        </div>

        {store.isLoading ? (
          <div className="text-[#1E2022]/40 animate-pulse font-bold text-sm">Loading configurations...</div>
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
              <div className="col-span-full py-12 text-center border-2 border-dashed border-[#253B80]/15 rounded-2xl bg-white/50">
                <p className="text-[#1E2022]/50 font-bold text-sm mb-4">No AI providers configured yet.</p>
                <button
                  onClick={() => setShowAddForm(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-[#253B80] bg-[#F8F7F4] border border-[#253B80]/10 hover:bg-white hover:border-[#253B80]/20 rounded-xl transition-all shadow-sm active:scale-95"
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
            <div className="p-6 rounded-3xl border border-[#253B80]/15 bg-white shadow-xl relative mt-4">
              <button
                onClick={() => {
                  setShowAddForm(false)
                  setEditingConfig(null)
                }}
                className="absolute top-5 right-5 text-[#1E2022]/30 hover:text-[#1E2022] transition-colors p-1.5 rounded-lg hover:bg-slate-50"
              >
                <X size={20} />
              </button>
              <h3 className="text-lg font-bold text-[#1E2022] mb-6 border-b border-[#253B80]/5 pb-4">
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
      <div className="pt-8 border-t border-[#253B80]/8 grid gap-6 md:grid-cols-3 text-sm">
        <div className="space-y-1">
          <h4 className="font-extrabold text-[#1E2022]">Does PixelMark provide the model?</h4>
          <p className="text-[#1E2022]/60 font-medium leading-relaxed text-xs">No. You connect your own provider.</p>
        </div>
        <div className="space-y-1">
          <h4 className="font-extrabold text-[#1E2022]">Where is my key used?</h4>
          <p className="text-[#1E2022]/60 font-medium leading-relaxed text-xs">PixelMark uses it server-side for triage and summary requests.</p>
        </div>
        <div className="space-y-1">
          <h4 className="font-extrabold text-[#1E2022]">Why did my test fail?</h4>
          <p className="text-[#1E2022]/60 font-medium leading-relaxed text-xs">The most common causes are an invalid key, wrong base URL, or unsupported provider adapter.</p>
        </div>
      </div>
    </div>
  )
}
