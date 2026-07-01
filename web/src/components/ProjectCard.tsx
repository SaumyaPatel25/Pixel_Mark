'use client'

import React, { useEffect, useState, useRef, useMemo } from 'react'
import { motion, useMotionValue, useSpring } from 'framer-motion'
import { Layout, Play, Share2, ExternalLink, Activity, FileText, Calendar, ShieldAlert } from 'lucide-react'
import { api } from '@/lib/api'

// Reusable premium SVG Sparkline Component
function Sparkline({ data }: { data: number[] }) {
  if (!data || !data.length) return <div className="w-24 h-8 bg-white/5 rounded-xl animate-pulse" />
  
  const max = Math.max(...data, 1)
  const min = Math.min(...data, 0)
  const range = max - min
  const width = 120, height = 36
  const step = width / (data.length - 1)
  
  const points = data.map((v, i) => `${i * step},${height - ((v - min) / range) * height}`).join(' ')
  const areaPoints = `0,${height} ${points} ${width},${height} 0,${height}`
  
  return (
    <div className="flex flex-col items-end gap-1">
      <svg width={width} height={height} className="overflow-visible">
        <defs>
          <linearGradient id="sparkAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
          </linearGradient>
        </defs>
        <motion.polyline 
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          fill="none" 
          stroke="#a78bfa" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          points={points} 
        />
        <motion.polygon 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          fill="url(#sparkAreaGrad)"
          points={areaPoints}
        />
      </svg>
      <span className="text-[7px] text-white/20 uppercase font-black tracking-widest mt-0.5">Auditing Trend</span>
    </div>
  )
}

// Reusable Circular Progress / Completion Ring Component
function ProgressRing({ resolved, total }: { resolved: number; total: number }) {
  const percent = total > 0 ? Math.round((resolved / total) * 100) : 0
  const r = 20, circ = 2 * Math.PI * r
  const dash = (percent / 100) * circ
  
  // Color guidelines: Success (Green), Pending (Amber), Zero/Idle (Slate)
  const color = total === 0 ? '#64748b' : percent === 100 ? '#10b981' : '#f59e0b'
  
  return (
    <div className="relative group/ring flex-shrink-0 flex items-center justify-center">
      <div className="absolute inset-0 rounded-full blur-lg opacity-10 transition-all group-hover/ring:opacity-30" style={{ background: color }} />
      <svg width="52" height="52" className="-rotate-90 relative z-10">
        <circle cx="26" cy="26" r={r} fill="none" stroke="rgba(255,255,255,0.02)" strokeWidth="3.5" />
        <motion.circle 
          cx="26" cy="26" r={r} fill="none" stroke={color} strokeWidth="3.5"
          initial={{ strokeDasharray: `0 ${circ}` }}
          animate={{ strokeDasharray: `${total > 0 ? dash : 0} ${circ}` }}
          transition={{ duration: 1.2, ease: "circOut" }}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
        {total > 0 ? (
          <span className="text-xs font-black tracking-tighter" style={{ color }}>
            {percent}%
          </span>
        ) : (
          <span className="text-[10px] font-black tracking-tighter text-slate-500">
            0
          </span>
        )}
      </div>
    </div>
  )
}

interface ProjectCardProps {
  project: any
  onClick: () => void
  sessionsCount?: number
  activeSessionsCount?: number
  markersCount?: number
  lastActivity?: string | null
  onOpenCanvas: (e: React.MouseEvent) => void
  onNewSession: (e: React.MouseEvent) => void
  onShare: (e: React.MouseEvent) => void
  analytics?: any
}

