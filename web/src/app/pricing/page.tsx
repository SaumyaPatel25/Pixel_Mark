'use client'

import React, { useEffect, useState } from 'react'
import { Check, Sparkles, Zap, Shield, ArrowRight, Mail, Users, Layers, ExternalLink, HelpCircle } from 'lucide-react'
import { useBillingStore } from '@/store/useBillingStore'

const ENTERPRISE_CONTACT_EMAIL = process.env.NEXT_PUBLIC_ENTERPRISE_CONTACT_EMAIL || "founder@stage.dev"

export default function PricingPage() {
  const {
    currentPlan,
    isTestMode,
    earlyBirdSlotsRemaining,
    earlyBirdClaimedCount,
    fetchEarlyBirdStatus,
    fetchBillingStatus,
    initiateCheckout
  } = useBillingStore()

  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    fetchEarlyBirdStatus()
    fetchBillingStatus()
  }, [fetchEarlyBirdStatus, fetchBillingStatus])

  const handleCheckout = async (planType: string) => {
    setLoadingPlan(planType)
    setErrorMsg(null)
    try {
      const checkoutUrl = await initiateCheckout(planType)
      if (checkoutUrl) {
        window.location.href = checkoutUrl
      } else {
        setErrorMsg('Failed to initialize checkout session. Please try again.')
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error redirecting to checkout.')
    } finally {
      setLoadingPlan(null)
    }
  }

  const isEarlyBirdActive = earlyBirdSlotsRemaining > 0

  return (
    <div className="min-h-screen bg-[#070a12] text-slate-100 font-sans selection:bg-purple-500/30">
      {/* Header Banner */}
      <div className="max-w-7xl mx-auto px-6 pt-12 pb-8 text-center space-y-4">
        {/* Test Mode Badge */}
        {isTestMode && (
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-mono font-extrabold uppercase tracking-wider animate-pulse">
            <Zap className="w-3.5 h-3.5 text-purple-400" />
            <span>STAGE Dodo Test Mode (Sandbox Environment)</span>
          </div>
        )}

        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white">
          Simple, Transparent Pricing for <span className="bg-gradient-to-r from-purple-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">STAGE</span>
        </h1>
        <p className="max-w-2xl mx-auto text-base text-slate-400">
          The collaboration layer between clients and developers. Pick the plan built for your workflow.
        </p>

        {errorMsg && (
          <div className="max-w-md mx-auto p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs font-bold">
            {errorMsg}
          </div>
        )}
      </div>

      {/* Pricing Cards Grid */}
      <div className="max-w-4xl mx-auto px-6 py-8 grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
        
        {/* CARD 1: DEV TEAM (WITH EARLY BIRD BADGE OVERLAY) */}
        <div className="bg-[#0b101d] border-2 border-purple-500/40 rounded-3xl p-6 flex flex-col justify-between transition-all duration-200 shadow-2xl relative bg-gradient-to-b from-purple-950/20 via-[#0b101d] to-[#0b101d]">
          {/* Early Bird Scarcity Badge */}
          {isEarlyBirdActive && (
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3.5 py-1 rounded-full bg-gradient-to-r from-purple-600 to-cyan-500 text-white text-[11px] font-extrabold shadow-lg flex items-center gap-1.5 whitespace-nowrap">
              <Sparkles className="w-3.5 h-3.5" />
              <span>25% OFF EARLY BIRD — {earlyBirdSlotsRemaining} OF 50 SPOTS LEFT</span>
            </div>
          )}

          <div className="space-y-4">
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs font-extrabold uppercase tracking-wider text-purple-400">Dev Team</span>
              {(currentPlan === 'dev_team' || currentPlan === 'dev_team_early_bird') && (
                <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-bold">Current Plan</span>
              )}
            </div>

            <div>
              {isEarlyBirdActive ? (
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-extrabold text-white">$21.75</span>
                    <span className="text-sm line-through text-slate-500">$29</span>
                    <span className="text-xs font-medium text-slate-400">/ month flat</span>
                  </div>
                  <p className="text-[11px] text-purple-300 font-bold mt-1">
                    Includes 25% Early Bird Discount ({50 - earlyBirdSlotsRemaining}/50 claimed)
                  </p>
                </div>
              ) : (
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold text-white">$29</span>
                    <span className="text-xs font-medium text-slate-400">/ month flat</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Flat fee for up to 5 developers (not per-seat).</p>
                </div>
              )}
            </div>

            {/* Feature Highlight Badge */}
            <div className="p-2.5 rounded-xl bg-purple-950/40 border border-purple-500/30 text-purple-200 text-xs font-bold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400 flex-shrink-0" />
              <span>Includes Blueprint Canvas DOM Edit Mode</span>
            </div>

            <hr className="border-slate-800" />

            <ul className="space-y-2.5 text-xs text-slate-300">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-purple-400 flex-shrink-0" />
                <span><strong>Up to 5 Developer Seats</strong></span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-purple-400 flex-shrink-0" />
                <span><strong>10 Projects Total</strong> (2 per seat)</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-purple-400 flex-shrink-0" />
                <span>Full Blueprint Canvas & Multi-user Presence</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-purple-400 flex-shrink-0" />
                <span>AI Change Summaries & Version Control</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-purple-400 flex-shrink-0" />
                <span>Unified Notifications & Email Delivery</span>
              </li>
            </ul>
          </div>

          <div className="pt-6">
            <button
              onClick={() => handleCheckout('dev_team')}
              disabled={loadingPlan === 'dev_team'}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-extrabold text-xs transition-all shadow-lg shadow-purple-600/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              {loadingPlan === 'dev_team' ? (
                <span>Redirecting to Dodo Checkout...</span>
              ) : (
                <>
                  <span>{isEarlyBirdActive ? 'Claim Early Bird (25% Off)' : 'Subscribe to Dev Team'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* CARD 2: ENTERPRISE ("LET'S TALK") */}
        <div className="bg-[#0b101d] border border-slate-800 rounded-3xl p-6 flex flex-col justify-between hover:border-slate-700 transition-all duration-200 shadow-xl relative">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-cyan-400">Enterprise</span>
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 text-[10px] font-bold">Custom</span>
            </div>

            <div>
              <span className="text-3xl font-extrabold text-white">Custom SLA</span>
              <p className="text-xs text-slate-400 mt-1">Tailored for large teams and enterprise organizations.</p>
            </div>

            <hr className="border-slate-800" />

            <ul className="space-y-2.5 text-xs text-slate-300">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                <span><strong>Unlimited Developer Seats</strong></span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                <span><strong>Unlimited Projects</strong></span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                <span>Dedicated Support & SLA Guarantee</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                <span>Custom On-Premise / Hybrid Deployment</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                <span>Custom Security & Compliance Audits</span>
              </li>
            </ul>
          </div>

          <div className="pt-6">
            <a
              href={`mailto:${ENTERPRISE_CONTACT_EMAIL}?subject=STAGE%20Enterprise%20Plan%20Inquiry`}
              className="w-full py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer border border-cyan-500/30"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Let's talk</span>
            </a>
          </div>
        </div>

      </div>

      {/* Footer info */}
      <div className="max-w-4xl mx-auto px-6 py-12 text-center text-xs text-slate-500 space-y-2">
        <p>All subscriptions are powered safely by Dodo Payments in Sandbox Test Mode.</p>
        <p>Need custom procurement or invoice billing? Contact {ENTERPRISE_CONTACT_EMAIL}</p>
      </div>
    </div>
  )
}
