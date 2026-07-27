'use client'

import React, { useEffect, useState } from 'react'
import { Check, Sparkles, Zap, Shield, ArrowRight, Mail } from 'lucide-react'
import { useBillingStore } from '@/store/useBillingStore'
import MarketingNav from '@/components/marketing/MarketingNav'
import MarketingFooter from '@/components/marketing/MarketingFooter'
import Link from 'next/link'

const ENTERPRISE_CONTACT_EMAIL = process.env.NEXT_PUBLIC_ENTERPRISE_CONTACT_EMAIL || "saumyavishwam@gmail.com"

export default function PricingPage() {
  const {
    currentPlan,
    isTestMode,
    earlyBirdSlotsRemaining,
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
    <div className="min-h-screen bg-pm-bg text-pm-text font-sans transition-colors duration-500 selection:bg-pm-accent/20">
      <MarketingNav />

      {/* Main Container */}
      <div className="pt-28 pb-20 max-w-7xl mx-auto px-6">
        
        {/* Header Banner */}
        <div className="text-center space-y-4 max-w-3xl mx-auto pb-10">
          {/* Test Mode Badge */}
          {isTestMode && (
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-600 dark:text-purple-300 text-xs font-mono font-extrabold uppercase tracking-wider animate-pulse">
              <Zap className="w-3.5 h-3.5" />
              <span>STAGE Dodo Test Mode (Sandbox Environment)</span>
            </div>
          )}

          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-pm-text">
            Simple, Transparent Pricing for <span className="bg-gradient-to-r from-purple-500 via-cyan-500 to-emerald-500 bg-clip-text text-transparent">STAGE</span>
          </h1>
          <p className="text-base text-pm-muted">
            The collaboration layer between clients and developers. Pick the plan built for your workflow.
          </p>

          {errorMsg && (
            <div className="max-w-md mx-auto p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs font-bold">
              {errorMsg}
            </div>
          )}
        </div>

        {/* Pricing Cards Grid (3 Columns) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch max-w-6xl mx-auto">
          
          {/* CARD 1: FREE PLAN */}
          <div className="bg-pm-surface border border-pm-border rounded-3xl p-6 flex flex-col justify-between transition-all duration-200 hover:border-pm-accent/30 shadow-xl relative">
            <div className="space-y-4">
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-extrabold uppercase tracking-wider text-pm-muted">Free Plan</span>
                {(!currentPlan || currentPlan === 'free' || currentPlan === 'none') && (
                  <span className="px-2.5 py-0.5 rounded-full bg-pm-accent-subtle border border-pm-border text-pm-accent text-[10px] font-bold">Current Plan</span>
                )}
              </div>

              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-pm-text">$0</span>
                  <span className="text-xs font-medium text-pm-muted">/ month forever</span>
                </div>
                <p className="text-xs text-pm-muted mt-1">Start visual collaboration with your developers instantly.</p>
              </div>

              <div className="p-2.5 rounded-xl bg-pm-surface-2 border border-pm-border text-pm-text text-xs font-medium flex items-center gap-2">
                <Shield className="w-4 h-4 text-pm-accent flex-shrink-0" />
                <span>Try the sandbox elements feedback</span>
              </div>

              <hr className="border-pm-border" />

              <ul className="space-y-2.5 text-xs text-pm-muted">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-pm-accent flex-shrink-0" />
                  <span><strong>1 Developer Seat</strong></span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-pm-accent flex-shrink-0" />
                  <span><strong>1 Project Allowed</strong></span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-pm-accent flex-shrink-0" />
                  <span>Only canvas sessions available</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-pm-accent flex-shrink-0" />
                  <span>Join existing developer organizations</span>
                </li>
              </ul>
            </div>

            <div className="pt-6">
              <Link
                href="/register"
                className="w-full py-3 rounded-2xl bg-pm-surface-2 border border-pm-border hover:bg-pm-surface-3 text-pm-text font-extrabold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer text-center"
              >
                <span>Start Free</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* CARD 2: DEV TEAM (WITH EARLY BIRD BADGE OVERLAY) */}
          <div className="bg-pm-surface border-2 border-pm-accent rounded-3xl p-6 flex flex-col justify-between transition-all duration-200 shadow-2xl relative bg-gradient-to-b from-pm-accent/5 to-pm-surface">
            {/* Early Bird Scarcity Badge */}
            {isEarlyBirdActive && (
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3.5 py-1 rounded-full bg-gradient-to-r from-purple-600 to-cyan-500 text-white text-[11px] font-extrabold shadow-lg flex items-center gap-1.5 whitespace-nowrap">
                <Sparkles className="w-3.5 h-3.5" />
                <span>25% OFF EARLY BIRD — {earlyBirdSlotsRemaining} OF 50 SPOTS LEFT</span>
              </div>
            )}

            <div className="space-y-4">
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-extrabold uppercase tracking-wider text-pm-accent">Dev Team</span>
                {(currentPlan === 'dev_team' || currentPlan === 'dev_team_early_bird') && (
                  <span className="px-2.5 py-0.5 rounded-full bg-pm-accent/20 text-pm-accent text-[10px] font-bold">Current Plan</span>
                )}
              </div>

              <div>
                {isEarlyBirdActive ? (
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-extrabold text-pm-text">$21.75</span>
                      <span className="text-sm line-through text-pm-muted">$29</span>
                      <span className="text-xs font-medium text-pm-muted">/ month flat</span>
                    </div>
                    <p className="text-[11px] text-pm-accent font-bold mt-1">
                      Includes 25% Early Bird Discount ({50 - earlyBirdSlotsRemaining}/50 claimed)
                    </p>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold text-pm-text">$29</span>
                      <span className="text-xs font-medium text-pm-muted">/ month flat</span>
                    </div>
                    <p className="text-xs text-pm-muted mt-1">Flat fee for up to 5 developers (not per-seat).</p>
                  </div>
                )}
              </div>

              {/* Feature Highlight Badge */}
              <div className="p-2.5 rounded-xl bg-pm-accent-subtle border border-pm-border text-pm-accent text-xs font-bold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-pm-accent flex-shrink-0" />
                <span>Includes Blueprint Canvas DOM Edit Mode</span>
              </div>

              <hr className="border-pm-border" />

              <ul className="space-y-2.5 text-xs text-pm-muted">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-pm-accent flex-shrink-0" />
                  <span><strong>Up to 5 Developer Seats</strong></span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-pm-accent flex-shrink-0" />
                  <span><strong>10 Projects Total</strong> (2 per seat)</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-pm-accent flex-shrink-0" />
                  <span>Full Blueprint Canvas & Multi-user Presence</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-pm-accent flex-shrink-0" />
                  <span>AI Change Summaries & Version Control</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-pm-accent flex-shrink-0" />
                  <span>Unified Notifications & Email Delivery</span>
                </li>
              </ul>
            </div>

            <div className="pt-6">
              <button
                onClick={() => handleCheckout('dev_team')}
                disabled={loadingPlan === 'dev_team'}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-pm-accent to-purple-600 hover:from-pm-accent-bright hover:to-purple-500 text-white font-extrabold text-xs transition-all shadow-lg shadow-purple-600/20 flex items-center justify-center gap-2 cursor-pointer"
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

          {/* CARD 3: ENTERPRISE ("LET'S TALK") */}
          <div className="bg-pm-surface border border-pm-border rounded-3xl p-6 flex flex-col justify-between hover:border-pm-accent/30 transition-all duration-200 shadow-xl relative">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-pm-accent">Enterprise</span>
                <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-500 text-[10px] font-bold">Custom</span>
              </div>

              <div>
                <span className="text-3xl font-extrabold text-pm-text">Custom SLA</span>
                <p className="text-xs text-pm-muted mt-1">Tailored for large teams and enterprise organizations.</p>
              </div>

              <hr className="border-pm-border" />

              <ul className="space-y-2.5 text-xs text-pm-muted">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-pm-accent flex-shrink-0" />
                  <span><strong>Unlimited Developer Seats</strong></span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-pm-accent flex-shrink-0" />
                  <span><strong>Unlimited Projects</strong></span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-pm-accent flex-shrink-0" />
                  <span>Dedicated Support & SLA Guarantee</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-pm-accent flex-shrink-0" />
                  <span>Custom On-Premise / Hybrid Deployment</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-pm-accent flex-shrink-0" />
                  <span>Custom Security & Compliance Audits</span>
                </li>
              </ul>
            </div>

            <div className="pt-6">
              <a
                href={`mailto:${ENTERPRISE_CONTACT_EMAIL}?subject=STAGE%20Enterprise%20Plan%20Inquiry`}
                className="w-full py-3 rounded-2xl bg-pm-surface-2 hover:bg-pm-surface-3 text-pm-text border border-pm-border hover:border-pm-accent/20 font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Mail className="w-3.5 h-3.5 text-pm-accent" />
                <span>Let's talk</span>
              </a>
            </div>
          </div>

        </div>

        {/* Footer info */}
        <div className="max-w-4xl mx-auto pt-16 text-center text-xs text-pm-muted space-y-2">
          <p>All subscriptions are powered safely by Dodo Payments in Sandbox Test Mode.</p>
          <p>Need custom procurement or invoice billing? Contact {ENTERPRISE_CONTACT_EMAIL}</p>
        </div>
      </div>

      <MarketingFooter />
    </div>
  )
}
