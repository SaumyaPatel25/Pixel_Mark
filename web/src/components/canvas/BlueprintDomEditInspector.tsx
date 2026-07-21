'use client'

import React, { useState } from 'react'
import { CanvasFrame } from '@/store/canvasStore'
import {
  useBlueprintStore,
  BlueprintDomTarget,
  BlueprintDraftStyles,
  createEmptyDraftStyles
} from '@/store/blueprintStore'
import { useDOMEditStore } from '@/store/domEditStore'
import {
  X,
  Save,
  RotateCcw,
  Download,
  ExternalLink,
  CheckCircle2,
  Sliders,
  Type,
  Maximize2,
  Box,
  Palette,
  Target,
  Trash2,
  Sparkles,
  Loader2,
  Copy,
  Code2
} from 'lucide-react'

interface BlueprintDomEditInspectorProps {
  frame?: CanvasFrame | null
  isOpen?: boolean
  activeSection?: string
}

export function BlueprintDomEditInspector({
  frame,
  isOpen,
  activeSection: propActiveSection
}: BlueprintDomEditInspectorProps) {
  const {
    selectedFrame: storeFrame,
    domEditInspectorOpen,
    activeBlueprintTool,
    targetSelector,
    activeSection: storeSection,
    domTargetByFrameId,
    draftStylesByFrameId,
    frameEditStatusById,
    isDomEditLoading,
    isDomEditSaving,
    setTargetSelector,
    setInspectorOpen,
    setActiveSection,
    setSelectedDomTarget,
    updateDraftStyleSectionKey,
    clearDomTarget,
    saveDraftAsEditSet,
    hydrateDraftFromLatestSaved,
    exportBlueprintFrameCSS
  } = useBlueprintStore()

  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [exportedCss, setExportedCss] = useState<string | null>(null)
  const [isExportingCss, setIsExportingCss] = useState(false)
  const [cssModalOpen, setCssModalOpen] = useState(false)

  const effectiveFrame = frame !== undefined ? frame : storeFrame
  const effectiveIsOpen = isOpen !== undefined ? isOpen : domEditInspectorOpen
  const effectiveSection = propActiveSection || storeSection || 'overview'

  if (!effectiveIsOpen && activeBlueprintTool !== 'dom-edit') return null

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3000)
  }

  // ── EMPTY STATE: Tool active but no frame selected ─────────────────────────
  if (!effectiveFrame) {
    return (
      <div className="fixed top-16 right-0 bottom-0 w-96 bg-[#18181b] border-l border-white/10 text-white flex flex-col justify-center items-center p-8 text-center z-40 shadow-2xl backdrop-blur-md animate-in slide-in-from-right">
        <div className="w-14 h-14 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 mb-4 shadow-lg shadow-teal-500/5">
          <Sliders className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-white mb-2">Select a frame to start DOM editing</h3>
        <p className="text-xs text-white/50 leading-relaxed max-w-xs mb-6">
          DOM editing is a Blueprint-only tool and works on selected frames. Click any page frame node on the canvas to inspect and refine its layout and styles.
        </p>
        <div className="px-3.5 py-2.5 bg-white/5 rounded-xl border border-white/10 text-[11px] text-teal-300 font-medium">
          💡 Click any frame on the board
        </div>
      </div>
    )
  }

  const frameId = effectiveFrame.id
  const currentTarget: BlueprintDomTarget | undefined = domTargetByFrameId[frameId]
  const currentDraft: BlueprintDraftStyles = draftStylesByFrameId[frameId] ?? createEmptyDraftStyles()
  const frameStatus = frameEditStatusById[frameId] || (currentTarget ? 'none' : 'none')

  const handleCreateSampleTarget = () => {
    const sample: BlueprintDomTarget = {
      frameId,
      pageUrl: effectiveFrame.title ? `https://${effectiveFrame.title.toLowerCase().replace(/\s+/g, '')}.com` : '/page',
      selectorPrimary: targetSelector || '.main-cta-button',
      selectorFallback: 'button.primary-action',
      xpath: '/html/body/main/div/button[1]',
      elementTag: 'button',
      elementLabel: 'Primary Call to Action',
      textExcerpt: 'Get Started Now'
    }
    setSelectedDomTarget(frameId, sample)
    showToast('Sample DOM target assigned to frame')
  }

  const handleClearTarget = () => {
    clearDomTarget(frameId)
    showToast('Target cleared')
  }

  const handleSaveDraft = async () => {
    try {
      await saveDraftAsEditSet(effectiveFrame.project_id, frameId)
      showToast('Blueprint edit set saved to project database!')
    } catch (err) {
      showToast('Failed to save edit set')
    }
  }

  const handleResetDraft = () => {
    hydrateDraftFromLatestSaved(frameId)
    showToast('Reset to latest saved state')
  }

  const handleExportCSS = async () => {
    setIsExportingCss(true)
    try {
      const cssText = await exportBlueprintFrameCSS(effectiveFrame.project_id, frameId)
      setExportedCss(cssText)
      setCssModalOpen(true)
      showToast('Blueprint CSS compiled!')
    } catch (err) {
      showToast('Failed to export Blueprint CSS')
    } finally {
      setIsExportingCss(false)
    }
  }

  const handleDownloadCSSFile = () => {
    if (!exportedCss) return
    const blob = new Blob([exportedCss], { type: 'text/css;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `blueprint-frame-${frameId}.css`
    a.click()
    URL.revokeObjectURL(url)
    showToast('Downloaded blueprint-frame.css')
  }

  const handleCopyCSS = () => {
    if (!exportedCss) return
    navigator.clipboard.writeText(exportedCss)
    showToast('CSS copied to clipboard!')
  }

  const sections = [
    { id: 'overview', label: 'Overview' },
    { id: 'target', label: 'Target' },
    { id: 'layout', label: 'Layout' },
    { id: 'typography', label: 'Typography' },
    { id: 'spacing', label: 'Spacing' },
    { id: 'background', label: 'Background' },
    { id: 'border', label: 'Border' },
    { id: 'effects', label: 'Effects' },
    { id: 'actions', label: 'Actions' }
  ]

  return (
    <div className="fixed top-16 right-0 bottom-0 w-96 bg-[#18181b] border-l border-white/10 text-white flex flex-col z-40 shadow-2xl backdrop-blur-md">
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-[#0f0f11]">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <Sliders className="w-4 h-4 text-teal-400 shrink-0" />
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-white truncate">
              {effectiveFrame.title || 'Untitled Frame'}
            </h3>
            <p className="text-[10px] text-teal-400 font-mono truncate">
              Blueprint DOM Edit Tool (Project Scoped)
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

      {/* Section Navigation Tabs */}
      <div className="flex overflow-x-auto bg-[#121214] border-b border-white/5 scrollbar-none px-2 py-1.5 gap-1">
        {sections.map((sec) => (
          <button
            key={sec.id}
            onClick={() => setActiveSection(sec.id)}
            className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-colors ${
              effectiveSection === sec.id
                ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                : 'text-white/40 hover:text-white hover:bg-white/5'
            }`}
          >
            {sec.label}
          </button>
        ))}
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="mx-4 mt-3 px-3 py-2 bg-teal-500/20 border border-teal-500/40 text-teal-300 text-xs rounded-lg flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Loading Overlay */}
      {isDomEditLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3 text-white/60">
          <Loader2 className="w-6 h-6 animate-spin text-teal-400" />
          <p className="text-xs font-mono">Loading frame context...</p>
        </div>
      ) : (
        /* Scrollable Body */
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Section 1: Overview */}
          {(effectiveSection === 'overview' || effectiveSection === 'all') && (
            <div className="p-3.5 bg-white/5 rounded-xl border border-white/5 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/50 font-medium">Frame Title</span>
                <span className="font-semibold text-white truncate max-w-[180px]">
                  {effectiveFrame.title}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-white/50 font-medium">Frame ID</span>
                <span className="font-mono text-[10px] text-white/60 truncate max-w-[160px]">
                  {effectiveFrame.id}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-white/50 font-medium">Edit Status</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    !currentTarget
                      ? 'bg-slate-500/20 text-slate-300 border border-slate-500/30'
                      : frameStatus === 'draft'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                  }`}
                >
                  {!currentTarget ? 'No target' : frameStatus === 'draft' ? 'Draft edits' : 'Saved edits'}
                </span>
              </div>

              {effectiveFrame.session_id && (
                <a
                  href={`/sessions/${effectiveFrame.session_id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-teal-400 hover:text-teal-300 transition-colors pt-1"
                >
                  <span>Linked Session Context</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          )}

          {/* Section 2: Target */}
          {(effectiveSection === 'target' || effectiveSection === 'all' || effectiveSection === 'overview') && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-white/40 uppercase tracking-wider flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-teal-400" />
                  <span>DOM Target Model</span>
                </h4>
                {currentTarget && (
                  <button
                    onClick={handleClearTarget}
                    className="text-[10px] text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Clear</span>
                  </button>
                )}
              </div>

              {!effectiveFrame.session_id ? (
                <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-center space-y-2">
                  <span className="text-xs font-bold text-amber-300 block">Session Connection Required</span>
                  <p className="text-[11px] text-amber-200/70">Connect a session to this frame to select and inspect live DOM elements.</p>
                </div>
              ) : currentTarget ? (
                <div className="p-3 bg-[#09090b] border border-white/10 rounded-xl space-y-2 text-xs">
                  <div>
                    <span className="text-[10px] text-white/40 block">Primary Selector</span>
                    <span className="font-mono text-teal-300 text-xs">{currentTarget.selectorPrimary || 'None'}</span>
                  </div>
                  {currentTarget.xpath && (
                    <div>
                      <span className="text-[10px] text-white/40 block">XPath</span>
                      <span className="font-mono text-white/70 text-[11px] truncate block">{currentTarget.xpath}</span>
                    </div>
                  )}
                  {currentTarget.pageUrl && (
                    <div>
                      <span className="text-[10px] text-white/40 block">Page URL</span>
                      <span className="text-white/60 text-[11px] truncate block">{currentTarget.pageUrl}</span>
                    </div>
                  )}
                  {currentTarget.textExcerpt && (
                    <div>
                      <span className="text-[10px] text-white/40 block">Excerpt</span>
                      <span className="italic text-white/50 text-[11px]">"{currentTarget.textExcerpt}"</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 bg-white/5 border border-dashed border-white/10 rounded-xl text-center space-y-3">
                  <p className="text-xs text-white/50">No DOM target linked yet. Click an element inside the frame's live session to select a target.</p>
                  <button
                    onClick={handleCreateSampleTarget}
                    className="px-3 py-1.5 bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Assign Sample Target</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Section 3: Layout */}
          {(effectiveSection === 'layout' || effectiveSection === 'all' || effectiveSection === 'overview') && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-white/40 uppercase tracking-wider flex items-center gap-1.5">
                <Maximize2 className="w-3 h-3 text-teal-400" />
                <span>Layout</span>
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-white/50 block mb-1">Width</label>
                  <input
                    type="text"
                    value={currentDraft.layout?.width ?? ''}
                    onChange={(e) => updateDraftStyleSectionKey(frameId, 'layout', 'width', e.target.value)}
                    placeholder="auto, 100%, 300px"
                    className="w-full bg-[#09090b] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-teal-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-white/50 block mb-1">Height</label>
                  <input
                    type="text"
                    value={currentDraft.layout?.height ?? ''}
                    onChange={(e) => updateDraftStyleSectionKey(frameId, 'layout', 'height', e.target.value)}
                    placeholder="auto, 200px"
                    className="w-full bg-[#09090b] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-teal-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-white/50 block mb-1">Display</label>
                  <select
                    value={currentDraft.layout?.display ?? ''}
                    onChange={(e) => updateDraftStyleSectionKey(frameId, 'layout', 'display', e.target.value)}
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
                    value={currentDraft.layout?.position ?? ''}
                    onChange={(e) => updateDraftStyleSectionKey(frameId, 'layout', 'position', e.target.value)}
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
          )}

          {/* Section 4: Typography */}
          {(effectiveSection === 'typography' || effectiveSection === 'all') && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-white/40 uppercase tracking-wider flex items-center gap-1.5">
                <Type className="w-3 h-3 text-teal-400" />
                <span>Typography</span>
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-[10px] text-white/50 block mb-1">Text Color</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={String(currentDraft.typography?.color || '#ffffff')}
                      onChange={(e) => updateDraftStyleSectionKey(frameId, 'typography', 'color', e.target.value)}
                      className="w-8 h-8 rounded border border-white/10 bg-transparent cursor-pointer p-0"
                    />
                    <input
                      type="text"
                      value={currentDraft.typography?.color ?? ''}
                      onChange={(e) => updateDraftStyleSectionKey(frameId, 'typography', 'color', e.target.value)}
                      placeholder="#ffffff"
                      className="flex-1 bg-[#09090b] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-teal-500 font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-white/50 block mb-1">Font Size</label>
                  <input
                    type="text"
                    value={currentDraft.typography?.fontSize ?? ''}
                    onChange={(e) => updateDraftStyleSectionKey(frameId, 'typography', 'fontSize', e.target.value)}
                    placeholder="16px, 1.2rem"
                    className="w-full bg-[#09090b] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-teal-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-white/50 block mb-1">Font Weight</label>
                  <select
                    value={currentDraft.typography?.fontWeight ?? ''}
                    onChange={(e) => updateDraftStyleSectionKey(frameId, 'typography', 'fontWeight', e.target.value)}
                    className="w-full bg-[#09090b] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-teal-500 font-mono"
                  >
                    <option value="">(Default)</option>
                    <option value="400">400 Normal</option>
                    <option value="500">500 Medium</option>
                    <option value="600">600 SemiBold</option>
                    <option value="700">700 Bold</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Section 5: Spacing */}
          {(effectiveSection === 'spacing' || effectiveSection === 'all') && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-white/40 uppercase tracking-wider flex items-center gap-1.5">
                <Box className="w-3 h-3 text-teal-400" />
                <span>Spacing</span>
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-white/50 block mb-1">Margin Top</label>
                  <input
                    type="text"
                    value={currentDraft.spacing?.marginTop ?? ''}
                    onChange={(e) => updateDraftStyleSectionKey(frameId, 'spacing', 'marginTop', e.target.value)}
                    placeholder="10px"
                    className="w-full bg-[#09090b] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-teal-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-white/50 block mb-1">Padding Top</label>
                  <input
                    type="text"
                    value={currentDraft.spacing?.paddingTop ?? ''}
                    onChange={(e) => updateDraftStyleSectionKey(frameId, 'spacing', 'paddingTop', e.target.value)}
                    placeholder="16px"
                    className="w-full bg-[#09090b] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-teal-500 font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Section 6: Background */}
          {(effectiveSection === 'background' || effectiveSection === 'all') && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-white/40 uppercase tracking-wider flex items-center gap-1.5">
                <Palette className="w-3 h-3 text-teal-400" />
                <span>Background</span>
              </h4>
              <div className="space-y-2">
                <label className="text-[10px] text-white/50 block mb-1">Background Color</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={String(currentDraft.background?.backgroundColor || '#000000')}
                    onChange={(e) => updateDraftStyleSectionKey(frameId, 'background', 'backgroundColor', e.target.value)}
                    className="w-8 h-8 rounded border border-white/10 bg-transparent cursor-pointer p-0"
                  />
                  <input
                    type="text"
                    value={currentDraft.background?.backgroundColor ?? ''}
                    onChange={(e) => updateDraftStyleSectionKey(frameId, 'background', 'backgroundColor', e.target.value)}
                    placeholder="transparent, #09090b"
                    className="flex-1 bg-[#09090b] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-teal-500 font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Section 7: Border */}
          {(effectiveSection === 'border' || effectiveSection === 'all') && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-white/40 uppercase tracking-wider">Border</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-white/50 block mb-1">Border Radius</label>
                  <input
                    type="text"
                    value={currentDraft.border?.borderRadius ?? ''}
                    onChange={(e) => updateDraftStyleSectionKey(frameId, 'border', 'borderRadius', e.target.value)}
                    placeholder="8px, 9999px"
                    className="w-full bg-[#09090b] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-teal-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-white/50 block mb-1">Border Width</label>
                  <input
                    type="text"
                    value={currentDraft.border?.borderWidth ?? ''}
                    onChange={(e) => updateDraftStyleSectionKey(frameId, 'border', 'borderWidth', e.target.value)}
                    placeholder="1px, 2px"
                    className="w-full bg-[#09090b] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-teal-500 font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Section 8: Effects */}
          {(effectiveSection === 'effects' || effectiveSection === 'all') && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-white/40 uppercase tracking-wider">Effects</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-white/50 block mb-1">Opacity</label>
                  <input
                    type="text"
                    value={currentDraft.effects?.opacity ?? ''}
                    onChange={(e) => updateDraftStyleSectionKey(frameId, 'effects', 'opacity', e.target.value)}
                    placeholder="1, 0.8, 0.5"
                    className="w-full bg-[#09090b] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-teal-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-white/50 block mb-1">Box Shadow</label>
                  <input
                    type="text"
                    value={currentDraft.effects?.boxShadow ?? ''}
                    onChange={(e) => updateDraftStyleSectionKey(frameId, 'effects', 'boxShadow', e.target.value)}
                    placeholder="0 4px 6px -1px rgba(0,0,0,0.1)"
                    className="w-full bg-[#09090b] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-teal-500 font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Section 9: Actions */}
          {(effectiveSection === 'actions' || effectiveSection === 'all' || effectiveSection === 'overview') && (
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold text-white/40 uppercase tracking-wider">Actions</h4>
              <div className="space-y-2">
                <button
                  onClick={handleSaveDraft}
                  disabled={isDomEditSaving}
                  className="w-full py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all bg-teal-500 text-black hover:bg-teal-400 shadow-lg shadow-teal-500/20 disabled:opacity-50"
                >
                  {isDomEditSaving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving Edit Set...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Edit Set (Database)</span>
                    </>
                  )}
                </button>

                <div className="flex gap-2">
                  <button
                    onClick={handleResetDraft}
                    disabled={isDomEditSaving}
                    className="flex-1 py-2 px-3 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-30"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset to Saved</span>
                  </button>

                  <button
                    onClick={handleExportCSS}
                    disabled={isExportingCss}
                    className="py-2 px-3 bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-30"
                  >
                    {isExportingCss ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Code2 className="w-3.5 h-3.5" />
                    )}
                    <span>Export CSS</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Export CSS Modal */}
      {cssModalOpen && exportedCss !== null && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-[#121214] border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-[#18181b]">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-teal-400" />
                <h3 className="text-sm font-bold text-white">Blueprint Frame CSS Export</h3>
              </div>
              <button
                onClick={() => setCssModalOpen(false)}
                className="p-1 text-white/60 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto font-mono text-xs text-teal-300 bg-[#09090b] whitespace-pre border-y border-white/5">
              {exportedCss}
            </div>

            <div className="p-4 bg-[#18181b] flex items-center justify-between gap-3">
              <button
                onClick={handleCopyCSS}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white text-xs font-semibold rounded-lg flex items-center gap-2 transition-colors border border-white/10"
              >
                <Copy className="w-3.5 h-3.5 text-teal-400" />
                <span>Copy CSS</span>
              </button>

              <button
                onClick={handleDownloadCSSFile}
                className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-black text-xs font-bold rounded-lg flex items-center gap-2 transition-colors shadow-lg shadow-teal-500/20"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download .css File</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
export default BlueprintDomEditInspector
