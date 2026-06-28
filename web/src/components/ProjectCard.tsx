'use client'
import { useEffect, useState, useRef } from 'react'
import { motion, useMotionValue, useSpring } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Layout, Play, Share2, ExternalLink, Activity, FileText, Calendar } from 'lucide-react'

function Sparkline({ data }: { data: number[] }) {
  if (!data || !data.length) return <div className="w-24 h-8 bg-white/5 rounded-xl animate-pulse" />
  
  const max = Math.max(...data, 1)
  const width = 100, height = 32
  const step = width / (data.length - 1)
  const points = data.map((v, i) => `${i * step},${height - (v / max) * height}`).join(' ')
  const areaPoints = `0,${height} ${points} ${width},${height} 0,${height}`
  
  return (
    <div className="flex flex-col items-end gap-1">
      <svg width={width} height={height} className="overflow-visible">
        <defs>
          <linearGradient id="sparkArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
          </linearGradient>
        </defs>
        <motion.polyline 
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 2, ease: "easeOut" }}
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
          transition={{ duration: 1, delay: 0.5 }}
          fill="url(#sparkArea)"
          points={areaPoints}
        />
      </svg>
      <span className="text-[8px] text-white/20 uppercase font-black tracking-widest">Telemetry</span>
    </div>
  )
}

