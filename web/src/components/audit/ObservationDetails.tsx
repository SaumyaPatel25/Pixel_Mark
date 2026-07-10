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
    <div className="flex-1 flex flex-col h-full bg-[#fcfbfa] text-slate-700 overflow-hidden select-none">
      {/* 1. Session Level Summary Panel - Compact Minimal */}
      <div className="bg-white border-b border-slate-200/60 p-4 flex flex-col md:flex-row items-center justify-between gap-4 flex-shrink-0 shadow-sm shadow-slate-100/10">
        <div className="flex items-center gap-5 w-full md:w-auto">
          {/* Progress Donut Chart */}
          <div className="relative w-12 h-12 flex items-center justify-center flex-shrink-0">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                className="text-slate-100"
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
            <span className="absolute text-[10px] font-black text-[#293681]">{stats.completionPercent}%</span>
          </div>

          <div>
            <h2 className="text-[9px] font-black uppercase tracking-widest text-[#293681]/50">Session Health Summary</h2>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className="text-[10px] font-bold bg-slate-50 border border-slate-200 px-2 py-0.5 rounded text-slate-600">
                {stats.total} total
              </span>
              <span className="text-[10px] font-bold text-[#b45309] bg-[#fef3c7] border border-[#fde68a]/50 px-2 py-0.5 rounded">
                {stats.open} open
              </span>
              <span className="text-[10px] font-bold text-[#4382DF] bg-blue-50/50 border border-blue-100/50 px-2 py-0.5 rounded">
                {stats.inProgress} ongoing
              </span>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100/50 px-2 py-0.5 rounded">
                {stats.resolved} resolved
              </span>
            </div>
          </div>
        </div>

        {/* Reviewers attribution */}
        {stats.creators.length > 0 && (
          <div className="flex items-center gap-3 bg-slate-50/50 border border-slate-200/60 rounded-xl px-3 py-1.5 self-stretch md:self-auto min-w-0">
            <div className="flex -space-x-1 overflow-hidden flex-shrink-0">
              {stats.creators.slice(0, 3).map((c, i) => {
                const initials = c.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
                return (
                  <div
                    key={i}
                    className="w-6.5 h-6.5 rounded-lg border-2 border-white flex items-center justify-center text-[9px] font-black text-white shadow-sm flex-shrink-0"
                    style={{ backgroundColor: c.color }}
                    title={`${c.name} (${c.count} pins)`}
                  >
                    {initials}
                  </div>
                )
              })}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-slate-500 truncate max-w-[150px]">
                {stats.creators.length} contributors
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 2. Filter / Triage Bar - Collapsed to Popover */}
      <div className="bg-white border-b border-slate-200/60 px-4 py-3 flex items-center gap-2 flex-shrink-0">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search observations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9.5 pr-4 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:bg-white outline-none transition-colors duration-200"
          />
        </div>

        {/* Filters popover dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={cn(
              "h-8 px-3 rounded-lg border flex items-center gap-1.5 transition-colors duration-200 text-xs font-bold shadow-sm relative cursor-pointer",
              hasActiveFilters 
                ? "bg-[#D0E7E6]/40 border-[#293681]/30 text-[#293681]" 
                : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
            )}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filters</span>
            {hasActiveFilters && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#293681]" />
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
                  className="absolute left-0 mt-2 w-64 rounded-xl bg-white border border-slate-200 shadow-xl z-55 p-4 flex flex-col gap-3.5 text-slate-700 select-none"
                >
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#293681]">Filter Options</span>
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
                    <label className="text-[8.5px] font-black uppercase tracking-wider text-slate-400">Status</label>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold outline-none cursor-pointer"
                    >
                      <option value="all">All states</option>
                      <option value="open">Unresolved</option>
                      <option value="in_progress">In progress</option>
                      <option value="resolved">Resolved</option>
                    </select>
                  </div>

                  {/* Reviewer Filter */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[8.5px] font-black uppercase tracking-wider text-slate-400">Reviewer</label>
                    <select
                      value={reviewerFilter}
                      onChange={(e) => setReviewerFilter(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold outline-none cursor-pointer"
                    >
                      <option value="all">Everyone</option>
                      {filterOptions.reviewers.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>

                  {/* Page Filter */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[8.5px] font-black uppercase tracking-wider text-slate-400">Page Context</label>
                    <select
                      value={pageFilter}
                      onChange={(e) => setPageFilter(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold outline-none cursor-pointer max-w-full truncate"
                    >
                      <option value="all">All pages</option>
                      {filterOptions.pages.map(p => (
                        <option key={p} value={p}>{p.split('/').pop() || '/'}</option>
                      ))}
                    </select>
                  </div>

                  {/* Sort order */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[8.5px] font-black uppercase tracking-wider text-slate-400">Sort By</label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold outline-none cursor-pointer"
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
        <div className="w-full md:w-[320px] lg:w-[350px] border-r border-slate-200/60 flex flex-col bg-white flex-shrink-0 overflow-y-auto">
          {filteredMarkers.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {filteredMarkers.map((m) => {
                const isSelected = selectedMarkerId === m.id
                const titleText = m.title || m.description || 'Pinned observation'
                
                return (
                  <div
                    key={m.id}
                    onClick={() => selectMarker(m.id)}
                    className={cn(
                      "p-4 cursor-pointer transition-colors duration-200 hover:bg-slate-50/50 flex flex-col gap-2 border-l-4",
                      isSelected 
                        ? 'bg-indigo-50/20 border-[#293681]' 
                        : 'border-transparent'
                    )}
                  >
                    {/* Top Row: Creator & Time */}
                    <div className="flex items-center justify-between text-[9px] font-black text-slate-400 uppercase tracking-widest">
                      <div className="flex items-center gap-1.5">
                        <span 
                          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: m.color_token || '#8b5cf6' }}
                        />
                        <span>{m.creator_name || 'Anonymous'}</span>
                      </div>
                      <span className="font-mono text-slate-400">
                        {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {/* Excerpt title */}
                    <p className="text-[11px] font-extrabold text-[#293681] leading-snug line-clamp-2">
                      {titleText}
                    </p>

                    {/* Meta info */}
                    <div className="flex items-center justify-between mt-1 flex-wrap gap-2">
                      {/* Page Context */}
                      <span className="text-[8.5px] font-bold text-[#4382DF] flex items-center gap-1 max-w-[120px] truncate bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                        <Globe className="w-2.5 h-2.5 text-slate-300" />
                        {m.page_url?.split('/').pop() || '/'}
                      </span>

                      {/* Badges */}
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {m.priority && m.priority !== 'medium' && (
                          <span className={cn(
                            "text-[7.5px] font-black uppercase px-1 py-0.5 rounded border",
                            m.priority === 'critical' 
                              ? 'bg-rose-50 text-rose-500 border-rose-100' 
                              : 'bg-amber-50 text-amber-600 border-amber-100'
                          )}>
                            {m.priority}
                          </span>
                        )}
                        <span className={cn(
                          "text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full border",
                          m.status === 'resolved' 
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                            : m.status === 'in_progress' 
                              ? 'bg-indigo-50 text-indigo-500 border-indigo-100' 
                              : 'bg-[#FFD5CD]/40 text-[#293681] border-[#293681]/8'
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
              <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-300 shadow-sm">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="space-y-1 max-w-[200px]">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-[#293681]">No observations</h4>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider leading-relaxed">
                  Try adjusting search filter tags.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right Pane: Selected Observation Detail */}
        <div className="flex-1 flex flex-col overflow-y-auto bg-white min-w-0">
          {selectedMarker ? (
            <div className="p-6 md:p-8 space-y-6 min-w-0 max-w-4xl">
              
              {/* Header Title section */}
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-slate-100 pb-5 min-w-0">
                <div className="space-y-2 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span 
                      className="px-2 py-0.5 rounded text-[8px] font-black text-white uppercase tracking-wider"
                      style={{ backgroundColor: selectedMarker.color_token || '#8b5cf6' }}
                    >
                      {selectedMarker.creator_role || 'reviewer'}
                    </span>
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider border",
                      selectedMarker.status === 'resolved' 
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                        : selectedMarker.status === 'in_progress' 
                          ? 'bg-indigo-50 text-indigo-500 border-indigo-100' 
                          : 'bg-[#FFD5CD]/40 text-[#293681] border-[#293681]/8'
                    )}>
                      {selectedMarker.status}
                    </span>
                    {selectedMarker.priority && (
                      <span className={cn(
                        "px-1.5 py-0.5 rounded text-[7.5px] font-black uppercase tracking-widest border",
                        selectedMarker.priority === 'critical' 
                          ? 'bg-rose-50 text-rose-500 border-rose-100' 
                          : selectedMarker.priority === 'high' 
                            ? 'bg-amber-50 text-amber-600 border-[#fde68a]' 
                            : 'bg-slate-50 text-slate-500 border-slate-100'
                      )}>
                        {selectedMarker.priority} Priority
                      </span>
                    )}
                  </div>
                  <h1 className="text-base font-extrabold tracking-tight text-[#293681] leading-snug break-words">
                    {selectedMarker.title || selectedMarker.description || 'Pinned observation'}
                  </h1>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 font-mono">
                    <Clock className="w-3.5 h-3.5 text-slate-300" />
                    Updated {new Date(selectedMarker.updated_at || selectedMarker.created_at).toLocaleString()}
                  </p>
                </div>

                {/* Status Toggles & Jump Actions */}
                <div className="flex items-center gap-2 flex-wrap md:flex-nowrap flex-shrink-0">
                  <button
                    onClick={() => onJumpToCanvas(selectedMarker.id)}
                    className="h-8.5 px-3 rounded-lg bg-[#293681] hover:bg-[#112E81] text-white font-black text-[9.5px] uppercase tracking-wider flex items-center gap-1.5 transition-colors duration-200 shadow-sm cursor-pointer"
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
                      "h-8.5 px-3 rounded-lg border font-black text-[9.5px] uppercase tracking-wider flex items-center gap-1.5 transition-colors duration-200 shadow-sm cursor-pointer",
                      selectedMarker.status === 'resolved'
                        ? 'bg-white border-slate-200 hover:bg-slate-50 text-slate-600'
                        : 'bg-emerald-50 border-emerald-500/15 hover:bg-emerald-100 text-emerald-600'
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
                <div className="bg-slate-50/40 border border-slate-200/50 rounded-xl p-4 space-y-2">
                  <h4 className="text-[8.5px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                    <User className="w-3 h-3 text-[#293681]/40" />
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
                      <p className="text-xs font-extrabold text-[#293681]">{selectedMarker.creator_name || 'Anonymous Reviewer'}</p>
                      <p className="text-[8px] font-mono uppercase tracking-widest text-slate-400 mt-0.5 font-bold">{selectedMarker.creator_role || 'Guest Reviewer'}</p>
                    </div>
                  </div>
                </div>

                {/* Right Card: Context Info */}
                <div className="bg-slate-50/40 border border-slate-200/50 rounded-xl p-4 space-y-2">
                  <h4 className="text-[8.5px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                    <Globe className="w-3 h-3 text-[#293681]/40" />
                    Target Page URL
                  </h4>
                  <div className="space-y-0.5">
                    <p className="text-xs font-extrabold text-slate-700 truncate max-w-xs">{selectedMarker.page_title || 'Workspace Page'}</p>
                    <a
                      href={selectedMarker.page_url || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[9px] font-mono text-[#4382DF] hover:underline flex items-center gap-1 truncate max-w-xs font-bold"
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
                  <h4 className="text-[8.5px] font-black uppercase tracking-widest text-slate-400">
                    What the reviewer saw
                  </h4>
                  <div className="border border-slate-200/60 rounded-xl overflow-hidden shadow-sm bg-slate-50/50 p-1">
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
                <h4 className="text-[8.5px] font-black uppercase tracking-widest text-slate-400">
                  Description
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed font-bold bg-[#fcfbfa] border border-slate-200/50 rounded-xl p-3.5 shadow-sm">
                  {selectedMarker.description || 'No description added yet'}
                </p>
              </div>

              {/* Technical Context Accordion (Progressive Disclosure for Developers) */}
              <div className="border border-slate-200/60 rounded-xl overflow-hidden bg-slate-50/20">
                <details className="group">
                  <summary className="flex items-center justify-between p-3.5 cursor-pointer select-none focus:outline-none">
                    <div className="flex items-center gap-2">
                      <Code className="w-3.5 h-3.5 text-[#293681]/40" />
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">More Details</span>
                    </div>
                    <span className="text-[9px] font-black text-[#4382DF]/80 group-open:hidden uppercase tracking-widest">Show Tech specs</span>
                    <span className="text-[9px] font-black text-[#4382DF]/80 hidden group-open:block uppercase tracking-widest">Hide Tech specs</span>
                  </summary>
                  <div className="p-3.5 border-t border-slate-200/50 bg-white space-y-3 font-mono text-[9px] leading-normal font-bold">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-0.5">
                        <span className="text-slate-400 uppercase text-[8px] block">Attachment Method</span>
                        <span className="text-[#293681] bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 uppercase text-[8px] font-mono">{selectedMarker.anchor_mode || 'dom'}</span>
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
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 border-t border-slate-100 pt-6">
                
                {/* 1. History & Log Timeline */}
                <div className="space-y-3">
                  <h4 className="text-[9px] font-black uppercase tracking-widest text-[#293681]/50 flex items-center gap-1.5 pb-2 border-b border-slate-100">
                    <History className="w-3.5 h-3.5 text-slate-400" />
                    History Log
                  </h4>

                  {historyLoading ? (
                    <div className="flex items-center justify-center p-4 gap-2 bg-slate-50/20 border border-dashed border-slate-200/50 rounded-xl">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-300" />
                      <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-400">Loading...</span>
                    </div>
                  ) : historyEvents.length > 0 ? (
                    <div className="space-y-3.5 pl-2 relative border-l border-slate-200">
                      {historyEvents.map((evt, idx) => (
                        <div key={idx} className="relative pl-4">
                          <div className="absolute -left-[4.5px] top-1.5 w-2 h-2 rounded-full border border-white bg-[#293681] shadow-sm" />
                          <div className="text-[8.5px] font-mono text-slate-400 font-bold">
                            {new Date(evt.occurred_at || evt.timestamp).toLocaleString()}
                          </div>
                          <p className="text-[10px] font-bold text-slate-600 mt-0.5">
                            {evt.action || evt.message || 'Observation logged'}
                          </p>
                          {evt.actor_name && (
                            <span className="text-[9px] font-bold text-[#293681]/60">
                              by {evt.actor_name}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-3.5 pl-2 relative border-l border-slate-200">
                      <div className="relative pl-4">
                        <div className="absolute -left-[4.5px] top-1.5 w-2 h-2 rounded-full border border-white bg-emerald-500 shadow-sm" />
                        <div className="text-[8.5px] font-mono text-slate-400 font-bold">
                          {new Date(selectedMarker.created_at).toLocaleString()}
                        </div>
                        <p className="text-[10px] font-bold text-slate-600 mt-0.5">
                          Observation logged by {selectedMarker.creator_name || 'Anonymous Reviewer'}
                        </p>
                      </div>
                      {selectedMarker.updated_at && (
                        <div className="relative pl-4">
                          <div className="absolute -left-[4.5px] top-1.5 w-2 h-2 rounded-full border border-white bg-[#293681] shadow-sm" />
                          <div className="text-[8.5px] font-mono text-slate-400 font-bold">
                            {new Date(selectedMarker.updated_at).toLocaleString()}
                          </div>
                          <p className="text-[10px] font-bold text-slate-600 mt-0.5">
                            Observation updated to status: <span className="font-black text-[#293681]">{selectedMarker.status}</span>
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 2. Collaboration Replies */}
                <div className="space-y-3">
                  <h4 className="text-[9px] font-black uppercase tracking-widest text-[#293681]/50 flex items-center gap-1.5 pb-2 border-b border-slate-100">
                    <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
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
                            <div className="bg-slate-50 border border-slate-200/50 rounded-xl px-3 py-2 flex-1 min-w-0">
                              <div className="flex items-center justify-between text-[7.5px] font-black uppercase text-slate-400">
                                <span>{rep.authorName} ({rep.authorRole})</span>
                                <span>{new Date(rep.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                              <p className="text-[10.5px] text-slate-600 font-bold mt-1 leading-normal break-words">
                                {rep.text}
                              </p>
                            </div>
                          </div>
                        )
                      })
                    ) : (
                      <div className="text-center p-4 border border-dashed border-slate-200/50 bg-slate-50/20 rounded-xl">
                        <p className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wider">No replies yet.</p>
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
                      className="flex-1 px-3.5 py-2 border border-slate-200 bg-slate-50 rounded-lg text-xs font-bold text-slate-800 outline-none placeholder:text-slate-400 focus:bg-white focus:border-[#293681] transition-colors duration-200"
                    />
                    <button
                      type="submit"
                      className="w-8.5 h-8.5 rounded-lg bg-[#293681] hover:bg-[#112E81] text-white flex items-center justify-center shadow-sm flex-shrink-0 transition-colors cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </div>
              </div>

              {/* Extra actions */}
              <div className="border-t border-slate-100 pt-5 flex items-center justify-between">
                <button
                  onClick={handleCopyLink}
                  className="h-8.5 px-3 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 font-bold text-[10px] uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copy link
                </button>

                <button
                  onClick={() => handleDeleteMarker(selectedMarker.id)}
                  className="h-8.5 px-3 rounded-lg border border-rose-100 text-rose-500 hover:bg-rose-50 font-bold text-[10px] uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete Pin
                </button>
              </div>

            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4 select-none bg-slate-50/10">
              <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-200 shadow-sm">
                <MapPin className="w-6 h-6 animate-pulse text-[#293681]/30" />
              </div>
              <div className="space-y-1 max-w-[200px]">
                <h3 className="text-[10px] font-black text-[#293681] uppercase tracking-widest">Select an item</h3>
                <p className="text-[9px] text-slate-400 leading-relaxed uppercase tracking-wider font-black">
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
