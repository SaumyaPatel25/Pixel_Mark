'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

import { Marker, ResolvedMarkerPosition } from '@/types/markers'
import { resolveMarkerRenderPosition, buildDomMovePatch, toOverlayPosition, OverlayMetrics } from '@/lib/markerPlacement'
import { MarkerPin } from '@/components/markers/MarkerComponents'
import { canCurrentActorMutateMarker, ActorContext } from '@/lib/permissions'

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

interface ActiveMarkerDragState {
  markerId: string
  pointerId: number
  startClientX: number
  startClientY: number
  startResolvedLeft: number
  startResolvedTop: number
  currentLeft: number
  currentTop: number
  startedAt: number
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
  const [dragState, setDragState] = useState<ActiveMarkerDragState | null>(null)
  const [mounted, setMounted] = useState(false)
  const [diagnosticMode, setDiagnosticMode] = useState(false)
  const [iframeRect, setIframeRect] = useState<DOMRect | null>(null)
  const [iframeLoadedCount, setIframeLoadedCount] = useState(0)

  useEffect(() => {
    setMounted(true)

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const isDiag = params.get('diagnostic') === 'true' || localStorage.getItem('stage_diagnostic') === 'true'
      setDiagnosticMode(isDiag)
    }
  }, [])

  useEffect(() => {
    if (!iframeNode) return

    const handleLoad = () => {
      console.log("[MarkerPinLayer] iframe load event fired")
      setIframeLoadedCount(c => c + 1)
    }

    iframeNode.addEventListener('load', handleLoad)
    setIframeLoadedCount(c => c + 1)

    return () => {
      iframeNode.removeEventListener('load', handleLoad)
    }
  }, [iframeNode])

  useEffect(() => {
    if (!iframeNode) return

    let rAFId: number | null = null
    const updateRect = () => {
      if (rAFId) return
      rAFId = requestAnimationFrame(() => {
        setIframeRect(iframeNode.getBoundingClientRect())
        setIframeLoadedCount(c => c + 1)
        rAFId = null
      })
    }

    // Run first measurement synchronously to avoid initial render delay
    setIframeRect(iframeNode.getBoundingClientRect())
    setIframeLoadedCount(c => c + 1)

    window.addEventListener('resize', updateRect, { passive: true })
    window.addEventListener('scroll', updateRect, { passive: true })

    let observer: MutationObserver | null = null
    if (typeof MutationObserver !== 'undefined') {
      observer = new MutationObserver(updateRect)
      observer.observe(document.body, { childList: true, subtree: true })
    }

    return () => {
      window.removeEventListener('resize', updateRect)
      window.removeEventListener('scroll', updateRect)
      if (observer) observer.disconnect()
      if (rAFId) cancelAnimationFrame(rAFId)
    }
  }, [iframeNode])

  const loggedRef = useRef<Record<string, string>>({})

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
  const pagePins = useMemo(() => {
    const normCurrentUrl = normalizeUrl(currentUrl)
    return markers.filter(m => {
      const match = normalizeUrl(m.page_url || '') === normCurrentUrl
      return match && !m.is_deleted
    })
  }, [markers, currentUrl])

  // Memoize positions of all static markers using the canonical anchor engine
  // This avoids calling DOM querySelector / evaluate on every pointermove.
  const staticPositions = useMemo(() => {
    let iframeDoc: Document | null = null
    let iframeWin: Window | null = null
    try {
      iframeDoc = iframeNode?.contentDocument || null
      iframeWin = iframeNode?.contentWindow || null
    } catch (_) {}

    const positions: Record<string, ResolvedMarkerPosition | null> = {}
    for (const marker of pagePins) {
      positions[marker.id] = resolveMarkerRenderPosition(marker, iframeWin, iframeDoc)
    }
    return positions
  }, [pagePins, iframeNode, scrollPos, iframeLoadedCount])

  console.log('[Markers] render count=' + pagePins.length)

  // Handle Dragging via Pointer Events
  useEffect(() => {
    if (!dragState || !iframeNode) return

    let rAFId: number | null = null

    const handlePointerMove = (e: PointerEvent) => {
      if (e.pointerId !== dragState.pointerId) return
      
      if (rAFId) cancelAnimationFrame(rAFId)
      
      rAFId = requestAnimationFrame(() => {
        const rect = iframeNode.getBoundingClientRect()
        const scaleX = rect.width / (iframeNode.offsetWidth || iframeNode.clientWidth || 1)
        const scaleY = rect.height / (iframeNode.offsetHeight || iframeNode.clientHeight || 1)

        const deltaX = (e.clientX - dragState.startClientX) / scaleX
        const deltaY = (e.clientY - dragState.startClientY) / scaleY

        console.debug(`STAGE marker drag preview [${dragState.markerId}] deltaX=${deltaX.toFixed(2)} deltaY=${deltaY.toFixed(2)}`)
        
        setDragState(prev => {
          if (!prev) return null
          return {
            ...prev,
            currentLeft: prev.startResolvedLeft + deltaX,
            currentTop: prev.startResolvedTop + deltaY
          }
        })
      })
    }

    const handlePointerUp = async (e: PointerEvent) => {
      if (e.pointerId !== dragState.pointerId) return
      
      const pinId = dragState.markerId
      const finalClientX = e.clientX
      const finalClientY = e.clientY
      
      console.log(`STAGE marker drag commit [${pinId}]`)
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

      const rect = iframeNode.getBoundingClientRect()
      const scaleX = rect.width / (iframeNode.offsetWidth || iframeNode.clientWidth || 1)
      const scaleY = rect.height / (iframeNode.offsetHeight || iframeNode.clientHeight || 1)

      const iframeClientX = (finalClientX - rect.left) / scaleX
      const iframeClientY = (finalClientY - rect.top) / scaleY

      const iframeDoc = iframeNode.contentDocument || null
      const patch = buildDomMovePatch(marker, iframeDoc, iframeClientX, iframeClientY, scrollPos)
      
      if (patch) {
        try {
          await onUpdateMarker(pinId, patch)
        } catch (err) {
          console.error(`STAGE marker drag rollback [${pinId}] due to error:`, err)
        }
      }
    }

    const handlePointerCancel = (e: PointerEvent) => {
      if (e.pointerId !== dragState.pointerId) return
      console.log(`STAGE marker drag rollback [${dragState.markerId}] due to cancel`)
      setDragState(null)
      try {
        const target = e.target as HTMLElement
        if (target && typeof target.releasePointerCapture === 'function') {
          target.releasePointerCapture(e.pointerId)
        }
      } catch (_) {}
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('pointercancel', handlePointerCancel)
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointercancel', handlePointerCancel)
      if (rAFId) cancelAnimationFrame(rAFId)
    }
  }, [dragState, iframeNode, scrollPos, markers, onUpdateMarker])

  // Keydown listener for Escape key to cancel drag
  useEffect(() => {
    if (!dragState) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        console.log(`STAGE marker drag rollback [${dragState.markerId}] due to Escape key`)
        setDragState(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [dragState])

  if (!mounted || typeof document === 'undefined') return null

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
        id="stage-pin-layer"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 2147483646,
          pointerEvents: 'none',
          overflow: 'visible',
          outline: diagnosticMode ? '3px dashed #ef4444' : 'none'
        }}
      >
        {pagePins.map((marker) => {
          const isDragging = dragState?.markerId === marker.id
          
          let left = 0
          let top = 0
          let isDegraded = false
          let source: any = 'dom'
          
          if (isDragging && dragState) {
            left = dragState.currentLeft
            top = dragState.currentTop
            isDegraded = false
            source = 'dom'
          } else {
            const pos = staticPositions[marker.id]
            if (!pos) {
              console.warn(`[STAGE Debug] Skipping render for marker ${marker.id} - no resolved static position`)
              return null
            }
            left = pos.left
            top = pos.top
            isDegraded = pos.degraded
            source = pos.source
          }

          // Convert to parent window coordinates, accounting for iframe layout and scaling
          const rect = iframeRect || (iframeNode ? iframeNode.getBoundingClientRect() : null)
          let parentX = 0
          let parentY = 0
          let scale = 1
          let offsetLeft = 0
          let offsetTop = 0
          
          if (rect) {
            const scaleX = rect.width / (iframeNode?.offsetWidth || iframeNode?.clientWidth || 1)
            const scaleY = rect.height / (iframeNode?.offsetHeight || iframeNode?.clientHeight || 1)
            scale = scaleX
            offsetLeft = rect.left - scrollPos.x * scaleX
            offsetTop = rect.top - scrollPos.y * scaleY

            // Log overlay metrics
            console.log(`STAGE overlay metrics [${scale}, ${offsetLeft}, ${offsetTop}]`)

            const metrics: OverlayMetrics = { scale, offsetLeft, offsetTop }
            const overlayPos = toOverlayPosition({ pageLeft: left, pageTop: top }, metrics)
            parentX = overlayPos.left
            parentY = overlayPos.top
          } else {
            parentX = left
            parentY = top
          }

          // Add temporary debug logs for each marker
          console.log(`[STAGE Debug Pin]`, {
            id: marker.id,
            rendererType: marker.renderer_type || marker.rendererType || 'dom',
            source,
            rawX: marker.page_x ?? marker.pageX,
            rawY: marker.page_y ?? marker.pageY,
            viewportX: marker.viewport_x ?? marker.viewportX,
            viewportY: marker.viewport_y ?? marker.viewportY,
            boundingBox: marker.boundingBoxAtCapture,
            normX: marker.canvas_x_ratio ?? marker.canvasContext?.normX,
            normY: marker.canvas_y_ratio ?? marker.canvasContext?.normY,
            finalLeft: left,
            finalTop: top,
            computedParentX: parentX,
            computedParentY: parentY,
            scale,
            offsetLeft,
            offsetTop,
            isFallbackUsed: isDegraded,
          })

          // Clamp to parent window viewport bounds with 16px safety padding
          const safetyPadding = 16
          if (!Number.isFinite(parentX) || !Number.isFinite(parentY)) {
            console.warn("STAGE pin position invalid, falling back to bbox center", marker.id)
            if (marker.boundingBoxAtCapture) {
              const { left: bboxLeft, top: bboxTop, width: bboxWidth, height: bboxHeight } = marker.boundingBoxAtCapture
              const centerX = bboxLeft + bboxWidth / 2
              const centerY = bboxTop + bboxHeight / 2
              if (rect) {
                const scaleX = rect.width / (iframeNode?.offsetWidth || iframeNode?.clientWidth || 1)
                const scaleY = rect.height / (iframeNode?.offsetHeight || iframeNode?.clientHeight || 1)
                parentX = (centerX - scrollPos.x) * scaleX + rect.left
                parentY = (centerY - scrollPos.y) * scaleY + rect.top
              } else {
                parentX = centerX
                parentY = centerY
              }
            } else {
              // If completely invalid, skip rendering this pin rather than rendering at 0,0
              console.warn(`STAGE pin skipped invalid render position [${marker.id}]`)
              return null
            }
          }

          if (typeof window !== 'undefined') {
            parentX = Math.max(safetyPadding, Math.min(window.innerWidth - safetyPadding, parentX))
            parentY = Math.max(safetyPadding, Math.min(window.innerHeight - safetyPadding, parentY))
          }

          if (diagnosticMode) {
            console.log(`[STAGE Render Test] Render pin id=${marker.id}:`, {
              storedPageX: left,
              storedPageY: top,
              computedParentX: parentX,
              computedParentY: parentY,
            })
          }

          const isActive = selectedMarkerId === marker.id

          return (
            <div
              key={marker.id}
              style={{
                position: 'fixed',
                left: 0,
                top: 0,
                transform: `translate3d(${parentX}px, ${parentY}px, 0) translate(-50%, -50%)`,
                pointerEvents: isDragging ? 'none' : 'auto',
                zIndex: isDragging ? 70 : (isActive ? 60 : 50),
                overflow: 'visible'
              }}
              data-pin-id={marker.id}
              onMouseEnter={() => setHoveredPinId(marker.id)}
              onMouseLeave={() => setHoveredPinId(null)}
            >
              <div className={cn(
                "transition-all duration-200 rounded-full", 
                isActive ? "scale-125" : "",
                isDegraded ? "opacity-90 ring-2 ring-dashed ring-amber-500 ring-offset-2" : "",
                isDragging ? "select-none" : ""
              )}>
                <MarkerPin 
                  marker={marker}
                  actor={actor}
                  onClick={onSelectPin}
                  onDelete={onDeletePin}
                  dragging={isDragging}
                  onDragStart={(id, e) => {
                    const marker = markers.find(m => m.id === id)
                    if (!marker || !canCurrentActorMutateMarker(actor, marker)) {
                      console.warn('[STAGE Drag] Drag rejected due to permissions context')
                      return
                    }
                    console.log(`STAGE marker drag start [${id}]`)
                    try {
                      e.currentTarget.setPointerCapture(e.pointerId)
                    } catch (_) {}
                    
                    const pos = staticPositions[id] || { left: marker.page_x || 0, top: marker.page_y || 0 }
                    
                    setDragState({
                      markerId: id,
                      pointerId: e.pointerId,
                      startClientX: e.clientX,
                      startClientY: e.clientY,
                      startResolvedLeft: pos.left,
                      startResolvedTop: pos.top,
                      currentLeft: pos.left,
                      currentTop: pos.top,
                      startedAt: Date.now()
                    })
                    setHoveredPinId(null) // hide tooltip while dragging
                  }}
                />
              </div>
              
              {/* Degraded mode indicator */}
              {isDegraded && !isDragging && (
                 <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[8px] bg-black/60 text-orange-400 px-1 py-0.5 rounded pointer-events-none whitespace-nowrap">
                   {source === 'fuzzy_dom' ? 'fuzzy match' : 'fallback pos'}
                 </div>
              )}
              
              {/* Hover Tooltip Popover */}
              {hoveredPinId === marker.id && !isDragging && (
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
