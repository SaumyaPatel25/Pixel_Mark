'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Lock, Sparkles, ArrowRight, LayoutDashboard, ShieldAlert } from 'lucide-react'
import Link from 'next/link'

interface LockedDomModalProps {
  onClose?: () => void
}

export function LockedDomModal({ onClose }: LockedDomModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-lg bg-pm-surface border border-pm-border rounded-3xl p-8 shadow-2xl relative overflow-hidden text-pm-text"
      >
        {/* Glow backdrop accent */}
        <div className="absolute -top-12 -right-12 w-44 h-44 bg-pm-accent-subtle blur-3xl rounded-full pointer-events-none" />

        {/* Lock Header */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-600 dark:text-purple-300 shadow-inner">
            <Lock className="w-7 h-7" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-300 text-[10px] font-mono font-extrabold uppercase tracking-wider mb-1">
              <ShieldAlert className="w-3 h-3" />
              <span>Paid Entitlement Required</span>
            </div>
            <h2 className="text-xl font-extrabold text-pm-text tracking-tight">
              Blueprint DOM Mode Locked
            </h2>
          </div>
        </div>

        {/* Summary text */}
        <p className="text-sm text-pm-muted leading-relaxed mb-6">
          Blueprint DOM mode is available on <strong className="text-pm-text">Dev Team</strong> and <strong className="text-pm-text">Enterprise</strong> plans. Upgrade your workspace to unlock live visual element editing, CSS tweaking, and multi-user canvas collaboration.
        </p>

        {/* Feature Highlights */}
        <div className="bg-pm-surface-2 border border-pm-border rounded-2xl p-4 mb-8 space-y-3">
          <h4 className="text-[11px] font-mono font-bold uppercase tracking-wider text-pm-accent flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-pm-accent" />
            <span>Dev Team Included Capabilities</span>
          </h4>
          <ul className="space-y-2 text-xs text-pm-text">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-pm-accent" />
              <span>Live DOM element selection & CSS style override editing</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-pm-accent" />
              <span>Multi-user real-time presence & Blueprint Canvas</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-pm-accent" />
              <span>Up to 5 Developer Seats & 10 Projects across organization</span>
            </li>
          </ul>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <Link
            href="/pricing"
            className="w-full sm:w-1/2 py-3 px-4 rounded-xl bg-pm-accent hover:bg-pm-accent-bright text-white text-xs font-bold transition-all shadow-md shadow-pm-accent/20 flex items-center justify-center gap-2 cursor-pointer text-center"
          >
            <span>View pricing</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>

          <Link
            href="/dashboard"
            className="w-full sm:w-1/2 py-3 px-4 rounded-xl bg-pm-surface-2 border border-pm-border hover:bg-pm-surface-3 text-pm-text text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer text-center"
          >
            <LayoutDashboard className="w-3.5 h-3.5 text-pm-muted" />
            <span>Back to dashboard</span>
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
