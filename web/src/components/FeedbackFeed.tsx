'use client'

import React, { useState, useEffect } from 'react'
import { useMarkerStore } from '@/store/markerStore'
import { useUIStore } from '@/store/uiStore'
import { useDOMEditStore } from '@/store/domEditStore'
import { StyleEditsTab } from '@/components/command-center/StyleEditsTab'
import { Layers, Pin, X, Users, Search, Filter, AlertCircle, Compass, ShieldAlert, CheckCircle, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getMarkerColors } from '@/lib/markerColors'
import { AnimatePresence, motion } from 'framer-motion'

interface FeedbackFeedProps {
  sessionId: string | null
}

export default function FeedbackFeed({ sessionId }: FeedbackFeedProps) {
  const markersById = useMarkerStore(state => state.markersById)
  const orderedMarkerIds = useMarkerStore(state => state.orderedMarkerIds)
  const selectedMarkerId = useMarkerStore(state => state.selectedMarkerId)
  const getVisibleMarkers = useMarkerStore(state => state.getVisibleMarkers)
  const toggleCommandCenter = useUIStore(state => state.toggleCommandCenter)
  
  const participants = useMarkerStore(state => state.participants)
  const filters = useMarkerStore(state => state.filters)
  const setFilters = useMarkerStore(state => state.setFilters)

  const activeMarkers = getVisibleMarkers()

  // Tabs & dropdown states
  const [activeFeedTab, setActiveFeedTab] = useState<'feedback' | 'styles'>('feedback')
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const { edits, fetchEdits } = useDOMEditStore()

  useEffect(() => {
    if (sessionId) {
      fetchEdits(sessionId)
    }
  }, [sessionId, fetchEdits])

  const handleCardClick = (item: any) => {
    const pageUrl = item.page_url ?? item.pageUrl ?? undefined
    // Select marker
    useMarkerStore.getState().setSelectedMarkerId(item.id)
    
    // Dispatch message to workspace to navigate and open drawer
    window.postMessage({
      type: 'PIXELMARK_OPEN_CAPTURE',
      id: item.id,
      pageUrl
    }, '*')
  }

  // Filter logic including search term
  const filteredMarkers = activeMarkers
    .filter(m => {
      if (!searchTerm.trim()) return true
      const term = searchTerm.toLowerCase()
      const title = (m.title || '').toLowerCase()
      const desc = (m.description || '').toLowerCase()
      const creator = (m.creator_name || '').toLowerCase()
      return title.includes(term) || desc.includes(term) || creator.includes(term)
    })

  const hasActiveFilters = filters.creatorId !== 'all' || filters.status !== 'all' || filters.priority !== 'all' || searchTerm.trim() !== ''

  // Reset filters helper
  const handleResetFilters = () => {
    setFilters({ creatorId: 'all', status: 'all', priority: 'all' })
    setSearchTerm('')
  }

  return (
    <div className="w-full h-full bg-[#fcfbfa] flex flex-col z-40 select-none border-l border-slate-200/60">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-slate-200/60 flex items-center justify-between bg-white shadow-sm shadow-slate-100/10">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-[#D0E7E6]/40 border border-[#293681]/8 flex items-center justify-center flex-shrink-0">
            <Layers className="w-3.5 h-3.5 text-[#293681]" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs font-extrabold text-[#293681] truncate">Open Feedback</h3>
            <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Live session stream</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="px-2 py-0.5 rounded-full bg-[#D0E7E6]/50 border border-[#293681]/10 text-[9px] font-black text-[#293681] font-mono">
            {filteredMarkers.length} Pins
          </span>
          <button
            id="close-command-center-btn"
            onClick={() => toggleCommandCenter(false)}
            aria-label="Close Feedback Feed Drawer"
            className="w-7 h-7 rounded-lg border border-slate-200 text-slate-400 hover:text-[#293681] hover:bg-slate-50 transition-colors duration-200 lg:hidden flex items-center justify-center cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Command Center Tabs - Minimal Segmented tabs */}
      <div className="flex border-b border-slate-200/60 bg-slate-50/50 p-1 gap-1 flex-shrink-0">
        <button
          type="button"
          onClick={() => setActiveFeedTab('feedback')}
          className={cn(
            "flex-1 py-1.5 px-3 rounded-lg text-[9.5px] font-black uppercase tracking-wider transition-colors duration-200 text-center cursor-pointer flex items-center justify-center gap-1.5 focus:outline-none",
            activeFeedTab === 'feedback'
              ? "bg-white text-[#293681] border border-slate-200 shadow-sm"
              : "text-slate-500 hover:text-slate-800"
          )}
        >
          Feedback
          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[8.5px] font-bold text-slate-600">{filteredMarkers.length}</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveFeedTab('styles')}
          className={cn(
            "flex-1 py-1.5 px-3 rounded-lg text-[9.5px] font-black uppercase tracking-wider transition-colors duration-200 text-center flex items-center justify-center gap-1.5 cursor-pointer focus:outline-none",
            activeFeedTab === 'styles'
              ? "bg-white text-[#293681] border border-slate-200 shadow-sm"
              : "text-slate-500 hover:text-slate-800"
          )}
        >
          Style Edits
          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[8.5px] font-bold text-teal-600">{edits.length}</span>
        </button>
      </div>

      {activeFeedTab === 'feedback' && (
        <div className="px-4 py-3 border-b border-slate-200/60 bg-white flex items-center gap-2 flex-shrink-0 shadow-inner">
          {/* Compact Search */}
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter pins..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-[10.5px] font-bold text-[#1e2022] placeholder:text-slate-400 focus:bg-white outline-none transition-colors duration-200"
            />
          </div>

          {/* Single Collapsed Filters Trigger */}
          <div className="relative">
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={cn(
                "w-8 h-8 rounded-lg border flex items-center justify-center transition-colors duration-200 cursor-pointer shadow-sm relative",
                hasActiveFilters
                  ? "bg-[#D0E7E6]/40 border-[#293681]/30 text-[#293681]"
                  : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
              )}
              title="Filter Options"
            >
              <Filter className="w-3.5 h-3.5" />
              {hasActiveFilters && (
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#293681] ring-1 ring-white" />
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
                    className="absolute right-0 mt-2 w-56 rounded-xl bg-white border border-slate-200 shadow-xl z-55 p-3.5 flex flex-col gap-3 text-slate-700 select-none"
                  >
                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                      <span className="text-[9px] font-black uppercase tracking-wider text-[#293681]">Filter List</span>
                      {hasActiveFilters && (
                        <button 
                          onClick={handleResetFilters}
                          className="text-[8px] font-black text-rose-500 uppercase hover:underline cursor-pointer"
                        >
                          Reset
                        </button>
                      )}
                    </div>

                    {/* Reviewer Filter */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[8px] font-black uppercase tracking-wider text-slate-400">Author</label>
                      <select
                        value={filters.creatorId}
                        onChange={(e) => setFilters({ creatorId: e.target.value })}
                        className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[10.5px] font-bold outline-none cursor-pointer"
                      >
                        <option value="all">Everyone</option>
                        {Array.from(new Set(Object.values(markersById)
                          .filter(m => !m.is_deleted)
                          .map(m => m.creator_name || m.creator_id || 'Anonymous')
                          .filter(Boolean)
                        )).map(creator => (
                          <option key={creator} value={creator}>{creator}</option>
                        ))}
                      </select>
                    </div>

                    {/* Status Filter */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[8px] font-black uppercase tracking-wider text-slate-400">State</label>
                      <select
                        value={filters.status}
                        onChange={(e) => setFilters({ status: e.target.value as any })}
                        className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[10.5px] font-bold outline-none cursor-pointer"
                      >
                        <option value="all">All States</option>
                        <option value="open">Unresolved</option>
                        <option value="resolved">Resolved</option>
                      </select>
                    </div>

                    {/* Priority Filter */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[8px] font-black uppercase tracking-wider text-slate-400">Urgency</label>
                      <select
                        value={filters.priority}
                        onChange={(e) => setFilters({ priority: e.target.value as any })}
                        className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[10.5px] font-bold outline-none cursor-pointer"
                      >
                        <option value="all">All Priorities</option>
                        <option value="critical">Critical</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      {activeFeedTab === 'feedback' ? (
        /* Sidebar Feed List */
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-slate-50/50">
          {filteredMarkers.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-4 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                <Pin className="w-5 h-5 text-slate-300" />
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-[#293681]">No feedback pins</p>
                <p className="text-[9px] text-slate-400 max-w-[200px] leading-relaxed mx-auto font-medium">Click anywhere on the website preview canvas to place a feedback pin.</p>
              </div>
            </div>
          ) : (
            filteredMarkers
              .sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime())
              .map((item, idx) => {
                const isSelected = selectedMarkerId === item.id
                const markerNumber = orderedMarkerIds.indexOf(item.id) + 1
                
                let pathname = '/'
                const pageUrl = item.page_url ?? undefined
                if (pageUrl && pageUrl.trim()) {
                  try {
                    const parsed = new URL(pageUrl)
                    pathname = parsed.pathname + parsed.search
                  } catch {
                    pathname = pageUrl
                  }
                }

                const screenshotUrl = item.screenshot_url

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleCardClick(item)}
                    className={cn(
                      "w-full text-left p-3.5 rounded-xl border transition-colors duration-200 flex flex-col gap-2 focus:outline-none cursor-pointer shadow-sm relative overflow-hidden bg-white hover:bg-slate-50",
                      isSelected
                        ? "border-[#293681] bg-indigo-50/20"
                        : "border-slate-200/70"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2.5 w-full">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={cn(
                          "w-5 h-5 rounded-md flex items-center justify-center text-[9.5px] font-black text-white flex-shrink-0 shadow-sm",
                          item.status === 'resolved' ? 'bg-emerald-500' :
                          item.status === 'in_progress' ? 'bg-[#4382DF]' : 'bg-[#FFD5CD] text-[#293681]'
                        )}>
                          {markerNumber || idx + 1}
                        </span>
                        <span className="text-[11px] font-black text-[#293681] truncate max-w-[150px]">
                          {item.title || item.description || 'Pinned observation'}
                        </span>
                      </div>
                      <span className="text-[8.5px] font-bold text-slate-400 truncate">
                        {item.creator_name || 'Anonymous'}
                      </span>
                    </div>

                    {item.description && item.title && (
                      <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed pl-0.5 font-medium">
                        {item.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between gap-2 text-[8px] font-bold uppercase tracking-wider text-slate-400 mt-1 pl-0.5 font-mono">
                      <div className="flex items-center gap-1.5 truncate">
                        {screenshotUrl ? (
                          <svg className="w-3.5 h-3.5 text-[#4382DF] flex-shrink-0 opacity-80" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                        ) : (
                          <svg className="w-3.5 h-3.5 text-slate-200 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"></path></svg>
                        )}
                        <span className="truncate max-w-[120px] text-[#4382DF] font-bold" title={pageUrl}>
                          {pathname}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className={cn(
                          "px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-wider border",
                          item.status === 'resolved' 
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                            : item.status === 'in_progress'
                              ? 'bg-indigo-50 text-indigo-500 border-indigo-100'
                              : 'bg-rose-50 text-rose-500 border-rose-100'
                        )}>
                          {item.status || 'open'}
                        </span>
                        <span className="font-mono text-[7px] text-slate-400 font-black">{item.priority || 'medium'}</span>
                      </div>
                    </div>
                  </button>
                )
              })
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar min-h-0 flex flex-col bg-slate-50/50">
          <StyleEditsTab sessionId={sessionId || ''} />
        </div>
      )}
    </div>
  )
}
