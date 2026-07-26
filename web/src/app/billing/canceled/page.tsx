'use client'

import React from 'react'
import { XCircle, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function BillingCanceledPage() {
  return (
    <div className="min-h-screen bg-[#070a12] text-slate-100 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-[#0b101d] border border-slate-800 rounded-3xl p-8 text-center space-y-6 shadow-2xl">
        <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
          <XCircle className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-extrabold text-white">Checkout Canceled</h1>
          <p className="text-xs text-slate-400">
            Your payment session was canceled. No charges were made to your account.
          </p>
        </div>

        <div className="pt-2">
          <Link
            href="/pricing"
            className="w-full py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-extrabold text-xs transition-all flex items-center justify-center gap-2 border border-slate-700"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to STAGE Pricing</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
