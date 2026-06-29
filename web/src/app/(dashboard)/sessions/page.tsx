'use client'

import React, { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { api } from '@/lib/api'
import { 
  ArrowLeft, 
  Play, 
  Folder, 
  Plus, 
  Loader2, 
  Clock, 
  Compass, 
  ExternalLink 
} from 'lucide-react'

function SessionsList() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const projectId = searchParams.get('project')

  const [project, setProject] = useState<any | null>(null)
  const [sessions, setSessions] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // New Session Creation Form State
  const [showCreate, setShowCreate] = useState(false)
  const [newSessionTitle, setNewSessionTitle] = useState('')
  const [newSessionUrl, setNewSessionUrl] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const fetchData = async () => {
    if (!projectId) {
      setError('No project ID provided in query parameters.')
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const [projData, sessionsList] = await Promise.all([
        api.projects.get(projectId),
        api.sessions.getSessions(projectId)
      ])
      setProject(projData)
      setSessions(sessionsList || [])
    } catch (err: any) {
      setError(err.message || 'Failed to fetch sessions.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [projectId])

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!projectId || !newSessionTitle.trim() || isCreating) return

    setIsCreating(true)
    try {
      const session = await api.sessions.createSession({
        project_id: projectId,
        title: newSessionTitle.trim()
      })
      if (newSessionUrl.trim()) {
        await api.sessions.recordVisit(session.id, newSessionUrl.trim(), 'Initial Viewport')
      }
      setNewSessionTitle('')
      setNewSessionUrl('')
      setShowCreate(false)
      await fetchData()
    } catch (err: any) {
      alert(err.message || 'Failed to launch session.')
    } finally {
      setIsCreating(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col items-center justify-center space-y-4 opacity-50">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        <span className="text-[10px] font-mono tracking-widest text-white/40 uppercase">Loading Sessions...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white p-10 flex flex-col items-center justify-center space-y-4">
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-6 rounded-2xl max-w-md text-center text-xs font-mono">
          {error}
        </div>
        <button 
          onClick={fetchData}
          className="px-5 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl text-xs font-bold transition-all"
        >
          Retry Load
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white p-6 md:p-10 font-sans relative overflow-x-hidden">
      {/* Background Dots */}
      <div 
        className="absolute inset-0 z-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: 'radial-gradient(circle, #312e81 1px, transparent 1px)',
          backgroundSize: '24px 24px'
        }}
      />

      <div className="max-w-4xl mx-auto space-y-8 relative z-10">
        {/* Header bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.03] pb-6">
          <div className="space-y-2">
            <Link 
              href="/dashboard"
              className="inline-flex items-center gap-2 text-xs text-white/40 hover:text-white transition-colors uppercase font-bold tracking-wider"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to dashboard
            </Link>
            <h1 className="text-3xl font-black tracking-tight text-white leading-tight flex items-center gap-3">
              <Folder className="w-8 h-8 text-purple-400" />
              {project?.name || 'Review Project'}
            </h1>
            <p className="text-white/40 text-xs truncate max-w-md">
              {project?.url || 'No default environment URL configured'}
            </p>
          </div>

          <button
            onClick={() => {
              setNewSessionTitle(`Review Session - ${new Date().toLocaleDateString()}`)
              setNewSessionUrl(project?.url || '')
              setShowCreate(true)
            }}
            className="rounded-xl h-11 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs px-6 shadow-lg shadow-purple-950/40 transition-all flex items-center gap-2 active:scale-95 flex-shrink-0 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            New Session
          </button>
        </div>

        {/* Sessions list */}
        {sessions.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {sessions.map((s) => (
              <div 
                key={s.id}
                className="bg-[#0c0c0e]/80 border border-white/5 rounded-2xl p-5 hover:border-purple-500/25 hover:bg-white/[0.01] transition-all flex flex-col md:flex-row md:items-center justify-between gap-6"
              >
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-white leading-snug">{s.title}</h3>
                  <div className="flex items-center gap-4 text-[10px] text-white/30 font-bold uppercase tracking-wider">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      Started {new Date(s.created_at).toLocaleDateString()}
                    </span>
                    {s.current_page_url && (
                      <span className="truncate max-w-[240px]">
                        Last page: {s.current_page_url}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/project/${projectId}`}
                    className="h-10 px-4 rounded-xl bg-purple-600/10 hover:bg-purple-600 border border-purple-500/20 text-purple-300 hover:text-white text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-all"
                  >
                    <Play className="w-3.5 h-3.5" />
                    Audit Canvas
                  </Link>
                  <Link
                    href={`/dashboard/sessions/${s.id}`}
                    className="h-10 px-4 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] text-white/70 hover:text-white text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-all"
                  >
                    <Compass className="w-3.5 h-3.5 text-cyan-400" />
                    Observation Details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="border border-dashed border-white/10 bg-[#0c0c0e]/30 rounded-3xl p-16 flex flex-col items-center justify-center text-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-center">
              <Play className="w-8 h-8 text-white/20" />
            </div>
            <div className="space-y-2 max-w-sm">
              <h3 className="text-xl font-black tracking-tight text-white">Launch Review Session</h3>
              <p className="text-xs text-white/40 leading-relaxed uppercase tracking-wider font-bold">
                No active audit or observation sessions configured yet. Launch a session to start visual auditing.
              </p>
            </div>
            <button 
              onClick={() => {
                setNewSessionTitle(`Review Session - ${new Date().toLocaleDateString()}`)
                setNewSessionUrl(project?.url || '')
                setShowCreate(true)
              }}
              className="h-10 rounded-xl bg-purple-600/10 border border-purple-500/20 hover:bg-purple-600 hover:border-purple-500 text-purple-300 hover:text-white px-6 font-bold text-xs transition-all flex items-center gap-2"
            >
              Start First Session
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Modal Overlay for creating session */}
        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div 
              onClick={() => setShowCreate(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-md"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="bg-[#0c0c0e] border border-white/10 rounded-3xl p-6 md:p-8 w-full max-w-lg shadow-2xl relative z-10 space-y-6"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black uppercase tracking-widest text-purple-400">New Review Session</h3>
                <button 
                  onClick={() => setShowCreate(false)}
                  className="text-white/40 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest"
                >
                  Close
                </button>
              </div>

              <form onSubmit={handleCreateSession} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-white/30 text-[9px] font-black uppercase tracking-widest block font-bold">Session Title</label>
                  <input
                    autoFocus
                    required
                    disabled={isCreating}
                    type="text"
                    placeholder="E.g. Homepage Audit"
                    value={newSessionTitle}
                    onChange={(e) => setNewSessionTitle(e.target.value)}
                    className="w-full bg-white/[0.02] border border-white/5 rounded-xl px-4 py-3 text-xs text-white placeholder:text-white/20 focus:border-purple-500 outline-none transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-white/30 text-[9px] font-black uppercase tracking-widest block font-bold">Starting URL (Optional)</label>
                  <div className="relative">
                    <ExternalLink className="w-4 h-4 text-white/20 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input
                      disabled={isCreating}
                      type="url"
                      placeholder="https://staging.acme.com"
                      value={newSessionUrl}
                      onChange={(e) => setNewSessionUrl(e.target.value)}
                      className="w-full bg-white/[0.02] border border-white/5 rounded-xl pl-11 pr-4 py-3 text-xs text-white placeholder:text-white/20 focus:border-purple-500 outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="flex gap-2.5 justify-end pt-4">
                  <button
                    type="button"
                    disabled={isCreating}
                    onClick={() => setShowCreate(false)}
                    className="px-5 py-3 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] text-xs font-bold transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreating || !newSessionTitle.trim()}
                    className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs shadow-lg shadow-purple-900/20 transition-all flex items-center gap-2"
                  >
                    {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    {isCreating ? 'Launching...' : 'Launch Session'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function SessionsListPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col items-center justify-center space-y-4 opacity-50">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        <span className="text-[10px] font-mono tracking-widest text-white/40 uppercase">Initialising sessions list...</span>
      </div>
    }>
      <SessionsList />
    </Suspense>
  )
}
