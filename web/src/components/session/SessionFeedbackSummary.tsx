'use client'

import React, { useMemo, useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, Activity, CheckCircle2, Circle, AlertCircle, BarChart3, LineChart } from 'lucide-react'
import { Marker } from '@/types/markers'
import SessionActivityChart from './SessionActivityChart'

interface SessionFeedbackSummaryProps {
  sessionId: string | null
  sessionTitle?: string
}

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '')
const WS_BASE = API_BASE.replace(/^https:/, 'wss:').replace(/^http:/, 'ws:')

export function useSessionLiveStats(sessionId: string | null) {
  const [markers, setMarkers] = useState<Marker[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!sessionId) {
      setMarkers([])
      return
    }

    let active = true
    setIsLoading(true)

    // Fetch initial markers
    api.markers.list(sessionId).then((data) => {
      if (active && Array.isArray(data)) {
        setMarkers(data.filter((m) => !m.is_deleted))
        setIsLoading(false)
      }
    }).catch(() => {
      if (active) setIsLoading(false)
    })

    // Connect to WebSocket for this session
    const wsUrl = `${WS_BASE}/ws/sessions/${sessionId}?client_kind=browser`
    const ws = new WebSocket(wsUrl)

    ws.onmessage = (event) => {
      try {
        if (event.data === 'pong') return
        const parsed = JSON.parse(event.data)
        if (!active) return

        if (
          parsed.type === 'marker_created' ||
          parsed.type === 'marker_updated' ||
          parsed.type === 'marker_resolved'
        ) {
          const marker = parsed.data?.marker
          if (marker) {
            setMarkers((prev) => {
              if (marker.is_deleted) {
                return prev.filter((m) => m.id !== marker.id)
              }
              const idx = prev.findIndex((m) => m.id === marker.id)
              if (idx !== -1) {
                const next = [...prev]
                next[idx] = marker
                return next
              } else {
                return [...prev, marker]
              }
            })
          }
        } else if (parsed.type === 'marker_deleted') {
          if (parsed.marker_id) {
            setMarkers((prev) => prev.filter((m) => m.id !== parsed.marker_id))
          }
        } else if (parsed.type === 'session_snapshot') {
          if (Array.isArray(parsed.data?.markers)) {
            setMarkers(parsed.data.markers.filter((m: any) => !m.is_deleted))
          }
        }
      } catch (err) {
        console.error('[SessionLiveStats WS] Message error:', err)
      }
    }

    return () => {
      active = false
      ws.close()
    }
  }, [sessionId])

  return useMemo(() => {
    const total = markers.length
    let resolved = 0
    let inProgress = 0
    let open = 0

    const participantMap: Record<string, {
      participantId: string
      displayName: string
      color: string
      role: 'reviewer' | 'developer'
      count: number
      resolvedCount: number
    }> = {}

    markers.forEach((m) => {
      // Status counts
      if (m.status === 'resolved') {
        resolved++
      } else if (m.status === 'in_progress' || m.status === 'triaged') {
        inProgress++
      } else {
        open++
      }

      // Participant mapping
      const pId = m.creator_id || 'anonymous-guest'
      const pName = m.creator_name || 'Anonymous Reviewer'
      const pColor = m.color_token || '#8b5cf6'
      const pRole = m.creator_role || 'reviewer'

      if (!participantMap[pId]) {
        participantMap[pId] = {
          participantId: pId,
          displayName: pName,
          color: pColor,
          role: pRole,
          count: 0,
          resolvedCount: 0
        }
      }

      participantMap[pId].count++
      if (m.status === 'resolved') {
        participantMap[pId].resolvedCount++
      }
    })

    const completionPercent = total > 0 ? Math.round((resolved / total) * 100) : 0
    const byParticipant = Object.values(participantMap).sort((a, b) => b.count - a.count)

    return {
      total,
      resolved,
      inProgress,
      open,
      completionPercent,
      byParticipant,
      isLoading,
      markers
    }
  }, [markers, isLoading])
}

