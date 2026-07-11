'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useMarkerStore } from '@/store/markerStore'
import { Marker, MarkerStatus, MarkerPriority } from '@/types/markers'
import { api } from '@/lib/api'
import { 
  Search, 
  Filter, 
  ArrowUpDown, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Circle, 
  Play, 
  Trash2, 
  Copy, 
  MapPin, 
  MessageSquare, 
  History, 
  User, 
  Globe, 
  Code, 
  Calendar,
  XCircle,
  ExternalLink,
  Loader2,
  TrendingUp,
  CornerDownRight,
  Send
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { getMarkerColors } from '@/lib/markerColors'
import { useUIStore } from '@/store/uiStore'
import { cn } from '@/lib/utils'

interface ObservationDetailsProps {
  sessionId: string
  projectId: string
  onJumpToCanvas: (markerId: string) => void
}

interface LocalReply {
  id: string
  authorName: string
  authorRole: 'developer' | 'reviewer'
  text: string
  createdAt: string
  colorToken: string
}

export function ObservationDetails({ sessionId, projectId, onJumpToCanvas }: ObservationDetailsProps) {
  const { markersById, selectedMarkerId, selectMarker, updateMarkerViaApi, deleteMarkerViaApi } = useMarkerStore()
  const markers = useMemo(() => {
    return Object.values(markersById).filter(m => !m.is_deleted)
  }, [markersById])

  const selectedMarker = selectedMarkerId ? markersById[selectedMarkerId] : null

  // UI / Filters State
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [reviewerFilter, setReviewerFilter] = useState<string>('all')
  const [pageFilter, setPageFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'priority' | 'unresolved'>('newest')
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  
  // History & Timeline State
  const [historyEvents, setHistoryEvents] = useState<any[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  // Replies State (Stored in localStorage for full persistence)
  const [replies, setReplies] = useState<LocalReply[]>([])
  const [newReplyText, setNewReplyText] = useState('')

  // Fetch History & Load Replies when selected observation changes
  useEffect(() => {
    if (!selectedMarker) {
      setHistoryEvents([])
      setReplies([])
      return
    }

    // Load History from API
    setHistoryLoading(true)
    api.sessions.getFeedbackHistory(sessionId, selectedMarker.id)
      .then(res => {
        if (Array.isArray(res)) {
          setHistoryEvents(res)
        } else {
          setHistoryEvents([])
        }
      })
      .catch(() => setHistoryEvents([]))
      .finally(() => setHistoryLoading(false))

    // Load Replies from localStorage
    const saved = localStorage.getItem(`pm_replies_${selectedMarker.id}`)
    if (saved) {
      try {
        setReplies(JSON.parse(saved))
      } catch {
        setReplies([])
      }
    } else {
      setReplies([])
    }
  }, [selectedMarker, sessionId])

  // Save reply handler
  const handleAddReply = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedMarker || !newReplyText.trim()) return

    const authorName = localStorage.getItem('tester_name') || 'Developer'
    const authorRole = (localStorage.getItem('tester_role') || 'developer') as 'developer' | 'reviewer'
    
    const newReply: LocalReply = {
      id: `reply_${Date.now()}`,
      authorName,
      authorRole,
      text: newReplyText,
      createdAt: new Date().toISOString(),
      colorToken: authorRole === 'reviewer' ? '#253B80' : '#8b5cf6'
    }

    const updated = [...replies, newReply]
    setReplies(updated)
    localStorage.setItem(`pm_replies_${selectedMarker.id}`, JSON.stringify(updated))
    setNewReplyText('')
  }

  // Derive filter options
  const filterOptions = useMemo(() => {
    const reviewers = new Set<string>()
    const pages = new Set<string>()

    markers.forEach(m => {
      if (m.creator_name) reviewers.add(m.creator_name)
      if (m.page_url) pages.add(m.page_url)
    })

    return {
      reviewers: Array.from(reviewers),
      pages: Array.from(pages)
    }
  }, [markers])

  // Apply filters and sorting
  const filteredMarkers = useMemo(() => {
    let result = [...markers]

    // 1. Search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      result = result.filter(
        m =>
          (m.title && m.title.toLowerCase().includes(term)) ||
          (m.description && m.description.toLowerCase().includes(term)) ||
          (m.creator_name && m.creator_name.toLowerCase().includes(term)) ||
          (m.page_url && m.page_url.toLowerCase().includes(term))
      )
    }

    // 2. Status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'open') {
        result = result.filter(m => m.status !== 'resolved' && m.status !== 'dismissed')
      } else {
        result = result.filter(m => m.status === statusFilter)
      }
    }

    // 3. Reviewer filter
    if (reviewerFilter !== 'all') {
      result = result.filter(m => m.creator_name === reviewerFilter)
    }

    // 4. Page filter
    if (pageFilter !== 'all') {
      result = result.filter(m => m.page_url === pageFilter)
    }

    // 5. Sorting
    result.sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
      if (sortBy === 'oldest') {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      }
      if (sortBy === 'unresolved') {
        const aVal = a.status === 'resolved' ? 1 : 0
        const bVal = b.status === 'resolved' ? 1 : 0
        return aVal - bVal
      }
      if (sortBy === 'priority') {
        const priorityWeights = { critical: 4, high: 3, medium: 2, low: 1 }
        const wA = priorityWeights[a.priority] || 0
        const wB = priorityWeights[b.priority] || 0
        return wB - wA
      }
      return 0
    })

    return result
  }, [markers, searchTerm, statusFilter, reviewerFilter, pageFilter, sortBy])

  // Derive stats
  const stats = useMemo(() => {
    const total = markers.length
    let resolved = 0
    let inProgress = 0
    let open = 0

    const creators: Record<string, { name: string; color: string; count: number }> = {}

    markers.forEach(m => {
      if (m.status === 'resolved') {
        resolved++
      } else if (m.status === 'in_progress' || m.status === 'triaged') {
        inProgress++
      } else {
        open++
      }

      if (m.creator_name) {
        if (!creators[m.creator_name]) {
          creators[m.creator_name] = {
            name: m.creator_name,
            color: m.color_token || '#8b5cf6',
            count: 0
          }
        }
        creators[m.creator_name].count++
      }
    })

    const completionPercent = total > 0 ? Math.round((resolved / total) * 100) : 0

    return {
      total,
      resolved,
      inProgress,
      open,
      completionPercent,
      creators: Object.values(creators).sort((a, b) => b.count - a.count)
    }
  }, [markers])

  const handleStatusChange = async (markerId: string, status: MarkerStatus) => {
    try {
      await updateMarkerViaApi(markerId, { status })
    } catch (err) {
      console.error('Failed to update marker status:', err)
    }
  }

  const handleDeleteMarker = async (markerId: string) => {
    if (confirm('Are you sure you want to delete this observation?')) {
      try {
        await deleteMarkerViaApi(markerId)
        selectMarker(null)
      } catch (err) {
        console.error('Failed to delete marker:', err)
      }
    }
  }

  const handleCopyLink = () => {
    if (!selectedMarker) return
    const link = `${window.location.origin}/project/${projectId}?session=${sessionId}&marker=${selectedMarker.id}&view=details`
    navigator.clipboard.writeText(link)
      .then(() => alert('Observation direct link copied to clipboard!'))
  }

  const hasActiveFilters = statusFilter !== 'all' || reviewerFilter !== 'all' || pageFilter !== 'all' || searchTerm.trim() !== ''

  const handleResetFilters = () => {
    setStatusFilter('all')
    setReviewerFilter('all')
    setPageFilter('all')
    setSortBy('newest')
    setSearchTerm('')
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-pm-bg text-pm-text overflow-hidden select-none transition-colors duration-300">
      {/* 1. Session Level Summary Panel - Compact Minimal */}
      <div className="bg-pm-surface border-b border-pm-border p-4 flex flex-col md:flex-row items-center justify-between gap-4 flex-shrink-0 shadow-sm transition-all duration-300">
        <div className="flex items-center gap-5 w-full md:w-auto">
          {/* Progress Donut Chart */}
          <div className="relative w-12 h-12 flex items-center justify-center flex-shrink-0">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                className="text-pm-border-bright"
                strokeWidth="4"
                stroke="currentColor"
                fill="transparent"
                r="19"
                cx="24"
                cy="24"
              />
              <motion.circle
                className="text-emerald-500"
                strokeWidth="4"
                strokeDasharray={`${19 * 2 * Math.PI}`}
                initial={{ strokeDashoffset: 19 * 2 * Math.PI }}
                animate={{ strokeDashoffset: 19 * 2 * Math.PI - (stats.completionPercent / 100) * 19 * 2 * Math.PI }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                strokeLinecap="round"
                stroke="currentColor"
                fill="transparent"
                r="19"
                cx="24"
                cy="24"
              />
            </svg>
            <span className="absolute text-[10px] font-black text-pm-text">{stats.completionPercent}%</span>
          </div>

          <div>
            <h2 className="text-[9px] font-black uppercase tracking-widest text-pm-muted">Session Health Summary</h2>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className="text-[10px] font-bold bg-pm-surface-2 border border-pm-border px-2 py-0.5 rounded text-pm-muted">
                {stats.total} total
              </span>
              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                {stats.open} open
              </span>
              <span className="text-[10px] font-bold text-blue-500 dark:text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded">
                {stats.inProgress} ongoing
              </span>
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                {stats.resolved} resolved
              </span>
            </div>
          </div>
        </div>

        {/* Reviewers attribution */}
        {stats.creators.length > 0 && (
          <div className="flex items-center gap-3 bg-pm-surface-2 border border-pm-border rounded-xl px-3 py-1.5 self-stretch md:self-auto min-w-0">
            <div className="flex -space-x-1 overflow-hidden flex-shrink-0">
              {stats.creators.slice(0, 3).map((c, i) => {
                const initials = c.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
                return (
                  <div
                    key={i}
                    className="w-6.5 h-6.5 rounded-lg border-2 border-pm-surface-2 flex items-center justify-center text-[9px] font-black text-white shadow-sm flex-shrink-0"
                    style={{ backgroundColor: c.color }}
                    title={`${c.name} (${c.count} pins)`}
                  >
                    {initials}
                  </div>
                )
              })}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-pm-muted truncate max-w-[150px]">
                {stats.creators.length} contributors
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 2. Filter / Triage Bar - Collapsed to Popover */}
      <div className="bg-pm-surface border-b border-pm-border px-4 py-3 flex items-center gap-2 flex-shrink-0 transition-colors duration-300">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-pm-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search observations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9.5 pr-4 py-1.5 rounded-lg bg-pm-surface-2 border border-pm-border text-xs font-bold text-pm-text placeholder:text-pm-muted focus:bg-pm-surface outline-none transition-colors duration-200"
          />
        </div>

        {/* Filters popover dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={cn(
              "h-8 px-3 rounded-lg border flex items-center gap-1.5 transition-all duration-200 text-xs font-bold shadow-sm relative cursor-pointer",
              hasActiveFilters 
                ? "bg-pm-cyan/10 border-pm-border text-pm-text" 
                : "bg-pm-surface border-pm-border text-pm-muted hover:bg-pm-surface-2"
            )}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filters</span>
            {hasActiveFilters && (
              <span className="w-1.5 h-1.5 rounded-full bg-pm-cyan" />
            )}
          </button>

          <AnimatePresence>
            {isFilterOpen && (
              <>
                <div className="fixed inset-0 z-50" onClick={() => setIsFilterOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.97 }}
                  transition={{ duration: 0.1, ease: "easeOut" }}
                  className="absolute left-0 mt-2 w-64 rounded-xl bg-pm-surface border border-pm-border shadow-xl z-55 p-4 flex flex-col gap-3.5 text-pm-text select-none"
                >
                  <div className="flex items-center justify-between pb-1.5 border-b border-pm-border">
                    <span className="text-[10px] font-black uppercase tracking-wider text-pm-text">Filter Options</span>
                    {hasActiveFilters && (
                      <button 
                        onClick={handleResetFilters}
                        className="text-[9px] font-black text-rose-500 uppercase hover:underline cursor-pointer"
                      >
                        Reset All
                      </button>
                    )}
                  </div>

                  {/* Status filter */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[8.5px] font-black uppercase tracking-wider text-pm-muted">Status</label>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="bg-pm-surface-2 border border-pm-border text-pm-text rounded-lg px-2 py-1 text-xs font-bold outline-none cursor-pointer"
                    >
                      <option value="all">All states</option>
                      <option value="open">Unresolved</option>
                      <option value="in_progress">In progress</option>
                      <option value="resolved">Resolved</option>
                    </select>
                  </div>

                  {/* Reviewer Filter */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[8.5px] font-black uppercase tracking-wider text-pm-muted">Reviewer</label>
                    <select
                      value={reviewerFilter}
                      onChange={(e) => setReviewerFilter(e.target.value)}
                      className="bg-pm-surface-2 border border-pm-border text-pm-text rounded-lg px-2 py-1 text-xs font-bold outline-none cursor-pointer"
                    >
                      <option value="all">Everyone</option>
                      {filterOptions.reviewers.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>

                  {/* Page Filter */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[8.5px] font-black uppercase tracking-wider text-pm-muted">Page Context</label>
                    <select
                      value={pageFilter}
                      onChange={(e) => setPageFilter(e.target.value)}
                      className="bg-pm-surface-2 border border-pm-border text-pm-text rounded-lg px-2 py-1 text-xs font-bold outline-none cursor-pointer max-w-full truncate"
                    >
                      <option value="all">All pages</option>
                      {filterOptions.pages.map(p => (
                        <option key={p} value={p}>{p.split('/').pop() || '/'}</option>
                      ))}
                    </select>
                  </div>

                  {/* Sort order */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[8.5px] font-black uppercase tracking-wider text-pm-muted">Sort By</label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="bg-pm-surface-2 border border-pm-border text-pm-text rounded-lg px-2 py-1 text-xs font-bold outline-none cursor-pointer"
                    >
                      <option value="newest">Newest first</option>
                      <option value="oldest">Oldest first</option>
                      <option value="unresolved">Unresolved first</option>
                      <option value="priority">Priority weight</option>
                    </select>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* 3. TWO-PANE LAYOUT */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Pane: Observation List */}
        <div className="w-full md:w-[320px] lg:w-[350px] border-r border-pm-border flex flex-col bg-pm-surface flex-shrink-0 overflow-y-auto transition-colors duration-300">
          {filteredMarkers.length > 0 ? (
            <div className="divide-y divide-pm-border flex flex-col min-h-0">
              {filteredMarkers
                .sort((a, b) => {
                  if (sortBy === 'newest') return new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime()
                  if (sortBy === 'oldest') return new Date(a.created_at || '').getTime() - new Date(b.created_at || '').getTime()
                  if (sortBy === 'unresolved') {
                    if (a.status === 'resolved' && b.status !== 'resolved') return 1
                    if (a.status !== 'resolved' && b.status === 'resolved') return -1
                    return 0
                  }
                  if (sortBy === 'priority') {
                    const w = { critical: 4, high: 3, medium: 2, low: 1 }
                    return (w[b.priority || 'medium'] || 2) - (w[a.priority || 'medium'] || 2)
                  }
                  return 0
                })
                .map((m) => {
                  const isSelected = selectedMarker?.id === m.id
                  const titleText = m.title || m.description || 'Pinned observation'
                  return (
                    <div
                      key={m.id}
                      onClick={() => selectMarker(m.id)}
                      className={cn(
                        "p-4 cursor-pointer transition-all duration-200 hover:bg-pm-surface-2 flex flex-col gap-2 border-l-4",
                        isSelected 
                          ? 'bg-pm-accent-subtle border-pm-accent shadow-inner' 
                          : 'border-transparent'
                      )}
                    >
                      {/* Top Row: Creator & Time */}
                      <div className="flex items-center justify-between text-[9px] font-black text-pm-muted uppercase tracking-widest">
                        <div className="flex items-center gap-1.5">
                          <span 
                            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: m.color_token || '#8b5cf6' }}
                          />
                          <span>{m.creator_name || 'Anonymous'}</span>
                        </div>
                        <span className="font-mono text-pm-muted">
                          {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      {/* Excerpt title */}
                      <p className="text-[11px] font-extrabold text-pm-text leading-snug line-clamp-2">
                        {titleText}
                      </p>

                      {/* Meta info */}
                      <div className="flex items-center justify-between mt-1 flex-wrap gap-2">
                        {/* Page Context */}
                        <span className="text-[8.5px] font-bold text-pm-accent flex items-center gap-1 max-w-[120px] truncate bg-pm-surface-2 px-1.5 py-0.5 rounded border border-pm-border">
                          <Globe className="w-2.5 h-2.5 text-pm-muted" />
                          {m.page_url?.split('/').pop() || '/'}
                        </span>

                        {/* Badges */}
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {m.priority && m.priority !== 'medium' && (
                            <span className={cn(
                              "text-[7.5px] font-black uppercase px-1 py-0.5 rounded border",
                              m.priority === 'critical' 
                                ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' 
                                : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                            )}>
                              {m.priority}
                            </span>
                          )}
                          <span className={cn(
                            "text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full border",
                            m.status === 'resolved' 
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' 
                              : m.status === 'in_progress' 
                                ? 'bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 border-indigo-500/20' 
                                : 'bg-rose-500/10 text-rose-500 dark:text-rose-400 border-rose-500/20'
                          )}>
                            {m.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-pm-surface border border-pm-border flex items-center justify-center text-pm-muted shadow-sm">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="space-y-1 max-w-[200px]">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-pm-text">No observations</h4>
                <p className="text-[9px] text-pm-muted font-bold uppercase tracking-wider leading-relaxed">
                  Try adjusting search filter tags.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right Pane: Selected Observation Detail */}
        <div className="flex-1 flex flex-col overflow-y-auto bg-pm-surface min-w-0 transition-colors duration-300">
          {selectedMarker ? (
            <div className="p-6 md:p-8 space-y-6 min-w-0 max-w-4xl">
              
              {/* Header inside details */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-pm-border">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn(
                      "w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black text-white shadow-sm",
                      selectedMarker.status === 'resolved' ? 'bg-emerald-600' : 'bg-[#4382DF]'
                    )}>
                      {markers.findIndex(m => m.id === selectedMarker.id) + 1}
                    </span>
                    <h3 className="text-sm font-extrabold text-pm-text truncate max-w-xs sm:max-w-md">
                      {selectedMarker.title || 'Pinned Observation'}
                    </h3>
                  </div>
                  <p className="text-[8.5px] font-mono font-bold uppercase tracking-widest text-pm-muted">
                    ID: {selectedMarker.id.substring(0, 8)} • Created {new Date(selectedMarker.created_at).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onJumpToCanvas(selectedMarker.id)}
                    className="h-8.5 px-3 rounded-lg bg-pm-accent hover:bg-pm-accent-bright text-white font-black text-[9.5px] uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                  >
                    <MapPin className="w-3 h-3" />
                    Jump to Pin
                  </button>

                  <button
                    onClick={() => handleStatusChange(
                      selectedMarker.id, 
                      selectedMarker.status === 'resolved' ? 'open' : 'resolved'
                    )}
                    className={cn(
                      "h-8.5 px-3 rounded-lg border font-black text-[9.5px] uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-sm cursor-pointer",
                      selectedMarker.status === 'resolved'
                        ? 'bg-pm-surface border-pm-border hover:bg-pm-surface-2 text-pm-muted'
                        : 'bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                    )}
                  >
                    {selectedMarker.status === 'resolved' ? <Circle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                    {selectedMarker.status === 'resolved' ? 'Reopen' : 'Resolve'}
                  </button>
                </div>
              </div>

              {/* Information Architecture Grid: Client Summaries & Visual cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left Card: Reviewer attribution */}
                <div className="bg-pm-surface-2 border border-pm-border rounded-xl p-4 space-y-2">
                  <h4 className="text-[8.5px] font-black uppercase tracking-widest text-pm-muted flex items-center gap-1.5">
                    <User className="w-3 h-3 text-pm-accent" />
                    Identity
                  </h4>
                  <div className="flex items-center gap-2.5">
                    <div 
                      className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-white text-[10px] shadow-sm"
                      style={{ backgroundColor: selectedMarker.color_token || '#8b5cf6' }}
                    >
                      {selectedMarker.creator_name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'AR'}
                    </div>
                    <div>
                      <p className="text-xs font-extrabold text-pm-text">{selectedMarker.creator_name || 'Anonymous Reviewer'}</p>
                      <p className="text-[8px] font-mono uppercase tracking-widest text-pm-muted mt-0.5 font-bold">{selectedMarker.creator_role || 'Guest Reviewer'}</p>
                    </div>
                  </div>
                </div>

                {/* Right Card: Context Info */}
                <div className="bg-pm-surface-2 border border-pm-border rounded-xl p-4 space-y-2">
                  <h4 className="text-[8.5px] font-black uppercase tracking-widest text-pm-muted flex items-center gap-1.5">
                    <Globe className="w-3 h-3 text-pm-accent" />
                    Target Page URL
                  </h4>
                  <div className="space-y-0.5">
                    <p className="text-xs font-extrabold text-pm-text truncate max-w-xs">{selectedMarker.page_title || 'Workspace Page'}</p>
                    <a
                      href={selectedMarker.page_url || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[9px] font-mono text-pm-accent hover:underline flex items-center gap-1 truncate max-w-xs font-bold"
                    >
                      {selectedMarker.page_url}
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                </div>
              </div>

              {/* Screenshot Preview */}
              {selectedMarker.screenshot_url && (
                <div className="space-y-2">
                  <h4 className="text-[8.5px] font-black uppercase tracking-widest text-pm-muted">
                    What the reviewer saw
                  </h4>
                  <div className="border border-pm-border rounded-xl overflow-hidden shadow-sm bg-pm-surface-2 p-1">
                    <img 
                      src={selectedMarker.screenshot_url} 
                      alt="Reviewer screen capture context preview"
                      className="w-full max-h-[260px] object-contain rounded-lg"
                    />
                  </div>
                </div>
              )}

              {/* Description Body */}
              <div className="space-y-1.5">
                <h4 className="text-[8.5px] font-black uppercase tracking-widest text-pm-muted">
                  Description
                </h4>
                <p className="text-xs text-pm-text leading-relaxed font-bold bg-pm-surface-2 border border-pm-border rounded-xl p-3.5 shadow-sm">
                  {selectedMarker.description || 'No description added yet'}
                </p>
              </div>

              {/* Technical Context Accordion (Progressive Disclosure for Developers) */}
              <div className="border border-pm-border rounded-xl overflow-hidden bg-pm-surface-2">
                <details className="group">
                  <summary className="flex items-center justify-between p-3.5 cursor-pointer select-none focus:outline-none">
                    <div className="flex items-center gap-2">
                      <Code className="w-3.5 h-3.5 text-pm-accent" />
                      <span className="text-[9px] font-black uppercase tracking-widest text-pm-muted">More Details</span>
                    </div>
                    <span className="text-[9px] font-black text-pm-accent group-open:hidden uppercase tracking-widest">Show Tech specs</span>
                    <span className="text-[9px] font-black text-pm-accent hidden group-open:block uppercase tracking-widest">Hide Tech specs</span>
                  </summary>
                  <div className="p-3.5 border-t border-pm-border bg-pm-surface space-y-3 font-mono text-[9px] leading-normal font-bold">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-0.5">
                        <span className="text-pm-muted uppercase text-[8px] block">Attachment Method</span>
                        <span className="text-pm-text bg-pm-surface-2 px-1.5 py-0.5 rounded border border-pm-border uppercase text-[8px] font-mono">{selectedMarker.anchor_mode || 'dom'}</span>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-slate-400 uppercase text-[8px] block">Page Type</span>
                        <span className="text-[#293681] bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 uppercase text-[8px] font-mono">{selectedMarker.renderer_type || 'canvas'}</span>
                      </div>
                      {selectedMarker.viewport_width && (
                        <div className="space-y-0.5">
                          <span className="text-slate-400 uppercase text-[8px] block">Screen Size</span>
                          <span className="text-slate-600">{selectedMarker.viewport_width}px × {selectedMarker.viewport_height}px</span>
                        </div>
                      )}
                      {selectedMarker.browser && (
                        <div className="space-y-0.5">
                          <span className="text-slate-400 uppercase text-[8px] block">Platform Details</span>
                          <span className="text-slate-600">{selectedMarker.browser} / {selectedMarker.os}</span>
                        </div>
                      )}
                    </div>
                    
                    {selectedMarker.target_selector && (
                      <div className="space-y-1">
                        <span className="text-slate-400 uppercase text-[8px] block">Targeted Element Anchor (DOM Selector)</span>
                        <div className="font-mono text-[9px] bg-slate-900 text-slate-100 p-2.5 rounded-lg border border-white/5 overflow-x-auto break-all leading-relaxed">
                          {selectedMarker.target_selector}
                        </div>
                      </div>
                    )}
                  </div>
                </details>
              </div>

              {/* Split row: Activity Timeline & Collaboration Discussion */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 border-t border-pm-border pt-6">
                
                {/* 1. History & Log Timeline */}
                <div className="space-y-3">
                  <h4 className="text-[9px] font-black uppercase tracking-widest text-pm-text/40 flex items-center gap-1.5 pb-2 border-b border-pm-border">
                    <History className="w-3.5 h-3.5 text-pm-muted" />
                    History Log
                  </h4>

                  {historyLoading ? (
                    <div className="flex items-center justify-center p-4 gap-2 bg-pm-surface-2/25 border border-dashed border-pm-border rounded-xl">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-pm-muted" />
                      <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-pm-muted">Loading...</span>
                    </div>
                  ) : historyEvents.length > 0 ? (
                    <div className="space-y-3.5 pl-2 relative border-l border-pm-border">
                      {historyEvents.map((evt, idx) => (
                        <div key={idx} className="relative pl-4">
                          <div className="absolute -left-[4.5px] top-1.5 w-2 h-2 rounded-full border border-pm-surface bg-pm-accent shadow-sm" />
                          <div className="text-[8.5px] font-mono text-pm-muted font-bold">
                            {new Date(evt.occurred_at || evt.timestamp).toLocaleString()}
                          </div>
                          <p className="text-[10px] font-bold text-pm-text/80 mt-0.5">
                            {evt.action || evt.message || 'Observation logged'}
                          </p>
                          {evt.actor_name && (
                            <span className="text-[9px] font-bold text-pm-accent">
                              by {evt.actor_name}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-3.5 pl-2 relative border-l border-pm-border">
                      <div className="relative pl-4">
                        <div className="absolute -left-[4.5px] top-1.5 w-2 h-2 rounded-full border border-pm-surface bg-emerald-500 shadow-sm" />
                        <div className="text-[8.5px] font-mono text-pm-muted font-bold">
                          {new Date(selectedMarker.created_at).toLocaleString()}
                        </div>
                        <p className="text-[10px] font-bold text-pm-text/80 mt-0.5">
                          Observation logged by {selectedMarker.creator_name || 'Anonymous Reviewer'}
                        </p>
                      </div>
                      {selectedMarker.updated_at && (
                        <div className="relative pl-4">
                          <div className="absolute -left-[4.5px] top-1.5 w-2 h-2 rounded-full border border-pm-surface bg-pm-accent shadow-sm" />
                          <div className="text-[8.5px] font-mono text-pm-muted font-bold">
                            {new Date(selectedMarker.updated_at).toLocaleString()}
                          </div>
                          <p className="text-[10px] font-bold text-pm-text/80 mt-0.5">
                            Observation updated to status: <span className="font-black text-pm-accent">{selectedMarker.status}</span>
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 2. Collaboration Replies */}
                <div className="space-y-3">
                  <h4 className="text-[9px] font-black uppercase tracking-widest text-pm-text/40 flex items-center gap-1.5 pb-2 border-b border-pm-border">
                    <MessageSquare className="w-3.5 h-3.5 text-pm-muted" />
                    Discussion
                  </h4>

                  {/* Reply timeline */}
                  <div className="space-y-3 max-h-[180px] overflow-y-auto pr-1">
                    {replies.length > 0 ? (
                      replies.map((rep) => {
                        const init = rep.authorName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
                        return (
                          <div key={rep.id} className="flex gap-2">
                            <div 
                              className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-white text-[8.5px] flex-shrink-0 shadow-sm"
                              style={{ backgroundColor: rep.colorToken }}
                            >
                              {init}
                            </div>
                            <div className="bg-pm-surface border border-pm-border rounded-xl px-3 py-2 flex-1 min-w-0">
                              <div className="flex items-center justify-between text-[7.5px] font-black uppercase text-pm-muted">
                                <span>{rep.authorName} ({rep.authorRole})</span>
                                <span>{new Date(rep.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                              <p className="text-[10.5px] text-pm-text font-bold mt-1 leading-normal break-words">
                                {rep.text}
                              </p>
                            </div>
                          </div>
                        )
                      })
                    ) : (
                      <div className="text-center p-4 border border-dashed border-pm-border bg-pm-surface-2 rounded-xl">
                        <p className="text-[8.5px] font-bold text-pm-muted uppercase tracking-wider">No replies yet.</p>
                      </div>
                    )}
                  </div>

                  {/* Add Reply Form */}
                  <form onSubmit={handleAddReply} className="flex gap-1.5 items-center">
                    <input
                      type="text"
                      placeholder="Type reply or note..."
                      value={newReplyText}
                      onChange={(e) => setNewReplyText(e.target.value)}
                      className="flex-1 px-3.5 py-2 border border-pm-border bg-pm-surface rounded-lg text-xs font-bold text-pm-text outline-none placeholder:text-pm-muted focus:bg-pm-surface-2 focus:border-pm-accent transition-colors duration-200"
                    />
                    <button
                      type="submit"
                      className="w-8.5 h-8.5 rounded-lg bg-pm-accent hover:bg-pm-accent-bright text-white flex items-center justify-center shadow-sm flex-shrink-0 transition-all cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </div>
              </div>

              {/* Extra actions */}
              <div className="border-t border-pm-border pt-5 flex items-center justify-between">
                <button
                  onClick={handleCopyLink}
                  className="h-8.5 px-3 rounded-lg border border-pm-border bg-pm-surface text-pm-muted hover:bg-pm-surface-2 font-bold text-[10px] uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copy link
                </button>

                <button
                  onClick={() => handleDeleteMarker(selectedMarker.id)}
                  className="h-8.5 px-3 rounded-lg border border-rose-500/20 text-rose-500 hover:bg-rose-500/10 font-bold text-[10px] uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete Pin
                </button>
              </div>

            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4 select-none bg-pm-surface-2/40">
              <div className="w-14 h-14 rounded-2xl bg-pm-surface border border-pm-border flex items-center justify-center text-pm-muted shadow-sm">
                <MapPin className="w-6 h-6 animate-pulse text-pm-accent/40" />
              </div>
              <div className="space-y-1 max-w-[200px]">
                <h3 className="text-[10px] font-black text-pm-text uppercase tracking-widest">Select an item</h3>
                <p className="text-[9px] text-pm-muted leading-relaxed uppercase tracking-wider font-black">
                  Choose a card from the left panel list or select its pin on the canvas to inspect description details.
                </p>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
