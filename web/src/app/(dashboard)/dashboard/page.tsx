'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { ShareLinkPanel } from '@/components/share/ShareLinkPanel'
import { ProjectCard } from '@/components/ProjectCard'
import { event as trackEvent } from '@/lib/analytics'
import Link from 'next/link'
import { 
  Plus, 
  Folder, 
  Play, 
  FileText, 
  AlertCircle, 
  Search, 
  Filter, 
  Loader2, 
  Globe,
  X,
  Compass,
  ArrowRight,
  Settings,
  Calendar,
  Layers,
  ChevronRight,
  TrendingUp,
  Inbox
} from 'lucide-react'

// Relative time helper
function formatRelativeTime(dateString: string | Date | null) {
  if (!dateString) return null
  const date = new Date(dateString)
  const diffMs = Date.now() - date.getTime()
  const diffMin = Math.round(diffMs / 60000)
  const diffHr = Math.round(diffMs / 3600000)
  const diffDay = Math.round(diffMs / 86400000)
  
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`
  if (diffDay === 1) return 'yesterday'
  return `${diffDay}d ago`
}

export default function DashboardPage() {
  const user = useAuthStore(s => s.user)
  const router = useRouter()
  
  // Dashboard Telemetry Data State
  const [projectsData, setProjectsData] = useState<any[]>([])
  const [recentActivityData, setRecentActivityData] = useState<any[]>([])
  const [statsData, setStatsData] = useState({
    totalProjects: 0,
    totalSessions: 0,
    openIssues: 0
  })

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // New Project Modal State
  const [showCreateProject, setShowCreateProject] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectUrl, setNewProjectUrl] = useState('')
  const [isCreatingProject, setIsCreatingProject] = useState(false)

  // New Session Modal State
  const [newSessionProject, setNewSessionProject] = useState<any | null>(null)
  const [newSessionUrl, setNewSessionUrl] = useState('')
  const [newSessionTitle, setNewSessionTitle] = useState('')
  const [isCreatingSession, setIsCreatingSession] = useState(false)

  // Share Modal State
  const [shareSessionId, setShareSessionId] = useState<string | null>(null)

  // Search & Filters state
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFilter, setDateFilter] = useState<'all' | '24h' | '7d' | '30d'>('all')
  const [sortOrder, setSortOrder] = useState<'recent' | 'name'>('recent')

  // Delete project state
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null)

  const handleDeleteProject = async (projectId: string) => {
    setDeletingProjectId(projectId)
    try {
      await api.projects.delete(projectId)
      // Optimistically remove from local state
      setProjectsData(prev => prev.filter(p => p.id !== projectId))
      setStatsData(prev => ({ ...prev, totalProjects: Math.max(0, prev.totalProjects - 1) }))
    } catch (err: any) {
      console.error('[Dashboard] Failed to delete project:', err)
      alert(`Failed to delete project: ${err.message || 'Unknown error'}`)
    } finally {
      setDeletingProjectId(null)
    }
  }

  // Load all telemetry from the unified parallel fetching flow
  const fetchDashboardData = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [projectsList, sessionsList, summary] = await Promise.all([
        api.getProjects(),
        api.getAllSessions(),
        api.getDashboardSummary()
      ])

      const projectMap: Record<string, any> = {}
      projectsList.forEach((p: any) => {
        projectMap[p.id] = p
      })

      const sessionsByProject: Record<string, any[]> = {}
      projectsList.forEach((p: any) => {
        sessionsByProject[p.id] = []
      })

      sessionsList.forEach((s: any) => {
        if (sessionsByProject[s.project_id]) {
          sessionsByProject[s.project_id].push(s)
        }
      })

      // Construct detailed projects object mapping local sessions
      const detailed = projectsList.map((p: any) => {
        const pSessions = sessionsByProject[p.id] || []
        
        return {
          ...p,
          sessions: pSessions,
          analytics: null // Pass null so card fetches its own analytics endpoint
        }
      })

      setProjectsData(detailed)

      // Calculate stats values using the lightweight backend summary
      setStatsData({
        totalProjects: summary.total_projects,
        totalSessions: summary.total_sessions,
        openIssues: summary.open_issues
      })

      // Aggregate recent activities using sessions
      const activities: any[] = []
      sessionsList.forEach((s: any) => {
        const pName = projectMap[s.project_id]?.name || 'Unknown Project'
        activities.push({
          id: `session-${s.id}`,
          type: 'session',
          projectName: pName,
          date: s.created_at,
          description: `Session started for ${pName}`
        })
      })

      const sortedActivities = activities
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5)

      setRecentActivityData(sortedActivities)

    } catch (err: any) {
      setError(err.message || 'Failed to fetch dashboard data.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  // Create Project handler
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newProjectName.trim() || isCreatingProject) return

    setIsCreatingProject(true)
    try {
      await api.projects.create({
        name: newProjectName.trim(),
        url: newProjectUrl.trim(),
      })
      trackEvent({ action: 'create_project', category: 'project' })
      await fetchDashboardData()
      setNewProjectName('')
      setNewProjectUrl('')
      setShowCreateProject(false)
    } catch (err: any) {
      alert(err.message || 'Failed to initialize project')
    } finally {
      setIsCreatingProject(false)
    }
  }

  // Create Custom Session & pre-seed Target URL
  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSessionProject || isCreatingSession) return

    setIsCreatingSession(true)
    try {
      const session = await api.sessions.createSession({
        project_id: newSessionProject.id,
        title: newSessionTitle.trim() || `Review Session - ${new Date().toLocaleDateString()}`
      })
      trackEvent({ action: 'create_session', category: 'session' })

      if (newSessionUrl.trim()) {
        try {
          await api.sessions.recordVisit(session.id, newSessionUrl.trim(), 'Initial Review Viewport')
        } catch (visitErr) {
          console.error("Failed to seed session page visit:", visitErr)
        }
      }

      setNewSessionProject(null)
      router.push(`/project/${newSessionProject.id}`)
    } catch (err: any) {
      alert(err.message || 'Failed to initialize session')
    } finally {
      setIsCreatingSession(false)
    }
  }

  // Filter & Sort Projects client-side
  const filteredProjects = useMemo(() => {
    return projectsData
      .filter((p) => {
        const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (p.url || '').toLowerCase().includes(searchQuery.toLowerCase())
        if (!matchesSearch) return false

        if (dateFilter !== 'all') {
          const hours = dateFilter === '24h' ? 24 : dateFilter === '7d' ? 168 : 720
          const cutoff = Date.now() - hours * 60 * 60 * 1000
          const lastActive = p.sessions.length
            ? Math.max(...p.sessions.map((s: any) => new Date(s.updated_at || s.created_at).getTime()))
            : 0
          if (lastActive < cutoff) return false
        }
        return true
      })
      .sort((a, b) => {
        if (sortOrder === 'name') {
          return a.name.localeCompare(b.name)
        } else {
          // Default: recent
          const aTime = a.sessions.length
            ? Math.max(...a.sessions.map((s: any) => new Date(s.updated_at || s.created_at).getTime()))
            : 0
          const bTime = b.sessions.length
            ? Math.max(...b.sessions.map((s: any) => new Date(s.updated_at || s.created_at).getTime()))
            : 0
          return bTime - aTime
        }
      })
  }, [projectsData, searchQuery, dateFilter, sortOrder])

  // Animation variants
  const staggerContainer = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  }

  const staggerItem = {
    hidden: { opacity: 0, y: 10 },
    show: { 
      opacity: 1, 
      y: 0, 
      transition: { type: 'spring' as const, stiffness: 150, damping: 20 } 
    }
  }

  return (
    <div className="min-h-screen bg-[#F8F7F4] text-[#1E2022] p-6 md:p-10 font-sans selection:bg-[#253B80]/10 overflow-x-hidden relative">
      
      {/* Faint dot grid backdrop */}
      <div 
        className="absolute inset-0 z-0 pointer-events-none opacity-25"
        style={{
          backgroundImage: 'radial-gradient(circle, #253B80 1px, transparent 1px)',
          backgroundSize: '32px 32px'
        }}
      />

      <div className="max-w-7xl mx-auto space-y-8 relative z-10">
        
        {/* ================= ZONE 1: HEADER ZONE (F-Pattern) ================= */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-b border-[#253B80]/8 pb-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-bold text-[#253B80]/60 uppercase tracking-widest">
              <span>Developer Workspace</span>
              <span className="w-1 h-1 rounded-full bg-[#253B80]/30" />
              <span>Standard Plan</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-[#1E2022] leading-tight">
              Welcome back, {user?.name || 'Pro Reviewer'}
            </h1>
            <p className="text-[#1E2022]/60 text-xs font-semibold">Visual feedback and live collaboration dashboard</p>
          </div>
          
          <div className="flex items-center gap-3">
            <Link
              href="/settings"
              className="rounded-xl h-11 bg-white hover:bg-[#253B80]/[0.02] border border-[#253B80]/12 text-[#1E2022]/70 hover:text-[#1E2022] font-bold text-xs px-4 transition-all flex items-center gap-2 active:scale-95 flex-shrink-0 shadow-sm"
            >
              <Settings className="w-4 h-4 text-[#253B80]/50" />
              Settings
            </Link>
            <button
              onClick={() => setShowCreateProject(true)}
              className="rounded-xl h-11 bg-[#253B80] hover:bg-[#1B2C60] text-white font-extrabold text-xs px-6 shadow-sm transition-all flex items-center gap-2 active:scale-95 flex-shrink-0"
            >
              <Plus className="w-4 h-4" />
              New Project
            </button>
          </div>
        </div>

        {/* ================= KPI CARDS ROWS ================= */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { 
              label: 'Active Projects', 
              val: statsData.totalProjects, 
              icon: Folder, 
              color: 'text-[#253B80] bg-[#253B80]/[0.05] border-[#253B80]/10' 
            },
            { 
              label: 'Review Sessions', 
              val: statsData.totalSessions, 
              icon: Play, 
              color: 'text-emerald-700 bg-emerald-500/[0.05] border-emerald-500/10' 
            },
            { 
              label: 'Waiting Issues', 
              val: statsData.openIssues, 
              icon: AlertCircle, 
              color: statsData.openIssues > 0 
                ? 'text-rose-700 bg-rose-500/[0.05] border-rose-500/10' 
                : 'text-slate-500 bg-slate-500/[0.05] border-slate-500/10'
            }
          ].map((stat, i) => (
            <div 
              key={i} 
              className="p-5 rounded-2xl bg-white border border-[#253B80]/8 flex items-center justify-between shadow-sm"
            >
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#1E2022]/40 block">{stat.label}</span>
                {isLoading ? (
                  <div className="h-8 w-12 bg-[#253B80]/5 animate-pulse rounded-lg mt-1" />
                ) : error ? (
                  <p className="text-xs text-rose-600 font-semibold mt-1">Error</p>
                ) : (
                  <p className="text-3xl font-mono font-extrabold tracking-tight text-[#1E2022]">
                    {stat.val}
                  </p>
                )}
              </div>
              <div className={`p-3 rounded-xl border ${stat.color}`}>
                <stat.icon className="w-5 h-5" />
              </div>
            </div>
          ))}
        </div>

        {/* ================= MAIN LAYOUT BODY ================= */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* ================= LEFT MAIN AREA (Projects) ================= */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* Search & Filter Header (Unified Control Bar) */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white border border-[#253B80]/8 rounded-2xl p-3 shadow-sm">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[#253B80]/40 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter environments or names..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#F8F7F4]/50 border border-[#253B80]/8 rounded-xl pl-11 pr-4 py-2.5 text-xs text-[#1E2022] placeholder:text-[#1E2022]/35 focus:border-[#253B80] focus:bg-white outline-none transition-all"
                />
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center bg-[#F8F7F4]/50 border border-[#253B80]/8 rounded-xl px-3 py-2">
                  <Filter className="w-3.5 h-3.5 text-[#253B80]/40 mr-2" />
                  <select
                    value={dateFilter}
                    onChange={(e: any) => setDateFilter(e.target.value)}
                    className="bg-transparent text-[11px] font-bold text-[#1E2022]/60 focus:text-[#1E2022] outline-none cursor-pointer pr-1"
                  >
                    <option value="all">All Active</option>
                    <option value="24h">Last 24 Hours</option>
                    <option value="7d">Last 7 Days</option>
                    <option value="30d">Last 30 Days</option>
                  </select>
                </div>

                <div className="flex items-center bg-[#F8F7F4]/50 border border-[#253B80]/8 rounded-xl px-3 py-2">
                  <select
                    value={sortOrder}
                    onChange={(e: any) => setSortOrder(e.target.value)}
                    className="bg-transparent text-[11px] font-bold text-[#1E2022]/60 focus:text-[#1E2022] outline-none cursor-pointer pr-1"
                  >
                    <option value="recent">Sort: Recent</option>
                    <option value="name">Sort: Name</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Grid display with loading skeletons */}
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[1, 2, 3, 4].map((n) => (
                  <div key={n} className="h-44 bg-white border border-[#253B80]/8 rounded-2xl animate-pulse p-5 space-y-4 shadow-sm">
                    <div className="h-6 w-32 bg-[#253B80]/5 rounded" />
                    <div className="h-4 w-48 bg-[#253B80]/5 rounded" />
                    <div className="h-10 w-full bg-[#253B80]/5 rounded mt-4" />
                  </div>
                ))}
              </div>
            ) : error ? (
              /* Error State */
              <div className="bg-rose-50 border border-rose-200 text-rose-900 p-8 rounded-2xl text-center space-y-4 shadow-sm">
                <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center mx-auto text-rose-600">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-rose-900">Failed to load projects</h3>
                  <p className="text-xs text-rose-700/80">{error}</p>
                </div>
                <button 
                  onClick={fetchDashboardData}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-all inline-flex items-center gap-1.5 active:scale-95 shadow-sm"
                >
                  Retry Fetch
                </button>
              </div>
            ) : filteredProjects.length > 0 ? (
              <motion.div 
                variants={staggerContainer}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
              >
                {filteredProjects.map((p) => (
                  <motion.div key={p.id} variants={staggerItem}>
                    <ProjectCard
                      project={p}
                      onClick={() => router.push(`/sessions?project=${p.id}`)}
                      sessionsCount={p.sessions.length}
                      activeSessionsCount={p.sessions.filter((s: any) => new Date(s.updated_at || s.created_at).getTime() > Date.now() - 24 * 60 * 60 * 1000).length}
                      lastActivity={p.sessions.length ? formatRelativeTime(new Date(Math.max(...p.sessions.map((s: any) => new Date(s.updated_at || s.created_at).getTime())))) : null}
                      analytics={p.analytics}
                      onOpenCanvas={() => {
                        trackEvent({ action: 'launch_sandbox', category: 'project' })
                        router.push(`/canvas/${p.id}`)
                      }}
                      onNewSession={() => {
                        setNewSessionProject(p)
                        setNewSessionUrl(p.url || '')
                        setNewSessionTitle(`Review Session - ${new Date().toLocaleDateString()}`)
                      }}
                      onShare={() => {
                        const sorted = [...p.sessions].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                        if (sorted.length > 0) {
                          setShareSessionId(sorted[0].id)
                        } else {
                          alert('Please start a review session first before generating a client link.')
                        }
                      }}
                      onDelete={async () => { await handleDeleteProject(p.id) }}
                    />
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              /* Empty state */
              <motion.div 
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="border-2 border-dashed border-[#253B80]/15 bg-white rounded-3xl p-16 flex flex-col items-center justify-center text-center gap-6 hover:border-[#253B80]/30 hover:bg-[#253B80]/[0.005] transition-all cursor-pointer group shadow-sm"
                onClick={() => setShowCreateProject(true)}
              >
                <div className="w-16 h-16 rounded-2xl bg-[#253B80]/[0.03] border border-[#253B80]/10 flex items-center justify-center group-hover:scale-105 group-hover:border-[#253B80]/20 group-hover:shadow-sm transition-all text-[#253B80]/60">
                  <Inbox className="w-8 h-8" />
                </div>
                <div className="space-y-1.5 max-w-sm">
                  <h3 className="text-xl font-bold tracking-tight text-[#1E2022]">No projects yet</h3>
                  <p className="text-xs text-[#1E2022]/50 leading-relaxed font-semibold">
                    Create your first review project to initiate visual QA processes.
                  </p>
                </div>
                <button className="h-10 rounded-xl bg-[#253B80] hover:bg-[#1B2C60] text-white px-6 font-bold text-xs transition-all flex items-center gap-2 active:scale-95 shadow-sm">
                  Create First Project
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            )}

          </div>

          {/* ================= RIGHT SIDE PANEL (Recent Activity) ================= */}
          <div className="space-y-6">
            
            {/* Recent Activity Panel */}
            <div className="bg-white border border-[#253B80]/8 rounded-2xl p-5 shadow-sm space-y-5">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#1E2022]/40 flex items-center gap-2 pb-2 border-b border-[#253B80]/5">
                <Compass className="w-4 h-4 text-[#253B80]" />
                Recent Activity
              </h3>
              
              {isLoading ? (
                <div className="space-y-4 py-2 animate-pulse">
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="space-y-2">
                      <div className="h-3 w-16 bg-[#253B80]/5 rounded" />
                      <div className="h-3 w-40 bg-[#253B80]/5 rounded" />
                    </div>
                  ))}
                </div>
              ) : recentActivityData.length > 0 ? (
                <div className="relative pl-4 border-l-2 border-[#253B80]/8 space-y-6">
                  {recentActivityData.map((activity, idx) => (
                    <div key={activity.id} className="relative space-y-1 text-xs">
                      {/* Timeline dot */}
                      <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full border-2 border-white bg-[#253B80] shadow-sm" />
                      
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[9px] text-[#253B80] font-bold uppercase truncate max-w-[120px]">
                          {activity.projectName}
                        </span>
                        <span className="text-[9px] text-[#1E2022]/40 font-bold">
                          {formatRelativeTime(activity.date)}
                        </span>
                      </div>
                      <p className="text-[#1E2022]/70 text-xs leading-snug">
                        {activity.description}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                /* Empty Activity State */
                <div className="text-center py-8 space-y-2">
                  <div className="w-10 h-10 rounded-full bg-[#253B80]/[0.03] flex items-center justify-center mx-auto text-[#253B80]/40">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <p className="text-[10px] uppercase font-bold tracking-wider text-[#1E2022]/30">
                    No activity yet.
                  </p>
                </div>
              )}
            </div>

          </div>

        </div>

      </div>

      {/* ================= MODALS OVERLAYS (Light Themed) ================= */}
      <AnimatePresence>
        
        {/* NEW PROJECT MODAL */}
        {showCreateProject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreateProject(false)}
              className="absolute inset-0 bg-[#0B0F19]/60 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 10 }}
              className="bg-white border border-[#253B80]/15 rounded-3xl p-6 md:p-8 w-full max-w-lg shadow-xl relative z-10 space-y-6 text-[#1E2022]"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-widest text-[#253B80]">New Review Project</h3>
                <button onClick={() => setShowCreateProject(false)} className="text-[#1E2022]/40 hover:text-[#1E2022] transition-colors p-1 hover:bg-[#253B80]/5 rounded-lg">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateProject} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[#1E2022]/60 text-[10px] font-bold uppercase tracking-widest block">Project Name</label>
                  <input
                    autoFocus
                    required
                    disabled={isCreatingProject}
                    type="text"
                    placeholder="Acme Workspace / Landing Portal"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    className="w-full bg-[#F8F7F4]/50 border border-[#253B80]/12 rounded-xl px-4 py-3 text-xs text-[#1E2022] placeholder:text-[#1E2022]/30 focus:border-[#253B80] focus:bg-white outline-none transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[#1E2022]/60 text-[10px] font-bold uppercase tracking-widest block">Target Environment URL</label>
                  <div className="relative">
                    <Globe className="w-4 h-4 text-[#253B80]/30 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input
                      disabled={isCreatingProject}
                      type="url"
                      placeholder="https://staging.acme.com"
                      value={newProjectUrl}
                      onChange={(e) => setNewProjectUrl(e.target.value)}
                      className="w-full bg-[#F8F7F4]/50 border border-[#253B80]/12 rounded-xl pl-11 pr-4 py-3 text-xs text-[#1E2022] placeholder:text-[#1E2022]/30 focus:border-[#253B80] focus:bg-white outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="flex gap-2.5 justify-end pt-4 border-t border-[#253B80]/5">
                  <button
                    type="button"
                    disabled={isCreatingProject}
                    onClick={() => setShowCreateProject(false)}
                    className="px-5 py-3 rounded-xl border border-[#253B80]/12 bg-white hover:bg-[#F8F7F4] text-xs font-bold text-[#1E2022]/70 transition-all active:scale-95"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingProject || !newProjectName.trim()}
                    className="px-6 py-3 rounded-xl bg-[#253B80] hover:bg-[#1B2C60] text-white font-bold text-xs transition-all flex items-center gap-2 active:scale-95 shadow-sm"
                  >
                    {isCreatingProject ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                    {isCreatingProject ? 'Creating...' : 'Initialize Project'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* NEW SESSION MODAL */}
        {newSessionProject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setNewSessionProject(null)}
              className="absolute inset-0 bg-[#0B0F19]/60 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 10 }}
              className="bg-white border border-[#253B80]/15 rounded-3xl p-6 md:p-8 w-full max-w-lg shadow-xl relative z-10 space-y-6 text-[#1E2022]"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-widest text-[#253B80]">Launch Review Session</h3>
                <button onClick={() => setNewSessionProject(null)} className="text-[#1E2022]/40 hover:text-[#1E2022] transition-colors p-1 hover:bg-[#253B80]/5 rounded-lg">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 bg-[#F8F7F4]/80 border border-[#253B80]/5 rounded-xl text-xs space-y-1">
                <span className="text-[9px] font-bold uppercase tracking-wider text-[#1E2022]/40">Target Project</span>
                <p className="font-bold text-[#1E2022] text-sm">{newSessionProject.name}</p>
                <p className="text-[10px] text-[#1E2022]/50 truncate mt-1">{newSessionProject.url || 'No environment configured'}</p>
              </div>

              <form onSubmit={handleCreateSession} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[#1E2022]/60 text-[10px] font-bold uppercase tracking-widest block">Review Session Title</label>
                  <input
                    autoFocus
                    required
                    disabled={isCreatingSession}
                    type="text"
                    placeholder="Review Session - Mobile Responsiveness Review"
                    value={newSessionTitle}
                    onChange={(e) => setNewSessionTitle(e.target.value)}
                    className="w-full bg-[#F8F7F4]/50 border border-[#253B80]/12 rounded-xl px-4 py-3 text-xs text-[#1E2022] placeholder:text-[#1E2022]/30 focus:border-[#253B80] focus:bg-white outline-none transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[#1E2022]/60 text-[10px] font-bold uppercase tracking-widest block">Custom Starting URL (Optional)</label>
                  <div className="relative">
                    <Globe className="w-4 h-4 text-[#253B80]/30 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input
                      disabled={isCreatingSession}
                      type="url"
                      placeholder={newSessionProject.url || "https://example.com/login"}
                      value={newSessionUrl}
                      onChange={(e) => setNewSessionUrl(e.target.value)}
                      className="w-full bg-[#F8F7F4]/50 border border-[#253B80]/12 rounded-xl pl-11 pr-4 py-3 text-xs text-[#1E2022] placeholder:text-[#1E2022]/30 focus:border-[#253B80] focus:bg-white outline-none transition-all"
                    />
                  </div>
                  <span className="text-[9px] text-[#1E2022]/40 block leading-normal pt-1 font-medium">Leave empty to fall back to the default project url.</span>
                </div>

                <div className="flex gap-2.5 justify-end pt-4 border-t border-[#253B80]/5">
                  <button
                    type="button"
                    disabled={isCreatingSession}
                    onClick={() => setNewSessionProject(null)}
                    className="px-5 py-3 rounded-xl border border-[#253B80]/12 bg-white hover:bg-[#F8F7F4] text-xs font-bold text-[#1E2022]/70 transition-all active:scale-95"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingSession || !newSessionTitle.trim()}
                    className="px-6 py-3 rounded-xl bg-[#253B80] hover:bg-[#1B2C60] text-white font-bold text-xs transition-all flex items-center gap-2 active:scale-95 shadow-sm"
                  >
                    {isCreatingSession ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                    {isCreatingSession ? 'Launching...' : 'Launch Review Session'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* SHARE SESSION PANEL */}
        {shareSessionId && (
          <ShareLinkPanel
            sessionId={shareSessionId}
            onClose={() => setShareSessionId(null)}
          />
        )}

      </AnimatePresence>

    </div>
  )
}
