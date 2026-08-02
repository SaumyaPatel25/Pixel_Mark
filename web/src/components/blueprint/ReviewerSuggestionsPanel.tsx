'use client'
import React, { useEffect, useState, useCallback } from 'react'
import {
  FileCheck,
  X,
  Check,
  Trash2,
  Clock,
  User,
  AlertCircle
} from 'lucide-react'
import { api } from '@/lib/api'
import { useBlueprintStore } from '@/store/blueprintStore'
import { Button } from '@/components/ui/button'

interface ReviewerSuggestionsPanelProps {
  projectId: string
}

export function ReviewerSuggestionsPanel({ projectId }: ReviewerSuggestionsPanelProps) {
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const { toggleSuggestions, loadPersistedEdits } = useBlueprintStore()

  const fetchSuggestions = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await api.canvas.getReviewerSuggestions(projectId)
      setSuggestions(data)
    } catch (err: any) {
      setError(err.message || 'Failed to load reviewer suggestions')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    if (projectId) {
      fetchSuggestions()
    }
  }, [projectId, fetchSuggestions])

  const handleAccept = async (id: string) => {
    try {
      await api.canvas.acceptSuggestion(projectId, id)
      // Reload suggestions
      fetchSuggestions()
      // Reload mutations to update visual editor
      loadPersistedEdits(projectId)
    } catch (err: any) {
      alert(`Failed to accept suggestion: ${err.message}`)
    }
  }

  const handleReject = async (id: string) => {
    try {
      await api.canvas.rejectSuggestion(projectId, id)
      // Reload suggestions
      fetchSuggestions()
    } catch (err: any) {
      alert(`Failed to reject suggestion: ${err.message}`)
    }
  }

  const pending = suggestions.filter(s => s.status === 'pending')
  const resolved = suggestions.filter(s => s.status !== 'pending')

  return (
    <aside className="w-80 bg-slate-950 border-r border-slate-800 flex flex-col h-full text-slate-100 z-10 shrink-0">
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-black uppercase tracking-wider text-cyan-400">Reviewer Suggestions</h2>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">Manage proposed client changes</p>
        </div>
        <button 
          onClick={toggleSuggestions}
          className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
          aria-label="Close suggestions panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {loading ? (
          <p className="text-xs text-slate-500 animate-pulse">Loading reviewer suggestions...</p>
        ) : error ? (
          <div className="p-3 bg-red-950/20 border border-red-500/30 rounded-xl flex items-start gap-2 text-red-400 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        ) : suggestions.length === 0 ? (
          <div className="p-6 border border-dashed border-slate-800 rounded-2xl text-center">
            <FileCheck className="w-8 h-8 text-slate-700 mx-auto mb-2" />
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">No suggestions yet</p>
          </div>
        ) : (
          <>
            {pending.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Pending ({pending.length})</h3>
                <div className="space-y-3">
                  {pending.map(s => {
                    let proposedText = s.proposed_value
                    if (s.operation_type === 'move' && s.proposed_value) {
                      try {
                        const parsed = JSON.parse(s.proposed_value)
                        proposedText = `Move element to ${parsed.action.toUpperCase()} ${parsed.siblingSelector || ''} under ${parsed.targetParentSelector}`
                      } catch {
                        proposedText = 'Move element'
                      }
                    } else if (proposedText && proposedText.length > 100) {
                      proposedText = proposedText.substring(0, 100) + '...'
                    }

                    return (
                      <div key={s.id} className="p-3.5 bg-slate-900/60 rounded-xl border border-slate-800 space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-full bg-cyan-950 border border-cyan-800 flex items-center justify-center">
                              <User className="w-3 h-3 text-cyan-400" />
                            </div>
                            <span className="text-xs font-bold text-slate-300 truncate max-w-[120px]">{s.reviewer_name}</span>
                          </div>
                          <div className="flex items-center gap-1 text-[9px] text-slate-500 font-mono">
                            <Clock className="w-3 h-3" />
                            <span>{new Date(s.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>

                        <div className="space-y-1.5 font-mono text-[10px]">
                          <div className="text-slate-400 truncate">
                            <span className="text-slate-600">Target:</span> {s.selector}
                          </div>
                          <div className="text-slate-400 truncate">
                            <span className="text-slate-600">Type:</span> <span className="text-purple-400 uppercase">{s.operation_type}</span>
                          </div>
                          <div className="text-cyan-400 bg-cyan-950/20 border border-cyan-950/40 p-2 rounded-lg break-all">
                            {proposedText || 'Empty value'}
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleAccept(s.id)}
                            size="sm"
                            className="flex-1 h-8 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black uppercase tracking-wider text-[9px] rounded-lg"
                          >
                            <Check className="w-3.5 h-3.5 mr-1" /> Accept
                          </Button>
                          <Button
                            onClick={() => handleReject(s.id)}
                            size="sm"
                            variant="outline"
                            className="flex-1 h-8 border-slate-800 text-slate-400 hover:text-slate-100 hover:bg-slate-900 font-black uppercase tracking-wider text-[9px] rounded-lg"
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-1" /> Reject
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {resolved.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-widest">History</h3>
                <div className="space-y-2">
                  {resolved.map(s => (
                    <div key={s.id} className="p-3 bg-slate-900/20 border border-slate-900 rounded-xl flex items-center justify-between text-xs">
                      <div className="truncate max-w-[150px]">
                        <p className="font-bold text-slate-400 truncate">{s.reviewer_name}</p>
                        <p className="text-[10px] text-slate-600 truncate">{s.selector}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider ${
                        s.status === 'accepted' ? 'bg-green-950/40 text-green-400 border border-green-800/30' : 'bg-red-950/40 text-red-400 border border-red-800/30'
                      }`}>
                        {s.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  )
}
