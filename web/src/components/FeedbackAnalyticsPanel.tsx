'use client'

import React, { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { BarChart3, X, Loader2, Calendar, Users, Eye, Pin, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FeedbackAnalyticsPanelProps {
  sessionId: string | null
  onClose: () => void
}

type TabType = 'session' | 'project'

export default function FeedbackAnalyticsPanel({ sessionId, onClose }: FeedbackAnalyticsPanelProps) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('session')

  useEffect(() => {
    if (!sessionId) return
    let active = true
    setLoading(true)
    setError(null)

    api.sessions.getAnalytics(sessionId)
      .then((res) => {
        if (active) {
          setData(res)
          setLoading(false)
          console.log('[OBSERVABILITY] [ANALYTICS_LOADED] Analytics loaded successfully for session', sessionId)
        }
      })
      .catch((err) => {
        if (active) {
          setError(err.message || 'Failed to load analytics')
          setLoading(false)
          console.error('[OBSERVABILITY] [ANALYTICS_LOAD_FAILED] Analytics failed to load:', err)
        }
      })

    return () => {
      active = false
    }
  }, [sessionId])

  if (loading) {
    return (
      <div className="h-full bg-[#0a0a0f] border-r border-white/5 flex flex-col items-center justify-center space-y-4 p-6 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Loading Real-Time Analytics</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="h-full bg-[#0a0a0f] border-r border-white/5 flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
          <X className="w-6 h-6 text-rose-500" />
        </div>
        <p className="text-[10px] font-black uppercase tracking-widest text-rose-400">Failed to Load Metrics</p>
        <p className="text-[9.5px] text-white/35 max-w-[200px] leading-relaxed">{error || 'Unknown error'}</p>
        <button 
          onClick={() => window.location.reload()}
          className="h-9 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-[9px] uppercase tracking-widest transition-all"
        >
          Retry Load
        </button>
      </div>
    )
  }

  const metrics = activeTab === 'session' ? data.session : data.project
  const total = metrics.total_feedback

  // Normalizations & Rates
  const screenshotRatePercent = Math.round(metrics.screenshot_attachment_rate * 100)

  // Status mapping
  const statusLabels: Record<string, string> = {
    new: 'New',
    triaged: 'Triaged',
    in_progress: 'In Progress',
    resolved: 'Resolved',
    dismissed: 'Dismissed'
  }

  const statusColors: Record<string, { bg: string, text: string, border: string }> = {
    new: { bg: 'bg-teal-500/10', text: 'text-teal-400', border: 'border-teal-500/20' },
    triaged: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
    in_progress: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20' },
    resolved: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/20' },
    dismissed: { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/20' }
  }

  return (
    <div className="w-full h-full bg-[#0a0a0f] flex flex-col z-50 select-none border-r border-white/5">
      {/* Header */}
      <div className="p-5 border-b border-white/5 flex items-center justify-between bg-[#0d0d14]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest text-white">Feedback Analytics</h3>
            <p className="text-[8.5px] text-white/30 font-bold uppercase tracking-widest mt-0.5">Real Persisted Metrics</p>
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Close Analytics Panel"
          className="p-2 rounded-xl bg-white/5 border border-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all focus:ring-2 focus:ring-purple-500 outline-none flex items-center justify-center"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Session vs Project Tab Toggle */}
      <div className="p-4 bg-[#08080c] border-b border-white/5 flex gap-1.5">
        <button
          type="button"
          onClick={() => setActiveTab('session')}
          className={cn(
            "flex-1 h-8 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
            activeTab === 'session'
              ? "bg-purple-600 text-white shadow-lg"
              : "text-white/40 hover:text-white/70 hover:bg-white/5"
          )}
        >
          Session
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('project')}
          className={cn(
            "flex-1 h-8 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
            activeTab === 'project'
              ? "bg-purple-600 text-white shadow-lg"
              : "text-white/40 hover:text-white/70 hover:bg-white/5"
          )}
        >
          Project Wide
        </button>
      </div>

      {/* Metrics Stream */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
        {/* Core summary numbers */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/[0.02] border border-white/[0.05] p-4 rounded-2xl flex flex-col justify-between">
            <span className="text-[8px] font-black uppercase tracking-widest text-white/30">Total Created</span>
            <span className="text-3xl font-black text-white mt-2 font-mono">{total}</span>
          </div>
          <div className="bg-white/[0.02] border border-white/[0.05] p-4 rounded-2xl flex flex-col justify-between">
            <span className="text-[8px] font-black uppercase tracking-widest text-white/30">Screenshot Rate</span>
            <span className="text-3xl font-black text-purple-400 mt-2 font-mono">{screenshotRatePercent}%</span>
          </div>
        </div>

        {/* Status breakdown */}
        <div className="space-y-3">
          <h4 className="text-[9px] font-black uppercase tracking-widest text-white/40 pl-0.5">Status Workflow</h4>
          <div className="bg-white/[0.01] border border-white/[0.04] p-4 rounded-2xl space-y-3.5">
            {Object.entries(metrics.status_counts).map(([status, count]: [string, any]) => {
              const pct = total > 0 ? Math.round((count / total) * 100) : 0
              const label = statusLabels[status] || status
              const clr = statusColors[status] || { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' }
              return (
                <div key={status} className="space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] font-bold">
                    <div className="flex items-center gap-1.5">
                      <span className={cn("px-1.5 py-0.5 rounded text-[7px] font-black uppercase border", clr.bg, clr.text, clr.border)}>
                        {label}
                      </span>
                    </div>
                    <span className="text-white/40 font-mono">{count} <span className="text-[8px] text-white/20">({pct}%)</span></span>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className={cn("h-full rounded-full transition-all duration-500", clr.text.replace('text-', 'bg-'))} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Issue Type breakdown */}
        <div className="space-y-3">
          <h4 className="text-[9px] font-black uppercase tracking-widest text-white/40 pl-0.5">Issue Types</h4>
          <div className="bg-white/[0.01] border border-white/[0.04] p-4 rounded-2xl space-y-3">
            {Object.entries(metrics.issue_type_counts).map(([type, count]: [string, any]) => {
              const pct = total > 0 ? Math.round((count / total) * 100) : 0
              return (
                <div key={type} className="flex items-center justify-between text-[10.5px]">
                  <span className="text-white/50 capitalize font-bold">{type.replace('_', ' ')}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-white/30 font-mono text-[9px]">{pct}%</span>
                    <span className="w-8 text-right font-black text-white font-mono">{count}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Priority breakdown */}
        <div className="space-y-3">
          <h4 className="text-[9px] font-black uppercase tracking-widest text-white/40 pl-0.5">Priority Levels</h4>
          <div className="bg-white/[0.01] border border-white/[0.04] p-4 rounded-2xl grid grid-cols-2 gap-3.5">
            {Object.entries(metrics.priority_counts).map(([priority, count]: [string, any]) => {
              const clr = priority === 'critical' ? 'text-rose-400 bg-rose-500/10 border-rose-500/20' :
                          priority === 'high' ? 'text-orange-400 bg-orange-500/10 border-orange-500/20' :
                          priority === 'medium' ? 'text-purple-400 bg-purple-500/10 border-purple-500/20' :
                          'text-blue-400 bg-blue-500/10 border-blue-500/20'
              return (
                <div key={priority} className={cn("p-3 rounded-xl border flex flex-col justify-between gap-1.5", clr)}>
                  <span className="text-[8px] font-black uppercase tracking-wider capitalize">{priority}</span>
                  <span className="text-xl font-black font-mono leading-none">{count}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Activity & deletion rates */}
        <div className="space-y-3">
          <h4 className="text-[9px] font-black uppercase tracking-widest text-white/40 pl-0.5">Activity & Observability</h4>
          <div className="bg-white/[0.01] border border-white/[0.04] p-4 rounded-2xl space-y-4">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-white/50 font-bold flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-rose-500" /> Deleted Pins
              </span>
              <span className="font-black text-white font-mono text-xs">{metrics.marker_deletion_count}</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-white/50 font-bold flex items-center gap-2">
                <Users className="w-3.5 h-3.5 text-purple-400" /> Share Link Uses
              </span>
              <span className="font-black text-white font-mono text-xs">{metrics.share_link_usage_count}</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-white/50 font-bold flex items-center gap-2">
                <Eye className="w-3.5 h-3.5 text-cyan-400" /> Reviewer Page Visits
              </span>
              <span className="font-black text-white font-mono text-xs">{metrics.reviewer_visit_count}</span>
            </div>
          </div>
        </div>

        {/* Creation rate graph/list */}
        <div className="space-y-3">
          <h4 className="text-[9px] font-black uppercase tracking-widest text-white/40 pl-0.5">Marker Creation History</h4>
          <div className="bg-white/[0.01] border border-white/[0.04] p-4 rounded-2xl space-y-2.5">
            {metrics.marker_creation_rate.length === 0 ? (
              <p className="text-[9.5px] text-white/20 text-center py-2 font-bold uppercase tracking-widest">No activity recorded</p>
            ) : (
              metrics.marker_creation_rate.map((rate: any) => (
                <div key={rate.date} className="flex items-center justify-between text-[10px]">
                  <span className="text-white/40 flex items-center gap-2 font-mono">
                    <Calendar className="w-3 h-3 text-purple-500" /> {rate.date}
                  </span>
                  <span className="font-black text-white font-mono">{rate.count} pin{rate.count > 1 ? 's' : ''}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Active reviewer pages */}
        <div className="space-y-3 pb-4">
          <h4 className="text-[9px] font-black uppercase tracking-widest text-white/40 pl-0.5">Active Reviewer Pages</h4>
          <div className="bg-white/[0.01] border border-white/[0.04] p-4 rounded-2xl space-y-3">
            {metrics.reviewer_active_pages.length === 0 ? (
              <p className="text-[9.5px] text-white/20 text-center py-2 font-bold uppercase tracking-widest">No reviewer visits yet</p>
            ) : (
              metrics.reviewer_active_pages.map((item: any, idx: number) => {
                let displayPath = item.page_url
                try {
                  const parsed = new URL(item.page_url)
                  displayPath = parsed.pathname + parsed.search
                } catch(e) {}
                return (
                  <div key={item.page_url} className="flex items-start justify-between text-[10px] gap-4">
                    <span className="text-white/40 font-mono truncate max-w-[170px]" title={item.page_url}>
                      {displayPath}
                    </span>
                    <span className="font-black text-white font-mono flex-shrink-0">{item.visit_count} visit{item.visit_count > 1 ? 's' : ''}</span>
                  </div>
                )
              })
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
