'use client';

import React, { useEffect, useState } from 'react';
import { Check, ArrowRight, Mail, Sparkles, ShieldCheck } from 'lucide-react';
import { useBillingStore } from '@/store/useBillingStore';
import MarketingNav from '@/components/marketing/MarketingNav';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import Link from 'next/link';

const ENTERPRISE_CONTACT_EMAIL = process.env.NEXT_PUBLIC_ENTERPRISE_CONTACT_EMAIL || "saumya@entrext.com";

export default function PricingClient() {
  const {
    currentPlan,
    isPaid,
    isTestMode,
    earlyBirdSlotsRemaining,
    fetchEarlyBirdStatus,
    fetchBillingStatus,
    initiateCheckout
  } = useBillingStore();

  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchEarlyBirdStatus();
    fetchBillingStatus();
  }, [fetchEarlyBirdStatus, fetchBillingStatus]);

  const handleCheckout = async (planType: string) => {
    setLoadingPlan(planType);
    setErrorMsg(null);
    try {
      const checkoutUrl = await initiateCheckout(planType);
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      } else {
        setErrorMsg('Failed to initialize checkout session. Please try again.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error redirecting to checkout.');
    } finally {
      setLoadingPlan(null);
    }
  };

  const isEarlyBirdActive = earlyBirdSlotsRemaining > 0;
  const isDevTeamActive = isPaid && (currentPlan === 'dev_team' || currentPlan === 'dev_team_early_bird');
  const isStudioActive = isPaid && currentPlan === 'stage_team';
  const isFreeActive = !isPaid && (!currentPlan || currentPlan === 'free' || currentPlan === 'none');

  return (
    <div className="min-h-screen bg-[var(--pm-bg)] text-pm-text font-sans transition-colors duration-500 selection:bg-[#2B4CFF]/20">
      <MarketingNav />

      {/* Main Container */}
      <div className="pt-32 pb-24 max-w-7xl mx-auto px-6">
        
        {/* Header (Section 8.9) */}
        <div className="text-center space-y-4 max-w-3xl mx-auto pb-14">
          <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[#2B4CFF] bg-[#2B4CFF]/10 px-3 py-1 rounded-full inline-block">
            Transparent Pricing
          </span>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-[#16141A] dark:text-white leading-[1.05]">
            Pricing.{' '}
            <span className="font-serif italic font-normal text-[#2B4CFF] dark:text-[#7C97FF]">
              Reviewers are free.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-pm-muted max-w-xl mx-auto font-sans">
            Pay for projects and team members. Reviewers are free.
          </p>

          {errorMsg && (
            <div className="max-w-md mx-auto p-3 rounded-xl bg-[#FCE7E4] border border-[#FCE7E4] text-[#9E2A2B] text-xs font-mono font-semibold">
              {errorMsg}
            </div>
          )}
        </div>

        {/* 4 Pricing Tiers Grid (Section 8.9 & Decision D8) with Double-Bezel */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch max-w-7xl mx-auto">
          
          {/* TIER 1: FREE */}
          <div className="p-1.5 rounded-[2.25rem] bg-slate-900/[0.03] dark:bg-white/[0.04] border border-slate-200/70 dark:border-white/10 shadow-xs flex flex-col">
            <div className="p-7 rounded-[1.875rem] bg-white dark:bg-[#16141A] flex-1 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-pm-muted bg-slate-100 dark:bg-white/5 px-2.5 py-0.5 rounded-full">
                    Free
                  </span>
                  {isFreeActive && (
                    <span className="px-2 py-0.5 rounded-full bg-[#E6F4EA] border border-[#CEEAD6] text-[#137333] text-[10px] font-mono font-bold">
                      Current Plan
                    </span>
                  )}
                </div>

                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold text-[#16141A] dark:text-white">$0</span>
                    <span className="text-xs text-pm-muted font-sans">/ month forever</span>
                  </div>
                  <p className="text-xs text-pm-muted mt-2 font-sans leading-relaxed">
                    Try STAGE on one project. Comment on pages.
                  </p>
                </div>

                <hr className="border-slate-100 dark:border-white/5" />

                <ul className="space-y-2.5 text-xs text-pm-muted font-sans">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#137333] shrink-0" />
                    <span><strong>1 team member</strong></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#137333] shrink-0" />
                    <span><strong>1 project</strong></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#137333] shrink-0" />
                    <span>Unlimited review links &amp; comments</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#137333] shrink-0" />
                    <span>Reviewers never need an account</span>
                  </li>
                </ul>
              </div>

              <div className="pt-4">
                {isFreeActive ? (
                  <button
                    disabled
                    className="w-full py-3 rounded-full bg-slate-100 dark:bg-white/5 text-pm-muted font-mono text-xs font-semibold cursor-not-allowed opacity-70 flex items-center justify-center gap-2"
                  >
                    <span>Current Plan</span>
                  </button>
                ) : (
                  <Link
                    href="/dashboard"
                    className="w-full py-3 rounded-full bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-[#16141A] dark:text-white font-mono text-xs font-semibold transition-all flex items-center justify-center gap-2"
                  >
                    <span>Go to Dashboard</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* TIER 2: TEAM (HIGHLIGHTED / POPULAR) */}
          <div className="p-1.5 rounded-[2.25rem] bg-slate-900/[0.05] dark:bg-white/[0.08] border-2 border-[#2B4CFF] shadow-lg flex flex-col relative">
            {isEarlyBirdActive && !isDevTeamActive && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-[#2B4CFF] text-white text-[10px] font-mono font-bold tracking-wider uppercase shadow-xs flex items-center gap-1.5 whitespace-nowrap">
                <Sparkles className="w-3 h-3" />
                <span>25% Early Bird · {earlyBirdSlotsRemaining} Left</span>
              </div>
            )}

            <div className="p-7 rounded-[1.875rem] bg-white dark:bg-[#16141A] flex-1 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#1A73E8] dark:text-[#8AB4F8] bg-[#EBF1FE] dark:bg-[#1A73E8]/15 border border-[#D2E3FC] dark:border-[#1A73E8]/30 px-2.5 py-0.5 rounded-full">
                    Team
                  </span>
                  {isDevTeamActive && (
                    <span className="px-2 py-0.5 rounded-full bg-[#E6F4EA] dark:bg-[#137333]/20 border border-[#CEEAD6] dark:border-[#137333]/30 text-[#137333] dark:text-[#A7F3D0] text-[10px] font-mono font-bold">
                      Current Plan
                    </span>
                  )}
                </div>

                <div>
                  <div className="flex items-baseline gap-1.5">
                    {isEarlyBirdActive && !isDevTeamActive ? (
                      <>
                        <span className="text-4xl font-extrabold text-[#16141A] dark:text-white">$21.75</span>
                        <span className="text-sm line-through text-slate-400 font-sans">$29</span>
                        <span className="text-xs text-pm-muted font-sans">/ month flat</span>
                      </>
                    ) : (
                      <>
                        <span className="text-4xl font-extrabold text-[#16141A] dark:text-white">$29</span>
                        <span className="text-xs text-pm-muted font-sans">/ month flat</span>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-pm-muted mt-2 font-sans leading-relaxed">
                    For small teams with several sites. Includes on-page editing.
                  </p>
                </div>

                <hr className="border-slate-100 dark:border-white/5" />

                <ul className="space-y-2.5 text-xs text-pm-muted font-sans">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#2B4CFF] shrink-0" />
                    <span><strong>5 team members</strong></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#2B4CFF] shrink-0" />
                    <span><strong>10 projects</strong></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#2B4CFF] shrink-0" />
                    <span>Edit on the page (live CSS)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#2B4CFF] shrink-0" />
                    <span>Send comments to GitHub as issues</span>
                  </li>
                </ul>
              </div>

              <div className="pt-4">
                {isDevTeamActive ? (
                  <button
                    disabled
                    className="w-full py-3 rounded-full bg-[#E6F4EA] text-[#137333] font-mono text-xs font-semibold cursor-not-allowed opacity-90 flex items-center justify-center gap-2"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Current Active Plan</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleCheckout('dev_team')}
                    disabled={loadingPlan === 'dev_team'}
                    className="group w-full py-3.5 px-4 rounded-full bg-[#2B4CFF] hover:bg-[#203ecc] text-white font-mono text-xs font-bold uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
                  >
                    {loadingPlan === 'dev_team' ? (
                      <span>Redirecting to checkout...</span>
                    ) : (
                      <>
                        <span>{isEarlyBirdActive ? 'Claim Early Bird' : 'Subscribe to Team'}</span>
                        <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* TIER 3: STUDIO */}
          <div className="p-1.5 rounded-[2.25rem] bg-slate-900/[0.03] dark:bg-white/[0.04] border border-slate-200/70 dark:border-white/10 shadow-xs flex flex-col">
            <div className="p-7 rounded-[1.875rem] bg-white dark:bg-[#16141A] flex-1 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#4A154B] dark:text-[#D1C4E9] bg-[#ECE6F6] dark:bg-[#7C4DFF]/15 border border-[#ECE6F6] dark:border-[#7C4DFF]/30 px-2.5 py-0.5 rounded-full">
                    Studio
                  </span>
                  {isStudioActive && (
                    <span className="px-2 py-0.5 rounded-full bg-[#E6F4EA] dark:bg-[#137333]/20 border border-[#CEEAD6] dark:border-[#137333]/30 text-[#137333] dark:text-[#A7F3D0] text-[10px] font-mono font-bold">
                      Current Plan
                    </span>
                  )}
                </div>

                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold text-[#16141A] dark:text-white">$79</span>
                    <span className="text-xs text-pm-muted font-sans">/ month flat</span>
                  </div>
                  <p className="text-xs text-pm-muted mt-2 font-sans leading-relaxed">
                    For agencies with many client reviews. Priority support.
                  </p>
                </div>

                <hr className="border-slate-100 dark:border-white/5" />

                <ul className="space-y-2.5 text-xs text-pm-muted font-sans">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#7C4DFF] shrink-0" />
                    <span><strong>Unlimited team members</strong></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#7C4DFF] shrink-0" />
                    <span><strong>Unlimited projects</strong></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#7C4DFF] shrink-0" />
                    <span>Password-protected review links</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#7C4DFF] shrink-0" />
                    <span>Priority engineering support</span>
                  </li>
                </ul>
              </div>

              <div className="pt-4">
                {isStudioActive ? (
                  <button
                    disabled
                    className="w-full py-3 rounded-full bg-[#E6F4EA] dark:bg-[#137333]/20 text-[#137333] dark:text-[#A7F3D0] font-mono text-xs font-semibold cursor-not-allowed opacity-90 flex items-center justify-center gap-2"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Current Active Plan</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleCheckout('stage_team')}
                    disabled={loadingPlan === 'stage_team'}
                    className="w-full py-3 rounded-full bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-[#16141A] dark:text-white font-mono text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
                  >
                    {loadingPlan === 'stage_team' ? (
                      <span>Redirecting...</span>
                    ) : (
                      <>
                        <span>Subscribe to Studio</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* TIER 4: ENTERPRISE */}
          <div className="p-1.5 rounded-[2.25rem] bg-slate-900/[0.03] dark:bg-white/[0.04] border border-slate-200/70 dark:border-white/10 shadow-xs flex flex-col">
            <div className="p-7 rounded-[1.875rem] bg-white dark:bg-[#16141A] flex-1 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#B06000] dark:text-[#FDE68A] bg-[#FEF3E2] dark:bg-[#B06000]/15 border border-[#FEF3E2] dark:border-[#B06000]/30 px-2.5 py-0.5 rounded-full">
                    Enterprise
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/5 text-pm-muted text-[10px] font-mono font-bold">
                    Custom
                  </span>
                </div>

                <div>
                  <div className="text-3xl font-extrabold text-[#16141A] dark:text-white">Custom SLA</div>
                  <p className="text-xs text-pm-muted mt-2 font-sans leading-relaxed">
                    Custom limits, support terms and security.
                  </p>
                </div>

                <hr className="border-slate-100 dark:border-white/5" />

                <ul className="space-y-2.5 text-xs text-pm-muted font-sans">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>Custom limits and seats</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>Dedicated SLA terms</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>Custom security review</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>Invoice billing &amp; procurement</span>
                  </li>
                </ul>
              </div>

              <div className="pt-4">
                <a
                  href={`mailto:${ENTERPRISE_CONTACT_EMAIL}?subject=STAGE%20Enterprise%20Plan%20Inquiry`}
                  className="w-full py-3 rounded-full bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-[#16141A] dark:text-white font-mono text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Mail className="w-3.5 h-3.5 text-pm-muted" />
                  <span>Talk to us</span>
                </a>
              </div>
            </div>
          </div>

        </div>

        {/* Reassurance footnote */}
        <div className="max-w-2xl mx-auto pt-16 text-center text-xs text-pm-muted space-y-1 font-sans">
          <p>Pay for projects and team members. Reviewers are free.</p>
          <p>Questions about procurement? Contact {ENTERPRISE_CONTACT_EMAIL}</p>
        </div>
      </div>

      <MarketingFooter />
    </div>
  );
}
