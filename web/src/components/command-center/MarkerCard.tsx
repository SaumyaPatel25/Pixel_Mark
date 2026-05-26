'use client'

import React, { useState } from 'react'
import { Marker, useMarkerStore, Priority, Status } from '@/store/markerStore'
import { Terminal, ShieldAlert, Monitor, Sparkles, Trash2, Eye } from 'lucide-react'

const PRIORITY_BADGES = {
  critical: 'bg-red-500/20 text-red-400 border border-red-500/30',
  high: 'bg-orange-500/20 text-orange-400 border border-orange-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
  low: 'bg-gray-500/20 text-gray-400 border border-gray-500/30',
}

const STATUS_BADGES = {
  open: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  in_progress: 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
  resolved: 'bg-green-500/20 text-green-400 border border-green-500/30',
}

export function MarkerCard({ marker }: { marker: Marker }) {
  const { updateMarker, deleteMarker } = useMarkerStore()
  const [isDeleting, setIsDeleting] = useState(false)

  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    try {
      await updateMarker(marker.id, { status: e.target.value as Status })
    } catch (err) {
      alert('Failed to update status')
    }
  }

  const handlePriorityChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    try {
      await updateMarker(marker.id, { priority: e.target.value as Priority })
    } catch (err) {
      alert('Failed to update priority')
    }
  }

  const handleDelete = async () => {
    if (window.confirm('Purge this feedback record from observation logs?')) {
      setIsDeleting(true)
      try {
        await deleteMarker(marker.id)
      } catch (err) {
        alert('Failed to delete marker')
        setIsDeleting(false)
      }
    }
  }

  return (
    <div className="group bg-[#111118] border border-white/10 hover:border-purple-500/30 rounded-2xl p-5 space-y-4 transition-all duration-300 shadow-xl relative overflow-hidden">
      {/* Upper Badge Row */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {/* Status Dropdown / Badge */}
          <select
            value={marker.status}
            onChange={handleStatusChange}
            className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-xl outline-none cursor-pointer ${STATUS_BADGES[marker.status]}`}
          >
            <option value="open" className="bg-[#0c0c0e] text-blue-400">Open</option>
            <option value="in_progress" className="bg-[#0c0c0e] text-purple-400">In Progress</option>
            <option value="resolved" className="bg-[#0c0c0e] text-green-400">Resolved</option>
          </select>

          {/* Priority Dropdown / Badge */}
          <select
            value={marker.priority}
            onChange={handlePriorityChange}
            className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-xl outline-none cursor-pointer ${PRIORITY_BADGES[marker.priority]}`}
          >
            <option value="critical" className="bg-[#0c0c0e] text-red-400">Critical</option>
            <option value="high" className="bg-[#0c0c0e] text-orange-400">High</option>
            <option value="medium" className="bg-[#0c0c0e] text-yellow-400">Medium</option>
            <option value="low" className="bg-[#0c0c0e] text-gray-400">Low</option>
          </select>
        </div>

        <button
          disabled={isDeleting}
          onClick={handleDelete}
          className="p-2 rounded-xl text-white/20 hover:text-red-400 hover:bg-red-500/5 transition-all"
          title="Delete feedback"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Title & Description */}
      <div className="space-y-1.5">
        <h4 className="text-sm font-black text-white leading-tight uppercase tracking-tight truncate">
          {marker.title || 'Untitled Marker Record'}
        </h4>
        {marker.description && (
          <p className="text-xs text-white/50 leading-relaxed font-sans">{marker.description}</p>
        )}
      </div>

      {/* Technical contextual markers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] text-white/30 pt-2 border-t border-white/[0.03]">
        {marker.browser && (
          <div className="flex items-center gap-1.5 font-mono truncate">
            <Monitor className="w-3.5 h-3.5 flex-shrink-0" />
            <span>
              {marker.browser} {marker.viewport ? `(${marker.viewport.width}x${marker.viewport.height})` : ''}
            </span>
          </div>
        )}
        {marker.url && (
          <div className="flex items-center gap-1.5 font-mono truncate">
            <Eye className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{marker.url}</span>
          </div>
        )}
      </div>

      {/* Code XPath / CSS Segment */}
      {marker.xpath && (
        <div className="bg-black/30 border border-white/5 rounded-xl px-4 py-2.5 flex items-center justify-between gap-4">
          <code className="text-[10px] font-mono text-purple-300 truncate max-w-[280px]">
            {marker.xpath}
          </code>
          <Terminal className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
        </div>
      )}

      {/* Console Errors Panel */}
      {marker.console_errors && marker.console_errors.length > 0 && (
        <div className="bg-red-500/[0.02] border border-red-500/10 rounded-xl p-3 flex gap-2.5 items-start">
          <ShieldAlert className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="min-w-0">
            <span className="text-[9px] font-mono tracking-widest text-red-400/50 uppercase block mb-1">
              Terminal Error Log
            </span>
            <code className="text-[9px] font-mono text-red-300/80 leading-normal block truncate">
              {marker.console_errors[0]}
            </code>
          </div>
        </div>
      )}

      {/* AI Summary and Fix recommendations */}
      {marker.ai_summary && (
        <div className="bg-cyan-500/[0.02] border border-cyan-500/10 rounded-xl p-3 space-y-1">
          <div className="flex items-center gap-1 text-[9px] font-black uppercase text-cyan-400 tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            AI Diagnostics
          </div>
          <p className="text-[10px] text-cyan-200/60 leading-relaxed font-sans italic">
            "{marker.ai_summary}"
          </p>
        </div>
      )}

      {/* Screenshot attachment preview */}
      {marker.screenshot_url && (
        <div className="rounded-xl overflow-hidden border border-white/5 bg-black/20 max-h-36">
          <img
            src={marker.screenshot_url}
            alt="Feedback screenshot context"
            className="w-full h-full object-cover opacity-60 hover:opacity-100 transition-opacity duration-300"
            loading="lazy"
          />
        </div>
      )}
    </div>
  )
}
