'use client'

import React, { useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bell,
  CheckCheck,
  X,
  Layers,
  Video,
  ArrowRight,
  MessageSquare,
  Sparkles,
  Clock,
  User,
  CheckCircle2,
  Pin,
  Move,
  Settings,
  Inbox
} from 'lucide-react'
import { useNotificationStore, NotificationItem, NotificationTab } from '@/store/useNotificationStore'
import { useMarkerStore } from '@/store/markerStore'
import { useBlueprintStore } from '@/store/blueprintStore'
import { cn } from '@/lib/utils'

interface NotificationDrawerProps {
  projectId?: string
}

function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) return 'just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
  } catch {
    return 'recently'
  }
}

function formatEventTypeLabel(evtType: string): string {
  const map: Record<string, string> = {
    marker_created: 'Pin Created',
    marker_resolved: 'Pin Resolved',
    marker_updated: 'Pin Updated',
    marker_moved: 'Pin Repositioned',
    pin_created: 'Pin Created',
    pin_resolved: 'Pin Resolved',
    comment_created: 'New Comment',
    session_started: 'Session Started',
  }
  if (map[evtType]) return map[evtType]
  return evtType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function getEventIcon(item: NotificationItem) {
  const evt = item.event_type?.toLowerCase() || ''
  if (evt.includes('resolve')) {
    return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
  }
  if (evt.includes('comment')) {
    return <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
  }
  if (evt.includes('move')) {
    return <Move className="w-3.5 h-3.5 text-sky-400" />
  }
  if (evt.includes('pin') || evt.includes('marker')) {
    return <Pin className="w-3.5 h-3.5 text-purple-400" />
  }
  if (item.source_type === 'blueprint') {
    return <Layers className="w-3.5 h-3.5 text-indigo-400" />
  }
  if (item.source_type === 'session') {
    return <Video className="w-3.5 h-3.5 text-cyan-400" />
  }
  return <Bell className="w-3.5 h-3.5 text-white/50" />
}

function getNotificationGroup(dateString: string): string {
  try {
    const date = new Date(dateString)
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const notifDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())

    if (notifDate.getTime() === today.getTime()) return 'Today'
    if (notifDate.getTime() === yesterday.getTime()) return 'Yesterday'
    return 'Earlier'
  } catch {
    return 'Earlier'
  }
}

