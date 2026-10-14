'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check,
  X,
  Minus,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Layers,
  Zap,
  Globe,
  Users,
  Code2,
  AlertTriangle,
  Target,
  Wrench,
  Eye,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import MarketingNav from '@/components/marketing/MarketingNav';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import AmbientBackground from '@/components/marketing/AmbientBackground';

type ActiveTab = 'all' | 'marker-io' | 'bugherd' | 'figma';

type CellValue = boolean | 'partial' | 'na';

interface MatrixItem {
  feature: string;
  tooltip: string;
  stage: CellValue;
  markerIo: CellValue;
  bugHerd: CellValue;
  figma: CellValue;
}

interface MatrixGroup {
  category: string;
  items: MatrixItem[];
}

interface UseCaseDecision {
  icon: React.ElementType;
  scenario: string;
  winner: string;
  winnerColor: string;
  why: string;
  notGoodFor: { tool: string; reason: string };
}

interface StageWeakness {
  icon: React.ElementType;
  title: string;
  detail: string;
}

export default function CompareClient() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('all');
  const [stageWeaknessOpen, setStageWeaknessOpen] = useState(false);

  const matrixFeatures: MatrixGroup[] = [
    {
      category: 'Setup & Access Friction',
      items: [
        {
          feature: 'Zero-Install (No browser extensions)',
          tooltip: 'Any reviewer can leave feedback via URL - no Chrome extensions, nothing to download.',
          stage: true,
          markerIo: false,
          bugHerd: false,
          figma: 'na',
        },
        {
          feature: 'Zero Code Changes (No script tags / npm packages)',
          tooltip: 'No need to inject JavaScript into your codebase or staging environment.',
          stage: true,
          markerIo: false,
          bugHerd: false,
          figma: 'na',
        },
        {
          feature: 'Client Access Without Account / Signup',
          tooltip: 'Clients click a tokenised link and pin immediately - no registration wall.',
          stage: true,
          markerIo: 'partial',
          bugHerd: false,
          figma: false,
        },
        {
          feature: 'Works on Any Public URL (Vercel, Netlify, production)',
          tooltip: 'Paste any live or staging URL and start reviewing immediately.',
          stage: true,
          markerIo: true,
          bugHerd: true,
          figma: false,
        },
        {
          feature: 'Instant Setup (< 60 seconds)',
          tooltip: 'Time from account creation to first feedback pin placed on live site.',
          stage: true,
          markerIo: false,
          bugHerd: false,
          figma: false,
        },
      ],
    },
    {
      category: 'Technical Capture & Telemetry',
      items: [
        {
          feature: '3D WebGL & Three.js Canvas Raycasting',
          tooltip: 'Pins annotations directly onto 3D mesh geometry, not just a flat screenshot overlay.',
          stage: true,
          markerIo: false,
          bugHerd: false,
          figma: false,
        },
        {
          feature: 'Computed CSS & Box-Model Extraction',
          tooltip: 'Captures exact font-size, padding, margin, colour hex, and z-index live from the DOM.',
          stage: true,
          markerIo: 'partial',
          bugHerd: 'partial',
          figma: false,
        },
        {
          feature: 'Precise XPath & DOM Selector Telemetry',
          tooltip: 'Element location survives dynamic re-renders, route changes, and DOM hydration.',
          stage: true,
          markerIo: true,
          bugHerd: 'partial',
          figma: false,
        },
        {
          feature: 'Browser Console Log Capture',
          tooltip: 'Attaches console errors and warnings to each feedback pin automatically.',
          stage: true,
          markerIo: true,
          bugHerd: false,
          figma: false,
        },
        {
          feature: 'Interactive Navigation During Review',
          tooltip: 'Click links, scroll, and navigate the live site while dropping pins - no page reload needed.',
          stage: true,
          markerIo: false,
          bugHerd: 'partial',
          figma: false,
        },
        {
          feature: 'Real-Time Multi-Reviewer Sync',
          tooltip: 'See teammate pins, comments, and status changes stream live without refresh.',
          stage: true,
          markerIo: false,
          bugHerd: false,
          figma: true,
        },
      ],
    },
    {
      category: 'Developer Handoff & Productivity',
      items: [
        {
          feature: 'Auto-Classified Issue Type (layout / typography / media)',
          tooltip: 'Machine-detects issue category so developers know which engineer to route it to.',
          stage: true,
          markerIo: false,
          bugHerd: false,
          figma: false,
        },
        {
          feature: 'One-Click GitHub / Linear Checklist Export',
          tooltip: 'Exports complete markdown bug reports - XPath, computed styles, and steps to reproduce.',
          stage: true,
          markerIo: true,
          bugHerd: true,
          figma: 'partial',
        },
        {
          feature: 'Responsive Viewport Testing (Mobile / Tablet / Desktop)',
          tooltip: 'Switch between device viewports inside the review session without needing DevTools.',
          stage: true,
          markerIo: true,
          bugHerd: 'partial',
          figma: 'partial',
        },
        {
          feature: 'Unlimited Feedback Pins on Free Tier',
          tooltip: 'Place as many pins as needed without hitting paywalls on marker volume.',
          stage: true,
          markerIo: false,
          bugHerd: false,
          figma: 'partial',
        },
        {
          feature: 'Unlimited Guest Reviewers at No Extra Cost',
          tooltip: 'Invite clients and stakeholders without paying per-seat fees for each external reviewer.',
          stage: true,
          markerIo: false,
          bugHerd: false,
          figma: false,
        },
      ],
    },
    {
      category: 'Design & Workflow Integration',
      items: [
        {
          feature: 'Kanban / Task Management Board Built-In',
          tooltip: 'Manage feedback items in a project board without leaving the tool.',
          stage: 'partial',
          markerIo: 'partial',
          bugHerd: true,
          figma: false,
        },
        {
          feature: 'UI/UX Vector Design & Component Libraries',
          tooltip: 'Create and share design system tokens, components, and interaction specs.',
          stage: false,
          markerIo: false,
          bugHerd: false,
          figma: true,
        },
        {
          feature: 'Jira / Linear / GitHub Native Integration',
          tooltip: 'Push tickets directly to your project management tools in one click.',
          stage: true,
          markerIo: true,
          bugHerd: true,
          figma: 'partial',
        },
        {
          feature: 'Video / Screen Recording in Feedback',
          tooltip: 'Attach video walkthroughs alongside pinned annotations for complex bugs.',
          stage: false,
          markerIo: true,
          bugHerd: false,
          figma: false,
        },
      ],
    },
  ];

  const useCaseDecisions: UseCaseDecision[] = [
    {
      icon: Code2,
      scenario: 'Reviewing live staging & production sites',
      winner: 'STAGE',
      winnerColor: '#2B4CFF',
      why: 'STAGE is built specifically for this -- reverse-proxy architecture means zero code changes to your repo, instant access via URL, and full DOM + console telemetry on the live page.',
      notGoodFor: { tool: 'Figma', reason: 'Figma only reviews static vector files, not live HTML.' },
    },
    {
      icon: Layers,
      scenario: 'Designing UI mockups and wireframes before coding',
      winner: 'Figma',
      winnerColor: '#A259FF',
      why: 'Figma is the undisputed industry leader for vector UI design, component libraries, and design system tokens. There is no better tool for the pre-development design phase.',
      notGoodFor: { tool: 'STAGE', reason: 'STAGE works on built live code, not pre-code vector drafts.' },
    },
    {
      icon: Users,
      scenario: 'Client sign-off with non-technical stakeholders',
      winner: 'STAGE',
      winnerColor: '#2B4CFF',
      why: 'Clients receive a single link, click it, and pin feedback directly onto the live site -- no accounts, no extensions, no confusion. Feedback appears on the exact version they are reviewing.',
      notGoodFor: { tool: 'BugHerd', reason: 'BugHerd requires stakeholders to install a browser extension.' },
    },
    {
      icon: Globe,
      scenario: 'Traditional agency brochure site projects',
      winner: 'BugHerd',
      winnerColor: '#00A3FF',
      why: 'BugHerd\'s sticky note kanban metaphor is familiar to non-technical project managers. For simple brochure sites where the team controls the codebase, embedding the script is low-friction.',
      notGoodFor: { tool: 'STAGE', reason: 'STAGE\'s strength is frictionless external access -- less relevant if your whole team already controls the codebase.' },
    },
    {
      icon: Zap,
      scenario: 'Bug reporting with PM tool integrations (Jira, ClickUp)',
      winner: 'Marker.io',
      winnerColor: '#FF5C35',
      why: 'Marker.io has the most mature integration ecosystem with polished native connectors to Jira, Trello, GitHub, ClickUp, and Shortcut. If deep PM tool sync is your #1 priority, it leads.',
      notGoodFor: { tool: 'STAGE', reason: 'STAGE\'s PM integrations are newer and still maturing compared to Marker.io\'s ecosystem.' },
    },
    {
      icon: ShieldCheck,
      scenario: 'Reviewing 3D WebGL / Three.js interactive experiences',
      winner: 'STAGE',
      winnerColor: '#2B4CFF',
      why: 'Only STAGE can raycast into 3D scene geometry and pin feedback onto specific meshes. Screenshot-based tools capture a flat 2D image of a 3D scene, losing all spatial context.',
      notGoodFor: { tool: 'Marker.io / BugHerd / Figma', reason: 'None support 3D canvas depth testing -- they flatten the 3D scene into a 2D screenshot.' },
    },
  ];

  const stageWeaknesses: StageWeakness[] = [
    {
      icon: Wrench,
      title: 'PM Integration Ecosystem is Still Maturing',
      detail: 'STAGE integrates with GitHub and Linear today. Jira, ClickUp, Trello, and Shortcut are on the roadmap. If deep native PM sync is mission-critical right now, Marker.io currently has more connectors.',
    },
    {
      icon: Eye,
      title: 'No Built-In Video / Screen Recording',
      detail: 'Marker.io lets reviewers attach video recordings alongside pinned bugs. STAGE currently does not support in-session video -- though you can attach external Loom links in comments.',
    },
    {
      icon: Layers,
      title: 'No UI Design Capabilities (By Design)',
      detail: 'STAGE does not let you design wireframes or component libraries. This is not a gap -- it is a deliberate focus. STAGE reviews built code. Use Figma upstream for design, STAGE downstream for QA.',
    },
    {
      icon: ShieldCheck,
      title: 'Password-Protected Staging Sites Need Extra Steps',
      detail: 'Sites behind HTTP Basic Auth or complex SSO (Okta, Auth0 login walls) require additional proxy configuration. Public Vercel/Netlify previews and production sites work instantly.',
    },
    {
      icon: Target,
      title: 'Kanban Project Management is Basic Today',
      detail: 'STAGE has a feedback inbox and status tracking. BugHerd has a more developed full-kanban board view. If your team exclusively manages work inside a bug tracker (not GitHub/Linear), BugHerd may suit better.',
    },
  ];

  return (
    <div className="relative min-h-screen bg-[var(--pm-bg)] text-pm-text selection:bg-[#2B4CFF]/20 selection:text-[#16141A] dark:selection:text-white font-sans overflow-x-hidden scroll-smooth transition-colors duration-500">
      <AmbientBackground />

      <div className="relative z-10 flex flex-col min-h-screen">
        <MarketingNav />

        <main className="flex-1 flex flex-col pt-28 sm:pt-36 pb-20">

          {/* Hero */}
          <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#2B4CFF]/10 dark:bg-[#2B4CFF]/20 border border-[#2B4CFF]/30 text-[#2B4CFF] dark:text-[#7C97FF] text-xs font-mono font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Honest Tool Comparison 2025</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-extrabold tracking-tight text-[#16141A] dark:text-white leading-[1.1]">
              STAGE vs. Marker.io, BugHerd &amp; Figma{' '}
              <br className="hidden sm:inline" />
              <span className="bg-gradient-to-r from-[#2B4CFF] via-[#7C97FF] to-[#A855F7] bg-clip-text text-transparent">
                Which Tool Is Right for You?
              </span>
            </h1>

            <p className="text-base sm:text-lg text-pm-muted max-w-2xl mx-auto leading-relaxed">
              An unbiased breakdown of STAGE, Marker.io, BugHerd, and Figma -- covering the best tool for every workflow, where STAGE wins, and where it genuinely does not.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link
                href="/register"
                className="px-6 py-3 rounded-full bg-[#2B4CFF] hover:bg-[#1E3BD0] text-white text-xs font-mono font-bold uppercase tracking-wider shadow-lg shadow-[#2B4CFF]/25 hover:shadow-xl hover:shadow-[#2B4CFF]/35 transition-all flex items-center gap-2 active:scale-95"
              >
                <span>Try STAGE Free</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="#which-tool"
                className="px-6 py-3 rounded-full bg-white dark:bg-[#16141A] border border-slate-200/80 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 text-[#16141A] dark:text-white text-xs font-mono font-bold uppercase tracking-wider shadow-sm transition-all"
              >
                Find My Tool
              </a>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 pt-4 text-xs text-pm-muted">
              <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-500" />No credit card for free tier</span>
              <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-500" />Zero code changes to your repo</span>
              <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-500" />Works on any public URL instantly</span>
            </div>
          </section>

          {/* TL;DR Summary Cards */}
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-20">
            <div className="text-center mb-10 space-y-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#2B4CFF] dark:text-[#7C97FF]">Quick TL;DR</span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#16141A] dark:text-white">
                4 tools. 4 very different purposes.
              </h2>
              <p className="text-sm text-pm-muted max-w-xl mx-auto">
                None of these tools are bad -- they are built for different stages of the web development workflow.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">

              {/* STAGE */}
              <div className="relative rounded-2xl p-6 bg-white dark:bg-[#16141A] border-2 border-[#2B4CFF] dark:border-[#7C97FF]/50 shadow-xl shadow-[#2B4CFF]/10 flex flex-col gap-4">
                <div className="absolute top-0 right-0 bg-[#2B4CFF] text-white font-mono text-[9px] font-extrabold uppercase px-3 py-1 rounded-bl-xl tracking-wider">
                  Our Pick
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#2B4CFF] shadow-[0_0_8px_#2B4CFF]" />
                    <h3 className="text-xl font-black text-[#16141A] dark:text-white">STAGE</h3>
                  </div>
                  <p className="text-xs text-pm-muted leading-relaxed">
                    Visual QA and client sign-off on <strong className="text-[#16141A] dark:text-white">live built websites</strong> -- zero extensions, zero code changes.
                  </p>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-start gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                    <Check className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>Best for: staging QA, client reviews, 3D web, SPAs</span>
                  </div>
                  <div className="flex items-start gap-1.5 text-amber-600 dark:text-amber-400 font-medium">
                    <Minus className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>Not for: pre-code design files</span>
                  </div>
                </div>
                <div className="mt-auto pt-3 border-t border-slate-100 dark:border-white/5">
                  <div className="text-xs text-pm-muted mb-0.5 font-mono">Starts at</div>
                  <div className="text-base font-extrabold text-[#16141A] dark:text-white">Free <span className="text-xs font-normal text-pm-muted">/ teams from $19/mo</span></div>
                </div>
              </div>

              {/* Marker.io */}
              <div className="rounded-2xl p-6 bg-white dark:bg-[#16141A] border border-slate-200/80 dark:border-white/10 shadow-sm flex flex-col gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-xl font-bold text-[#16141A] dark:text-white">Marker.io</h3>
                    <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#FF5C35]/10 text-[#FF5C35] border border-[#FF5C35]/20">Widget</span>
                  </div>
                  <p className="text-xs text-pm-muted leading-relaxed">
                    Mature bug-reporting widget for teams who can embed a JS snippet and need deep PM tool integrations.
                  </p>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-start gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                    <Check className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>Best for: internal teams with Jira/ClickUp workflows</span>
                  </div>
                  <div className="flex items-start gap-1.5 text-rose-500 font-medium">
                    <X className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>Not for: client-facing reviews without extensions</span>
                  </div>
                </div>
                <div className="mt-auto pt-3 border-t border-slate-100 dark:border-white/5">
                  <div className="text-xs text-pm-muted mb-0.5 font-mono">Starts at</div>
                  <div className="text-base font-bold text-[#16141A] dark:text-white">$39 <span className="text-xs font-normal text-pm-muted">/ month</span></div>
                </div>
              </div>

              {/* BugHerd */}
              <div className="rounded-2xl p-6 bg-white dark:bg-[#16141A] border border-slate-200/80 dark:border-white/10 shadow-sm flex flex-col gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-xl font-bold text-[#16141A] dark:text-white">BugHerd</h3>
                    <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#00A3FF]/10 text-[#00A3FF] border border-[#00A3FF]/20">Kanban</span>
                  </div>
                  <p className="text-xs text-pm-muted leading-relaxed">
                    Sticky-note bug tracker with built-in kanban. Best for traditional agency teams on simple static sites.
                  </p>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-start gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                    <Check className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>Best for: agency projects with built-in task boards</span>
                  </div>
                  <div className="flex items-start gap-1.5 text-rose-500 font-medium">
                    <X className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>Not for: SPAs, external clients, or 3D sites</span>
                  </div>
                </div>
                <div className="mt-auto pt-3 border-t border-slate-100 dark:border-white/5">
                  <div className="text-xs text-pm-muted mb-0.5 font-mono">Starts at</div>
                  <div className="text-base font-bold text-[#16141A] dark:text-white">$39 <span className="text-xs font-normal text-pm-muted">/ month</span></div>
                </div>
              </div>

              {/* Figma */}
              <div className="rounded-2xl p-6 bg-white dark:bg-[#16141A] border border-slate-200/80 dark:border-white/10 shadow-sm flex flex-col gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-xl font-bold text-[#16141A] dark:text-white">Figma</h3>
                    <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#A259FF]/10 text-[#A259FF] border border-[#A259FF]/20">Design</span>
                  </div>
                  <p className="text-xs text-pm-muted leading-relaxed">
                    The gold standard for designing UI before writing code. Not a live-site testing tool.
                  </p>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-start gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                    <Check className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>Best for: wireframes, design systems, UI mockups</span>
                  </div>
                  <div className="flex items-start gap-1.5 text-rose-500 font-medium">
                    <X className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>Not for: reviewing live code, real CSS, or DOM bugs</span>
                  </div>
                </div>
                <div className="mt-auto pt-3 border-t border-slate-100 dark:border-white/5">
                  <div className="text-xs text-pm-muted mb-0.5 font-mono">Starts at</div>
                  <div className="text-base font-bold text-[#16141A] dark:text-white">$12 <span className="text-xs font-normal text-pm-muted">/ editor / month</span></div>
                </div>
              </div>

            </div>
          </section>

          {/* Scenario Decision Guide */}
          <section id="which-tool" className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-28">
            <div className="text-center space-y-2 mb-12">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#2B4CFF] dark:text-[#7C97FF]">Scenario Decision Guide</span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#16141A] dark:text-white">
                Which tool is best for your exact situation?
              </h2>
              <p className="text-sm text-pm-muted max-w-xl mx-auto">
                Honest recommendations by workflow -- including when a competitor genuinely wins.
              </p>
            </div>

            <div className="space-y-4">
              {useCaseDecisions.map((d, i) => {
                const Icon = d.icon;
                return (
                  <div key={i} className="rounded-2xl p-5 sm:p-6 bg-white dark:bg-[#16141A] border border-slate-200/80 dark:border-white/10 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                      <div className="shrink-0 flex items-center gap-3 sm:flex-col sm:items-center sm:w-20">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                          style={{ backgroundColor: `${d.winnerColor}20` }}
                        >
                          <Icon className="w-5 h-5" style={{ color: d.winnerColor }} />
                        </div>
                        <div
                          className="text-[9px] sm:mt-1 font-mono font-bold px-2 py-0.5 rounded-full border text-center"
                          style={{
                            color: d.winnerColor,
                            borderColor: `${d.winnerColor}40`,
                            backgroundColor: `${d.winnerColor}15`,
                          }}
                        >
                          {d.winner} wins
                        </div>
                      </div>

                      <div className="flex-1 space-y-2">
                        <h3 className="text-sm font-bold text-[#16141A] dark:text-white leading-snug">
                          {d.scenario}
                        </h3>
                        <p className="text-xs text-pm-muted leading-relaxed">
                          <strong className="text-[#16141A] dark:text-slate-200">{d.winner} wins because:</strong> {d.why}
                        </p>
                        <p className="text-xs leading-relaxed">
                          <span className="inline-flex items-center gap-1 text-rose-500 font-semibold">
                            <X className="w-3 h-3" /> Avoid {d.notGoodFor.tool} here:
                          </span>{' '}
                          <span className="text-pm-muted">{d.notGoodFor.reason}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Honest STAGE Weaknesses */}
          <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-28">
            <div className="rounded-2xl border border-amber-400/30 dark:border-amber-400/20 bg-amber-50/60 dark:bg-amber-400/5 overflow-hidden">
              <button
                onClick={() => setStageWeaknessOpen(v => !v)}
                className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-6 sm:p-8 text-left cursor-pointer"
                aria-expanded={stageWeaknessOpen}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                      Honest Limitations
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-[#16141A] dark:text-white">
                    Where STAGE is not the best choice -- yet
                  </h2>
                  <p className="text-sm text-pm-muted max-w-2xl">
                    We built STAGE to solve live website QA. There are legitimate cases where another tool currently does a better job. Here is the honest list.
                  </p>
                </div>
                <div className="shrink-0 self-start sm:self-center">
                  {stageWeaknessOpen
                    ? <ChevronUp className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    : <ChevronDown className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  }
                </div>
              </button>

              <AnimatePresence initial={false}>
                {stageWeaknessOpen && (
                  <motion.div
                    key="weakness-panel"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 sm:px-8 pb-8 grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-amber-400/20 pt-6">
                      {stageWeaknesses.map((w, i) => {
                        const Icon = w.icon;
                        return (
                          <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-white dark:bg-[#16141A] border border-amber-400/20 dark:border-amber-400/15">
                            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-400/10 flex items-center justify-center shrink-0 mt-0.5">
                              <Icon className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                            </div>
                            <div>
                              <div className="text-sm font-bold text-[#16141A] dark:text-white mb-1">{w.title}</div>
                              <p className="text-xs text-pm-muted leading-relaxed">{w.detail}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </section>

          {/* Deep-Dive Tabs */}
          <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-28">
            <div className="text-center space-y-2 mb-10">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#2B4CFF] dark:text-[#7C97FF]">
                Head-to-Head Deep Dive
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#16141A] dark:text-white">
                Detailed breakdown against each competitor
              </h2>
              <p className="text-sm text-pm-muted max-w-xl mx-auto">
                Click a tab to focus on one competitor, or view all at once.
              </p>

              <div className="flex flex-wrap justify-center gap-2 pt-4">
                {[
                  { id: 'all', label: 'All', color: '#2B4CFF' },
                  { id: 'marker-io', label: 'vs. Marker.io', color: '#FF5C35' },
                  { id: 'bugherd', label: 'vs. BugHerd', color: '#00A3FF' },
                  { id: 'figma', label: 'vs. Figma', color: '#A259FF' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as ActiveTab)}
                    className={`px-4 py-2 rounded-full text-xs font-mono font-bold transition-all cursor-pointer border ${
                      activeTab === tab.id
                        ? 'text-white shadow-md'
                        : 'bg-white dark:bg-[#16141A] border-slate-200/80 dark:border-white/10 text-pm-muted hover:text-[#16141A] dark:hover:text-white'
                    }`}
                    style={
                      activeTab === tab.id
                        ? { backgroundColor: tab.color, borderColor: tab.color }
                        : {}
                    }
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-5">

              {/* vs Marker.io */}
              {(activeTab === 'all' || activeTab === 'marker-io') && (
                <div className="rounded-2xl p-6 sm:p-8 bg-white dark:bg-[#16141A] border border-slate-200/80 dark:border-white/10 shadow-sm space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-5 border-b border-slate-100 dark:border-white/5">
                    <div className="space-y-1">
                      <span className="text-xs font-mono text-[#FF5C35] font-bold uppercase tracking-wider">STAGE vs. Marker.io</span>
                      <h3 className="text-xl sm:text-2xl font-extrabold text-[#16141A] dark:text-white">
                        Live reverse-proxy QA vs. embedded widget bug reporting
                      </h3>
                    </div>
                    <span className="self-start shrink-0 text-xs font-mono px-3 py-1 rounded-full bg-[#FF5C35]/10 text-[#FF5C35] border border-[#FF5C35]/20 font-bold">
                      Best for: external clients
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <h4 className="text-sm font-bold text-[#16141A] dark:text-white flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#FF5C35]" />
                        Where Marker.io creates friction
                      </h4>
                      <ul className="space-y-3 text-xs text-pm-muted">
                        <li className="flex items-start gap-2">
                          <X className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                          <span><strong className="text-[#16141A] dark:text-slate-200">Requires JS snippet or Chrome extension:</strong> Every developer must embed the widget script in the codebase, or every external reviewer must install a Chrome extension. Non-technical clients frequently fail this step.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <X className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                          <span><strong className="text-[#16141A] dark:text-slate-200">Flat 2D screenshot only:</strong> Captures a PNG screenshot of the page. Cannot inspect WebGL draw buffers, Three.js mesh geometry, or interactive canvas elements in 3D space.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <X className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                          <span><strong className="text-[#16141A] dark:text-slate-200">Expensive for guest-heavy workflows:</strong> External reviewer limits and guest session restrictions push teams onto $99 to $159/mo plans quickly.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <X className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                          <span><strong className="text-[#16141A] dark:text-slate-200">No live navigation:</strong> Once a screenshot is taken, the reviewer cannot click around -- feedback is pinned to a static snapshot, not the live interactive page.</span>
                        </li>
                      </ul>
                    </div>
                    <div className="space-y-3">
                      <h4 className="text-sm font-bold text-[#16141A] dark:text-white flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#2B4CFF]" />
                        How STAGE solves it
                      </h4>
                      <ul className="space-y-3 text-xs text-pm-muted">
                        <li className="flex items-start gap-2">
                          <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          <span><strong className="text-[#16141A] dark:text-slate-200">Reverse-proxy sandbox in 0.3s:</strong> Paste a URL, share the generated STAGE link. Clients click it -- that is the entire setup. Nothing to install, nothing to embed in code.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          <span><strong className="text-[#16141A] dark:text-slate-200">3D WebGL raycasting:</strong> Pins annotate directly onto Three.js mesh geometry with spatial XYZ coordinates -- not just a flat 2D image overlay.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          <span><strong className="text-[#16141A] dark:text-slate-200">Unlimited guest reviewers, always free:</strong> Every external client reviews via their generated link -- no seat costs, no extension wall, no signup required.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          <span><strong className="text-[#16141A] dark:text-slate-200">Live interactive review:</strong> Clients navigate the actual site inside the STAGE proxy -- clicking links, scrolling, interacting -- and pin feedback on any page they reach.</span>
                        </li>
                      </ul>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5 text-xs text-pm-muted">
                    <strong className="text-[#16141A] dark:text-white">Verdict:</strong> Choose <span className="text-[#FF5C35] font-bold">Marker.io</span> if your team controls the codebase, everyone is internal, and deep Jira/ClickUp integration is non-negotiable. Choose <span className="text-[#2B4CFF] dark:text-[#7C97FF] font-bold">STAGE</span> for any workflow involving external clients, live interactive review, or 3D web experiences.
                  </div>
                </div>
              )}

              {/* vs BugHerd */}
              {(activeTab === 'all' || activeTab === 'bugherd') && (
                <div className="rounded-2xl p-6 sm:p-8 bg-white dark:bg-[#16141A] border border-slate-200/80 dark:border-white/10 shadow-sm space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-5 border-b border-slate-100 dark:border-white/5">
                    <div className="space-y-1">
                      <span className="text-xs font-mono text-[#00A3FF] font-bold uppercase tracking-wider">STAGE vs. BugHerd</span>
                      <h3 className="text-xl sm:text-2xl font-extrabold text-[#16141A] dark:text-white">
                        Modern SPA support vs. legacy sticky-note tracker
                      </h3>
                    </div>
                    <span className="self-start shrink-0 text-xs font-mono px-3 py-1 rounded-full bg-[#00A3FF]/10 text-[#00A3FF] border border-[#00A3FF]/20 font-bold">
                      Best for: SPA teams
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <h4 className="text-sm font-bold text-[#16141A] dark:text-white flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#00A3FF]" />
                        Where BugHerd struggles
                      </h4>
                      <ul className="space-y-3 text-xs text-pm-muted">
                        <li className="flex items-start gap-2">
                          <X className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                          <span><strong className="text-[#16141A] dark:text-slate-200">Heavy JS script required in production HTML:</strong> Adds several kilobytes of BugHerd widget JavaScript to every customer-facing page load -- not ideal for performance-critical sites.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <X className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                          <span><strong className="text-[#16141A] dark:text-slate-200">Breaks on client-side route changes:</strong> BugHerd pins are anchored to a DOM snapshot. When React/Vue/Next.js routes change client-side, sticky positions often drift or become orphaned.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <X className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                          <span><strong className="text-[#16141A] dark:text-slate-200">Expensive per-seat billing:</strong> $39/mo is for just 5 team members -- adding clients or stakeholders costs significantly more per head.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <X className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                          <span><strong className="text-[#16141A] dark:text-slate-200">No 3D or canvas support:</strong> Cannot annotate WebGL scenes, canvas-rendered games, or interactive 3D product configurators.</span>
                        </li>
                      </ul>
                    </div>
                    <div className="space-y-3">
                      <h4 className="text-sm font-bold text-[#16141A] dark:text-white flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#2B4CFF]" />
                        How STAGE solves it
                      </h4>
                      <ul className="space-y-3 text-xs text-pm-muted">
                        <li className="flex items-start gap-2">
                          <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          <span><strong className="text-[#16141A] dark:text-slate-200">Zero production footprint:</strong> STAGE is purely server-side proxied. Not a single byte is added to your customer-facing JavaScript bundle.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          <span><strong className="text-[#16141A] dark:text-slate-200">Full SPA and route awareness:</strong> Captures Next.js, Remix, Nuxt, and React Router client-side navigation -- pins persist across route changes using XPath + DOM selector hybrid resolution.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          <span><strong className="text-[#16141A] dark:text-slate-200">Unlimited reviewers, flat pricing:</strong> Invite any number of client stakeholders via link -- no per-seat charges for external guests.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          <span><strong className="text-[#16141A] dark:text-slate-200">Native 3D canvas support:</strong> Drop pins onto Three.js meshes and WebGL scenes with real spatial depth -- not just a screenshot overlay.</span>
                        </li>
                      </ul>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5 text-xs text-pm-muted">
                    <strong className="text-[#16141A] dark:text-white">Verdict:</strong> Choose <span className="text-[#00A3FF] font-bold">BugHerd</span> if your project is a simple static marketing site and your team wants an all-in-one kanban board. Choose <span className="text-[#2B4CFF] dark:text-[#7C97FF] font-bold">STAGE</span> if you are shipping a modern SPA, React app, or interactive 3D site -- or if any external clients are involved in the review process.
                  </div>
                </div>
              )}

              {/* vs Figma */}
              {(activeTab === 'all' || activeTab === 'figma') && (
                <div className="rounded-2xl p-6 sm:p-8 bg-white dark:bg-[#16141A] border border-slate-200/80 dark:border-white/10 shadow-sm space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-5 border-b border-slate-100 dark:border-white/5">
                    <div className="space-y-1">
                      <span className="text-xs font-mono text-[#A259FF] font-bold uppercase tracking-wider">STAGE vs. Figma</span>
                      <h3 className="text-xl sm:text-2xl font-extrabold text-[#16141A] dark:text-white">
                        These tools are complementary -- use both at different stages
                      </h3>
                    </div>
                    <span className="self-start shrink-0 text-xs font-mono px-3 py-1 rounded-full bg-[#A259FF]/10 text-[#A259FF] border border-[#A259FF]/20 font-bold">
                      Complementary Workflow
                    </span>
                  </div>

                  {/* Workflow pipeline */}
                  <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 p-4 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5 text-xs overflow-x-auto">
                    <div className="flex flex-col items-center gap-1 shrink-0 text-center min-w-[90px]">
                      <div className="w-10 h-10 rounded-xl bg-[#A259FF]/15 flex items-center justify-center"><Layers className="w-5 h-5 text-[#A259FF]" /></div>
                      <span className="font-bold text-[#A259FF]">Figma</span>
                      <span className="text-pm-muted">Design mockup</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-pm-muted shrink-0 rotate-90 sm:rotate-0" />
                    <div className="flex flex-col items-center gap-1 shrink-0 text-center min-w-[90px]">
                      <div className="w-10 h-10 rounded-xl bg-slate-200/60 dark:bg-white/10 flex items-center justify-center"><Code2 className="w-5 h-5 text-pm-muted" /></div>
                      <span className="font-bold text-pm-muted">Dev Build</span>
                      <span className="text-pm-muted">Engineers code it</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-pm-muted shrink-0 rotate-90 sm:rotate-0" />
                    <div className="flex flex-col items-center gap-1 shrink-0 text-center min-w-[90px]">
                      <div className="w-10 h-10 rounded-xl bg-[#2B4CFF]/15 flex items-center justify-center"><Globe className="w-5 h-5 text-[#2B4CFF]" /></div>
                      <span className="font-bold text-[#2B4CFF] dark:text-[#7C97FF]">STAGE</span>
                      <span className="text-pm-muted">Live review + QA</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-pm-muted shrink-0 rotate-90 sm:rotate-0" />
                    <div className="flex flex-col items-center gap-1 shrink-0 text-center min-w-[90px]">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center"><Check className="w-5 h-5 text-emerald-500" /></div>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">Ship</span>
                      <span className="text-pm-muted">Client approved</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <h4 className="text-sm font-bold text-[#16141A] dark:text-white flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#A259FF]" />
                        What Figma cannot do (and never claimed to)
                      </h4>
                      <ul className="space-y-3 text-xs text-pm-muted">
                        <li className="flex items-start gap-2">
                          <Minus className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                          <span><strong className="text-[#16141A] dark:text-slate-200">Reviews vector drawings only:</strong> Figma files are static SVG-like designs. They cannot test real CSS hover states, media queries, scroll behaviour, or live API data.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Minus className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                          <span><strong className="text-[#16141A] dark:text-slate-200">Zero DOM or developer telemetry:</strong> A Figma comment gives a designer note on a mock. A STAGE pin gives an engineer an XPath, computed box-model, font-size, and the console error that caused the bug.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Minus className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                          <span><strong className="text-[#16141A] dark:text-slate-200">Requires Figma accounts for reviewers:</strong> Clients must sign up and learn the Figma UI -- significant friction for non-technical stakeholders.</span>
                        </li>
                      </ul>
                    </div>
                    <div className="space-y-3">
                      <h4 className="text-sm font-bold text-[#16141A] dark:text-white flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#2B4CFF]" />
                        Where STAGE completes the pipeline
                      </h4>
                      <ul className="space-y-3 text-xs text-pm-muted">
                        <li className="flex items-start gap-2">
                          <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          <span><strong className="text-[#16141A] dark:text-slate-200">Reviews the real, built code:</strong> Once engineers implement the Figma design, STAGE reviews the actual HTML, CSS, animations, and interactions as real users experience them.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          <span><strong className="text-[#16141A] dark:text-slate-200">Developer-ready bug specs:</strong> STAGE pins export exact element selectors, viewport width, computed styles, and reproduction steps -- not just a comment that says make it bigger.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          <span><strong className="text-[#16141A] dark:text-slate-200">Client sign-off on the live site:</strong> Client approval happens on the actual staging URL -- what they approve is exactly what gets shipped. No Figma-to-code surprises at launch.</span>
                        </li>
                      </ul>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5 text-xs text-pm-muted">
                    <strong className="text-[#16141A] dark:text-white">Verdict:</strong> <span className="text-[#A259FF] font-bold">Figma</span> and <span className="text-[#2B4CFF] dark:text-[#7C97FF] font-bold">STAGE</span> are not competitors -- they are sequential tools. Use Figma to design before you write code. Use STAGE to review and sign off once the code is built. Using only Figma for both is the most common workflow bottleneck teams report to us.
                  </div>
                </div>
              )}

            </div>
          </section>

          {/* Feature Matrix Table */}
          <section id="feature-matrix" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-28">
            <div className="text-center space-y-2 mb-12">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#2B4CFF] dark:text-[#7C97FF]">
                Feature-by-Feature Matrix
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#16141A] dark:text-white">
                Complete comparison table
              </h2>
              <p className="text-sm text-pm-muted max-w-xl mx-auto">
                Every capability, side-by-side. Scroll horizontally on mobile.
              </p>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#16141A] shadow-lg">
              <table className="w-full text-left border-collapse min-w-[680px]">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02]">
                    <th className="py-5 px-5 text-xs font-mono uppercase tracking-wider text-pm-muted w-2/5">
                      Capability
                    </th>
                    <th className="py-5 px-4 text-center w-[14%] bg-[#2B4CFF]/5 dark:bg-[#2B4CFF]/15 border-x border-[#2B4CFF]/20">
                      <span className="inline-flex items-center gap-1.5 font-black text-sm text-[#2B4CFF] dark:text-[#7C97FF]">
                        STAGE <span className="w-2 h-2 rounded-full bg-[#2B4CFF]" />
                      </span>
                    </th>
                    <th className="py-5 px-4 text-center w-[14%] text-xs font-bold text-[#FF5C35]">Marker.io</th>
                    <th className="py-5 px-4 text-center w-[14%] text-xs font-bold text-[#00A3FF]">BugHerd</th>
                    <th className="py-5 px-4 text-center w-[14%] text-xs font-bold text-[#A259FF]">Figma</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-xs">
                  {matrixFeatures.map((categoryGroup, cIdx) => (
                    <React.Fragment key={cIdx}>
                      <tr className="bg-slate-100/50 dark:bg-white/[0.04]">
                        <td colSpan={5} className="py-3 px-5 font-mono font-bold text-[11px] uppercase tracking-wider text-[#16141A] dark:text-white">
                          {categoryGroup.category}
                        </td>
                      </tr>

                      {categoryGroup.items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors">
                          <td className="py-4 px-5 font-medium text-[#16141A] dark:text-white">
                            <div className="flex flex-col gap-0.5">
                              <span>{item.feature}</span>
                              <span className="text-[11px] text-pm-muted font-normal leading-snug">
                                {item.tooltip}
                              </span>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-center bg-[#2B4CFF]/5 dark:bg-[#2B4CFF]/15 border-x border-[#2B4CFF]/20">
                            {renderCellStatus(item.stage)}
                          </td>
                          <td className="py-4 px-4 text-center">
                            {renderCellStatus(item.markerIo)}
                          </td>
                          <td className="py-4 px-4 text-center">
                            {renderCellStatus(item.bugHerd)}
                          </td>
                          <td className="py-4 px-4 text-center">
                            {renderCellStatus(item.figma)}
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-5 mt-6 text-xs text-pm-muted">
              <span className="flex items-center gap-1.5">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                  <Check className="w-3 h-3 stroke-[3]" />
                </span>
                Fully supported
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
                  <Minus className="w-3 h-3 stroke-[3]" />
                </span>
                Partial / limited
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-rose-500/10 text-rose-500">
                  <X className="w-3 h-3 stroke-[2.5]" />
                </span>
                Not supported
              </span>
              <span className="flex items-center gap-1.5 font-mono">N/A = Not applicable</span>
            </div>
          </section>

          {/* FAQ */}
          <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-28">
            <div className="text-center space-y-2 mb-10">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#2B4CFF] dark:text-[#7C97FF]">FAQ</span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#16141A] dark:text-white">
                Common questions when switching tools
              </h2>
            </div>

            <div className="space-y-3">
              {([
                {
                  q: 'Can I use STAGE and Marker.io together?',
                  a: 'Yes -- some teams use Marker.io for internal engineer-to-engineer bug reporting (where everyone has the script) and STAGE for external client reviews (where no installation is feasible). The workflows complement rather than conflict.',
                },
                {
                  q: 'Is STAGE a replacement for Figma?',
                  a: 'No, and it is not trying to be. Figma is for designing before you write code. STAGE is for reviewing after code is built. They address completely different moments in the product development cycle. The ideal workflow is Figma to Build to STAGE to Ship.',
                },
                {
                  q: 'What if my staging site is behind a login or SSO wall?',
                  a: 'Public Vercel, Netlify, and Railway preview URLs work instantly with STAGE. Sites behind HTTP Basic Auth or Okta/Auth0 SSO require additional proxy pass-through configuration -- contact us and we will walk you through it.',
                },
                {
                  q: 'Does STAGE add anything to my production site?',
                  a: 'Absolutely not. STAGE operates as a server-side reverse proxy. Zero JavaScript, zero tracking pixels, and zero performance overhead are added to your customer-facing website at any point.',
                },
                {
                  q: 'How does STAGE handle SPAs (Next.js, React, Vue)?',
                  a: 'STAGE uses a hybrid XPath + DOM selector resolution system. Pins survive client-side route changes, React re-renders, and Next.js hydration. This is where traditional script-injection tools like BugHerd frequently break.',
                },
                {
                  q: 'Is the free tier genuinely free or does it expire?',
                  a: 'The free tier is a permanent free tier -- not a trial. You can place unlimited feedback pins on the free plan indefinitely. Team collaboration features and advanced integrations are on paid plans starting at $19/month.',
                },
              ] as { q: string; a: string }[]).map((faq, i) => (
                <details key={i} className="group rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#16141A] overflow-hidden">
                  <summary className="flex items-center justify-between gap-4 p-5 cursor-pointer list-none text-sm font-bold text-[#16141A] dark:text-white">
                    <span>{faq.q}</span>
                    <ChevronDown className="w-4 h-4 text-pm-muted shrink-0 group-open:rotate-180 transition-transform duration-200" />
                  </summary>
                  <div className="px-5 pb-5 text-xs text-pm-muted leading-relaxed border-t border-slate-100 dark:border-white/5 pt-4">
                    {faq.a}
                  </div>
                </details>
              ))}
            </div>
          </section>

          {/* Bottom CTA */}
          <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-28 text-center">
            <div className="rounded-2xl p-10 sm:p-14 bg-gradient-to-b from-[#2B4CFF]/10 via-transparent to-transparent border border-[#2B4CFF]/30 dark:border-[#7C97FF]/30 space-y-6">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#2B4CFF] dark:text-[#7C97FF]">
                Setup in 30 seconds
              </span>

              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#16141A] dark:text-white tracking-tight max-w-xl mx-auto">
                Ready to see live feedback on your actual site?
              </h2>

              <p className="text-sm text-pm-muted max-w-md mx-auto leading-relaxed">
                Paste a URL. Share the link. Your client pins feedback directly on the live page -- no extensions, no code changes, no friction.
              </p>

              <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                <Link
                  href="/register"
                  className="px-8 py-3.5 rounded-full bg-[#2B4CFF] hover:bg-[#1E3BD0] text-white text-xs font-mono font-bold uppercase tracking-wider shadow-lg shadow-[#2B4CFF]/30 hover:shadow-xl transition-all active:scale-95 flex items-center gap-2"
                >
                  <span>Start Free -- No Credit Card</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/pricing"
                  className="px-6 py-3.5 rounded-full bg-white dark:bg-[#16141A] border border-slate-200 dark:border-white/10 hover:border-slate-300 text-xs font-mono font-bold text-[#16141A] dark:text-white uppercase tracking-wider transition-all"
                >
                  View Pricing &amp; Plans
                </Link>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-pm-muted">
                <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-500" />Free forever plan</span>
                <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-500" />No code changes to your site</span>
                <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-500" />Unlimited external reviewers</span>
              </div>
            </div>
          </section>

        </main>

        <MarketingFooter />
      </div>
    </div>
  );
}

function renderCellStatus(status: CellValue) {
  if (status === true) {
    return (
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
        <Check className="w-4 h-4 stroke-[3]" />
      </span>
    );
  }
  if (status === false) {
    return (
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-rose-500/10 text-rose-500">
        <X className="w-4 h-4 stroke-[2.5]" />
      </span>
    );
  }
  if (status === 'partial') {
    return (
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
        <Minus className="w-4 h-4 stroke-[3]" />
      </span>
    );
  }
  return (
    <span className="text-[11px] font-mono text-pm-muted">N/A</span>
  );
}
