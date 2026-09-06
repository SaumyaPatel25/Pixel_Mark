'use client'

import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Bell,
  CheckCheck,
  X,
  Layers,
  Video,
  ExternalLink,
  MessageSquare,
  Sparkles,
  Clock,
  User
} from 'lucide-react'
import { useNotificationStore, NotificationItem, NotificationTab } from '@/store/useNotificationStore'
import { useMarkerStore } from '@/store/markerStore'
import { useBlueprintStore } from '@/store/blueprintStore'

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
    marker_moved: 'Pin Moved',
    pin_created: 'Pin Created',
    pin_resolved: 'Pin Resolved',
    comment_created: 'Comment Created',
    session_started: 'Session Started',
  }
  if (map[evtType]) return map[evtType]
  return evtType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
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

  useEffect(() => {
    if (isDrawerOpen) {
      fetchNotifications(projectId)
    }
  }, [isDrawerOpen, projectId, fetchNotifications])

  if (!isDrawerOpen) return null

  const filteredNotifications = notifications.filter(n => {
    if (activeTab === 'blueprint') return n.source_type === 'blueprint'
    if (activeTab === 'session') return n.source_type === 'session'
    if (activeTab === 'unread') return !n.read_at
    return true
  })

  const handleNotificationClick = (item: NotificationItem) => {
    // 1. Mark as read immediately
    markAsRead(item.id)

    // 2. Resolve destination marker or frame
    const markerId = item.marker_id || (item.entity_type === 'marker' ? item.entity_id : undefined)
    const frameId = item.frame_id || (item.entity_type === 'frame' ? item.entity_id : undefined)

    if (markerId) {
      // Set active marker in store
      useMarkerStore.getState().setSelectedMarkerId(markerId)

      // Post message for AuditSurface to highlight and open drawer
      if (typeof window !== 'undefined') {
        window.postMessage({
          type: 'STAGE_OPEN_CAPTURE',
          id: markerId,
          pageUrl: item.page_url
        }, '*')
      }

      // If notification has a specific project URL and we are not on it, navigate
      if (item.project_id && !window.location.pathname.includes(item.project_id)) {
        router.push(`/project/${item.project_id}`)
      }
    } else if (frameId) {
      // Set active frame in Blueprint store
      useBlueprintStore.getState().setSelectedFrameId(frameId)

      if (item.project_id && !window.location.pathname.includes(item.project_id)) {
        router.push(`/blueprint/${item.project_id}`)
      }
    }

    // 3. Close drawer
    toggleDrawer(false)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end animate-in fade-in duration-200 select-none">
      {/* Click outside to close */}
      <div 
        className="flex-1" 
        onClick={() => toggleDrawer(false)} 
        aria-label="Close notification drawer backdrop"
      />

      <div className="w-full max-w-md bg-[#090d16] border-l border-slate-800 flex flex-col h-full shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Header — Elementor SaaS Style */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
                <span>STAGE Notifications</span>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-[11px] font-mono font-bold">
                    {unreadCount} new
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-slate-400">Live review and canvas activity</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {unreadCount > 0 && (
              <button
                onClick={() => markAllAsRead(projectId)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer text-xs font-semibold flex items-center gap-1"
                title="Mark all as read"
              >
                <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Read all</span>
              </button>
            )}

            <button
              onClick={() => toggleDrawer(false)}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-colors cursor-pointer"
              title="Close drawer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="px-3 py-2 bg-slate-950 border-b border-slate-800/80 flex items-center gap-1 overflow-x-auto">
          {(['all', 'unread', 'session', 'blueprint'] as NotificationTab[]).map((tab) => {
            const isActive = activeTab === tab
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer capitalize flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                    : 'bg-slate-900/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800/50'
                }`}
              >
                {tab === 'blueprint' && <Layers className="w-3 h-3" />}
                {tab === 'session' && <Video className="w-3 h-3" />}
                <span>{tab}</span>
                {tab === 'unread' && unreadCount > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                    isActive ? 'bg-slate-950 text-cyan-300' : 'bg-rose-500/20 text-rose-400'
                  }`}>
                    {unreadCount}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          {isLoading && filteredNotifications.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
              <div className="w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
              <span>Loading notifications...</span>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-500 space-y-2">
              <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 mx-auto flex items-center justify-center text-slate-400">
                <Sparkles className="w-5 h-5 text-cyan-400" />
              </div>
              <p className="font-bold text-slate-300 text-sm">All caught up on STAGE!</p>
              <p className="text-slate-500 max-w-xs mx-auto">
                Real-time comments, marker updates, and visual edits will appear here.
              </p>
            </div>
          ) : (
            filteredNotifications.map((item) => {
              const isUnread = !item.read_at
              return (
                <div
                  key={item.id}
                  onClick={() => handleNotificationClick(item)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer relative overflow-hidden group ${
                    isUnread
                      ? 'bg-slate-900/95 border-cyan-500/40 shadow-lg shadow-cyan-950/20 hover:border-cyan-400'
                      : 'bg-slate-950/60 border-slate-800/80 opacity-80 hover:opacity-100 hover:bg-slate-900/60 hover:border-slate-700'
                  }`}
                >
                  {/* Unread Accent Indicator */}
                  {isUnread && (
                    <div className="absolute top-0 left-0 bottom-0 w-1 bg-gradient-to-b from-cyan-400 to-blue-500" />
                  )}

                  <div className="flex items-start justify-between gap-2 pl-1">
                    {/* Source & Entity Badge */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`p-1 rounded-md text-xs ${
                        item.source_type === 'blueprint' 
                          ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' 
                          : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                      }`}>
                        {item.source_type === 'blueprint' ? (
                          <Layers className="w-3 h-3" />
                        ) : (
                          <Video className="w-3 h-3" />
                        )}
                      </span>

                      {item.actor_name && (
                        <span className="text-xs font-bold text-slate-200 flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-400" />
                          <span>{item.actor_name}</span>
                        </span>
                      )}

                      {item.target_name && (
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-mono border border-slate-700">
                          {item.target_name}
                        </span>
                      )}
                    </div>

                    {/* Timestamp */}
                    <div className="flex items-center gap-1 text-[11px] text-slate-500 shrink-0">
                      <Clock className="w-3 h-3 text-slate-600" />
                      <span>{formatRelativeTime(item.created_at)}</span>
                    </div>
                  </div>

                  {/* Event Type & Headline */}
                  <div className="mt-2 pl-1">
                    <h4 className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors flex items-center gap-1.5">
                      {item.event_type && (
                        <span className="text-cyan-400 font-semibold">{formatEventTypeLabel(item.event_type)}</span>
                      )}
                      {item.title && item.title !== item.event_type && (
                        <span className="text-slate-300 font-normal">— {item.title}</span>
                      )}
                    </h4>

                    {item.body && (
                      <p className="text-xs text-slate-300/90 mt-1 line-clamp-2 leading-relaxed">
                        {item.body}
                      </p>
                    )}
                  </div>

                  {/* Action Link Footer */}
                  <div className="mt-2.5 pl-1 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-800/60 pt-2">
                    <span className="text-slate-400 text-[10px] font-mono">
                      {item.marker_id ? `Marker #${item.marker_id.slice(-4)}` : item.frame_id ? `Frame: ${item.frame_id.slice(-6)}` : 'Session Activity'}
                    </span>
                    <span className="text-cyan-400 group-hover:underline flex items-center gap-1 text-xs font-semibold">
                      <span>Jump to target</span>
                      <ExternalLink className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-[11px] text-slate-500">
          <span>Powered by STAGE Outbox Event Bus</span>
          {unreadCount > 0 && (
            <button
              onClick={() => markAllAsRead(projectId)}
              className="text-cyan-400 hover:text-cyan-300 font-bold transition-colors cursor-pointer"
            >
              Clear all
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
