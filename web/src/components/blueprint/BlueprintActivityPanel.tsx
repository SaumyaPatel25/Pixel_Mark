'use client'

import React, { useEffect } from 'react'
import {
  Activity,
  X,
  RefreshCw,
  Edit3,
  Rocket,
  MessageSquare,
  UserPlus,
  Clock,
  ChevronDown
} from 'lucide-react'
import { useBlueprintActivityStore, ActivityFilter } from '@/store/blueprintActivityStore'

interface BlueprintActivityPanelProps {
  projectId: string
}

export function BlueprintActivityPanel({ projectId }: BlueprintActivityPanelProps) {
  const {
    events,
    isLoading,
    hasMore,
    filterType,
    toggleActivityPanel,
    setFilterType,
    fetchActivity,
    loadMore
  } = useBlueprintActivityStore()

  useEffect(() => {
    if (projectId) {
      fetchActivity(projectId)
    }
  }, [projectId, fetchActivity])

  function formatRelativeTime(dateStr: string) {
    try {
      const date = new Date(dateStr)
      const now = new Date()
      const diffMs = now.getTime() - date.getTime()
      const diffSecs = Math.floor(diffMs / 1000)
      const diffMins = Math.floor(diffSecs / 60)
      const diffHours = Math.floor(diffMins / 60)
      const diffDays = Math.floor(diffHours / 24)

      if (diffSecs < 30) return 'Just now'
      if (diffSecs < 60) return `${diffSecs}s ago`
      if (diffMins < 60) return `${diffMins}m ago`
      if (diffHours < 24) return `${diffHours}h ago`
      if (diffDays === 1) return 'Yesterday'
      return `${diffDays}d ago`
    } catch (_) {
      return dateStr
    }
  }

  function getEventIcon(eventType: string) {
    if (eventType.startsWith('edit')) {
      return <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
    }
    if (eventType.startsWith('publication')) {
      return <Rocket className="w-3.5 h-3.5 text-emerald-400" />
    }
    if (eventType.startsWith('comment')) {
      return <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
    }
    if (eventType.includes('joined')) {
      return <UserPlus className="w-3.5 h-3.5 text-purple-400" />
    }
    return <Activity className="w-3.5 h-3.5 text-blue-400" />
  }

  function getInitials(name: string) {
    if (!name) return 'S'
    const parts = name.trim().split(' ')
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
  }

  const filters: { id: ActivityFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'edit', label: 'Edits' },
    { id: 'comment', label: 'Comments' },
    { id: 'publication', label: 'Approvals' },
    { id: 'presence', label: 'Presence' }
  ]

  return (
    <aside className="w-80 border-l border-slate-800 bg-[#0d1322]/95 backdrop-blur-xl flex flex-col h-full shadow-2xl z-30 select-none animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="p-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white tracking-wide">STAGE Activity Feed</h3>
            <p className="text-[10px] text-slate-400">Project Audit & Team Trail</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => fetchActivity(projectId, true)}
            disabled={isLoading}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50 cursor-pointer"
            title="Refresh Activity Feed"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
          <button
            onClick={() => toggleActivityPanel(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close Panel"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Filter Chips */}
      <div className="p-2 border-b border-slate-800 flex items-center gap-1 overflow-x-auto no-scrollbar bg-slate-950/40">
        {filters.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilterType(f.id, projectId)}
            className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all whitespace-nowrap cursor-pointer ${
              filterType === f.id
                ? 'bg-cyan-500 text-slate-950 shadow-sm shadow-cyan-500/20'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Activity List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {events.length === 0 && !isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mb-3">
              <Clock className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-slate-300">No Activity Logged</p>
            <p className="text-[10px] text-slate-500 max-w-[180px] mt-1">
              Edits, comments, approvals, and collaborator activity will appear here chronologically.
            </p>
          </div>
        ) : (
          events.map((event) => (
            <div
              key={event.id}
              className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800/80 hover:border-slate-700 transition-all space-y-1.5 group"
            >
              {/* Actor & Timestamp Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[9px] font-extrabold text-cyan-400">
                    {getInitials(event.actor_name)}
                  </div>
                  <span className="text-[11px] font-bold text-slate-200 truncate max-w-[120px]">
                    {event.actor_name}
                  </span>
                </div>

                <div className="flex items-center gap-1 text-[10px] font-mono text-slate-500">
                  {getEventIcon(event.event_type)}
                  <span>{formatRelativeTime(event.created_at)}</span>
                </div>
              </div>

              {/* Summary Body */}
              <p className="text-xs text-slate-300 leading-relaxed font-sans pl-1">
                {event.summary_text}
              </p>

              {/* Metadata Details Tag */}
              {event.metadata_json && Object.keys(event.metadata_json).length > 0 && (
                <div className="pl-1 pt-1 flex flex-wrap gap-1">
                  {event.metadata_json.target_selector && (
                    <span className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-[9px] font-mono text-cyan-400 max-w-[200px] truncate">
                      {event.metadata_json.target_selector}
                    </span>
                  )}
                  {event.metadata_json.new_status && (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-bold text-emerald-400 uppercase tracking-wider">
                      {event.metadata_json.new_status}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))
        )}

        {/* Load More Button */}
        {hasMore && (
          <button
            onClick={() => loadMore(projectId)}
            disabled={isLoading}
            className="w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-300 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 mt-2 cursor-pointer"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                <span>Loading events...</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                <span>Load Earlier Activity</span>
              </>
            )}
          </button>
        )}
      </div>
    </aside>
  )
}
