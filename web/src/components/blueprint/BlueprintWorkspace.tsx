'use client'

import React, { useEffect } from 'react'
import dynamic from 'next/dynamic'
import { api } from '@/lib/api'
import { StageSpinner } from '@/components/ui/StageLoader'
import { useBlueprintStore } from '@/store/blueprintStore'
import { useBlueprintCollaborationStore } from '@/store/blueprintCollaborationStore'
import { useBlueprintActivityStore } from '@/store/blueprintActivityStore'
import { useBlueprintSummaryStore } from '@/store/blueprintSummaryStore'
import { BlueprintToolbar } from './BlueprintToolbar'
import { BlueprintToolRail } from './BlueprintToolRail'
import { BlueprintLayersPanel } from './BlueprintLayersPanel'
import { BlueprintStage } from './BlueprintStage'

const BlueprintInspector = dynamic(() => import('./BlueprintInspector').then((m) => m.BlueprintInspector), {
  loading: () => <div className="w-80 bg-[#0d1322] border-l border-slate-800 shrink-0 flex items-center justify-center"><StageSpinner size={18} variant="muted" /></div>
})
const BlueprintPresetLibraryPanel = dynamic(() => import('./BlueprintPresetLibraryPanel').then((m) => m.BlueprintPresetLibraryPanel))
const BlueprintCommentThread = dynamic(() => import('./BlueprintCommentThread').then((m) => m.BlueprintCommentThread))
const BlueprintCommentComposer = dynamic(() => import('./BlueprintCommentComposer').then((m) => m.BlueprintCommentComposer))
const BlueprintActivityPanel = dynamic(() => import('./BlueprintActivityPanel').then((m) => m.BlueprintActivityPanel))
const BlueprintSummaryModal = dynamic(() => import('./BlueprintSummaryModal').then((m) => m.BlueprintSummaryModal))
const ReviewerSuggestionsPanel = dynamic(() => import('./ReviewerSuggestionsPanel').then((m) => m.ReviewerSuggestionsPanel))

interface BlueprintWorkspaceProps {
  projectId: string
  sessionId?: string
}

// Client-side cache for fast re-hydration
const projectCacheMap = new Map<string, { project: any; sessions: any; timestamp: number }>()
const CACHE_TTL_MS = 2 * 60 * 1000 // 2 minutes

