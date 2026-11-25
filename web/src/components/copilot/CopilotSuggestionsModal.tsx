'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  Sparkles,
  Eye,
  EyeOff,
  Check,
  X,
  Loader2,
  TrendingUp,
  BookOpen,
  Palette,
  Lightbulb,
  ExternalLink,
  Wrench,
  Pin,
  Target,
} from 'lucide-react'
import { SiteSuggestion, FocusedElement } from './CopilotTypes'
import { cn } from '@/lib/utils'

export interface CopilotSuggestionsModalProps {
  isOpen: boolean
  onClose: () => void
  suggestions: SiteSuggestion[]
  onPreview: (suggestion: SiteSuggestion) => void
  onRevertPreview: (selector: string) => void
  onConfirmPin: (suggestion: SiteSuggestion) => Promise<void>
  isConfirming?: boolean
  focusContext?: FocusedElement | null
}

export function CopilotSuggestionsModal({
  isOpen,
  onClose,
  suggestions = [],
  onPreview,
  onRevertPreview,
  onConfirmPin,
  isConfirming = false,
  focusContext = null,
}: CopilotSuggestionsModalProps) {
  const [previewedId, setPreviewedId] = useState<string | null>(null)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  // Revert active preview when closing
  const handleClose = useCallback(() => {
    if (previewedId) {
      const activeSuggestion = suggestions.find((s) => s.id === previewedId)
      if (activeSuggestion) {
        onRevertPreview(activeSuggestion.selector)
      }
      setPreviewedId(null)
    }
    setActionError(null)
    onClose()
  }, [previewedId, suggestions, onRevertPreview, onClose])

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isConfirming) {
        e.preventDefault()
        handleClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isConfirming, handleClose])

  const handleTogglePreview = (suggestion: SiteSuggestion) => {
    setActionError(null)
    if (previewedId === suggestion.id) {
      // Revert current preview
      onRevertPreview(suggestion.selector)
      setPreviewedId(null)
    } else {
      // If another was previewed, revert it first
      if (previewedId) {
        const prev = suggestions.find((s) => s.id === previewedId)
        if (prev) {
          onRevertPreview(prev.selector)
        }
      }
      onPreview(suggestion)
      setPreviewedId(suggestion.id)
    }
  }

  const handleApply = async (suggestion: SiteSuggestion) => {
    setActionError(null)
    setConfirmingId(suggestion.id)
    try {
      await onConfirmPin(suggestion)
      if (previewedId === suggestion.id) {
        setPreviewedId(null)
      }
      onClose()
    } catch (err: any) {
      console.error('[CopilotSuggestionsModal] Failed to confirm pin:', err)
      setActionError(err.message || 'Failed to apply & pin suggestion.')
    } finally {
      setConfirmingId(null)
    }
  }

  if (!isOpen) return null

  const getImpactBadge = (tag: string) => {
    const lower = (tag || '').toLowerCase()
    if (lower.includes('conversion') || lower.includes('cro')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
          <TrendingUp className="w-3 h-3 text-emerald-400" />
          {tag}
        </span>
      )
    }
    if (lower.includes('readability') || lower.includes('typography')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-sky-500/15 text-sky-300 border border-sky-500/30">
          <BookOpen className="w-3 h-3 text-sky-400" />
          {tag}
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-violet-500/15 text-violet-300 border border-violet-500/30">
        <Palette className="w-3 h-3 text-violet-400" />
        {tag}
      </span>
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="suggestions-modal-title"
    >
      <div className="relative w-full max-w-3xl bg-[#0e0e17] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-white">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <div className={cn(
              "p-2 rounded-xl border transition-all",
              focusContext
                ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400"
                : "bg-violet-500/10 border-violet-500/30 text-violet-400"
            )}>
              {focusContext ? <Target className="w-4 h-4 text-emerald-400" /> : <Lightbulb className="w-4 h-4" />}
            </div>
            <div>
              <h2
                id="suggestions-modal-title"
                className="text-sm font-extrabold tracking-wide text-white flex items-center gap-2"
              >
                {focusContext ? 'Focused Component Suggestions' : 'Top 3 AI Design Suggestions'}
                {focusContext ? (
                  <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    {focusContext.source === 'circle' ? 'Circled' : 'Focused'}
                  </span>
                ) : (
                  <span className="text-[10px] font-mono font-normal px-2 py-0.5 rounded bg-violet-500/20 text-violet-300 border border-violet-500/30">
                    Site DNA
                  </span>
                )}
              </h2>
              {focusContext ? (
                <p className="text-[11px] text-white/60 truncate max-w-xl">
                  Targeted analysis on{' '}
                  <span className="text-emerald-300 font-mono font-semibold">&lt;{focusContext.tag?.toLowerCase() || 'element'}&gt;</span>{' '}
                  <span className="text-white/80 font-mono">({focusContext.selector})</span>
                  {focusContext.text ? ` • "${focusContext.text.slice(0, 40)}..."` : ''}
                </p>
              ) : (
                <p className="text-[11px] text-white/50">
                  AI analyzed your page structure, contrast, and visual rhythm to suggest high-impact improvements.
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isConfirming || confirmingId !== null}
            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-40"
            title="Close (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error notification */}
        {actionError && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-200 text-xs flex items-center justify-between">
            <span>{actionError}</span>
            <button
              type="button"
              onClick={() => setActionError(null)}
              className="text-rose-400 hover:text-rose-100"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Suggestions List */}
        <div className="p-6 space-y-4 overflow-y-auto">
          {suggestions.length === 0 ? (
            <div className="py-12 text-center text-white/40 text-xs">
              No suggestions available for this site yet.
            </div>
          ) : (
            suggestions.slice(0, 3).map((suggestion, index) => {
              const isThisPreviewed = previewedId === suggestion.id
              const isThisConfirming = confirmingId === suggestion.id

              return (
                <div
                  key={suggestion.id || index}
                  className={cn(
                    "relative p-4 rounded-xl border transition-all duration-200 bg-[#141422] flex flex-col gap-3 group",
                    isThisPreviewed
                      ? "border-violet-500/60 shadow-[0_0_24px_rgba(139,92,246,0.18)] ring-1 ring-violet-500/30"
                      : "border-white/10 hover:border-white/20"
                  )}
                >
                  {/* Top Row: Title & Impact Tag */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono font-bold text-violet-400">
                          #{index + 1}
                        </span>
                        <h3 className="text-xs sm:text-sm font-bold text-white tracking-wide">
                          {suggestion.title}
                        </h3>
                      </div>
                      <p className="text-xs text-white/70 leading-relaxed">
                        {suggestion.description}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      {getImpactBadge(suggestion.impact_tag)}
                    </div>
                  </div>

                  {/* Developer Directive Callout */}
                  {(suggestion.developer_directive || suggestion.description) && (
                    <div className="p-2.5 rounded-lg bg-black/40 border border-violet-500/20 text-xs">
                      <div className="flex items-center gap-1.5 text-violet-300 font-semibold mb-1">
                        <Wrench className="w-3.5 h-3.5 text-violet-400" />
                        <span>Developer Directive:</span>
                      </div>
                      <p className="text-white/80 leading-relaxed font-sans text-xs">
                        {suggestion.developer_directive || suggestion.description}
                      </p>
                    </div>
                  )}

                  {/* Benchmark Inspiration & Target Selector */}
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">
                        Target:
                      </span>
                      <span className="font-mono text-[11px] text-violet-300/80 bg-black/40 px-2 py-0.5 rounded border border-white/5 truncate max-w-[220px]">
                        {suggestion.selector}
                      </span>
                    </div>

                    {suggestion.benchmark_name && (
                      <div className="flex items-center gap-2 text-xs flex-wrap">
                        {suggestion.theme_colors && suggestion.theme_colors.length > 0 && (
                          <div
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-white/5 border border-white/10"
                            title={`Adapted to site theme: ${suggestion.theme_colors.join(', ')}`}
                          >
                            <span className="text-[10px] text-white/50 font-medium">Theme-Matched</span>
                            <div className="flex items-center -space-x-1">
                              {suggestion.theme_colors.slice(0, 3).map((hex, i) => (
                                <span
                                  key={`${hex}-${i}`}
                                  className="w-2.5 h-2.5 rounded-full border border-white/30"
                                  style={{ backgroundColor: hex }}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                        <span className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">
                          {suggestion.source_platform ? `${suggestion.source_platform} Ref:` : 'Reference:'}
                        </span>
                        {suggestion.benchmark_url ? (
                          <a
                            href={suggestion.benchmark_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[11px] font-medium transition-colors"
                          >
                            <span>{suggestion.benchmark_name}</span>
                            <ExternalLink className="w-3 h-3 text-cyan-400" />
                          </a>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 text-[11px]">
                            {suggestion.benchmark_name}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Action Buttons Row */}
                  <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-white/5">
                    {/* Live Preview Button */}
                    <button
                      type="button"
                      onClick={() => handleTogglePreview(suggestion)}
                      disabled={isConfirming || isThisConfirming}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer border active:scale-95 disabled:opacity-50",
                        isThisPreviewed
                          ? "bg-violet-900/40 border-violet-400/50 text-violet-200 shadow-sm"
                          : "bg-white/5 hover:bg-white/10 border-white/10 text-white/80"
                      )}
                      title={isThisPreviewed ? "Revert preview on canvas" : "Preview changes on canvas"}
                    >
                      {isThisPreviewed ? (
                        <>
                          <EyeOff className="w-3.5 h-3.5 text-violet-300" />
                          <span>Revert Preview</span>
                        </>
                      ) : (
                        <>
                          <Eye className="w-3.5 h-3.5 text-white/60" />
                          <span>Preview</span>
                        </>
                      )}
                    </button>

                    {/* Pin for Developer Button */}
                    <button
                      type="button"
                      onClick={() => handleApply(suggestion)}
                      disabled={isConfirming || isThisConfirming}
                      className={cn(
                        "px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-lg active:scale-95 disabled:opacity-50",
                        "bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white shadow-violet-900/40 border border-violet-400/40"
                      )}
                      title="Apply live mutation and save permanent marker for developer handoff"
                    >
                      {isThisConfirming ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Pinning...</span>
                        </>
                      ) : (
                        <>
                          <Pin className="w-3.5 h-3.5 text-fuchsia-200" />
                          <span>Pin for Developer</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-white/10 bg-white/[0.02] text-xs text-white/40">
          <span className="text-[11px]">
            Previewing updates the live canvas. Apply & Pin saves a marker for developer handoff.
          </span>
          <button
            type="button"
            onClick={handleClose}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-white/70 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
