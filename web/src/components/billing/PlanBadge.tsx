'use client'

import React from 'react'
import Link from 'next/link'
import { usePlan } from '@/hooks/usePlan'
import { Sparkles, Shield, AlertTriangle, ArrowUpRight, Zap } from 'lucide-react'

export function PlanBadge() {
  const {
    planType,
    isEarlyBird,
    isDevTeam,
    isSolopreneur,
    hasNoSubscription,
    isPastDueWarning,
    projectsRemaining,
    loading
  } = usePlan()

  if (loading) {
    return (
      <div className="h-7 w-24 bg-slate-800/50 animate-pulse rounded-full border border-slate-700/50" />
    )
  }

  if (isPastDueWarning) {
    return (
      <Link
        href="/pricing"
        className="group inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 transition-all shadow-sm"
        title="Payment Past Due - Click to resolve"
      >
        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
        <span>Past Due Warning</span>
        <ArrowUpRight className="w-3 h-3 opacity-60 group-hover:opacity-100 transition-opacity" />
      </Link>
    )
  }

  if (isDevTeam) {
    return (
      <Link
        href="/pricing"
        className="group inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20 transition-all shadow-sm shadow-cyan-950/40"
        title={`${isEarlyBird ? 'Dev Team (Early Bird)' : 'Dev Team Plan'} - ${projectsRemaining} project slots remaining`}
      >
        <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
        <span>{isEarlyBird ? 'Dev Team ⚡ 25% Off' : 'Dev Team'}</span>
        <span className="text-[10px] font-mono opacity-75 bg-cyan-950/80 px-1.5 py-0.2 rounded-md border border-cyan-500/20">
          {projectsRemaining} left
        </span>
      </Link>
    )
  }

  if (isSolopreneur) {
    return (
      <Link
        href="/pricing"
        className="group inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/20 transition-all"
        title="Solopreneur Plan - Click to Upgrade"
      >
        <Zap className="w-3.5 h-3.5 text-indigo-400" />
        <span>Solopreneur</span>
        <ArrowUpRight className="w-3 h-3 opacity-60 group-hover:opacity-100 transition-opacity text-cyan-400" />
      </Link>
    )
  }

  return (
    <Link
      href="/pricing"
      className="group inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-800/80 border border-slate-700 text-slate-300 hover:border-cyan-500/40 hover:text-cyan-300 transition-all"
      title="No Active Subscription - Click to Subscribe"
    >
      <Shield className="w-3.5 h-3.5 text-slate-400" />
      <span>Free / No Plan</span>
      <span className="text-[10px] font-bold uppercase text-amber-400 bg-amber-950/60 border border-amber-500/30 px-1.5 py-0.2 rounded">
        Upgrade
      </span>
    </Link>
  )
}
