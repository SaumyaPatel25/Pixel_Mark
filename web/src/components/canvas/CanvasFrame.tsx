'use client'

import React, { useRef, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CanvasFrame as ICanvasFrame, useCanvasStore } from '@/store/canvasStore'
import { useBlueprintStore } from '@/store/blueprintStore'
import { Activity, Link2, ExternalLink, Globe } from 'lucide-react'
import { SessionPickerModal } from './SessionPickerModal'

interface CanvasFrameProps {
  frame: ICanvasFrame
  zoom: number
  onSelect: () => void
  isSource?: boolean
}

export const CanvasFrame = React.memo(function CanvasFrame({ frame, zoom, onSelect, isSource = false }: CanvasFrameProps) {
  const router = useRouter()
  const updateFramePosition = useCanvasStore(s => s.updateFramePosition)
  const selectedFrameId = useCanvasStore(s => s.selectedFrameId)

  const domTarget = useBlueprintStore(s => s.domTargetByFrameId[frame.id])
  const editStatus = useBlueprintStore(s => s.frameEditStatusById[frame.id] || 'none')
  const activeBlueprintTool = useBlueprintStore(s => s.activeBlueprintTool)
  const setBlueprintDomTargetFromClick = useBlueprintStore(s => s.setBlueprintDomTargetFromClick)

  const frameRef = useRef<HTMLDivElement>(null)
  const dragStartRef = useRef({ x: 0, y: 0, frameX: 0, frameY: 0, hasMoved: false })
  const currentPosRef = useRef({ x: frame.position_x, y: frame.position_y })

  const [showSessionPicker, setShowSessionPicker] = useState(false)

  const isSelected = selectedFrameId === frame.id
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'

  // Sync ref and DOM style when coord store values change externally
  useEffect(() => {
    currentPosRef.current = { x: frame.position_x, y: frame.position_y }
    if (frameRef.current) {
      frameRef.current.style.transform = `translate(${frame.position_x}px, ${frame.position_y}px)`
    }
  }, [frame.position_x, frame.position_y])

  // Listen for iframe element click messages in DOM Edit Mode
  useEffect(() => {
    if (!isSelected || activeBlueprintTool !== 'dom-edit' || !frame.session_id) return

    const handleMessage = (event: MessageEvent) => {
      const data = event.data
      if (!data || typeof data !== 'object') return

      const eventType = data.type || data.eventType
      if (
        eventType === 'PIXELMARK_OPEN_FEEDBACK_DRAWER' ||
        eventType === 'PIXELMARKOPENFEEDBACKDRAWER' ||
        eventType === 'PIXELMARK_DOM_TARGET_SELECTED' ||
        eventType === 'PIXELMARK_ELEMENT_SELECTED'
      ) {
        const payload = data.payload || data
        const selectorPrimary = payload.element_selector || payload.selector || payload.selector_primary || null
        const selectorFallback = payload.fallback_selector || payload.selector_fallback || null
        const xpath = payload.xpath || null
        const elementTag = payload.element_tag || payload.tag_name || payload.tag || 'div'
        const elementLabel = payload.element_label || selectorPrimary || 'Selected Element'
        const textExcerpt = payload.element_text || payload.dom_text_excerpt || payload.text_excerpt || null
        const pageUrl = payload.page_url || payload.pageUrl || null

        setBlueprintDomTargetFromClick(frame.id, {
          pageUrl,
          selectorPrimary,
          selectorFallback,
          xpath,
          elementTag,
          elementLabel,
          textExcerpt
        })
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [isSelected, activeBlueprintTool, frame.id, frame.session_id, setBlueprintDomTargetFromClick])

  const handleMouseDown = (e: React.MouseEvent) => {
    // Prevent drag trigger if clicking links, buttons, or iframe controls
    if ((e.target as HTMLElement).closest('button, select, input, a, iframe')) return

    e.stopPropagation()
    e.preventDefault()

    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      frameX: currentPosRef.current.x,
      frameY: currentPosRef.current.y,
      hasMoved: false
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

  const handleMouseMove = (e: MouseEvent) => {
    const dx = (e.clientX - dragStartRef.current.x) / zoom
    const dy = (e.clientY - dragStartRef.current.y) / zoom

    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      dragStartRef.current.hasMoved = true
    }

    const newX = Math.round(dragStartRef.current.frameX + dx)
    const newY = Math.round(dragStartRef.current.frameY + dy)

    currentPosRef.current = { x: newX, y: newY }
    if (frameRef.current) {
      frameRef.current.style.transform = `translate(${newX}px, ${newY}px)`
    }
  }

  const handleMouseUp = (e: MouseEvent) => {
    window.removeEventListener('mousemove', handleMouseMove)
    window.removeEventListener('mouseup', handleMouseUp)

    if (dragStartRef.current.hasMoved) {
      updateFramePosition(frame.id, currentPosRef.current.x, currentPosRef.current.y)
    } else {
      onSelect()
    }
  }

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (frame.session_id) {
      router.push(`/sessions/${frame.session_id}`)
    }
  }

  // Priority Distribution Bar Calculation
  const dist = frame.priority_distribution || { critical: 0, high: 0, medium: 0, low: 0 }
  const totalMarkers = dist.critical + dist.high + dist.medium + dist.low
  const getPct = (val: number) => totalMarkers > 0 ? `${(val / totalMarkers) * 100}%` : '0%'

  // Date formatting
  const formattedDate = frame.created_at
    ? new Date(frame.created_at).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    : 'Unknown Date'

  return (
    <>
      <div
        ref={frameRef}
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
        onClick={onSelect}
        className={`absolute flex flex-col bg-[#1c1b19] border-2 rounded-2xl shadow-2xl transition-shadow cursor-pointer select-none overflow-hidden ${
          isSource
            ? 'border-teal-400 ring-4 ring-teal-500/20'
            : selectedFrameId === frame.id
            ? 'border-teal-500 ring-2 ring-teal-500/30'
            : 'border-white/10 hover:border-white/30'
        }`}
        style={{
          left: frame.position_x,
          top: frame.position_y,
          width: frame.width || 360,
          height: frame.height || 260,
        }}
      >
        {/* Selection Glow Bar */}
        <div 
          className={`h-1 w-full transition-all ${
            selectedFrameId === frame.id ? 'bg-teal-400 shadow-lg shadow-teal-400/50' : 'bg-transparent'
          }`}
          style={{ backgroundColor: frame.color || '#1c1b19' }} 
        />

        {/* Frame Header Bar */}
        <div className="bg-[#1c1b19] px-4 py-2.5 border-b border-white/5 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-black text-white/80 uppercase tracking-wider truncate">
              {frame.title || 'Untitled Session'}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowSessionPicker(true)
              }}
              className="p-1 rounded bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-colors"
              title={frame.session_id ? 'Change connected session' : 'Connect session'}
            >
              <Link2 className={`w-3 h-3 ${frame.session_id ? 'text-teal-400' : ''}`} />
            </button>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Live Session Badge */}
            {frame.session_id && (
              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[9px] font-bold tracking-wider px-2 py-0.5 rounded-full uppercase leading-none flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Session
              </span>
            )}

            {/* DOM Target / Edit Status Badge */}
            {(!domTarget && !frame.session_id && activeBlueprintTool === 'dom-edit') || (!domTarget && editStatus === 'none') ? (
              <span className="bg-slate-500/10 text-slate-400 border border-slate-500/20 text-[9px] font-bold tracking-wider px-2 py-0.5 rounded-full uppercase leading-none">
                No target
              </span>
            ) : editStatus === 'draft' ? (
              <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] font-bold tracking-wider px-2 py-0.5 rounded-full uppercase leading-none">
                Draft edits
              </span>
            ) : (
              <span className="bg-teal-500/10 text-teal-400 border border-teal-500/20 text-[9px] font-bold tracking-wider px-2 py-0.5 rounded-full uppercase leading-none">
                Saved edits
              </span>
            )}

            {frame.marker_count !== undefined && frame.marker_count > 0 && (
              <span className="bg-white/5 text-white/60 border border-white/10 text-[9px] font-bold tracking-widest px-2 py-0.5 rounded-full uppercase leading-none">
                {frame.marker_count} Pins
              </span>
            )}
          </div>
        </div>

        {/* Content Body Area */}
        {frame.session_id ? (
          /* Live Embedded Proxied Session Iframe */
          <div className="flex-1 bg-black relative overflow-hidden flex flex-col min-h-0">
            <iframe
              src={`${API_BASE}/proxy/session/${frame.session_id}`}
              title={frame.title || 'Live Embedded Session'}
              className="w-full h-full border-0 bg-white"
              sandbox="allow-scripts allow-same-origin"
            />
          </div>
        ) : activeBlueprintTool === 'dom-edit' ? (
          /* Inline Prompt when DOM Edit Tool is active without session */
          <div className="flex-1 bg-[#151413] flex flex-col items-center justify-center p-4 text-center border border-dashed border-teal-500/30 rounded-xl m-2">
            <Globe className="w-7 h-7 text-teal-400/80 mb-2 animate-bounce" />
            <p className="text-xs font-bold text-teal-300">Connect a session to enable DOM editing on this frame.</p>
            <p className="text-[10px] text-white/40 mt-1 max-w-[200px]">
              Live element inspection requires an active project session.
            </p>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowSessionPicker(true)
              }}
              className="mt-3 px-3 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-black font-black text-xs uppercase tracking-wider transition-colors shadow-md shadow-teal-500/20"
            >
              Connect Session
            </button>
          </div>
        ) : (
          /* Default Static Summary Card */
          <div className="flex-1 bg-[#151413] relative overflow-hidden flex flex-col justify-between p-4 min-h-0">
            {frame.snapshot_url ? (
              <div className="mb-2 rounded-lg overflow-hidden border border-white/10 h-20 bg-black/40 relative">
                <img src={frame.snapshot_url} alt={frame.title} className="w-full h-full object-cover object-top" />
              </div>
            ) : null}
            <div className="space-y-2">
              <span className="text-[8px] font-black text-white/20 uppercase tracking-wider block">Top Indicators</span>
              
              {frame.top_markers && frame.top_markers.length > 0 ? (
                <div className="space-y-1.5 max-h-[85px] overflow-hidden">
                  {frame.top_markers.slice(0, 3).map((m: any, idx: number) => {
                    let badgeColor = 'text-gray-400 border-gray-500/20 bg-gray-500/5'
                    if (m.priority === 'critical') badgeColor = 'text-red-400 border-red-500/20 bg-red-500/5'
                    else if (m.priority === 'high') badgeColor = 'text-orange-400 border-orange-500/20 bg-orange-500/5'
                    else if (m.priority === 'medium') badgeColor = 'text-yellow-400 border-yellow-500/20 bg-yellow-500/5'
                    
                    return (
                      <div key={idx} className="flex items-center gap-2 text-[10px] leading-tight">
                        <span className={`px-1.5 py-0.2 rounded border text-[8px] font-bold uppercase tracking-wider ${badgeColor}`}>
                          {m.priority}
                        </span>
                        <span className="text-white/60 truncate font-semibold">
                          {m.title}
                        </span>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="py-2 text-[10px] text-white/20 italic font-medium">
                  No feedback pins yet
                </div>
              )}
            </div>

            {/* Bottom Area - Priority distribution bar & date */}
            <div className="space-y-2 pt-2 border-t border-white/[0.03] mt-auto">
              {totalMarkers > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[8px] font-mono text-white/30 uppercase tracking-wider">
                    <span>Priority Mix</span>
                    <span>{totalMarkers} Pins</span>
                  </div>
                  
                  {/* Stacked Proportional Distribution Bar */}
                  <div className="h-1.5 w-full rounded-full bg-white/5 flex overflow-hidden">
                    {dist.critical > 0 && (
                      <div 
                        className="h-full bg-red-500" 
                        style={{ width: getPct(dist.critical) }} 
                        title={`Critical: ${dist.critical}`} 
                      />
                    )}
                    {dist.high > 0 && (
                      <div 
                        className="h-full bg-orange-500" 
                        style={{ width: getPct(dist.high) }} 
                        title={`High: ${dist.high}`} 
                      />
                    )}
                    {dist.medium > 0 && (
                      <div 
                        className="h-full bg-yellow-500" 
                        style={{ width: getPct(dist.medium) }} 
                        title={`Medium: ${dist.medium}`} 
                      />
                    )}
                    {dist.low > 0 && (
                      <div 
                        className="h-full bg-teal-600" 
                        style={{ width: getPct(dist.low) }} 
                        title={`Low: ${dist.low}`} 
                      />
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between text-[9px] font-bold tracking-wider text-white/30 uppercase pt-0.5">
                <span className="flex items-center gap-1">
                  <Activity className="w-3 h-3 text-white/20" />
                  UAT Substrate
                </span>
                <span>{formattedDate}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Session Picker Modal */}
      <SessionPickerModal
        isOpen={showSessionPicker}
        onClose={() => setShowSessionPicker(false)}
        projectId={frame.project_id}
        frameId={frame.id}
        currentSessionId={frame.session_id}
      />
    </>
  )
})

export default CanvasFrame
