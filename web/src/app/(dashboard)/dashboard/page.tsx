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
  Settings
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
    totalMarkers: 0,
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
  const [sortOrder, setSortOrder] = useState<'recent' | 'markers' | 'name'>('recent')

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

      // Construct detailed projects object mapping local sessions (analytics is loaded inside card)
      const detailed = projectsList.map((p: any) => {
        const pSessions = sessionsByProject[p.id] || []
        
        return {
          ...p,
          sessions: pSessions,
          markers: [], // Analytics and markers are lazy loaded inside each ProjectCard to save load
          analytics: null // Pass null so card fetches its own analytics endpoint
        }
      })

      setProjectsData(detailed)

      // Calculate stats values using the lightweight backend summary (Task 8 & 9)
      setStatsData({
        totalProjects: summary.total_projects,
        totalSessions: summary.total_sessions,
        totalMarkers: summary.total_markers,
        openIssues: summary.open_issues
      })

      // Aggregate recent activities using sessions (no heavy markers fetch needed)
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
        } else if (sortOrder === 'markers') {
          return b.markers.length - a.markers.length
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
      transition: { staggerChildren: 0.06 }
    }
  }

  const staggerItem = {
    hidden: { opacity: 0, y: 16 },
    show: { 
      opacity: 1, 
      y: 0, 
      transition: { type: 'spring' as const, stiffness: 120, damping: 18 } 
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white p-6 md:p-10 font-sans selection:bg-purple-500/30 overflow-x-hidden relative">
      
      {/* Background Tech Dot Grid */}
      <div 
        className="absolute inset-0 z-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: 'radial-gradient(circle, #312e81 1px, transparent 1px)',
          backgroundSize: '24px 24px'
        }}
      />

      <div className="max-w-7xl mx-auto space-y-8 relative z-10">
        
        {/* ================= ZONE 1: TOP BAR ================= */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-b border-white/[0.03] pb-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-black tracking-tight text-white leading-tight">
              Welcome back, <span className="text-purple-400">{user?.name || 'Pro Reviewer'}</span>
            </h1>
            <p className="text-white/40 text-xs font-medium">Visual feedback and review platform</p>
          </div>
          
          <div className="flex items-center gap-3">
            <Link
              href="/settings"
              className="rounded-xl h-11 bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 text-white/70 hover:text-white font-bold text-xs px-4 transition-all flex items-center gap-2 active:scale-95 flex-shrink-0"
            >
              <Settings className="w-4 h-4 text-white/50" />
              Settings
            </Link>
            <button
              onClick={() => setShowCreateProject(true)}
              className="rounded-xl h-11 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs px-6 shadow-lg shadow-purple-950/40 hover:shadow-purple-500/20 transition-all flex items-center gap-2 active:scale-95 flex-shrink-0"
            >
              <Plus className="w-4 h-4" />
              New Project
            </button>
          </div>
        </div>

        {/* ================= STATS STRIP ================= */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Active Projects', val: statsData.totalProjects, icon: Folder, color: 'text-indigo-400', bg: 'from-indigo-500/5 to-indigo-500/0' },
            { label: 'Review Sessions', val: statsData.totalSessions, icon: Play, color: 'text-emerald-400', bg: 'from-emerald-500/5 to-emerald-500/0' },
            { label: 'Feedback Pins', val: statsData.totalMarkers, icon: FileText, color: 'text-purple-400', bg: 'from-purple-500/5 to-purple-500/0' },
            { label: 'Waiting Issues', val: statsData.openIssues, icon: AlertCircle, color: 'text-rose-500', bg: 'from-rose-500/5 to-rose-500/0' }
          ].map((stat, i) => (
            <div 
              key={i} 
              className={`p-4 md:p-5 rounded-2xl bg-[#0c0c0e]/80 border border-white/5 bg-gradient-to-br ${stat.bg} flex items-center justify-between shadow-xl`}
            >
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-white/20">{stat.label}</span>
                {isLoading ? (
                  <div className="h-8 w-12 bg-white/5 animate-pulse rounded-lg mt-1" />
                ) : error ? (
                  <p className="text-xs text-rose-500 font-semibold mt-1">Error</p>
                ) : (
                  <p className="text-2xl md:text-3xl font-mono font-black tracking-tight text-white">
                    {stat.val}
                  </p>
                )}
              </div>
              <div className={`p-3 rounded-xl bg-white/[0.02] border border-white/5 ${stat.color}`}>
                <stat.icon className="w-5 h-5" />
              </div>
            </div>
          ))}
        </div>

        {/* ================= MAIN LAYOUT BODY ================= */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* ================= LEFT MAIN AREA (Projects) ================= */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* Search & Filter Header */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-[#0c0c0e]/60 border border-white/5 rounded-2xl p-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-white/20 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter environments or names..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/[0.02] border border-white/5 rounded-xl pl-11 pr-4 py-2.5 text-xs text-white placeholder:text-white/20 focus:border-purple-500 focus:bg-white/[0.04] outline-none transition-all"
                />
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center bg-white/[0.02] border border-white/5 rounded-xl px-2 py-1">
                  <Filter className="w-3.5 h-3.5 text-white/20 mr-1.5" />
                  <select
                    value={dateFilter}
                    onChange={(e: any) => setDateFilter(e.target.value)}
                    className="bg-transparent text-[11px] font-bold text-white/60 focus:text-white outline-none cursor-pointer pr-1"
                  >
                    <option value="all" className="bg-[#0c0c0e]">All Active</option>
                    <option value="24h" className="bg-[#0c0c0e]">Last 24 Hours</option>
                    <option value="7d" className="bg-[#0c0c0e]">Last 7 Days</option>
                    <option value="30d" className="bg-[#0c0c0e]">Last 30 Days</option>
                  </select>
                </div>

                <div className="flex items-center bg-white/[0.02] border border-white/5 rounded-xl px-2 py-1">
                  <select
                    value={sortOrder}
                    onChange={(e: any) => setSortOrder(e.target.value)}
                    className="bg-transparent text-[11px] font-bold text-white/60 focus:text-white outline-none cursor-pointer pr-1"
                  >
                    <option value="recent" className="bg-[#0c0c0e]">Sort: Recent</option>
                    <option value="markers" className="bg-[#0c0c0e]">Sort: Feedback Pins</option>
                    <option value="name" className="bg-[#0c0c0e]">Sort: Name</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Grid display with loading skeletons */}
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[1, 2, 3, 4].map((n) => (
                  <div key={n} className="h-44 bg-[#0c0c0e]/80 border border-white/5 rounded-2xl animate-pulse p-5 space-y-4">
                    <div className="h-6 w-32 bg-white/5 rounded" />
                    <div className="h-4 w-48 bg-white/5 rounded" />
                    <div className="h-10 w-full bg-white/5 rounded mt-4" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-8 rounded-2xl text-center space-y-4 shadow-lg">
                <p className="text-xs font-mono">Failed to load projects: {error}</p>
                <button 
                  onClick={fetchDashboardData}
                  className="px-5 py-2 bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white text-xs font-bold uppercase rounded-xl transition-all"
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
                      markersCount={p.markers.length}
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
                    />
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              /* Empty state */
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="border border-dashed border-white/10 bg-[#0c0c0e]/30 rounded-3xl p-16 flex flex-col items-center justify-center text-center gap-6 hover:border-purple-500/20 hover:bg-purple-500/[0.01] transition-all cursor-pointer group"
                onClick={() => setShowCreateProject(true)}
              >
                <div className="w-16 h-16 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-center group-hover:scale-105 group-hover:border-purple-500/30 group-hover:shadow-[0_0_20px_rgba(139,92,246,0.15)] transition-all">
                  <Plus className="w-8 h-8 text-white/30 group-hover:text-purple-400 transition-colors" />
                </div>
                <div className="space-y-2 max-w-sm">
                  <h3 className="text-xl font-black tracking-tight text-white">No projects yet</h3>
                  <p className="text-xs text-white/40 leading-relaxed uppercase tracking-wider font-bold">
                    Create your first review project to start.
                  </p>
                </div>
                <button className="h-10 rounded-xl bg-purple-600/10 border border-purple-500/20 hover:bg-purple-600 hover:border-purple-500 text-purple-300 hover:text-white px-6 font-bold text-xs transition-all flex items-center gap-2">
                  Create First Project
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            )}

          </div>

          {/* ================= RIGHT SIDE PANEL (Recent Activity) ================= */}
          <div className="space-y-6">
            
            {/* Recent Activity Panel */}
            <div className="bg-[#0c0c0e]/80 border border-white/5 rounded-2xl p-5 shadow-xl space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-white/30 flex items-center gap-2">
                <Compass className="w-4 h-4 text-purple-400" />
                Recent Activity
              </h3>
              
              {isLoading ? (
                <div className="space-y-4 py-4 animate-pulse">
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="space-y-2">
                      <div className="h-3 w-16 bg-white/5 rounded" />
                      <div className="h-3 w-40 bg-white/5 rounded" />
                    </div>
                  ))}
                </div>
              ) : recentActivityData.length > 0 ? (
                <div className="space-y-3.5">
                  {recentActivityData.map((activity) => (
                    <div key={activity.id} className="space-y-1 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[9px] text-purple-400 font-bold uppercase truncate max-w-[120px]">
                          {activity.projectName}
                        </span>
                        <span className="text-[9px] text-white/20 font-bold">
                          {formatRelativeTime(activity.date)}
                        </span>
                      </div>
                      <p className="text-white/60 text-xs truncate leading-snug">
                        {activity.description}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] uppercase font-bold tracking-wider text-white/10 py-6 text-center">
                  No activity yet.
                </p>
              )}
            </div>

          </div>

        </div>

      </div>

      {/* ================= MODALS OVERLAYS ================= */}
      <AnimatePresence>
        
        {/* NEW PROJECT MODAL */}
        {showCreateProject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreateProject(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-md"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-[#0c0c0e] border border-white/10 rounded-3xl p-6 md:p-8 w-full max-w-lg shadow-2xl relative z-10 space-y-6"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black uppercase tracking-widest text-purple-400">New Review Project</h3>
                <button onClick={() => setShowCreateProject(false)} className="text-white/40 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateProject} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-white/30 text-[9px] font-black uppercase tracking-widest block">Project Name</label>
                  <input
                    autoFocus
                    required
                    disabled={isCreatingProject}
                    type="text"
                    placeholder="Acme Workspace / Landing Portal"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    className="w-full bg-white/[0.02] border border-white/5 rounded-xl px-4 py-3 text-xs text-white placeholder:text-white/20 focus:border-purple-500 outline-none transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-white/30 text-[9px] font-black uppercase tracking-widest block">Target Environment URL</label>
                  <div className="relative">
                    <Globe className="w-4 h-4 text-white/20 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input
                      disabled={isCreatingProject}
                      type="url"
                      placeholder="https://staging.acme.com"
                      value={newProjectUrl}
                      onChange={(e) => setNewProjectUrl(e.target.value)}
                      className="w-full bg-white/[0.02] border border-white/5 rounded-xl pl-11 pr-4 py-3 text-xs text-white placeholder:text-white/20 focus:border-purple-500 outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="flex gap-2.5 justify-end pt-4">
                  <button
                    type="button"
                    disabled={isCreatingProject}
                    onClick={() => setShowCreateProject(false)}
                    className="px-5 py-3 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] text-xs font-bold transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingProject || !newProjectName.trim()}
                    className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs shadow-lg shadow-purple-900/20 transition-all flex items-center gap-2"
                  >
                    {isCreatingProject ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
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
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setNewSessionProject(null)}
              className="absolute inset-0 bg-black/70 backdrop-blur-md"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-[#0c0c0e] border border-white/10 rounded-3xl p-6 md:p-8 w-full max-w-lg shadow-2xl relative z-10 space-y-6"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black uppercase tracking-widest text-emerald-400">Launch Review Session</h3>
                <button onClick={() => setNewSessionProject(null)} className="text-white/40 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl text-xs space-y-1">
                <span className="text-[9px] font-black uppercase tracking-wider text-white/20">Target Project</span>
                <p className="font-bold text-white text-sm">{newSessionProject.name}</p>
                <p className="text-[10px] text-white/40 truncate mt-1">{newSessionProject.url || 'No environment configured'}</p>
              </div>

              <form onSubmit={handleCreateSession} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-white/30 text-[9px] font-black uppercase tracking-widest block">Review Session Title</label>
                  <input
                    autoFocus
                    required
                    disabled={isCreatingSession}
                    type="text"
                    placeholder="Review Session - Mobile Responsiveness Review"
                    value={newSessionTitle}
                    onChange={(e) => setNewSessionTitle(e.target.value)}
                    className="w-full bg-white/[0.02] border border-white/5 rounded-xl px-4 py-3 text-xs text-white placeholder:text-white/20 focus:border-emerald-500 outline-none transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-white/30 text-[9px] font-black uppercase tracking-widest block">Custom Starting URL (Optional)</label>
                  <div className="relative">
                    <Globe className="w-4 h-4 text-white/20 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input
                      disabled={isCreatingSession}
                      type="url"
                      placeholder={newSessionProject.url || "https://example.com/login"}
                      value={newSessionUrl}
                      onChange={(e) => setNewSessionUrl(e.target.value)}
                      className="w-full bg-white/[0.02] border border-white/5 rounded-xl pl-11 pr-4 py-3 text-xs text-white placeholder:text-white/20 focus:border-emerald-500 outline-none transition-all"
                    />
                  </div>
                  <span className="text-[9px] text-white/20 block leading-normal pt-1 font-medium">Leave empty to fall back to the default project url.</span>
                </div>

                <div className="flex gap-2.5 justify-end pt-4">
                  <button
                    type="button"
                    disabled={isCreatingSession}
                    onClick={() => setNewSessionProject(null)}
                    className="px-5 py-3 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] text-xs font-bold transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingSession || !newSessionTitle.trim()}
                    className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-lg shadow-emerald-900/20 transition-all flex items-center gap-2"
                  >
                    {isCreatingSession ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
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