// ─── Circular Progress Donut ────────────────────────────────────────────────
function DetailedCompletionRing({ percent }: { percent: number }) {
  const radius = 38
  const stroke = 6.5
  const normalizedRadius = radius - stroke * 2
  const circumference = normalizedRadius * 2 * Math.PI
  const strokeDashoffset = circumference - (percent / 100) * circumference

  return (
    <div className="relative flex items-center justify-center w-24 h-24 flex-shrink-0 select-none">
      <svg className="w-full h-full transform -rotate-90">
        <circle
          className="text-pm-border-bright/40"
          strokeWidth={stroke}
          stroke="currentColor"
          fill="transparent"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <motion.circle
          className="text-emerald-500"
          strokeWidth={stroke}
          strokeDasharray={circumference + ' ' + circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center text-center">
        <span className="text-base font-black text-pm-text leading-none tabular-nums">{percent}%</span>
        <span className="text-[7.5px] text-pm-muted font-mono font-bold uppercase tracking-wider mt-0.5 leading-none">Done</span>
      </div>
    </div>
  )
}

export default function SessionFeedbackSummary({ sessionId, sessionTitle }: SessionFeedbackSummaryProps) {
  const stats = useSessionLiveStats(sessionId)
  const [activeTab, setActiveTab] = useState<'metrics' | 'timeline'>('metrics')

  // Reset tab to overview on session change
  useEffect(() => {
    setActiveTab('metrics')
  }, [sessionId])

  if (!sessionId) {
    return (
      <div className="bg-pm-surface border border-pm-border rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center text-center space-y-3 min-h-[300px]">
        <div className="w-10 h-10 rounded-xl bg-pm-surface-2 border border-pm-border flex items-center justify-center text-pm-muted">
          <Activity className="w-5 h-5" />
        </div>
        <p className="text-xs font-bold text-pm-text">Select a session to view analytics</p>
      </div>
    )
  }

  if (stats.isLoading) {
    return (
      <div className="bg-pm-surface border border-pm-border rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center text-center space-y-3 min-h-[300px]">
        <span className="w-6 h-6 border-2 border-pm-accent border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-bold text-pm-muted uppercase font-mono tracking-wider">Loading Analytics...</p>
      </div>
    )
  }

  if (stats.total === 0) {
    return (
      <div className="bg-pm-surface border border-pm-border rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center text-center space-y-4 min-h-[300px] select-none">
        <div className="w-10 h-10 rounded-xl bg-pm-accent-subtle border border-pm-border flex items-center justify-center text-pm-accent">
          <Activity className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <h4 className="text-xs font-bold text-pm-text">No observations in this session</h4>
          <p className="text-[10px] text-pm-muted max-w-xs leading-relaxed uppercase tracking-wider font-semibold">
            Pins will appear here in real-time as reviewers add feedback.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-pm-surface border border-pm-border rounded-3xl p-6 shadow-md hover:shadow-lg transition-all space-y-6 select-none flex flex-col justify-between relative overflow-hidden min-h-[360px]">
      {/* Glow highlight */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-400 via-[#253B80] to-indigo-500" />

      {/* Header with Title and Page Tabs */}
      <div className="border-b border-pm-border pb-4 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-[9px] font-black uppercase tracking-widest text-pm-muted">
            Live Session Analytics
          </h3>
          <p className="text-sm font-black text-pm-text mt-0.5 truncate">
            {sessionTitle || 'Active Review'}
          </p>
        </div>

        {/* Tab pagination buttons */}
        <div className="flex bg-pm-surface-2 p-0.5 rounded-xl border border-pm-border flex-shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('metrics')}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'metrics'
                ? 'bg-pm-surface text-pm-accent shadow-sm'
                : 'text-pm-muted hover:text-pm-text'
            }`}
          >
            <BarChart3 className="w-3 h-3" />
            Metrics
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('timeline')}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'timeline'
                ? 'bg-pm-surface text-pm-accent shadow-sm'
                : 'text-pm-muted hover:text-pm-text'
            }`}
          >
            <LineChart className="w-3 h-3" />
            Timeline
          </button>
        </div>
      </div>

      {/* Interactive animated pages */}
      <div className="flex-1 flex flex-col justify-center">
        <AnimatePresence mode="wait">
          {activeTab === 'metrics' ? (
            <motion.div
              key="metrics-page"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12 }}
              transition={{ duration: 0.2 }}
              className="space-y-6 flex-1 flex flex-col justify-between"
            >
              {/* Completion Donut & Stats */}
              <div className="flex items-center gap-6 bg-pm-surface-2 border border-pm-border rounded-2xl p-5 shadow-inner">
                <DetailedCompletionRing percent={stats.completionPercent} />
                <div className="space-y-3 min-w-0 flex-1">
                  <div>
                    <h4 className="text-[9px] font-black uppercase tracking-wider text-pm-muted">
                      Resolution Progress
                    </h4>
                    <p className="text-sm font-black text-pm-text mt-0.5 whitespace-nowrap">
                      {stats.resolved} of {stats.total} resolved
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-1.5">
                    <div className="flex items-center justify-between text-[10px] font-bold text-pm-text uppercase tracking-wider">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm" />
                        Resolved
                      </span>
                      <span className="font-mono text-xs">{stats.resolved}</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-bold text-pm-text uppercase tracking-wider">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-pm-accent shadow-sm" />
                        In Progress
                      </span>
                      <span className="font-mono text-xs">{stats.inProgress}</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-bold text-pm-text uppercase tracking-wider">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-500 shadow-sm" />
                        Open
                      </span>
                      <span className="font-mono text-xs">{stats.open}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contributors list */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-pm-border pb-2">
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-pm-muted flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-pm-accent" />
                    Contributors
                  </h4>
                  <span className="text-[9px] font-mono text-pm-muted uppercase font-bold">
                    Pins
                  </span>
                </div>

                <div className="space-y-2.5 max-h-[160px] overflow-y-auto pr-1">
                  {stats.byParticipant.map((p) => {
                    const initials = p.displayName
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .substring(0, 2)
                      .toUpperCase() || '?'

                    return (
                      <div
                        key={p.participantId}
                        className="flex items-center justify-between bg-pm-surface border border-pm-border rounded-2xl px-4 py-2.5 shadow-sm hover:border-pm-border-bright hover:shadow-md transition-all duration-200"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className="w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black text-white shadow-md flex-shrink-0"
                            style={{ backgroundColor: p.color }}
                          >
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-pm-text truncate max-w-[130px] sm:max-w-none">
                              {p.displayName}
                            </p>
                            <p className="text-[8px] font-mono uppercase tracking-wider text-pm-muted -mt-0.5">
                              {p.role}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-[9px] font-mono text-pm-muted font-bold uppercase tracking-wider">
                            {p.resolvedCount} / {p.count}
                          </span>
                          <span className="text-xs font-black text-pm-accent bg-pm-accent-subtle border border-pm-border px-2 py-0.5 rounded-lg min-w-[28px] text-center shadow-sm">
                            {p.count}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="timeline-page"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.2 }}
              className="flex-1 flex flex-col justify-center"
            >
              <SessionActivityChart markers={stats.markers} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
