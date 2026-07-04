'use client'

import React from 'react'
import { useMarkerStore } from '@/store/markerStore'
import { useUIStore } from '@/store/uiStore'
import { useDOMEditStore } from '@/store/domEditStore'
import { StyleEditsTab } from '@/components/command-center/StyleEditsTab'
import { Layers, Pin, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getMarkerColors } from '@/lib/markerColors'

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

  // Tabs state
  const [activeFeedTab, setActiveFeedTab] = React.useState<'feedback' | 'styles'>('feedback')
  const { edits, fetchEdits } = useDOMEditStore()

  React.useEffect(() => {
    if (sessionId) {
      fetchEdits(sessionId)
    }
  }, [sessionId, fetchEdits])

  const handleCardClick = (item: any) => {
    console.log(`[FeedbackFeed] Clicked card id=${item.id} pageUrl=${item.page_url}`)
    
    // Select marker
    useMarkerStore.getState().setSelectedMarkerId(item.id)
    
    // Dispatch message to workspace to navigate and open drawer
    window.postMessage({
      type: 'PIXELMARK_OPEN_CAPTURE',
      id: item.id,
      pageUrl: item.page_url
    }, '*')
  }

  return (
    <div className="w-full h-full bg-[#0a0a0f] flex flex-col z-40 select-none">
      {/* Sidebar Header */}
      <div className="p-5 border-b border-white/5 flex items-center justify-between bg-[#0d0d14]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center">
            <Layers className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest text-white">Feedback Feed</h3>
            <p className="text-[8.5px] text-white/30 font-bold uppercase tracking-widest mt-0.5">Review Session Stream</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-[9px] font-black text-purple-400 font-mono">
            {activeMarkers.length}
          </span>
          <button
            id="close-command-center-btn"
            onClick={() => toggleCommandCenter(false)}
            aria-label="Close Feedback Feed Drawer"
            className="p-2 rounded-xl bg-white/5 border border-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all lg:hidden focus:ring-2 focus:ring-purple-500 outline-none flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Command Center Tabs */}
      <div className="flex border-b border-white/5 bg-[#09090e] select-none flex-shrink-0">
        <button
          type="button"
          onClick={() => setActiveFeedTab('feedback')}
          className={cn(
            "flex-1 py-3 text-[10px] font-black uppercase tracking-wider transition-all border-b-2 text-center cursor-pointer",
            activeFeedTab === 'feedback'
              ? "border-purple-500 text-white"
              : "border-transparent text-white/40 hover:text-white/60"
          )}
        >
          Feedback ({activeMarkers.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveFeedTab('styles')}
          className={cn(
            "flex-1 py-3 text-[10px] font-black uppercase tracking-wider transition-all border-b-2 text-center flex items-center justify-center gap-1.5 cursor-pointer",
            activeFeedTab === 'styles'
              ? "border-teal-500 text-white"
              : "border-transparent text-white/40 hover:text-white/60"
          )}
        >
          Style Edits
          <span className="px-1.5 py-0.5 rounded-full bg-white/5 text-[9px] font-bold text-teal-400">{edits.length}</span>
        </button>
      </div>

      {activeFeedTab === 'feedback' && (
        <div className="px-5 py-4 border-b border-white/5 bg-[#09090d] flex flex-col gap-3.5 select-none flex-shrink-0">
          {/* Presence Bar */}
          {participants.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[8px] font-black uppercase tracking-widest text-white/30">Active Reviewers</span>
              <div className="flex items-center gap-2 flex-wrap">
                {participants.map(p => {
                  const colors = getMarkerColors(p.color_token)
                  const initials = p.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() || '?'
                  return (
                    <div
                      key={p.id}
                      title={`${p.name} (${p.role}) - ${p.is_online ? 'Online' : 'Offline'}`}
                      className={cn(
                        "w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-black border transition-all relative",
                        p.is_online ? "ring-2 ring-green-500/40" : "opacity-45"
                      )}
                      style={{
                        backgroundColor: colors.bg,
                        borderColor: colors.border,
                        color: colors.text
                      }}
                    >
                      {initials}
                      <span className={cn(
                        "absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-[#0a0a0f]",
                        p.is_online ? "bg-green-500" : "bg-neutral-500"
                      )} />
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Filter Dropdowns */}
          <div className="grid grid-cols-3 gap-2">
            {/* Reviewer Filter */}
            <div className="flex flex-col gap-1 min-w-0">
              <label htmlFor="reviewer-filter" className="text-[8px] font-black uppercase tracking-widest text-white/30 truncate">Reviewer</label>
              <select
                id="reviewer-filter"
                value={filters.creatorId}
                onChange={(e) => setFilters({ creatorId: e.target.value })}
                className="bg-[#12121a] border border-white/10 text-white/80 rounded-xl px-2 py-1.5 text-[9px] font-bold focus:outline-none focus:border-purple-500 cursor-pointer"
              >
                <option value="all">All</option>
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
            <div className="flex flex-col gap-1 min-w-0">
              <label htmlFor="status-filter" className="text-[8px] font-black uppercase tracking-widest text-white/30 truncate">Status</label>
              <select
                id="status-filter"
                value={filters.status}
                onChange={(e) => setFilters({ status: e.target.value as any })}
                className="bg-[#12121a] border border-white/10 text-white/80 rounded-xl px-2 py-1.5 text-[9px] font-bold focus:outline-none focus:border-purple-500 cursor-pointer"
              >
                <option value="all">All</option>
                <option value="open">Open</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>

            {/* Priority Filter */}
            <div className="flex flex-col gap-1 min-w-0">
              <label htmlFor="priority-filter" className="text-[8px] font-black uppercase tracking-widest text-white/30 truncate">Priority</label>
              <select
                id="priority-filter"
                value={filters.priority}
                onChange={(e) => setFilters({ priority: e.target.value as any })}
                className="bg-[#12121a] border border-white/10 text-white/80 rounded-xl px-2 py-1.5 text-[9px] font-bold focus:outline-none focus:border-purple-500 cursor-pointer"
              >
                <option value="all">All</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {activeFeedTab === 'feedback' ? (
        /* Sidebar Feed List */
        <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
          {activeMarkers.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-white/[0.02] border border-white/[0.04] flex items-center justify-center">
                <Pin className="w-6 h-6 text-white/10" />
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/30">No feedback pins dropped yet</p>
              <p className="text-[9.5px] text-white/20 max-w-[200px] leading-relaxed">Click anywhere on the page to drop a feedback pin.</p>
            </div>
          ) : (
            activeMarkers
              .sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime())
              .map((item, idx) => {
                const isSelected = selectedMarkerId === item.id
                const isResolved = item.status === 'resolved'
                
                const markerNumber = orderedMarkerIds.indexOf(item.id) + 1
                
                // Extract path from pageUrl safely
                let pathname = '/'
                const pageUrl = item.page_url
                if (typeof pageUrl === 'string' && pageUrl.trim() !== '') {
                  try {
                    const parsed = new URL(pageUrl)
                    pathname = parsed.pathname + parsed.search
                  } catch (e) {
                    pathname = pageUrl || '/'
                  }
                }

                const screenshotUrl = item.screenshot_url

                const getStatusColorClass = (status: string) => {
                  const s = (status || '').toLowerCase()
                  if (s === 'resolved') return 'bg-green-500'
                  if (s === 'dismissed') return 'bg-slate-500'
                  if (s === 'in_progress') return 'bg-orange-500'
                  if (s === 'triaged') return 'bg-purple-500'
                  if (s === 'new' || s === 'submitted' || s === 'open') return 'bg-teal-500'
                  return 'bg-purple-600'
                }

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleCardClick(item)}
                    className={cn(
                      "w-full text-left p-4 rounded-2xl border transition-all flex flex-col gap-3 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer",
                      isSelected
                        ? "bg-purple-950/20 border-purple-500/40 shadow-lg shadow-purple-950/20"
                        : "bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.04] hover:border-white/[0.08]"
                    )}
                  >
                    {/* Top metadata row */}
                    <div className="flex items-start justify-between gap-2 w-full">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={cn(
                          "w-5.5 h-5.5 rounded-full flex items-center justify-center text-[10px] font-black text-white flex-shrink-0",
                          getStatusColorClass(item.status)
                        )}>
                          {markerNumber || idx + 1}
                        </span>
                        <span className="text-[10.5px] font-black uppercase tracking-wider text-white truncate max-w-[130px]">
                          {item.title || 'Untitled Feedback'}
                        </span>
                      </div>
                      <span className="text-[8px] font-bold text-white/40 truncate">
                        {item.creator_name || 'Anonymous'}
                      </span>
                    </div>

                    {/* Comment description */}
                    {item.description && (
                      <p className="text-[10px] text-white/50 line-clamp-2 leading-relaxed pl-0.5">
                        {item.description}
                      </p>
                    )}

                    {/* Bottom row: screenshot indicator, route, priority */}
                    <div className="flex items-center justify-between gap-2 text-[8px] font-bold uppercase tracking-widest text-white/30 mt-1 pl-0.5">
                      <div className="flex items-center gap-1.5 truncate">
                        {screenshotUrl ? (
                          <svg className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                        ) : (
                          <svg className="w-3.5 h-3.5 text-white/10 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"></path></svg>
                        )}
                        <span className="truncate max-w-[100px] font-mono text-purple-400" title={item.page_url}>
                          {pathname}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className={cn(
                          "px-1.5 py-0.5 rounded text-[6.5px] font-black uppercase tracking-wider",
                          item.status === 'resolved' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                          'bg-teal-500/10 text-teal-400 border border-teal-500/20'
                        )}>
                          {item.status || 'open'}
                        </span>
                        <span className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          item.priority === 'critical' ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]' :
                          item.priority === 'high' ? 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.4)]' :
                          item.priority === 'medium' ? 'bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.4)]' :
                          'bg-blue-500'
                        )} />
                        <span>{item.priority || 'medium'}</span>
                      </div>
                    </div>
                  </button>
                )
              })
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar min-h-0 flex flex-col">
          <StyleEditsTab sessionId={sessionId || ''} />
        </div>
      )}
    </div>
  )
}
