'use client'

import React from 'react'
import Link from 'next/link'
import { usePlan } from '@/hooks/usePlan'
import { Sparkles, Shield, AlertTriangle, ArrowUpRight, Crown } from 'lucide-react'

export function PlanBadge() {
  const { capabilities, isPaid, isLoading } = usePlan()

  if (isLoading) {
    return (
      <div className="h-7 w-24 bg-pm-surface-2 animate-pulse rounded-full border border-pm-border" />
    )
  }

  if (capabilities.is_past_due_warning) {
    return (
      <Link
        href="/pricing"
        className="group inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-300 hover:bg-amber-500/20 transition-all shadow-sm"
        title="Payment Past Due - Click to resolve"
      >
        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 animate-bounce" />
        <span>Past Due Warning</span>
        <ArrowUpRight className="w-3 h-3 opacity-60 group-hover:opacity-100 transition-opacity" />
      </Link>
    )
  }

  if (isPaid) {
    const titleText = capabilities.is_early_bird 
      ? 'Dev Team ⚡ 25% Off' 
      : capabilities.planType === 'enterprise' 
      ? 'Enterprise' 
      : 'Dev Team'

    return (
      <Link
        href="/settings/profile"
        className="group inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-gradient-to-r from-purple-600 to-pm-accent text-white shadow-md hover:opacity-95 transition-all font-mono"
        title={`${titleText} · ${capabilities.seats_used}/${capabilities.seats_allowed} Seats Used`}
      >
        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
        <span>{titleText}</span>
        <span className="text-[10px] bg-black/20 px-1.5 py-0.5 rounded-md font-sans">
          {capabilities.seats_used}/{capabilities.seats_allowed} Seats
        </span>
      </Link>
    )
  }

  return (
    <Link
      href="/pricing"
      className="group inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-pm-surface-2 border border-pm-border text-pm-muted hover:border-pm-accent hover:text-pm-accent transition-all"
      title="Free Workspace - Click to Upgrade"
    >
      <Shield className="w-3.5 h-3.5 text-pm-muted" />
      <span>Free Workspace</span>
      <span className="text-[9px] font-extrabold uppercase text-pm-accent bg-pm-accent/10 border border-pm-accent/20 px-1.5 py-0.5 rounded">
        Upgrade
      </span>
    </Link>
  )
}
