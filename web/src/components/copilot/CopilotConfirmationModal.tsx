'use client'

import React, { useState, useEffect } from 'react'
import {
  Sparkles,
  Check,
  Undo2,
  X,
  ChevronDown,
  ChevronUp,
  Code2,
  Layers,
  Loader2,
  Tag,
  AlertCircle
} from 'lucide-react'
import { CopilotResolution, ElementCropResult } from './CopilotTypes'
import { cn } from '@/lib/utils'

interface CopilotConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  resolution: CopilotResolution | null
  cropResult: ElementCropResult | null
  sessionId: string
  reviewerId?: string | null
  onConfirm: () => Promise<void>
  onUndo: () => void
  isConfirming?: boolean
  error?: string | null
}

export function CopilotConfirmationModal({
  isOpen,
  onClose,
  resolution,
  cropResult,
  onConfirm,
  onUndo,
  isConfirming = false,
  error = null,
}: CopilotConfirmationModalProps) {
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false)

  // Escape key reverts and closes
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isConfirming) {
        e.preventDefault()
        onUndo()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isConfirming, onUndo])

  if (!isOpen || !resolution) {
    return null
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="copilot-modal-title"
    >
      <div className="relative w-full max-w-lg bg-[#0e0e17] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-white">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2
                id="copilot-modal-title"
                className="text-xs font-black uppercase tracking-wider text-white"
              >
                AI Visual Mutation Preview
              </h2>
              <span className="text-[10px] text-white/40 font-mono">
                STAGE Live Canvas Copilot
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onUndo}
            disabled={isConfirming}
            className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-50"
            title="Cancel & Undo (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Cropped Element Screenshot Preview */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-bold text-white/50 uppercase tracking-wider">
              <span>Target Element Preview</span>
              {resolution.selector && (
                <span className="flex items-center gap-1 font-mono text-[10px] text-purple-300 bg-purple-950/40 border border-purple-500/30 px-2 py-0.5 rounded-md max-w-[240px] truncate" title={resolution.selector}>
                  <Tag className="w-3 h-3 flex-shrink-0" />
                  {resolution.selector}
                </span>
              )}
            </div>

            <div className="relative rounded-xl border border-white/10 bg-black/60 p-2 flex items-center justify-center min-h-[120px] max-h-[220px] overflow-hidden group">
              {cropResult?.imageBase64 ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={cropResult.imageBase64}
                  alt={`Screenshot of ${resolution.selector}`}
                  className="max-h-[190px] w-auto max-w-full object-contain rounded-lg shadow-lg border border-white/5"
                />
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 py-6 text-white/40">
                  <Layers className="w-8 h-8 text-white/20 animate-pulse" />
                  <span className="text-xs font-mono">Live element mutated on canvas</span>
                </div>
              )}
            </div>
          </div>

          {/* Client Summary */}
          <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
              Summary of Change
            </span>
            <p className="text-sm font-medium text-white/90 leading-snug">
              {resolution.client_summary || 'Applied ephemeral DOM mutation.'}
            </p>
            {resolution.text_mutation && (
              <div className="mt-2 text-xs text-amber-300/90 font-mono flex items-start gap-1.5 bg-amber-950/20 p-2 rounded-lg border border-amber-500/20">
                <span className="font-bold text-amber-400 uppercase text-[9px] mt-0.5">Copy:</span>
                <span>&ldquo;{resolution.text_mutation}&rdquo;</span>
              </div>
            )}
          </div>

          {/* Technical Details Accordion */}
          <div className="border border-white/5 rounded-xl overflow-hidden bg-black/20">
            <button
              type="button"
              onClick={() => setShowTechnicalDetails(prev => !prev)}
              className="w-full flex items-center justify-between px-3.5 py-2.5 hover:bg-white/[0.03] text-[10px] font-extrabold uppercase tracking-wider text-white/60 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Code2 className="w-3.5 h-3.5 text-purple-400" />
                <span>Technical Details & Scoped CSS</span>
              </div>
              {showTechnicalDetails ? (
                <ChevronUp className="w-3.5 h-3.5 text-white/40" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-white/40" />
              )}
            </button>

            {showTechnicalDetails && (
              <div className="p-3.5 pt-1 space-y-3 border-t border-white/5 bg-black/40">
                {resolution.developer_explanation && (
                  <div>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-white/40 block mb-1">
                      Developer Explanation
                    </span>
                    <p className="text-xs text-white/70 leading-relaxed font-sans">
                      {resolution.developer_explanation}
                    </p>
                  </div>
                )}

                {resolution.css_rules && (
                  <div>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-white/40 block mb-1">
                      Applied CSS Rules
                    </span>
                    <pre className="bg-black/80 p-2.5 rounded-lg border border-white/10 font-mono text-[11px] text-emerald-400 overflow-x-auto whitespace-pre-wrap leading-tight">
                      {resolution.css_rules}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Error display if confirm fails */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-white/10 bg-white/[0.02]">
          <button
            type="button"
            onClick={onUndo}
            disabled={isConfirming}
            className="h-10 px-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 active:scale-95 text-white/70 hover:text-white font-extrabold text-[10px] uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span>Undo</span>
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isConfirming}
            className={cn(
              "h-10 px-5 rounded-xl font-extrabold text-[10px] uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-lg active:scale-95",
              isConfirming
                ? "bg-emerald-700 text-white/80 cursor-wait"
                : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/40 border border-emerald-400/40"
            )}
          >
            {isConfirming ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saving Pin...</span>
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Confirm & Pin</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
