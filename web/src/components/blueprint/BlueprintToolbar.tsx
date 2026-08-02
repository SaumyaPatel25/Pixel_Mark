'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useUIStore } from '@/store/uiStore'
import {
  ArrowLeft,
  MousePointer,
  Hand,
  MousePointerClick,
  MessageSquare,
  Eye,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Undo2,
  Redo2,
  Share2,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  Sliders,
  Save,
  Download,
  RefreshCw,
  Send,
  Layers,
  FileText,
  Activity,
  Sparkles,
  Lock,
  Monitor,
  Tablet,
  Smartphone
} from 'lucide-react'
import { api } from '@/lib/api'
import { useBlueprintStore, BlueprintTool } from '@/store/blueprintStore'
import { useBlueprintCollaborationStore } from '@/store/blueprintCollaborationStore'
import { useBlueprintActivityStore } from '@/store/blueprintActivityStore'
import { useBlueprintSummaryStore } from '@/store/blueprintSummaryStore'
import { BlueprintChangesetModal } from './BlueprintChangesetModal'
import { BlueprintPresenceStack } from './BlueprintPresenceStack'
import { NotificationBell } from '../notifications/NotificationBell'
import { usePlan } from '@/hooks/usePlan'
import { PlanBadge } from '../billing/PlanBadge'

interface BlueprintToolbarProps {
  projectId: string
}

