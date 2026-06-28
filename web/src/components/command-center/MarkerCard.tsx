'use client'

import React, { useState } from 'react'
import { Marker, useMarkerStore, Priority, Status } from '@/store/markerStore'
import { Terminal, ShieldAlert, Monitor, Sparkles, Trash2, Eye, ChevronDown, ChevronUp } from 'lucide-react'

const RENDERER_BADGES: Record<string, string> = {
  dom: 'bg-zinc-500/20 text-zinc-400 border border-zinc-500/30',
  shadow_dom: 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30',
  canvas2d: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  webgl: 'bg-orange-500/20 text-orange-400 border border-orange-500/30',
  threejs: 'bg-teal-500/20 text-teal-400 border border-teal-500/30',
  unknown: 'bg-neutral-500/20 text-neutral-400 border border-neutral-500/30',
}

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

export const MarkerCard = React.memo(function MarkerCard({ marker }: { marker: Marker }) {
  const updateMarker = useMarkerStore(s => s.updateMarker)
  const deleteMarker = useMarkerStore(s => s.deleteMarker)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showContext, setShowContext] = useState(false)
  const [showShadowContext, setShowShadowContext] = useState(false)
  const renderer = marker.renderer_type || 'dom'

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
            <option value="open" className="bg-[#0c0c0e] text-blue-400">Waiting</option>
            <option value="in_progress" className="bg-[#0c0c0e] text-purple-400">Being Fixed</option>
            <option value="resolved" className="bg-[#0c0c0e] text-green-400">Fixed ✓</option>
          </select>

          {/* Priority Dropdown / Badge */}
          <select
            value={marker.priority}
            onChange={handlePriorityChange}
            className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-xl outline-none cursor-pointer ${PRIORITY_BADGES[marker.priority]}`}
          >
            <option value="critical" className="bg-[#0c0c0e] text-red-400">Critical</option>
            <option value="high" className="bg-[#0c0c0e] text-orange-400">High</option>
            <option value="medium" className="bg-[#0c0c0e] text-yellow-400">Needs Work</option>
            <option value="low" className="bg-[#0c0c0e] text-gray-400">Looks Good</option>
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

      {/* Page Title & Renderer Badges */}
      <div className="flex items-center justify-between text-[10px] gap-2 pt-1 border-t border-white/[0.03]">
        {/* Renderer Badge */}
        <span className={`px-2 py-0.5 rounded-full font-black uppercase tracking-wider text-[8px] ${RENDERER_BADGES[renderer] || RENDERER_BADGES.unknown}`}>
          {renderer === 'threejs' ? 'Three.js' : renderer === 'webgl' ? 'WebGL' : renderer === 'canvas2d' ? 'Canvas2D' : renderer === 'shadow_dom' ? 'Shadow Element' : 'Standard Element'}
        </span>
        
        {/* Page Path Truncated */}
        <span className="text-white/40 font-mono text-[10px] truncate max-w-[200px]" title={marker.page_url || marker.url || ''}>
          {(() => {
            const u = marker.page_url || marker.url
            if (!u) return 'Global Substrate'
            try {
              if (u.startsWith('http://') || u.startsWith('https://')) {
                const p = new URL(u).pathname
                return p === '/' ? '/index' : p
              }
              return u
            } catch {
              return u
            }
          })()}
        </span>
      </div>

      {/* Title & Description */}
      <div className="space-y-1.5 pt-1">
        <h4 className="text-sm font-black text-white leading-tight uppercase tracking-tight truncate" title={marker.page_title || ''}>
          {marker.title || 'Untitled Marker Record'}
        </h4>
        {marker.description && (
          <p className="text-xs text-white/50 leading-relaxed font-sans">{marker.description}</p>
        )}
      </div>

      {/* Collapsible advanced Canvas / 3D context */}
      {marker.canvas_context && (
        <div className="border border-white/5 bg-[#08080c] rounded-xl overflow-hidden transition-all duration-300">
          <button
            onClick={() => setShowContext(!showContext)}
            className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-black uppercase tracking-wider text-purple-400 hover:bg-white/[0.02] transition-all"
          >
            <span className="flex items-center gap-1.5 font-mono">
              ⚡ 3D Mesh Context
            </span>
            {showContext ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          
          {showContext && (
            <div className="p-3 border-t border-white/5 space-y-2 text-[9px] font-mono text-white/55 bg-[#060608] leading-relaxed">
              {marker.canvas_context.type && (
                <div><span className="text-white/30 font-bold uppercase mr-1">Type:</span> {marker.canvas_context.type}</div>
              )}
              {marker.canvas_context.object_name && (
                <div><span className="text-white/30 font-bold uppercase mr-1">Mesh Name:</span> {marker.canvas_context.object_name}</div>
              )}
              {marker.canvas_context.object_type && (
                <div><span className="text-white/30 font-bold uppercase mr-1">Mesh Type:</span> {marker.canvas_context.object_type}</div>
              )}
              {marker.canvas_context.material_name && (
                <div><span className="text-white/30 font-bold uppercase mr-1">Material:</span> {marker.canvas_context.material_name}</div>
              )}
              {marker.canvas_context.geometry_type && (
                <div><span className="text-white/30 font-bold uppercase mr-1">Geometry:</span> {marker.canvas_context.geometry_type}</div>
              )}
              {marker.canvas_context.intersection_point && (
                <div>
                  <span className="text-white/30 font-bold uppercase mr-1">3D Coord:</span>
                  [{marker.canvas_context.intersection_point.map((n: number) => n.toFixed(3)).join(', ')}]
                </div>
              )}
              {marker.canvas_context.camera_position && (
                <div>
                  <span className="text-white/30 font-bold uppercase mr-1">Camera:</span>
                  [{marker.canvas_context.camera_position.map((n: number) => n.toFixed(3)).join(', ')}]
                </div>
              )}
              {marker.canvas_context.canvas_coords && (
                <div>
                  <span className="text-white/30 font-bold uppercase mr-1">Canvas Pixel:</span>
                  x: {marker.canvas_context.canvas_coords.x.toFixed(0)}, y: {marker.canvas_context.canvas_coords.y.toFixed(0)}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Collapsible Shadow DOM context */}
      {marker.is_inside_shadow_dom && (
        <div className="border border-white/5 bg-[#08080c] rounded-xl overflow-hidden transition-all duration-300">
          <button
            onClick={() => setShowShadowContext(!showShadowContext)}
            className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-black uppercase tracking-wider text-indigo-400 hover:bg-white/[0.02] transition-all"
          >
            <span className="flex items-center gap-1.5 font-mono">
              🧬 Web Component Substrate
            </span>
            {showShadowContext ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          
          {showShadowContext && (
            <div className="p-3 border-t border-white/5 space-y-2 text-[9px] font-mono text-white/55 bg-[#060608] leading-relaxed">
              {marker.shadow_host_tag && (
                <div><span className="text-white/30 font-bold uppercase mr-1">Host Tag:</span> {marker.shadow_host_tag}</div>
              )}
              {marker.shadow_host_id && (
                <div><span className="text-white/30 font-bold uppercase mr-1">Host ID:</span> #{marker.shadow_host_id}</div>
              )}
              {marker.shadow_host_class_list && marker.shadow_host_class_list.length > 0 && (
                <div><span className="text-white/30 font-bold uppercase mr-1">Host Classes:</span> {marker.shadow_host_class_list.join(', ')}</div>
              )}
              {marker.shadow_root_depth !== undefined && marker.shadow_root_depth !== null && (
                <div><span className="text-white/30 font-bold uppercase mr-1">Root Depth:</span> Tier {marker.shadow_root_depth}</div>
              )}
              {marker.shadow_path && (
                <div className="pt-1 border-t border-white/5">
                  <span className="text-white/30 font-bold uppercase block mb-1">Shadow Path:</span>
                  <div className="bg-black/35 p-2 rounded-lg border border-white/[0.03] text-indigo-300 break-all select-all leading-normal whitespace-pre-wrap font-sans text-[10px]">
                    {marker.shadow_path}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

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
        {(marker.page_url || marker.url) && (
          <div className="flex items-center gap-1.5 font-mono truncate">
            <Eye className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{marker.page_url || marker.url}</span>
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
            <code className="text-[9px] font-mono text-red-300/80 leading-normal block truncate" title={
              typeof marker.console_errors[0] === 'object' && marker.console_errors[0] !== null
                ? (marker.console_errors[0] as any).message || JSON.stringify(marker.console_errors[0])
                : String(marker.console_errors[0])
            }>
              {typeof marker.console_errors[0] === 'object' && marker.console_errors[0] !== null
                ? (marker.console_errors[0] as any).message || JSON.stringify(marker.console_errors[0])
                : String(marker.console_errors[0])}
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
})
