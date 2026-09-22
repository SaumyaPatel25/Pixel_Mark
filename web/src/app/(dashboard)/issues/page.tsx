'use client'

import React, { useEffect, useState, useMemo, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { StageLoader } from '@/components/ui/StageLoader'
import { api } from '@/lib/api'
import { useProjectStore } from '@/store/projectStore'
import { useUIStore } from '@/store/uiStore'
import { cn } from '@/lib/utils'
import { 
  AlertCircle, 
  CheckCircle2, 
  ExternalLink, 
  Filter, 
  Search, 
  RefreshCw, 
  Folder, 
  Play, 
  Clock, 
  ShieldAlert, 
  Tag, 
  Check, 
  Undo2, 
  ChevronRight, 
  Globe, 
  Code2, 
  Layers, 
  Sparkles, 
  Inbox,
  User,
  Trash2,
  AlertTriangle
} from 'lucide-react'

interface IssueMarker {
  id: string
  project_id: string
  session_id: string
  page_visit_id?: string
  creator_id?: string
  creator_name?: string
  creator_role?: string
  color_token?: string
  anchor_kind?: string
  anchor_mode?: string
  page_url?: string
  page_title?: string
  target_selector?: string
  target_xpath?: string
  dom_text_excerpt?: string
  title?: string
  description?: string
  status: 'open' | 'resolved' | 'in_progress' | 'triaged' | string
  priority: 'critical' | 'high' | 'medium' | 'low' | string
  created_at: string
  updated_at?: string
  version?: number
  marker_number?: number
  screenshot_url?: string
  project_name?: string
  [key: string]: any
}

function formatRelativeTime(dateString: string | Date | null) {
  if (!dateString) return null
  const date = new Date(dateString)
  const diffMs = Date.now() - date.getTime()
  const diffMin = Math.round(diffMs / 60000)
  const diffHr = Math.round(diffMs / 3600000)
  const diffDays = Math.round(diffMs / 86400000)

  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function IssuesContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialStatus = searchParams.get('status') || 'all'
  const initialProjectId = searchParams.get('project') || 'all'

  const { projects, fetchProjects } = useProjectStore()
  const [issues, setIssues] = useState<IssueMarker[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)

  // Filters state
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>(initialStatus)
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [projectFilter, setProjectFilter] = useState<string>(initialProjectId)
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'priority'>('newest')

  // Load issues from backend
  const loadIssues = async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true)
    else setIsLoading(true)
    setError(null)

    try {
      if (projects.length === 0) {
        await fetchProjects()
      }
      const data: any = await api.getAllMarkers()
      const rawMarkers: IssueMarker[] = Array.isArray(data) ? data : []
      setIssues(rawMarkers)
    } catch (err: any) {
      console.error('[IssuesPage] Failed to fetch markers:', err)
      setError(err.message || 'Failed to load issues from server')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    loadIssues()
  }, [])

  // Sync project names
  const enrichedIssues = useMemo(() => {
    return issues.map(issue => {
      const matchedProject = projects.find(p => p.id === issue.project_id)
      return {
        ...issue,
        project_name: matchedProject?.name || issue.project_name || 'Project'
      }
    })
  }, [issues, projects])

  // Filtered and sorted issues
  const filteredIssues = useMemo(() => {
    return enrichedIssues.filter(issue => {
      // Status filter
      if (statusFilter === 'open' && issue.status === 'resolved') return false
      if (statusFilter === 'resolved' && issue.status !== 'resolved') return false

      // Priority filter
      if (priorityFilter !== 'all' && issue.priority?.toLowerCase() !== priorityFilter.toLowerCase()) {
        return false
      }

      // Project filter
      if (projectFilter !== 'all' && issue.project_id !== projectFilter) {
        return false
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        const titleMatch = (issue.title || '').toLowerCase().includes(query)
        const descMatch = (issue.description || '').toLowerCase().includes(query)
        const urlMatch = (issue.page_url || '').toLowerCase().includes(query)
        const creatorMatch = (issue.creator_name || '').toLowerCase().includes(query)
        const selectorMatch = (issue.target_selector || '').toLowerCase().includes(query)
        const numMatch = issue.marker_number ? `#${issue.marker_number}`.includes(query) : false
        return titleMatch || descMatch || urlMatch || creatorMatch || selectorMatch || numMatch
      }

      return true
    }).sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
      if (sortBy === 'oldest') {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      }
      if (sortBy === 'priority') {
        const priorityWeight: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 }
        const pA = priorityWeight[a.priority?.toLowerCase()] || 0
        const pB = priorityWeight[b.priority?.toLowerCase()] || 0
        return pB - pA
      }
      return 0
    })
  }, [enrichedIssues, statusFilter, priorityFilter, projectFilter, searchQuery, sortBy])

  // KPI Metrics
  const stats = useMemo(() => {
    const total = enrichedIssues.length
    const open = enrichedIssues.filter(i => i.status !== 'resolved').length
    const resolved = enrichedIssues.filter(i => i.status === 'resolved').length
    const critical = enrichedIssues.filter(i => i.priority?.toLowerCase() === 'critical').length
    const high = enrichedIssues.filter(i => i.priority?.toLowerCase() === 'high').length
    return { total, open, resolved, critical, high }
  }, [enrichedIssues])

  // Toggle issue fixed/open status
  const handleToggleStatus = async (issue: IssueMarker) => {
    const newStatus = issue.status === 'resolved' ? 'open' : 'resolved'
    setActionLoadingId(issue.id)

    // Optimistic UI update
    setIssues(prev => prev.map(item => item.id === issue.id ? { ...item, status: newStatus } : item))

    try {
      await api.markers.update(issue.id, { status: newStatus })
      useUIStore.getState().addToast(
        newStatus === 'resolved' ? 'Issue marked as fixed!' : 'Issue reopened.',
        'success'
      )
    } catch (err: any) {
      console.error('[IssuesPage] Failed to update status:', err)
      // Rollback on error
      setIssues(prev => prev.map(item => item.id === issue.id ? { ...item, status: issue.status } : item))
      useUIStore.getState().addToast(err.message || 'Failed to update issue status', 'error')
    } finally {
      setActionLoadingId(null)
    }
  }

  // Delete issue
  const handleDeleteIssue = async (issueId: string) => {
    if (!confirm('Are you sure you want to permanently delete this issue pin?')) return
    setActionLoadingId(issueId)
    try {
      await api.markers.delete(issueId)
      setIssues(prev => prev.filter(i => i.id !== issueId))
      useUIStore.getState().addToast('Issue pin deleted successfully.', 'info')
    } catch (err: any) {
      console.error('[IssuesPage] Delete error:', err)
      useUIStore.getState().addToast(err.message || 'Failed to delete issue', 'error')
    } finally {
      setActionLoadingId(null)
    }
  }

  return (
    <div className="flex-1 min-h-screen bg-pm-bg text-pm-text overflow-y-auto font-sans p-6 md:p-10 space-y-8 max-w-7xl mx-auto">
      
      {/* ================= HEADER ================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-pm-border pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
              <AlertCircle className="w-5 h-5" />
            </div>
            <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-pm-text">
              Issue Tracker
            </h1>
          </div>
          <p className="text-xs text-pm-muted font-medium">
            Inspect, filter, resolve, and navigate to all feedback pins and bug observations across your projects.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadIssues(true)}
            disabled={isLoading || isRefreshing}
            className="px-4 py-2.5 rounded-xl bg-pm-surface border border-pm-border hover:bg-pm-surface-2 text-pm-text text-xs font-bold transition-all flex items-center gap-2 active:scale-95 shadow-sm cursor-pointer disabled:opacity-50"
            title="Refresh issues list"
          >
            <RefreshCw className={cn("w-3.5 h-3.5 text-pm-muted", isRefreshing && "animate-spin text-pm-accent")} />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* ================= KPI STATS CARDS ================= */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: 'Total Issues',
            value: stats.total,
            icon: Tag,
            color: 'text-pm-text bg-pm-surface-2 border-pm-border',
            onClick: () => setStatusFilter('all')
          },
          {
            label: 'Waiting / Open',
            value: stats.open,
            icon: AlertCircle,
            color: stats.open > 0 ? 'text-rose-500 bg-rose-500/10 border-rose-500/20' : 'text-pm-muted bg-pm-surface-2 border-pm-border',
            onClick: () => setStatusFilter('open')
          },
          {
            label: 'Fixed / Resolved',
            value: stats.resolved,
            icon: CheckCircle2,
            color: stats.resolved > 0 ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' : 'text-pm-muted bg-pm-surface-2 border-pm-border',
            onClick: () => setStatusFilter('resolved')
          },
          {
            label: 'Critical & High',
            value: stats.critical + stats.high,
            icon: ShieldAlert,
            color: (stats.critical + stats.high) > 0 ? 'text-amber-500 bg-amber-500/10 border-amber-500/20' : 'text-pm-muted bg-pm-surface-2 border-pm-border',
            onClick: () => { setPriorityFilter('critical'); setStatusFilter('open') }
          }
        ].map((stat, i) => (
          <div
            key={i}
            onClick={stat.onClick}
            className="p-5 rounded-2xl bg-pm-surface border border-pm-border flex items-center justify-between shadow-sm transition-all duration-300 cursor-pointer hover:border-pm-accent/40 hover:bg-pm-surface-2 hover:scale-[1.01] active:scale-[0.99] group"
          >
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-pm-muted block group-hover:text-pm-text transition-colors">
                {stat.label}
              </span>
              {isLoading ? (
                <div className="h-7 w-12 bg-pm-surface-2 animate-pulse rounded-lg mt-1" />
              ) : (
                <p className="text-2xl md:text-3xl font-mono font-extrabold tracking-tight text-pm-text">
                  {stat.value}
                </p>
              )}
            </div>
            <div className={`p-3 rounded-xl border ${stat.color} group-hover:scale-105 transition-transform`}>
              <stat.icon className="w-5 h-5" />
            </div>
          </div>
        ))}
      </div>

      {/* ================= FILTER & CONTROL BAR ================= */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-pm-surface border border-pm-border rounded-2xl p-4 shadow-sm">
        
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-pm-muted absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search issues by title, description, URL, selector, author..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-pm-bg border border-pm-border rounded-xl pl-11 pr-4 py-2.5 text-xs text-pm-text placeholder:text-pm-muted focus:border-pm-accent focus:bg-pm-surface outline-none transition-all shadow-inner"
          />
        </div>

        {/* Filter Dropdowns & Pills */}
        <div className="flex flex-wrap items-center gap-2.5">
          
          {/* Status Tabs */}
          <div className="flex items-center bg-pm-bg border border-pm-border rounded-xl p-1 text-[11px] font-bold">
            <button
              onClick={() => setStatusFilter('all')}
              className={cn(
                "px-3 py-1.5 rounded-lg transition-all cursor-pointer",
                statusFilter === 'all' ? "bg-pm-surface text-pm-text shadow-sm" : "text-pm-muted hover:text-pm-text"
              )}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter('open')}
              className={cn(
                "px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5",
                statusFilter === 'open' ? "bg-rose-500/15 text-rose-400 font-extrabold shadow-sm" : "text-pm-muted hover:text-pm-text"
              )}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              Waiting ({stats.open})
            </button>
            <button
              onClick={() => setStatusFilter('resolved')}
              className={cn(
                "px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5",
                statusFilter === 'resolved' ? "bg-emerald-500/15 text-emerald-400 font-extrabold shadow-sm" : "text-pm-muted hover:text-pm-text"
              )}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Fixed ({stats.resolved})
            </button>
          </div>

          {/* Priority Select */}
          <div className="flex items-center bg-pm-bg border border-pm-border rounded-xl px-3 py-2">
            <Filter className="w-3.5 h-3.5 text-pm-muted mr-2" />
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-transparent text-[11px] font-bold text-pm-muted focus:text-pm-text outline-none cursor-pointer pr-1"
            >
              <option value="all">All Priorities</option>
              <option value="critical">Critical (P0)</option>
              <option value="high">High (P1)</option>
              <option value="medium">Medium (P2)</option>
              <option value="low">Low (P3)</option>
            </select>
          </div>

          {/* Project Select */}
          {projects.length > 0 && (
            <div className="flex items-center bg-pm-bg border border-pm-border rounded-xl px-3 py-2">
              <Folder className="w-3.5 h-3.5 text-pm-muted mr-2" />
              <select
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
                className="bg-transparent text-[11px] font-bold text-pm-muted focus:text-pm-text outline-none cursor-pointer pr-1 max-w-[140px] truncate"
              >
                <option value="all">All Projects</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Sort Select */}
          <div className="flex items-center bg-pm-bg border border-pm-border rounded-xl px-3 py-2">
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="bg-transparent text-[11px] font-bold text-pm-muted focus:text-pm-text outline-none cursor-pointer pr-1"
            >
              <option value="newest">Sort: Newest</option>
              <option value="oldest">Sort: Oldest</option>
              <option value="priority">Sort: Severity</option>
            </select>
          </div>
        </div>
      </div>

      {/* ================= ISSUES LIST ================= */}
      {isLoading ? (
        /* Loading Skeletons */
        <div className="space-y-4">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="p-6 rounded-2xl bg-pm-surface border border-pm-border animate-pulse space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="h-5 w-48 bg-pm-surface-2 rounded-lg" />
                <div className="h-6 w-24 bg-pm-surface-2 rounded-full" />
              </div>
              <div className="h-4 w-3/4 bg-pm-surface-2 rounded" />
              <div className="flex items-center gap-4 pt-2">
                <div className="h-4 w-28 bg-pm-surface-2 rounded" />
                <div className="h-4 w-36 bg-pm-surface-2 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        /* Error State */
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 p-8 rounded-3xl text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-rose-500/20 flex items-center justify-center mx-auto text-rose-500">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-sm font-bold text-rose-500">Failed to load issues</h2>
            <p className="text-xs text-pm-muted">{error}</p>
          </div>
          <button 
            onClick={() => loadIssues(true)}
            className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-all inline-flex items-center gap-1.5 active:scale-95 shadow-sm cursor-pointer"
          >
            Retry Fetch
          </button>
        </div>
      ) : filteredIssues.length > 0 ? (
        /* Issue Cards Grid */
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >
          {filteredIssues.map((issue) => {
            const isResolved = issue.status === 'resolved'
            const priorityLower = (issue.priority || 'medium').toLowerCase()
            
            const priorityBadges: Record<string, { label: string; style: string }> = {
              critical: { label: 'P0 • Critical', style: 'bg-rose-500/15 text-rose-400 border-rose-500/30' },
              high: { label: 'P1 • High', style: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
              medium: { label: 'P2 • Medium', style: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30' },
              low: { label: 'P3 • Low', style: 'bg-slate-500/15 text-slate-400 border-slate-500/30' },
            }
            const pBadge = priorityBadges[priorityLower] || priorityBadges.medium

            const directCanvasUrl = `/project/${issue.project_id}?session=${issue.session_id}&marker=${issue.id}`

            return (
              <motion.div
                key={issue.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={cn(
                  "p-5 md:p-6 rounded-2xl bg-pm-surface border transition-all duration-300 shadow-sm relative overflow-hidden group",
                  isResolved 
                    ? "border-pm-border opacity-70 hover:opacity-100 bg-pm-surface/60" 
                    : "border-pm-border hover:border-pm-border-bright hover:bg-pm-surface-2"
                )}
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  
                  {/* Left Main Content */}
                  <div className="space-y-3 flex-1 min-w-0">
                    
                    {/* Header Badges Strip */}
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Issue Number */}
                      <span className="px-2.5 py-1 rounded-md bg-pm-bg border border-pm-border text-[10px] font-mono font-bold text-pm-muted">
                        #{issue.marker_number || issue.id.slice(0, 6)}
                      </span>

                      {/* Status Badge */}
                      <span className={cn(
                        "px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border flex items-center gap-1.5",
                        isResolved 
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                          : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                      )}>
                        <span className={cn("w-1.5 h-1.5 rounded-full", isResolved ? "bg-emerald-400" : "bg-rose-400")} />
                        {isResolved ? 'Fixed' : 'Waiting'}
                      </span>

                      {/* Priority Badge */}
                      <span className={cn(
                        "px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border",
                        pBadge.style
                      )}>
                        {pBadge.label}
                      </span>

                      {/* Project Name Badge */}
                      <Link 
                        href={`/sessions?project=${issue.project_id}`}
                        className="px-2.5 py-1 rounded-md bg-pm-bg border border-pm-border text-[10px] font-semibold text-pm-muted hover:text-pm-text hover:border-pm-accent/50 transition-colors flex items-center gap-1 truncate max-w-[180px]"
                      >
                        <Folder className="w-3 h-3 text-pm-accent flex-shrink-0" />
                        <span className="truncate">{issue.project_name}</span>
                      </Link>

                      {/* Target URL Badge */}
                      {issue.page_url && (
                        <span 
                          title={issue.page_url}
                          className="px-2.5 py-1 rounded-md bg-pm-bg/60 border border-pm-border/60 text-[10px] font-mono text-pm-muted truncate max-w-[200px] flex items-center gap-1"
                        >
                          <Globe className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{issue.page_url.replace(/^https?:\/\//, '')}</span>
                        </span>
                      )}
                    </div>

                    {/* Title & Description */}
                    <div className="space-y-1.5">
                      <h3 className={cn(
                        "text-sm md:text-base font-bold text-pm-text leading-snug group-hover:text-pm-accent transition-colors",
                        isResolved && "line-through text-pm-muted"
                      )}>
                        {(issue.title && issue.title.trim()) ||
                         (issue.dom_text_excerpt && issue.dom_text_excerpt.trim()) ||
                         (issue.target_selector ? `Feedback on ${issue.target_selector}` : null) ||
                         (issue.page_title ? `Note on ${issue.page_title}` : null) ||
                         (issue.marker_number ? `Issue Pin #${issue.marker_number}` : `Issue Pin #${issue.id.slice(0, 8)}`)}
                      </h3>

                      {issue.description ? (
                        <p className="text-xs text-pm-muted leading-relaxed line-clamp-2">
                          {issue.description}
                        </p>
                      ) : (
                        <p className="text-[11px] text-pm-muted/60 italic leading-relaxed">
                          No descriptive summary attached. Click "Open in Canvas" to inspect the highlighted element in context.
                        </p>
                      )}
                    </div>

                    {/* Technical Target Excerpt */}
                    {issue.target_selector && (
                      <div className="flex items-center gap-2 text-[11px] font-mono text-pm-muted/80 bg-pm-bg/80 border border-pm-border/50 rounded-lg px-2.5 py-1.5 max-w-xl truncate">
                        <Code2 className="w-3 h-3 text-cyan-400 flex-shrink-0" />
                        <span className="truncate">{issue.target_selector}</span>
                      </div>
                    )}

                    {/* Meta info: Author & Timestamp */}
                    <div className="flex items-center gap-4 text-[10px] text-pm-muted pt-1">
                      <div className="flex items-center gap-1.5">
                        <div 
                          className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white uppercase shadow-sm"
                          style={{ backgroundColor: issue.color_token || '#4f46e5' }}
                        >
                          {(issue.creator_name || 'R')[0]}
                        </div>
                        <span className="font-semibold text-pm-text/90">
                          {issue.creator_name || 'Reviewer'}
                        </span>
                        {issue.creator_role && (
                          <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-pm-surface-2 border border-pm-border text-pm-muted font-bold">
                            {issue.creator_role}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{formatRelativeTime(issue.created_at)}</span>
                      </div>
                    </div>

                  </div>

                  {/* Right Actions Column */}
                  <div className="flex flex-row md:flex-col items-center md:items-end justify-between gap-2.5 flex-shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-pm-border">
                    
                    {/* Mark as Fixed / Reopen Toggle Button */}
                    <button
                      onClick={() => handleToggleStatus(issue)}
                      disabled={actionLoadingId === issue.id}
                      className={cn(
                        "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 active:scale-95 shadow-sm cursor-pointer disabled:opacity-50",
                        isResolved
                          ? "bg-pm-surface border border-pm-border hover:bg-pm-surface-2 text-pm-text"
                          : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20"
                      )}
                    >
                      {actionLoadingId === issue.id ? (
                        <StageLoader size="sm" />
                      ) : isResolved ? (
                        <>
                          <Undo2 className="w-3.5 h-3.5" />
                          <span>Reopen Issue</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Mark as Fixed</span>
                        </>
                      )}
                    </button>

                    {/* Open in Canvas Redirect Link Button */}
                    <Link
                      href={directCanvasUrl}
                      className="px-4 py-2 rounded-xl bg-pm-accent hover:bg-pm-accent-bright text-white text-xs font-bold transition-all flex items-center gap-2 active:scale-95 shadow-sm group/btn"
                    >
                      <span>Open in Canvas</span>
                      <ExternalLink className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                    </Link>

                    {/* Delete Pin (Subtle) */}
                    <button
                      onClick={() => handleDeleteIssue(issue.id)}
                      disabled={actionLoadingId === issue.id}
                      className="p-2 text-pm-muted hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                      title="Delete issue pin"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                  </div>

                </div>
              </motion.div>
            )
          })}
        </motion.div>
      ) : (
        /* Empty State */
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="border-2 border-dashed border-pm-border bg-pm-surface rounded-3xl p-16 flex flex-col items-center justify-center text-center gap-6 shadow-sm"
        >
          <div className="w-16 h-16 rounded-2xl bg-pm-surface-2 border border-pm-border flex items-center justify-center text-pm-accent">
            <Inbox className="w-8 h-8" />
          </div>
          <div className="space-y-1.5 max-w-md">
            <h3 className="text-base font-bold text-pm-text">No issues found</h3>
            <p className="text-xs text-pm-muted leading-relaxed">
              {searchQuery || statusFilter !== 'all' || priorityFilter !== 'all' || projectFilter !== 'all'
                ? "No issues match your active search or filter criteria. Try adjusting or clearing filters."
                : "No issues or feedback pins have been dropped yet. Start a review session to drop pins and document feedback on your web app."}
            </p>
          </div>
          {(searchQuery || statusFilter !== 'all' || priorityFilter !== 'all' || projectFilter !== 'all') ? (
            <button
              onClick={() => {
                setSearchQuery('')
                setStatusFilter('all')
                setPriorityFilter('all')
                setProjectFilter('all')
              }}
              className="px-5 py-2.5 rounded-xl bg-pm-surface-2 border border-pm-border hover:bg-pm-surface text-pm-text font-bold text-xs transition-all active:scale-95 cursor-pointer"
            >
              Reset Filters
            </button>
          ) : (
            <Link
              href="/sessions"
              className="px-6 py-3 rounded-xl bg-pm-accent hover:bg-pm-accent-bright text-white font-bold text-xs transition-all flex items-center gap-2 active:scale-95 shadow-sm"
            >
              <Play className="w-4 h-4" />
              <span>Go to Review Sessions</span>
            </Link>
          )}
        </motion.div>
      )}

    </div>
  )
}

export default function IssuesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-pm-bg text-pm-text flex flex-col items-center justify-center">
        <StageLoader size="md" text="Loading issue tracker..." />
      </div>
    }>
      <IssuesContent />
    </Suspense>
  )
}
