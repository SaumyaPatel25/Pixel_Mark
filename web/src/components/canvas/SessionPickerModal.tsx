'use client'

import React, { useState, useEffect } from 'react'
import { X, Link2, Plus, Check, Unlink, RefreshCw, Layers } from 'lucide-react'
import { api } from '@/lib/api'
import { useBlueprintStore } from '@/store/blueprintStore'

interface SessionPickerModalProps {
  isOpen: boolean
  onClose: () => void
  projectId: string
  frameId: string
  currentSessionId?: string | null
}

export function SessionPickerModal({
  isOpen,
  onClose,
  projectId,
  frameId,
  currentSessionId
}: SessionPickerModalProps) {
  const [sessions, setSessions] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // New session state
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const connectSessionToFrame = useBlueprintStore(s => s.connectSessionToFrame)
  const disconnectSessionFromFrame = useBlueprintStore(s => s.disconnectSessionFromFrame)

  const fetchSessions = async () => {
    if (!projectId) return
    setIsLoading(true)
    setError(null)
    try {
      const data = await api.sessions.getSessions(projectId)
      setSessions(Array.isArray(data) ? data : [])
    } catch (err: any) {
      console.error('[SessionPickerModal] Error fetching sessions:', err)
      setError('Failed to load sessions for this project.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      fetchSessions()
    }
  }, [isOpen, projectId])

  if (!isOpen) return null

  const handleConnect = async (sessionId: string) => {
    try {
      await connectSessionToFrame(frameId, sessionId)
      onClose()
    } catch (err: any) {
      setError('Failed to connect session to frame.')
    }
  }

  const handleDisconnect = async () => {
    try {
      await disconnectSessionFromFrame(frameId)
      onClose()
    } catch (err: any) {
      setError('Failed to disconnect session.')
    }
  }

  const handleCreateAndConnect = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) return
    setIsCreating(true)
    setError(null)
    try {
      const created = await api.sessions.createSession({
        project_id: projectId,
        title: newTitle.trim()
      })
      if (created && created.id) {
        await connectSessionToFrame(frameId, created.id)
        setNewTitle('')
        setShowCreateForm(false)
        onClose()
      }
    } catch (err: any) {
      console.error('[SessionPickerModal] Error creating session:', err)
      setError('Failed to create session.')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#141418] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-[#191920]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
              <Link2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider">Connect Session to Frame</h3>
              <p className="text-[11px] text-white/50">Select a live proxied session to enable DOM element inspection</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Action Bar */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-white/40 uppercase tracking-wider">Project Sessions</span>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchSessions}
                disabled={isLoading}
                className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors"
                title="Refresh sessions"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="px-3 py-1.5 rounded-lg bg-teal-500/10 border border-teal-500/30 hover:bg-teal-500/20 text-teal-300 text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Session</span>
              </button>
            </div>
          </div>

          {/* Create New Session Inline Form */}
          {showCreateForm && (
            <form onSubmit={handleCreateAndConnect} className="p-4 rounded-xl bg-[#1b1b22] border border-teal-500/30 space-y-3">
              <h4 className="text-xs font-bold text-teal-300 uppercase tracking-wider">Create New Session</h4>
              <input
                type="text"
                placeholder="Session Title or Page Name (e.g., Landing Page Checkout)"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-teal-500/60"
                autoFocus
              />
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-3 py-1.5 text-xs text-white/50 hover:text-white font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating || !newTitle.trim()}
                  className="px-4 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-black font-black text-xs uppercase tracking-wider disabled:opacity-50 transition-colors"
                >
                  {isCreating ? 'Creating...' : 'Create & Connect'}
                </button>
              </div>
            </form>
          )}

          {/* Current Connected Status Banner */}
          {currentSessionId && (
            <div className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-teal-400" />
                <div>
                  <span className="text-xs font-bold text-teal-300">Session Currently Connected</span>
                  <p className="text-[10px] font-mono text-teal-200/60">ID: {currentSessionId}</p>
                </div>
              </div>
              <button
                onClick={handleDisconnect}
                className="px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 text-red-400 text-xs font-bold flex items-center gap-1 transition-colors"
              >
                <Unlink className="w-3 h-3" />
                <span>Disconnect</span>
              </button>
            </div>
          )}

          {/* Sessions List */}
          {isLoading ? (
            <div className="py-8 text-center text-xs text-white/40 space-y-2">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto text-teal-400" />
              <p>Loading project sessions...</p>
            </div>
          ) : sessions.length === 0 ? (
            <div className="py-8 text-center border border-dashed border-white/10 rounded-xl p-4">
              <Layers className="w-8 h-8 text-white/20 mx-auto mb-2" />
              <p className="text-xs font-bold text-white/60">No active sessions found</p>
              <p className="text-[11px] text-white/40 mt-1">Create a new session above to link it to this frame.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {sessions.map((sess: any) => {
                const isCurrent = sess.id === currentSessionId
                const createdDate = sess.created_at
                  ? new Date(sess.created_at).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })
                  : null

                return (
                  <div
                    key={sess.id}
                    className={`p-3 rounded-xl border transition-all flex items-center justify-between ${
                      isCurrent
                        ? 'bg-teal-500/10 border-teal-500/40'
                        : 'bg-[#18181f] border-white/5 hover:border-white/20'
                    }`}
                  >
                    <div className="min-w-0 pr-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white truncate">
                          {sess.title || sess.current_page_url || 'Untitled Session'}
                        </span>
                        {isCurrent && (
                          <span className="px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300 text-[9px] font-bold uppercase tracking-wider">
                            Active
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-white/40 mt-0.5">
                        <span className="font-mono">ID: {sess.id.substring(0, 8)}...</span>
                        {createdDate && <span>• {createdDate}</span>}
                      </div>
                    </div>

                    {isCurrent ? (
                      <button
                        onClick={handleDisconnect}
                        className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold hover:bg-red-500/20 transition-colors shrink-0"
                      >
                        Disconnect
                      </button>
                    ) : (
                      <button
                        onClick={() => handleConnect(sess.id)}
                        className="px-3 py-1.5 rounded-lg bg-teal-500/10 border border-teal-500/30 text-teal-300 hover:bg-teal-500 hover:text-black font-bold text-xs transition-colors shrink-0"
                      >
                        Connect
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
