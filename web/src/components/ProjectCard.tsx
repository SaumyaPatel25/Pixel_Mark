'use client'
import { useEffect, useState, useRef } from 'react'
import { motion, useMotionValue, useSpring } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

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
      <span className="text-[8px] text-white/20 uppercase font-black tracking-widest">14d Telemetry</span>
    </div>
  )
}

function HealthRing({ score }: { score: number }) {
  const r = 22, circ = 2 * Math.PI * r
  const dash = (score / 100) * circ
  const color = score >= 80 ? '#22c55e' : score >= 50 ? '#eab308' : '#ef4444'
  
  return (
    <div className="relative group/ring">
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
      <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-md text-white text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg opacity-0 group-hover/ring:opacity-100 transition-all whitespace-nowrap border border-white/10 pointer-events-none translate-y-2 group-hover/ring:translate-y-0 shadow-2xl">
        Health Index
      </div>
    </div>
  )
}

export function ProjectCard({ project, onClick }: { project: any, onClick: () => void }) {
  const [analytics, setAnalytics] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8765'
  
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const cardRef = useRef<HTMLButtonElement>(null)

  const springX = useSpring(mouseX, { stiffness: 300, damping: 30 })
  const springY = useSpring(mouseY, { stiffness: 300, damping: 30 })

  function handleMouse(e: React.MouseEvent) {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    mouseX.set(e.clientX - rect.left)
    mouseY.set(e.clientY - rect.top)
  }

  useEffect(() => {
    let active = true
    const fetchAnalytics = async () => {
      try {
        const res = await fetch(`${BASE}/projects/${project.id}/analytics`)
        const data = await res.json()
        if (active) {
          setAnalytics(data)
          setLoading(false)
        }
      } catch (err) {
        if (active) setLoading(false)
      }
    }
    fetchAnalytics()
    return () => { active = false }
  }, [project.id, BASE])

  return (
    <motion.button 
      layout
      ref={cardRef}
      onMouseMove={handleMouse}
      onClick={onClick}
      whileHover={{ y: -4 }}
      className="w-full text-left bg-[#0c0c0e] border border-white/5 rounded-[32px] p-7 transition-all group overflow-hidden relative shadow-2xl hover:shadow-purple-500/10 hover:border-white/10"
    >
      {/* Dynamic Cursor Spotlight */}
      <motion.div 
        className="absolute inset-0 z-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{
          background: `radial-gradient(600px circle at ${springX}px ${springY}px, rgba(168, 85, 247, 0.08), transparent 40%)`
        }}
      />

      <div className="relative z-10 flex flex-col h-full gap-8">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_10px_#06b6d4] animate-pulse" />
                <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Operational</span>
            </div>
            <h3 className="text-white font-black text-3xl tracking-tighter leading-none group-hover:text-purple-400 transition-colors">
              {project.name}
            </h3>
            <p className="text-white/30 text-[11px] font-bold uppercase tracking-widest leading-relaxed mt-4 line-clamp-2 max-w-[80%]">
              {project.description || "No mission description provided for this substrate."}
            </p>
          </div>
          {analytics ? (
            <HealthRing score={analytics.health_score || 0} />
          ) : loading ? (
            <div className="w-14 h-14 rounded-full border-2 border-white/5 animate-pulse" />
          ) : <HealthRing score={0} />}
        </div>

        <div className="grid grid-cols-2 items-end pt-8 border-t border-white/5">
          <div className="space-y-6">
            <div className="flex gap-8">
              {analytics ? (
                <>
                  <div className="flex flex-col gap-1">
                    <span className="text-white/20 text-[9px] font-black uppercase tracking-widest">Critical</span>
                    <span className="text-rose-500 text-xl font-mono font-black tracking-tighter">
                        {((analytics.by_severity?.P0 ?? 0) + (analytics.by_severity?.P1 ?? 0)).toString().padStart(2, '0')}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-white/20 text-[9px] font-black uppercase tracking-widest">Open</span>
                    <span className="text-white/80 text-xl font-mono font-black tracking-tighter">
                        {(analytics.open ?? 0).toString().padStart(2, '0')}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-white/20 text-[9px] font-black uppercase tracking-widest">Resolve</span>
                    <span className="text-cyan-400 text-xl font-mono font-black tracking-tighter">
                        {analytics.resolution_rate ?? 0}%
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex gap-6 h-10 items-center">
                    <div className="w-12 h-4 bg-white/5 rounded-lg animate-pulse" />
                    <div className="w-12 h-4 bg-white/5 rounded-lg animate-pulse delay-75" />
                    <div className="w-12 h-4 bg-white/5 rounded-lg animate-pulse delay-150" />
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-3 py-2 px-4 rounded-xl bg-white/[0.03] border border-white/5 w-fit group-hover:border-purple-500/20 transition-colors">
              <span className="text-[10px] font-bold text-white/20 group-hover:text-white/40 transition-colors tracking-tight truncate max-w-[160px]">
                {project.url?.replace(/^https?:\/\//, '') || ''}
              </span>
              <div className="w-3 h-3 flex items-center justify-center text-white/10 group-hover:text-purple-400 transition-colors">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
                    <path d="M7 17L17 7M17 7H7M17 7V17"/>
                </svg>
              </div>
            </div>
          </div>

          <div className="flex justify-end pb-2">
            <Sparkline data={analytics?.activity || []} />
          </div>
        </div>
      </div>
    </motion.button>
  )
}
