'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Code2,
  CheckCircle2,
  Clock,
  Sparkles,
  Zap,
  ArrowRight,
  Activity,
  Box
} from 'lucide-react';
import Link from 'next/link';
import { trackCtaClick } from '@/lib/analytics';
import { AnimatedMetricCounter } from '@/components/marketing/AnimatedMetricCounter';

type AudienceRole = 'client' | 'developer';

export default function ClientDevToggleSection() {
  const [role, setRole] = useState<AudienceRole>('client');

  const handleCtaClick = () => {
    trackCtaClick(`toggle_section_${role}_cta`, role);
  };

  return (
    <section id="roles" className="relative py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto z-10">
      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14">
        <h2 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-3 sm:mb-4">
          Two Perspectives. <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-500">One Simple Truth.</span>
        </h2>
        <p className="text-sm sm:text-base lg:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
          Clients see what they want changed. Developers get the exact code to fix it. No confusion. No wasted hours.
        </p>

        {/* Responsive Dual-Theme Toggle Selector */}
        <div className="mt-6 sm:mt-8 inline-flex flex-col sm:flex-row w-full sm:w-auto p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-lg dark:shadow-2xl backdrop-blur-xl">
          <button
            type="button"
            onClick={() => setRole('client')}
            className={`relative flex items-center justify-center gap-2.5 px-5 sm:px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 min-h-[44px] ${
              role === 'client'
                ? 'text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            {role === 'client' && (
              <motion.div
                layoutId="activeRoleTab"
                className="absolute inset-0 bg-indigo-600 rounded-xl"
                transition={{ type: 'spring', stiffness: 400, damping: 32 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <Users className="w-4 h-4" />
              For Clients & Reviewers
            </span>
          </button>

          <button
            type="button"
            onClick={() => setRole('developer')}
            className={`relative flex items-center justify-center gap-2.5 px-5 sm:px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 min-h-[44px] ${
              role === 'developer'
                ? 'text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            {role === 'developer' && (
              <motion.div
                layoutId="activeRoleTab"
                className="absolute inset-0 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl"
                transition={{ type: 'spring', stiffness: 400, damping: 32 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <Code2 className="w-4 h-4" />
              For Developers & Teams
            </span>
          </button>
        </div>
      </div>

      {/* Content Container */}
      <AnimatePresence mode="wait">
        {role === 'client' ? (
          <motion.div
            key="client-content"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch"
          >
            {/* Card 1: What You Get */}
            <div className="rounded-2xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm dark:shadow-none flex flex-col justify-between hover:border-indigo-500/40 transition-colors">
              <div>
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-5">
                  <Zap className="w-6 h-6" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-2">
                  What you do in STAGE
                </h3>
                <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm mb-6">
                  Zero setup. No software to download. Just open a link, point at what you want changed, and click.
                </p>

                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-200">
                        Click anywhere to leave a note
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        Point right at the image, text, or button. Type what you want changed right on top of it.
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-200">
                        No downloads or accounts needed
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        Works in any browser (Chrome, Safari, iPhone, Android). No browser extensions required.
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-200">
                        Watch fixes happen live
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        Pins turn from "Open" to "Fixed" in real-time as developers work.
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800">
                <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block mb-1">
                  What it is best for
                </span>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Clients and founders who want fast changes without learning Jira, GitHub, or developer terminology.
                </p>
              </div>
            </div>

            {/* Card 2: What It Saves */}
            <div className="rounded-2xl bg-gradient-to-b from-indigo-50 via-white to-white dark:from-indigo-950/40 dark:via-slate-900/60 dark:to-slate-900/80 border border-indigo-200 dark:border-indigo-500/30 p-6 sm:p-8 shadow-sm dark:shadow-none flex flex-col justify-between relative overflow-hidden group transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
              <div>
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-5 group-hover:scale-105 transition-transform">
                  <Clock className="w-6 h-6" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-2">
                  What STAGE saves you
                </h3>
                <div className="text-3xl sm:text-4xl font-extrabold text-indigo-600 dark:text-indigo-300 my-3">
                  <AnimatedMetricCounter value={10} suffix="+ Hours" />{' '}
                  <span className="text-sm sm:text-base font-normal text-slate-500 dark:text-slate-400">saved each week</span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm mb-5">
                  Stop taking screenshots, drawing red circles, and explaining where a button is on a 45-minute call.
                </p>

                <ul className="space-y-3 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                    <span>Ends 90% of review misunderstandings</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                    <span>No more lost comments buried in long email chains</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                    <span>Launch projects days ahead of deadline</span>
                  </li>
                </ul>
              </div>

              <div className="mt-6 pt-5 border-t border-indigo-100 dark:border-indigo-500/20">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Client Sign-Off Speed</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    <AnimatedMetricCounter value={3} suffix="x" /> Faster Approval
                  </span>
                </div>
              </div>
            </div>

            {/* Card 3: What Others CANNOT Do */}
            <div className="rounded-2xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm dark:shadow-none flex flex-col justify-between hover:border-indigo-500/40 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl md:col-span-2 lg:col-span-1 group">
              <div>
                <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-600 dark:text-cyan-400 mb-5 group-hover:scale-105 transition-transform">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-2">
                  What other tools can't do
                </h3>
                <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm mb-5">
                  Old tools force you to download browser plugins or look at frozen screenshots. STAGE is different:
                </p>

                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800 transition-colors hover:border-indigo-400/40">
                    <div className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white mb-0.5">
                      Review live, interactive websites
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      Click links, open menus, and submit forms live—not flat PNG pictures.
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800 transition-colors hover:border-indigo-400/40">
                    <div className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white mb-0.5">
                      No extensions or installs
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      Clients on corporate laptops with strict IT policies can review without asking for permission.
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800 transition-colors hover:border-indigo-400/40">
                    <div className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white mb-0.5">
                      Zero inbox spam
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      Drop 15 pins in 3 minutes—STAGE bundles them into one tidy summary email.
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800">
                <Link
                  href="/register"
                  onClick={handleCtaClick}
                  className="duol-shimmer-btn w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] shadow-md min-h-[44px]"
                >
                  Start Reviewing Free
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="dev-content"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch"
          >
            {/* Dev Card 1: What Developers Get */}
            <div className="rounded-2xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm dark:shadow-none flex flex-col justify-between hover:border-purple-500/40 transition-colors">
              <div>
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400 mb-5">
                  <Code2 className="w-6 h-6" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-2">
                  What developers get
                </h3>
                <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm mb-6">
                  Every client pin automatically collects the technical context you need to fix the bug in seconds.
                </p>

                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-200">
                        Exact CSS selector & styles
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        Inspect the HTML element, margins, paddings, and font rules with one click.
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-200">
                        Exact screen size & device info
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        Viewport width, device type, browser version, and console errors captured automatically.
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-200">
                        1-Click Linear & GitHub export
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        Turn visual pins directly into bug tickets with deep links back to the exact page element.
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800">
                <span className="text-xs font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-400 block mb-1">
                  What it is best for
                </span>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Ending "cannot reproduce" rejections and stopping Slack messages asking for screen resolutions.
                </p>
              </div>
            </div>

            {/* Dev Card 2: What It Saves */}
            <div className="rounded-2xl bg-gradient-to-b from-purple-50 via-white to-white dark:from-purple-950/40 dark:via-slate-900/60 dark:to-slate-900/80 border border-purple-200 dark:border-purple-500/30 p-6 sm:p-8 shadow-sm dark:shadow-none flex flex-col justify-between relative overflow-hidden group transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
              <div>
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 dark:bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-600 dark:text-purple-400 mb-5 group-hover:scale-105 transition-transform">
                  <Activity className="w-6 h-6" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-2">
                  What STAGE saves you
                </h3>
                <div className="text-3xl sm:text-4xl font-extrabold text-purple-600 dark:text-purple-300 my-3">
                  <AnimatedMetricCounter value={80} suffix="%" /> Faster{' '}
                  <span className="text-sm sm:text-base font-normal text-slate-500 dark:text-slate-400">QA turnaround</span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm mb-5">
                  Fix bugs in minutes instead of days because you don't have to guess what the client was clicking on.
                </p>

                <ul className="space-y-3 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
                    <span>Saves 15+ engineering hours every sprint</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
                    <span>Eliminates guesswork on mobile layout bugs</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
                    <span>Automated alerts remind leads before launch deadlines</span>
                  </li>
                </ul>
              </div>

              <div className="mt-6 pt-5 border-t border-purple-100 dark:border-purple-500/20">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Engineering Efficiency</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    <AnimatedMetricCounter value={350} prefix="+" suffix="%" /> Faster Fixes
                  </span>
                </div>
              </div>
            </div>

            {/* Dev Card 3: What Others CANNOT Do */}
            <div className="rounded-2xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm dark:shadow-none flex flex-col justify-between hover:border-purple-500/40 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl md:col-span-2 lg:col-span-1 group">
              <div>
                <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-600 dark:text-cyan-400 mb-5 group-hover:scale-105 transition-transform">
                  <Box className="w-6 h-6" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-2">
                  What other tools can't do
                </h3>
                <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm mb-5">
                  STAGE provides deep engineering features that legacy screenshot review tools can't touch:
                </p>

                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800 transition-colors hover:border-purple-400/40">
                    <div className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white mb-0.5">
                      3D WebGL & Three.js Pinning
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      Drop pins directly onto 3D models and canvas scenes with exact spatial coordinates.
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800 transition-colors hover:border-purple-400/40">
                    <div className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white mb-0.5">
                      Automated 48-hour bug reminders
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      Urgent bugs that sit unaddressed automatically notify project leads so nothing slips through.
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800 transition-colors hover:border-purple-400/40">
                    <div className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white mb-0.5">
                      Live CSS & copy sandbox
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      Test visual CSS tweaks and wording changes right in the browser before committing code.
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800">
                <Link
                  href="/register"
                  onClick={handleCtaClick}
                  className="duol-shimmer-btn w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-sm transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] shadow-md min-h-[44px]"
                >
                  Start Building Free
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
