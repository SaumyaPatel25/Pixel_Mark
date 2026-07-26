'use client'

import React, { useEffect } from 'react'
import { CheckCircle2, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { useBillingStore } from '@/store/useBillingStore'

export default function BillingSuccessPage() {
  const { fetchBillingStatus } = useBillingStore()

  useEffect(() => {
    fetchBillingStatus()
  }, [fetchBillingStatus])

  return (
    <div className="min-h-screen bg-[#070a12] text-slate-100 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-[#0b101d] border border-slate-800 rounded-3xl p-8 text-center space-y-6 shadow-2xl">
        <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
          <CheckCircle2 className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-extrabold text-white">Subscription Active!</h1>
          <p className="text-xs text-slate-400">
            Thank you for subscribing to STAGE. Your plan limits and feature access have been updated.
          </p>
        </div>

        <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-500/30 text-purple-300 text-xs font-mono font-bold">
          ⚡ Sandbox Test Mode Transaction Complete
        </div>

        <div className="pt-2">
          <Link
            href="/"
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-extrabold text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20"
          >
            <span>Return to STAGE Workspace</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}
