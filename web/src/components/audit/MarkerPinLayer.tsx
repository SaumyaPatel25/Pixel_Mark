'use client'

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

import { Marker } from '@/types/markers'
import { computeMarkerScreenPosition, buildDomMovePatch } from '@/lib/markerPlacement'
import { MarkerPin } from '@/components/markers/MarkerComponents'
import { ActorContext } from '@/lib/permissions'

interface MarkerPinLayerProps {
  markers: Marker[]
  orderedMarkerIds: string[]
  currentUrl: string
  scrollPos: { x: number; y: number }
  iframeNode: HTMLIFrameElement | null
  selectedMarkerId: string | null
  actor: ActorContext | null
  onSelectPin: (id: string) => void
  onDeletePin?: (id: string) => void
  onUpdateMarker?: (id: string, patch: Partial<Marker>) => Promise<void>
}

export function MarkerPinLayer({
  markers,
  currentUrl,
  scrollPos,
  iframeNode = null,
  selectedMarkerId,
  orderedMarkerIds,
  actor,
  onSelectPin,
  onDeletePin,
  onUpdateMarker
}: MarkerPinLayerProps) {
  const [hoveredPinId, setHoveredPinId] = useState<string | null>(null)
  const [dragState, setDragState] = useState<{ id: string; x: number; y: number } | null>(null)
  const [mounted, setMounted] = useState(false)
  const [diagnosticMode, setDiagnosticMode] = useState(false)
  const [iframeRect, setIframeRect] = useState<DOMRect | null>(null)

  useEffect(() => {
    setMounted(true)

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const isDiag = params.get('diagnostic') === 'true' || localStorage.getItem('pixelmark_diagnostic') === 'true'
      setDiagnosticMode(isDiag)
    }
  }, [])

  useEffect(() => {
    if (!iframeNode) return

    const updateRect = () => {
      setIframeRect(iframeNode.getBoundingClientRect())
    }

    updateRect()
    window.addEventListener('resize', updateRect)
    window.addEventListener('scroll', updateRect)

    let observer: MutationObserver | null = null
    if (typeof MutationObserver !== 'undefined') {
      observer = new MutationObserver(updateRect)
      observer.observe(document.body, { childList: true, subtree: true })
    }

    return () => {
      window.removeEventListener('resize', updateRect)
      window.removeEventListener('scroll', updateRect)
      if (observer) observer.disconnect()
    }
  }, [iframeNode])

  const loggedRef = React.useRef<Record<string, string>>({})

  // Handle Dragging
  useEffect(() => {
    if (!dragState || !iframeNode) return

    const handlePointerMove = (e: PointerEvent) => {
      setDragState(prev => prev ? { ...prev, x: e.clientX, y: e.clientY } : null)
    }

    const handlePointerUp = async (e: PointerEvent) => {
      const pinId = dragState.id
      const clientX = e.clientX
      const clientY = e.clientY
      setDragState(null)

      // Release pointer capture
      try {
        const target = e.target as HTMLElement
        if (target && typeof target.releasePointerCapture === 'function') {
          target.releasePointerCapture(e.pointerId)
        }
      } catch (_) {}

      if (!onUpdateMarker) return
      
      const marker = markers.find(m => m.id === pinId)
      if (!marker) return

      const iframeRect = iframeNode.getBoundingClientRect()
      const iframeClientX = clientX - iframeRect.left
      const iframeClientY = clientY - iframeRect.top

      const iframeDoc = iframeNode.contentDocument || null
      const patch = buildDomMovePatch(marker, iframeDoc, iframeClientX, iframeClientY, scrollPos)
      
      if (patch) {
        try {
          await onUpdateMarker(pinId, patch)
        } catch (err) {
          console.error('[MarkerPinLayer] failed to move marker:', err)
        }
      }
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [dragState, iframeNode, scrollPos, markers, onUpdateMarker])

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
  const pagePins = markers.filter(m => {
    const match = normalizeUrl(m.page_url || '') === normalizeUrl(currentUrl)
    return match && !m.is_deleted
  })
  console.log('[Markers] render count=' + pagePins.length)

  const pinOverlay = (
    <>
      {dragState && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 2147483645,
            cursor: 'grabbing',
            pointerEvents: 'auto',
            background: 'transparent'
          }}
        />
      )}
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
        {pagePins.map((marker, index) => {
          // Calculate position relative to the iframe document
          const iframeDoc = iframeNode?.contentDocument || null
          const pos = computeMarkerScreenPosition(marker, iframeDoc, scrollPos)
          
          // Log fallback coordinate quality
          if (pos.mode !== loggedRef.current[marker.id]) {
            loggedRef.current[marker.id] = pos.mode
            if (pos.mode === 'viewport_fallback' || pos.mode === 'fuzzy_dom') {
              console.warn(`[AuditSurface] Marker ID ${marker.id} resolved with fallback mode: ${pos.mode}. Selector: ${marker.target_selector}`);
            }
          }

          // Convert to parent window coordinates
          const rect = iframeRect || (iframeNode ? iframeNode.getBoundingClientRect() : null)
          let parentX = 0
          let parentY = 0
          
          if (rect) {
            // pos.x and pos.y are relative to iframe's page (client + scroll).
            // client = page - scroll
            const clientX = pos.x - scrollPos.x
            const clientY = pos.y - scrollPos.y
            parentX = clientX + rect.left
            parentY = clientY + rect.top
          } else {
            // Fallback if no iframe rect
            parentX = pos.x
            parentY = pos.y
          }

          // Clamp to parent window viewport bounds with 16px safety padding
          const safetyPadding = 16
          if (typeof window !== 'undefined') {
            parentX = Math.max(safetyPadding, Math.min(window.innerWidth - safetyPadding, parentX))
            parentY = Math.max(safetyPadding, Math.min(window.innerHeight - safetyPadding, parentY))
          }

          const isDragging = dragState?.id === marker.id
          const isActive = selectedMarkerId === marker.id
          const isDegraded = pos.mode === 'viewport_fallback' || pos.mode === 'fuzzy_dom' || pos.mode === 'unresolved'

          // If dragging, use cursor position instead of computed position
          if (isDragging && dragState) {
            parentX = dragState.x
            parentY = dragState.y
          }

          return (
            <div
              key={marker.id}
              style={{
                position: 'fixed',
                left: parentX,
                top: parentY,
                transform: 'translate(-50%, -50%)',
                pointerEvents: isDragging ? 'none' : 'auto',
                zIndex: isDragging ? 70 : (isActive ? 60 : 50),
                overflow: 'visible'
              }}
              data-pin-id={marker.id}
              onMouseEnter={() => setHoveredPinId(marker.id)}
              onMouseLeave={() => setHoveredPinId(null)}
            >
              <div className={cn(
                "transition-all duration-200", 
                isActive ? "scale-125" : "",
                isDegraded ? "opacity-75" : ""
              )}>
                <MarkerPin 
                  marker={marker}
                  actor={actor}
                  onClick={onSelectPin}
                  onDelete={onDeletePin}
                  onDragStart={(id, e) => {
                    try {
                      e.currentTarget.setPointerCapture(e.pointerId)
                    } catch (_) {}
                    setDragState({ id, x: e.clientX, y: e.clientY })
                    setHoveredPinId(null) // hide tooltip while dragging
                  }}
                />
              </div>
              
              {/* Degraded mode indicator */}
              {isDegraded && (
                 <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[8px] bg-black/60 text-orange-400 px-1 py-0.5 rounded pointer-events-none whitespace-nowrap">
                   {pos.mode === 'fuzzy_dom' ? 'fuzzy match' : 'fallback pos'}
                 </div>
              )}
              
              {/* Hover Tooltip Popover */}
              {hoveredPinId === marker.id && (
                <div
                  className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3.5 p-3 bg-[#0d0d14]/95 border border-white/10 rounded-2xl shadow-2xl flex flex-col gap-2 pointer-events-none z-[2147483647] w-60 text-white animate-fade-in"
                >
                  {marker.screenshot_url && (
                    <div className="relative rounded-lg overflow-hidden border border-white/10 h-24 bg-black/40">
                      <img
                        src={marker.screenshot_url}
                        alt="Pin screenshot thumbnail"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-[10px] font-bold truncate text-white/90">
                      {marker.title || 'Untitled Marker'}
                    </span>
                    <span className="text-[8px] font-mono text-white/40 truncate">
                      {marker.target_selector || 'No selector'}
                    </span>
                    {marker.dom_text_excerpt && (
                      <span className="text-[9px] text-white/60 italic truncate mt-1 pl-1 border-l border-purple-500/50">
                        &ldquo;{marker.dom_text_excerpt}&rdquo;
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </>
  )

  return createPortal(pinOverlay, document.body)
}
