'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { ShareLinkPanel } from '@/components/share/ShareLinkPanel'
import { ProjectCard } from '@/components/ProjectCard'
import { event as trackEvent } from '@/lib/analytics'
import { 
  Plus, 
  Folder, 
  Play, 
  FileText, 
  AlertCircle, 
  Search, 
  Filter, 
  BookOpen, 
  Download, 
  HelpCircle, 
  Loader2, 
  Globe,
  Settings,
  X,
  Compass,
  ArrowRight
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

  // Load all projects with nested session and marker telemetry
  const fetchDashboardData = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const projList = await api.projects.list()
      const detailed = await Promise.all(
        (projList || []).map(async (p) => {
          try {
            const [sessions, markers, analytics] = await Promise.all([
              api.sessions.getSessions(p.id),
              api.comments.list(p.id),
              api.projects.getAnalytics(p.id)
            ])
            return {
              ...p,
              sessions: sessions || [],
              markers: markers || [],
              analytics: analytics || null
            }
          } catch (err) {
            console.error(`Failed to load telemetry for project ${p.id}:`, err)
            return {
              ...p,
              sessions: [],
              markers: [],
              analytics: null
            }
          }
        })
      )
      setProjectsData(detailed)
    } catch (err: any) {
      setError(err.message || 'Failed to fetch dashboard telemetry.')
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
      const res = await api.projects.create({
        name: newProjectName.trim(),
        url: newProjectUrl.trim(),
      })
      trackEvent({ action: 'create_project', category: 'project' })
      // Refetch everything to keep state consistent and load initial metrics
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

      // If user provided a custom target URL, record a visit to pre-seed the viewport
      if (newSessionUrl.trim()) {
        try {
          await api.sessions.recordVisit(session.id, newSessionUrl.trim(), 'Initial Review Viewport')
        } catch (visitErr) {
          console.error("Failed to seed session page visit:", visitErr)
        }
      }

      setNewSessionProject(null)
      // Redirect to the newly active project workspace (which will fetch this most recent session)
      router.push(`/project/${newSessionProject.id}`)
    } catch (err: any) {
      alert(err.message || 'Failed to initialize session')
    } finally {
      setIsCreatingSession(false)
    }
  }

  // Calculate global telemetry counts
  const stats = React.useMemo(() => {
    const totalProjects = projectsData.length
    const totalSessions = projectsData.reduce((acc, p) => acc + p.sessions.length, 0)
    const totalMarkers = projectsData.reduce((acc, p) => acc + p.markers.length, 0)
    const openIssues = projectsData.reduce((acc, p) => acc + (p.analytics?.open || 0), 0)
    return { totalProjects, totalSessions, totalMarkers, openIssues }
  }, [projectsData])

  // Aggregate recent activity across all projects
  const recentActivity = React.useMemo(() => {
    const activities: any[] = []
    projectsData.forEach((p) => {
      p.sessions.forEach((s: any) => {
        activities.push({
          id: `session-${s.id}`,
          type: 'session',
          projectId: p.id,
          projectName: p.name,
          title: s.title,
          date: s.created_at,
          description: `Review session initiated: "${s.title}"`
        })
      })
      p.markers.forEach((m: any) => {
        activities.push({
          id: `marker-${m.id}`,
          type: 'marker',
          projectId: p.id,
          projectName: p.name,
          title: m.text,
          date: m.created_at,
          description: `Feedback logged: "${m.text || 'Untitled'}" (${m.severity || 'Medium'})`
        })
      })
    })
    return activities
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5)
  }, [projectsData])

  // Filter & Sort Projects client-side
  const filteredProjects = React.useMemo(() => {
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
      
      {/* Background Subtle Tech Dot Grid */}
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
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black tracking-tight text-white leading-tight">
                Welcome back, <span className="text-purple-400">{user?.name || 'Pro Reviewer'}</span>
              </h1>
              <div className="flex items-center gap-1.5 py-1 px-2.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-[9px] font-black uppercase text-cyan-400 tracking-wider">
                <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse" />
                Live Substrate
              </div>
            </div>
            <p className="text-white/40 text-xs font-medium">Command surface for visual feedback, reviews, and client reports.</p>
          </div>
          
          <button
            onClick={() => setShowCreateProject(true)}
            className="rounded-xl h-11 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs px-6 shadow-lg shadow-purple-950/40 hover:shadow-purple-500/20 transition-all flex items-center gap-2 active:scale-95 flex-shrink-0"
          >
            <Plus className="w-4 h-4" />
            New Project
          </button>
        </div>

        {/* ================= STATS STRIP ================= */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Active Projects', val: stats.totalProjects, icon: Folder, color: 'text-indigo-400', bg: 'from-indigo-500/5 to-indigo-500/0' },
            { label: 'Review Sessions', val: stats.totalSessions, icon: Play, color: 'text-emerald-400', bg: 'from-emerald-500/5 to-emerald-500/0' },
            { label: 'Feedback Pins', val: stats.totalMarkers, icon: FileText, color: 'text-purple-400', bg: 'from-purple-500/5 to-purple-500/0' },
            { label: 'Waiting Issues', val: stats.openIssues, icon: AlertCircle, color: 'text-rose-500', bg: 'from-rose-500/5 to-rose-500/0' }
          ].map((stat, i) => (
            <div 
              key={i} 
              className={`p-4 md:p-5 rounded-2xl bg-[#0c0c0e]/80 border border-white/5 bg-gradient-to-br ${stat.bg} flex items-center justify-between shadow-xl`}
            >
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-white/20">{stat.label}</span>
                <p className="text-2xl md:text-3xl font-mono font-black tracking-tight text-white">
                  {stat.val.toString().padStart(2, '0')}
                </p>
              </div>
              <div className={`p-3 rounded-xl bg-white/[0.02] border border-white/5 ${stat.color}`}>
                <stat.icon className="w-5 h-5" />
              </div>
            </div>
          ))}
        </div>

        {/* ================= THREE-ZONE LAYOUT BODY ================= */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* ================= ZONE 2: MAIN AREA ================= */}
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

            {/* Grid display with staggered animations */}
            {isLoading ? (
              <div className="py-24 flex flex-col items-center justify-center space-y-4 opacity-50">
                <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                <p className="text-[10px] font-mono tracking-widest text-white/40 uppercase">Syncing telemetry data...</p>
              </div>
            ) : error ? (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-6 rounded-2xl text-center text-xs font-mono leading-relaxed shadow-lg">
                {error}
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
                      onClick={() => router.push(`/project/${p.id}`)}
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
              /* Onboarding Invitation Empty State */
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
                  <h3 className="text-xl font-black tracking-tight text-white">Begin Reviewing</h3>
                  <p className="text-xs text-white/40 leading-relaxed uppercase tracking-wider font-bold">
                    You have no active projects configured. Create your first visual review project to start recording review sessions and commenting on the live canvas.
                  </p>
                </div>
                <button className="h-10 rounded-xl bg-purple-600/10 border border-purple-500/20 hover:bg-purple-600 hover:border-purple-500 text-purple-300 hover:text-white px-6 font-bold text-xs transition-all flex items-center gap-2">
                  Create First Project
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            )}

          </div>

          {/* ================= ZONE 3: SIDE STRIP ================= */}
          <div className="space-y-6">
            
            {/* Recent Activity Panel */}
            <div className="bg-[#0c0c0e]/80 border border-white/5 rounded-2xl p-5 shadow-xl space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-white/30 flex items-center gap-2">
                <Compass className="w-4 h-4 text-purple-400" />
                Recent Activity
              </h3>
              
              {recentActivity.length > 0 ? (
                <div className="space-y-3.5">
                  {recentActivity.map((activity) => (
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
                  No recent activity recorded
                </p>
              )}
            </div>

            {/* Quick Links Panel */}
            <div className="bg-[#0c0c0e]/80 border border-white/5 rounded-2xl p-5 shadow-xl space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-white/30 flex items-center gap-2">
                <Settings className="w-4 h-4 text-cyan-400" />
                Auditor Shortcuts
              </h3>
              
              <div className="flex flex-col gap-2">
                <a 
                  href="#" 
                  className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] hover:border-purple-500/20 text-xs text-white/70 hover:text-white transition-all group/link"
                >
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-purple-400" />
                    <span className="font-medium">Developer API Docs</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover/link:opacity-100 transition-opacity transform translate-x-1 group-hover/link:translate-x-0" />
                </a>

                <a 
                  href="#" 
                  className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] hover:border-cyan-500/20 text-xs text-white/70 hover:text-white transition-all group/link"
                >
                  <div className="flex items-center gap-2">
                    <Download className="w-4 h-4 text-cyan-400" />
                    <span className="font-medium">Chrome Extension</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover/link:opacity-100 transition-opacity transform translate-x-1 group-hover/link:translate-x-0" />
                </a>

                <a 
                  href="#" 
                  className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] hover:border-white/10 text-xs text-white/70 hover:text-white transition-all group/link"
                >
                  <div className="flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-white/40" />
                    <span className="font-medium">Diagnostic Support</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover/link:opacity-100 transition-opacity transform translate-x-1 group-hover/link:translate-x-0" />
                </a>
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* ================= MODALS OVERLAYS (AnimatePresence) ================= */}
      <AnimatePresence>
        
        {/* NEW PROJECT MODAL */}
        {showCreateProject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreateProject(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-md"
            />
            
            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-[#0c0c0e] border border-white/10 rounded-3xl p-6 md:p-8 w-full max-w-lg shadow-2xl relative z-10 space-y-6"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black uppercase tracking-widest text-purple-400">Initialize Observation Substrate</h3>
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
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setNewSessionProject(null)}
              className="absolute inset-0 bg-black/70 backdrop-blur-md"
            />
            
            {/* Modal Body */}
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
