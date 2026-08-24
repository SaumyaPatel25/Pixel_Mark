'use client'

import React, { useEffect, useState, useMemo, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { StageLoader } from '@/components/ui/StageLoader'
import { api } from '@/lib/api'
import { 
  ArrowLeft, 
  Play, 
  Folder, 
  Plus, 
  Loader2, 
  Clock, 
  Compass, 
  ExternalLink,
  Filter,
  Layers
} from 'lucide-react'
import SessionFeedbackSummary from '@/components/session/SessionFeedbackSummary'
import { useOnboardingStore } from '@/store/onboardingStore'
import { useUIStore } from '@/store/uiStore'
import { useProjectStore } from '@/store/projectStore'

interface EnhancedSession {
  id: string
  project_id: string
  title: string
  created_at: string
  current_page_url?: string
  project_name?: string
  project_url?: string
  [key: string]: any
}

function SessionsList() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryProjectId = searchParams.get('project')

  const [projects, setProjects] = useState<any[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string>(queryProjectId || 'all')
  const [allSessions, setAllSessions] = useState<EnhancedSession[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const [selectedSessionTitle, setSelectedSessionTitle] = useState<string>('')

  // New Session Creation Form State
  const [showCreate, setShowCreate] = useState(false)
  const [createProjectId, setCreateProjectId] = useState<string>('')
  const [newSessionTitle, setNewSessionTitle] = useState('')
  const [newSessionUrl, setNewSessionUrl] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const fetchData = async () => {
    setIsLoading(true)
    setError(null)
    try {
      // 1. Fetch user projects
      let userProjects = useProjectStore.getState().projects
      if (!userProjects || userProjects.length === 0) {
        userProjects = await api.projects.list()
        useProjectStore.getState().fetchProjects().catch(() => {})
      }
      setProjects(userProjects || [])

      if (queryProjectId) {
        setSelectedProjectId(queryProjectId)
      }

      if (!userProjects || userProjects.length === 0) {
        setAllSessions([])
        setIsLoading(false)
        return
      }

      // 2. Fetch sessions across projects
      const targetProjects = queryProjectId && queryProjectId !== 'all'
        ? userProjects.filter(p => p.id === queryProjectId)
        : userProjects

      const sessionPromises = targetProjects.map(async (p) => {
        try {
          const sessions = await api.sessions.getSessions(p.id)
          return (sessions || []).map((s: any) => ({
            ...s,
            project_id: p.id,
            project_name: p.name,
            project_url: p.url,
          }))
        } catch {
          return []
        }
      })

      const results = await Promise.all(sessionPromises)
      const flatSessions: EnhancedSession[] = results.flat()
      flatSessions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

      setAllSessions(flatSessions)
    } catch (err: any) {
      setError(err.message || 'Failed to fetch sessions.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [queryProjectId])

  const filteredSessions = useMemo(() => {
    if (selectedProjectId === 'all') {
      return allSessions
    }
    return allSessions.filter(s => s.project_id === selectedProjectId)
  }, [allSessions, selectedProjectId])

  const activeProject = useMemo(() => {
    if (selectedProjectId === 'all') return null
    return projects.find(p => p.id === selectedProjectId) || null
  }, [projects, selectedProjectId])

  useEffect(() => {
    if (filteredSessions.length > 0) {
      const exists = filteredSessions.some(s => s.id === selectedSessionId)
      if (!exists) {
        setSelectedSessionId(filteredSessions[0].id)
        setSelectedSessionTitle(filteredSessions[0].title || '')
      }
    } else {
      setSelectedSessionId(null)
      setSelectedSessionTitle('')
    }
  }, [filteredSessions, selectedSessionId])

  const openCreateModal = () => {
    const defaultProjId = selectedProjectId !== 'all' 
      ? selectedProjectId 
      : (projects[0]?.id || '')
    const defaultProj = projects.find(p => p.id === defaultProjId)

    setCreateProjectId(defaultProjId)
    setNewSessionTitle(`Review Session - ${new Date().toLocaleDateString()}`)
    setNewSessionUrl(defaultProj?.url || '')
    setShowCreate(true)
  }

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetProjId = createProjectId || (projects[0]?.id || '')
    if (!targetProjId || !newSessionTitle.trim() || isCreating) return

    setIsCreating(true)
    try {
      const session = await api.sessions.createSession({
        project_id: targetProjId,
        title: newSessionTitle.trim()
      })
      if (newSessionUrl.trim()) {
        await api.sessions.recordVisit(session.id, newSessionUrl.trim(), 'Initial Viewport')
      }
      setNewSessionTitle('')
      setNewSessionUrl('')
      setShowCreate(false)
      // Complete onboarding tasks
      useOnboardingStore.getState().completeTask('click_new_session')
      useOnboardingStore.getState().completeTask('launch_session')
      await fetchData()
      useUIStore.getState().addToast('Review session launched successfully!', 'success')
    } catch (err: any) {
      let errMsg = err.message || 'Failed to launch session.'
      try {
        const parsed = JSON.parse(errMsg)
        errMsg = parsed.message || parsed.detail || errMsg
      } catch {}
      useUIStore.getState().addToast(errMsg, 'error')
    } finally {
      setIsCreating(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-pm-bg text-pm-text flex flex-col items-center justify-center transition-colors duration-300">
        <StageLoader size="md" text="Loading Sessions..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-pm-bg text-pm-text p-10 flex flex-col items-center justify-center space-y-4 transition-colors duration-300">
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 p-6 rounded-2xl max-w-md text-center text-xs font-mono shadow-sm">
          {error}
        </div>
        <button 
          onClick={fetchData}
          className="px-5 py-2.5 bg-pm-surface border border-pm-border hover:bg-pm-surface-2 rounded-xl text-pm-text text-xs font-bold transition-all shadow-sm cursor-pointer"
        >
          Retry Load
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-pm-bg text-pm-text p-6 md:p-10 font-sans relative overflow-x-hidden transition-colors duration-300">
      {/* Background Dots */}
      <div 
        className="absolute inset-0 z-0 pointer-events-none opacity-10 dark:opacity-5"
        style={{
          backgroundImage: 'radial-gradient(circle, var(--pm-accent-color, #253B80) 1px, transparent 1px)',
          backgroundSize: '24px 24px'
        }}
      />

      <div className="max-w-6xl mx-auto space-y-8 relative z-10">
        {/* Header bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-pm-border pb-6 transition-all">
          <div className="space-y-2">
            <Link 
              href="/dashboard"
              className="inline-flex items-center gap-2 text-xs text-pm-muted hover:text-pm-text transition-colors uppercase font-bold tracking-wider"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to dashboard
            </Link>
            <h1 className="text-3xl font-black tracking-tight text-pm-text leading-tight flex items-center gap-3">
              <Folder className="w-8 h-8 text-pm-accent" />
              {activeProject ? activeProject.name : 'All Review Sessions'}
            </h1>
            <p className="text-pm-muted text-xs truncate max-w-md">
              {activeProject?.url || (projects.length > 0 ? `${allSessions.length} total sessions across ${projects.length} workspace projects` : 'No projects configured')}
            </p>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-auto flex-wrap">
            {/* Project Filter Dropdown */}
            {projects.length > 1 && (
              <div className="flex items-center gap-2 bg-pm-surface border border-pm-border rounded-xl px-3 py-2 text-xs">
                <Filter className="w-3.5 h-3.5 text-pm-muted" />
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="bg-transparent text-pm-text font-bold text-xs outline-none cursor-pointer"
                >
                  <option value="all" className="bg-pm-surface text-pm-text">All Projects ({projects.length})</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id} className="bg-pm-surface text-pm-text">
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {projects.length > 0 && (
              <button
                id="onboarding-new-session-btn"
                onClick={openCreateModal}
                className="rounded-xl h-11 bg-pm-accent hover:bg-pm-accent-bright text-white font-black text-xs px-6 shadow-md transition-all flex items-center gap-2 active:scale-95 flex-shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                New Session
              </button>
            )}
          </div>
        </div>

        {/* Sessions list layout grid */}
        {filteredSessions.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left side: Sessions List */}
            <div className="lg:col-span-7 space-y-4">
              {filteredSessions.map((s) => {
                const isSelected = selectedSessionId === s.id
                return (
                  <div 
                    key={s.id}
                    onClick={() => {
                      setSelectedSessionId(s.id)
                      setSelectedSessionTitle(s.title || '')
                    }}
                    className={`bg-pm-surface border rounded-2xl p-5 shadow-sm hover:shadow-md cursor-pointer transition-all flex flex-col md:flex-row md:items-center justify-between gap-6 ${
                      isSelected 
                        ? 'border-pm-accent ring-2 ring-pm-accent-subtle shadow-md' 
                        : 'border-pm-border'
                    }`}
                  >
                    <div className="space-y-2 min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm font-bold text-pm-text leading-snug truncate">{s.title}</h2>
                        {selectedProjectId === 'all' && s.project_name && (
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-pm-accent-subtle text-pm-accent border border-pm-border truncate max-w-[120px]">
                            {s.project_name}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-[10px] text-pm-muted dark:text-zinc-400 font-semibold uppercase tracking-wider">
                        <span className="flex items-center gap-1.5 font-mono">
                          <Clock className="w-3.5 h-3.5 text-pm-muted" />
                          Started {new Date(s.created_at).toLocaleDateString()}
                        </span>
                        {s.current_page_url && (
                          <span className="truncate max-w-[240px] font-mono">
                            Last page: {s.current_page_url}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                      <Link
                        id="onboarding-audit-canvas-btn"
                        href={`/project/${s.project_id}?session=${s.id}`}
                        prefetch={false}
                        title="Audit Canvas"
                        className="group h-10 px-4 rounded-xl bg-pm-accent-subtle hover:bg-pm-accent/20 border border-pm-border text-pm-accent text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-all shadow-sm whitespace-nowrap overflow-hidden"
                      >
                        <Play className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="max-w-0 opacity-0 group-hover:max-w-[200px] group-hover:opacity-100 transition-all duration-300 overflow-hidden">Audit Canvas</span>
                      </Link>
                      <Link
                        href={`/project/${s.project_id}?session=${s.id}&view=details`}
                        prefetch={false}
                        title="Observation Details"
                        className="group h-10 px-4 rounded-xl bg-pm-surface border border-pm-border hover:bg-pm-surface-2 text-pm-muted hover:text-pm-text text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-all shadow-sm whitespace-nowrap overflow-hidden"
                      >
                        <Compass className="w-3.5 h-3.5 text-pm-accent flex-shrink-0" />
                        <span className="max-w-0 opacity-0 group-hover:max-w-[200px] group-hover:opacity-100 transition-all duration-300 overflow-hidden">Observation Details</span>
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
        ) : projects.length === 0 ? (
          /* Empty State: No projects created yet */
          <div className="border border-dashed border-pm-border bg-pm-surface-2 rounded-3xl p-16 flex flex-col items-center justify-center text-center gap-6 transition-all duration-300">
            <div className="w-16 h-16 rounded-2xl bg-pm-surface border border-pm-border flex items-center justify-center text-pm-accent">
              <Layers className="w-8 h-8" />
            </div>
            <div className="space-y-2 max-w-sm">
              <h2 className="text-xl font-black tracking-tight text-pm-text">No projects yet</h2>
              <p className="text-xs text-pm-muted leading-relaxed font-semibold">
                Create your first project on the dashboard to start launching review sessions and annotating web pages.
              </p>
            </div>
            <Link 
              href="/dashboard"
              className="h-10 rounded-xl bg-pm-accent hover:bg-pm-accent-bright text-white px-6 font-bold text-xs transition-all flex items-center gap-2 shadow-sm cursor-pointer"
            >
              Go to Dashboard
              <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
            </Link>
          </div>
        ) : (
          /* Empty State: Projects exist, but no sessions launched yet */
          <div className="border border-dashed border-pm-border bg-pm-surface-2 rounded-3xl p-16 flex flex-col items-center justify-center text-center gap-6 transition-all duration-300">
            <div className="w-16 h-16 rounded-2xl bg-pm-surface border border-pm-border flex items-center justify-center">
              <Play className="w-8 h-8 text-pm-accent/40" />
            </div>
            <div className="space-y-2 max-w-sm">
              <h2 className="text-xl font-black tracking-tight text-pm-text">Launch Review Session</h2>
              <p className="text-xs text-pm-muted leading-relaxed uppercase tracking-wider font-bold">
                No active audit or observation sessions found for this selection. Launch a session to start visual auditing.
              </p>
            </div>
            <button 
              id="onboarding-new-session-btn"
              onClick={openCreateModal}
              className="h-10 rounded-xl bg-pm-accent/10 border border-pm-border hover:bg-pm-accent text-pm-accent hover:text-white px-6 font-bold text-xs transition-all flex items-center gap-2 shadow-sm cursor-pointer"
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
              className="absolute inset-0 bg-black/40 backdrop-blur-md"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="bg-pm-surface border border-pm-border rounded-3xl p-6 md:p-8 w-full max-w-lg shadow-2xl relative z-10 space-y-6"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-black uppercase tracking-widest text-pm-text">New Review Session</h2>
                <button 
                  onClick={() => setShowCreate(false)}
                  className="text-pm-muted hover:text-pm-text transition-colors text-xs font-bold uppercase tracking-widest cursor-pointer"
                >
                  Close
                </button>
              </div>

              <form onSubmit={handleCreateSession} className="space-y-4">
                {/* Target Project Selection */}
                {projects.length > 1 && (
                  <div className="space-y-2">
                    <label className="text-pm-muted text-[9px] font-black uppercase tracking-widest block font-bold">Target Project</label>
                    <select
                      value={createProjectId}
                      onChange={(e) => {
                        const pid = e.target.value
                        setCreateProjectId(pid)
                        const p = projects.find(proj => proj.id === pid)
                        if (p?.url) setNewSessionUrl(p.url)
                      }}
                      className="w-full bg-pm-bg border border-pm-border hover:border-pm-border-bright rounded-xl px-4 py-3 text-xs text-pm-text focus:border-pm-accent outline-none transition-all shadow-inner cursor-pointer"
                    >
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} {p.url ? `(${p.url})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-pm-muted text-[9px] font-black uppercase tracking-widest block font-bold">Session Title</label>
                  <input
                    autoFocus
                    required
                    disabled={isCreating}
                    type="text"
                    placeholder="E.g. Homepage Audit"
                    value={newSessionTitle}
                    onChange={(e) => setNewSessionTitle(e.target.value)}
                    className="w-full bg-pm-bg border border-pm-border hover:border-pm-border-bright rounded-xl px-4 py-3 text-xs text-pm-text placeholder:text-pm-muted focus:border-pm-accent outline-none transition-all shadow-inner"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-pm-muted text-[9px] font-black uppercase tracking-widest block font-bold">Starting URL (Optional)</label>
                  <div className="relative">
                    <ExternalLink className="w-4 h-4 text-pm-muted absolute left-4 top-1/2 -translate-y-1/2" />
                    <input
                      disabled={isCreating}
                      type="url"
                      placeholder="https://staging.acme.com"
                      value={newSessionUrl}
                      onChange={(e) => setNewSessionUrl(e.target.value)}
                      className="w-full bg-pm-bg border border-pm-border hover:border-pm-border-bright rounded-xl pl-11 pr-4 py-3 text-xs text-pm-text placeholder:text-pm-muted focus:border-pm-accent outline-none transition-all shadow-inner"
                    />
                  </div>
                </div>

                <div className="flex gap-2.5 justify-end pt-4 border-t border-pm-border">
                  <button
                    type="button"
                    disabled={isCreating}
                    onClick={() => setShowCreate(false)}
                    className="px-5 py-3 rounded-xl border border-pm-border bg-pm-surface hover:bg-pm-surface-2 text-pm-text text-xs font-bold transition-all shadow-sm cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    id="onboarding-launch-session-btn"
                    type="submit"
                    disabled={isCreating || !newSessionTitle.trim()}
                    className="px-6 py-3 rounded-xl bg-pm-accent hover:bg-pm-accent-bright text-white font-black text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer"
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
      <div className="min-h-screen bg-pm-bg text-pm-text flex flex-col items-center justify-center">
        <StageLoader size="md" text="Initialising sessions list..." />
      </div>
    }>
      <SessionsList />
    </Suspense>
  )
}
