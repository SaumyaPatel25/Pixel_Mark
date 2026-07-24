'use client'

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

import { Marker } from '@/types/markers'
import { computePinScreenPosition, buildDomMovePatch } from '@/lib/markerPlacement'
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
  const [, setReflowTick] = useState(0)

  const forceReflow = useCallback(() => {
    setReflowTick(c => c + 1)
  }, [])

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

    let iframeWin: Window | null = null
    let iframeDoc: Document | null = null
    try {
      iframeWin = iframeNode.contentWindow
      iframeDoc = iframeNode.contentDocument
    } catch (_) {}

    let rAFId: number | null = null
    const handleUpdate = () => {
      if (rAFId) return
      rAFId = requestAnimationFrame(() => {
        rAFId = null
        if (iframeNode) {
          setIframeRect(iframeNode.getBoundingClientRect())
        }
        forceReflow()
      })
    }

    setIframeRect(iframeNode.getBoundingClientRect())
    forceReflow()

    window.addEventListener('resize', handleUpdate, { passive: true })
    window.addEventListener('scroll', handleUpdate, { passive: true })

    try {
      if (iframeWin) {
        iframeWin.addEventListener('scroll', handleUpdate, { passive: true })
        iframeWin.addEventListener('resize', handleUpdate, { passive: true })
      }
    } catch (_) {}

    const handleLoad = () => {
      console.log('[MarkerPinLayer] iframe load event fired')
      handleUpdate()
      const timers = [100, 300, 600, 1200].map(delay =>
        setTimeout(handleUpdate, delay)
      )
      return () => timers.forEach(clearTimeout)
    }

    iframeNode.addEventListener('load', handleLoad)

    let iframeObserver: MutationObserver | null = null
    try {
      if (iframeDoc && typeof MutationObserver !== 'undefined') {
        iframeObserver = new MutationObserver(handleUpdate)
        iframeObserver.observe(iframeDoc.body || iframeDoc.documentElement, {
          childList: true,
          subtree: true,
          attributes: true
        })
      }
    } catch (_) {}

    let parentObserver: MutationObserver | null = null
    if (typeof MutationObserver !== 'undefined') {
      parentObserver = new MutationObserver(handleUpdate)
      parentObserver.observe(document.body, { childList: true, subtree: true })
    }

    return () => {
      window.removeEventListener('resize', handleUpdate)
      window.removeEventListener('scroll', handleUpdate)
      try {
        if (iframeWin) {
          iframeWin.removeEventListener('scroll', handleUpdate)
          iframeWin.removeEventListener('resize', handleUpdate)
        }
      } catch (_) {}
      iframeNode.removeEventListener('load', handleLoad)
      if (iframeObserver) iframeObserver.disconnect()
      if (parentObserver) parentObserver.disconnect()
      if (rAFId) cancelAnimationFrame(rAFId)
    }
  }, [iframeNode, forceReflow])

  const normalizeUrl = (url: string) => {
    if (!url) return ''
    try {
      const parsed = new URL(url.startsWith('http') ? url : 'http://localhost' + url)
      return parsed.origin + parsed.pathname.replace(/\/+$/, '').toLowerCase()
    } catch (e) {
      return url.split('?')[0].split('#')[0].replace(/\/+$/, '').toLowerCase()
    }
  }

  const pagePins = useMemo(() => {
    const normCurrentUrl = normalizeUrl(currentUrl)
    return markers.filter(m => {
      const match = normalizeUrl(m.page_url || '') === normCurrentUrl
      return match && !m.is_deleted
    })
  }, [markers, currentUrl])

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

  useEffect(() => {
    if (!dragState) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDragState(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [dragState])

  if (!mounted || typeof document === 'undefined') return null

  const currentIframeRect = iframeRect || (iframeNode ? iframeNode.getBoundingClientRect() : null)

  let iframeWin: Window | null = null
  let iframeDoc: Document | null = null
  try {
    iframeWin = iframeNode?.contentWindow || null
    iframeDoc = iframeNode?.contentDocument || null
  } catch (_) {}

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
          
          let parentX = 0
          let parentY = 0
          let isDegraded = false
          let source: any = 'dom'

          if (isDragging && dragState) {
            const rect = currentIframeRect
            if (rect) {
              const scaleX = rect.width / (iframeNode?.offsetWidth || iframeNode?.clientWidth || 1)
              const scaleY = rect.height / (iframeNode?.offsetHeight || iframeNode?.clientHeight || 1)
              parentX = (dragState.currentLeft - scrollPos.x) * scaleX + rect.left
              parentY = (dragState.currentTop - scrollPos.y) * scaleY + rect.top
            } else {
              parentX = dragState.currentLeft
              parentY = dragState.currentTop
            }
            isDegraded = false
            source = 'dom'
          } else {
            const posResult = computePinScreenPosition(
              marker,
              scrollPos,
              currentIframeRect,
              iframeWin,
              iframeDoc
            )

            if (!posResult) {
              return null
            }

            parentX = posResult.screenX
            parentY = posResult.screenY
            isDegraded = posResult.isDegraded
            source = posResult.source
          }

          if (!Number.isFinite(parentX) || !Number.isFinite(parentY)) {
            return null
          }

          if (typeof window !== 'undefined' && !isDragging) {
            const isOffscreen = parentX < -50 || parentY < -50 || parentX > window.innerWidth + 50 || parentY > window.innerHeight + 50
            if (isOffscreen) {
              return null
            }
            parentX = Math.max(16, Math.min(window.innerWidth - 16, parentX))
            parentY = Math.max(16, Math.min(window.innerHeight - 16, parentY))
          }

          if (diagnosticMode) {
            console.log(`[STAGE Render Test] Render pin id=${marker.id}:`, {
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
                    const targetMarker = markers.find(m => m.id === id)
                    if (!targetMarker || !canCurrentActorMutateMarker(actor, targetMarker)) {
                      console.warn('[STAGE Drag] Drag rejected due to permissions context')
                      return
                    }
                    console.log(`STAGE marker drag start [${id}]`)
                    try {
                      e.currentTarget.setPointerCapture(e.pointerId)
                    } catch (_) {}
                    
                    const posRes = computePinScreenPosition(targetMarker, scrollPos, currentIframeRect, iframeWin, iframeDoc)
                    const initialLeft = posRes ? posRes.pageLeft : (targetMarker.page_x || 0)
                    const initialTop = posRes ? posRes.pageTop : (targetMarker.page_y || 0)
                    
                    setDragState({
                      markerId: id,
                      pointerId: e.pointerId,
                      startClientX: e.clientX,
                      startClientY: e.clientY,
                      startResolvedLeft: initialLeft,
                      startResolvedTop: initialTop,
                      currentLeft: initialLeft,
                      currentTop: initialTop,
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
