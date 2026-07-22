'use client'

import React, { useEffect, useState } from 'react'
import { Loader2, RefreshCw } from 'lucide-react'

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '')

interface StatusState {
  api: 'checking' | 'healthy' | 'unhealthy'
  auth: 'checking' | 'healthy' | 'unhealthy'
  database: 'checking' | 'healthy' | 'unhealthy'
}

export default function SystemCheck() {
  const [status, setStatus] = useState<StatusState>({
    api: 'checking',
    auth: 'checking',
    database: 'checking'
  })
  const [lastChecked, setLastChecked] = useState<Date | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const checkHealth = async () => {
    setIsRefreshing(true)
    const newStatus: StatusState = { api: 'unhealthy', auth: 'unhealthy', database: 'unhealthy' }
    
    try {
      // 1. Check API Health (fastapi root /health)
      const healthRes = await fetch(`${API_BASE}/health`, { cache: 'no-store' })
      if (healthRes.ok) {
        const data = await healthRes.json()
        if (data.status === 'ok') {
          newStatus.api = 'healthy'
          newStatus.database = 'healthy' // Inferred from Neon DB startup verification hook
        }
      }
    } catch (err) {
      console.error('API health check failed:', err)
    }

    try {
      // 2. Check Auth Service (raw fetch to avoid logout interceptors)
      const token = typeof window !== 'undefined' ? localStorage.getItem('stagetoken') : null
      const headers: Record<string, string> = {}
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
      
      const authRes = await fetch(`${API_BASE}/auth/me`, { 
        headers,
        cache: 'no-store'
      })
      
      // If endpoint is reachable (200 or 401), the service is online
      if (authRes.status === 200 || authRes.status === 401) {
        newStatus.auth = 'healthy'
      }
    } catch (err) {
      console.error('Auth service health check failed:', err)
    }

    setStatus(newStatus)
    setLastChecked(new Date())
    setIsRefreshing(false)
  }

  useEffect(() => {
    checkHealth()
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      checkHealth()
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  const getStatusBadge = (state: 'checking' | 'healthy' | 'unhealthy') => {
    switch (state) {
      case 'healthy':
        return (
          <span className="inline-flex items-center gap-1.5 py-1 px-3 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-black uppercase text-emerald-400">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
            Operational
          </span>
        )
      case 'unhealthy':
        return (
          <span className="inline-flex items-center gap-1.5 py-1 px-3 rounded-full bg-rose-500/10 border border-rose-500/20 text-[10px] font-black uppercase text-rose-400">
            <span className="w-1.5 h-1.5 bg-rose-400 rounded-full animate-ping" />
            Offline
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1.5 py-1 px-3 rounded-full bg-pm-surface-2 border border-pm-border text-[10px] font-black uppercase text-pm-muted">
            <Loader2 className="w-3 h-3 animate-spin" />
            Checking
          </span>
        )
    }
  }

  return (
    <div className="bg-pm-surface border border-pm-border rounded-2xl p-6 space-y-6 shadow-xl relative overflow-hidden">
      <div className="flex items-center justify-between border-b border-pm-border pb-4">
        <div>
          <h3 className="text-xs font-black uppercase tracking-widest text-purple-400">Live System Diagnostics</h3>
          <p className="text-[10px] text-pm-muted/60 font-bold uppercase tracking-wider mt-1">
            {lastChecked ? `Last Checked: ${lastChecked.toLocaleTimeString()}` : 'Initializing checks...'}
          </p>
        </div>
        <button
          onClick={checkHealth}
          disabled={isRefreshing}
          className="p-2 rounded-lg bg-pm-surface-2 border border-pm-border hover:bg-pm-surface-3 text-pm-muted hover:text-pm-text transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="divide-y divide-pm-border/50 text-xs">
        {[
          { name: 'Core REST API Gateway', key: 'api', desc: 'Main query layer for feedback data, coordinates, and projects.' },
          { name: 'Authentication Manager', key: 'auth', desc: 'OAuth integrations, session tokens, and security contexts.' },
          { name: 'Telemetry Database (Neon)', key: 'database', desc: 'PostgreSQL storage layer backing visual comments and session recordings.' }
        ].map((service) => (
          <div key={service.key} className="py-4 flex items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="font-bold text-pm-text">{service.name}</p>
              <p className="text-[10px] text-pm-muted max-w-md leading-normal">{service.desc}</p>
            </div>
            {getStatusBadge(status[service.key as keyof StatusState])}
          </div>
        ))}
      </div>
    </div>
  )
}