export function ProjectCard({
  project,
  onClick,
  sessionsCount = 0,
  activeSessionsCount = 0,
  markersCount = 0,
  lastActivity = null,
  onOpenCanvas,
  onNewSession,
  onShare,
  analytics: propAnalytics = null
}: ProjectCardProps) {
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const cardRef = useRef<HTMLDivElement>(null)

  const springX = useSpring(mouseX, { stiffness: 250, damping: 25 })
  const springY = useSpring(mouseY, { stiffness: 250, damping: 25 })

  function handleMouse(e: React.MouseEvent) {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    mouseX.set(e.clientX - rect.left)
    mouseY.set(e.clientY - rect.top)
  }

  // Support local analytics load if project.markers is not pre-populated (Task 8)
  const [localAnalytics, setLocalAnalytics] = useState<any>(propAnalytics)
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(!propAnalytics && (!project.markers || !project.markers.length))

  useEffect(() => {
    if (propAnalytics || (project.markers && project.markers.length)) {
      setIsLoadingAnalytics(false)
      return
    }
    let active = true
    const fetchAnalytics = async () => {
      try {
        const data = await api.projects.getAnalytics(project.id)
        if (active) {
          setLocalAnalytics(data)
          setIsLoadingAnalytics(false)
        }
      } catch (err) {
        if (active) setIsLoadingAnalytics(false)
      }
    }
    fetchAnalytics()
    return () => { active = false }
  }, [project.id, propAnalytics, project.markers])

  // Resolve metrics from either project.markers OR localAnalytics
  const metrics = useMemo(() => {
    if (project.markers && project.markers.length) {
      const total = project.markers.length
      const resolved = project.markers.filter((m: any) => m.status?.toLowerCase() === 'resolved').length
      const pending = total - resolved
      const critical = project.markers.filter(
        (m: any) => m.priority?.toLowerCase() === 'critical' && m.status?.toLowerCase() !== 'resolved'
      ).length
      
      const sorted = [...project.markers].sort(
        (a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
      const points: number[] = []
      let acc = 0
      sorted.forEach(() => {
        acc++
        points.push(acc)
      })
      while (points.length < 7) points.unshift(0)
      let activity = points
      if (points.length > 7) {
        const step = (points.length - 1) / 6
        activity = Array.from({ length: 7 }, (_, i) => points[Math.round(i * step)])
      }

      return { total, resolved, pending, critical, activity }
    } else if (localAnalytics) {
      return {
        total: localAnalytics.total || 0,
        resolved: localAnalytics.resolved || 0,
        pending: (localAnalytics.total || 0) - (localAnalytics.resolved || 0),
        critical: localAnalytics.by_severity?.P0 || 0,
        activity: localAnalytics.activity || [0, 0, 0, 0, 0, 0, 0]
      }
    }
    return {
      total: 0,
      resolved: 0,
      pending: 0,
      critical: 0,
      activity: [0, 0, 0, 0, 0, 0, 0]
    }
  }, [project.markers, localAnalytics])

  // Compute status badge
  const status = useMemo(() => {
    if (sessionsCount === 0 && metrics.total === 0) {
      return {
        label: 'Idle',
        color: 'text-slate-400 border-slate-500/10 bg-slate-500/5',
        dot: 'bg-slate-500'
      }
    }
    if (metrics.critical > 0 || (metrics.total > 0 && metrics.resolved / metrics.total < 0.4)) {
      return {
        label: 'At Risk',
        color: 'text-rose-400 border-rose-500/20 bg-rose-500/5',
        dot: 'bg-rose-500 shadow-[0_0_8px_#f43f5e]'
      }
    }
    return {
      label: 'Operational',
      color: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5',
      dot: 'bg-emerald-500 shadow-[0_0_8px_#10b981]'
    }
  }, [sessionsCount, metrics.total, metrics.critical, metrics.resolved])

  const activityData = metrics.activity

  return (
    <motion.div 
      layout
      ref={cardRef}
      onMouseMove={handleMouse}
      onClick={onClick}
      whileHover={{ y: -4 }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
      className="w-full cursor-pointer text-left bg-[#0c0c0e]/90 border border-white/5 rounded-[24px] p-6 transition-all group overflow-hidden relative shadow-2xl hover:shadow-purple-500/5 hover:border-white/10 focus:outline-none focus:border-purple-500/40"
    >
      {/* Spotlight Hover Glow Effect */}
      <motion.div 
        className="absolute inset-0 z-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{
          background: `radial-gradient(350px circle at ${springX}px ${springY}px, rgba(139, 92, 246, 0.07), transparent 50%)`
        }}
      />

      <div className="relative z-10 flex flex-col h-full justify-between gap-5">
        
        {/* ── TOP SECTION: TITLE, BADGES, PROGRESS RING ── */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              {/* Status Badge */}
              <div className={`inline-flex items-center gap-1.5 py-0.5 px-2.5 rounded-full border text-[9px] font-black uppercase tracking-wider ${status.color}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                {status.label}
              </div>
              
              {/* Domain Chip */}
              {project.url && (
                <div className="inline-flex items-center gap-1 py-0.5 px-2 rounded-full bg-white/[0.02] border border-white/5 text-[9px] font-bold text-white/40 group-hover:text-purple-400 group-hover:border-purple-500/10 transition-colors">
                  <span className="truncate max-w-[140px]">
                    {project.url.replace(/^https?:\/\//, '')}
                  </span>
                  <ExternalLink className="w-2 h-2 opacity-50 flex-shrink-0" />
                </div>
              )}
            </div>
            
            <h3 className="text-white font-black text-2xl tracking-tight leading-tight group-hover:text-purple-400 transition-colors truncate">
              {project.name}
            </h3>
            
            <p className="text-white/35 text-xs leading-normal line-clamp-1">
              {project.description || "No description provided for this project."}
            </p>
          </div>
          
          {/* Circular Progress Completion Ring */}
          <ProgressRing resolved={metrics.resolved} total={metrics.total} />
        </div>

        {/* ── MIDDLE SECTION: DETAILED PROGRESS & TREND GRAPH ── */}
        <div className="grid grid-cols-5 items-center gap-4 bg-white/[0.01] border border-white/[0.03] rounded-2xl p-4">
          {/* Progress Metrics text */}
          <div className="col-span-3 space-y-1">
            {metrics.total > 0 ? (
              <>
                <p className="text-[10px] text-white/35 uppercase font-black tracking-widest leading-none">
                  Completion Rate
                </p>
                <p className="text-base font-black text-white leading-none">
                  {metrics.resolved} / {metrics.total}{' '}
                  <span className="text-[11px] font-bold text-emerald-400/90 tracking-wide">
                    Resolved
                  </span>
                </p>
                {metrics.pending > 0 && (
                  <p className="text-[10px] font-medium text-amber-500/85">
                    {metrics.pending} pending issues waiting
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="text-[10px] text-white/30 uppercase font-black tracking-widest leading-none">
                  Substrate Health
                </p>
                <p className="text-xs font-bold text-white/50 leading-relaxed pt-0.5">
                  No markers logged yet
                </p>
              </>
            )}
          </div>
          
          {/* Mini Sparkline Graph */}
          <div className="col-span-2 flex justify-end">
            <Sparkline data={activityData} />
          </div>
        </div>

        {/* ── BOTTOM SECTION: METRICS GRID & CTAS ── */}
        <div className="flex items-center justify-between gap-4 pt-3 border-t border-white/[0.03] relative min-h-[40px]">
          
          {/* Quick Metrics */}
          <div className="flex items-center gap-4 text-[10px] font-bold text-white/40">
            <div className="flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 text-purple-400" />
              <span>
                <strong className="text-white/70 font-mono">{sessionsCount}</strong>{' '}
                {sessionsCount === 1 ? 'Session' : 'Sessions'}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <FileText className={`w-3.5 h-3.5 ${metrics.pending > 0 ? 'text-amber-500' : 'text-slate-500'}`} />
              <span>
                <strong className={`font-mono ${metrics.pending > 0 ? 'text-amber-400' : 'text-white/70'}`}>
                  {metrics.pending}
                </strong>{' '}
                Pending
              </span>
            </div>

            <div className="hidden sm:flex items-center gap-1 text-[9px] text-white/25">
              <Calendar className="w-3 h-3" />
              <span>{lastActivity ? `Active ${lastActivity}` : 'No reviews'}</span>
            </div>
          </div>

          {/* Quick Action Button Group (Slides left/fades in on hover) */}
          <div className="flex items-center gap-1.5 transition-all duration-300">
            {/* Primary Workspace CTA Button */}
            <span className="text-[10px] font-black uppercase bg-purple-600/10 border border-purple-500/25 text-purple-300 group-hover:bg-purple-600 group-hover:text-white px-4 py-1.5 rounded-xl transition-all select-none">
              Open Workspace →
            </span>

            {/* Quick Action Overlays */}
            <div className="absolute right-0 bottom-3 flex items-center gap-1 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-200 bg-[#0c0c0e] pl-4">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onOpenCanvas(e)
                }}
                title="Launch Canvas Sandbox"
                className="h-8 w-8 rounded-xl bg-purple-950/80 border border-purple-500/30 text-purple-400 hover:bg-purple-600 hover:text-white hover:border-purple-500 flex items-center justify-center transition-all active:scale-95"
              >
                <Layout className="w-3.5 h-3.5" />
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onNewSession(e)
                }}
                title="Start New Review Session"
                className="h-8 w-8 rounded-xl bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-600 hover:text-white hover:border-emerald-500 flex items-center justify-center transition-all active:scale-95"
              >
                <Play className="w-3.5 h-3.5" />
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onShare(e)
                }}
                title="Generate Client Share Link"
                className="h-8 w-8 rounded-xl bg-indigo-950/80 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-600 hover:text-white hover:border-indigo-500 flex items-center justify-center transition-all active:scale-95"
              >
                <Share2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

        </div>

      </div>
    </motion.div>
  )
}
