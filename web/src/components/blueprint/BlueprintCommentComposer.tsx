'use client'

import React, { useState, useEffect, useRef } from 'react'
import { MessageSquare, X, Send, Target, Sparkles } from 'lucide-react'
import { useBlueprintCollaborationStore, CommentTargetContext } from '@/store/blueprintCollaborationStore'

interface BlueprintCommentComposerProps {
  projectId: string
  target: CommentTargetContext
  onClose: () => void
  onSuccess?: () => void
}

export function BlueprintCommentComposer({
  projectId,
  target,
  onClose,
  onSuccess
}: BlueprintCommentComposerProps) {
  const [body, setBody] = useState('')
  const [authorName, setAuthorName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const addComment = useBlueprintCollaborationStore(s => s.addComment)

  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
      
      if (e.key === 'Tab' && containerRef.current) {
        const focusableElements = containerRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex="0"]'
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

    // Focus textarea on mount
    setTimeout(() => {
      if (containerRef.current) {
        const textarea = containerRef.current.querySelector('textarea')
        if (textarea) textarea.focus()
      }
    }, 50)

    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown)
      const trigger = document.getElementById('comment-tool-btn')
      if (trigger) {
        trigger.focus()
      }
    }
  }, [onClose])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!body.trim()) return

    setSubmitting(true)
    setError(null)

    try {
      await addComment(projectId, {
        canvas_frame_id: target.frameId,
        blueprint_edit_id: target.editId,
        target_selector: target.selector,
        page_url: target.pageUrl,
        author_name: authorName.trim() || undefined,
        body: body.trim()
      })
      setBody('')
      onSuccess?.()
      onClose()
    } catch (err: any) {
      console.error('[STAGE Blueprint] Comment submit failed:', err)
      setError(err.message || 'Failed to post comment')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div 
      ref={containerRef}
      className="w-80 p-4 rounded-2xl bg-[#0d0d16]/95 border border-indigo-500/40 text-white shadow-2xl backdrop-blur-md space-y-3 z-50 animate-in fade-in zoom-in-95 duration-150"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
            <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <h4 className="text-xs font-black uppercase tracking-wider text-white">
            STAGE Blueprint Comment
          </h4>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          aria-label="Close comment composer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Target indicator */}
      {target.selector && (
        <div className="p-2 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center gap-2 text-[9px] font-mono text-indigo-300 truncate">
          <Target className="w-3 h-3 text-indigo-400 flex-shrink-0" />
          <span className="truncate">{target.selector}</span>
        </div>
      )}

      {error && (
        <p className="text-[10px] text-rose-400 bg-rose-500/10 border border-rose-500/20 p-2 rounded-lg">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="text"
          placeholder="Your name (optional)"
          value={authorName}
          onChange={e => setAuthorName(e.target.value)}
          className="w-full h-8 bg-white/5 border border-white/10 rounded-xl px-3 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 transition-all"
        />

        <textarea
          rows={3}
          placeholder="Discuss this Blueprint element or edit..."
          value={body}
          onChange={e => setBody(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 transition-all resize-none"
          autoFocus
        />

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl border border-white/10 text-white/60 hover:text-white hover:bg-white/5 text-[10px] font-bold uppercase tracking-wider transition-all focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || !body.trim()}
            className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-lg shadow-indigo-900/40 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            {submitting ? (
              <span>Posting...</span>
            ) : (
              <>
                <Send className="w-3 h-3" />
                <span>Post Comment</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
