'use client'

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

interface MarkerPinLayerProps {
  captures: any[]
  currentUrl: string
  scrollPos: { x: number; y: number }
  resolvedPositions: Record<string, { clientX: number; clientY: number; source: string }>
  iframeNode: HTMLIFrameElement | null
  selectedCaptureId: string | null
  captureOrder: string[]
  onSelectPin: (id: string) => void
}

export function MarkerPinLayer({
  captures,
  currentUrl,
  scrollPos,
  resolvedPositions = {},
  iframeNode = null,
  selectedCaptureId,
  captureOrder,
  onSelectPin
}: MarkerPinLayerProps) {
  const [hoveredPinId, setHoveredPinId] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const [diagnosticMode, setDiagnosticMode] = useState(false)

  useEffect(() => {
    setMounted(true)

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const isDiag = params.get('diagnostic') === 'true' || localStorage.getItem('pixelmark_diagnostic') === 'true'
      setDiagnosticMode(isDiag)
    }
  }, [])

  if (!mounted || typeof document === 'undefined') return null

  const normalizeUrl = (url: string) => {
    if (!url) return ''
    try {
      const parsed = new URL(url.startsWith('http') ? url : 'http://localhost' + url)
      return parsed.origin + parsed.pathname.replace(/\/+$/, '').toLowerCase()
    } catch (e) {
      return url.split('?')[0].split('#')[0].replace(/\/+$/, '').toLowerCase()
    }
  }

  // Filter out deleted/invisible/out-of-page pins
  const pagePins = captures.filter(c => {
    const match = normalizeUrl(c.pageUrl) === normalizeUrl(currentUrl)
    return match && !c.deletedAt && c.visible !== false
  })
  console.log('[Markers] render count=' + pagePins.length)

  const pinOverlay = (
    <div
      id="pixelmark-pin-layer"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2147483646,
        pointerEvents: 'none',
        overflow: 'visible',
        outline: diagnosticMode ? '3px dashed #ef4444' : 'none'
      }}
    >
      {pagePins.map((capture, index) => {
        const getCaptureScroll = (c: any) => {
          const scrollX = c.viewport?.scrollX ?? c.viewport?.scroll_position?.x ?? c.scroll_position?.x ?? c.scrollX ?? 0
          const scrollY = c.viewport?.scrollY ?? c.viewport?.scroll_position?.y ?? c.scroll_position?.y ?? c.scrollY ?? 0
          return { x: scrollX, y: scrollY }
        }

        const resolved = resolvedPositions?.[capture.id]
        let parentX = 0
        let parentY = 0

        if (resolved && iframeNode) {
          const iframeRect = iframeNode.getBoundingClientRect()
          parentX = resolved.clientX + iframeRect.left
          parentY = resolved.clientY + iframeRect.top
        } else if (iframeNode && typeof capture.coordinates?.clientX === 'number' && typeof capture.coordinates?.clientY === 'number') {
          const iframeRect = iframeNode.getBoundingClientRect()
          parentX = capture.coordinates.clientX + iframeRect.left
          parentY = capture.coordinates.clientY + iframeRect.top
        } else {
          parentX = capture.displayX ?? capture.x ?? 0
          parentY = capture.displayY ?? capture.y ?? 0
        }

        // Clamp to parent window viewport bounds with 16px safety padding
        const safetyPadding = 16
        if (typeof window !== 'undefined') {
          parentX = Math.max(safetyPadding, Math.min(window.innerWidth - safetyPadding, parentX))
          parentY = Math.max(safetyPadding, Math.min(window.innerHeight - safetyPadding, parentY))
        }

        const isActive = selectedCaptureId === capture.id
        const isSubmitted = capture.status === 'submitted'
        const isFailed = capture.status === 'failed'
        const markerNumber = (captureOrder?.indexOf(capture.id) ?? index) + 1

        return (
          <div
            key={capture.id}
            style={{
              position: 'fixed',
              left: parentX,
              top: parentY,
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none',
              zIndex: isActive ? 60 : 50,
              overflow: 'visible'
            }}
            data-pin-id={capture.id}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                console.log(`[PixelMark Pins] clicked id=${capture.id}`)
                
                // Dispatch event and message (Part 4 / 5)
                const event = new CustomEvent('PIXELMARKOPENFEEDBACKDRAWER', { detail: capture })
                window.dispatchEvent(event)
                window.postMessage({ type: 'PIXELMARKOPENFEEDBACKDRAWER', payload: capture }, '*')
                
                onSelectPin(capture.id)
                console.log(`[Markers] opened id=${capture.id}`)
              }}
              onMouseEnter={() => setHoveredPinId(capture.id)}
              onMouseLeave={() => setHoveredPinId(null)}
              style={{ pointerEvents: 'auto', cursor: 'pointer' }}
              className={cn(
                "w-8 h-8 rounded-full border-2 border-white flex items-center justify-center transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-1 select-none shadow-[0_8px_24px_rgba(0,0,0,0.35)]",
                isActive 
                  ? "ring-2 ring-white scale-110 shadow-[0_0_0_3px_rgba(124,58,237,0.5),_0_8px_24px_rgba(0,0,0,0.45)] bg-purple-500" 
                  : "hover:scale-125 shadow-[0_0_0_3px_rgba(124,58,237,0.35)]",
                isFailed
                  ? "bg-rose-500 border-rose-300 shadow-rose-950/40"
                  : isSubmitted
                    ? "bg-teal-500 border-teal-300 shadow-teal-950/40"
                    : "bg-purple-600 border-purple-300 shadow-purple-950/40"
              )}
              aria-label={`Open feedback pin ${markerNumber} ${isSubmitted ? '(submitted)' : isFailed ? '(failed)' : '(draft)'}`}
            >
              <span className="text-[11px] font-black text-white">{markerNumber}</span>
            </button>

            {/* Hover Tooltip Popover */}
            {hoveredPinId === capture.id && (
              <div
                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3.5 p-3 bg-[#0d0d14]/95 border border-white/10 rounded-2xl shadow-2xl flex flex-col gap-2 pointer-events-none z-[2147483647] w-60 text-white animate-fade-in"
                style={{ pointerEvents: 'none' }}
              >
                {capture.screenshotdataurl && capture.screenshotdataurl !== 'pending' && (
                  <div className="relative rounded-lg overflow-hidden border border-white/10 h-24 bg-black/40">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={capture.screenshotdataurl}
                      alt="Pin screenshot thumbnail"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-[10px] font-bold truncate text-white/90">
                    {capture.target?.tagName || 'Element'} {capture.target?.elementId ? `#${capture.target.elementId}` : ''}
                  </span>
                  <span className="text-[8px] font-mono text-white/40 truncate">
                    {capture.target?.selector}
                  </span>
                  {capture.target?.text && (
                    <span className="text-[9px] text-white/60 italic truncate mt-1 pl-1 border-l border-purple-500/50">
                      &ldquo;{capture.target.text}&rdquo;
                    </span>
                  )}
                  <div className="flex items-center gap-1.5 mt-2">
                    <span className={cn(
                      "px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-wider",
                      capture.issueType === 'layout' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                      capture.issueType === 'copy' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                      capture.issueType === 'interaction' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                      capture.issueType === 'navigation' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                      capture.issueType === 'rendering' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                      'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                    )}>
                      {capture.issueType || 'Other'}
                    </span>
                    <span className="text-[7px] font-bold text-white/30 uppercase font-mono">
                      #{markerNumber}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )

  return createPortal(pinOverlay, document.body)
}
