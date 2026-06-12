'use client'
import { useCaptureStore } from '@/store/overlayStore'
import { useUIStore } from '@/store/uiStore'
import { normalizeCapturePayload } from '@/utils/normalizeCapturePayload'

import { useEffect, useRef, useState, useCallback } from 'react'
import {
  Loader2, ArrowLeft, Monitor, Pin, Plus, X, Check,
  AlertTriangle, ChevronDown, MousePointer2, Layers,
  Type, Navigation2, Eye, Cpu, HelpCircle, Zap
} from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import PageTabBar from '@/components/session/PageTabBar'
import { useSessionStore } from '@/store/sessionStore'
import { SupportDiagnosticsPanel } from '@/components/audit/SupportDiagnosticsPanel'

// ─── Types ───────────────────────────────────────────────────────────────────

interface AuditSurfaceProps {
  sessionId: string
  projectId: string
  shareToken?: string
  onMarkerCreated?: (marker: any) => void
  onPageChanged?: (url: string, title: string) => void
}

type IssueType = 'layout' | 'copy' | 'interaction' | 'navigation' | 'rendering' | 'canvas_webgl' | 'other'
type Severity = 'low' | 'medium' | 'high' | 'critical'
type CreatedVia = 'agent' | 'alt_click' | 'manual' | 'fallback'

interface CaptureContext {
  // Location
  page_url: string
  page_title: string
  x: number
  y: number
  viewport_x: number
  viewport_y: number

  // Element context
  element_selector: string
  element_text: string
  element_tag: string
  aria_label: string | null
  aria_role: string | null
  bounding_box: Record<string, number> | null
  xpath: string

  // Shadow DOM
  is_inside_shadow_dom?: boolean
  shadow_path?: string

  // Renderer
  renderer_type: string
  canvas_context: any

  // Screenshot
  screenshot_data_url: string | null
  screenshot_required: boolean

  // Viewport
  viewport: { width: number; height: number }
  scroll_position: { x: number; y: number }

  // Diagnostics
  console_errors: any[]
  network_errors: any[]
  browser_info: any

  // Meta
  issue_type_hint: IssueType
  created_via: CreatedVia
  agent_version: string
  timestamp: string
}

// ─── Issue type config ────────────────────────────────────────────────────────

const ISSUE_TYPES: { value: IssueType; label: string; icon: React.ReactNode; color: string; description: string }[] = [
  { value: 'layout',      label: 'Layout',      icon: <Layers className="w-3.5 h-3.5" />,       color: 'blue',    description: 'Spacing, alignment, or sizing problem' },
  { value: 'copy',        label: 'Copy / Text', icon: <Type className="w-3.5 h-3.5" />,         color: 'amber',   description: 'Typo, wrong content, or missing text' },
  { value: 'interaction', label: 'Interaction', icon: <MousePointer2 className="w-3.5 h-3.5" />, color: 'green',   description: 'Button, form, or click behavior' },
  { value: 'navigation',  label: 'Navigation',  icon: <Navigation2 className="w-3.5 h-3.5" />,  color: 'purple',  description: 'Broken link or wrong routing' },
  { value: 'rendering',   label: 'Rendering',   icon: <Eye className="w-3.5 h-3.5" />,           color: 'rose',    description: 'Image, video, or visual glitch' },
  { value: 'canvas_webgl',label: 'Canvas / 3D', icon: <Cpu className="w-3.5 h-3.5" />,          color: 'cyan',    description: 'WebGL, Three.js, or canvas issue' },
  { value: 'other',       label: 'Other',       icon: <HelpCircle className="w-3.5 h-3.5" />,   color: 'slate',   description: 'Doesn\'t fit other categories' },
]

const issueTypeColorMap: Record<string, string> = {
  blue:   'bg-blue-600 border-blue-500 text-white shadow-blue-950/30',
  amber:  'bg-amber-600 border-amber-500 text-white shadow-amber-950/30',
  green:  'bg-emerald-600 border-emerald-500 text-white shadow-emerald-950/30',
  purple: 'bg-purple-600 border-purple-500 text-white shadow-purple-950/30',
  rose:   'bg-rose-600 border-rose-500 text-white shadow-rose-950/30',
  cyan:   'bg-cyan-600 border-cyan-500 text-white shadow-cyan-950/30',
  slate:  'bg-slate-600 border-slate-500 text-white shadow-slate-950/30',
}

// ─── Component ───────────────────────────────────────────────────────────────

