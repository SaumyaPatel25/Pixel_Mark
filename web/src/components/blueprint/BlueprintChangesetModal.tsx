'use client'

import React, { useState, useEffect } from 'react'
import { X, Sparkles, Layers, FileText, CheckCircle2, AlertCircle, Clock, ShieldAlert, Send, ThumbsUp, MessageSquare, History } from 'lucide-react'
import { useBlueprintStore } from '@/store/blueprintStore'
import { useBlueprintCollaborationStore, PublicationStatus } from '@/store/blueprintCollaborationStore'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

interface BlueprintChangesetModalProps {
  projectId: string
  isOpen: boolean
  onClose: () => void
  userRole?: 'owner' | 'admin' | 'developer' | 'reviewer' | 'client'
  userName?: string
}

export function BlueprintChangesetModal({
  projectId,
  isOpen,
  onClose,
  userRole = 'developer',
  userName = 'STAGE User'
}: BlueprintChangesetModalProps) {
  const { pendingMutations } = useBlueprintStore()
  const {
    publicationStatus,
    statusHistory,
    updatePublicationStatus,
    loadPublicationHistory
  } = useBlueprintCollaborationStore()

  const [activePublicationId, setActivePublicationId] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [statusError, setStatusError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && projectId) {
      // Find or load recent publication for this project
      api.blueprint.listPublications(projectId).then((pubs: any) => {
        if (Array.isArray(pubs) && pubs.length > 0) {
          const latest = pubs[0]
          setActivePublicationId(latest.id)
          useBlueprintCollaborationStore.getState().setPublicationStatus(latest.status || 'draft')
          loadPublicationHistory(projectId, latest.id)
        }
      }).catch(err => console.error('[STAGE Blueprint] Failed to load publications:', err))
    }
  }, [isOpen, projectId, loadPublicationHistory])

  if (!isOpen) return null

  const handleExportMarkdown = async () => {
    try {
      const mdText = await api.blueprint.exportMarkdown(projectId)
      const blob = new Blob([typeof mdText === 'string' ? mdText : JSON.stringify(mdText)], { type: 'text/markdown' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `stage-blueprint-handoff-${projectId}.md`
      a.click()
    } catch (err) {
      console.error('[STAGE Blueprint] Failed to export markdown:', err)
    }
  }

  const handleStatusChange = async (targetStatus: PublicationStatus) => {
    if (!projectId) return

    let pubId = activePublicationId
    setIsUpdatingStatus(true)
    setStatusError(null)

    try {
      // If no publication exists yet, create an initial baseline publication
      if (!pubId) {
        const created: any = await api.blueprint.createPublication(projectId, `STAGE Blueprint Handoff v1`)
        pubId = created.id
        setActivePublicationId(created.id)
      }
      if (!pubId) {
        throw new Error('Could not initialize publication for status update')
      }

      await updatePublicationStatus(projectId, pubId, targetStatus, note.trim() || undefined, userRole, userName)
      setNote('')
    } catch (err: any) {
      console.error('[STAGE Blueprint] Status update error:', err)
      setStatusError(err.message || 'Could not update publication status')
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const isReviewerOrClient = userRole === 'reviewer' || userRole === 'client'

  const getStatusBadge = (st: PublicationStatus) => {
    switch (st) {
      case 'approved':
        return { label: 'Approved', style: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40', icon: CheckCircle2 }
      case 'changes_requested':
        return { label: 'Changes Requested', style: 'bg-rose-500/20 text-rose-400 border-rose-500/40', icon: AlertCircle }
      case 'in_review':
        return { label: 'In Review', style: 'bg-amber-500/20 text-amber-400 border-amber-500/40', icon: Clock }
      default:
        return { label: 'Draft', style: 'bg-slate-500/20 text-slate-300 border-slate-500/40', icon: Sparkles }
    }
  }

  const badge = getStatusBadge(publicationStatus)
  const BadgeIcon = badge.icon

  return (
    <div className="fixed inset-0 z-50 bg-[#070a12]/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-[#0d1322] border border-cyan-500/30 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-200 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-[#090d16] border-b border-cyan-950/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black tracking-wide text-white uppercase">STAGE Blueprint Handoff & Approval</h3>
                <span className={cn("px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border flex items-center gap-1", badge.style)}>
                  <BadgeIcon className="w-3 h-3" />
                  <span>{badge.label}</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {pendingMutations.length} active Blueprint edits in this changeset
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar">
          {/* Approval Workflow Panel */}
          <div className="p-4 rounded-2xl bg-[#0a0e1a] border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-cyan-400">
                Approval Workflow State
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                Role: <strong className="text-white uppercase">{userRole}</strong>
              </span>
            </div>

            {statusError && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{statusError}</span>
              </div>
            )}

            {/* Note input */}
            <input
              type="text"
              placeholder="Optional status note / review feedback..."
              value={note}
              onChange={e => setNote(e.target.value)}
              className="w-full h-9 bg-slate-950 border border-slate-800 rounded-xl px-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 transition-all"
            />

            {/* Action buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => handleStatusChange('in_review')}
                disabled={isUpdatingStatus || publicationStatus === 'in_review'}
                className="px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-extrabold text-xs uppercase tracking-wider transition-all disabled:opacity-40 flex items-center gap-1.5"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Request Review</span>
              </button>

              <button
                onClick={() => handleStatusChange('approved')}
                disabled={isUpdatingStatus || publicationStatus === 'approved' || isReviewerOrClient}
                title={isReviewerOrClient ? 'Only project owners, admins, and developers can approve publications' : 'Approve Blueprint Changeset'}
                className={cn(
                  "px-3.5 py-2 rounded-xl border font-extrabold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md",
                  isReviewerOrClient
                    ? "bg-slate-800/40 border-slate-700 text-slate-500 cursor-not-allowed opacity-50"
                    : "bg-emerald-600 hover:bg-emerald-500 border-emerald-400 text-white shadow-emerald-950/40"
                )}
              >
                <ThumbsUp className="w-3.5 h-3.5" />
                <span>Approve Changes</span>
              </button>

              <button
                onClick={() => handleStatusChange('changes_requested')}
                disabled={isUpdatingStatus || publicationStatus === 'changes_requested'}
                className="px-3.5 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 font-extrabold text-xs uppercase tracking-wider transition-all disabled:opacity-40 flex items-center gap-1.5"
              >
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Request Changes</span>
              </button>
            </div>
          </div>

          {/* Edits List */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
              Active Blueprint Mutations ({pendingMutations.length})
            </h4>

            {pendingMutations.length === 0 ? (
              <div className="p-6 text-center text-slate-500 italic space-y-1 bg-slate-950/50 rounded-xl border border-slate-900">
                <Sparkles className="w-6 h-6 text-slate-600 mx-auto" />
                <p className="text-xs">No active mutations. Use Inspector or Pick & Place in Blueprint mode to add edits.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {pendingMutations.map((m) => (
                  <div
                    key={m.id}
                    className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white truncate">{m.presetName}</span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-mono font-bold uppercase">
                          {m.actionType}
                        </span>
                      </div>
                      <p className="text-[11px] font-mono text-slate-400 truncate bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                        {m.targetSelector}
                      </p>
                    </div>

                    <span className="text-[10px] font-mono text-slate-500 shrink-0">
                      {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Status History Timeline */}
          {statusHistory.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-400">
                <History className="w-4 h-4 text-cyan-400" />
                <span>Approval Status History</span>
              </div>

              <div className="space-y-2 pl-2 border-l-2 border-slate-800">
                {statusHistory.map((item) => (
                  <div key={item.id} className="p-2.5 bg-slate-950/60 border border-slate-800/80 rounded-xl text-xs space-y-1">
                    <div className="flex items-center justify-between text-slate-300 font-bold">
                      <div className="flex items-center gap-1.5">
                        <span className="capitalize">{item.previous_status}</span>
                        <span>→</span>
                        <span className="capitalize text-cyan-400">{item.new_status}</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500">
                        {new Date(item.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    </div>

                    <p className="text-[10px] text-slate-400">
                      By <strong className="text-slate-200">{item.changed_by_name || 'STAGE User'}</strong>
                    </p>

                    {item.note && (
                      <p className="text-[11px] text-slate-300 italic bg-slate-900 p-1.5 rounded border border-slate-800">
                        &ldquo;{item.note}&rdquo;
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-[#090d16] border-t border-cyan-950/60 flex items-center justify-between">
          <span className="text-[11px] text-slate-400 font-mono">
            STAGE Handoff Ready
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportMarkdown}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all shadow-md"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Download Markdown Handoff</span>
            </button>
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
