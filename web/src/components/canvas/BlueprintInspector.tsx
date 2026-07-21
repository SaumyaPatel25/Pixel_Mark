'use client'

import React, { useState } from 'react'
import { useBlueprintStore } from '@/store/blueprintStore'
import { useDOMEditStore } from '@/store/domEditStore'
import {
  X,
  Save,
  RotateCcw,
  Eye,
  Download,
  ExternalLink,
  Layers,
  Sparkles,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'

export function BlueprintInspector() {
  const {
    selectedFrame,
    inspectorOpen,
    targetSelector,
    draftStyles,
    hasUnsavedChanges,
    linkedSessionStatus,
    setTargetSelector,
    updateDraftStyle,
    saveEdits,
    resetDraft,
    setInspectorOpen
  } = useBlueprintStore()

  const { savedStyles } = useBlueprintStore()
  const exportCSS = useDOMEditStore(s => s.exportCSS)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  if (!inspectorOpen) return null

  if (!selectedFrame) {
    return (
      <div className="fixed top-16 right-0 bottom-0 w-96 bg-[#18181b] border-l border-white/10 text-white flex flex-col justify-center items-center p-8 text-center z-40 shadow-2xl backdrop-blur-md">
        <Layers className="w-12 h-12 text-white/20 mb-4" />
        <h3 className="text-sm font-bold text-white mb-2">No Frame Selected</h3>
        <p className="text-xs text-white/50 leading-relaxed max-w-xs">
          Select a frame node on the Blueprint Canvas board to inspect its context, draft style tweaks, and persist design edits.
        </p>
        <button
          onClick={() => setInspectorOpen(false)}
          className="mt-6 px-4 py-2 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded-lg text-xs font-semibold transition-colors"
        >
          Close Inspector
        </button>
      </div>
    )
  }

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3000)
  }

  const handleSave = async () => {
    await saveEdits()
    showToast('Edits saved successfully!')
  }

  const handlePreviewOnSession = () => {
    if (!selectedFrame.session_id) {
      showToast('No active session linked to this frame')
      return
    }

    // Broadcast preview mutation to any active session tabs or iframe windows
    try {
      const channel = new BroadcastChannel(`pixelmark_session_${selectedFrame.session_id}`)
      channel.postMessage({
        type: 'PIXELMARK_PREVIEW_STYLE_MUTATION',
        selector: targetSelector || 'body',
        mutations: draftStyles
      })
      channel.close()
      showToast('Preview sent to linked session!')
    } catch {
      showToast('Live session preview broadcast attempted')
    }
  }

  const handleExportCSS = () => {
    if (selectedFrame.session_id) {
      exportCSS(selectedFrame.session_id)
      showToast('CSS Export initiated!')
    } else {
      showToast('No session linked for CSS export')
    }
  }

  return (
    <div className="fixed top-16 right-0 bottom-0 w-96 bg-[#18181b] border-l border-white/10 text-white flex flex-col z-40 shadow-2xl backdrop-blur-md">
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-[#0f0f11]">
        <div className="flex items-center gap-2 overflow-hidden">
          <Layers className="w-4 h-4 text-teal-400 shrink-0" />
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-white truncate">
              {selectedFrame.title || 'Untitled Frame'}
            </h3>
            <p className="text-[10px] text-white/50 font-mono truncate">
              {selectedFrame.session_id ? `Session: ${selectedFrame.session_id.slice(0, 8)}...` : 'Blueprint-only draft'}
            </p>
          </div>
        </div>
        <button
          onClick={() => setInspectorOpen(false)}
          className="p-1 hover:bg-white/10 rounded-lg transition-colors text-white/60 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="mx-4 mt-3 px-3 py-2 bg-teal-500/20 border border-teal-500/40 text-teal-300 text-xs rounded-lg flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Scrollable Inspector Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {/* Overview & Status */}
        <div className="p-3.5 bg-white/5 rounded-xl border border-white/5 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-white/50 font-medium">Status</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              selectedFrame.session_id ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
            }`}>
              {selectedFrame.session_id ? 'Design edits' : 'Blueprint-only draft'}
            </span>
          </div>

          {selectedFrame.marker_count !== undefined && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/50 font-medium">Indicators / Pins</span>
              <span className="font-mono text-white/80">{selectedFrame.marker_count}</span>
            </div>
          )}

          {selectedFrame.session_id && (
            <a
              href={`/sessions/${selectedFrame.session_id}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-teal-400 hover:text-teal-300 transition-colors pt-1"
            >
              <span>Open live session</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>

        {/* CSS Selector Input Target */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-white/70 uppercase tracking-wider">
            Target Element Selector
          </label>
          <input
            type="text"
            value={targetSelector}
            onChange={(e) => setTargetSelector(e.target.value)}
            placeholder="e.g. body, .hero-button, #header"
            className="w-full bg-[#09090b] border border-white/10 rounded-lg px-3 py-2 text-xs text-teal-300 font-mono focus:outline-none focus:border-teal-500"
          />
        </div>

        {/* Section 1: Layout */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-white/40 uppercase tracking-wider">Layout</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-white/50 block mb-1">Width</label>
              <input
                type="text"
                value={draftStyles['width'] || ''}
                onChange={(e) => updateDraftStyle('width', e.target.value)}
                placeholder="auto, 100%, 300px"
                className="w-full bg-[#09090b] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-teal-500 font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] text-white/50 block mb-1">Height</label>
              <input
                type="text"
                value={draftStyles['height'] || ''}
                onChange={(e) => updateDraftStyle('height', e.target.value)}
                placeholder="auto, 200px"
                className="w-full bg-[#09090b] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-teal-500 font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] text-white/50 block mb-1">Display</label>
              <select
                value={draftStyles['display'] || ''}
                onChange={(e) => updateDraftStyle('display', e.target.value)}
                className="w-full bg-[#09090b] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-teal-500 font-mono"
              >
                <option value="">(Default)</option>
                <option value="block">block</option>
                <option value="flex">flex</option>
                <option value="grid">grid</option>
                <option value="inline-block">inline-block</option>
                <option value="none">none</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-white/50 block mb-1">Position</label>
              <select
                value={draftStyles['position'] || ''}
                onChange={(e) => updateDraftStyle('position', e.target.value)}
                className="w-full bg-[#09090b] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-teal-500 font-mono"
              >
                <option value="">(Default)</option>
                <option value="static">static</option>
                <option value="relative">relative</option>
                <option value="absolute">absolute</option>
                <option value="fixed">fixed</option>
                <option value="sticky">sticky</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Typography */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-white/40 uppercase tracking-wider">Typography</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-[10px] text-white/50 block mb-1">Text Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={draftStyles['color'] || '#ffffff'}
                  onChange={(e) => updateDraftStyle('color', e.target.value)}
                  className="w-8 h-8 rounded border border-white/10 bg-transparent cursor-pointer p-0"
                />
                <input
                  type="text"
                  value={draftStyles['color'] || ''}
                  onChange={(e) => updateDraftStyle('color', e.target.value)}
                  placeholder="#ffffff"
                  className="flex-1 bg-[#09090b] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-teal-500 font-mono"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] text-white/50 block mb-1">Font Size</label>
              <input
                type="text"
                value={draftStyles['font-size'] || ''}
                onChange={(e) => updateDraftStyle('font-size', e.target.value)}
                placeholder="16px, 1.2rem"
                className="w-full bg-[#09090b] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-teal-500 font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] text-white/50 block mb-1">Font Weight</label>
              <select
                value={draftStyles['font-weight'] || ''}
                onChange={(e) => updateDraftStyle('font-weight', e.target.value)}
                className="w-full bg-[#09090b] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-teal-500 font-mono"
              >
                <option value="">(Default)</option>
                <option value="400">400 Normal</option>
                <option value="500">500 Medium</option>
                <option value="600">600 SemiBold</option>
                <option value="700">700 Bold</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-white/50 block mb-1">Line Height</label>
              <input
                type="text"
                value={draftStyles['line-height'] || ''}
                onChange={(e) => updateDraftStyle('line-height', e.target.value)}
                placeholder="1.5, 24px"
                className="w-full bg-[#09090b] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-teal-500 font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] text-white/50 block mb-1">Letter Spacing</label>
              <input
                type="text"
                value={draftStyles['letter-spacing'] || ''}
                onChange={(e) => updateDraftStyle('letter-spacing', e.target.value)}
                placeholder="0.05em, 1px"
                className="w-full bg-[#09090b] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-teal-500 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Spacing */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-white/40 uppercase tracking-wider">Spacing</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-white/50 block mb-1">Padding</label>
              <input
                type="text"
                value={draftStyles['padding'] || ''}
                onChange={(e) => updateDraftStyle('padding', e.target.value)}
                placeholder="16px, 12px 24px"
                className="w-full bg-[#09090b] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-teal-500 font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] text-white/50 block mb-1">Margin</label>
              <input
                type="text"
                value={draftStyles['margin'] || ''}
                onChange={(e) => updateDraftStyle('margin', e.target.value)}
                placeholder="0 auto, 10px"
                className="w-full bg-[#09090b] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-teal-500 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Background */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-white/40 uppercase tracking-wider">Background</h4>
          <div className="space-y-2">
            <label className="text-[10px] text-white/50 block mb-1">Background Color</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={draftStyles['background-color'] || '#000000'}
                onChange={(e) => updateDraftStyle('background-color', e.target.value)}
                className="w-8 h-8 rounded border border-white/10 bg-transparent cursor-pointer p-0"
              />
              <input
                type="text"
                value={draftStyles['background-color'] || ''}
                onChange={(e) => updateDraftStyle('background-color', e.target.value)}
                placeholder="transparent, #09090b"
                className="flex-1 bg-[#09090b] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-teal-500 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Section 5: Border */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-white/40 uppercase tracking-wider">Border</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-white/50 block mb-1">Border Radius</label>
              <input
                type="text"
                value={draftStyles['border-radius'] || ''}
                onChange={(e) => updateDraftStyle('border-radius', e.target.value)}
                placeholder="8px, 9999px"
                className="w-full bg-[#09090b] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-teal-500 font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] text-white/50 block mb-1">Border Width</label>
              <input
                type="text"
                value={draftStyles['border-width'] || ''}
                onChange={(e) => updateDraftStyle('border-width', e.target.value)}
                placeholder="1px, 2px"
                className="w-full bg-[#09090b] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-teal-500 font-mono"
              />
            </div>
            <div className="col-span-2">
              <label className="text-[10px] text-white/50 block mb-1">Border Color</label>
              <input
                type="text"
                value={draftStyles['border-color'] || ''}
                onChange={(e) => updateDraftStyle('border-color', e.target.value)}
                placeholder="#3f3f46, rgba(255,255,255,0.1)"
                className="w-full bg-[#09090b] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-teal-500 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Section 6: Effects */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-white/40 uppercase tracking-wider">Effects</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-white/50 block mb-1">Opacity</label>
              <input
                type="text"
                value={draftStyles['opacity'] || ''}
                onChange={(e) => updateDraftStyle('opacity', e.target.value)}
                placeholder="1, 0.8, 0.5"
                className="w-full bg-[#09090b] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-teal-500 font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] text-white/50 block mb-1">Box Shadow</label>
              <input
                type="text"
                value={draftStyles['box-shadow'] || ''}
                onChange={(e) => updateDraftStyle('box-shadow', e.target.value)}
                placeholder="0 4px 6px -1px rgba(0,0,0,0.1)"
                className="w-full bg-[#09090b] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-teal-500 font-mono"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Footer Action Buttons */}
      <div className="p-4 border-t border-white/10 bg-[#0f0f11] space-y-2">
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={!hasUnsavedChanges}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${
              hasUnsavedChanges
                ? 'bg-teal-500 text-black hover:bg-teal-400 shadow-lg shadow-teal-500/20'
                : 'bg-white/10 text-white/40 cursor-not-allowed'
            }`}
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save edits</span>
          </button>
          <button
            onClick={resetDraft}
            disabled={!hasUnsavedChanges}
            className="py-2 px-3 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handlePreviewOnSession}
            className="flex-1 py-2 px-3 bg-white/5 hover:bg-white/10 text-teal-300 border border-teal-500/30 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Preview on linked session</span>
          </button>

          {selectedFrame.session_id && (
            <button
              onClick={handleExportCSS}
              className="py-2 px-3 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
              title="Export CSS file"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSS</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
