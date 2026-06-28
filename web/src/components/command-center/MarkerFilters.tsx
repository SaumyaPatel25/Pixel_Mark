'use client'

import React from 'react'
import { useMarkerStore, Priority, Status } from '@/store/markerStore'
import { Filter, X } from 'lucide-react'

export function MarkerFilters() {
  const filters = useMarkerStore(s => s.filters)
  const setFilter = useMarkerStore(s => s.setFilter)
  const clearFilters = useMarkerStore(s => s.clearFilters)

  const hasActiveFilters = Object.keys(filters).length > 0

  return (
    <div className="flex flex-wrap items-center gap-3 animate-in fade-in duration-300">
      <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white/50">
        <Filter className="w-3.5 h-3.5" />
        <span className="font-bold uppercase tracking-wider text-[10px]">Filter</span>
      </div>

      {/* Priority Dropdown */}
      <select
        value={filters.priority || ''}
        onChange={(e) => setFilter({ priority: (e.target.value as Priority) || undefined })}
        className="bg-white/5 border border-white/10 text-gray-300 text-xs rounded-xl px-4 py-2 focus:border-purple-500 outline-none transition-all cursor-pointer"
      >
        <option value="" className="bg-[#0a0a0f] text-white">All Priorities</option>
        <option value="critical" className="bg-[#0a0a0f] text-white">Critical</option>
        <option value="high" className="bg-[#0a0a0f] text-white">High</option>
        <option value="medium" className="bg-[#0a0a0f] text-white">Needs Work</option>
        <option value="low" className="bg-[#0a0a0f] text-white">Looks Good</option>
      </select>

      {/* Status Dropdown */}
      <select
        value={filters.status || ''}
        onChange={(e) => setFilter({ status: (e.target.value as Status) || undefined })}
        className="bg-white/5 border border-white/10 text-gray-300 text-xs rounded-xl px-4 py-2 focus:border-purple-500 outline-none transition-all cursor-pointer"
      >
        <option value="" className="bg-[#0a0a0f] text-white">All Statuses</option>
        <option value="open" className="bg-[#0a0a0f] text-white">Waiting</option>
        <option value="in_progress" className="bg-[#0a0a0f] text-white">Being Fixed</option>
        <option value="resolved" className="bg-[#0a0a0f] text-white">Fixed ✓</option>
      </select>

      {/* Clear Filters Button */}
      {hasActiveFilters && (
        <button
          onClick={clearFilters}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-white/80 transition-colors uppercase tracking-wider font-black text-[10px] ml-2"
        >
          <X className="w-3.5 h-3.5" />
          Clear Filters
        </button>
      )}
    </div>
  )
}
