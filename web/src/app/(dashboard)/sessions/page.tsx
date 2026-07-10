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
import SessionFeedbackSummary from '@/components/session/SessionFeedbackSummary'

function SessionsList() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const projectId = searchParams.get('project')

  const [project, setProject] = useState<any | null>(null)
  const [sessions, setSessions] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const [selectedSessionTitle, setSelectedSessionTitle] = useState<string>('')

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

  useEffect(() => {
    if (sessions.length > 0 && !selectedSessionId) {
      setSelectedSessionId(sessions[0].id)
      setSelectedSessionTitle(sessions[0].title || '')
    }
  }, [sessions, selectedSessionId])

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
      <div className="min-h-screen bg-[#F8F7F4] text-[#1E2022] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-[#253B80]" />
        <span className="text-[10px] font-mono tracking-widest text-[#1E2022]/40 uppercase">Loading Sessions...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#F8F7F4] text-[#1E2022] p-10 flex flex-col items-center justify-center space-y-4">
        <div className="bg-red-50 border border-red-200 text-red-600 p-6 rounded-2xl max-w-md text-center text-xs font-mono shadow-sm">
          {error}
        </div>
        <button 
          onClick={fetchData}
          className="px-5 py-2.5 bg-white border border-[#253B80]/15 hover:bg-slate-50 rounded-xl text-[#253B80] text-xs font-bold transition-all shadow-sm"
        >
          Retry Load
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8F7F4] text-[#1E2022] p-6 md:p-10 font-sans relative overflow-x-hidden">
      {/* Background Dots */}
      <div 
        className="absolute inset-0 z-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: 'radial-gradient(circle, #253B80 1px, transparent 1px)',
          backgroundSize: '24px 24px'
        }}
      />

      <div className="max-w-6xl mx-auto space-y-8 relative z-10">
        {/* Header bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#253B80]/8 pb-6">
          <div className="space-y-2">
            <Link 
              href="/dashboard"
              className="inline-flex items-center gap-2 text-xs text-[#1E2022]/40 hover:text-[#1E2022] transition-colors uppercase font-bold tracking-wider"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to dashboard
            </Link>
            <h1 className="text-3xl font-black tracking-tight text-[#1E2022] leading-tight flex items-center gap-3">
              <Folder className="w-8 h-8 text-[#253B80]" />
              {project?.name || 'Review Project'}
            </h1>
            <p className="text-[#1E2022]/40 text-xs truncate max-w-md">
              {project?.url || 'No default environment URL configured'}
            </p>
          </div>

          <button
            onClick={() => {
              setNewSessionTitle(`Review Session - ${new Date().toLocaleDateString()}`)
              setNewSessionUrl(project?.url || '')
              setShowCreate(true)
            }}
            className="rounded-xl h-11 bg-[#253B80] hover:bg-[#1E2E66] text-white font-black text-xs px-6 shadow-md shadow-[#253B80]/20 transition-all flex items-center gap-2 active:scale-95 flex-shrink-0 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            New Session
          </button>
        </div>

        {/* Sessions list layout grid */}
        {sessions.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left side: Sessions List */}
            <div className="lg:col-span-7 space-y-4">
              {sessions.map((s) => {
                const isSelected = selectedSessionId === s.id
                return (
                  <div 
                    key={s.id}
                    onClick={() => {
                      setSelectedSessionId(s.id)
                      setSelectedSessionTitle(s.title || '')
                    }}
                    className={`bg-white border rounded-2xl p-5 shadow-sm hover:shadow-md cursor-pointer transition-all flex flex-col md:flex-row md:items-center justify-between gap-6 ${
                      isSelected 
                        ? 'border-[#253B80] ring-2 ring-[#253B80]/15' 
                        : 'border-[#253B80]/8'
                    }`}
                  >
                    <div className="space-y-2">
                      <h3 className="text-sm font-bold text-[#1E2022] leading-snug">{s.title}</h3>
                      <div className="flex items-center gap-4 text-[10px] text-[#1E2022]/40 font-bold uppercase tracking-wider">
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

                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <Link
                        href={`/project/${projectId}`}
                        className="h-10 px-4 rounded-xl bg-blue-50 hover:bg-blue-100 border border-[#253B80]/15 text-[#253B80] text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-all shadow-sm"
                      >
                        <Play className="w-3.5 h-3.5" />
                        Audit Canvas
                      </Link>
                      <Link
                        href={`/sessions/${s.id}`}
                        className="h-10 px-4 rounded-xl bg-white border border-[#253B80]/15 hover:bg-slate-50 text-[#1E2022]/70 hover:text-[#1E2022] text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-all shadow-sm"
                      >
                        <Compass className="w-3.5 h-3.5 text-[#253B80]/70" />
                        Observation Details
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Right side: Detailed Live Session Analytics Card */}
            <div className="lg:col-span-5 sticky top-6">
              <SessionFeedbackSummary 
                sessionId={selectedSessionId}
                sessionTitle={selectedSessionTitle}
              />
            </div>
          </div>
        ) : (
          <div className="border border-dashed border-[#253B80]/15 bg-white/50 rounded-3xl p-16 flex flex-col items-center justify-center text-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-[#253B80]/5 border border-[#253B80]/10 flex items-center justify-center">
              <Play className="w-8 h-8 text-[#253B80]/40" />
            </div>
            <div className="space-y-2 max-w-sm">
              <h3 className="text-xl font-black tracking-tight text-[#1E2022]">Launch Review Session</h3>
              <p className="text-xs text-[#1E2022]/50 leading-relaxed uppercase tracking-wider font-bold">
                No active audit or observation sessions configured yet. Launch a session to start visual auditing.
              </p>
            </div>
            <button 
              onClick={() => {
                setNewSessionTitle(`Review Session - ${new Date().toLocaleDateString()}`)
                setNewSessionUrl(project?.url || '')
                setShowCreate(true)
              }}
              className="h-10 rounded-xl bg-[#253B80]/10 border border-[#253B80]/20 hover:bg-[#253B80] text-[#253B80] hover:text-white px-6 font-bold text-xs transition-all flex items-center gap-2 shadow-sm"
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
              className="absolute inset-0 bg-[#1E2022]/30 backdrop-blur-md"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="bg-white border border-[#253B80]/8 rounded-3xl p-6 md:p-8 w-full max-w-lg shadow-2xl relative z-10 space-y-6"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black uppercase tracking-widest text-[#253B80]">New Review Session</h3>
                <button 
                  onClick={() => setShowCreate(false)}
                  className="text-[#1E2022]/40 hover:text-[#1E2022] transition-colors text-xs font-bold uppercase tracking-widest"
                >
                  Close
                </button>
              </div>

              <form onSubmit={handleCreateSession} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[#1E2022]/60 text-[9px] font-black uppercase tracking-widest block font-bold">Session Title</label>
                  <input
                    autoFocus
                    required
                    disabled={isCreating}
                    type="text"
                    placeholder="E.g. Homepage Audit"
                    value={newSessionTitle}
                    onChange={(e) => setNewSessionTitle(e.target.value)}
                    className="w-full bg-[#F8F7F4] border border-[#253B80]/8 hover:border-[#253B80]/15 rounded-xl px-4 py-3 text-xs text-[#1E2022] placeholder:text-[#1E2022]/30 focus:border-[#253B80] focus:ring-1 focus:ring-[#253B80]/20 outline-none transition-all shadow-inner"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[#1E2022]/60 text-[9px] font-black uppercase tracking-widest block font-bold">Starting URL (Optional)</label>
                  <div className="relative">
                    <ExternalLink className="w-4 h-4 text-[#1E2022]/30 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input
                      disabled={isCreating}
                      type="url"
                      placeholder="https://staging.acme.com"
                      value={newSessionUrl}
                      onChange={(e) => setNewSessionUrl(e.target.value)}
                      className="w-full bg-[#F8F7F4] border border-[#253B80]/8 hover:border-[#253B80]/15 rounded-xl pl-11 pr-4 py-3 text-xs text-[#1E2022] placeholder:text-[#1E2022]/30 focus:border-[#253B80] focus:ring-1 focus:ring-[#253B80]/20 outline-none transition-all shadow-inner"
                    />
                  </div>
                </div>

                <div className="flex gap-2.5 justify-end pt-4 border-t border-[#253B80]/8">
                  <button
                    type="button"
                    disabled={isCreating}
                    onClick={() => setShowCreate(false)}
                    className="px-5 py-3 rounded-xl border border-[#253B80]/15 bg-white hover:bg-slate-50 text-[#1E2022] text-xs font-bold transition-all shadow-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreating || !newSessionTitle.trim()}
                    className="px-6 py-3 rounded-xl bg-[#253B80] hover:bg-[#1E2E66] text-white font-black text-xs shadow-md shadow-[#253B80]/20 transition-all flex items-center gap-2"
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
      <div className="min-h-screen bg-[#F8F7F4] text-[#1E2022] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-[#253B80]" />
        <span className="text-[10px] font-mono tracking-widest text-[#1E2022]/40 uppercase">Initialising sessions list...</span>
      </div>
    }>
      <SessionsList />
    </Suspense>
  )
}