function HealthRing({ score }: { score: number }) {
  const r = 22, circ = 2 * Math.PI * r
  const dash = (score / 100) * circ
  const color = score >= 80 ? '#22c55e' : score >= 50 ? '#eab308' : '#ef4444'
  
  return (
    <div className="relative group/ring flex-shrink-0">
      <div className="absolute inset-0 rounded-full blur-xl opacity-20 transition-all group-hover/ring:opacity-40 animate-pulse" style={{ background: color }} />
      <svg width="60" height="60" className="-rotate-90 relative z-10">
        <circle cx="30" cy="30" r={r} fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="4" />
        <motion.circle 
          cx="30" cy="30" r={r} fill="none" stroke={color} strokeWidth="4"
          initial={{ strokeDasharray: `0 ${circ}` }}
          animate={{ strokeDasharray: `${dash} ${circ}` }}
          transition={{ duration: 1.5, ease: "circOut" }}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center z-20">
        <span className="text-sm font-black tracking-tighter" style={{ color }}>
          {score}
        </span>
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
  const [localAnalytics, setLocalAnalytics] = useState<any>(null)
  const [loading, setLoading] = useState(!propAnalytics)
  const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8765'
  
  const analytics = propAnalytics || localAnalytics
  
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const cardRef = useRef<HTMLDivElement>(null)

  const springX = useSpring(mouseX, { stiffness: 300, damping: 30 })
  const springY = useSpring(mouseY, { stiffness: 300, damping: 30 })

  function handleMouse(e: React.MouseEvent) {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    mouseX.set(e.clientX - rect.left)
    mouseY.set(e.clientY - rect.top)
  }

  useEffect(() => {
    if (propAnalytics) return
    let active = true
    const fetchAnalytics = async () => {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('pm_token') : null
        const headers: Record<string, string> = {}
        if (token) {
          headers['Authorization'] = `Bearer ${token}`
        }
        const res = await fetch(`${BASE}/projects/${project.id}/analytics`, { headers })
        const data = await res.json()
        if (active) {
          setLocalAnalytics(data)
          setLoading(false)
        }
      } catch (err) {
        if (active) setLoading(false)
      }
    }
    fetchAnalytics()
    return () => { active = false }
  }, [project.id, BASE, propAnalytics])

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
      className="w-full cursor-pointer text-left bg-[#0c0c0e] border border-white/5 rounded-[24px] p-6 transition-all group overflow-hidden relative shadow-2xl hover:shadow-purple-500/10 hover:border-white/10 focus:outline-none focus:border-purple-500/40"
    >
      {/* Spotlight Effect */}
      <motion.div 
        className="absolute inset-0 z-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{
          background: `radial-gradient(400px circle at ${springX}px ${springY}px, rgba(168, 85, 247, 0.08), transparent 45%)`
        }}
      />

      <div className="relative z-10 flex flex-col h-full justify-between gap-6">
        
        {/* Header Row */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 shadow-[0_0_8px_#06b6d4] animate-pulse" />
              <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.25em]">Operational</span>
            </div>
            
            <h3 className="text-white font-black text-2xl tracking-tight leading-none group-hover:text-purple-400 transition-colors truncate">
              {project.name}
            </h3>
            
            <p className="text-white/30 text-[10px] uppercase font-bold tracking-wider leading-relaxed mt-2 line-clamp-1">
              {project.description || "No description provided for this substrate."}
            </p>
          </div>
          
          {analytics ? (
            <HealthRing score={analytics.health_score ?? 100} />
          ) : loading ? (
            <div className="w-14 h-14 rounded-full border border-white/5 animate-pulse flex-shrink-0" />
          ) : (
            <HealthRing score={100} />
          )}
        </div>

        {/* Dynamic Target Environment URL Tag */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 py-1 px-3 rounded-lg bg-white/[0.02] border border-white/5 text-[9px] font-bold text-white/40 group-hover:border-purple-500/20 group-hover:text-purple-400/90 transition-colors w-fit">
            <span className="truncate max-w-[200px]">
              {project.url?.replace(/^https?:\/\//, '') || 'no-environment'}
            </span>
            <ExternalLink className="w-2.5 h-2.5 opacity-60" />
          </div>
        </div>

        {/* Telemetry Metrics and Telemetry Sparkline */}
        <div className="grid grid-cols-2 items-end pt-4 border-t border-white/[0.03]">
          
          {/* Detailed stats */}
          <div className="space-y-3">
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              <div className="flex items-center gap-1.5 text-white/40">
                <Activity className="w-3.5 h-3.5 text-cyan-500" />
                <div className="flex flex-col">
                  <span className="text-[8px] font-black uppercase tracking-wider text-white/20 leading-none">Reviews</span>
                  <span className="text-[11px] font-mono font-bold text-white/70 mt-0.5">
                    {activeSessionsCount}/{sessionsCount} <span className="text-[8px] text-cyan-400 font-bold uppercase tracking-tight">Active</span>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-white/40">
                <FileText className="w-3.5 h-3.5 text-purple-400" />
                <div className="flex flex-col">
                  <span className="text-[8px] font-black uppercase tracking-wider text-white/20 leading-none">Pins</span>
                  <span className="text-[11px] font-mono font-bold text-white/70 mt-0.5">
                    {markersCount.toString().padStart(2, '0')}
                  </span>
                </div>
              </div>
            </div>

            {/* Last active timestamp */}
            <div className="flex items-center gap-1 text-white/20">
              <Calendar className="w-3 h-3" />
              <span className="text-[9px] font-bold uppercase tracking-wide">
                {lastActivity ? `Active ${lastActivity}` : 'No recent reviews'}
              </span>
            </div>
          </div>

          {/* Sparkline column */}
          <div className="flex justify-end pb-1 pr-1">
            <Sparkline data={analytics?.activity || []} />
          </div>
        </div>

        {/* Quick Actions Panel (fades/slides up on hover) */}
        <div className="absolute bottom-4 right-4 flex items-center gap-1.5 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto max-lg:opacity-100 max-lg:pointer-events-auto transition-all duration-300 transform translate-y-1 group-hover:translate-y-0 max-lg:translate-y-0 z-30">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onOpenCanvas(e)
            }}
            title="Open Canvas"
            className="h-8 w-8 rounded-xl bg-indigo-950/80 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-600 hover:text-white hover:border-indigo-500 hover:shadow-lg hover:shadow-indigo-500/20 flex items-center justify-center transition-all active:scale-95"
          >
            <Layout className="w-3.5 h-3.5" />
          </button>
          
          <button
            onClick={(e) => {
              e.stopPropagation()
              onNewSession(e)
            }}
            title="Start New Review Session"
            className="h-8 w-8 rounded-xl bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-600 hover:text-white hover:border-emerald-500 hover:shadow-lg hover:shadow-emerald-500/20 flex items-center justify-center transition-all active:scale-95"
          >
            <Play className="w-3.5 h-3.5" />
          </button>
          
          <button
            onClick={(e) => {
              e.stopPropagation()
              onShare(e)
            }}
            title="Get Client Link"
            className="h-8 w-8 rounded-xl bg-purple-950/80 border border-purple-500/30 text-purple-400 hover:bg-purple-600 hover:text-white hover:border-purple-500 hover:shadow-lg hover:shadow-purple-500/20 flex items-center justify-center transition-all active:scale-95"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>
    </motion.div>
  )
}