export function NotificationDrawer({ projectId }: NotificationDrawerProps) {
  const router = useRouter()
  const {
    notifications,
    unreadCount,
    isDrawerOpen,
    activeTab,
    isLoading,
    toggleDrawer,
    setActiveTab,
    markAsRead,
    markAllAsRead,
    fetchNotifications
  } = useNotificationStore()

  // Fetch when opened
  useEffect(() => {
    if (isDrawerOpen) {
      fetchNotifications(projectId)
    }
  }, [isDrawerOpen, projectId, fetchNotifications])

  // Escape key listener for accessible dismissal
  useEffect(() => {
    if (!isDrawerOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        toggleDrawer(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isDrawerOpen, toggleDrawer])

  const filteredNotifications = useMemo(() => {
    return notifications.filter(n => {
      if (activeTab === 'blueprint') return n.source_type === 'blueprint'
      if (activeTab === 'session') return n.source_type === 'session'
      if (activeTab === 'unread') return !n.read_at
      return true
    })
  }, [notifications, activeTab])

  // Group notifications by relative date period
  const groupedNotifications = useMemo(() => {
    const groups: { label: string; items: NotificationItem[] }[] = []
    const order = ['Today', 'Yesterday', 'Earlier']
    const map = new Map<string, NotificationItem[]>()

    filteredNotifications.forEach(item => {
      const g = getNotificationGroup(item.created_at)
      if (!map.has(g)) map.set(g, [])
      map.get(g)!.push(item)
    })

    order.forEach(label => {
      if (map.has(label) && map.get(label)!.length > 0) {
        groups.push({ label, items: map.get(label)! })
      }
    })

    return groups
  }, [filteredNotifications])

  const handleNotificationClick = useCallback((item: NotificationItem) => {
    markAsRead(item.id)

    const markerId = item.marker_id || (item.entity_type === 'marker' ? item.entity_id : undefined)
    const frameId = item.frame_id || (item.entity_type === 'frame' ? item.entity_id : undefined)

    if (markerId) {
      useMarkerStore.getState().setSelectedMarkerId(markerId)

      if (typeof window !== 'undefined') {
        window.postMessage({
          type: 'STAGE_OPEN_CAPTURE',
          id: markerId,
          pageUrl: item.page_url
        }, '*')
      }

      if (item.project_id && !window.location.pathname.includes(item.project_id)) {
        router.push(`/project/${item.project_id}`)
      }
    } else if (frameId) {
      useBlueprintStore.getState().setSelectedFrameId(frameId)

      if (item.project_id && !window.location.pathname.includes(item.project_id)) {
        router.push(`/blueprint/${item.project_id}`)
      }
    }

    toggleDrawer(false)
  }, [markAsRead, router, toggleDrawer])

  return (
    <AnimatePresence>
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop with subtle blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => toggleDrawer(false)}
            aria-label="Close notifications"
            className="fixed inset-0 bg-black/50 backdrop-blur-sm cursor-pointer"
          />

          {/* Drawer Panel */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Activity & Notifications"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 350 }}
            className="relative w-full max-w-md h-full bg-[#0d111a]/95 text-slate-100 border-l border-white/10 shadow-2xl backdrop-blur-2xl flex flex-col z-10 overflow-hidden font-sans"
          >
            {/* ─── Header ─── */}
            <div className="px-5 py-4 border-b border-white/10 bg-white/[0.02] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shrink-0 shadow-inner">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-white tracking-tight">
                      Notifications
                    </h2>
                    {unreadCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 text-[11px] font-mono font-semibold">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-white/40">Real-time reviews, pins & visual feedback</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={() => markAllAsRead(projectId)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-white/70 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 transition-colors cursor-pointer"
                    title="Mark all as read"
                  >
                    <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="hidden sm:inline">Mark all read</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => toggleDrawer(false)}
                  className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  title="Close (Esc)"
                  aria-label="Close notification drawer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* ─── Segmented Filter Tabs ─── */}
            <div className="px-5 py-2.5 bg-black/20 border-b border-white/5 shrink-0">
              <div className="grid grid-cols-4 p-1 rounded-xl bg-white/[0.04] border border-white/5 text-xs">
                {(['all', 'unread', 'session', 'blueprint'] as NotificationTab[]).map((tab) => {
                  const isActive = activeTab === tab
                  return (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveTab(tab)}
                      className={cn(
                        "py-1.5 px-2 rounded-lg font-medium text-[11px] transition-all capitalize flex items-center justify-center gap-1.5 cursor-pointer",
                        isActive
                          ? "bg-purple-600 text-white shadow-sm font-semibold"
                          : "text-white/50 hover:text-white hover:bg-white/[0.03]"
                      )}
                    >
                      {tab === 'blueprint' && <Layers className="w-3 h-3" />}
                      {tab === 'session' && <Video className="w-3 h-3" />}
                      <span>{tab === 'all' ? 'All' : tab}</span>
                      {tab === 'unread' && unreadCount > 0 && (
                        <span className={cn(
                          "px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold",
                          isActive ? "bg-white text-purple-700" : "bg-purple-500/30 text-purple-300"
                        )}>
                          {unreadCount}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* ─── Notification List Feed ─── */}
            <div className="flex-1 overflow-y-auto px-5 py-3 space-y-5 custom-scrollbar">
              {isLoading && filteredNotifications.length === 0 ? (
                <div className="space-y-3 py-4">
                  {[1, 2, 3, 4].map(i => (
                    <div
                      key={i}
                      className="p-4 rounded-xl border border-white/5 bg-white/[0.02] animate-pulse space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="h-4 w-24 bg-white/10 rounded-md" />
                        <div className="h-3 w-12 bg-white/10 rounded-md" />
                      </div>
                      <div className="h-4 w-4/5 bg-white/10 rounded-md" />
                      <div className="h-3 w-1/2 bg-white/5 rounded-md" />
                    </div>
                  ))}
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="py-20 text-center flex flex-col items-center justify-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-white/30 shadow-inner">
                    <Inbox className="w-6 h-6 text-purple-400/60" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-white/90">All caught up</p>
                    <p className="text-xs text-white/40 max-w-xs mx-auto leading-relaxed">
                      Real-time pin activity, review discussions, and visual changes will appear here.
                    </p>
                  </div>
                </div>
              ) : (
                groupedNotifications.map(group => (
                  <div key={group.label} className="space-y-2.5">
                    {/* Date Section Header */}
                    <div className="flex items-center gap-2 px-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                        {group.label}
                      </span>
                      <div className="flex-1 h-px bg-white/5" />
                    </div>

                    {/* Cards in this group */}
                    <div className="space-y-2">
                      {group.items.map((item) => {
                        const isUnread = !item.read_at
                        return (
                          <div
                            key={item.id}
                            onClick={() => handleNotificationClick(item)}
                            className={cn(
                              "p-3.5 rounded-xl border transition-all cursor-pointer relative group",
                              isUnread
                                ? "bg-white/[0.04] border-purple-500/30 hover:border-purple-500/50 hover:bg-white/[0.06] shadow-sm"
                                : "bg-black/20 border-white/5 hover:border-white/15 hover:bg-white/[0.02]"
                            )}
                          >
                            {/* Unread Indicator Bar */}
                            {isUnread && (
                              <div className="absolute top-3 bottom-3 left-0 w-1 rounded-r-full bg-gradient-to-b from-purple-400 to-indigo-500" />
                            )}

                            <div className="flex items-start justify-between gap-2">
                              {/* Left Meta: Icon & Actor */}
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="p-1 rounded-md bg-white/[0.05] border border-white/10 shrink-0">
                                  {getEventIcon(item)}
                                </div>

                                {item.actor_name ? (
                                  <span className="text-xs font-semibold text-white/90 truncate flex items-center gap-1">
                                    <User className="w-3 h-3 text-white/40 shrink-0" />
                                    <span>{item.actor_name}</span>
                                  </span>
                                ) : (
                                  <span className="text-xs font-semibold text-white/90">
                                    {formatEventTypeLabel(item.event_type)}
                                  </span>
                                )}

                                {item.target_name && (
                                  <span className="px-1.5 py-0.5 rounded bg-white/[0.06] text-white/70 text-[10px] font-mono border border-white/5 truncate max-w-[120px]">
                                    {item.target_name}
                                  </span>
                                )}
                              </div>

                              {/* Relative Timestamp */}
                              <div className="flex items-center gap-1 text-[11px] text-white/40 shrink-0 font-medium">
                                <Clock className="w-3 h-3 text-white/30" />
                                <span>{formatRelativeTime(item.created_at)}</span>
                              </div>
                            </div>

                            {/* Main Headline & Body */}
                            <div className="mt-2 pl-0.5 space-y-1">
                              <h3 className="text-xs font-medium text-white/95 group-hover:text-purple-300 transition-colors flex items-center gap-1.5 leading-snug">
                                {item.title && item.title !== item.event_type ? (
                                  <span>{item.title}</span>
                                ) : (
                                  <span className="text-white/80">{formatEventTypeLabel(item.event_type)}</span>
                                )}
                              </h3>

                              {item.body && (
                                <p className="text-xs text-white/60 line-clamp-2 leading-relaxed">
                                  {item.body}
                                </p>
                              )}
                            </div>

                            {/* Card Footer: Identifier & Jump Action */}
                            <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-white/40">
                              <span className="font-mono text-[10px] text-white/40">
                                {item.marker_id
                                  ? `Marker #${item.marker_id.slice(-4)}`
                                  : item.frame_id
                                  ? `Frame: ${item.frame_id.slice(-6)}`
                                  : 'Session Review'}
                              </span>

                              <span className="inline-flex items-center gap-1 text-purple-400 group-hover:text-purple-300 text-xs font-semibold transition-colors">
                                <span>View</span>
                                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* ─── Footer Bar ─── */}
            <div className="px-5 py-3 border-t border-white/10 bg-white/[0.02] flex items-center justify-between text-xs text-white/40 shrink-0">
              <button
                type="button"
                onClick={() => {
                  toggleDrawer(false)
                  router.push('/settings/notifications')
                }}
                className="inline-flex items-center gap-1.5 text-white/50 hover:text-white transition-colors cursor-pointer text-[11px]"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Notification Settings</span>
              </button>

              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => markAllAsRead(projectId)}
                  className="text-purple-400 hover:text-purple-300 font-semibold transition-colors cursor-pointer text-[11px]"
                >
                  Clear all
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