export function AuditSurface({
  sessionId,
  projectId,
  shareToken,
  onMarkerCreated,
  onPageChanged
}: AuditSurfaceProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Page state
  const [currentUrl, setCurrentUrl] = useState('')
  const [currentTitle, setCurrentTitle] = useState('')
  const [rendererType, setRendererType] = useState('dom')
  const [pageHistory, setPageHistory] = useState<{ url: string; title: string; rendererType: string }[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [failedAssets, setFailedAssets] = useState<{ url: string; critical: boolean }[]>([])
  const [deviceViewport, setDeviceViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop')
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [scrollPos, setScrollPos] = useState({ x: 0, y: 0 })
  const [resolvedPositions, setResolvedPositions] = useState<Record<string, { pageX: number; pageY: number; source: string }>>({})

  // ─── Canvas/WebGL marker resolver ────────────────────────────────────────
  //
  // For canvas captures we CANNOT use DOM selectors. Instead we:
  //   1. Find the best canvas in the live iframe
  //   2. Use normX/normY (0..1) to compute pixel position within the canvas rect
  //   3. Fall back to canvasCoords (pixels within canvas) if no norm data
  //   4. Fall back to capture x/y as last resort
  //
  // All returned coords are VIEWPORT-relative (matching the overlay container).
  // Do NOT subtract scrollPos — the overlay is position:absolute over the iframe
  // which itself has no scroll; the scroll lives inside the iframe document.
  // ─── Canvas/WebGL marker resolver ────────────────────────────────────────
  //
  // For canvas captures we CANNOT use DOM selectors. Instead we:
  //   1. Find the best canvas in the live iframe
  //   2. Use normX/normY (0..1) to compute pixel position within the canvas rect
  //   3. Fall back to canvasCoords (pixels within canvas) if no norm data
  //   4. Fall back to capture x/y as last resort
  //
  // All returned coords are VIEWPORT-relative (matching the overlay container).
  const resolveCanvasMarkerPosition = useCallback((
    capture: any,
    scrollX: number,
    scrollY: number,
    iframeDocument?: Document | null
  ): { left: number; top: number; source: string } => {
    const cc = capture.canvasContext || capture.canvas_context
    const normX: number | null = capture.coordinates?.normX ?? capture.normX ?? capture.norm_x ?? null
    const normY: number | null = capture.coordinates?.normY ?? capture.normY ?? capture.norm_y ?? null

    // Find best canvas candidate in the live iframe
    let bestCanvas: Element | null = null
    if (iframeDocument) {
      try {
        const canvases = Array.from(iframeDocument.querySelectorAll('canvas'))
        if (canvases.length === 1) {
          bestCanvas = canvases[0]
        } else if (canvases.length > 1) {
          // Prefer canvas whose CSS rect most closely matches capture canvasRect dimensions
          const captureRect = cc?.canvas_rect
          if (captureRect?.width && captureRect?.height) {
            let minDiff = Infinity
            for (const c of canvases) {
              const r = c.getBoundingClientRect()
              const diff = Math.abs(r.width - captureRect.width) + Math.abs(r.height - captureRect.height)
              if (diff < minDiff) { minDiff = diff; bestCanvas = c }
            }
          } else {
            // Prefer largest visible canvas
            let largestArea = 0
            for (const c of canvases) {
              const r = c.getBoundingClientRect()
              const area = r.width * r.height
              if (area > largestArea) { largestArea = area; bestCanvas = c }
            }
          }
        }
      } catch {}
    }

    if (bestCanvas) {
      try {
        const rect = bestCanvas.getBoundingClientRect()
        if (normX !== null && normY !== null) {
          const left = rect.left + rect.width * normX
          const top = rect.top + rect.height * normY
          if (process.env.NODE_ENV !== 'production') {
            console.log(`[PixelMark Pin] canvas anchor ${capture.id} via normxy normX=${normX.toFixed(3)} normY=${normY.toFixed(3)} → left=${left.toFixed(1)} top=${top.toFixed(1)} canvasRect=${JSON.stringify({left: Math.round(rect.left), top: Math.round(rect.top), w: Math.round(rect.width), h: Math.round(rect.height)})}`)
          }
          return { left, top, source: 'canvas_normxy' }
        }
        if (cc?.canvas_coords) {
          const left = rect.left + (cc.canvas_coords.x || 0)
          const top = rect.top + (cc.canvas_coords.y || 0)
          if (process.env.NODE_ENV !== 'production') {
            console.log(`[PixelMark Pin] canvas anchor ${capture.id} via canvascoords cx=${cc.canvas_coords.x} cy=${cc.canvas_coords.y} → left=${left.toFixed(1)} top=${top.toFixed(1)}`)
          }
          return { left, top, source: 'canvas_coords' }
        }
      } catch {}
    }

    const captureScrollX = capture.viewport?.scrollX || 0
    const captureScrollY = capture.viewport?.scrollY || 0

    // Last resort: use viewport coords from capture adjusted for scroll difference
    const vx = capture.coordinates?.viewportX ?? capture.viewport_x ?? null
    const vy = capture.coordinates?.viewportY ?? capture.viewport_y ?? null
    if (vx !== null && vy !== null) {
      if (vx > 1 || vy > 1) {
        // Already in CSS pixels
        const left = vx + (captureScrollX - scrollX)
        const top = vy + (captureScrollY - scrollY)
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[PixelMark Pin] canvas anchor ${capture.id} fallback viewportpx left=${left} top=${top}`)
        }
        return { left, top, source: 'canvas_fallback_viewportpx_scrolled' }
      } else {
        // Viewport coords stored as 0..1 ratio
        const iw = (iframeDocument?.defaultView?.innerWidth) || window.innerWidth
        const ih = (iframeDocument?.defaultView?.innerHeight) || window.innerHeight
        const left = vx * iw + (captureScrollX - scrollX)
        const top = vy * ih + (captureScrollY - scrollY)
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[PixelMark Pin] canvas anchor ${capture.id} fallback viewportratio left=${left.toFixed(1)} top=${top.toFixed(1)}`)
        }
        return { left, top, source: 'canvas_fallback_viewportratio_scrolled' }
      }
    }
    const px = capture.coordinates?.pageX ?? capture.x ?? 0
    const py = capture.coordinates?.pageY ?? capture.y ?? 0
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[PixelMark Pin] canvas anchor ${capture.id} fallback pagexy left=${px - scrollX} top=${py - scrollY}`)
    }
    return { left: px - scrollX, top: py - scrollY, source: 'canvas_fallback_pagexy' }
  }, [])

  // ─── DOM marker resolver ───────────────────────────────────────────────────
  //
  // Returns VIEWPORT-relative coords (matching the overlay container).
  const resolveMarkerPosition = useCallback((
    capture: any,
    scrollX: number,
    scrollY: number,
    iframeDocument?: Document | null
  ) => {
    let el: Element | null = null
    let source = 'none'

    // 1. Try live DOM lookup in the iframe (same-origin only)
    if (iframeDocument) {
      const sel = capture.target?.selector
      if (sel && sel !== 'visual-canvas-context') {
        try {
          el = iframeDocument.querySelector(sel)
          if (el) source = 'selector'
        } catch {}
      }
      if (!el && capture.target?.xpath) {
        try {
          const res = iframeDocument.evaluate(
            capture.target.xpath, iframeDocument, null,
            XPathResult.FIRST_ORDERED_NODE_TYPE, null
          )
          el = res.singleNodeValue as Element | null
          if (el) source = 'xpath'
        } catch {}
      }
    }

    if (el instanceof Element) {
      try {
        // getBoundingClientRect is already viewport-relative in the iframe doc,
        // which maps directly to the overlay container (overlay is inset-0 over iframe).
        const rect = el.getBoundingClientRect()
        const left = rect.left + rect.width / 2
        const top = rect.top + Math.min(16, rect.height / 2)
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[PixelMark Pin] dom anchor ${capture.id} via ${source} left=${left.toFixed(1)} top=${top.toFixed(1)}`)
        }
        return { left, top, source }
      } catch {}
    }

    // 2. Stored bounding box (viewport-relative at capture time + scroll delta)
    if (capture.boundingBox) {
      const captureScrollX = capture.viewport?.scrollX || 0
      const captureScrollY = capture.viewport?.scrollY || 0
      const bbl = capture.boundingBox.left ?? capture.boundingBox.x ?? 0
      const bbt = capture.boundingBox.top ?? capture.boundingBox.y ?? 0
      const bbw = capture.boundingBox.width ?? 0
      const bbh = capture.boundingBox.height ?? 0
      // bbox was captured at viewport-relative position. Convert to page coords, then back to current viewport using reactive scroll.
      const pageX = bbl + captureScrollX + bbw / 2
      const pageY = bbt + captureScrollY + Math.min(16, bbh / 2)
      const left = pageX - scrollX
      const top = pageY - scrollY
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[PixelMark Pin] dom anchor ${capture.id} via bbox left=${left.toFixed(1)} top=${top.toFixed(1)} captureScroll=(${captureScrollX},${captureScrollY}) currentScroll=(${scrollX},${scrollY})`)
      }
      return { left, top, source: 'bbox' }
    }

    // 3. Viewport coords from capture (CSS pixels)
    const vx = capture.coordinates?.viewportX ?? null
    const vy = capture.coordinates?.viewportY ?? null
    if (vx !== null && vy !== null && vx > 1) {
      const captureScrollX = capture.viewport?.scrollX || 0
      const captureScrollY = capture.viewport?.scrollY || 0
      const left = vx + (captureScrollX - scrollX)
      const top = vy + (captureScrollY - scrollY)
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[PixelMark Pin] dom anchor ${capture.id} via viewportpx_scrolled left=${left} top=${top}`)
      }
      return { left, top, source: 'viewportpx_scrolled' }
    }

    // 4. Page x/y (absolute page coords) → convert to current viewport
    const px = capture.coordinates?.pageX ?? capture.x ?? 0
    const py = capture.coordinates?.pageY ?? capture.y ?? 0
    const left = px - scrollX
    const top = py - scrollY
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[PixelMark Pin] dom anchor ${capture.id} via pagexy left=${left.toFixed(1)} top=${top.toFixed(1)} pageXY=(${px},${py}) currentScroll=(${scrollX},${scrollY})`)
    }
    return { left, top, source: 'pagexy' }
  }, [])

  // Feedback mode state
  const [feedbackModeActive, setFeedbackModeActive] = useState(false)
  const captures = Object.values(useCaptureStore(state => state.capturesById))
  const [manualPlacementMode, setManualPlacementMode] = useState(false)
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 })
  const [isHoveringOverlay, setIsHoveringOverlay] = useState(false)

  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [captureCtx, setCaptureCtx] = useState<CaptureContext | null>(null)
  const [manualCoords, setManualCoords] = useState({ x: 50, y: 50, px: 0, py: 0 })
  const [noteText, setNoteText] = useState('')
  const [issueType, setIssueType] = useState<IssueType>('other')
  const [severity, setSeverity] = useState<Severity>('medium')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [showElementPreview, setShowElementPreview] = useState(true)

  const selectedCaptureId = useCaptureStore(state => state.selectedCaptureId)
  const isFeedbackDrawerOpen = useCaptureStore(state => state.isFeedbackDrawerOpen)
  const activeCapture = useCaptureStore(state => selectedCaptureId ? state.capturesById[selectedCaptureId] : null)
  const isSubmitted = activeCapture?.status === 'submitted'
  const isResolved = activeCapture?.status === 'resolved'
  const isFailed = activeCapture?.status === 'failed'

  useEffect(() => {
    setIsDrawerOpen(isFeedbackDrawerOpen)
  }, [isFeedbackDrawerOpen])

  useEffect(() => {
    if (selectedCaptureId) {
      const capture = useCaptureStore.getState().capturesById[selectedCaptureId]
      if (capture) {
        setCaptureCtx({
          page_url: capture.pageUrl,
          page_title: capture.pageTitle,
          x: capture.coordinates.pageX || 0,
          y: capture.coordinates.pageY || 0,
          viewport_x: capture.coordinates.viewportX || 0,
          viewport_y: capture.coordinates.viewportY || 0,
          element_selector: capture.target.selector || '',
          element_text: capture.target.text || '',
          element_tag: capture.target.tagName || '',
          aria_label: capture.target.ariaLabel,
          aria_role: capture.target.ariaRole,
          bounding_box: capture.boundingBox as any,
          xpath: capture.target.xpath || '',
          renderer_type: capture.rendererType,
          canvas_context: capture.canvasContext,
          screenshot_data_url: capture.screenshots.cropDataUrl || capture.screenshots.fullPageDataUrl,
          screenshot_required: capture.screenshots.screenshotRequired,
          viewport: capture.viewport as any,
          scroll_position: { x: capture.viewport.scrollX || 0, y: capture.viewport.scrollY || 0 },
          console_errors: capture.diagnostics.consoleErrors,
          network_errors: capture.diagnostics.networkErrors,
          browser_info: capture.diagnostics.browserInfo,
          issue_type_hint: (capture.issueType || 'other') as IssueType,
          created_via: capture.createdVia as CreatedVia,
          agent_version: capture.agentVersion || '2.0',
          timestamp: capture.timestamp
        })
        setNoteText(capture.userComment || '')
        setIssueType((capture.issueType || 'other') as IssueType)
        setSeverity((capture.priority || 'medium') as Severity)
      }
    } else {
      setCaptureCtx(null)
      setNoteText('')
      setIssueType('other')
      setSeverity('medium')
    }
  }, [selectedCaptureId])

  // Session / Heavy mode states
  const { setRendererType: setStoreRendererType, heavy_mode } = useSessionStore()
  const [isOverlayDelayed, setIsOverlayDelayed] = useState(false)

  // Delay overlay appearance by 1500ms after iframe load in heavy mode
  useEffect(() => {
    if (isLoading) {
      setIsOverlayDelayed(true)
    } else {
      if (heavy_mode) {
        const t = setTimeout(() => {
          setIsOverlayDelayed(false)
        }, 1500)
        return () => clearTimeout(t)
      } else {
        setIsOverlayDelayed(false)
      }
    }
  }, [isLoading, heavy_mode])

  // Heavy rendering states
  const [fps, setFps] = useState<number | null>(null)
  const [isStalled, setIsStalled] = useState(false)
  const [isPerformanceSafe, setIsPerformanceSafe] = useState(true)

  // Monitor frame rate for low-performance safe modes
  useEffect(() => {
    if (fps !== null && fps < 20) {
      setIsPerformanceSafe(false)
    } else if (fps !== null && fps >= 20) {
      setIsPerformanceSafe(true)
    }
  }, [fps])

  // A11y focus management for the Audit Feedback Drawer
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (isDrawerOpen) {
      setTimeout(() => {
        const textarea = document.querySelector('form textarea') as HTMLTextAreaElement
        if (textarea) {
          textarea.focus()
        } else {
          const closeBtn = document.querySelector('[aria-label="Close feedback drawer"]') as HTMLButtonElement
          if (closeBtn) closeBtn.focus()
        }
      }, 150)
    } else {
      const trigger = document.getElementById('leave-feedback-btn')
      if (trigger) {
        setTimeout(() => trigger.focus(), 150)
      }
    }
  }, [isDrawerOpen])

  // Escape key support to dismiss feedback drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isDrawerOpen) {
        setIsDrawerOpen(false)
        setCaptureCtx(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isDrawerOpen])

  useEffect(() => {
    let t: any;
    if (isLoading) {
      t = setTimeout(() => {
        setIsStalled(true)
      }, 10000)
    } else {
      setIsStalled(false)
    }
    return () => clearTimeout(t)
  }, [isLoading])

  useEffect(() => {
    if (!currentUrl || !sessionId) return

    console.log(`[PixelMark Hydration] loading feedback for ${currentUrl}`)
    
    api.feedback.list(sessionId, currentUrl, shareToken)
      .then((data) => {
        const items = data.items || []
        console.log(`[PixelMark Hydration] loaded ${items.length} items`)
        useCaptureStore.getState().hydratePersistedFeedback(items)
      })
      .catch((err) => {
        console.error('[PixelMark Hydration] failed to load feedback:', err)
      })
  }, [currentUrl, sessionId, shareToken])

  const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8765').replace(/\/$/, '')
  const proxyUrl = `${API_BASE}/proxy/session/${sessionId}${shareToken ? `?share_token=${shareToken}` : ''}`

  const handleSelectPage = useCallback((url: string) => {
    setIsLoading(true)
    setFailedAssets([])
    if (iframeRef.current) {
      const shareParam = shareToken ? `&share_token=${shareToken}` : ''
      iframeRef.current.src = `${API_BASE}/proxy/session/${sessionId}/page?url=${encodeURIComponent(url)}${shareParam}`
    }
  }, [sessionId, shareToken, API_BASE])

  // ─── Notify agent when feedback mode changes ──────────────────────────────
  const notifyAgent = useCallback((active: boolean) => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        { type: 'PIXELMARK_TOGGLE_MARKER_MODE', active },
        '*'
      )
    }
  }, [])

  useEffect(() => {
    notifyAgent(feedbackModeActive)
    // Safety fallback — retry after iframe may have navigated
    const t = setTimeout(() => notifyAgent(feedbackModeActive), 1200)
    return () => clearTimeout(t)
  }, [feedbackModeActive, isLoading, notifyAgent])

  // ─── Open feedback drawer with context ───────────────────────────────────
  const openFeedbackDrawer = useCallback((ctx: any) => {
    const payload = normalizeCapturePayload(ctx)
    const id = useCaptureStore.getState().upsertCapture(payload)
    useCaptureStore.getState().openFeedbackDrawer(id)
    useUIStore.getState().toggleCommandCenter(true)
  }, [])

  // ─── Listen for messages from the agent ──────────────────────────────────
  useEffect(() => {
    const handleAgentMessage = async (event: MessageEvent) => {
      const data = event.data
      if (!data || typeof data !== 'object') return

      switch (data.type) {
        case 'PIXELMARK_PAGE_LOAD':
          setCurrentUrl(data.url)
          setCurrentTitle(data.title || '')
          setRendererType(data.rendererType || 'dom')
          useSessionStore.getState().setRendererType(data.rendererType || 'dom')
          setIsLoading(false)
          setPageHistory(prev => {
            if (prev.length > 0 && prev[prev.length - 1].url === data.url) return prev
            return [...prev, { url: data.url, title: data.title || '', rendererType: data.rendererType || 'dom' }]
          })
          setRefreshTrigger(prev => prev + 1)
          if (onPageChanged) onPageChanged(data.url, data.title || '')
          break

        case 'PIXELMARK_PERFORMANCE_UPDATE':
          setFps(data.fps)
          break

        case 'PIXELMARK_RENDERER_CHANGED':
          setRendererType(data.rendererType || 'dom')
          useSessionStore.getState().setRendererType(data.rendererType || 'dom')
          break

        case 'PIXELMARK_RENDERER_DETECTED':
          if (data.session_id) {
            try {
              await api.sessions.updateRenderer(data.session_id, {
                renderer_type: data.renderer_type,
                has_canvas: !!data.has_canvas,
                canvas_count: Number(data.canvas_count || 0),
                raf_detected: !!data.raf_detected,
                three_detected: !!data.three_detected,
              });
            } catch (err) {
              console.error('[AuditSurface] Failed to update session renderer in backend:', err);
            }
          }
          useSessionStore.getState().setRendererType(data.renderer_type);
          setRendererType(data.renderer_type);

          // Resize event injection after 1000ms delay in heavy mode
          if (data.renderer_type !== 'dom') {
            setTimeout(() => {
              try {
                let isSameOrigin = false;
                try {
                  if (iframeRef.current?.contentWindow) {
                    const doc = iframeRef.current.contentWindow.document;
                    isSameOrigin = !!doc;
                  }
                } catch (e) {
                  isSameOrigin = false;
                }

                if (isSameOrigin) {
                  iframeRef.current?.contentWindow?.dispatchEvent(new Event('resize'));
                }
                window.dispatchEvent(new Event('resize'));
              } catch (err) {
                console.error('[AuditSurface] Failed to dispatch resize event to iframe:', err);
              }
            }, 1000);
          }
          break

        case 'PIXELMARK_NAV':
          try {
            api.sessions.recordVisit(
              sessionId,
              data.page_url,
              data.page_title || '',
              data.referrer_url || undefined,
              shareToken
            ).then(() => {
              setRefreshTrigger(prev => prev + 1)
            }).catch(err => {
              console.error('[AuditSurface] Background page visit recording failed:', err)
            })

            setCurrentUrl(data.page_url)
            if (data.page_title) {
              setCurrentTitle(data.page_title)
            }
            setPageHistory(prev => {
              if (prev.length > 0 && prev[prev.length - 1].url === data.page_url) return prev
              return [...prev, { url: data.page_url, title: data.page_title || '', rendererType: 'dom' }]
            })
            if (onPageChanged) onPageChanged(data.page_url, data.page_title || '')
          } catch (err) {
            console.error('[AuditSurface] PIXELMARK_NAV failed:', err)
          }
          break

        case 'PIXELMARK_PAGE_UNLOAD':
          setIsLoading(true)
          setFailedAssets([])
          break

        case 'PIXELMARK_ASSET_ERROR':
          if (data.url) {
            setFailedAssets(prev => {
              if (prev.some(a => a.url === data.url)) return prev
              return [...prev, { url: data.url, critical: !!data.critical }]
            })
          }
          break

        // ── Capture progress events ─────────────────────────────────────────
        case 'PIXELMARK_CAPTURE_STARTED':
          useCaptureStore.getState().setCaptureInProgress(true)
          break

        case 'PIXELMARK_CAPTURE_COMPLETED':
          useCaptureStore.getState().setCaptureInProgress(false)
          break

        // ── Open feedback drawer — canonical handler (normalizes payload) ───
        case 'PIXELMARK_OPEN_FEEDBACK_DRAWER': {
          const rawData = data.payload ? { ...data, ...data.payload } : data
          const normalized = normalizeCapturePayload(rawData)
          const captureId = useCaptureStore.getState().upsertCapture(normalized)
          useCaptureStore.getState().openFeedbackDrawer(captureId)
          useUIStore.getState().toggleCommandCenter(true)
          break
        }

        case 'PIXELMARK_SCROLL':
          setScrollPos({ x: data.scrollX || 0, y: data.scrollY || 0 })
          break

        case 'PIXELMARK_PINS_RESOLVED': {
          console.log(`[PixelMark Pin] recomputed ${data.resolvedPins?.length} markers`)
          setResolvedPositions(prev => {
            const next = { ...prev }
            data.resolvedPins?.forEach((p: any) => {
              if (p.source !== 'none') {
                next[p.id] = { pageX: p.pageX, pageY: p.pageY, source: p.source }
              }
            })
            return next
          })
          break
        }

        case 'PIXELMARK_UNDO_LAST':
          useCaptureStore.getState().undoLastLocalCapture()
          break

        // ── Open specific existing capture ────────────────────────────────
        case 'PIXELMARK_OPEN_CAPTURE': {
          if (data.id) {
            useCaptureStore.getState().openFeedbackDrawer(data.id)
          }
          break
        }

        case 'EXIT_AUDIT':
          window.location.href = '/dashboard'
          break
      }
    }

    window.addEventListener('message', handleAgentMessage)
    return () => window.removeEventListener('message', handleAgentMessage)
  }, [sessionId, projectId, shareToken, onMarkerCreated, onPageChanged, openFeedbackDrawer])

  // Send pins to the iframe agent for element tracking
  useEffect(() => {
    if (isLoading || !iframeRef.current?.contentWindow) return

    const pins = captures.map(c => ({
      id: c.id,
      selector: c.target?.selector,
      xpath: c.target?.xpath,
      boundingBox: c.boundingBox,
      x: c.coordinates?.pageX ?? 0,
      y: c.coordinates?.pageY ?? 0,
      scrollPosition: {
        x: c.viewport?.scrollX,
        y: c.viewport?.scrollY
      },
      pageUrl: c.pageUrl
    }))

    console.log(`[PixelMark Pin] tracking ${pins.length} pins`)
    iframeRef.current.contentWindow.postMessage({
      type: 'PIXELMARK_TRACK_PINS',
      pins
    }, '*')
  }, [captures, currentUrl, isLoading])

  // Parent keyboard shortcut Ctrl+Z / Cmd+Z for undo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        const target = e.target as HTMLElement
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
          return
        }
        e.preventDefault()
        useCaptureStore.getState().undoLastLocalCapture()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // ─── Cursor relay: forward cursor coords to iframe so cursor-reactive
  //     backgrounds (spotlight/glow/WebGL mouse effects) keep working when
  //     the PixelMark overlay captures pointer events in feedback mode.
  //
  //  • When feedback mode is OFF the parent echoes PIXELMARK_IFRAME_MOUSEMOVE
  //    messages (sent by the agent) straight back as PIXELMARK_CURSOR_MOVE so
  //    the relay loop is self-sustaining while the pointer is inside the iframe.
  //  • When feedback mode is ON the manual overlay's onMouseMove (see below)
  //    sends PIXELMARK_CURSOR_MOVE directly, keeping effects live even though
  //    the overlay intercepts native pointer events.
  useEffect(() => {
    const handleIframeMouseMove = (event: MessageEvent) => {
      const data = event.data
      if (!data || data.type !== 'PIXELMARK_IFRAME_MOUSEMOVE') return
      // Echo back to iframe only when feedback mode is OFF — in that case the
      // parent overlay is NOT intercepting events so no relay is needed for native
      // events, but we still forward to keep WebGL global-state cursors updated.
      if (feedbackModeActive) return
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          { type: 'PIXELMARK_CURSOR_MOVE', x: data.x, y: data.y },
          '*'
        )
      }
    }
    window.addEventListener('message', handleIframeMouseMove)
    return () => window.removeEventListener('message', handleIframeMouseMove)
  }, [feedbackModeActive])

  // ─── Page back navigation ─────────────────────────────────────────────────
  const handleGoBack = () => {
    if (pageHistory.length <= 1) return
    setIsLoading(true)
    setFailedAssets([])
    const newHistory = [...pageHistory]
    newHistory.pop()
    const prevPage = newHistory[newHistory.length - 1]
    setPageHistory(newHistory)
    if (iframeRef.current) {
      iframeRef.current.src = `${API_BASE}/proxy/session/${sessionId}/page?url=${encodeURIComponent(prevPage.url)}`
    }
  }

  const handleCaptureFrame = () => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        { type: 'PIXELMARK_TRIGGER_FRAME_CAPTURE' },
        '*'
      )
    }
  }

  // ─── Manual overlay click (fallback) ─────────────────────────────────────
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const xPct = ((e.clientX - rect.left) / rect.width) * 100
    const yPct = ((e.clientY - rect.top) / rect.height) * 100
    const px = Math.round(e.clientX - rect.left + window.scrollX)
    const py = Math.round(e.clientY - rect.top + window.scrollY)
    setManualCoords({ x: xPct, y: yPct, px, py })

    // Build a lightweight context for the drawer
    const manualCtx: CaptureContext = {
      page_url: currentUrl,
      page_title: currentTitle,
      x: px,
      y: py,
      viewport_x: e.clientX - rect.left,
      viewport_y: e.clientY - rect.top,
      element_selector: '',
      element_text: '',
      element_tag: 'MANUAL',
      aria_label: null,
      aria_role: null,
      bounding_box: null,
      xpath: '',
      renderer_type: rendererType,
      canvas_context: null,
      screenshot_data_url: null,
      screenshot_required: false,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      scroll_position: { x: window.scrollX, y: window.scrollY },
      console_errors: [],
      network_errors: [],
      browser_info: null,
      issue_type_hint: 'other',
      created_via: 'manual',
      agent_version: '2.1.0',
      timestamp: new Date().toISOString(),
    }
    openFeedbackDrawer(manualCtx)
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const localX = e.clientX - rect.left
    const localY = e.clientY - rect.top
    setHoverPos({ x: localX, y: localY })

    // Relay cursor position to iframe so cursor-reactive effects (spotlight,
    // WebGL mouse-follow, canvas trails) keep working while the overlay is
    // intercepting pointer events in feedback / manual-placement mode.
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        { type: 'PIXELMARK_CURSOR_MOVE', x: localX, y: localY },
        '*'
      )
    }
  }

  // ─── Drawer submit ────────────────────────────────────────────────────────
  const handleDrawerSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!sessionId) return
    setIsSubmitting(true)
    setSubmitError(null)

    const ctx = captureCtx
    const activeId = selectedCaptureId

    try {
      if (isSubmitted) {
        // Update flow
        if (!activeId) throw new Error("No active capture ID found")
        const patch = {
          comment: noteText.trim(),
          issuetype: issueType,
          priority: severity,
        }
        console.log('[PixelMark Submit] updating feedback payload:', patch)
        const updated = await api.feedback.update(sessionId, activeId, patch, shareToken)
        
        // Map backend record back into CapturePayload-compatible frontend object
        const normalized = normalizeCapturePayload({
          id: updated.id,
          status: updated.status,
          createdVia: updated.createdvia,
          timestamp: updated.createdat,
          sessionId: updated.sessionid,
          pageUrl: updated.pageurl,
          pageTitle: updated.pagetitle,
          rendererType: updated.renderertype,
          issueType: updated.issuetype,
          priority: updated.priority,
          comment: updated.comment,
          ...updated.capturepayload,
        })
        
        useCaptureStore.getState().upsertCapture(normalized)
        useCaptureStore.getState().markCaptureSubmitted(normalized.id)
        
        if (onMarkerCreated) onMarkerCreated(normalized)
        setSubmitSuccess(true)
        setTimeout(() => {
          setSubmitSuccess(false)
        }, 1200)
      } else {
        // Create flow
        if (!activeId) throw new Error("No active capture ID found")
        const currentCapture = useCaptureStore.getState().capturesById[activeId]
        if (!currentCapture) throw new Error("Capture context not found in store")

        // Build FeedbackCreate payload
        const feedbackPayload = {
          pageurl: currentCapture.pageUrl || currentUrl || window.location.href,
          pagetitle: currentCapture.pageTitle || currentTitle || 'Untitled Page',
          issuetype: issueType,
          priority: severity,
          comment: noteText.trim(),
          renderertype: currentCapture.rendererType || rendererType || 'dom',
          createdvia: currentCapture.createdVia || 'manual',
          capturepayload: {
            ...currentCapture,
            userComment: noteText.trim(),
            priority: severity,
            issueType: issueType,
          },
          share_token: shareToken || null,
        }

        console.log('[PixelMark Submit] sending feedback payload:', feedbackPayload)
        const created = await api.feedback.create(sessionId, feedbackPayload, shareToken)

        // Map backend record back into CapturePayload-compatible frontend object
        const normalized = normalizeCapturePayload({
          id: created.id,
          status: created.status,
          createdVia: created.createdvia,
          timestamp: created.createdat,
          sessionId: created.sessionid,
          pageUrl: created.pageurl,
          pageTitle: created.pagetitle,
          rendererType: created.renderertype,
          issueType: created.issuetype,
          priority: created.priority,
          comment: created.comment,
          ...created.capturepayload,
        })

        // Remove old temporary draft ID if it was different
        if (normalized.id !== activeId) {
          useCaptureStore.getState().removeCapture(activeId)
        }
        useCaptureStore.getState().upsertCapture(normalized)
        useCaptureStore.getState().markCaptureSubmitted(normalized.id)

        if (onMarkerCreated) onMarkerCreated(normalized)
        setSubmitSuccess(true)
        setTimeout(() => {
          setIsDrawerOpen(false)
          setCaptureCtx(null)
          setNoteText('')
          setSeverity('medium')
          setIssueType('other')
          setSubmitSuccess(false)
        }, 1100)
      }
    } catch (err: unknown) {
      console.error('[AuditSurface] Feedback submission failed:', err)
      const message = err instanceof Error ? err.message : 'Could not save feedback'
      setSubmitError(message)
      if (activeId) {
        useCaptureStore.getState().markCaptureFailed(activeId, message)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // ─── Renderer label ───────────────────────────────────────────────────────
  const rendererLabel = rendererType === 'threejs' ? 'Three.js'
    : rendererType === 'webgl' ? 'WebGL'
    : rendererType === 'canvas2d' ? 'Canvas2D'
    : rendererType === 'shadow_dom' ? 'Shadow DOM'
    : 'DOM'

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="w-full h-full flex bg-black relative select-none">

      {/* ── Left: Audit Surface ──────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">

        {/* Top bar */}
        <div className="bg-[#0d0d14] border-b border-white/5 text-white/60 text-xs px-5 h-12 flex items-center justify-between z-20 select-none gap-4">

          {/* Left: back + URL */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={handleGoBack}
              disabled={pageHistory.length <= 1}
              aria-label="Navigate back"
              className={cn(
                "p-1.5 rounded-xl transition-all flex-shrink-0 border border-transparent focus:ring-2 focus:ring-purple-500 focus:outline-none",
                pageHistory.length > 1
                  ? "text-white/80 hover:bg-white/5 hover:border-white/5 hover:text-white"
                  : "text-white/20 cursor-not-allowed"
              )}
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="h-4 w-px bg-white/10 flex-shrink-0" />
            <div className="flex items-center gap-2 min-w-0 truncate" title={currentUrl}>
              <span className="text-[9px] font-black text-purple-400 uppercase tracking-widest font-mono flex-shrink-0">URL:</span>
              <span className="text-[11px] font-mono text-white/60 truncate">
                {currentUrl || 'Connecting…'}
              </span>
            </div>
          </div>

          {/* Right: controls */}
          <div className="flex items-center gap-3 flex-shrink-0">

            {/* ── Capture Frame (WebGL/Canvas Mode only) ─────────────────── */}
            {(rendererType === 'webgl' || rendererType === 'threejs' || rendererType === 'canvas' || rendererType === 'mixed') && (
              <button
                id="capture-frame-btn"
                onClick={handleCaptureFrame}
                className="h-8 rounded-xl font-extrabold text-[10px] uppercase tracking-widest px-3 flex items-center gap-1.5 transition-all border border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 active:scale-95 shadow-lg shadow-amber-950/20 focus:ring-2 focus:ring-amber-400 focus:outline-none"
              >
                <Eye className="w-3.5 h-3.5 animate-pulse" />
                Capture Frame
              </button>
            )}

            {/* ── PRIMARY CTA: Leave Feedback ────────────────────────────── */}
            <button
              id="leave-feedback-btn"
              aria-label="Leave visual feedback on the page"
              onClick={() => {
                setFeedbackModeActive(true)
                setManualPlacementMode(true)
              }}
              className={cn(
                "h-8 rounded-xl font-extrabold text-[10px] uppercase tracking-widest px-4 flex items-center gap-1.5 transition-all border focus:ring-2 focus:ring-purple-500 focus:outline-none",
                feedbackModeActive
                  ? "bg-purple-500 border-purple-400 text-white shadow-lg shadow-purple-900/40 scale-105"
                  : "bg-purple-600 hover:bg-purple-500 active:scale-95 border-purple-500/30 text-white shadow-lg shadow-purple-900/20"
              )}
            >
              {feedbackModeActive
                ? <><Zap className="w-3.5 h-3.5 animate-pulse" /> Feedback Active</>
                : <><Plus className="w-3.5 h-3.5" /> Leave Feedback</>
              }
            </button>

            {/* ── SECONDARY: Advanced Marker Mode toggle (hidden on mobile) ── */}
            <div className="flex items-center gap-1.5 rounded-xl px-2.5 py-1 select-none border bg-white/[0.03] border-white/5 max-md:hidden">
              <button onClick={() => setDeviceViewport('mobile')} className={`p-1 rounded-lg transition-colors ${deviceViewport === 'mobile' ? 'bg-purple-500 text-white' : 'text-white/40 hover:text-white'}`} title="Mobile (375px)"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg></button>
              <button onClick={() => setDeviceViewport('tablet')} className={`p-1 rounded-lg transition-colors ${deviceViewport === 'tablet' ? 'bg-purple-500 text-white' : 'text-white/40 hover:text-white'}`} title="Tablet (768px)"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg></button>
              <button onClick={() => setDeviceViewport('desktop')} className={`p-1 rounded-lg transition-colors ${deviceViewport === 'desktop' ? 'bg-purple-500 text-white' : 'text-white/40 hover:text-white'}`} title="Desktop (100%)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg></button>
            </div>
            <div className="flex items-center gap-2 bg-white/[0.03] border border-white/5 px-3 py-1 rounded-xl max-md:hidden">
              <label htmlFor="marker-mode-switch" className="text-[9px] font-black text-white/40 uppercase tracking-widest cursor-pointer select-none">
                Alt+Click
              </label>
              <button
                id="marker-mode-switch"
                role="switch"
                aria-label="Toggle Alt+Click feedback mode"
                aria-checked={feedbackModeActive}
                onClick={() => {
                  setFeedbackModeActive(prev => !prev)
                  if (manualPlacementMode) setManualPlacementMode(false)
                }}
                className={cn(
                  "relative inline-flex h-5 w-10 items-center rounded-full transition-colors outline-none focus:ring-2 focus:ring-purple-500",
                  feedbackModeActive ? "bg-purple-600" : "bg-white/10"
                )}
              >
                <span className={cn(
                  "inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow-md",
                  feedbackModeActive ? "translate-x-5" : "translate-x-0.5"
                )} />
              </button>
            </div>

            <div className="h-4 w-px bg-white/10 max-md:hidden" />

            {/* ── FPS/Performance indicator (hidden on mobile) ─────────────── */}
            {fps !== null && (
              <div className={cn(
                "flex items-center gap-1.5 rounded-xl px-2.5 py-1 select-none border transition-all text-[9px] font-black uppercase tracking-widest max-md:hidden",
                fps >= 45 ? "bg-emerald-950/20 border-emerald-500/20 text-emerald-400" :
                fps >= 25 ? "bg-amber-950/20 border-amber-500/20 text-amber-400" :
                "bg-rose-950/20 border-rose-500/20 text-rose-400 animate-pulse"
              )}>
                <span className="w-1 h-1 rounded-full bg-current animate-ping" />
                {fps} FPS {fps < 30 ? "(Lagging)" : "(Fluid)"}
              </div>
            )}

            {/* Sleek Performance Safe Indicator when frame rate is low */}
            {fps !== null && fps < 20 && (
              <div 
                title="Performance Safe Mode: Frame rate is low. You can capture a static frame or switch to Static Snapshot."
                className="flex items-center gap-1.5 rounded-xl px-2.5 py-1 select-none border bg-cyan-950/25 border-cyan-500/40 text-cyan-400 text-[9px] font-black uppercase tracking-widest animate-pulse max-md:hidden"
              >
                <Cpu className="w-3.5 h-3.5 text-cyan-400 animate-spin-slow" />
                Performance Safe Active
              </div>
            )}

            {/* Renderer badge (hidden on mobile) */}
            <div 
              title={rendererType !== 'dom' ? "This site uses WebGL or canvas rendering. Feedback captures visual coordinates." : undefined}
              className={cn(
                "flex items-center gap-1.5 rounded-xl px-2.5 py-1 select-none border transition-all duration-300 relative group cursor-help max-md:hidden",
                rendererType !== 'dom'
                  ? "bg-cyan-950/20 border-cyan-500/30 text-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.15)]"
                  : "bg-white/[0.03] border-white/5 text-white/70"
              )}
            >
              {rendererType !== 'dom' ? (
                <>
                  <span className="text-[10px] text-cyan-400 font-bold">⬡</span>
                  <span className="text-[9px] font-black uppercase tracking-widest">WebGL / Canvas Mode</span>
                  <div className="absolute top-full mt-2 right-0 hidden group-hover:block bg-[#09090b] border border-cyan-500/20 text-white text-[10px] font-medium p-3 rounded-xl shadow-2xl w-56 z-50 normal-case tracking-normal leading-relaxed text-center">
                    This site uses WebGL or canvas rendering. Feedback captures visual coordinates.
                  </div>
                </>
              ) : (
                <>
                  <Monitor className="w-3.5 h-3.5 text-white/40" />
                  <span className="text-[9px] font-black uppercase tracking-widest">{rendererLabel} Mode</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Page navigation tab bar */}
        <PageTabBar
          sessionId={sessionId}
          currentUrl={currentUrl}
          onSelectPage={handleSelectPage}
          shareToken={shareToken}
          refreshTrigger={refreshTrigger}
        />

        {/* ── Viewport frame ───────────────────────────────────────────── */}
        <div
          ref={containerRef}
          onMouseMove={handleMouseMove}
          className={cn(
            "flex-1 relative bg-white transition-all duration-300",
            deviceViewport === 'mobile' ? 'max-w-[375px] mx-auto h-full border-x border-white/10' :
            deviceViewport === 'tablet' ? 'max-w-[768px] mx-auto h-full border-x border-white/10' :
            'w-full h-full',
            feedbackModeActive
              ? "ring-2 ring-purple-600 ring-offset-2 ring-offset-[#0a0a0f] shadow-[0_0_50px_rgba(124,58,237,0.25)]"
              : ""
          )}
        >
          <iframe
            ref={iframeRef}
            src={proxyUrl}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
            allow="accelerometer; autoplay; xr-spatial-tracking; clipboard-read; clipboard-write"
            style={{ width: '100%', height: '100%', minHeight: '100%', border: 'none', pointerEvents: 'auto', display: 'block' }}
            onLoad={() => setIsLoading(false)}
            title="Proxied review site"
          />

          {/* Subtle non-critical asset failure warning banner */}
          {failedAssets.length > 0 && !failedAssets.some(a => a.critical) && (
            <div className="absolute top-4 left-5 right-5 z-45 bg-[#0f0f16]/95 border border-cyan-500/30 text-cyan-400 px-4 py-3 rounded-2xl shadow-2xl flex items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-cyan-400 flex-shrink-0 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-wider">
                  Some assets failed to load. The session remains active.
                </span>
                <span className="text-[9px] text-white/30 font-bold uppercase tracking-widest font-mono">
                  ({failedAssets.length} failed)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setFailedAssets([])
                    setIsLoading(true)
                    if (iframeRef.current) {
                      iframeRef.current.src = iframeRef.current.src
                    }
                  }}
                  className="h-7 px-3 rounded-xl bg-cyan-950/40 border border-cyan-500/40 hover:bg-cyan-500/20 text-cyan-400 font-extrabold text-[9px] uppercase tracking-widest transition-all active:scale-95"
                >
                  Retry
                </button>
                <button
                  onClick={() => {
                    setFailedAssets([])
                    setIsLoading(true)
                    if (iframeRef.current) {
                      const currentSrc = new URL(iframeRef.current.src)
                      currentSrc.searchParams.set("snapshot_mode", "true")
                      iframeRef.current.src = currentSrc.toString()
                    }
                  }}
                  className="h-7 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 font-extrabold text-[9px] uppercase tracking-widest transition-all active:scale-95"
                >
                  Static Snapshot
                </button>
                <button
                  onClick={() => setFailedAssets([])}
                  className="p-1 rounded-lg text-white/30 hover:text-white transition-all"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Critical Chunk Failure Recovery Prompt */}
          {failedAssets.some(a => a.critical) && (
            <div className="absolute inset-0 z-45 bg-[#0a0a0f]/90 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center animate-in fade-in">
              <AlertTriangle className="w-12 h-12 text-cyan-400 mb-4 animate-bounce" />
              <h3 className="text-white text-base font-black uppercase tracking-wider mb-2">Critical Chunk Load Failed</h3>
              <p className="text-white/40 text-[10px] max-w-md leading-relaxed mb-6 uppercase tracking-wider">
                A critical script or module chunk failed to resolve. Bypassing script boot via Static Snapshot mode will allow you to complete your review safely.
              </p>
              
              <div className="flex gap-4 flex-wrap justify-center">
                <button
                  onClick={() => {
                    setFailedAssets([])
                    setIsLoading(true)
                    if (iframeRef.current) {
                      iframeRef.current.src = iframeRef.current.src
                    }
                  }}
                  className="h-10 px-6 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold text-[10px] uppercase tracking-widest transition-all"
                >
                  Retry Render
                </button>
                <button
                  onClick={() => {
                    setFailedAssets([])
                    setIsLoading(true)
                    if (iframeRef.current) {
                      const currentSrc = new URL(iframeRef.current.src)
                      currentSrc.searchParams.set("snapshot_mode", "true")
                      iframeRef.current.src = currentSrc.toString()
                    }
                  }}
                  className="h-10 px-6 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 font-extrabold text-[10px] uppercase tracking-widest transition-all"
                >
                  Switch to Static Snapshot
                </button>
              </div>
            </div>
          )}

          {/* ── Manual placement overlay ────────────────────────────────── */}
          {/* Only rendered when feedback mode is ON — pointer-events:auto only then */}
          {manualPlacementMode && (
            <div
              onClick={handleOverlayClick}
              onMouseMove={handleMouseMove}
              onMouseEnter={() => setIsHoveringOverlay(true)}
              onMouseLeave={() => setIsHoveringOverlay(false)}
              style={{ pointerEvents: 'auto' }}
              className="absolute inset-0 z-40 bg-black/20 backdrop-blur-[1px] cursor-crosshair select-none"
              aria-label="Click anywhere to place a feedback pin"
            >
              {/* Floating tooltip following cursor */}
              {isHoveringOverlay && (
                <div
                  className="absolute pointer-events-none z-50 flex items-center gap-2 bg-purple-600 border border-purple-400/50 text-white px-3 py-1.5 rounded-full shadow-2xl"
                  style={{ left: hoverPos.x + 14, top: hoverPos.y + 14 }}
                >
                  <Pin className="w-3 h-3" />
                  <span className="text-[10px] font-extrabold uppercase tracking-wider">Click to pin feedback</span>
                </div>
              )}

              {/* Centre instruction banner (hidden in heavy modes to maximize screen space) */}
              {!(rendererType === 'webgl' || rendererType === 'threejs' || rendererType === 'canvas' || rendererType === 'mixed') && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="bg-[#0f0f16]/95 border border-purple-500/30 text-white px-7 py-5 rounded-3xl shadow-2xl flex flex-col items-center gap-3 text-center max-w-xs pointer-events-auto">
                    <div className="w-12 h-12 rounded-2xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center">
                      <Pin className="w-6 h-6 text-purple-400 animate-bounce" />
                    </div>
                    <div>
                      <h4 className="text-[11px] font-black uppercase tracking-widest text-purple-400 mb-1">Click to Point at a Problem</h4>
                      <p className="text-[10px] text-white/50 leading-relaxed">Click anywhere on the page to drop a feedback pin. A note drawer will open automatically.</p>
                    </div>
                    <button
                      onClick={(ev) => { ev.stopPropagation(); setManualPlacementMode(false); setFeedbackModeActive(false) }}
                      className="text-[9px] font-black uppercase text-white/30 hover:text-white/70 tracking-widest underline decoration-dotted transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          
          {/* ── Pin Overlay ─────────────────────────────────────────────── */}
          {/* wrapper: pointer-events:none so it never blocks hover/cursor effects */}
          <div className="absolute inset-0 z-42" style={{ pointerEvents: 'none' }}>
            {captures.map((capture, index) => {
              if (capture.pageUrl !== currentUrl) return null;

              // Grab live iframe refs (cross-origin will throw → graceful fallback)
              let iframeDoc: Document | null = null;
              let iframeWin: Window | null = null;
              try {
                if (iframeRef.current?.contentWindow) {
                  iframeWin = iframeRef.current.contentWindow;
                  iframeDoc = iframeRef.current.contentWindow.document;
                }
              } catch {
                // Cross-origin SecurityError — DOM resolution will be skipped
              }

              // Decide resolver: canvas/WebGL captures use the dedicated canvas resolver.
              // All coordinates returned are VIEWPORT-relative (0,0 = top-left of iframe).
              const isCanvasCapture =
                capture.rendererType === 'webgl' ||
                capture.rendererType === 'webgl2' ||
                capture.rendererType === 'threejs' ||
                capture.rendererType === 'canvas2d' ||
                capture.rendererType === 'mixed' ||
                capture.target?.selector === 'visual-canvas-context' ||
                !!capture.canvasContext

              let pinLeft: number, pinTop: number, pinSource: string;

              // Prefer agent-resolved positions (from PIXELMARK_PINS_RESOLVED).
              // These are page-space coords → convert to viewport-relative.
              const agentResolved = resolvedPositions[capture.id]
              if (agentResolved) {
                // Agent sends pageX/pageY (absolute page coordinates).
                // Subtract iframe scroll to get viewport-relative.
                pinLeft = agentResolved.pageX - scrollPos.x
                pinTop  = agentResolved.pageY  - scrollPos.y
                pinSource = agentResolved.source + '_agent'
              } else if (isCanvasCapture) {
                const r = resolveCanvasMarkerPosition(capture, scrollPos.x, scrollPos.y, iframeDoc)
                pinLeft = r.left
                pinTop  = r.top
                pinSource = r.source
              } else {
                const r = resolveMarkerPosition(capture, scrollPos.x, scrollPos.y, iframeDoc)
                pinLeft = r.left
                pinTop  = r.top
                pinSource = r.source
              }

              const isActive = useCaptureStore.getState().selectedCaptureId === capture.id;
              const isSubmitted = capture.status === 'submitted';
              const isFailed = capture.status === 'failed';
              const markerNumber = (useCaptureStore.getState().captureOrder?.indexOf(capture.id) ?? index) + 1;

              return (
                // Individual pin wrapper: position:absolute, pointer-events:none on wrapper,
                // pointer-events:auto ONLY on the visible button. Hit area is exactly the button.
                <div
                  key={capture.id}
                  style={{
                    position: 'absolute',
                    left: pinLeft,
                    top: pinTop,
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'none',
                    zIndex: isActive ? 50 : 40,
                  }}
                  data-pin-id={capture.id}
                  data-pin-source={pinSource}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      useCaptureStore.getState().selectCapture(capture.id)
                      useCaptureStore.getState().openFeedbackDrawer(capture.id)
                    }}
                    style={{ pointerEvents: 'auto' }}
                    className={`w-6 h-6 rounded-full border-2 border-white shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-1 cursor-pointer ${
                      isActive ? 'ring-2 ring-white scale-110 shadow-2xl' : 'hover:scale-125'
                    } ${
                      isFailed
                        ? 'bg-rose-500 border-rose-300 shadow-rose-900/50'
                        : isSubmitted
                          ? 'bg-teal-500 border-teal-300 shadow-teal-900/50'
                          : 'bg-purple-600 border-purple-300 shadow-purple-900/50'
                    }`}
                    aria-label={`Open feedback pin ${isSubmitted ? '(submitted)' : isFailed ? '(failed)' : '(draft)'}`}
                  >
                    <span className="text-[10px] font-black text-white select-none">{markerNumber}</span>
                  </button>
                </div>
              )
            })}
          </div>

          {/* ── Loading overlay ─────────────────────────────────────────── */}
          {isLoading && (
            <div className="absolute inset-0 bg-[#0a0a0f]/80 backdrop-blur-md flex flex-col items-center justify-center z-48">
              <Loader2 className="w-8 h-8 animate-spin text-purple-500 mb-3" />
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Loading page…</p>
            </div>
          )}

          {/* ── Failure Recovery Overlay ─────────────────────────────── */}
          {isStalled && (
            <div className="absolute inset-0 bg-[#0a0a0f]/90 backdrop-blur-md flex flex-col items-center justify-center z-50 p-8 text-center select-text animate-in fade-in">
              <AlertTriangle className="w-12 h-12 text-amber-500 mb-4 animate-bounce" />
              <h3 className="text-white text-base font-black uppercase tracking-wider mb-2">Render Stalled / Failed</h3>
              <p className="text-white/40 text-[10px] max-w-md leading-relaxed mb-6 uppercase tracking-wider">
                This page is taking longer than expected to load. Heavy animation, WebGL assets, or proxy script limits can cause stalls.
              </p>
              
              {/* Failed Network Assets */}
              {captureCtx?.network_errors && captureCtx.network_errors.length > 0 && (
                <div className="w-full max-w-md bg-white/[0.02] border border-white/5 rounded-2xl p-4 mb-6 text-left space-y-2">
                  <span className="text-[8px] font-black text-rose-400 uppercase tracking-widest block mb-1">Failed Network Assets:</span>
                  <div className="max-h-24 overflow-y-auto space-y-1.5 custom-scrollbar text-[10px] font-mono text-white/50">
                    {captureCtx.network_errors.map((err: any, idx: number) => (
                      <div key={idx} className="truncate" title={err.url}>
                        ❌ {err.method} {err.url} ({err.status || 'Failed'})
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-4 flex-wrap justify-center">
                <button
                  onClick={() => {
                    setIsLoading(true);
                    setIsStalled(false);
                    if (iframeRef.current) {
                      iframeRef.current.src = iframeRef.current.src; // Reload
                    }
                  }}
                  className="h-10 px-6 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-[10px] uppercase tracking-widest transition-all"
                >
                  Retry Render
                </button>
                <button
                  onClick={() => {
                    setIsLoading(false);
                    setIsStalled(false);
                  }}
                  className="h-10 px-6 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 font-extrabold text-[10px] uppercase tracking-widest transition-all"
                >
                  Use Static Snapshot
                </button>
              </div>
            </div>
          )}

          {/* ── Shortcut hint ───────────────────────────────────────────── */}
          {!manualPlacementMode && !feedbackModeActive && (
            <div className="absolute bottom-5 left-5 bg-[#0f0f16]/90 border border-purple-500/20 text-white px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-3 z-30 select-none animate-fade-in">
              <div className="flex items-center gap-1">
                <kbd className="w-6 h-6 rounded-md bg-white/10 border border-white/10 flex items-center justify-center text-purple-300 text-[9px] font-black">Alt</kbd>
                <span className="text-white/30 text-[9px]">+</span>
                <kbd className="px-2 h-6 rounded-md bg-white/10 border border-white/10 flex items-center justify-center text-white/60 text-[9px] font-black">click</kbd>
              </div>
              <div className="text-[10px]">
                <span className="font-black uppercase tracking-wider block text-white/80">Quick feedback shortcut</span>
                <span className="text-white/35 font-bold uppercase tracking-widest text-[9px]">or click "Leave Feedback" above</span>
              </div>
            </div>
          )}

          {/* Unstable Frame Rate Detected floating alert */}
          {fps !== null && fps < 20 && rendererType !== 'dom' && (
            <div className="absolute bottom-20 left-5 right-5 sm:left-auto sm:right-5 sm:w-[360px] z-45 bg-[#0f0f16]/95 border border-cyan-500/30 text-cyan-400 px-4 py-3 rounded-2xl shadow-2xl flex items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 animate-spin-slow text-cyan-400 flex-shrink-0" />
                <div className="text-left">
                  <span className="text-[10px] font-black uppercase tracking-wider block">Low frame rate warning</span>
                  <span className="text-[8px] text-white/40 font-bold uppercase tracking-widest leading-none">Recommend Capture Frame or Snapshot</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={handleCaptureFrame}
                  className="h-7 px-2.5 rounded-xl bg-cyan-950/40 border border-cyan-500/40 hover:bg-cyan-500/20 text-cyan-400 font-extrabold text-[9px] uppercase tracking-widest transition-all active:scale-95 focus:ring-2 focus:ring-cyan-400 focus:outline-none"
                >
                  Capture
                </button>
                <button
                  onClick={() => {
                    setIsLoading(true)
                    if (iframeRef.current) {
                      const currentSrc = new URL(iframeRef.current.src)
                      currentSrc.searchParams.set("snapshot_mode", "true")
                      iframeRef.current.src = currentSrc.toString()
                    }
                  }}
                  className="h-7 px-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 font-extrabold text-[9px] uppercase tracking-widest transition-all active:scale-95 focus:ring-2 focus:ring-cyan-400 focus:outline-none"
                >
                  Snapshot
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Right: Feedback Drawer (Fully Responsive) ────────────────────── */}
      <div 
        role="dialog"
        aria-label="Feedback Submission Drawer"
        aria-modal="true"
        className={cn(
          "bg-[#0d0d14] flex flex-col z-55 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] absolute",
          // Mobile bottom sheet structure
          "bottom-0 left-0 right-0 w-full h-[60dvh] max-h-[60dvh] rounded-t-[32px] border-t border-white/5",
          // Desktop/Tablet side panel
          "md:top-0 md:bottom-0 md:right-0 md:left-auto md:w-96 md:h-full md:rounded-t-none md:border-l md:border-t-0",
          isDrawerOpen
            ? "translate-x-0 translate-y-0 opacity-100"
            : "opacity-0 pointer-events-none translate-y-full md:translate-y-0 md:translate-x-full"
        )}
      >

        {/* Drawer header */}
        <div className="p-5 border-b border-white/5 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center">
              <Pin className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-white">
                {isSubmitted ? 'Feedback Item' : isResolved ? 'Resolved Feedback' : 'Leave Feedback'}
              </h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={cn(
                  "px-1.5 py-0.5 rounded-full font-black uppercase tracking-widest text-[7px]",
                  isResolved ? "bg-green-500/10 border border-green-500/20 text-green-400" :
                  isSubmitted ? "bg-teal-500/10 border border-teal-500/20 text-teal-400" :
                  isFailed ? "bg-rose-500/10 border border-rose-500/20 text-rose-400" :
                  "bg-purple-500/10 border border-purple-500/20 text-purple-400"
                )}>
                  {activeCapture?.status || 'draft'}
                </span>
                {activeCapture?.id && (
                  <span className="font-mono text-[7px] text-white/30">
                    ID: {activeCapture.id}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={() => { setIsDrawerOpen(false); setCaptureCtx(null); setManualPlacementMode(false); setFeedbackModeActive(false) }}
            aria-label="Close feedback drawer"
            className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/5 transition-all focus:ring-2 focus:ring-purple-500 focus:outline-none"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleDrawerSubmit} className="flex-1 overflow-y-auto flex flex-col">
          <div className="p-5 flex flex-col gap-5 flex-1">

            {/* ── Element context preview ─────────────────────────────── */}
            {captureCtx && captureCtx.element_tag !== 'MANUAL' && (captureCtx.element_selector || captureCtx.element_text) && (
              <div className="bg-white/[0.025] border border-white/[0.06] rounded-2xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowElementPreview(p => !p)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/[0.03] transition-all"
                >
                  <span className="text-[9px] font-black uppercase tracking-widest text-white/40">Captured Element</span>
                  <ChevronDown className={cn("w-3.5 h-3.5 text-white/30 transition-transform", showElementPreview ? "rotate-180" : "")} />
                </button>
                {showElementPreview && (
                  <div className="px-4 pb-4 space-y-2">
                    {captureCtx.element_tag && (
                      <div className="flex items-center gap-2">
                        <span className="text-[8px] font-black uppercase tracking-widest text-white/25 w-16">Tag</span>
                        <span className="font-mono text-[10px] text-purple-300 bg-purple-900/20 px-2 py-0.5 rounded-md">&lt;{captureCtx.element_tag.toLowerCase()}&gt;</span>
                      </div>
                    )}
                    {captureCtx.element_text && (
                      <div className="flex items-start gap-2">
                        <span className="text-[8px] font-black uppercase tracking-widest text-white/25 w-16 flex-shrink-0 pt-0.5">Text</span>
                        <span className="text-[10px] text-white/60 leading-relaxed line-clamp-2 italic">"{captureCtx.element_text.slice(0, 80)}"</span>
                      </div>
                    )}
                    {captureCtx.element_selector && (
                      <div className="flex items-start gap-2">
                        <span className="text-[8px] font-black uppercase tracking-widest text-white/25 w-16 flex-shrink-0 pt-0.5">Selector</span>
                        <code className="text-[9px] text-emerald-400/80 font-mono leading-relaxed break-all line-clamp-2">{captureCtx.element_selector.slice(0, 100)}</code>
                      </div>
                    )}
                    {captureCtx.aria_label && (
                      <div className="flex items-center gap-2">
                        <span className="text-[8px] font-black uppercase tracking-widest text-white/25 w-16">ARIA</span>
                        <span className="text-[9px] text-amber-400/80 font-mono">{captureCtx.aria_label}</span>
                      </div>
                    )}
                    {captureCtx.bounding_box && (
                      <div className="flex items-center gap-2">
                        <span className="text-[8px] font-black uppercase tracking-widest text-white/25 w-16">Bounds</span>
                        <span className="text-[9px] font-mono text-white/40">
                          {captureCtx.bounding_box.width}×{captureCtx.bounding_box.height} @ ({captureCtx.bounding_box.x},{captureCtx.bounding_box.y})
                        </span>
                      </div>
                    )}
                    {/* Screenshot thumbnail */}
                    {captureCtx.screenshot_data_url && (
                      <div className="mt-2">
                        <span className="text-[8px] font-black uppercase tracking-widest text-white/25 block mb-1.5">Screenshot</span>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={captureCtx.screenshot_data_url}
                          alt="Captured element screenshot"
                          className="w-full rounded-xl border border-white/10 object-cover"
                          style={{ maxHeight: 120 }}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── Issue Type picker ───────────────────────────────────── */}
            <div className="space-y-2.5">
              <label className="text-[9px] font-black uppercase tracking-widest text-white/40 block">
                Issue Type <span className="text-purple-400">*</span>
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {ISSUE_TYPES.map((t) => {
                  const active = issueType === t.value
                  return (
                    <button
                      key={t.value}
                      type="button"
                      aria-pressed={active}
                      title={t.description}
                      onClick={() => setIssueType(t.value)}
                      className={cn(
                        "h-9 rounded-xl font-bold text-[9px] uppercase tracking-widest border transition-all flex items-center justify-center gap-1.5 px-2 focus:ring-2 focus:ring-purple-500 focus:outline-none",
                        active
                          ? `${issueTypeColorMap[t.color]} shadow-lg`
                          : 'bg-white/[0.03] border-white/[0.06] text-white/40 hover:bg-white/[0.07] hover:text-white/70'
                      )}
                    >
                      {t.icon}
                      {t.label}
                    </button>
                  )
                })}
              </div>
              <p className="text-[9px] text-white/30 leading-relaxed pl-0.5">
                {ISSUE_TYPES.find(t => t.value === issueType)?.description}
              </p>
            </div>

            {/* ── Note text area ──────────────────────────────────────── */}
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase tracking-widest text-white/40 block">
                Describe the problem <span className="text-white/20">(optional)</span>
              </label>
              <textarea
                rows={4}
                placeholder="What's wrong here? e.g. 'Button doesn't respond on mobile', 'Text overlaps the image'…"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/[0.08] text-white placeholder:text-white/20 p-4 rounded-2xl text-xs focus:ring-2 focus:ring-purple-500 focus:border-purple-500/50 outline-none resize-none leading-relaxed transition-all"
              />
            </div>

            {/* ── Severity picker ─────────────────────────────────────── */}
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase tracking-widest text-white/40 block">Severity</label>
              <div className="grid grid-cols-4 gap-1.5">
                {(['low', 'medium', 'high', 'critical'] as Severity[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={severity === s}
                    onClick={() => setSeverity(s)}
                    className={cn(
                      "h-8 rounded-xl font-bold text-[8px] uppercase tracking-widest border transition-all focus:ring-2 focus:ring-purple-500 focus:outline-none",
                      severity === s
                        ? s === 'critical' ? 'bg-rose-600 border-rose-500 text-white shadow-lg' :
                          s === 'high' ? 'bg-orange-600 border-orange-500 text-white shadow-lg' :
                          s === 'medium' ? 'bg-purple-600 border-purple-500 text-white shadow-lg' :
                          'bg-blue-600 border-blue-500 text-white shadow-lg'
                        : 'bg-white/[0.03] border-white/[0.06] text-white/40 hover:bg-white/[0.07] hover:text-white/60'
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Coordinates (read-only) ──────────────────────────────── */}
            {captureCtx && (
              <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-3 flex items-center justify-between">
                <span className="text-[8px] font-black uppercase tracking-widest text-white/20">Pin Coordinates</span>
                <span className="font-mono text-[9px] text-white/35">
                  ({captureCtx.x}, {captureCtx.y})
                </span>
              </div>
            )}
          </div>

          {/* ── Submit actions ─────────────────────────────────────────── */}
          <div className="p-5 border-t border-white/5 flex flex-col gap-2 flex-shrink-0">
            {submitSuccess ? (
              <div className="h-12 w-full rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center gap-2 text-emerald-400 font-extrabold text-[10px] uppercase tracking-wider animate-pulse">
                <Check className="w-4 h-4" />
                Feedback Pinned!
              </div>
            ) : (
              <>
                {isResolved ? (
                  <button
                    type="button"
                    disabled
                    className="h-12 w-full rounded-2xl bg-green-500/10 border border-green-500/20 text-green-400 font-extrabold text-[10px] uppercase tracking-widest cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    Resolved (Read Only)
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    aria-label={isSubmitted ? "Update feedback pin" : "Submit feedback pin"}
                    className="h-12 w-full rounded-2xl bg-purple-600 hover:bg-purple-500 disabled:bg-purple-900/40 disabled:text-white/30 text-white font-extrabold text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-950/30 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : isSubmitted ? (
                      <><Check className="w-3.5 h-3.5" /> Update Feedback</>
                    ) : (
                      <><Pin className="w-3.5 h-3.5" /> Submit Feedback</>
                    )}
                  </button>
                )}
              </>
            )}
            {submitError && (
              <p className="text-rose-400 text-[10px] font-bold text-center leading-snug animate-in fade-in slide-in-from-top-1">
                {submitError}
              </p>
            )}
            {!isSubmitted && !isResolved && activeCapture && (
              <button
                type="button"
                onClick={() => {
                  useCaptureStore.getState().removeLocalCapture(activeCapture.id);
                  setIsDrawerOpen(false);
                  setCaptureCtx(null);
                  setManualPlacementMode(false);
                  setFeedbackModeActive(false);
                }}
                className="h-10 w-full rounded-2xl bg-rose-950/30 border border-rose-500/30 hover:bg-rose-500/20 text-rose-400 font-extrabold text-[9px] uppercase tracking-widest transition-all focus:ring-2 focus:ring-rose-500 focus:outline-none"
              >
                {activeCapture.status === 'failed' ? 'Discard Draft' : noteText.trim() ? 'Discard Draft' : 'Undo Marker'}
              </button>
            )}
            <button
              type="button"
              onClick={() => { setIsDrawerOpen(false); setCaptureCtx(null); setManualPlacementMode(false); setFeedbackModeActive(false) }}
              className="h-10 w-full rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] text-white/50 hover:text-white/80 font-black text-[9px] uppercase tracking-widest transition-all focus:ring-2 focus:ring-purple-500 focus:outline-none"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>

      <SupportDiagnosticsPanel
        sessionId={sessionId}
        projectId={projectId}
        rendererType={rendererType}
        heavyMode={heavy_mode}
        currentUrl={currentUrl}
        failedAssetsCount={failedAssets.length}
        lastMarkerStatus={{
          status: isSubmitting ? 'submitting' : submitSuccess ? 'success' : 'idle',
          message: submitSuccess ? 'Marker successfully placed.' : ''
        }}
      />
    </div>
  )
}
