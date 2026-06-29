'use client'
import { useCaptureStore, usePinStore } from '@/store/overlayStore'
import { useUIStore } from '@/store/uiStore'
import { normalizeCapturePayload, normalizeMarkerCoordinates } from '@/utils/normalizeCapturePayload'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { useDOMEditStore } from '@/store/domEditStore'

import { useEffect, useRef, useState, useCallback } from 'react'
import {
  Loader2, ArrowLeft, Monitor, Pin, Plus, X, Check,
  AlertTriangle, ChevronDown, MousePointer2, Layers,
  Type, Navigation2, Eye, Cpu, HelpCircle, Zap, Pencil
} from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import PageTabBar from '@/components/session/PageTabBar'
import { useSessionStore } from '@/store/sessionStore'
import { SupportDiagnosticsPanel } from '@/components/audit/SupportDiagnosticsPanel'
import { useScreenshotStore } from '@/store/screenshotStore'
import { ScreenshotPermissionBanner } from '@/components/audit/ScreenshotPermissionBanner'
import { RegionSelectionOverlay } from '@/components/audit/RegionSelectionOverlay'
import { MarkerPinLayer } from '@/components/audit/MarkerPinLayer'
// ─── Collapsible list helper component (Phase 3.5 Upgrade) ────────────────────
const CollapsibleList = ({ title, count, items, renderItem }: { title: string; count: number; items: any[]; renderItem: (item: any, idx: number) => React.ReactNode }) => {
  const [open, setOpen] = useState(false)
  if (count === 0) return (
    <div className="text-[9px] text-white/20 uppercase font-black tracking-wider py-1 pl-1">
      No {title}
    </div>
  )
  return (
    <div className="border border-white/5 rounded-xl overflow-hidden mt-1.5">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2 bg-white/[0.02] hover:bg-white/[0.04] text-[9px] font-bold uppercase tracking-wider text-white/50"
      >
        <span>{title} ({count})</span>
        <ChevronDown className={cn("w-3 h-3 text-white/30 transition-transform", open ? "rotate-180" : "")} />
      </button>
      {open && (
        <div className="p-2 bg-black/25 space-y-1.5 max-h-40 overflow-y-auto">
          {items.map(renderItem)}
        </div>
      )}
    </div>
  )
}

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
  displayX?: number
  displayY?: number

  // Element context
  element_selector: string
  element_text: string
  element_tag: string
  element_id?: string | null
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
  screenshottype?: string | null
  screenshotttype?: string | null
  screenshotsource?: string | null

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
  const [iframeReady, setIframeReady] = useState(false)

  const screenshotMode = useScreenshotStore(state => state.screenshotMode)
  const screenshotPermission = useScreenshotStore(state => state.screenshotPermission)

  useEffect(() => {
    const { screenshotPermission, setPermission } = useScreenshotStore.getState()
    if (screenshotPermission === 'idle') {
      setPermission('pending')
    }
    return () => {
      useScreenshotStore.getState().teardown()
    }
  }, [])

  // Send active heartbeat to the proxy/review session every 25 seconds to avoid idle auto-closure
  useEffect(() => {
    if (!sessionId) return
    
    api.sessions.sendHeartbeat(sessionId).catch(err => {
      console.warn('[AuditSurface] Initial heartbeat failed:', err)
    })
    
    const interval = setInterval(() => {
      api.sessions.sendHeartbeat(sessionId).catch(err => {
        console.warn('[AuditSurface] Periodic heartbeat failed:', err)
      })
    }, 25000)
    
    return () => clearInterval(interval)
  }, [sessionId])

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
  const [resolvedPositions, setResolvedPositions] = useState<Record<string, { clientX: number; clientY: number; pageX?: number; pageY?: number; source: string }>>({})
  // Feedback mode state
  const [feedbackModeActive, setFeedbackModeActive] = useState(false)
  const { fetchEdits, createEdit } = useDOMEditStore()
  const edits = useDOMEditStore(state => state.edits)
  const captures = Object.values(useCaptureStore(state => state.capturesById))
  const captureOrder = useCaptureStore(state => state.captureOrder)
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
  const [statusVal, setStatusVal] = useState('new')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [showElementPreview, setShowElementPreview] = useState(true)
  
  // Phase 4 Feedback drawer state extensions
  const [issueTitle, setIssueTitle] = useState('')
  const [tags, setTags] = useState('')
  const [isListSidebarOpen, setIsListSidebarOpen] = useState(projectId === 'public')
  
  // Collapsible Evidence Panel States (Phase 3.5 Upgrade)
  const [screenshotPanelExpanded, setScreenshotPanelExpanded] = useState(true)
  const [imgErrorId, setImgErrorId] = useState<string | null>(null)
  const [domPanelExpanded, setDomPanelExpanded] = useState(true)
  const [canvasPanelExpanded, setCanvasPanelExpanded] = useState(true)
  const [diagnosticsPanelExpanded, setDiagnosticsPanelExpanded] = useState(false)
  const [innerHTMLPanelExpanded, setInnerHTMLPanelExpanded] = useState(false)
  
  const [pendingRegionCaptureId, setPendingRegionCaptureId] = useState<string | null>(null)

  const handleRegionConfirm = useCallback(async (rect: { x: number; y: number; width: number; height: number }) => {
    let id = pendingRegionCaptureId
    setPendingRegionCaptureId(null)
    
    useScreenshotStore.getState().setMode('element')

    // If there is no pending capture ID, it means the user clicked the "Take Screenshot" button directly.
    // We will create a new capture pin at the center of the region.
    if (!id) {
      const centerX = rect.x + rect.width / 2
      const centerY = rect.y + rect.height / 2

      let iframeLeft = 0
      let iframeTop = 0
      if (iframeRef.current) {
        const iRect = iframeRef.current.getBoundingClientRect()
        iframeLeft = iRect.left
        iframeTop = iRect.top
      }
      
      const vx = centerX - iframeLeft
      const vy = centerY - iframeTop
      const px = Math.round(vx + scrollPos.x)
      const py = Math.round(vy + scrollPos.y)
      
      const regionCtx: CaptureContext = {
        page_url: currentUrl,
        page_title: currentTitle,
        x: px,
        y: py,
        viewport_x: vx,
        viewport_y: vy,
        element_selector: '',
        element_text: '',
        element_tag: 'REGION',
        aria_label: null,
        aria_role: null,
        bounding_box: {
          x: rect.x - iframeLeft,
          y: rect.y - iframeTop,
          width: rect.width,
          height: rect.height,
          left: rect.x - iframeLeft,
          top: rect.y - iframeTop,
          right: rect.x - iframeLeft + rect.width,
          bottom: rect.y - iframeTop + rect.height
        } as any,
        xpath: '',
        renderer_type: rendererType,
        canvas_context: null,
        screenshot_data_url: 'pending',
        screenshot_required: true,
        viewport: { width: window.innerWidth, height: window.innerHeight },
        scroll_position: { x: scrollPos.x, y: scrollPos.y },
        console_errors: [],
        network_errors: [],
        browser_info: null,
        issue_type_hint: 'other',
        created_via: 'manual',
        agent_version: '2.1.0',
        timestamp: new Date().toISOString(),
      }

      // Upsert and get ID
      const payload = normalizeCapturePayload(regionCtx)
      id = useCaptureStore.getState().upsertCapture(payload)
      useCaptureStore.getState().openFeedbackDrawer(id)
      useUIStore.getState().toggleCommandCenter(true)
    }

    const captureId = id; // save for closure

    import('@/utils/captureOrchestrator').then(({ orchestrateScreenshot }) => {
      orchestrateScreenshot(sessionId, currentUrl, 'region', rect, shareToken, iframeRef.current).then((res) => {
        window.postMessage({
          type: 'PIXELMARK_UPDATE_SCREENSHOT',
          id: captureId,
          screenshotdataurl: res.dataUrl,
          screenshotsource: res.source,
          screenshotrequired: true
        }, '*')
      }).catch(err => console.error('[AuditSurface] orchestration failed', err))
    })
  }, [pendingRegionCaptureId, sessionId, currentUrl, currentTitle, rendererType, shareToken])

  const handleRegionCancel = useCallback(() => {
    setPendingRegionCaptureId(null)
    useScreenshotStore.getState().setMode('element')
  }, [])


  const selectedCaptureId = useCaptureStore(state => state.selectedCaptureId)
  const isFeedbackDrawerOpen = useCaptureStore(state => state.isFeedbackDrawerOpen)
  const activeCapture = useCaptureStore(state => selectedCaptureId ? state.capturesById[selectedCaptureId] : null)
  const isSubmitted = activeCapture ? (activeCapture.status !== 'draft' && activeCapture.status !== 'failed') : false
  const isResolved = activeCapture?.status === 'resolved' || activeCapture?.status === 'dismissed'
  const isFailed = activeCapture?.status === 'failed'
  const isFormReadOnly = isResolved && (statusVal === 'resolved' || statusVal === 'dismissed')

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
          element_id: capture.target.elementId || '',
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
        setStatusVal(capture.status || 'new')
        setIssueTitle(capture.title || '')
        setTags(capture.tags || '')
        console.log(`[OBSERVABILITY] [FEEDBACK_OPENED] Opened feedback ID=${capture.id} status=${capture.status || 'new'} priority=${capture.priority || 'medium'}`)
      }
    } else {
      setCaptureCtx(null)
      setNoteText('')
      setIssueTitle('')
      setTags('')
      setIssueType('other')
      setSeverity('medium')
      setStatusVal('new')
    }
  }, [selectedCaptureId])

  // Save current active draft form state to localStorage
  useEffect(() => {
    if (selectedCaptureId && !isSubmitted && !isResolved) {
      const draftState = {
        activePinId: selectedCaptureId,
        issueTitle,
        noteText,
        issueType,
        severity,
        tags,
      }
      localStorage.setItem('pixelmark_current_draft_form', JSON.stringify(draftState))
      console.log('[OBSERVABILITY] [DRAFT_SAVED] Current open draft form autosaved')
    } else if (!selectedCaptureId) {
      localStorage.removeItem('pixelmark_current_draft_form')
    }
  }, [selectedCaptureId, issueTitle, noteText, issueType, severity, tags, isSubmitted, isResolved])

  // Restore current active draft form state from localStorage on mount/load
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('pixelmark_current_draft_form')
        if (saved) {
          const parsed = JSON.parse(saved)
          if (parsed && parsed.activePinId) {
            const pins = usePinStore.getState().pins
            const exists = pins.some(p => p.id === parsed.activePinId)
            if (exists) {
              if (useCaptureStore.getState().selectedCaptureId !== parsed.activePinId) {
                useCaptureStore.getState().openFeedbackDrawer(parsed.activePinId)
              }
              setIssueTitle(parsed.issueTitle || '')
              setNoteText(parsed.noteText || '')
              setIssueType(parsed.issueType || 'other')
              setSeverity(parsed.severity || 'medium')
              setTags(parsed.tags || '')
              console.log('[OBSERVABILITY] [DRAFT_RESTORED] Restored open feedback draft from localStorage')
            }
          }
        }
      } catch (e) {
        console.error('[Draft Recovery] failed to restore current draft:', e)
      }
    }
  }, [])

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
      // Ignore if typing in input
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return

      if (e.key === 'Escape' && isDrawerOpen) {
        setIsDrawerOpen(false)
        setCaptureCtx(null)
      }

      if (e.key.toLowerCase() === 'e') {
        useScreenshotStore.getState().setMode('element')
      } else if (e.key.toLowerCase() === 'f') {
        useScreenshotStore.getState().setMode('fullpage')
      } else if (e.key.toLowerCase() === 'r') {
        useScreenshotStore.getState().setMode('region')
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

  // Fetch session URL on mount to avoid race conditions with iframe postMessage
  useEffect(() => {
    if (!sessionId) return

    let active = true

    async function loadInitialUrl() {
      try {
        // First try getting session details
        const session = await api.sessions.getSession(sessionId)
        if (!active) return

        if (session && session.current_page_url) {
          console.log('[AuditSurface Init] Initializing currentUrl from session:', session.current_page_url)
          setCurrentUrl(session.current_page_url)
          return
        }

        // If session current_page_url is empty, fetch visits
        const visits = await api.sessions.getVisits(sessionId)
        if (!active) return

        if (Array.isArray(visits) && visits.length > 0) {
          const sorted = [...visits].sort((a, b) => (a.page_order || 0) - (b.page_order || 0))
          console.log('[AuditSurface Init] Initializing currentUrl from visits:', sorted[0].page_url)
          setCurrentUrl(sorted[0].page_url)
          return
        }

        // Fallback: fetch project details
        if (projectId) {
          const project = await api.projects.get(projectId)
          if (!active) return
          if (project && project.url) {
            console.log('[AuditSurface Init] Initializing currentUrl from project:', project.url)
            setCurrentUrl(project.url)
          }
        }
      } catch (err) {
        console.error('[AuditSurface Init] Failed to resolve initial url:', err)
      }
    }

    loadInitialUrl()

    return () => {
      active = false
    }
  }, [sessionId, projectId])

  useEffect(() => {
    if (!sessionId) return

    console.log(`[PixelMark Hydration] loading all session feedback`)
    
    api.feedback.list(sessionId, undefined, shareToken)
      .then((data) => {
        const items = data.items || []
        console.log(`[PixelMark Hydration] loaded all ${items.length} session items`)
        useCaptureStore.getState().hydratePersistedFeedback(items)
      })
      .catch((err) => {
        console.error('[PixelMark Hydration] failed to load all session feedback:', err)
      })
  }, [sessionId, shareToken])

  const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8765').replace(/\/$/, '')
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
          setScrollPos({ x: data.scrollX || 0, y: data.scrollY || 0 })
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
          setIframeReady(false)
          setFailedAssets([])
          setScrollPos({ x: 0, y: 0 })
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
        case 'PIXELMARKOPENFEEDBACKDRAWER':
        case 'PIXELMARK_OPEN_FEEDBACK_DRAWER': {
          const rawData = data.payload ? { ...data, ...data.payload } : data
          const normalized = normalizeCapturePayload(rawData)

          // If it's an existing pin, don't trigger new screenshot orchestration or overwrite
          const existingCapture = useCaptureStore.getState().capturesById[normalized.id]
          if (existingCapture) {
            console.log(`[Markers] opened id=${normalized.id}`)
            useCaptureStore.getState().selectCapture(normalized.id)
            useCaptureStore.getState().openFeedbackDrawer(normalized.id)
            useUIStore.getState().toggleCommandCenter(true)
            break
          }

          // Compute coordinates once using the new helper
          const coords = normalizeMarkerCoordinates(normalized)
          normalized.displayX = coords.displayX
          normalized.displayY = coords.displayY
          normalized.pageX = coords.pageX
          normalized.pageY = coords.pageY

          console.log(`[Markers] created id=${normalized.id} x=${normalized.displayX} y=${normalized.displayY} source=${coords.source}`)

          normalized.screenshotdataurl = 'pending';
          const captureId = useCaptureStore.getState().upsertCapture(normalized)
          useCaptureStore.getState().openFeedbackDrawer(captureId)
          useUIStore.getState().toggleCommandCenter(true)
          console.log(`[Markers] opened id=${captureId}`)

          const pageUrl = normalized.pageUrl || currentUrl;
          const { screenshotMode } = useScreenshotStore.getState();

          const runBackgroundScreenshot = (capId: string, url: string, bbox: any) => {
            useScreenshotStore.getState().setScreenshotState('capturing', null, null, null);

            let cropRect = undefined;
            if (screenshotMode === 'element' && bbox) {
              const bb = bbox as any;
              cropRect = { x: bb.left || bb.x || 0, y: bb.top || bb.y || 0, width: bb.width || 0, height: bb.height || 0 };
            }

            Promise.all([
              import('@/utils/captureOrchestrator'),
            ]).then(([{ orchestrateScreenshot, createDetailedPlaceholderScreenshot }]) => {
              orchestrateScreenshot(sessionId, url, screenshotMode, cropRect, shareToken, iframeRef.current)
                .then((res) => {
                  useScreenshotStore.getState().setScreenshotState('success', res.dataUrl, res.source, null);

                  window.postMessage({
                    type: 'PIXELMARK_UPDATE_SCREENSHOT',
                    id: capId,
                    screenshotdataurl: res.dataUrl,
                    screenshotsource: res.source,
                    screenshotrequired: true
                  }, '*');
                })
                .catch((err) => {
                  console.error('[PixelMark Screenshot] background capture failed:', err);
                  
                  // Fail-soft: generate detailed placeholder PNG
                  const fallbackPng = createDetailedPlaceholderScreenshot({
                    url: pageUrl,
                    title: normalized.pageTitle || currentTitle,
                    tag: normalized.target.tagName || 'ELEMENT',
                    selector: normalized.target.selector || '',
                    reason: err.message || String(err),
                    timestamp: new Date().toISOString()
                  });

                  useScreenshotStore.getState().setScreenshotState('failed', fallbackPng, 'placeholder-error', err.message || String(err));

                  window.postMessage({
                    type: 'PIXELMARK_UPDATE_SCREENSHOT',
                    id: capId,
                    screenshotdataurl: fallbackPng,
                    screenshotsource: 'failed-fallback',
                    screenshotrequired: false
                  }, '*');
                });
            }).catch((err) => {
              console.error('[PixelMark Screenshot] failed to import orchestrator:', err);
              useScreenshotStore.getState().setScreenshotState('failed', null, null, err.message || String(err));
            });
          };

          if (screenshotMode === 'region') {
            setPendingRegionCaptureId(captureId)
          } else {
            // Asynchronous non-blocking background capture
            setTimeout(() => {
              runBackgroundScreenshot(captureId, pageUrl, normalized.boundingBox);
            }, screenshotMode === 'fullpage' ? 300 : 0);
          }

          break
        }

        case 'PIXELMARK_UPDATE_SCREENSHOT': {
          // Log screenshot received status (Part 2)
          const strategy = data.screenshotsource || data.screenshottype || data.screenshotttype || 'none';
          const hasScreenshot = !!data.screenshotdataurl;
          console.log(`[PixelMark Drawer] screenshot received: ${hasScreenshot ? 'yes' : 'no'} strategy=${strategy}`);

          if (data.id) {
            const existing = useCaptureStore.getState().capturesById[data.id]
            if (existing) {
              const updatedScreenshots = {
                ...existing.screenshots,
                cropDataUrl: data.screenshotdataurl,
                fullPageDataUrl: data.screenshotdataurl,
                canvasSnapshot: data.canvasSnapshot || data.screenshotdataurl,
                screenshotRequired: !!data.screenshotdataurl
              }
              
              useCaptureStore.getState().updateCaptureDraft(data.id, {
                screenshots: updatedScreenshots,
                screenshottype: data.screenshottype || strategy,
                screenshotttype: data.screenshotttype || strategy,
                screenshotsource: data.screenshotsource || strategy,
                screenshottimestamp: data.screenshottimestamp,
                screenshotdataurl: data.screenshotdataurl,
                screenshotrequired: !!data.screenshotdataurl,
              })

              if (selectedCaptureId === data.id) {
                setCaptureCtx(prev => prev ? {
                  ...prev,
                  screenshot_data_url: data.screenshotdataurl,
                  screenshottype: data.screenshottype || strategy,
                  screenshotttype: data.screenshotttype || strategy,
                  screenshotsource: data.screenshotsource || strategy,
                  screenshottimestamp: data.screenshottimestamp,
                } : null)
              }
            }
          }
          break
        }

        case 'PIXELMARK_SCROLL':
          setScrollPos({ x: data.scrollX || 0, y: data.scrollY || 0 })
          break

        case 'PIXELMARK_RESIZE':
          console.log(`[PixelMark Frame] Resize event: ${data.width}x${data.height}`)
          break

        case 'PIXELMARK_PINS_RESOLVED': {
          console.log(`[PixelMark Pin] recomputed ${data.resolvedPins?.length} markers`)
          
          data.resolvedPins?.forEach((p: any) => {
            if (p.source !== 'none') {
              const existing = useCaptureStore.getState().capturesById[p.id]
              if (existing) {
                useCaptureStore.getState().updateCaptureDraft(p.id, {
                  renderedPosition: { left: p.clientX, top: p.clientY, source: p.source }
                })
              }
            }
          })

          setResolvedPositions(prev => {
            const next = { ...prev }
            data.resolvedPins?.forEach((p: any) => {
              if (p.source !== 'none') {
                next[p.id] = { 
                  clientX: p.clientX, 
                  clientY: p.clientY, 
                  pageX: p.pageX, 
                  pageY: p.pageY, 
                  source: p.source 
                }
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
            if (data.pageUrl && data.pageUrl !== currentUrl) {
              handleSelectPage(data.pageUrl)
            }
            useCaptureStore.getState().selectCapture(data.id)
            useCaptureStore.getState().openFeedbackDrawer(data.id)
          }
          break
        }

        case 'PIXELMARK_DOM_EDIT_SAVE': {
          const { selector, xpath, property, old_value, new_value, element_tag, element_text, page_url } = data
          createEdit(sessionId, {
            session_id: sessionId,
            selector,
            xpath,
            property,
            old_value,
            new_value,
            element_tag,
            element_text,
            page_url,
          }, shareToken).then(() => {
            useUIStore.getState().addToast('Style saved ✓', 'success')
          }).catch(err => {
            useUIStore.getState().addToast('Failed to save style: ' + err.message, 'error')
          })
          break
        }

        case 'EXIT_AUDIT':
          window.location.href = '/dashboard'
          break
      }
    }

    window.addEventListener('message', handleAgentMessage)
    
    const handleCustomOpen = (e: Event) => {
      const customEvent = e as CustomEvent
      const payload = customEvent.detail
      if (payload && payload.id) {
        console.log(`[PixelMark Pins] CustomEvent PIXELMARKOPENFEEDBACKDRAWER received for id=${payload.id}`)
        useCaptureStore.getState().selectCapture(payload.id)
        useCaptureStore.getState().openFeedbackDrawer(payload.id)
        useUIStore.getState().toggleCommandCenter(true)
      }
    }
    window.addEventListener('PIXELMARKOPENFEEDBACKDRAWER', handleCustomOpen)

    return () => {
      window.removeEventListener('message', handleAgentMessage)
      window.removeEventListener('PIXELMARKOPENFEEDBACKDRAWER', handleCustomOpen)
    }
  }, [sessionId, projectId, shareToken, onMarkerCreated, onPageChanged, openFeedbackDrawer, currentUrl, handleSelectPage])

  // Pre-load all edits on session mount
  useEffect(() => {
    if (sessionId) {
      fetchEdits(sessionId, shareToken)
    }
  }, [sessionId, shareToken, fetchEdits])

  // Notify mode and replay edits on page navigation/loading state changes
  useEffect(() => {
    if (isLoading || !iframeRef.current?.contentWindow) return

    // Fetch and replay edits
    fetchEdits(sessionId, shareToken).then(() => {
      const latestEdits = useDOMEditStore.getState().edits
      const filteredEdits = latestEdits.filter(edit => {
        try {
          const editUrl = new URL(edit.page_url)
          const currUrl = new URL(currentUrl)
          return editUrl.pathname === currUrl.pathname && editUrl.search === currUrl.search
        } catch {
          return edit.page_url === currentUrl
        }
      })

      iframeRef.current?.contentWindow?.postMessage({
        type: 'PIXELMARK_REPLAY_EDITS',
        edits: filteredEdits
      }, '*')
    })
  }, [currentUrl, isLoading, sessionId, shareToken, fetchEdits, iframeReady])

  const pinsSignature = JSON.stringify(captures.map(c => {
    const pageX = c.pageX ?? 0
    const pageY = c.pageY ?? 0
    const capScrollX = c.viewport?.scrollX ?? 0
    const capScrollY = c.viewport?.scrollY ?? 0
    const viewportX = c.coordinates?.clientX ?? (pageX - capScrollX)
    const viewportY = c.coordinates?.clientY ?? (pageY - capScrollY)

    return {
      id: c.id,
      selector: c.selector ?? c.target?.selector,
      xpath: c.xpath ?? c.target?.xpath,
      boundingBox: c.boundingBox,
      x: pageX,
      y: pageY,
      viewportX,
      viewportY,
      scrollPosition: {
        x: capScrollX,
        y: capScrollY
      },
      pageUrl: c.pageUrl
    }
  }))

  useEffect(() => {
    if (isLoading || !iframeRef.current?.contentWindow) return

    const pins = JSON.parse(pinsSignature)

    console.log(`[PixelMark Pin] tracking ${pins.length} pins`)
    iframeRef.current.contentWindow.postMessage({
      type: 'PIXELMARK_TRACK_PINS',
      pins
    }, '*')
  }, [pinsSignature, currentUrl, isLoading])

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
    const cRect = containerRef.current.getBoundingClientRect()
    const iRect = iframeRef.current ? iframeRef.current.getBoundingClientRect() : cRect
    const vx = e.clientX - iRect.left
    const vy = e.clientY - iRect.top

    const bbox = {
      x: vx - 6,
      y: vy - 6,
      width: 12,
      height: 12,
      left: vx - 6,
      top: vy - 6,
      right: vx + 6,
      bottom: vy + 6
    } as any

    const stable = normalizeMarkerCoordinates(e);

    const xPct = ((e.clientX - iRect.left) / iRect.width) * 100
    const yPct = ((e.clientY - iRect.top) / iRect.height) * 100
    setManualCoords({ x: xPct, y: yPct, px: stable.displayX, py: stable.displayY })

    // Build a lightweight context for the drawer
    const manualCtx: CaptureContext = {
      page_url: currentUrl,
      page_title: currentTitle,
      x: stable.pageX,
      y: stable.pageY,
      displayX: stable.displayX,
      displayY: stable.displayY,
      viewport_x: vx,
      viewport_y: vy,
      element_selector: '',
      element_text: '',
      element_tag: 'MANUAL',
      aria_label: null,
      aria_role: null,
      bounding_box: bbox,
      xpath: '',
      renderer_type: rendererType,
      canvas_context: null,
      screenshot_data_url: null,
      screenshot_required: false,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      scroll_position: { x: scrollPos.x, y: scrollPos.y },
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

    if (!issueTitle.trim()) {
      setSubmitError("Issue Title is required.")
      setIsSubmitting(false)
      return
    }

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
          title: issueTitle.trim(),
          description: noteText.trim(),
          status: statusVal,
        }
        console.log('[PixelMark Submit] updating feedback payload:', patch)
        const updated = await api.feedback.update(sessionId, activeId, patch, shareToken)
        console.log('[OBSERVABILITY] [FEEDBACK_UPDATED] Feedback successfully updated on backend. ID =', updated.id)
        
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
          title: updated.title,
          description: updated.description,
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
          title: issueTitle.trim(),
          description: noteText.trim(),
          capturepayload: {
            ...currentCapture,
            userComment: noteText.trim(),
            priority: severity,
            issueType: issueType,
            title: issueTitle.trim(),
            description: noteText.trim(),
            tags: tags.trim(),
          },
          share_token: shareToken || null,
        }

        console.log('[PixelMark Submit] sending feedback payload:', feedbackPayload)
        const created = await api.feedback.create(sessionId, feedbackPayload, shareToken)
        console.log('[OBSERVABILITY] [FEEDBACK_SUBMITTED] Feedback successfully submitted to backend. ID =', created.id)

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
          title: created.title,
          description: created.description,
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
          setIssueTitle('')
          setTags('')
          setSeverity('medium')
          setIssueType('other')
          setSubmitSuccess(false)
        }, 1100)
      }
    } catch (err: unknown) {
      console.warn('[OBSERVABILITY] [API_FAILURE] Feedback submission API call failed:', err)
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
      <ScreenshotPermissionBanner />
      <RegionSelectionOverlay 
        onConfirm={handleRegionConfirm} 
        onCancel={handleRegionCancel} 
      />

      {/* ── Left Sidebar: Collapsible Session Feedback List ── */}
      {projectId === 'public' && isListSidebarOpen && (
        <div className="w-80 h-full border-r border-white/5 bg-[#0d0d14] flex flex-col flex-shrink-0 z-30 select-none animate-in slide-in-from-left duration-300">
          {/* Sidebar Header */}
          <div className="p-4 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-purple-600/20 border border-purple-500/30 flex items-center justify-center">
                <Layers className="w-3.5 h-3.5 text-purple-400" />
              </div>
              <h3 className="text-xs font-black uppercase tracking-widest text-white">Feedback Feed</h3>
              <span className="px-1.5 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-[8px] font-black text-purple-400 font-mono">
                {captures.filter(c => !c.deletedAt && c.visible !== false).length}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsListSidebarOpen(false)}
              className="p-1 rounded-lg text-white/30 hover:text-white hover:bg-white/5 transition-all focus:outline-none"
              title="Close sidebar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Sidebar Feed List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {captures.filter(c => !c.deletedAt && c.visible !== false).length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-white/[0.02] border border-white/[0.04] flex items-center justify-center">
                  <Pin className="w-5 h-5 text-white/20" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest text-white/30">No feedback submitted yet</p>
                <p className="text-[9px] text-white/20 max-w-[180px] leading-relaxed">Drop a pin or click Leave Feedback above to start.</p>
              </div>
            ) : (
              captures
                .filter(c => !c.deletedAt && c.visible !== false)
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .map((item, idx) => {
                  const isSelected = selectedCaptureId === item.id
                  const isSubmitted = item.status === 'submitted'
                  const isResolved = item.status === 'resolved'
                  const isFailed = item.status === 'failed'
                  
                  const markerNumber = captureOrder.indexOf(item.id) + 1
                  
                  // Extract path from pageUrl
                  let pathname = '/'
                  try {
                    const parsed = new URL(item.pageUrl)
                    pathname = parsed.pathname + parsed.search
                  } catch (e) {
                    pathname = item.pageUrl
                  }

                  const screenshotUrl = item.screenshotdataurl || item.screenshots?.cropDataUrl || item.screenshots?.fullPageDataUrl

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={async () => {
                        // If it's a different page, navigate iframe first
                        if (item.pageUrl && item.pageUrl !== currentUrl) {
                          handleSelectPage(item.pageUrl)
                        }
                        useCaptureStore.getState().selectCapture(item.id)
                        useCaptureStore.getState().openFeedbackDrawer(item.id)
                      }}
                      className={cn(
                        "w-full text-left p-3.5 rounded-2xl border transition-all flex flex-col gap-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500",
                        isSelected
                          ? "bg-purple-950/20 border-purple-500/40 shadow-lg shadow-purple-950/20"
                          : "bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.04] hover:border-white/[0.08]"
                      )}
                    >
                      {/* Top metadata row */}
                      <div className="flex items-start justify-between gap-2 w-full">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className={cn(
                            "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white flex-shrink-0",
                            isFailed ? "bg-rose-500" : isResolved ? "bg-green-500" : isSubmitted ? "bg-teal-500" : "bg-purple-600"
                          )}>
                            {markerNumber || idx + 1}
                          </span>
                          <span className="text-[10px] font-black uppercase tracking-wider text-white truncate max-w-[120px]">
                            {item.title || 'Untitled Feedback'}
                          </span>
                        </div>
                        <span className={cn(
                          "px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-wider flex-shrink-0",
                          item.issueType === 'layout' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                          item.issueType === 'copy' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                          item.issueType === 'interaction' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                          item.issueType === 'navigation' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                          item.issueType === 'rendering' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                          'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                        )}>
                          {item.issueType || 'Other'}
                        </span>
                      </div>

                      {/* Comment description */}
                      {item.note && (
                        <p className="text-[10px] text-white/50 line-clamp-2 leading-relaxed">
                          {item.note}
                        </p>
                      )}

                      {/* Bottom row: screenshot indicator, route, time */}
                      <div className="flex items-center justify-between gap-2 text-[8px] font-bold uppercase tracking-widest text-white/30 mt-1">
                        <div className="flex items-center gap-1.5 truncate">
                          {screenshotUrl ? (
                            <svg className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                          ) : (
                            <svg className="w-3.5 h-3.5 text-white/10 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"></path></svg>
                          )}
                          <span className="truncate max-w-[90px] font-mono" title={item.pageUrl}>
                            {pathname}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <span className={cn(
                            "w-1 h-1 rounded-full",
                            item.priority === 'critical' ? 'bg-rose-500' :
                            item.priority === 'high' ? 'bg-orange-500' :
                            item.priority === 'medium' ? 'bg-purple-500' :
                            'bg-blue-500'
                          )} />
                          <span>{item.priority || 'medium'}</span>
                        </div>
                      </div>
                    </button>
                  )
                })
            )}
          </div>
        </div>
      )}

      {/* ── Left: Audit Surface ──────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">

        {/* Top bar */}
        <div className="bg-[#0d0d14] border-b border-white/5 text-white/60 text-xs px-5 h-12 flex items-center justify-between z-20 select-none gap-4">

          {/* Left: back + URL */}
          <div className="flex items-center gap-3 min-w-0">
            {projectId === 'public' && (
              <button
                type="button"
                onClick={() => setIsListSidebarOpen(p => !p)}
                title="Toggle Feedback Feed"
                className={cn(
                  "p-1.5 rounded-xl border transition-all flex-shrink-0 focus:ring-2 focus:ring-purple-500 focus:outline-none",
                  isListSidebarOpen 
                    ? "bg-purple-500/10 border-purple-500/30 text-purple-400"
                    : "bg-white/[0.03] border-white/5 text-white/60 hover:bg-white/5 hover:text-white"
                )}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg>
              </button>
            )}
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

            {/* ── Take Screenshot CTA ────────────────────────────── */}
            <button
              id="take-screenshot-btn"
              aria-label="Take a manual screenshot"
              onClick={() => {
                useScreenshotStore.getState().setMode('region');
              }}
              className="h-8 rounded-xl font-extrabold text-[10px] uppercase tracking-widest px-4 flex items-center gap-1.5 transition-all border border-purple-500/30 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 active:scale-95 focus:ring-2 focus:ring-purple-400 focus:outline-none"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"></path><circle cx="12" cy="13" r="3"></circle></svg>
              Take Screenshot
            </button>

            {/* ── Enable Screen Capture (recovery CTA when permission not granted) ── */}
            {screenshotPermission !== 'granted' && (
              <button
                id="enable-screen-capture-btn"
                aria-label="Enable screen capture"
                onClick={() => {
                  useScreenshotStore.getState().setPermission('pending');
                }}
                className="h-8 rounded-xl font-extrabold text-[10px] uppercase tracking-widest px-4 flex items-center gap-1.5 transition-all border border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 active:scale-95 focus:ring-2 focus:ring-amber-400 focus:outline-none"
              >
                <Zap className="w-3.5 h-3.5 animate-pulse text-amber-400" />
                Enable Captures
              </button>
            )}

            {/* ── PRIMARY CTA: Leave Feedback ────────────────────────────── */}
            <button
              id="leave-feedback-btn"
              aria-label="Leave visual feedback on the page"
              onClick={() => {
                const nextActive = !feedbackModeActive
                setFeedbackModeActive(nextActive)
                const isWebGL = rendererType === 'webgl' || rendererType === 'threejs'
                setManualPlacementMode(nextActive && isWebGL)
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
                  const nextActive = !feedbackModeActive
                  setFeedbackModeActive(nextActive)
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
            className="ph-no-capture"
            style={{ width: '100%', height: '100%', minHeight: '100%', border: 'none', pointerEvents: 'auto', display: 'block' }}
            onLoad={() => {
              setIsLoading(false)
              setIframeReady(true)
            }}
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
                    setIframeReady(false)
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

          {/* ── Marker Pin Layer (Dedicated Portalled Layer) ────────────────── */}
          <MarkerPinLayer
            captures={captures}
            currentUrl={currentUrl}
            scrollPos={scrollPos}
            resolvedPositions={resolvedPositions}
            iframeNode={iframeRef.current}
            selectedCaptureId={selectedCaptureId}
            captureOrder={captureOrder}
            onSelectPin={(id) => {
              useCaptureStore.getState().selectCapture(id)
              useCaptureStore.getState().openFeedbackDrawer(id)
            }}
          />

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
          "bg-[#0d0d14] flex flex-col z-[2147483647] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] absolute",
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
                {isSubmitted ? 'Feedback Item' : isResolved ? 'Fixed Feedback ✓' : 'Leave Feedback'}
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
          <ErrorBoundary>
            <div className="p-5 flex flex-col gap-5 flex-1">

            {/* ── Collapsible Panel: Screenshot (Phase 3.5 Upgrade) ─── */}
            <div className="border-b border-white/5 pb-2">
              <button
                type="button"
                onClick={() => setScreenshotPanelExpanded(p => !p)}
                className="w-full flex items-center justify-between py-2 text-left hover:text-white transition-all focus:outline-none"
              >
                <span className="text-[9px] font-black uppercase tracking-widest text-white/50">Screenshot Evidence</span>
                <ChevronDown className={cn("w-3.5 h-3.5 text-white/30 transition-transform", screenshotPanelExpanded ? "rotate-180" : "")} />
              </button>
              {screenshotPanelExpanded && (
                <div className="mt-2.5">
                  <div className="flex items-center gap-2 mb-3 bg-white/5 p-1 rounded-xl w-fit">
                    {(['element', 'fullpage', 'region'] as const).map(mode => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => useScreenshotStore.getState().setMode(mode)}
                        className={cn(
                          "px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                          screenshotMode === mode
                            ? "bg-purple-600 text-white"
                            : "text-white/40 hover:text-white/70 hover:bg-white/10"
                        )}
                      >
                        {mode === 'element' ? 'Elem (E)' : mode === 'fullpage' ? 'Full (F)' : 'Region (R)'}
                      </button>
                    ))}
                  </div>
                  {(() => {
                    const screenshotUrl = activeCapture?.screenshotdataurl || activeCapture?.screenshots?.cropDataUrl || activeCapture?.screenshots?.fullPageDataUrl || captureCtx?.screenshot_data_url
                    const isScreenshotPending = screenshotUrl === 'pending' || activeCapture?.screenshottype === 'pending' || activeCapture?.screenshotttype === 'pending' || activeCapture?.screenshotsource === 'pending'
                    const source = activeCapture?.screenshotsource || activeCapture?.screenshottype || activeCapture?.screenshotttype || captureCtx?.screenshotsource || captureCtx?.screenshottype || 'unknown'
                    
                    if (screenshotUrl && !isScreenshotPending) {
                      const hasLoadError = imgErrorId === (activeCapture?.id || 'current')
                      if (hasLoadError) {
                        return (
                          <div className="flex flex-col items-center justify-center p-6 bg-white/[0.01] border border-white/[0.04] rounded-2xl min-h-[120px] gap-2">
                            <span className="text-[9px] font-black uppercase tracking-widest text-red-400">Failed to load screenshot</span>
                            <span className="text-[8.5px] text-white/30 font-mono">Image load crashed</span>
                          </div>
                        )
                      }
                      return (
                        <div className="space-y-2">
                          <div className="relative rounded-xl overflow-hidden border border-white/10">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={screenshotUrl}
                              alt="Page snapshot at capture time"
                              className="w-full object-cover"
                              style={{ maxHeight: 240 }}
                              onError={() => setImgErrorId(activeCapture?.id || 'current')}
                            />
                          </div>
                          <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-widest text-white/30 px-1">
                            <span>Page snapshot at capture time</span>
                            <span className="bg-purple-500/20 text-purple-400 border border-purple-500/30 px-1.5 py-0.5 rounded text-[7px] font-mono">
                              Source: {source}
                            </span>
                          </div>
                        </div>
                      )
                    } else if (isScreenshotPending) {
                      return (
                        <div className="flex flex-col items-center justify-center p-6 bg-white/[0.01] border border-white/[0.04] rounded-2xl gap-2 min-h-[120px]">
                          <Loader2 className="w-5 h-5 animate-spin text-purple-500" />
                          <span className="text-[9px] font-black uppercase tracking-widest text-white/40">Generating screenshot...</span>
                        </div>
                      )
                    } else {
                      return (
                        <div className="flex flex-col items-center justify-center p-6 bg-white/[0.01] border border-white/[0.04] rounded-2xl min-h-[100px] gap-3">
                          <span className="text-[9px] font-black uppercase tracking-widest text-white/30">Screenshot unavailable</span>
                          {screenshotPermission !== 'granted' && (
                            <button
                              type="button"
                              onClick={() => {
                                useScreenshotStore.getState().setPermission('pending')
                              }}
                              className="text-[8.5px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border border-purple-500/30 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 transition-all focus:ring-2 focus:ring-purple-400 focus:outline-none"
                            >
                              Enable Screen Capture
                            </button>
                          )}
                        </div>
                      )
                    }
                  })()}
                </div>
              )}
            </div>

            {/* ── Collapsible Panel: DOM Snapshot (Phase 3.5 Upgrade) ── */}
            <div className="border-b border-white/5 pb-2">
              <button
                type="button"
                onClick={() => setDomPanelExpanded(p => !p)}
                className="w-full flex items-center justify-between py-2 text-left hover:text-white transition-all focus:outline-none"
              >
                <span className="text-[9px] font-black uppercase tracking-widest text-white/50">DOM Snapshot</span>
                <ChevronDown className={cn("w-3.5 h-3.5 text-white/30 transition-transform", domPanelExpanded ? "rotate-180" : "")} />
              </button>
              {domPanelExpanded && (
                <div className="mt-2.5 space-y-3">
                  {(() => {
                    const domSnapshot = activeCapture?.domsnapshot || null
                    const tag = domSnapshot?.tagname || activeCapture?.target?.tagName || captureCtx?.element_tag || 'UNKNOWN'
                    const elemId = domSnapshot?.id || activeCapture?.target?.elementId || captureCtx?.element_id || ''
                    const selector = domSnapshot?.cssselector || activeCapture?.target?.selector || captureCtx?.element_selector || ''
                    const innerText = domSnapshot?.innerText || activeCapture?.target?.text || captureCtx?.element_text || ''
                    const ancestors = domSnapshot?.ancestors || domSnapshot?.ancestorChain || []
                    const bbox = domSnapshot?.boundingBox || activeCapture?.boundingBox || captureCtx?.bounding_box
                    const innerHTML = domSnapshot?.innerHTML || ''

                    // Ancestor Breadcrumb
                    const breadcrumbParts = (ancestors || []).map((a: any) => {
                      const aTag = (a.tagname || a.tagName || 'div').toLowerCase()
                      const aId = a.id ? `#${a.id}` : ''
                      return `${aTag}${aId}`
                    })
                    breadcrumbParts.reverse()
                    breadcrumbParts.push(`${tag.toLowerCase()}${elemId ? `#${elemId}` : ''}`)
                    const breadcrumb = breadcrumbParts.join(' > ')

                    // Computed Styles layout/visual table
                    const styles = domSnapshot?.computedStyles || {}
                    const stylesToDisplay = [
                      { label: 'Display', value: styles.display },
                      { label: 'Position', value: styles.position },
                      { label: 'Width', value: styles.width },
                      { label: 'Height', value: styles.height },
                      { label: 'Z-Index', value: styles.zIndex || styles['z-index'] },
                      { label: 'Visibility', value: styles.visibility },
                      { label: 'Opacity', value: styles.opacity },
                    ].filter(s => s.value)

                    return (
                      <div className="space-y-3">
                        {/* Tag + Id + Selector */}
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[10px] text-purple-300 bg-purple-900/20 px-2 py-0.5 rounded-md font-bold">&lt;{tag.toLowerCase()}&gt;</span>
                            {elemId && <span className="font-mono text-[9px] text-white/40">#{elemId}</span>}
                          </div>
                          {selector && (
                            <code className="text-[9px] text-emerald-400 font-mono block break-all leading-normal">{selector}</code>
                          )}
                        </div>

                        {/* innerText preview */}
                        {innerText && (
                          <div className="text-[10px] text-white/60 bg-white/[0.01] border border-white/[0.04] p-2.5 rounded-xl leading-relaxed italic">
                            "{innerText.slice(0, 120)}{innerText.length > 120 ? '...' : ''}"
                          </div>
                        )}

                        {/* Computed Styles */}
                        <div className="space-y-1">
                          <span className="text-[8px] font-black uppercase tracking-widest text-white/25 block">Computed Styles</span>
                          {stylesToDisplay.length > 0 ? (
                            <div className="grid grid-cols-2 gap-1.5 text-[9px] font-mono bg-white/[0.01] border border-white/[0.04] p-2 rounded-xl">
                              {stylesToDisplay.map((s, idx) => (
                                <div key={idx} className="flex justify-between border-b border-white/[0.03] pb-1">
                                  <span className="text-white/40">{s.label}:</span>
                                  <span className="text-purple-300 font-bold truncate max-w-[100px]">{s.value}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[9px] text-white/30 italic pl-1">No computed styles available</span>
                          )}
                        </div>

                        {/* Ancestor chain breadcrumb */}
                        <div className="space-y-1">
                          <span className="text-[8px] font-black uppercase tracking-widest text-white/20 block">Ancestor Breadcrumb</span>
                          <div className="text-[9px] font-mono text-white/60 bg-white/[0.01] border border-white/[0.04] p-2 rounded-xl break-all">
                            {breadcrumb}
                          </div>
                        </div>

                        {/* Bounding Box */}
                        {bbox && (
                          <div className="text-[9px] font-mono text-white/40 pl-1">
                            Bounds: {Math.round(bbox.width || 0)}×{Math.round(bbox.height || 0)} px @ ({Math.round(bbox.left || bbox.x || 0)}, {Math.round(bbox.top || bbox.y || 0)})
                          </div>
                        )}

                        {/* Collapsible innerHTML */}
                        {innerHTML && (
                          <div className="border border-white/5 rounded-xl overflow-hidden mt-2">
                            <button
                              type="button"
                              onClick={() => setInnerHTMLPanelExpanded(p => !p)}
                              className="w-full flex items-center justify-between px-3 py-1.5 bg-white/[0.02] hover:bg-white/[0.04] text-[9px] font-bold uppercase tracking-wider text-white/40 focus:outline-none"
                            >
                              <span>View innerHTML</span>
                              <ChevronDown className={cn("w-3.5 h-3.5 text-white/30 transition-transform", innerHTMLPanelExpanded ? "rotate-180" : "")} />
                            </button>
                            {innerHTMLPanelExpanded && (
                              <div className="p-3 bg-black/40 text-[9px] font-mono text-emerald-400 break-all whitespace-pre-wrap max-h-48 overflow-y-auto">
                                {innerHTML.slice(0, 800)}{innerHTML.length > 800 ? '\n... [truncated]' : ''}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })()}
                </div>
              )}
            </div>

            {/* ── Collapsible Panel: Canvas details (Phase 3.5 Upgrade) ── */}
            {(() => {
              const canvasCtx = activeCapture?.canvasContext || captureCtx?.canvas_context
              const canvasDom = activeCapture?.canvasdomsnapshot || null
              const isCanvasRenderer = activeCapture?.rendererType === 'webgl' || activeCapture?.rendererType === 'threejs' || activeCapture?.rendererType === 'mixed' || !!canvasCtx || !!canvasDom

              if (!isCanvasRenderer) return null
              return (
                <div className="border-b border-white/5 pb-2">
                  <button
                    type="button"
                    onClick={() => setCanvasPanelExpanded(p => !p)}
                    className="w-full flex items-center justify-between py-2 text-left hover:text-white transition-all focus:outline-none"
                  >
                    <span className="text-[9px] font-black uppercase tracking-widest text-white/50">Canvas & WebGL Details</span>
                    <ChevronDown className={cn("w-3.5 h-3.5 text-white/30 transition-transform", canvasPanelExpanded ? "rotate-180" : "")} />
                  </button>
                  {canvasPanelExpanded && (
                    <div className="mt-2.5 space-y-2.5 bg-white/[0.01] border border-white/[0.04] p-3 rounded-2xl">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-white/40">Context Type:</span>
                        <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase">
                          {canvasDom?.activeContextType || canvasCtx?.type || 'unknown'}
                        </span>
                      </div>
                      
                      {canvasDom?.isFullscreen && (
                        <div className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[8px] font-black uppercase tracking-wider">
                          Fullscreen Canvas
                        </div>
                      )}
                      
                      {canvasDom?.boundingBox && (
                        <div className="flex justify-between">
                          <span className="text-[10px] text-white/40">CSS Rect Size:</span>
                          <span className="text-[10px] font-mono text-white/70">
                            {Math.round(canvasDom.boundingBox.width)}×{Math.round(canvasDom.boundingBox.height)} px
                          </span>
                        </div>
                      )}

                      {canvasCtx?.hit_detail && (
                        <div className="mt-2 pt-2 border-t border-white/5 space-y-1">
                          <span className="text-[8px] font-black uppercase tracking-widest text-white/25 block">Three.js Intersect Hit</span>
                          {canvasCtx.hit_detail.object_name && (
                            <div className="flex justify-between text-[9px]">
                              <span className="text-white/40">Object Name:</span>
                              <span className="font-mono text-purple-300">{canvasCtx.hit_detail.object_name}</span>
                            </div>
                          )}
                          {canvasCtx.hit_detail.object_type && (
                            <div className="flex justify-between text-[9px]">
                              <span className="text-white/40">Object Type:</span>
                              <span className="font-mono text-white/70">{canvasCtx.hit_detail.object_type}</span>
                            </div>
                          )}
                          {canvasCtx.hit_detail.distance !== undefined && (
                            <div className="flex justify-between text-[9px]">
                              <span className="text-white/40">Distance:</span>
                              <span className="font-mono text-white/70">{Number(canvasCtx.hit_detail.distance).toFixed(2)}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })()}

            {/* ── Collapsible Panel: Diagnostics (Phase 3.5 Upgrade) ─── */}
            <div className="border-b border-white/5 pb-2">
              <button
                type="button"
                onClick={() => setDiagnosticsPanelExpanded(p => !p)}
                className="w-full flex items-center justify-between py-2 text-left hover:text-white transition-all focus:outline-none"
              >
                <span className="text-[9px] font-black uppercase tracking-widest text-white/50">Diagnostics & Logs</span>
                <ChevronDown className={cn("w-3.5 h-3.5 text-white/30 transition-transform", diagnosticsPanelExpanded ? "rotate-180" : "")} />
              </button>
              {diagnosticsPanelExpanded && (
                <div className="mt-2.5 space-y-3">
                  {/* Browser Info */}
                  {(() => {
                    const browserInfo = activeCapture?.diagnostics?.browserInfo || captureCtx?.browser_info
                    if (!browserInfo) return null
                    return (
                      <div className="bg-white/[0.01] border border-white/[0.04] p-2.5 rounded-xl text-[10px] space-y-1">
                        <span className="text-[8px] font-black uppercase tracking-widest text-white/20 block">Browser environment</span>
                        <div className="flex justify-between">
                          <span className="text-white/40">Browser:</span>
                          <span className="text-white/70">{browserInfo.name || 'Unknown'} {browserInfo.version || ''}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/40">OS:</span>
                          <span className="text-white/70">{browserInfo.os || 'Unknown'}</span>
                        </div>
                      </div>
                    )
                  })()}

                  {/* Console Errors */}
                  <CollapsibleList
                    title="Console Errors"
                    count={activeCapture?.diagnostics?.consoleErrors?.length || captureCtx?.console_errors?.length || 0}
                    items={activeCapture?.diagnostics?.consoleErrors || captureCtx?.console_errors || []}
                    renderItem={(err, idx) => (
                      <div key={idx} className="text-[9px] font-mono text-rose-400 bg-rose-950/10 border border-rose-900/20 p-2 rounded-lg break-all">
                        {err.message || String(err)}
                      </div>
                    )}
                  />

                  {/* Network Errors */}
                  <CollapsibleList
                    title="Network Errors"
                    count={activeCapture?.diagnostics?.networkErrors?.length || captureCtx?.network_errors?.length || 0}
                    items={activeCapture?.diagnostics?.networkErrors || captureCtx?.network_errors || []}
                    renderItem={(err, idx) => (
                      <div key={idx} className="text-[9px] font-mono text-rose-400 bg-rose-950/10 border border-rose-900/20 p-2 rounded-lg break-all">
                        ❌ {err.method || 'GET'} {err.url || 'Unknown URL'} ({err.status || 'Failed'})
                      </div>
                    )}
                  />
                </div>
              )}
            </div>

            {/* ── Issue Title ─────────────────────────────────────────── */}
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase tracking-widest text-white/40 block">
                Issue Title <span className="text-purple-400">*</span>
              </label>
              <input
                type="text"
                required
                disabled={isFormReadOnly}
                placeholder="e.g. Navigation overlaps logo, Button hover broken"
                value={issueTitle}
                onChange={(e) => setIssueTitle(e.target.value)}
                className="w-full h-11 bg-white/[0.03] border border-white/[0.08] text-white placeholder:text-white/20 px-4 rounded-2xl text-xs focus:ring-2 focus:ring-purple-500 focus:border-purple-500/50 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

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
                      disabled={isFormReadOnly}
                      aria-pressed={active}
                      title={t.description}
                      onClick={() => setIssueType(t.value)}
                      className={cn(
                        "h-9 rounded-xl font-bold text-[9px] uppercase tracking-widest border transition-all flex items-center justify-center gap-1.5 px-2 focus:ring-2 focus:ring-purple-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed",
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
                disabled={isFormReadOnly}
                placeholder="What's wrong here? e.g. 'Button doesn't respond on mobile', 'Text overlaps the image'…"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/[0.08] text-white placeholder:text-white/20 p-4 rounded-2xl text-xs focus:ring-2 focus:ring-purple-500 focus:border-purple-500/50 outline-none resize-none leading-relaxed transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            {/* ── Status picker (Phase 5 Workflow) ───────────────────────── */}
            {isSubmitted && (
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-white/40 block">Status</label>
                <div className="relative">
                  <select
                    value={statusVal}
                    onChange={(e) => {
                      const newStatus = e.target.value
                      setStatusVal(newStatus)
                      console.log(`[OBSERVABILITY] [STATUS_CHANGE_DRAFT] Draft status changed to: ${newStatus}`)
                    }}
                    className="w-full h-11 bg-[#0f0f15] border border-white/[0.08] text-white px-4 rounded-2xl text-xs focus:ring-2 focus:ring-purple-500 focus:border-purple-500/50 outline-none transition-all cursor-pointer appearance-none"
                  >
                    <option value="new">Waiting</option>
                    <option value="triaged">Triaged</option>
                    <option value="in_progress">Being Fixed</option>
                    <option value="resolved">Fixed ✓</option>
                    <option value="dismissed">Dismissed</option>
                  </select>
                  <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-white/40">
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </div>
              </div>
            )}

            {/* ── Severity picker ─────────────────────────────────────── */}
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase tracking-widest text-white/40 block">Severity</label>
              <div className="grid grid-cols-4 gap-1.5">
                {(['low', 'medium', 'high', 'critical'] as Severity[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    disabled={isFormReadOnly}
                    aria-pressed={severity === s}
                    onClick={() => setSeverity(s)}
                    className={cn(
                      "h-8 rounded-xl font-bold text-[8px] uppercase tracking-widest border transition-all focus:ring-2 focus:ring-purple-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed",
                      severity === s
                        ? s === 'critical' ? 'bg-rose-600 border-rose-500 text-white shadow-lg' :
                          s === 'high' ? 'bg-orange-600 border-orange-500 text-white shadow-lg' :
                          s === 'medium' ? 'bg-purple-600 border-purple-500 text-white shadow-lg' :
                          'bg-blue-600 border-blue-500 text-white shadow-lg'
                        : 'bg-white/[0.03] border-white/[0.06] text-white/40 hover:bg-white/[0.07] hover:text-white/60'
                    )}
                  >
                    {s === 'medium' ? 'Needs Work' : s === 'low' ? 'Looks Good' : s}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Optional Tags ────────────────────────────────────────── */}
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase tracking-widest text-white/40 block">
                Tags <span className="text-white/25">(optional, comma-separated)</span>
              </label>
              <input
                type="text"
                disabled={isFormReadOnly}
                placeholder="e.g. mobile, bug, layout"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="w-full h-11 bg-white/[0.03] border border-white/[0.08] text-white placeholder:text-white/20 px-4 rounded-2xl text-xs focus:ring-2 focus:ring-purple-500 focus:border-purple-500/50 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              />
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
                {isFormReadOnly ? (
                  <button
                    type="button"
                    disabled
                    className="h-12 w-full rounded-2xl bg-green-500/10 border border-green-500/20 text-green-400 font-extrabold text-[10px] uppercase tracking-widest cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    Fixed ✓ (Read Only)
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
                  const id = activeCapture.id;
                  useCaptureStore.getState().removeLocalCapture(id);
                  useCaptureStore.getState().selectCapture(null);
                  useCaptureStore.getState().closeFeedbackDrawer();
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
        </ErrorBoundary>
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
