'use client'

import React from 'react'
import { useCaptureStore } from '@/store/overlayStore'
import { useUIStore } from '@/store/uiStore'
import { useDOMEditStore } from '@/store/domEditStore'
import { StyleEditsTab } from '@/components/command-center/StyleEditsTab'
import { Layers, Pin, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FeedbackFeedProps {
  sessionId: string | null
}

export default function FeedbackFeed({ sessionId }: FeedbackFeedProps) {
  const captures = Object.values(useCaptureStore(state => state.capturesById))
  const captureOrder = useCaptureStore(state => state.captureOrder)
  const selectedCaptureId = useCaptureStore(state => state.selectedCaptureId)
  const listError = useCaptureStore(state => state.listError)
  const toggleCommandCenter = useUIStore(state => state.toggleCommandCenter)

  const activeCaptures = captures.filter(c => !c.deletedAt && c.visible !== false)

  // Tabs state
  const [activeFeedTab, setActiveFeedTab] = React.useState<'feedback' | 'styles'>('feedback')
  const { edits, fetchEdits } = useDOMEditStore()

  React.useEffect(() => {
    if (sessionId) {
      fetchEdits(sessionId)
    }
  }, [sessionId, fetchEdits])

  const handleCardClick = (item: any) => {
    console.log(`[FeedbackFeed] Clicked card id=${item.id} pageUrl=${item.pageUrl}`)
    // Dispatch message to workspace to navigate and open drawer
    window.postMessage({
      type: 'PIXELMARK_OPEN_CAPTURE',
      id: item.id,
      pageUrl: item.pageUrl
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
            {activeCaptures.length}
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
          Feedback ({activeCaptures.length})
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

      {activeFeedTab === 'feedback' ? (
        /* Sidebar Feed List */
        <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
          {listError ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                <span className="text-rose-500 text-xl">⚠️</span>
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-rose-400">Failed to load feed</p>
              <p className="text-[9.5px] text-white/40 max-w-[200px] leading-relaxed">{listError}</p>
            </div>
          ) : activeCaptures.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-white/[0.02] border border-white/[0.04] flex items-center justify-center">
                <Pin className="w-6 h-6 text-white/10" />
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/30">No feedback pins dropped yet</p>
              <p className="text-[9.5px] text-white/20 max-w-[200px] leading-relaxed">Click anywhere on the page to drop a feedback pin.</p>
            </div>
          ) : (
            activeCaptures
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .map((item, idx) => {
                const isSelected = selectedCaptureId === item.id
                const isFailed = item.status === 'failed'
                const isResolved = item.status === 'resolved' || item.status === 'dismissed'
                const isSubmitted = item.status !== 'draft' && item.status !== 'failed'
                
                const markerNumber = captureOrder.indexOf(item.id) + 1
                
                // Extract path from pageUrl
                let pathname = '/'
                try {
                  const parsed = new URL(item.pageUrl)
                  pathname = parsed.pathname + parsed.search
                } catch (e) {
                  pathname = item.pageUrl
                }

                const screenshotUrl = item.screenshotdataurl || item.screenshots?.cropDataUrl || item.screenshots?.fullPageDataUrl

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
                          isFailed ? "bg-rose-500" : getStatusColorClass(item.status)
                        )}>
                          {markerNumber || idx + 1}
                        </span>
                        <span className="text-[10.5px] font-black uppercase tracking-wider text-white truncate max-w-[130px]">
                          {item.title || 'Untitled Feedback'}
                        </span>
                      </div>
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[7px] font-black uppercase tracking-wider flex-shrink-0",
                        item.issueType === 'layout' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                        item.issueType === 'copy' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                        item.issueType === 'interaction' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                        item.issueType === 'navigation' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                        item.issueType === 'rendering' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                        'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                      )}>
                        {item.issueType || 'Other'}
                      </span>
                    </div>

                    {/* Comment description */}
                    {item.note && (
                      <p className="text-[10px] text-white/50 line-clamp-2 leading-relaxed pl-0.5">
                        {item.note}
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
                        <span className="truncate max-w-[100px] font-mono text-purple-400" title={item.pageUrl}>
                          {pathname}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className={cn(
                          "px-1.5 py-0.5 rounded text-[6.5px] font-black uppercase tracking-wider",
                          item.status === 'resolved' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                          item.status === 'dismissed' ? 'bg-slate-500/10 text-slate-400 border border-slate-500/20' :
                          item.status === 'in_progress' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
                          item.status === 'triaged' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                          'bg-teal-500/10 text-teal-400 border border-teal-500/20'
                        )}>
                          {item.status || 'new'}
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
