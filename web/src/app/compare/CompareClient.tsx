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
  Cpu, 
  Box, 
  Zap, 
  Globe, 
  Users, 
  Code2, 
  ExternalLink,
  ChevronRight,
  HelpCircle
} from 'lucide-react';
import MarketingNav from '@/components/marketing/MarketingNav';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import AmbientBackground from '@/components/marketing/AmbientBackground';

type ActiveTab = 'all' | 'marker-io' | 'bugherd' | 'figma';

interface CompetitorMeta {
  id: string;
  name: string;
  tagline: string;
  badgeColor: string;
  badgeBg: string;
  badgeBorder: string;
  pros: string[];
  cons: string[];
  verdict: string;
  pricing: string;
  bestFor: string;
}

export default function CompareClient() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('all');

  const competitors: Record<string, CompetitorMeta> = {
    stage: {
      id: 'stage',
      name: 'STAGE',
      tagline: 'Zero-install visual website feedback on live code & 3D scenes.',
      badgeColor: 'text-[#2B4CFF] dark:text-[#7C97FF]',
      badgeBg: 'bg-[#2B4CFF]/10 dark:bg-[#2B4CFF]/20',
      badgeBorder: 'border-[#2B4CFF]/30 dark:border-[#7C97FF]/30',
      pros: [
        'Zero browser extensions or JS code installation required',
        'Works on live websites, SPAs, and 3D WebGL / Three.js canvases',
        'Captures exact sub-pixel CSS, XPath, DOM telemetry, and console logs',
        'Clients review via 1-click tokenized links without creating accounts',
        'Generous free tier with unlimited feedback pins'
      ],
      cons: [
        'Designed specifically for live web code (not pre-code Figma vector drafts)'
      ],
      verdict: 'The modern standard for visual QA on live staging and production web applications.',
      pricing: 'Free forever tier / $19/mo team plan',
      bestFor: 'Designers, front-end engineers, agencies, and client reviews on live sites'
    },
    'marker-io': {
      id: 'marker-io',
      name: 'Marker.io',
      tagline: 'Website bug reporting widget for agencies and software teams.',
      badgeColor: 'text-[#FF5C35]',
      badgeBg: 'bg-[#FF5C35]/10',
      badgeBorder: 'border-[#FF5C35]/25',
      pros: [
        'Mature integration ecosystem (Jira, Trello, GitHub, ClickUp)',
        'Built-in annotation screenshot editor',
        'Console logs and browser metadata capture'
      ],
      cons: [
        'Requires embedding a JavaScript snippet in your codebase or installing a Chrome extension',
        'Takes flat 2D screenshot crops; cannot inspect or raycast 3D WebGL meshes',
        'High entry price ($39–$159+/mo) with restrictive seat and project limits',
        'External clients must often install extensions to capture password-protected staging sites'
      ],
      verdict: 'A solid legacy bug reporting widget, but hampered by code snippet requirements and lack of 3D canvas support.',
      pricing: 'Starts at $39/mo (Starter) up to $159+/mo (Team)',
      bestFor: 'Teams willing to embed JS snippets for traditional flat 2D web apps'
    },
    bugherd: {
      id: 'bugherd',
      name: 'BugHerd',
      tagline: 'Visual feedback and bug tracker for website design projects.',
      badgeColor: 'text-[#00A3FF]',
      badgeBg: 'bg-[#00A3FF]/10',
      badgeBorder: 'border-[#00A3FF]/25',
      pros: [
        'Task management kanban board included inside the tool',
        'Client-friendly sticky note visual metaphors',
        'Supports basic browser details'
      ],
      cons: [
        'Requires either script installation in <head> or every reviewer to install a browser extension',
        'Slow and heavy on complex Single Page Applications (SPAs)',
        'Zero support for modern WebGL, Three.js shaders, or interactive canvas elements',
        'Per-user pricing starts at $39/mo for just 5 members'
      ],
      verdict: 'Good for basic agency sticky notes on static sites, but outdated for modern high-performance web applications and 3D web graphics.',
      pricing: 'Starts at $39/mo (Standard) up to $229+/mo (Premium)',
      bestFor: 'Traditional digital agencies building standard marketing brochure sites'
    },
    figma: {
      id: 'figma',
      name: 'Figma',
      tagline: 'Collaborative cloud interface design and vector prototyping tool.',
      badgeColor: 'text-[#A259FF]',
      badgeBg: 'bg-[#A259FF]/10',
      badgeBorder: 'border-[#A259FF]/25',
      pros: [
        'Industry gold standard for UI/UX design mockups and vector components',
        'Real-time multi-designer multiplayer canvas',
        'Extensive design system library and component tokens'
      ],
      cons: [
        'Only reviews static vector drawings and click-through prototypes — cannot review live web code!',
        'Zero live DOM inspection, computed CSS styles, or real browser network/console telemetry',
        'Cannot test real responsive breakpoints, device viewport rendering, or live API responses',
        'Requires all commenters to log into Figma accounts'
      ],
      verdict: 'Unmatched for designing before writing code, but completely unusable for reviewing actual built websites and production code.',
      pricing: '$12 to $75 per editor / month',
      bestFor: 'Wireframing, UI vector design, and pre-development interactive prototypes'
    }
  };

  const matrixFeatures = [
    {
      category: 'Installation & Access Friction',
      items: [
        {
          feature: 'Zero-Install (No browser extensions needed)',
          tooltip: 'Anyone can review via URL link without installing Chrome extensions',
          stage: true,
          markerIo: false,
          bugHerd: false,
          figma: 'na'
        },
        {
          feature: 'Zero Code Changes (No script tags or npm packages)',
          tooltip: 'No need to add JavaScript snippets into your codebase or index.html',
          stage: true,
          markerIo: false,
          bugHerd: false,
          figma: 'na'
        },
        {
          feature: 'Client Access Without Account / Login',
          tooltip: 'Clients click the link and immediately leave pins without signup friction',
          stage: true,
          markerIo: 'partial',
          bugHerd: false,
          figma: false
        },
        {
          feature: 'Works on Public Staging & Live Production URLs',
          tooltip: 'Paste any public Vercel, Netlify, staging, or production URL directly',
          stage: true,
          markerIo: true,
          bugHerd: true,
          figma: false
        }
      ]
    },
    {
      category: 'Modern Web & Technical Telemetry',
      items: [
        {
          feature: '3D WebGL & Three.js Canvas Raycasting',
          tooltip: 'Pins annotations directly to 3D meshes and captures shader drawing buffer frames',
          stage: true,
          markerIo: false,
          bugHerd: false,
          figma: false
        },
        {
          feature: 'Automatic Computed CSS & Box-Model Extraction',
          tooltip: 'Captures exact font styles, padding, margin, colors, and layout rules',
          stage: true,
          markerIo: 'partial',
          bugHerd: 'partial',
          figma: false
        },
        {
          feature: 'Sub-Pixel XPath & DOM Hierarchy Telemetry',
          tooltip: 'Locates elements precisely even after site edits or dynamic DOM hydration',
          stage: true,
          markerIo: true,
          bugHerd: 'partial',
          figma: false
        },
        {
          feature: 'Interactive Live Navigation While Auditing',
          tooltip: 'Click around links and scroll through dynamic pages while dropping pins',
          stage: true,
          markerIo: false,
          bugHerd: 'partial',
          figma: false
        },
        {
          feature: 'Real-Time Multi-Reviewer Presence & Sync',
          tooltip: 'See teammate pins, status updates, and comments stream live via WebSockets',
          stage: true,
          markerIo: false,
          bugHerd: false,
          figma: true
        }
      ]
    },
    {
      category: 'Developer Handoff & Value',
      items: [
        {
          feature: 'One-Click GitHub / Linear Markdown Checklist Export',
          tooltip: 'Exports clean developer bug reports ready to paste into issues',
          stage: true,
          markerIo: true,
          bugHerd: true,
          figma: 'partial'
        },
        {
          feature: 'Automated Multi-Signal Issue Classifier',
          tooltip: 'Auto-detects buttons, typography, media, layout, or WebGL shader bugs',
          stage: true,
          markerIo: false,
          bugHerd: false,
          figma: false
        },
        {
          feature: 'Free Tier with Unlimited Marker Pinning',
          tooltip: 'Start and use indefinitely without sudden paywalls on marker volume',
          stage: true,
          markerIo: false,
          bugHerd: false,
          figma: 'partial'
        },
        {
          feature: 'Responsive Breakpoint Testing (Desktop, Mobile, Tablet)',
          tooltip: 'Test and pin feedback on phone and desktop screen dimensions instantly',
          stage: true,
          markerIo: true,
          bugHerd: 'partial',
          figma: 'partial'
        }
      ]
    }
  ];

  return (
    <div className="relative min-h-screen bg-[var(--pm-bg)] text-pm-text selection:bg-[#2B4CFF]/20 selection:text-[#16141A] dark:selection:text-white font-sans overflow-x-hidden scroll-smooth transition-colors duration-500">
      <AmbientBackground />

      <div className="relative z-10 flex flex-col min-h-screen">
        <MarketingNav />

        <main className="flex-1 flex flex-col pt-28 sm:pt-36 pb-20">
          
          {/* ─── Hero Section ────────────────────────────────────────────────────────── */}
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#2B4CFF]/10 dark:bg-[#2B4CFF]/20 border border-[#2B4CFF]/30 text-[#2B4CFF] dark:text-[#7C97FF] text-xs font-mono font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>STAGE vs. The Alternatives</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#16141A] dark:text-white max-w-4xl mx-auto leading-[1.12]">
              How STAGE compares to <br className="hidden sm:inline" />
              <span className="bg-gradient-to-r from-[#2B4CFF] via-[#7C97FF] to-[#A855F7] bg-clip-text text-transparent">
                Marker.io, BugHerd, and Figma
              </span>
            </h1>

            <p className="text-base sm:text-lg text-pm-muted max-w-2xl mx-auto leading-relaxed">
              Why fast-shipping engineering teams and digital design agencies switch to STAGE for live website reviews — with zero browser extensions, zero script embeds, and native 3D WebGL support.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link
                href="/register"
                className="px-6 py-3 rounded-full bg-[#2B4CFF] hover:bg-[#1E3BD0] text-white text-xs font-mono font-bold uppercase tracking-wider shadow-lg shadow-[#2B4CFF]/25 hover:shadow-xl hover:shadow-[#2B4CFF]/35 transition-all flex items-center gap-2 active:scale-95 cursor-pointer"
              >
                <span>Try STAGE Free</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="#feature-matrix"
                className="px-6 py-3 rounded-full bg-white dark:bg-[#16141A] border border-slate-200/80 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 text-[#16141A] dark:text-white text-xs font-mono font-bold uppercase tracking-wider shadow-sm transition-all cursor-pointer"
              >
                <span>Jump to Feature Matrix</span>
              </a>
            </div>
          </section>

          {/* ─── Competitor Card Overview Grid ────────────────────────────────────────── */}
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-20">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              
              {/* STAGE Card (Highlighted Primary) */}
              <div className="relative rounded-3xl p-6 sm:p-7 bg-white dark:bg-[#16141A] border-2 border-[#2B4CFF] dark:border-[#7C97FF]/60 shadow-xl shadow-[#2B4CFF]/10 flex flex-col justify-between overflow-hidden">
                <div className="absolute top-0 right-0 bg-[#2B4CFF] text-white font-mono text-[10px] font-extrabold uppercase px-3.5 py-1 rounded-bl-xl tracking-wider">
                  Recommended
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#2B4CFF] shadow-[0_0_8px_#2B4CFF]" />
                    <h3 className="text-2xl font-black text-[#16141A] dark:text-white tracking-tight">
                      STAGE
                    </h3>
                  </div>

                  <p className="text-xs text-pm-muted leading-relaxed">
                    Zero-install live website QA. Review staging and production web apps with pixel-perfect pins and 3D mesh raycasting.
                  </p>

                  <div className="pt-2 border-t border-slate-100 dark:border-white/5 space-y-2">
                    <div className="text-[11px] font-mono text-pm-muted">Key Advantage:</div>
                    <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg">
                      <Check className="w-3.5 h-3.5 shrink-0" />
                      <span>Zero Extension & Zero Code Setup</span>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between text-pm-muted">
                      <span>Setup Time:</span>
                      <strong className="text-[#16141A] dark:text-white">0 seconds</strong>
                    </div>
                    <div className="flex items-center justify-between text-pm-muted">
                      <span>3D WebGL / Canvas:</span>
                      <strong className="text-emerald-600 dark:text-emerald-400">Native Raycasting</strong>
                    </div>
                    <div className="flex items-center justify-between text-pm-muted">
                      <span>Client Account Required:</span>
                      <strong className="text-emerald-600 dark:text-emerald-400">Never</strong>
                    </div>
                  </div>
                </div>

                <div className="pt-6 mt-6 border-t border-slate-100 dark:border-white/5">
                  <div className="text-xs text-pm-muted font-mono mb-2">Price:</div>
                  <div className="text-lg font-extrabold text-[#16141A] dark:text-white">
                    Free <span className="text-xs font-normal text-pm-muted">/ team plans from $19</span>
                  </div>
                </div>
              </div>

              {/* Marker.io Card */}
              <div className="rounded-3xl p-6 sm:p-7 bg-white dark:bg-[#16141A] border border-slate-200/80 dark:border-white/10 shadow-sm flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-[#16141A] dark:text-white">
                      Marker.io
                    </h3>
                    <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-[#FF5C35]/10 text-[#FF5C35] border border-[#FF5C35]/20">
                      Widget / Ext
                    </span>
                  </div>

                  <p className="text-xs text-pm-muted leading-relaxed">
                    Screenshot bug reporting widget embedded on traditional web apps.
                  </p>

                  <div className="pt-2 border-t border-slate-100 dark:border-white/5 space-y-2">
                    <div className="text-[11px] font-mono text-pm-muted">Primary Limitation:</div>
                    <div className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-500 bg-rose-500/10 px-2.5 py-1 rounded-lg">
                      <X className="w-3.5 h-3.5 shrink-0" />
                      <span>Requires Script or Extension</span>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between text-pm-muted">
                      <span>Setup Time:</span>
                      <strong className="text-[#16141A] dark:text-white">10–30 mins (code)</strong>
                    </div>
                    <div className="flex items-center justify-between text-pm-muted">
                      <span>3D WebGL / Canvas:</span>
                      <strong className="text-rose-500">Flat 2D only</strong>
                    </div>
                    <div className="flex items-center justify-between text-pm-muted">
                      <span>Client Account Required:</span>
                      <strong className="text-pm-muted">Extension needed for auth sites</strong>
                    </div>
                  </div>
                </div>

                <div className="pt-6 mt-6 border-t border-slate-100 dark:border-white/5">
                  <div className="text-xs text-pm-muted font-mono mb-2">Price:</div>
                  <div className="text-lg font-bold text-[#16141A] dark:text-white">
                    $39 to $159+ <span className="text-xs font-normal text-pm-muted">/ month</span>
                  </div>
                </div>
              </div>

              {/* BugHerd Card */}
              <div className="rounded-3xl p-6 sm:p-7 bg-white dark:bg-[#16141A] border border-slate-200/80 dark:border-white/10 shadow-sm flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-[#16141A] dark:text-white">
                      BugHerd
                    </h3>
                    <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-[#00A3FF]/10 text-[#00A3FF] border border-[#00A3FF]/20">
                      Sticky Notes
                    </span>
                  </div>

                  <p className="text-xs text-pm-muted leading-relaxed">
                    Sticky note bug tracker built primarily for agency web project management.
                  </p>

                  <div className="pt-2 border-t border-slate-100 dark:border-white/5 space-y-2">
                    <div className="text-[11px] font-mono text-pm-muted">Primary Limitation:</div>
                    <div className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-500 bg-rose-500/10 px-2.5 py-1 rounded-lg">
                      <X className="w-3.5 h-3.5 shrink-0" />
                      <span>Script Tag / Browser Extension</span>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between text-pm-muted">
                      <span>Setup Time:</span>
                      <strong className="text-[#16141A] dark:text-white">Requires script install</strong>
                    </div>
                    <div className="flex items-center justify-between text-pm-muted">
                      <span>3D WebGL / Canvas:</span>
                      <strong className="text-rose-500">Unsupported</strong>
                    </div>
                    <div className="flex items-center justify-between text-pm-muted">
                      <span>Per-Seat Billing:</span>
                      <strong className="text-rose-500">Strict 5-member caps</strong>
                    </div>
                  </div>
                </div>

                <div className="pt-6 mt-6 border-t border-slate-100 dark:border-white/5">
                  <div className="text-xs text-pm-muted font-mono mb-2">Price:</div>
                  <div className="text-lg font-bold text-[#16141A] dark:text-white">
                    $39 to $229+ <span className="text-xs font-normal text-pm-muted">/ month</span>
                  </div>
                </div>
              </div>

              {/* Figma Card */}
              <div className="rounded-3xl p-6 sm:p-7 bg-white dark:bg-[#16141A] border border-slate-200/80 dark:border-white/10 shadow-sm flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-[#16141A] dark:text-white">
                      Figma
                    </h3>
                    <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-[#A259FF]/10 text-[#A259FF] border border-[#A259FF]/20">
                      Design Files
                    </span>
                  </div>

                  <p className="text-xs text-pm-muted leading-relaxed">
                    Collaborative vector design editor for UI wireframes and visual mockups.
                  </p>

                  <div className="pt-2 border-t border-slate-100 dark:border-white/5 space-y-2">
                    <div className="text-[11px] font-mono text-pm-muted">Primary Limitation:</div>
                    <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-lg">
                      <Minus className="w-3.5 h-3.5 shrink-0" />
                      <span>Not for Built Live Code</span>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between text-pm-muted">
                      <span>Reviews Live Code:</span>
                      <strong className="text-rose-500">No (Drawings only)</strong>
                    </div>
                    <div className="flex items-center justify-between text-pm-muted">
                      <span>DOM / CSS Inspection:</span>
                      <strong className="text-rose-500">None</strong>
                    </div>
                    <div className="flex items-center justify-between text-pm-muted">
                      <span>Account Required:</span>
                      <strong className="text-rose-500">Figma login needed</strong>
                    </div>
                  </div>
                </div>

                <div className="pt-6 mt-6 border-t border-slate-100 dark:border-white/5">
                  <div className="text-xs text-pm-muted font-mono mb-2">Price:</div>
                  <div className="text-lg font-bold text-[#16141A] dark:text-white">
                    $12 to $75 <span className="text-xs font-normal text-pm-muted">/ editor / mo</span>
                  </div>
                </div>
              </div>

            </div>
          </section>

          {/* ─── Deep-Dive Tabs Section ─────────────────────────────────────────────── */}
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-28">
            <div className="text-center space-y-3 mb-10">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#16141A] dark:text-white">
                Detailed Side-by-Side Breakdown
              </h2>
              <p className="text-sm text-pm-muted max-w-xl mx-auto">
                Select a competitor to understand the critical technical and workflow differences.
              </p>

              {/* Segmented Control Buttons */}
              <div className="inline-flex p-1.5 rounded-full bg-slate-200/70 dark:bg-white/10 backdrop-blur-md border border-slate-300/60 dark:border-white/10 gap-1 mt-4">
                {[
                  { id: 'all', label: 'All Competitors' },
                  { id: 'marker-io', label: 'vs. Marker.io' },
                  { id: 'bugherd', label: 'vs. BugHerd' },
                  { id: 'figma', label: 'vs. Figma' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as ActiveTab)}
                    className={`px-4 py-2 rounded-full text-xs font-mono font-bold transition-all cursor-pointer ${
                      activeTab === tab.id
                        ? 'bg-[#2B4CFF] text-white shadow-md shadow-[#2B4CFF]/20'
                        : 'text-pm-muted hover:text-[#16141A] dark:hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab: Marker.io Breakdown */}
            {(activeTab === 'all' || activeTab === 'marker-io') && (
              <div className="rounded-3xl p-7 sm:p-10 bg-white dark:bg-[#16141A] border border-slate-200/80 dark:border-white/10 shadow-sm mb-8 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-white/5">
                  <div className="space-y-1">
                    <span className="text-xs font-mono text-[#FF5C35] font-bold uppercase tracking-wider">
                      Head-to-Head Comparison
                    </span>
                    <h3 className="text-2xl font-black text-[#16141A] dark:text-white">
                      STAGE vs. Marker.io: Why Teams Are Switching
                    </h3>
                  </div>
                  <span className="text-xs font-mono px-3 py-1 rounded-full bg-[#FF5C35]/10 text-[#FF5C35] border border-[#FF5C35]/20 font-bold self-start sm:self-auto">
                    No Extension Required
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
                  <div className="space-y-3">
                    <h4 className="font-bold text-[#16141A] dark:text-white flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                      Where Marker.io Creates Friction:
                    </h4>
                    <ul className="space-y-2 text-xs text-pm-muted leading-relaxed">
                      <li className="flex items-start gap-2">
                        <X className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                        <span><strong>Requires Extension or Script:</strong> To report bugs, your team must inject code into the repository or convince non-technical clients to install browser extensions.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <X className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                        <span><strong>Only Captures Flat 2D:</strong> Cannot inspect Three.js, WebGL shader buffers, or interactive 3D product configurators.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <X className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                        <span><strong>Strict Pricing Ladders:</strong> Charges up to $159/mo for team features with tight limitations on guest reviewers and project targets.</span>
                      </li>
                    </ul>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-bold text-[#16141A] dark:text-white flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#2B4CFF]" />
                      How STAGE Solves It:
                    </h4>
                    <ul className="space-y-2 text-xs text-pm-muted leading-relaxed">
                      <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span><strong>Instant Zero-Install Sandbox:</strong> Just paste any website URL to generate an interactive review sandbox in 0.3 seconds. No extensions, no code.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span><strong>Native 3D Mesh Raycasting:</strong> Raycasts spatial coordinates onto Three.js meshes and WebGL shaders, capturing technical draw calls.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span><strong>Generous Free Tier:</strong> Review unlimited web pages and place unlimited marker pins without hidden paywalls.</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: BugHerd Breakdown */}
            {(activeTab === 'all' || activeTab === 'bugherd') && (
              <div className="rounded-3xl p-7 sm:p-10 bg-white dark:bg-[#16141A] border border-slate-200/80 dark:border-white/10 shadow-sm mb-8 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-white/5">
                  <div className="space-y-1">
                    <span className="text-xs font-mono text-[#00A3FF] font-bold uppercase tracking-wider">
                      Head-to-Head Comparison
                    </span>
                    <h3 className="text-2xl font-black text-[#16141A] dark:text-white">
                      STAGE vs. BugHerd: Modern Web vs. Legacy Sticky Notes
                    </h3>
                  </div>
                  <span className="text-xs font-mono px-3 py-1 rounded-full bg-[#00A3FF]/10 text-[#00A3FF] border border-[#00A3FF]/20 font-bold self-start sm:self-auto">
                    Live Web vs. Static Embeds
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
                  <div className="space-y-3">
                    <h4 className="font-bold text-[#16141A] dark:text-white flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                      Where BugHerd Stumbles:
                    </h4>
                    <ul className="space-y-2 text-xs text-pm-muted leading-relaxed">
                      <li className="flex items-start gap-2">
                        <X className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                        <span><strong>Heavy Script Footprint:</strong> Requires pasting a heavy JavaScript snippet into the production or staging HTML header.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <X className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                        <span><strong>Poor Support for Modern SPAs:</strong> Dynamic routing and client-side page transitions often break sticky note pins.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <X className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                        <span><strong>Expensive Seat Billing:</strong> Scales on per-seat pricing models that penalize inviting external client stakeholders.</span>
                      </li>
                    </ul>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-bold text-[#16141A] dark:text-white flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#2B4CFF]" />
                      How STAGE Solves It:
                    </h4>
                    <ul className="space-y-2 text-xs text-pm-muted leading-relaxed">
                      <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span><strong>Zero Repository Footprint:</strong> Zero scripts embedded in your code. Nothing is added to customer-facing bundles.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span><strong>SPA & Route Preservation:</strong> Seamlessly captures client-side router changes and nested layout state changes.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span><strong>Unlimited Guest Reviewers:</strong> Clients review for free via tokenized links without consuming team member seats.</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Figma Breakdown */}
            {(activeTab === 'all' || activeTab === 'figma') && (
              <div className="rounded-3xl p-7 sm:p-10 bg-white dark:bg-[#16141A] border border-slate-200/80 dark:border-white/10 shadow-sm mb-8 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-white/5">
                  <div className="space-y-1">
                    <span className="text-xs font-mono text-[#A259FF] font-bold uppercase tracking-wider">
                      Head-to-Head Comparison
                    </span>
                    <h3 className="text-2xl font-black text-[#16141A] dark:text-white">
                      STAGE vs. Figma: Live Built Web Code vs. Design Mockups
                    </h3>
                  </div>
                  <span className="text-xs font-mono px-3 py-1 rounded-full bg-[#A259FF]/10 text-[#A259FF] border border-[#A259FF]/20 font-bold self-start sm:self-auto">
                    Complementary Workflow
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
                  <div className="space-y-3">
                    <h4 className="font-bold text-[#16141A] dark:text-white flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      Why Figma Isn't for Live Web Testing:
                    </h4>
                    <ul className="space-y-2 text-xs text-pm-muted leading-relaxed">
                      <li className="flex items-start gap-2">
                        <Minus className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        <span><strong>Figma Only Reviews Vector Drawings:</strong> Figma files are static vector drafts. They cannot test live CSS media queries, hover states, or dynamic APIs.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Minus className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        <span><strong>Zero Developer Telemetry:</strong> Comments in Figma don't give developers live XPath, computed box-models, or browser console errors.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Minus className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        <span><strong>Account Friction:</strong> Clients must have a Figma account and navigate through complicated canvas zoom controls.</span>
                      </li>
                    </ul>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-bold text-[#16141A] dark:text-white flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#2B4CFF]" />
                      Where STAGE Takes Over:
                    </h4>
                    <ul className="space-y-2 text-xs text-pm-muted leading-relaxed">
                      <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span><strong>Reviews the Real Built Code:</strong> Review the actual HTML, CSS, JavaScript, animations, and responsive breakpoints as real users experience them.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span><strong>Developer-Ready Bug Specs:</strong> Extracts exact element classes, XPath, viewport widths, and network failures directly into ticket checklists.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span><strong>The Perfect Pipeline:</strong> Use Figma for design mockups; use STAGE for staging review, client sign-off, and production QA.</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* ─── Comprehensive Comparison Matrix Table ───────────────────────────────── */}
          <section id="feature-matrix" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-28">
            <div className="text-center space-y-3 mb-12">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#2B4CFF] dark:text-[#7C97FF]">
                Feature-by-Feature Matrix
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#16141A] dark:text-white">
                Detailed Comparison Table
              </h2>
              <p className="text-sm text-pm-muted max-w-xl mx-auto">
                Compare technical capabilities, setup requirements, and handoff workflows side-by-side.
              </p>
            </div>

            <div className="overflow-x-auto rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#16141A] shadow-lg">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02]">
                    <th className="py-5 px-6 text-xs font-mono uppercase tracking-wider text-pm-muted w-1/3">
                      Features & Capabilities
                    </th>
                    <th className="py-5 px-6 text-center w-1/6 bg-[#2B4CFF]/5 dark:bg-[#2B4CFF]/15 border-x border-[#2B4CFF]/20">
                      <div className="inline-flex items-center gap-1.5 font-black text-sm text-[#2B4CFF] dark:text-[#7C97FF]">
                        <span>STAGE</span>
                        <span className="w-2 h-2 rounded-full bg-[#2B4CFF]" />
                      </div>
                    </th>
                    <th className="py-5 px-6 text-center w-1/6 text-xs font-bold text-[#FF5C35]">
                      Marker.io
                    </th>
                    <th className="py-5 px-6 text-center w-1/6 text-xs font-bold text-[#00A3FF]">
                      BugHerd
                    </th>
                    <th className="py-5 px-6 text-center w-1/6 text-xs font-bold text-[#A259FF]">
                      Figma
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-xs">
                  {matrixFeatures.map((categoryGroup, cIdx) => (
                    <React.Fragment key={cIdx}>
                      <tr className="bg-slate-100/50 dark:bg-white/[0.04]">
                        <td
                          colSpan={5}
                          className="py-3 px-6 font-mono font-bold text-[11px] uppercase tracking-wider text-[#16141A] dark:text-white"
                        >
                          {categoryGroup.category}
                        </td>
                      </tr>

                      {categoryGroup.items.map((item, idx) => (
                        <tr
                          key={idx}
                          className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors"
                        >
                          <td className="py-4 px-6 font-medium text-[#16141A] dark:text-white">
                            <div className="flex flex-col">
                              <span>{item.feature}</span>
                              <span className="text-[11px] text-pm-muted font-normal">
                                {item.tooltip}
                              </span>
                            </div>
                          </td>

                          {/* STAGE Column */}
                          <td className="py-4 px-6 text-center bg-[#2B4CFF]/5 dark:bg-[#2B4CFF]/15 border-x border-[#2B4CFF]/20">
                            {renderCellStatus(item.stage)}
                          </td>

                          {/* Marker.io Column */}
                          <td className="py-4 px-6 text-center">
                            {renderCellStatus(item.markerIo)}
                          </td>

                          {/* BugHerd Column */}
                          <td className="py-4 px-6 text-center">
                            {renderCellStatus(item.bugHerd)}
                          </td>

                          {/* Figma Column */}
                          <td className="py-4 px-6 text-center">
                            {renderCellStatus(item.figma)}
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* ─── Bottom CTA Banner ──────────────────────────────────────────────────── */}
          <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 sm:pt-32 text-center">
            <div className="rounded-3xl p-10 sm:p-14 bg-gradient-to-b from-[#2B4CFF]/10 via-transparent to-transparent border border-[#2B4CFF]/30 dark:border-[#7C97FF]/30 space-y-6">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#2B4CFF] dark:text-[#7C97FF]">
                Start Reviewing in 30 Seconds
              </span>

              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#16141A] dark:text-white tracking-tight max-w-xl mx-auto">
                Ready to review live websites without extensions?
              </h2>

              <p className="text-sm text-pm-muted max-w-md mx-auto leading-relaxed">
                Join engineering teams and agencies getting client feedback on the live page, not in lost screenshots.
              </p>

              <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                <Link
                  href="/register"
                  className="px-8 py-3.5 rounded-full bg-[#2B4CFF] hover:bg-[#1E3BD0] text-white text-xs font-mono font-bold uppercase tracking-wider shadow-lg shadow-[#2B4CFF]/30 hover:shadow-xl transition-all cursor-pointer active:scale-95 flex items-center gap-2"
                >
                  <span>Create Free Review Link</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/pricing"
                  className="px-6 py-3.5 rounded-full bg-white dark:bg-[#16141A] border border-slate-200 dark:border-white/10 hover:border-slate-300 text-xs font-mono font-bold text-[#16141A] dark:text-white uppercase tracking-wider transition-all cursor-pointer"
                >
                  <span>View Pricing & Plans</span>
                </Link>
              </div>
            </div>
          </section>

        </main>

        <MarketingFooter />
      </div>
    </div>
  );
}

function renderCellStatus(status: boolean | 'partial' | 'na' | string) {
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
    <span className="text-[11px] font-mono text-pm-muted">
      N/A
    </span>
  );
}
