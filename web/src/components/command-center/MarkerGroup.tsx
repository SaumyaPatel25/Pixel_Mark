'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, FileText, Layout, Compass } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MarkerGroupProps {
  pageUrl: string
  pageTitle: string
  markers: any[]
  children: React.ReactNode
}

export function MarkerGroup({ pageUrl, pageTitle, markers, children }: MarkerGroupProps) {
  const [isOpen, setIsOpen] = useState(true)

  const getUrlPath = (url: string) => {
    try {
      const parsed = new URL(url)
      const path = parsed.pathname + parsed.search
      return path === '/' ? '/' : path
    } catch {
      if (url.startsWith('/')) return url
      return '/'
    }
  }

  const unresolvedCount = markers.filter(m => m.status !== 'resolved').length
  const criticalCount = markers.filter(m => m.priority === 'critical' || m.priority === 'P0').length

  const pathLabel = getUrlPath(pageUrl)
  const displayTitle = pageTitle && pageTitle.trim().length > 0 ? pageTitle : 'Untitled Page'

  return (
    <div className="rounded-3xl border border-white/[0.04] bg-white/[0.015] overflow-hidden mb-3 transition-all hover:border-white/[0.08]">
      {/* Header Accordion Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-white/[0.02] active:bg-white/[0.01] transition-all select-none"
      >
        <div className="flex items-start gap-3 min-w-0">
          <div className={cn(
            "w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 border",
            isOpen 
              ? "bg-purple-500/10 border-purple-500/20 text-purple-400" 
              : "bg-white/5 border-white/5 text-white/30"
          )}>
            <Layout className="w-4 h-4" />
          </div>
          
          <div className="min-w-0">
            <h4 className="text-xs font-black uppercase tracking-wider text-white truncate max-w-[200px]" title={displayTitle}>
              {displayTitle}
            </h4>
            <div className="flex items-center gap-1.5 mt-1">
              <Compass className="w-3 h-3 text-white/30" />
              <code className="text-[9px] font-mono text-white/40 truncate max-w-[180px]" title={pageUrl}>
                {pathLabel}
              </code>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-shrink-0 ml-4">
          {/* Unresolved Count badge */}
          {unresolvedCount > 0 ? (
            <span className={cn(
              "px-2 py-0.5 rounded-full text-[9px] font-black tracking-wider uppercase leading-none",
              criticalCount > 0
                ? "bg-rose-500/20 border border-rose-500/30 text-rose-400 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.15)]"
                : "bg-purple-500/20 border border-purple-500/30 text-purple-400"
            )}>
              {unresolvedCount} {unresolvedCount === 1 ? 'Issue' : 'Issues'}
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-black tracking-wider uppercase leading-none">
              Clean
            </span>
          )}

          {/* Toggle icon */}
          <ChevronDown className={cn("w-4 h-4 text-white/30 transition-transform duration-300", isOpen ? "rotate-180 text-purple-400" : "")} />
        </div>
      </button>

      {/* Accordion Content Block */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="border-t border-white/[0.03] p-2 bg-black/[0.1] space-y-2">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
