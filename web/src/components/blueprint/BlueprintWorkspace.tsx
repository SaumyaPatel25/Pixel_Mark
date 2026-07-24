'use client'

import React, { useEffect } from 'react'
import { api } from '@/lib/api'
import { useBlueprintStore } from '@/store/blueprintStore'
import { useBlueprintCollaborationStore } from '@/store/blueprintCollaborationStore'
import { useBlueprintActivityStore } from '@/store/blueprintActivityStore'
import { BlueprintToolbar } from './BlueprintToolbar'
import { BlueprintToolRail } from './BlueprintToolRail'
import { BlueprintLayersPanel } from './BlueprintLayersPanel'
import { BlueprintPresetLibraryPanel } from './BlueprintPresetLibraryPanel'
import { BlueprintStage } from './BlueprintStage'
import { BlueprintInspector } from './BlueprintInspector'
import { BlueprintCommentThread } from './BlueprintCommentThread'
import { BlueprintCommentComposer } from './BlueprintCommentComposer'
import { BlueprintActivityPanel } from './BlueprintActivityPanel'

interface BlueprintWorkspaceProps {
  projectId: string
}

export function BlueprintWorkspace({ projectId }: BlueprintWorkspaceProps) {
  const { setSessionId, setLiveFrameUrl, undo, redo, past, future, loadPersistedEdits } = useBlueprintStore()
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
      // Ignore if user is typing inside an input, textarea, or contenteditable field
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
            // Redo: Ctrl+Shift+Z / Cmd+Shift+Z
            e.preventDefault()
            if (future.length > 0) redo()
          } else {
            // Undo: Ctrl+Z / Cmd+Z
            e.preventDefault()
            if (past.length > 0) undo()
          }
        } else if (e.key.toLowerCase() === 'y' && !isMac) {
          // Redo: Ctrl+Y (Windows)
          e.preventDefault()
          if (future.length > 0) redo()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undo, redo, past.length, future.length])

  useEffect(() => {
    if (!projectId) return

    let isCancelled = false

    const initBlueprintData = async () => {
      try {
        // Load persisted Blueprint edits and comments for project
        await loadPersistedEdits(projectId)
        await loadComments(projectId)

        // 1. Fetch project details
        const project = await api.projects.get(projectId)
        const targetUrl = project?.url || 'https://example.com'

        // 2. Fetch sessions for this project
        const sessions = await api.sessions.getSessions(projectId)
        let activeSessionId: string | null = null

        if (Array.isArray(sessions) && sessions.length > 0) {
          activeSessionId = sessions[0].id
        } else {
          // Create a session for this project if none exists
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

          // Update initial frame model with real project title and URL
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
        }
      } catch (err) {
        console.error('[BlueprintWorkspace] Error initializing project session:', err)
      }
    }

    initBlueprintData()
    return () => {
      isCancelled = true
    }
  }, [projectId, setSessionId, setLiveFrameUrl, loadPersistedEdits, loadComments])

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden bg-[#070a12] font-sans antialiased select-none relative">
      {/* 1. Top Toolbar */}
      <BlueprintToolbar projectId={projectId} />

      {/* 2. Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Tool Rail */}
        <BlueprintToolRail />

        {/* Pick & Place Preset Library Panel */}
        <BlueprintPresetLibraryPanel />

        {/* Left Layers Panel */}
        <BlueprintLayersPanel />

        {/* Center Canvas Stage */}
        <BlueprintStage projectId={projectId} />

        {/* Right Property Inspector */}
        <BlueprintInspector />

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
    </div>
  )
}