export function BlueprintWorkspace({ projectId, sessionId: propSessionId }: BlueprintWorkspaceProps) {
  const {
    setSessionId,
    setLiveFrameUrl,
    undo,
    redo,
    past,
    future,
    loadPersistedEdits,
    setIsWorkspaceLoading,
    isSuggestionsOpen,
    isInspectorOpen,
    isLibraryOpen
  } = useBlueprintStore()
  const {
    isThreadPanelOpen,
    isComposingComment,
    activeCommentTarget,
    cancelComposingComment,
    loadComments
  } = useBlueprintCollaborationStore()

  // Global Keyboard Shortcuts (Ctrl+Z, Ctrl+Shift+Z, Ctrl+Y)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.getAttribute('contenteditable') === 'true')
      ) {
        return
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
      const isCmdOrCtrl = isMac ? e.metaKey : e.ctrlKey

      if (isCmdOrCtrl && !e.altKey) {
        if (e.key.toLowerCase() === 'z') {
          if (e.shiftKey) {
            e.preventDefault()
            if (future.length > 0) redo()
          } else {
            e.preventDefault()
            if (past.length > 0) undo()
          }
        } else if (e.key.toLowerCase() === 'y' && !isMac) {
          e.preventDefault()
          if (future.length > 0) redo()
        }
      }

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        const selectedTarget = useBlueprintStore.getState().selectedTarget
        if (selectedTarget) {
          e.preventDefault()
          const direction = (e.key === 'ArrowRight' || e.key === 'ArrowDown') ? 'next' : 'prev'
          const iframe = document.querySelector('iframe') as HTMLIFrameElement
          if (iframe?.contentWindow) {
            iframe.contentWindow.postMessage({
              type: 'STAGE_SELECT_SIBLING',
              direction
            }, '*')
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undo, redo, past.length, future.length])

  useEffect(() => {
    if (!projectId) return

    let isCancelled = false
    const startTime = performance.now()
    setIsWorkspaceLoading(true)

    const initBlueprintData = async () => {
      try {
        // Check cache first for rapid re-hydration
        const cached = projectCacheMap.get(projectId)
        const isCacheValid = cached && Date.now() - cached.timestamp < CACHE_TTL_MS

        let project = cached?.project || null
        let sessions = cached?.sessions || null

        if (isCacheValid) {
          // Parallelize edits and comments fetch while using cached project details
          await Promise.all([
            loadPersistedEdits(projectId).catch(() => {}),
            loadComments(projectId).catch(() => {})
          ])
        } else {
          // Parallelize all initial network requests concurrently (avoid waterfall)
          const [, , projRes, sessRes] = await Promise.all([
            loadPersistedEdits(projectId).catch(() => {}),
            loadComments(projectId).catch(() => {}),
            api.projects.get(projectId).catch((err) => {
              console.warn('[BlueprintWorkspace] Project fetch error:', err)
              return null
            }),
            api.sessions.getSessions(projectId).catch((err) => {
              console.warn('[BlueprintWorkspace] Sessions fetch error:', err)
              return []
            })
          ])

          project = projRes
          sessions = sessRes

          if (project) {
            projectCacheMap.set(projectId, { project, sessions, timestamp: Date.now() })
          }
        }

        const targetUrl = project?.url || 'https://example.com'
        let activeSessionId: string | null = null

        if (propSessionId) {
          activeSessionId = propSessionId
        } else if (Array.isArray(sessions) && sessions.length > 0) {
          activeSessionId = sessions[0].id
        } else {
          try {
            const newSession = await api.sessions.createSession({
              project_id: projectId,
              title: `Blueprint Session (${project?.name || 'Main'})`
            })
            if (newSession?.id) {
              activeSessionId = newSession.id
            }
          } catch (createErr) {
            console.warn('[BlueprintWorkspace] Failed to create session:', createErr)
          }
        }

        if (!isCancelled) {
          if (activeSessionId) setSessionId(activeSessionId)
          if (targetUrl) setLiveFrameUrl(targetUrl)

          useBlueprintStore.setState((state) => ({
            frames: state.frames.map((f, idx) =>
              idx === 0
                ? {
                    ...f,
                    title: project?.name ? `${project.name} Surface` : f.title,
                    url: targetUrl,
                    sessionId: activeSessionId || f.sessionId
                  }
                : f
            )
          }))

          const durationMs = Math.round(performance.now() - startTime)
          console.log(`[STAGE Perf] Canvas Initial Hydration: ${durationMs}ms (cached: ${!!isCacheValid})`)
        }
      } catch (err) {
        console.error('[BlueprintWorkspace] Error initializing project session:', err)
      } finally {
        if (!isCancelled) {
          setIsWorkspaceLoading(false)
        }
      }
    }

    initBlueprintData()
    return () => {
      isCancelled = true
    }
  }, [projectId, setSessionId, setLiveFrameUrl, loadPersistedEdits, loadComments, setIsWorkspaceLoading])

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden bg-[#070a12] font-sans antialiased select-none relative">
      {/* 1. Top Toolbar */}
      <BlueprintToolbar projectId={projectId} />

      {/* 2. Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Tool Rail */}
        <BlueprintToolRail />

        {/* Pick & Place Preset Library Panel */}
        {isLibraryOpen && <BlueprintPresetLibraryPanel />}

        {/* Left Layers Panel */}
        <BlueprintLayersPanel />

        {/* Center Canvas Stage */}
        <BlueprintStage projectId={projectId} />

        {/* Right Property Inspector */}
        {isInspectorOpen && <BlueprintInspector />}

        {/* Right Blueprint Feedback Thread Panel */}
        {isThreadPanelOpen && (
          <BlueprintCommentThread
            projectId={projectId}
            onClose={() => useBlueprintCollaborationStore.getState().toggleThreadPanel(false)}
          />
        )}

        {/* Right STAGE Activity Feed Panel */}
        {useBlueprintActivityStore((state) => state.isActivityPanelOpen) && (
          <BlueprintActivityPanel projectId={projectId} />
        )}

        {/* Right Reviewer Suggestions Panel */}
        {isSuggestionsOpen && (
          <ReviewerSuggestionsPanel projectId={projectId} />
        )}
      </div>

      {/* Floating Comment Composer */}
      {isComposingComment && activeCommentTarget && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[1px] flex items-center justify-center p-4">
          <BlueprintCommentComposer
            projectId={projectId}
            target={activeCommentTarget}
            onClose={cancelComposingComment}
          />
        </div>
      )}

      {/* STAGE AI Summary Modal */}
      {useBlueprintSummaryStore((state) => state.isSummaryModalOpen) && (
        <BlueprintSummaryModal
          projectId={projectId}
          onClose={() => useBlueprintSummaryStore.getState().toggleSummaryModal(false)}
        />
      )}
    </div>
  )
}
