'use client'

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

import { Marker } from '@/types/markers'
import { computePinScreenPosition, buildDomMovePatch } from '@/lib/markerPlacement'
import { MarkerPin } from '@/components/markers/MarkerComponents'
import { canCurrentActorMutateMarker, ActorContext } from '@/lib/permissions'
import { ExternalLink, Sparkles } from 'lucide-react'

interface MarkerPinLayerProps {
  markers: Marker[]
  orderedMarkerIds: string[]
  currentUrl: string
  scrollPos: { x: number; y: number }
  iframeNode: HTMLIFrameElement | null
  selectedMarkerId: string | null
  resolvedPositions?: Record<string, { clientX: number; clientY: number; pageX?: number; pageY?: number; source: string }>
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
  resolvedPositions,
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
    const targetIframe = iframeNode || (typeof document !== 'undefined' ? (document.querySelector('#audit-iframe-container iframe') as HTMLIFrameElement | null) : null)
    if (!targetIframe) return

    let iframeWin: Window | null = null
    let iframeDoc: Document | null = null
    try {
      iframeWin = targetIframe.contentWindow
      iframeDoc = targetIframe.contentDocument
    } catch (_) {}

    let rAFId: number | null = null
    let debouncedTimer: NodeJS.Timeout | null = null

    const handleUpdate = () => {
      if (rAFId) return
      rAFId = requestAnimationFrame(() => {
        rAFId = null
        if (targetIframe) {
          const rect = targetIframe.getBoundingClientRect()
          setIframeRect(rect)
        }
        forceReflow()
      })
    }

    const scheduleStabilizationPasses = () => {
      handleUpdate()
      const delays = [50, 150, 300, 500, 800, 1200]
      const timers = delays.map(delay => setTimeout(handleUpdate, delay))
      return () => timers.forEach(clearTimeout)
    }

    // Initial measurement & stabilization passes
    handleUpdate()
    const cancelStabilization = scheduleStabilizationPasses()

    // Window & iframe scroll/resize
    window.addEventListener('resize', handleUpdate, { passive: true })
    window.addEventListener('scroll', handleUpdate, { passive: true, capture: true })

    try {
      if (iframeWin) {
        iframeWin.addEventListener('scroll', handleUpdate, { passive: true, capture: true })
        iframeWin.addEventListener('resize', handleUpdate, { passive: true })
      }
      if (iframeDoc) {
        iframeDoc.addEventListener('scroll', handleUpdate, { passive: true, capture: true })
      }
    } catch (_) {}

    // Load event listener
    const handleLoad = () => {
      console.log('[MarkerPinLayer] iframe load event fired')
      scheduleStabilizationPasses()
    }

    targetIframe.addEventListener('load', handleLoad)

    // Check if iframe is already loaded on mount (session restart / review session load)
    try {
      if (iframeDoc && (iframeDoc.readyState === 'complete' || iframeDoc.readyState === 'interactive')) {
        console.log('[MarkerPinLayer] iframe already loaded on mount, scheduling stabilization')
        scheduleStabilizationPasses()
      }
    } catch (_) {}

