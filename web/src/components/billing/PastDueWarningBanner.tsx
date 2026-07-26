'use client'

import React from 'react'
import Link from 'next/link'
import { usePlan } from '@/hooks/usePlan'
import { AlertTriangle, ArrowRight } from 'lucide-react'

export function PastDueWarningBanner() {
  const { isPastDueWarning, gracePeriodEndsAt } = usePlan()

  if (!isPastDueWarning) return null

  let daysLeft = 3
  if (gracePeriodEndsAt) {
    const end = new Date(gracePeriodEndsAt).getTime()
    const now = new Date().getTime()
    const diff = Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)))
    daysLeft = diff
  }

  return (
    <div className="w-full bg-gradient-to-r from-amber-950/90 via-amber-900/80 to-amber-950/90 border-b border-amber-500/30 px-4 py-2.5 flex items-center justify-between text-amber-200 text-xs shadow-lg backdrop-blur-md z-30">
      <div className="flex items-center gap-2.5">
        <div className="p-1 rounded-md bg-amber-500/20 text-amber-400">
          <AlertTriangle className="w-4 h-4 animate-pulse" />
        </div>
        <div>
          <span className="font-bold text-white">STAGE Subscription Payment Past Due:</span>{' '}
          Your payment failed. You have a <span className="font-semibold text-amber-300">{daysLeft} day grace period</span> before plan downgrade enforcement.
        </div>
      </div>
      <Link
        href="/pricing"
        className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 transition-colors shadow-sm cursor-pointer whitespace-nowrap"
      >
        <span>Update Payment</span>
        <ArrowRight className="w-3 h-3" />
      </Link>
    </div>
  )
}
