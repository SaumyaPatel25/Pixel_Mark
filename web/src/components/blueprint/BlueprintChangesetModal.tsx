'use client'

import React from 'react'
import { X, Sparkles, Layers, FileText, Download, CheckCircle, Tag } from 'lucide-react'
import { useBlueprintStore } from '@/store/blueprintStore'
import { api } from '@/lib/api'

interface BlueprintChangesetModalProps {
  projectId: string
  isOpen: boolean
  onClose: () => void
}

export function BlueprintChangesetModal({ projectId, isOpen, onClose }: BlueprintChangesetModalProps) {
  const { pendingMutations } = useBlueprintStore()

  if (!isOpen) return null

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
      console.error('Failed to export markdown:', err)
    }
  }

  // Group mutations by actionType
  const grouped = pendingMutations.reduce((acc, mut) => {
    const key = mut.actionType || 'custom'
    if (!acc[key]) acc[key] = []
    acc[key].push(mut)
    return acc
  }, {} as Record<string, typeof pendingMutations>)

  return (
    <div className="fixed inset-0 z-50 bg-[#070a12]/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-[#0d1322] border border-cyan-500/30 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-5 py-4 bg-[#090d16] border-b border-cyan-950/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Blueprint Changeset Summary</h3>
              <p className="text-[11px] text-slate-400">
                {pendingMutations.length} active Blueprint mutations on this surface
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto max-h-[60vh] space-y-4">
          {pendingMutations.length === 0 ? (
            <div className="p-8 text-center text-slate-500 italic space-y-2">
              <Sparkles className="w-8 h-8 text-slate-600 mx-auto" />
              <p>No active mutations in changeset. Use Pick & Place Library or DOM Edit tool to add edits.</p>
            </div>
          ) : (
            Object.entries(grouped).map(([actionType, muts]) => (
              <div key={actionType} className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-mono uppercase text-cyan-400 font-bold">
                  <span className="w-2 h-2 rounded-full bg-cyan-400" />
                  <span>
                    {actionType} ({muts.length})
                  </span>
                </div>

                <div className="space-y-1.5 pl-4">
                  {muts.map((m) => (
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
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 bg-[#090d16] border-t border-cyan-950/60 flex items-center justify-between">
          <span className="text-[11px] text-slate-400 font-mono">
            Handoff ready for developers & clients
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
