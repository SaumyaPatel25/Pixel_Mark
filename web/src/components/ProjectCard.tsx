'use client'

import React, { useEffect, useState, useRef, useMemo } from 'react'
import { motion, useMotionValue, useSpring, AnimatePresence } from 'framer-motion'
import { Layout, Play, Share2, ExternalLink, Activity, FileText, Calendar, ShieldAlert, Trash2, AlertTriangle, Loader2 } from 'lucide-react'
import { api } from '@/lib/api'
import { useThemeStore } from '@/store/themeStore'

function useIsDarkTheme() {
  const theme = useThemeStore((state) => state.theme)
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    if (theme === 'dark') {
      setIsDark(true)
    } else if (theme === 'light') {
      setIsDark(false)
    } else {
      setIsDark(window.matchMedia('(prefers-color-scheme: dark)').matches)
    }
  }, [theme])

  return isDark
}

// Reusable premium SVG Sparkline Component
function Sparkline({ data, isDark }: { data: number[]; isDark: boolean }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)
  
  if (!data || !data.length) return <div className="w-24 h-8 bg-pm-accent-subtle rounded-xl animate-pulse" />
  
  const max = Math.max(...data, 1)
  const min = Math.min(...data, 0)
  const range = max - min
  const width = 120, height = 36
  const step = width / (data.length - 1)
  
  const points = data.map((v, i) => `${i * step},${height - ((v - min) / range) * height}`).join(' ')
  const areaPoints = `0,${height} ${points} ${width},${height} 0,${height}`
  
  return (
    <div className="flex flex-col items-end gap-1 relative group/spark">
      {/* Interactive Tooltip Overlay */}
      {hoveredIdx !== null && (
        <div className="absolute -top-7 right-0 bg-pm-surface border border-pm-border text-[9px] font-bold px-1.5 py-0.5 rounded shadow-lg pointer-events-none z-30 font-mono text-pm-accent flex items-center gap-1 transition-all">
          <span>{data[hoveredIdx]}</span>
          <span className="text-pm-muted">logged</span>
        </div>
      )}
      
      <svg 
        width={width} 
        height={height} 
        className="overflow-visible cursor-crosshair"
        onMouseLeave={() => setHoveredIdx(null)}
      >
        <defs>
          <linearGradient id="sparkAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--pm-accent)" stopOpacity={isDark ? 0.2 : 0.12} />
            <stop offset="100%" stopColor="var(--pm-accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        
        {/* Glow backdrop shadow for dark mode */}
        {isDark && (
          <motion.polyline 
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.35 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            fill="none" 
            stroke="var(--pm-accent)" 
            strokeWidth="4" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            points={points} 
            className="blur-sm"
          />
        )}

        <motion.polyline 
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          fill="none" 
          stroke="var(--pm-accent)" 
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
        
        {/* Tracking crosshair */}
        {hoveredIdx !== null && (
          <>
            <line 
              x1={hoveredIdx * step} 
              y1={0} 
              x2={hoveredIdx * step} 
              y2={height} 
              stroke="var(--pm-border)" 
              strokeWidth="0.75" 
              strokeDasharray="2,2" 
            />
            <circle 
              cx={hoveredIdx * step} 
              cy={height - ((data[hoveredIdx] - min) / range) * height} 
              r="3.5" 
              fill="var(--pm-accent)" 
              stroke="var(--pm-surface)" 
              strokeWidth="1.5" 
              className={isDark ? "shadow-[0_0_8px_var(--pm-accent)]" : "shadow-sm"}
            />
          </>
        )}

        {/* Hover trigger zones zone */}
        {data.map((_, i) => (
          <rect
            key={i}
            x={i * step - step / 2}
            y={0}
            width={step}
            height={height}
            fill="transparent"
            className="cursor-crosshair"
            onMouseEnter={() => setHoveredIdx(i)}
            onMouseMove={() => setHoveredIdx(i)}
          />
        ))}
      </svg>
      <span className="text-[7px] text-pm-muted uppercase font-black tracking-widest mt-0.5 font-sans">Auditing Trend</span>
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
      <div className="absolute inset-0 rounded-full blur-lg opacity-5 transition-all group-hover/ring:opacity-15" style={{ background: color }} />
      <svg width="52" height="52" className="-rotate-90 relative z-10">
        <circle cx="26" cy="26" r={r} fill="none" stroke="var(--pm-border)" strokeWidth="3.5" />
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
          <span className="text-xs font-black tracking-tighter font-sans" style={{ color }}>
            {percent}%
          </span>
        ) : (
          <span className="text-[10px] font-black tracking-tighter text-slate-400 font-sans">
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
  onDelete?: (e: React.MouseEvent) => Promise<void>
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
  onDelete,
  analytics: propAnalytics = null
}: ProjectCardProps) {
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const cardRef = useRef<HTMLDivElement>(null)
  const [deleteStep, setDeleteStep] = useState<'idle' | 'confirm' | 'deleting'>('idle')

  const springX = useSpring(mouseX, { stiffness: 250, damping: 25 })
  const springY = useSpring(mouseY, { stiffness: 250, damping: 25 })

  function handleMouse(e: React.MouseEvent) {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    mouseX.set(e.clientX - rect.left)
    mouseY.set(e.clientY - rect.top)
  }

  // Support local analytics load if project.markers is not pre-populated
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
        color: 'text-pm-muted border-pm-border bg-pm-surface-2',
        dot: 'bg-pm-muted'
      }
    }
    if (metrics.critical > 0 || (metrics.total > 0 && metrics.resolved / metrics.total < 0.4)) {
      return {
        label: 'At Risk',
        color: 'text-rose-500 border-rose-500/20 bg-rose-500/10',
        dot: 'bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.4)]'
      }
    }
    return {
      label: 'Operational',
      color: 'text-emerald-500 border-emerald-500/20 bg-emerald-500/10',
      dot: 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)]'
    }
  }, [sessionsCount, metrics.total, metrics.critical, metrics.resolved])

  const activityData = metrics.activity
  const isDark = useIsDarkTheme()

  return (
    <motion.div 
      layout
      ref={cardRef}
      onMouseMove={handleMouse}
      onClick={onClick}
      whileHover={{ y: -3 }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
      className="w-full cursor-pointer text-left bg-pm-surface border border-pm-border rounded-[24px] p-6 transition-all group overflow-hidden relative shadow-sm hover:shadow-md hover:shadow-black/5 hover:border-pm-border-bright focus:outline-none focus:border-pm-accent"
    >
      {/* Spotlight Hover Glow Effect */}
      <motion.div 
        className="absolute inset-0 z-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{
          background: `radial-gradient(350px circle at ${springX}px ${springY}px, var(--pm-accent-glow), transparent 50%)`
        }}
      />

      <div className="relative z-10 flex flex-col h-full justify-between gap-5">
        
        {/* ── TOP SECTION: TITLE, BADGES, PROGRESS RING ── */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              {/* Status Badge */}
              <div className={`inline-flex items-center gap-1.5 py-0.5 px-2.5 rounded-full border text-[9px] font-bold uppercase tracking-wider ${status.color}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                {status.label}
              </div>
              
              {/* Domain Chip */}
              {project.url && (
                <div className="inline-flex items-center gap-1 py-0.5 px-2 rounded-full bg-pm-accent-subtle border border-pm-border text-[9px] font-bold text-pm-muted group-hover:text-pm-accent group-hover:border-pm-border-bright transition-colors">
                  <span className="truncate max-w-[140px]">
                    {project.url.replace(/^https?:\/\//, '')}
                  </span>
                  <ExternalLink className="w-2.5 h-2.5 opacity-50 flex-shrink-0" />
                </div>
              )}
            </div>
            
            <h3 className="text-pm-text font-extrabold text-xl tracking-tight leading-tight group-hover:text-pm-accent transition-colors truncate">
              {project.name}
            </h3>
            
            <p className="text-pm-muted text-xs leading-normal line-clamp-1">
              {project.description || "No description provided for this project."}
            </p>
          </div>
          
          {/* Circular Progress Completion Ring */}
          <ProgressRing resolved={metrics.resolved} total={metrics.total} />
        </div>

        {/* ── MIDDLE SECTION: DETAILED PROGRESS & TREND GRAPH ── */}
        <div className="grid grid-cols-5 items-center gap-4 bg-pm-surface-2 border border-pm-border rounded-2xl p-4">
          {/* Progress Metrics text */}
          <div className="col-span-3 space-y-1">
            {metrics.total > 0 ? (
              <>
                <p className="text-[10px] text-pm-muted uppercase font-bold tracking-widest leading-none">
                  Completion Rate
                </p>
                <p className="text-base font-extrabold text-pm-text leading-none">
                  {metrics.resolved} / {metrics.total}{' '}
                  <span className="text-[11px] font-bold text-emerald-500 tracking-wide ml-1">
                    Resolved
                  </span>
                </p>
                {!isDark && metrics.pending > 0 && (
                  <p className="text-[10px] font-bold text-amber-500 mt-0.5 font-sans">
                    {metrics.pending} pending issues waiting
                  </p>
                )}
                {isDark && (
                  <>
                    <div className="w-full bg-pm-bg/60 h-1.5 rounded-full overflow-hidden border border-pm-border/30 mt-2">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(metrics.resolved / metrics.total) * 100}%` }}
                        transition={{ duration: 1, delay: 0.2 }}
                        className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full shadow-[0_0_8px_#10b981]"
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                      {metrics.critical > 0 && (
                        <span className="text-[8px] font-black uppercase text-rose-400 bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 rounded-md font-sans">
                          {metrics.critical} P0
                        </span>
                      )}
                      {metrics.pending > 0 && (
                        <span className="text-[8px] font-black uppercase text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-md font-sans">
                          {metrics.pending} Open
                        </span>
                      )}
                      <span className="text-[8px] font-black uppercase text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-md font-sans">
                        {metrics.resolved} Fixed
                      </span>
                    </div>
                  </>
                )}
              </>
            ) : (
              <>
                <p className="text-[10px] text-pm-muted uppercase font-bold tracking-widest leading-none">
                  Workspace Status
                </p>
                <p className="text-xs font-bold text-pm-muted leading-relaxed pt-0.5">
                  No markers logged yet
                </p>
              </>
            )}
          </div>
          
          {/* Mini Sparkline Graph */}
          <div className="col-span-2 flex justify-end">
            <Sparkline data={activityData} isDark={isDark} />
          </div>
        </div>

        {/* ── BOTTOM SECTION: METRICS GRID & CTAS ── */}
        <div className="flex items-center justify-between gap-4 pt-3 border-t border-pm-border relative min-h-[40px]">
          
          {/* Quick Metrics */}
          <div className="flex items-center gap-4 text-[10px] font-bold text-pm-muted">
            <div className="flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 text-pm-accent" />
              <span>
                <strong className="text-pm-text font-mono">{sessionsCount}</strong>{' '}
                {sessionsCount === 1 ? 'Session' : 'Sessions'}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <FileText className={`w-3.5 h-3.5 ${metrics.pending > 0 ? 'text-amber-500' : 'text-pm-muted/60'}`} />
              <span>
                <strong className={`font-mono ${metrics.pending > 0 ? 'text-amber-500' : 'text-pm-text'}`}>
                  {metrics.pending}
                </strong>{' '}
                Pending
              </span>
            </div>

            <div className="hidden sm:flex items-center gap-1 text-[9px] text-pm-muted/60 font-mono">
              <Calendar className="w-3 h-3" />
              <span>{lastActivity ? `Active ${lastActivity}` : 'No reviews'}</span>
            </div>
          </div>

          {/* Quick Action Button Group */}
          <div className="flex items-center gap-1.5">
            {/* Primary Workspace CTA Button */}
            <span 
              id="onboarding-open-workspace-btn" 
              className="text-[10px] font-extrabold uppercase bg-pm-accent-subtle border border-pm-border text-pm-accent px-4 py-1.5 rounded-xl select-none transition-all duration-200 transform group-hover:opacity-0 group-hover:scale-95 group-hover:pointer-events-none"
            >
              Open Workspace →
            </span>

            {/* Quick Action Overlays */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-200 transform scale-95 group-hover:scale-100">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onOpenCanvas(e)
                }}
                title="Launch Canvas Sandbox"
                className="h-8 w-8 rounded-xl bg-pm-surface-2 border border-pm-border text-pm-accent hover:bg-pm-accent hover:text-white flex items-center justify-center transition-all active:scale-95 shadow-sm cursor-pointer"
              >
                <Layout className="w-3.5 h-3.5" />
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onNewSession(e)
                }}
                title="Start New Review Session"
                className="h-8 w-8 rounded-xl bg-pm-surface-2 border border-pm-border text-emerald-500 hover:bg-emerald-600 hover:text-white flex items-center justify-center transition-all active:scale-95 shadow-sm cursor-pointer"
              >
                <Play className="w-3.5 h-3.5" />
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onShare(e)
                }}
                title="Generate Client Share Link"
                className="h-8 w-8 rounded-xl bg-pm-surface-2 border border-pm-border text-indigo-500 hover:bg-indigo-600 hover:text-white flex items-center justify-center transition-all active:scale-95 shadow-sm cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
              </button>

              {/* Delete button — two-step confirm */}
              {onDelete && (
                <AnimatePresence mode="wait">
                  {deleteStep === 'idle' && (
                    <motion.button
                      key="del-idle"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.15 }}
                      onClick={(e) => { e.stopPropagation(); setDeleteStep('confirm') }}
                      title="Delete Project"
                      className="h-8 w-8 rounded-xl bg-pm-surface-2 border border-pm-border text-rose-500 hover:bg-rose-600 hover:text-white flex items-center justify-center transition-all active:scale-95 shadow-sm cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </motion.button>
                  )}
                  {deleteStep === 'confirm' && (
                    <motion.button
                      key="del-confirm"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.15 }}
                      onClick={async (e) => {
                        e.stopPropagation()
                        setDeleteStep('deleting')
                        await onDelete(e)
                      }}
                      onBlur={() => setDeleteStep('idle')}
                      title="Click to confirm deletion"
                      className="h-8 px-2.5 rounded-xl bg-rose-600 border border-rose-500 text-white text-[9px] font-bold uppercase tracking-widest flex items-center gap-1 hover:bg-rose-500 transition-all active:scale-95 whitespace-nowrap shadow-sm cursor-pointer"
                    >
                      <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                      Confirm
                    </motion.button>
                  )}
                  {deleteStep === 'deleting' && (
                    <motion.div
                      key="del-loading"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="h-8 w-8 rounded-xl bg-pm-surface-2 border border-pm-border text-rose-400 flex items-center justify-center"
                    >
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    </motion.div>
                  )}
                </AnimatePresence>
              )}
            </div>
          </div>

        </div>

      </div>
    </motion.div>
  )
}
