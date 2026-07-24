'use client'

import React, { useState, useEffect } from 'react'
import { MessageSquare, X, CheckCircle2, Circle, Trash2, CornerDownRight, Send, Filter, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useBlueprintCollaborationStore, BlueprintComment } from '@/store/blueprintCollaborationStore'

interface BlueprintCommentThreadProps {
  projectId: string
  onClose?: () => void
}

export function BlueprintCommentThread({ projectId, onClose }: BlueprintCommentThreadProps) {
  const [filter, setFilter] = useState<'all' | 'open' | 'resolved'>('all')
  const [replyingToId, setReplyingToId] = useState<string | null>(null)
  const [replyBody, setReplyBody] = useState('')
  const [replyAuthor, setReplyAuthor] = useState('')
  const [submittingReply, setSubmittingReply] = useState(false)

  const {
    comments,
    isLoadingComments,
    loadComments,
    addComment,
    resolveComment,
    deleteComment
  } = useBlueprintCollaborationStore()

  useEffect(() => {
    if (projectId) {
      loadComments(projectId)
    }
  }, [projectId, loadComments])

  const handlePostReply = async (parentId: string) => {
    if (!replyBody.trim()) return

    setSubmittingReply(true)
    try {
      const parent = comments.find(c => c.id === parentId)
      await addComment(projectId, {
        canvas_frame_id: parent?.canvas_frame_id || undefined,
        target_selector: parent?.target_selector || undefined,
        page_url: parent?.page_url || undefined,
        author_name: replyAuthor.trim() || undefined,
        body: replyBody.trim(),
        parent_comment_id: parentId
      })
      setReplyBody('')
      setReplyingToId(null)
    } catch (err) {
      console.error('[STAGE Blueprint] Reply failed:', err)
    } finally {
      setSubmittingReply(false)
    }
  }

  const filteredComments = comments.filter(c => {
    if (filter === 'open') return c.status === 'open'
    if (filter === 'resolved') return c.status === 'resolved'
    return true
  })

  return (
    <div className="w-96 h-full border-l border-white/10 bg-[#0d0d14] flex flex-col flex-shrink-0 z-40 select-none shadow-2xl animate-in slide-in-from-right duration-250">
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-white">
              STAGE Blueprint Feedback
            </h3>
            <p className="text-[9px] text-white/40 font-mono">
              Threaded Comments ({comments.length})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => loadComments(projectId)}
            title="Refresh comments"
            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-all"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isLoadingComments ? "animate-spin" : "")} />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="px-4 py-2 border-b border-white/5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 p-0.5 bg-white/[0.04] rounded-lg border border-white/5">
          {(['all', 'open', 'resolved'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={cn(
                "px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider transition-all",
                filter === tab
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-950/40"
                  : "text-white/40 hover:text-white hover:bg-white/5"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Comment List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {filteredComments.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-white/20" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-white/40">
              No comments found
            </p>
            <p className="text-[9px] text-white/30 max-w-[200px]">
              Select the Comment tool in the toolbar and click any target to add a feedback note.
            </p>
          </div>
        ) : (
          filteredComments.map((comment, idx) => (
            <div
              key={comment.id}
              className={cn(
                "p-3.5 rounded-2xl border transition-all space-y-2.5",
                comment.status === 'resolved'
                  ? "bg-white/[0.01] border-white/[0.05] opacity-75"
                  : "bg-white/[0.03] border-white/10 hover:border-indigo-500/30"
              )}
            >
              {/* Top row */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-5 h-5 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-[9px] font-black text-indigo-300 flex items-center justify-center flex-shrink-0 font-mono">
                    #{idx + 1}
                  </span>
                  <span className="text-[10px] font-bold text-white truncate">
                    {comment.author_name || 'STAGE Reviewer'}
                  </span>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => resolveComment(projectId, comment.id)}
                    title={comment.status === 'resolved' ? 'Reopen comment' : 'Resolve comment'}
                    className={cn(
                      "px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider flex items-center gap-1 border transition-all",
                      comment.status === 'resolved'
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
                        : "bg-white/5 border-white/10 text-white/40 hover:text-emerald-400 hover:border-emerald-500/30"
                    )}
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    <span>{comment.status === 'resolved' ? 'Resolved' : 'Resolve'}</span>
                  </button>
                  <button
                    onClick={() => deleteComment(projectId, comment.id)}
                    title="Delete comment"
                    className="p-1 rounded-md text-white/30 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Target info */}
              {comment.target_selector && (
                <div className="text-[8px] font-mono text-indigo-300/80 bg-indigo-950/30 px-2 py-1 rounded-md truncate border border-indigo-500/20">
                  Target: {comment.target_selector}
                </div>
              )}

              {/* Body */}
              <p className="text-[11px] text-white/90 leading-relaxed font-normal">
                {comment.body}
              </p>

              {/* Replies */}
              {comment.replies && comment.replies.length > 0 && (
                <div className="pl-3 border-l-2 border-indigo-500/30 space-y-2 mt-2">
                  {comment.replies.map(reply => (
                    <div key={reply.id} className="p-2 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                      <div className="flex items-center justify-between text-[9px] font-bold text-white/60">
                        <span>{reply.author_name || 'STAGE Member'}</span>
                        <button
                          onClick={() => deleteComment(projectId, reply.id)}
                          className="text-white/20 hover:text-rose-400"
                        >
                          <Trash2 className="w-2.5 h-2.5" />
                        </button>
                      </div>
                      <p className="text-[10px] text-white/80 leading-snug">
                        {reply.body}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Reply trigger & inline form */}
              {replyingToId === comment.id ? (
                <div className="space-y-2 pt-2 border-t border-white/5">
                  <input
                    type="text"
                    placeholder="Your name (optional)"
                    value={replyAuthor}
                    onChange={e => setReplyAuthor(e.target.value)}
                    className="w-full h-7 bg-white/5 border border-white/10 rounded-lg px-2 text-[10px] text-white"
                  />
                  <textarea
                    rows={2}
                    placeholder="Write a reply..."
                    value={replyBody}
                    onChange={e => setReplyBody(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-[10px] text-white resize-none"
                    autoFocus
                  />
                  <div className="flex justify-end gap-1.5">
                    <button
                      onClick={() => setReplyingToId(null)}
                      className="px-2 py-1 rounded-md text-[9px] text-white/40 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handlePostReply(comment.id)}
                      disabled={submittingReply || !replyBody.trim()}
                      className="px-3 py-1 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-[9px] font-bold uppercase tracking-wider flex items-center gap-1"
                    >
                      <Send className="w-2.5 h-2.5" />
                      <span>Reply</span>
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setReplyingToId(comment.id)}
                  className="text-[9px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 pt-1"
                >
                  <CornerDownRight className="w-3 h-3" />
                  <span>Reply</span>
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