export function BlueprintToolbar({ projectId }: BlueprintToolbarProps) {
  const { canUseBlueprintDomEdit } = usePlan()
  const {
    activeTool,
    setActiveTool,
    zoom,
    setZoom,
    resetViewport,
    previewMode,
    setPreviewMode,
    isDirty,
    frames,
    selectedFrameId,
    setSelectedFrameId,
    isInspectorOpen,
    toggleInspector,
    past,
    future,
    pendingMutations,
    undo,
    redo,
    resetToBase,
    saveStatus,
    saveBlueprintEdits,
    viewportMode,
    setViewportMode
  } = useBlueprintStore()

  const [isChangesetOpen, setIsChangesetOpen] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [publishName, setPublishName] = useState('')
  const [showPublishModal, setShowPublishModal] = useState(false)
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null)
  const [isFrameDropdownOpen, setIsFrameDropdownOpen] = useState(false)
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false)

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('.frame-dropdown-container')) {
        setIsFrameDropdownOpen(false)
      }
      if (!target.closest('.export-dropdown-container')) {
        setIsExportDropdownOpen(false)
      }
    }
    document.addEventListener('click', handleOutsideClick)
    return () => document.removeEventListener('click', handleOutsideClick)
  }, [])

  const canUndo = past.length > 0
  const canRedo = future.length > 0
  const canReset = canUndo || pendingMutations.length > 0

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset all local Blueprint edits to baseline?')) {
      resetToBase()
    }
  }

  const handleExportJson = async () => {
    try {
      const data = await api.blueprint.exportJson(projectId)
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `blueprint-edits-${projectId}.json`
      a.click()
    } catch (err) {
      console.error('Export JSON error:', err)
    }
  }

  const handleExportCss = async () => {
    try {
      const cssText = await api.blueprint.exportCss(projectId)
      const blob = new Blob([typeof cssText === 'string' ? cssText : JSON.stringify(cssText)], { type: 'text/css' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `blueprint-edits-${projectId}.css`
      a.click()
    } catch (err) {
      console.error('Export CSS error:', err)
    }
  }

  const handleExportMarkdown = async () => {
    try {
      const mdText = await api.blueprint.exportMarkdown(projectId)
      const blob = new Blob([typeof mdText === 'string' ? mdText : JSON.stringify(mdText)], { type: 'text/markdown' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `blueprint-handoff-${projectId}.md`
      a.click()
    } catch (err) {
      console.error('Export Markdown error:', err)
    }
  }

  const handlePublishSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsPublishing(true)
    try {
      // Auto-save first if unsaved edits exist
      if (isDirty) {
        await saveBlueprintEdits(projectId)
      }

      const pubName = publishName.trim() || `Blueprint Release ${new Date().toLocaleDateString()}`
      const pub = await api.blueprint.createPublication(projectId, pubName)

      if (pub?.id) {
        const url = `${window.location.origin}/blueprint/published/${pub.id}`
        setPublishedUrl(url)
      }
    } catch (err) {
      console.error('Publish error:', err)
    } finally {
      setIsPublishing(false)
    }
  }

  const currentFrame = frames.find((f) => f.id === selectedFrameId)

  return (
    <header className="h-14 bg-[#0d1322] border-b border-cyan-950/60 px-4 flex items-center justify-between text-slate-200 select-none z-20 shrink-0">
      {/* Left section: Navigation & Frame switcher */}
      <div className="flex items-center gap-3">
        <Link
          href={`/project/${projectId}`}
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors focus:ring-2 focus:ring-cyan-500 focus:outline-none focus:ring-offset-2 focus:ring-offset-slate-950"
          title="Back to Project"
          aria-label="Go back to project dashboard"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Project</span>
        </Link>

        <div className="h-4 w-px bg-slate-800" />

        {/* Frame switcher dropdown */}
        <div className="relative frame-dropdown-container">
          <button
            onClick={() => setIsFrameDropdownOpen(!isFrameDropdownOpen)}
            aria-haspopup="listbox"
            aria-expanded={isFrameDropdownOpen}
            aria-label="Switch active artboard frame"
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-medium text-slate-200 hover:border-slate-700 transition-colors focus:ring-2 focus:ring-cyan-500 focus:outline-none focus:ring-offset-2 focus:ring-offset-slate-950"
          >
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <span className="max-w-[140px] truncate">
              {currentFrame ? currentFrame.title : 'Select Frame'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>
          
          {/* Dropdown list */}
          {isFrameDropdownOpen && (
            <div className="absolute left-0 top-full mt-1 w-48 bg-[#0f172a] border border-slate-800 rounded-xl shadow-xl py-1 z-50">
              {frames.map((frame) => (
                <button
                  key={frame.id}
                  onClick={() => {
                    setSelectedFrameId(frame.id)
                    setIsFrameDropdownOpen(false)
                  }}
                  className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-800/70 transition-colors focus:ring-2 focus:ring-cyan-500 focus:outline-none ${
                    frame.id === selectedFrameId ? 'text-cyan-400 font-semibold bg-cyan-500/10' : 'text-slate-300'
                  }`}
                >
                  <span className="truncate">{frame.title}</span>
                  {frame.id === selectedFrameId && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Center section: Blueprint Tool selection */}
      <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
        <ToolButton
          tool="select"
          activeTool={activeTool}
          onClick={() => setActiveTool('select')}
          icon={<MousePointer className="w-4 h-4" />}
          label="Select (V)"
        />
        <ToolButton
          tool="move"
          activeTool={activeTool}
          onClick={() => setActiveTool('move')}
          icon={<Hand className="w-4 h-4" />}
          label="Pan / Move (H)"
        />
        <ToolButton
          tool="dom-edit"
          activeTool={activeTool}
          onClick={() => {
            if (!canUseBlueprintDomEdit) {
              window.location.href = '/pricing'
            } else {
              setActiveTool('dom-edit')
            }
          }}
          icon={!canUseBlueprintDomEdit ? <Lock className="w-4 h-4 text-amber-400" /> : <MousePointerClick className="w-4 h-4" />}
          label={!canUseBlueprintDomEdit ? "Upgrade to Dev Team to unlock Blueprint DOM Edit mode" : "DOM Edit Tool"}
          badge={!canUseBlueprintDomEdit ? "LOCK" : "DOM"}
        />
        <ToolButton
          tool="comment"
          activeTool={activeTool}
          onClick={() => {
            setActiveTool('comment')
            useBlueprintCollaborationStore.getState().toggleThreadPanel(true)
          }}
          icon={<MessageSquare className="w-4 h-4" />}
          label="Comment (C)"
          badge={useBlueprintCollaborationStore.getState().unresolvedCommentCount > 0 ? String(useBlueprintCollaborationStore.getState().unresolvedCommentCount) : undefined}
        />
        <button
          id="activity-toggle-btn"
          onClick={() => useBlueprintActivityStore.getState().toggleActivityPanel()}
          className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-all flex items-center gap-1.5 text-xs font-bold shadow-sm cursor-pointer focus:ring-2 focus:ring-cyan-500 focus:outline-none focus:ring-offset-2 focus:ring-offset-slate-950"
          title="Open STAGE Activity Feed"
          aria-label="Open STAGE Activity Feed"
        >
          <Activity className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden sm:inline">Activity</span>
        </button>
        <button
          id="ai-summary-btn"
          onClick={() => {
            const summaryStore = useBlueprintSummaryStore.getState()
            if (!summaryStore.activeSummary) {
              summaryStore.generateSummary(projectId)
            } else {
              summaryStore.toggleSummaryModal(true)
            }
          }}
          className="px-2.5 py-1.5 rounded-lg bg-purple-950/40 border border-purple-500/30 hover:bg-purple-900/40 text-purple-300 hover:text-white transition-all flex items-center gap-1.5 text-xs font-bold shadow-sm cursor-pointer focus:ring-2 focus:ring-purple-500 focus:outline-none focus:ring-offset-2 focus:ring-offset-slate-950"
          title="Generate STAGE AI Change Summary"
          aria-label="Generate STAGE AI Change Summary"
        >
          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          <span className="hidden sm:inline">AI Summary</span>
        </button>
      </div>

      {/* Right section: Presence, Viewport controls, Preview, Save status, Share */}
      <div className="flex items-center gap-3">
        {/* STAGE Multi-User Presence Stack */}
        <BlueprintPresenceStack />

        {/* STAGE Unified Notifications Bell */}
        <PlanBadge />
        <NotificationBell projectId={projectId} />

        <div className="h-4 w-px bg-slate-800" />

        {/* Save Status Indicator & Save Action */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => saveBlueprintEdits(projectId)}
            disabled={saveStatus === 'saving' || (!isDirty && saveStatus === 'saved')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition-all shadow-md focus:ring-2 focus:ring-cyan-500 focus:outline-none focus:ring-offset-2 focus:ring-offset-slate-950 ${
              isDirty
                ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
                : 'bg-slate-900 text-slate-400 border border-slate-800 disabled:opacity-60'
            }`}
            title="Save Blueprint Edits to Project"
            aria-label={isDirty ? "Save active blueprint changes" : "Blueprint edits saved"}
            aria-live="polite"
          >
            {saveStatus === 'saving' ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                <span>Saving...</span>
              </>
            ) : isDirty ? (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Save Edits</span>
              </>
            ) : saveStatus === 'error' ? (
              <>
                <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                <span className="text-rose-400">Save Error</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-slate-300">Saved</span>
              </>
            )}
          </button>

          {/* Export JSON / CSS / Markdown Dropdown */}
          <div className="relative export-dropdown-container">
            <button
              onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
              aria-haspopup="menu"
              aria-expanded={isExportDropdownOpen}
              aria-label="Export options"
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors focus:ring-2 focus:ring-cyan-500 focus:outline-none focus:ring-offset-2 focus:ring-offset-slate-950"
              title="Export Blueprint (JSON / CSS / Markdown)"
            >
              <Download className="w-3.5 h-3.5" />
            </button>

            {isExportDropdownOpen && (
              <div className="absolute right-0 top-full mt-1 w-52 bg-[#0f172a] border border-slate-800 rounded-xl shadow-xl py-1 z-50">
                <button
                  onClick={() => {
                    handleExportJson()
                    setIsExportDropdownOpen(false)
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800 transition-colors flex items-center justify-between focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                >
                  <span>Export JSON</span>
                  <span className="text-[10px] font-mono text-cyan-400">.json</span>
                </button>
                <button
                  onClick={() => {
                    handleExportCss()
                    setIsExportDropdownOpen(false)
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800 transition-colors flex items-center justify-between focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                >
                  <span>Export CSS</span>
                  <span className="text-[10px] font-mono text-emerald-400">.css</span>
                </button>
                <button
                  onClick={() => {
                    handleExportMarkdown()
                    setIsExportDropdownOpen(false)
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800 transition-colors flex items-center justify-between border-t border-slate-800 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                >
                  <span>Markdown Summary</span>
                  <span className="text-[10px] font-mono text-purple-400">.md</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Changeset Summary Button */}
        <button
          id="changeset-summary-btn"
          onClick={() => setIsChangesetOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold transition-colors focus:ring-2 focus:ring-cyan-500 focus:outline-none focus:ring-offset-2 focus:ring-offset-slate-950"
          title="View Changeset Summary"
          aria-label={`View changeset summary with ${pendingMutations.length} mutations`}
        >
          <Layers className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden md:inline">Summary</span>
          <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300">
            {pendingMutations.length}
          </span>
        </button>

        {/* Undo / Redo / Reset History Controls */}
        <div className="flex items-center gap-0.5 bg-slate-900 px-1 py-1 rounded-lg border border-slate-800 text-xs text-slate-300">
          <button
            onClick={undo}
            disabled={!canUndo}
            className="p-1 text-slate-300 hover:text-white disabled:opacity-30 disabled:hover:text-slate-300 rounded hover:bg-slate-800 transition-colors focus:ring-2 focus:ring-cyan-500 focus:outline-none"
            title="Undo Edit (Ctrl+Z)"
            aria-label="Undo last edit"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={redo}
            disabled={!canRedo}
            className="p-1 text-slate-300 hover:text-white disabled:opacity-30 disabled:hover:text-slate-300 rounded hover:bg-slate-800 transition-colors focus:ring-2 focus:ring-cyan-500 focus:outline-none"
            title="Redo Edit (Ctrl+Shift+Z)"
            aria-label="Redo last edit"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>

          <div className="h-3 w-px bg-slate-800 mx-0.5" />

          <button
            onClick={handleReset}
            disabled={!canReset}
            className="p-1 text-rose-400 hover:text-rose-300 disabled:opacity-30 disabled:hover:text-rose-400 rounded hover:bg-rose-500/10 transition-colors focus:ring-2 focus:ring-rose-500 focus:outline-none"
            title="Reset All Edits to Baseline"
            aria-label="Reset all local blueprint edits to baseline"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="h-4 w-px bg-slate-800" />

        {/* Elementor-Style Responsive Viewport Switcher */}
        <div className="flex items-center gap-0.5 bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs">
          <button
            onClick={() => setViewportMode('desktop')}
            className={`p-1 rounded transition-all focus:ring-2 focus:ring-cyan-500 focus:outline-none ${
              viewportMode === 'desktop' ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
            title="Desktop Viewport (1280px)"
            aria-label="Switch to desktop viewport width"
          >
            <Monitor className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setViewportMode('tablet')}
            className={`p-1 rounded transition-all focus:ring-2 focus:ring-cyan-500 focus:outline-none ${
              viewportMode === 'tablet' ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
            title="Tablet Viewport (768px)"
            aria-label="Switch to tablet viewport width"
          >
            <Tablet className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setViewportMode('mobile')}
            className={`p-1 rounded transition-all focus:ring-2 focus:ring-cyan-500 focus:outline-none ${
              viewportMode === 'mobile' ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
            title="Mobile Viewport (375px)"
            aria-label="Switch to mobile viewport width"
          >
            <Smartphone className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Zoom controls */}
        <div className="flex items-center gap-1 bg-slate-900 px-2 py-1 rounded-lg border border-slate-800 text-xs text-slate-300 font-sans">
          <button
            onClick={() => setZoom((z) => z - 0.1)}
            className="p-1 hover:text-white rounded hover:bg-slate-800 transition-colors focus:ring-2 focus:ring-cyan-500 focus:outline-none"
            title="Zoom Out"
            aria-label="Zoom out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="w-12 text-center font-mono font-semibold text-cyan-400" aria-live="polite">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom((z) => z + 0.1)}
            className="p-1 hover:text-white rounded hover:bg-slate-800 transition-colors focus:ring-2 focus:ring-cyan-500 focus:outline-none"
            title="Zoom In"
            aria-label="Zoom in"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={resetViewport}
            className="p-1 text-slate-500 hover:text-slate-300 rounded hover:bg-slate-800 transition-colors ml-0.5 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
            title="Reset Zoom & Pan"
            aria-label="Reset zoom and viewport alignment"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>

        {/* Preview mode toggle */}
        <button
          onClick={() => setPreviewMode(!previewMode)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all focus:ring-2 focus:ring-purple-500 focus:outline-none ${
            previewMode
              ? 'bg-purple-600/20 border-purple-500/50 text-purple-300'
              : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
          }`}
          aria-label={previewMode ? "Exit live preview mode" : "Enter live preview mode"}
        >
          <Eye className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{previewMode ? 'Exit Preview' : 'Preview'}</span>
        </button>

        {/* Inspector Panel Toggle Button */}
        <button
          id="inspector-toggle-btn"
          onClick={toggleInspector}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all focus:ring-2 focus:ring-cyan-500 focus:outline-none ${
            isInspectorOpen
              ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300 shadow-sm'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
          }`}
          title={isInspectorOpen ? 'Close Inspector Panel' : 'Open Inspector Panel'}
          aria-label={isInspectorOpen ? "Close style property inspector" : "Open style property inspector"}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Inspector</span>
        </button>

        {/* Publish Handoff Button */}
        <button
          id="publish-btn"
          onClick={() => setShowPublishModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition-colors shadow-lg shadow-cyan-950/40 focus:ring-2 focus:ring-cyan-500 focus:outline-none focus:ring-offset-2 focus:ring-offset-slate-950"
          title="Publish Read-Only Blueprint Handoff"
          aria-label="Publish read-only blueprint handoff"
        >
          <Send className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Publish</span>
        </button>
      </div>

      {/* Changeset Summary Modal */}
      <BlueprintChangesetModal
        projectId={projectId}
        isOpen={isChangesetOpen}
        onClose={() => setIsChangesetOpen(false)}
      />

      {/* Publish Handoff Modal */}
      {showPublishModal && (
        <PublishModal
          projectId={projectId}
          isDirty={isDirty}
          saveBlueprintEdits={saveBlueprintEdits}
          handlePublishSubmit={handlePublishSubmit}
          isPublishing={isPublishing}
          publishName={publishName}
          setPublishName={setPublishName}
          publishedUrl={publishedUrl}
          setPublishedUrl={setPublishedUrl}
          onClose={() => {
            setShowPublishModal(false)
            setPublishedUrl(null)
          }}
        />
      )}
    </header>
  )
}

interface PublishModalProps {
  projectId: string
  isDirty: boolean
  saveBlueprintEdits: (projectId: string) => Promise<void>
  handlePublishSubmit: (e: React.FormEvent) => Promise<void>
  isPublishing: boolean
  publishName: string
  setPublishName: (val: string) => void
  publishedUrl: string | null
  setPublishedUrl: (val: string | null) => void
  onClose: () => void
}

function PublishModal({
  projectId,
  isDirty,
  saveBlueprintEdits,
  handlePublishSubmit,
  isPublishing,
  publishName,
  setPublishName,
  publishedUrl,
  setPublishedUrl,
  onClose
}: PublishModalProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
      
      if (e.key === 'Tab' && containerRef.current) {
        const focusableElements = containerRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex="0"], a'
        )
        if (focusableElements.length === 0) return
        const firstElement = focusableElements[0] as HTMLElement
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus()
            e.preventDefault()
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus()
            e.preventDefault()
          }
        }
      }
    }

    window.addEventListener('keydown', handleGlobalKeyDown)
    
    // Focus first focusable element
    setTimeout(() => {
      if (containerRef.current) {
        const focusable = containerRef.current.querySelector(
          'button, [href], input, select, textarea, [tabindex="0"], a'
        ) as HTMLElement
        if (focusable) focusable.focus()
      }
    }, 50)

    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown)
      const trigger = document.getElementById('publish-btn')
      if (trigger) {
        trigger.focus()
      }
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-55 bg-[#070a12]/80 backdrop-blur-md flex items-center justify-center p-4">
      <div
        ref={containerRef}
        className="w-full max-w-md bg-[#0d1322] border border-cyan-500/30 rounded-2xl shadow-2xl p-6 text-slate-200 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Send className="w-4 h-4 text-cyan-400" />
            <span>Publish Blueprint Handoff</span>
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none"
            aria-label="Close publish modal"
          >
            ✕
          </button>
        </div>

        {publishedUrl ? (
          <div className="space-y-4">
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs space-y-1">
              <span className="font-bold block">✓ Publication Published Successfully!</span>
              <p className="text-slate-400">Share this read-only handoff link with clients or developers.</p>
            </div>

            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 font-mono text-xs truncate text-cyan-300 select-all">
              {publishedUrl}
            </div>

            <div className="flex items-center gap-2">
              <a
                href={publishedUrl}
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-2 text-center rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none"
              >
                Open Handoff Page
              </a>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(publishedUrl)
                  useUIStore.getState().addToast('Copied handoff link!', 'success')
                }}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none"
              >
                Copy Link
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handlePublishSubmit} className="space-y-4">
            <p className="text-xs text-slate-400">
              Publishing creates a stable, read-only handoff snapshot of your active mutations for developers and clients.
            </p>

            <div>
              <label className="text-[11px] font-mono text-slate-300 block mb-1">
                Publication Title
              </label>
              <input
                type="text"
                value={publishName}
                onChange={(e) => setPublishName(e.target.value)}
                placeholder={`e.g. Hero Section V1 Handoff (${new Date().toLocaleDateString()})`}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-cyan-500 font-sans"
              />
            </div>

            {isDirty && (
              <p className="text-[11px] text-amber-400 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                ⚠ Unsaved edits will be automatically saved before publishing.
              </p>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPublishing}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-all shadow-md disabled:opacity-50 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
              >
                {isPublishing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Publishing...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Create Release</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

function ToolButton({
  tool,
  activeTool,
  onClick,
  icon,
  label,
  badge
}: {
  tool: BlueprintTool
  activeTool: BlueprintTool
  onClick: () => void
  icon: React.ReactNode
  label: string
  badge?: string
}) {
  const isActive = activeTool === tool
  return (
    <button
      id={`${tool}-tool-btn`}
      onClick={onClick}
      className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all focus:ring-2 focus:ring-cyan-500 focus:outline-none focus:ring-offset-2 focus:ring-offset-slate-950 ${
        isActive
          ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
          : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
      }`}
      title={label}
      aria-label={label}
    >
      {icon}
      {badge && (
        <span
          className={`text-[9px] px-1 py-0.2 rounded font-extrabold tracking-tight ${
            isActive ? 'bg-slate-950 text-cyan-400' : 'bg-cyan-500/20 text-cyan-400'
          }`}
        >
          {badge}
        </span>
      )}
    </button>
  )
}
