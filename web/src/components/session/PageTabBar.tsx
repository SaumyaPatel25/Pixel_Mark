'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Compass, Layers, Globe } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

interface PageVisit {
  id: string
  session_id: string
  page_url: string
  page_title: string | null
  page_order: number
  visit_count: number
  first_visited_at: string
  last_visited_at: string
}

interface PageTabBarProps {
  sessionId: string
  currentUrl: string
  onSelectPage: (url: string) => void
  shareToken?: string
  refreshTrigger?: number
  onVisitsLoaded?: (visits: PageVisit[]) => void
}

export default function PageTabBar({
  sessionId,
  currentUrl,
  onSelectPage,
  shareToken,
  refreshTrigger = 0,
  onVisitsLoaded
}: PageTabBarProps) {
  const [visits, setVisits] = useState<PageVisit[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const tabsContainerRef = useRef<HTMLDivElement>(null)

  // Fetch unique page visits from the backend
  const fetchVisits = useCallback(async () => {
    try {
      const data = await api.sessions.getVisits(sessionId)
      if (Array.isArray(data)) {
        // Sort visits by page_order or visited_at
        const sorted = [...data].sort((a, b) => (a.page_order || 0) - (b.page_order || 0))
        setVisits(sorted)
        if (onVisitsLoaded) {
          onVisitsLoaded(sorted)
        }
      }
    } catch (err) {
      console.error('[PageTabBar] Failed to fetch visits:', err)
    } finally {
      setIsLoading(false)
    }
  }, [sessionId, onVisitsLoaded])

  // Fetch visits on mount, currentUrl changes, or manual triggers
  useEffect(() => {
    fetchVisits()
  }, [fetchVisits, currentUrl, refreshTrigger])

  // Get human-friendly label for each visit
  const getTabLabel = (visit: PageVisit) => {
    if (visit.page_title && visit.page_title.trim().length > 0) {
      return visit.page_title
    }
    try {
      const parsed = new URL(visit.page_url)
      const path = parsed.pathname + parsed.search
      return path === '/' ? '/' : path
    } catch {
      return visit.page_url
    }
  };

  // Scroll active tab into view
  useEffect(() => {
    if (!tabsContainerRef.current) return
    const activeEl = tabsContainerRef.current.querySelector('[data-active="true"]')
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    }
  }, [currentUrl, visits])

  // Navigation handlers
  const activeIndex = visits.findIndex(v => v.page_url === currentUrl)
  const canGoBack = activeIndex > 0
  const canGoForward = activeIndex !== -1 && activeIndex < visits.length - 1

  const handlePrev = () => {
    if (canGoBack) {
      onSelectPage(visits[activeIndex - 1].page_url)
    }
  }

  const handleNext = () => {
    if (canGoForward) {
      onSelectPage(visits[activeIndex + 1].page_url)
    }
  }

  const scrollLeft = () => {
    if (tabsContainerRef.current) {
      tabsContainerRef.current.scrollBy({ left: -200, behavior: 'smooth' })
    }
  }

  const scrollRight = () => {
    if (tabsContainerRef.current) {
      tabsContainerRef.current.scrollBy({ left: 200, behavior: 'smooth' })
    }
  }

  if (visits.length === 0 && isLoading) {
    return (
      <div className="h-10 bg-[#0d0d14]/80 border-b border-white/5 flex items-center justify-center">
        <span className="text-[10px] uppercase font-black tracking-widest text-white/20 animate-pulse">
          Synchronizing session pages...
        </span>
      </div>
    )
  }

  return (
    <div className="h-11 bg-[#09090d] border-b border-white/[0.04] flex items-center px-4 justify-between select-none relative z-30">
      
      {/* History controls */}
      <div className="flex items-center gap-1 flex-shrink-0 mr-4">
        <button
          onClick={handlePrev}
          disabled={!canGoBack}
          aria-label="Previous visited page"
          className={cn(
            "w-7 h-7 rounded-lg flex items-center justify-center transition-all",
            canGoBack 
              ? "text-white/70 hover:bg-white/5 hover:text-white" 
              : "text-white/10 cursor-not-allowed"
          )}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          onClick={handleNext}
          disabled={!canGoForward}
          aria-label="Next visited page"
          className={cn(
            "w-7 h-7 rounded-lg flex items-center justify-center transition-all",
            canGoForward 
              ? "text-white/70 hover:bg-white/5 hover:text-white" 
              : "text-white/10 cursor-not-allowed"
          )}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="h-5 w-px bg-white/5 flex-shrink-0 mr-4" />

      {/* Tabs Container */}
      <div className="flex-1 min-w-0 overflow-hidden relative flex items-center">
        
        {/* Scroll Indicator Left */}
        <button 
          onClick={scrollLeft}
          className="absolute left-0 z-10 w-6 h-full bg-gradient-to-r from-[#09090d] to-transparent flex items-center justify-start text-white/30 hover:text-white/70 transition-all"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        {/* Sliding Tabs track */}
        <div
          ref={tabsContainerRef}
          className="flex-1 flex gap-1.5 overflow-x-auto select-none no-scrollbar py-1 px-5"
          style={{ scrollbarWidth: 'none' }}
        >
          {visits.map((visit, index) => {
            const isActive = visit.page_url === currentUrl
            return (
              <button
                key={visit.id}
                data-active={isActive}
                onClick={() => onSelectPage(visit.page_url)}
                className={cn(
                  "relative h-7 rounded-lg px-3.5 flex items-center gap-2 border transition-all text-left whitespace-nowrap overflow-hidden group flex-shrink-0",
                  isActive
                    ? "bg-[#161324] border-purple-500/40 text-purple-200"
                    : "bg-white/[0.015] border-white/[0.04] text-white/40 hover:bg-white/[0.04] hover:text-white/75 hover:border-white/[0.08]"
                )}
              >
                {/* Active Indicator Underline */}
                {isActive && (
                  <motion.div
                    layoutId="activeTabGlow"
                    className="absolute inset-x-0 bottom-0 h-[2px] bg-purple-500 shadow-[0_0_8px_#8b5cf6]"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}

                {/* Visit order index badge */}
                <span className={cn(
                  "w-3.5 h-3.5 rounded flex items-center justify-center text-[8px] font-black leading-none",
                  isActive 
                    ? "bg-purple-500/20 text-purple-300 border border-purple-500/30" 
                    : "bg-white/5 text-white/30 border border-white/5"
                )}>
                  {index + 1}
                </span>

                {/* Tab title / URL path */}
                <span className="text-[10px] font-bold tracking-tight max-w-[140px] truncate leading-none">
                  {getTabLabel(visit)}
                </span>

                {/* Visit Count Badge */}
                {visit.visit_count > 1 && (
                  <span className="text-[7px] font-black uppercase text-white/25 px-1 py-0.2 bg-white/5 rounded border border-white/5 leading-none">
                    {visit.visit_count}x
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Scroll Indicator Right */}
        <button 
          onClick={scrollRight}
          className="absolute right-0 z-10 w-6 h-full bg-gradient-to-l from-[#09090d] to-transparent flex items-center justify-end text-white/30 hover:text-white/70 transition-all"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="h-5 w-px bg-white/5 flex-shrink-0 ml-4 mr-4" />

      {/* Stats Summary indicator */}
      <div className="flex items-center gap-2 flex-shrink-0 text-white/30 text-[9px] font-black uppercase tracking-widest bg-white/[0.02] border border-white/5 px-3 py-1.5 rounded-lg">
        <Compass className="w-3.5 h-3.5 text-purple-400" />
        <span>Visited: {visits.length} pages</span>
      </div>

    </div>
  )
}
