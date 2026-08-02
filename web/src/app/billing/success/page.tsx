'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { CheckCircle2, ArrowRight, Loader2, AlertTriangle, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useBillingStore } from '@/store/useBillingStore'

export default function BillingSuccessPage() {
  const searchParams = useSearchParams()
  const { isPaid, fetchBillingStatus, syncCheckout } = useBillingStore()
  const [isConfirming, setIsConfirming] = useState(true)
  const [pollFailed, setPollFailed] = useState(false)

  // Extract checkout return params from Dodo redirect URL
  const orgId = searchParams.get('org_id')
  const subscriptionId = searchParams.get('subscription_id')
  const plan = searchParams.get('plan')

  const doSync = useCallback(async () => {
    setIsConfirming(true)
    setPollFailed(false)

    // Step 1: Call sync-checkout with params from the redirect URL
    if (subscriptionId || orgId) {
      try {
        const result: any = await syncCheckout({
          org_id: orgId || undefined,
          subscription_id: subscriptionId || undefined,
          plan_type: plan || undefined
        })
        if (result?.is_paid) {
          setIsConfirming(false)
          return
        }
      } catch (err) {
        console.warn('[BillingSuccess] sync-checkout call failed, falling back to polling:', err)
      }

    }

    // Step 2: Poll entitlements as fallback (webhook may still arrive)
    let attempts = 0
    const poll = async () => {
      try {
        await fetchBillingStatus()
      } catch (err) {
        console.warn('[BillingSuccess] entitlements poll error:', err)
      }
      attempts++
      const state = useBillingStore.getState()
      if (state.isPaid) {
        setIsConfirming(false)
        setPollFailed(false)
      } else if (attempts >= 6) {
        setIsConfirming(false)
        setPollFailed(true)
      } else {
        setTimeout(poll, 2000)
      }
    }
    await poll()
  }, [subscriptionId, orgId, plan, fetchBillingStatus])

  useEffect(() => {
    doSync()
  }, [doSync])

  return (
    <div className="min-h-screen bg-[#070a12] text-slate-100 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-[#0b101d] border border-slate-800 rounded-3xl p-8 text-center space-y-6 shadow-2xl">
        {isConfirming ? (
          <div className="w-16 h-16 rounded-full bg-purple-500/10 border border-purple-500/30 flex items-center justify-center mx-auto text-purple-400">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : pollFailed ? (
          <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
            <AlertTriangle className="w-8 h-8" />
          </div>
        ) : (
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
            <CheckCircle2 className="w-8 h-8" />
          </div>
        )}

        <div className="space-y-2">
          <h1 className="text-2xl font-extrabold text-white">
            {isConfirming
              ? 'Activating your plan...'
              : pollFailed
              ? 'Activation Pending'
              : 'Subscription Active!'}
          </h1>
          <p className="text-xs text-slate-400">
            {isConfirming
              ? 'Verifying payment with Dodo Payments and updating your organization...'
              : pollFailed
              ? 'Payment was confirmed but plan activation is still processing. Try syncing manually or return to the dashboard.'
              : 'Thank you for subscribing to STAGE. Your plan limits and feature access have been updated.'}
          </p>
        </div>

        <div className={`p-3 rounded-xl text-xs font-mono font-bold ${
          pollFailed
            ? 'bg-amber-950/20 border border-amber-500/30 text-amber-300'
            : isConfirming
            ? 'bg-purple-950/20 border border-purple-500/30 text-purple-300'
            : 'bg-emerald-950/20 border border-emerald-500/30 text-emerald-300'
        }`}>
          {pollFailed
            ? '⚠️ Webhook delay detected — use Retry below'
            : isConfirming
            ? '⏳ Syncing subscription state...'
            : '✅ Plan upgraded successfully'}
        </div>

        <div className="pt-2 flex flex-col gap-3">
          {pollFailed && (
            <button
              onClick={doSync}
              className="w-full py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-extrabold text-xs transition-all flex items-center justify-center gap-2 border border-slate-700 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Retry Activation Sync</span>
            </button>
          )}

          <Link
            href="/dashboard"
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-extrabold text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20"
          >
            <span>Return to STAGE Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}