    // ─── ResizeObserver for Container & Iframe ──────────────────────────────
    let resizeObserver: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        handleUpdate()
        if (debouncedTimer) clearTimeout(debouncedTimer)
        debouncedTimer = setTimeout(handleUpdate, 150)
      })

      resizeObserver.observe(targetIframe)
      if (targetIframe.parentElement) {
        resizeObserver.observe(targetIframe.parentElement)
      }
      const auditContainer = targetIframe.closest('#audit-iframe-container') || targetIframe.closest('.flex-1')
      if (auditContainer && auditContainer !== targetIframe.parentElement) {
        resizeObserver.observe(auditContainer)
      }
      if (document.body) {
        resizeObserver.observe(document.body)
      }
    }

    // ─── CSS Transition & Animation Observers ────────────────────────────────
    let transitionRaf: number | null = null
    const handleTransition = () => {
      handleUpdate()
      const startTime = performance.now()
      const animateTransition = () => {
        handleUpdate()
        if (performance.now() - startTime < 400) {
          transitionRaf = requestAnimationFrame(animateTransition)
        }
      }
      if (transitionRaf) cancelAnimationFrame(transitionRaf)
      transitionRaf = requestAnimationFrame(animateTransition)
    }

    const containerEl = iframeNode.parentElement || document.body
    containerEl.addEventListener('transitionrun', handleTransition, { passive: true })
    containerEl.addEventListener('transitionstart', handleTransition, { passive: true })
    containerEl.addEventListener('transitionend', handleTransition, { passive: true })
    containerEl.addEventListener('animationend', handleTransition, { passive: true })

    // ─── Mutation Observers ──────────────────────────────────────────────────
    let mutationRafId: number | null = null
    const handleMutationUpdate = () => {
      if (mutationRafId) return
      mutationRafId = requestAnimationFrame(() => {
        mutationRafId = null
        handleUpdate()
      })
    }

    let iframeObserver: MutationObserver | null = null
    try {
      if (iframeDoc && typeof MutationObserver !== 'undefined') {
        iframeObserver = new MutationObserver(handleMutationUpdate)
        iframeObserver.observe(iframeDoc.body || iframeDoc.documentElement, {
          childList: true,
          subtree: true,
          attributes: true
        })
      }
    } catch (_) {}

    return () => {
      cancelStabilization()
      if (debouncedTimer) clearTimeout(debouncedTimer)
      window.removeEventListener('resize', handleUpdate)
      window.removeEventListener('scroll', handleUpdate, true as any)
      try {
        if (iframeWin) {
          iframeWin.removeEventListener('scroll', handleUpdate, true as any)
          iframeWin.removeEventListener('resize', handleUpdate)
        }
        if (iframeDoc) {
          iframeDoc.removeEventListener('scroll', handleUpdate, true as any)
        }
      } catch (_) {}
      iframeNode.removeEventListener('load', handleLoad)
      containerEl.removeEventListener('transitionrun', handleTransition)
      containerEl.removeEventListener('transitionstart', handleTransition)
      containerEl.removeEventListener('transitionend', handleTransition)
      containerEl.removeEventListener('animationend', handleTransition)
      if (resizeObserver) resizeObserver.disconnect()
      if (iframeObserver) iframeObserver.disconnect()
      if (rAFId) cancelAnimationFrame(rAFId)
      if (transitionRaf) cancelAnimationFrame(transitionRaf)
      if (mutationRafId) cancelAnimationFrame(mutationRafId)
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
      if (m.is_deleted) return false
      // Skip markers with no anchor data at all — they would render at (0,0) top-left corner
      const hasSelector = !!((m as any).target_selector || (m as any).elementSelector)
      const hasXpath = !!((m as any).target_xpath || (m as any).xpath)
      const hasBbox = !!((m as any).element_rect_json || (m as any).boundingBoxAtCapture)
      const hasPageXY = typeof (m as any).page_x === 'number' && typeof (m as any).page_y === 'number' && ((m as any).page_x !== 0 || (m as any).page_y !== 0)
      const hasViewportXY = typeof (m as any).viewport_x === 'number' && typeof (m as any).viewport_y === 'number' && ((m as any).viewport_x !== 0 || (m as any).viewport_y !== 0)
      const hasCanvasCtx = !!((m as any).canvas_x_ratio != null || (m as any).canvas_y_ratio != null)
      if (!hasSelector && !hasXpath && !hasBbox && !hasPageXY && !hasViewportXY && !hasCanvasCtx) return false
      if (!m.page_url || !normCurrentUrl) return true
      const match = normalizeUrl(m.page_url) === normCurrentUrl
      return match
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

      const iframeClientX = dragState.currentLeft - scrollPos.x
      const iframeClientY = dragState.currentTop - scrollPos.y

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

  const targetIframe = iframeNode || (typeof document !== 'undefined' ? (document.querySelector('#audit-iframe-container iframe') as HTMLIFrameElement | null) : null)
  const currentIframeRect = iframeRect || (targetIframe ? targetIframe.getBoundingClientRect() : null)

  let iframeWin: Window | null = null
  let iframeDoc: Document | null = null
  try {
    iframeWin = targetIframe?.contentWindow || null
    iframeDoc = targetIframe?.contentDocument || null
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
          zIndex: 35,
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
            const resolved = resolvedPositions?.[marker.id]
            const rect = currentIframeRect

            if (resolved && Number.isFinite(resolved.clientX) && Number.isFinite(resolved.clientY) && rect) {
              const scaleX = rect.width / (iframeNode?.offsetWidth || iframeNode?.clientWidth || 1)
              const scaleY = rect.height / (iframeNode?.offsetHeight || iframeNode?.clientHeight || 1)
              parentX = resolved.clientX * scaleX + rect.left
              parentY = resolved.clientY * scaleY + rect.top
              isDegraded = false
              source = resolved.source || 'element'
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
          }

          if (!Number.isFinite(parentX) || !Number.isFinite(parentY)) {
            return null
          }

          // If iframe rect is unavailable or unmeasured, skip rendering to prevent out-of-box drift
          if (!currentIframeRect || currentIframeRect.width <= 0 || currentIframeRect.height <= 0) {
            return null
          }

          if (typeof window !== 'undefined' && !isDragging) {
            const isWindowOffscreen = parentX < -50 || parentY < -50 || parentX > window.innerWidth + 50 || parentY > window.innerHeight + 50
            if (isWindowOffscreen) {
              return null
            }

            // Strictly prevent pin from floating outside canvas box into the STAGE navbar or shell
            const isIframeOffscreen =
              parentY < currentIframeRect.top ||
              parentY > currentIframeRect.bottom ||
              parentX < currentIframeRect.left ||
              parentX > currentIframeRect.right
            if (isIframeOffscreen) {
              return null
            }
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
                  isSelected={isActive}
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
                    
                    const resolved = resolvedPositions?.[id]
                    let initialLeft = 0
                    let initialTop = 0
                    if (resolved && Number.isFinite(resolved.clientX) && Number.isFinite(resolved.clientY)) {
                      initialLeft = resolved.pageX !== undefined ? resolved.pageX : resolved.clientX + scrollPos.x
                      initialTop = resolved.pageY !== undefined ? resolved.pageY : resolved.clientY + scrollPos.y
                    } else {
                      const posRes = computePinScreenPosition(targetMarker, scrollPos, currentIframeRect, iframeWin, iframeDoc)
                      initialLeft = posRes ? posRes.pageLeft : (targetMarker.page_x || 0)
                      initialTop = posRes ? posRes.pageTop : (targetMarker.page_y || 0)
                    }
                    
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
                  className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3.5 p-3.5 bg-[#0d0d14]/95 border border-purple-500/30 rounded-2xl shadow-2xl flex flex-col gap-2 pointer-events-auto z-50 w-72 text-white animate-fade-in backdrop-blur-xl"
                >
                  {/* Screenshot or Inspo Thumbnail */}
                  {(marker.screenshot_url || (marker as any).metadata?.inspo_image_url) && (
                    <div className="relative rounded-xl overflow-hidden border border-white/10 h-28 bg-black/40">
                      <img
                        src={marker.screenshot_url || (marker as any).metadata?.inspo_image_url}
                        alt="Pin preview thumbnail"
                        className="w-full h-full object-cover"
                      />
                      {(marker as any).metadata?.inspo_image_url && (
                        <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-purple-950/80 border border-purple-500/40 text-[8px] font-black uppercase tracking-wider text-purple-300">
                          Inspiration
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex flex-col gap-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      {(marker.color_token === 'ai_copilot' || (marker as any).metadata?.source === 'ai_copilot') && (
                        <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[8px] font-black uppercase tracking-wider border border-purple-500/30 flex items-center gap-1">
                          <Sparkles className="w-2.5 h-2.5" />
                          AI Suggestion
                        </span>
                      )}
                      <span className="text-[11px] font-bold truncate text-white/95">
                        {marker.title || 'Untitled Marker'}
                      </span>
                    </div>

                    <span className="text-[8px] font-mono text-white/40 truncate">
                      {marker.target_selector || 'No selector'}
                    </span>

                    {/* Benchmark Design Reference Link */}
                    {Boolean((marker as any).metadata?.benchmark_name || (marker as any).element_rect_json?.benchmark_name) && (
                      <div className="mt-1 flex items-center gap-1 text-[9px] text-purple-300 bg-purple-950/40 border border-purple-500/20 rounded-lg px-2 py-1">
                        <span className="font-semibold truncate">
                          Benchmark: {(marker as any).metadata?.benchmark_name || (marker as any).element_rect_json?.benchmark_name}
                        </span>
                        {Boolean((marker as any).metadata?.benchmark_url || (marker as any).element_rect_json?.benchmark_url) && (
                          <a
                            href={(marker as any).metadata?.benchmark_url || (marker as any).element_rect_json?.benchmark_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-auto text-purple-400 hover:text-white underline inline-flex items-center gap-0.5 flex-shrink-0 cursor-pointer"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span>view</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </div>
                    )}

                    {/* Developer directive / detailed feedback */}
                    {Boolean((marker as any).metadata?.developer_directive || marker.description) && (
                      <p className="text-[9.5px] text-white/70 leading-relaxed line-clamp-3 mt-0.5">
                        {(marker as any).metadata?.developer_directive || marker.description}
                      </p>
                    )}

                    {marker.dom_text_excerpt && (
                      <span className="text-[9px] text-white/60 italic truncate mt-0.5 pl-1 border-l border-purple-500/50">
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
