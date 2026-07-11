'use client'

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Loader2, ArrowLeft, Share2, PanelRightClose, PanelRightOpen, AlertCircle, BarChart3, Sparkles, ChevronDown, ExternalLink, MapPin, Eye, Zap } from 'lucide-react'
import { useScreenshotStore } from '@/store/screenshotStore'
import { Button } from '@/components/ui/button'
import { ExportPanel } from '@/components/ExportPanel'
import { ReportEmailModal } from '@/components/ReportEmailModal'
import { DesignSystemPanel } from '@/components/DesignSystemPanel'
import { ShareLinkPanel } from '@/components/share/ShareLinkPanel'
import { ShareLinkButton } from '@/components/share/ShareLinkButton'
import FeedbackFeed from '@/components/FeedbackFeed'
import FeedbackAnalyticsPanel from '@/components/FeedbackAnalyticsPanel'
import { Palette } from 'lucide-react'
import { AuditSurface } from '@/components/audit/AuditSurface'
import { api } from '@/lib/api'
import { Suspense } from 'react'
import { ObservationDetails } from '@/components/audit/ObservationDetails'

import { useRealtimeSync } from '@/hooks/useRealtimeSync'
import { useSessionSocket } from '@/lib/useSessionSocket'

import { useScreenCapture } from '@/hooks/useScreenCapture'
import { useViewportHeight } from '@/hooks/useViewportHeight'
import { useProjectStore } from '@/store/projectStore'
import { useRealtimeStore } from '@/store/realtimeStore'
import { useMarkerStore } from '@/store/markerStore'

import { useUIStore } from '@/store/uiStore'
import { useSessionStore } from '@/store/sessionStore'
import { cn } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'
import { ThemeSegmentedControl } from '@/components/ThemeToggle'

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '')
const WS_BASE  = (process.env.NEXT_PUBLIC_WS_BASE  || '').replace(/\/$/, '')

const drawerVariants = {
  open: { x: 0, y: 0 },
  closed: (custom: { isMobile: boolean; isDesktop: boolean }) => ({
    x: custom.isDesktop ? 400 : (custom.isMobile ? 0 : "100%"),
    y: custom.isMobile ? "100%" : 0
  })
}

function ProjectPageContent() {
  const [hasMounted, setHasMounted] = useState(false)
  useEffect(() => {
    setHasMounted(true)
  }, [])

  const isMobile = hasMounted ? window.innerWidth < 768 : false
  const isDesktop = hasMounted ? window.innerWidth >= 1024 : false
  const params = useParams()
  const id = typeof params.id === 'string' ? params.id : Array.isArray(params.id) ? params.id[0] : ''
  const router = useRouter()
  const searchParams = useSearchParams()
  const querySessionId = searchParams.get('session')
  const view = searchParams.get('view') || 'canvas'

  // Granular Stores
  const { 
    projects, 
    currentProject, 
    fetchProjects, 
    setCurrentProject,
    loading: isProjectLoading, 
    error: projectError 
  } = useProjectStore()
  
  const markerCount = useMarkerStore(state => state.orderedMarkerIds.length)

  const { activeTesters, setConnected, updateCursor } = useRealtimeStore()
  
  const { 
    isCommandCenterOpen, 
    isExportPanelOpen, 
    isDesignSystemOpen,
    isSharePanelOpen,
    isAnalyticsOpen,
    toggleCommandCenter, 
    toggleExportPanel,
    toggleDesignSystem,
    toggleSharePanel,
    toggleAnalytics
  } = useUIStore()

  const { heavy_mode, renderer_type } = useSessionStore()
  
  const [proxyStatus, setProxyStatus] = useState<'loading' | 'ok' | 'advanced' | 'failed'>('loading')
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const lastEmitRef = useRef(0)
  
  const screenCapture = useScreenCapture()
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [showReportEmailModal, setShowReportEmailModal] = useState(false)
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false)
  const addToast = useUIStore(s => s.addToast)
  const viewportHeight = useViewportHeight()

  const handleGenerateReport = useCallback(() => {
    if (!sessionId) return
    const reportUrl = `${window.location.origin}/report/${sessionId}`
    navigator.clipboard.writeText(reportUrl)
      .then(() => {
        addToast('Report link copied — share this with your client', 'success')
      })
      .catch(() => {
        addToast('Failed to copy link, but opening email client option...', 'error')
      })
    setShowReportEmailModal(true)
  }, [sessionId, addToast])

  const handleJumpToCanvas = useCallback((markerId: string) => {
    useMarkerStore.getState().selectMarker(markerId)
    const url = new URL(window.location.href)
    url.searchParams.set('view', 'canvas')
    router.push(url.pathname + url.search)
  }, [router])

  // Retrieve or create active audit session on mount
  useEffect(() => {
    if (!id) return
    async function initSession() {
      try {
        if (querySessionId) {
          setSessionId(querySessionId)
          return
        }
        const list = await api.sessions.getSessions(id)
        if (list && list.length > 0) {
          // Use most recent session
          const sorted = list.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          setSessionId(sorted[0].id)
        } else {
          // Create a new session
          const newSession = await api.sessions.createSession({ 
            project_id: id, 
            title: `Review Session - ${new Date().toLocaleDateString()}` 
          })
          setSessionId(newSession.id)
        }
      } catch (err) {
        console.error("Failed to resolve session:", err)
      }
    }
    initSession()
  }, [id, querySessionId])

  // Below tablet breakpoint or in heavy mode, collapse the command center by default on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (window.innerWidth < 1024 || heavy_mode) {
        toggleCommandCenter(false)
      } else {
        toggleCommandCenter(true)
      }
    }
  }, [toggleCommandCenter, heavy_mode])

  // A11y Focus Management: shift focus to close button when opened, restore to trigger when closed
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (isCommandCenterOpen) {
      setTimeout(() => {
        const closeBtn = document.getElementById('close-command-center-btn') || document.getElementById('command-center-trigger')
        if (closeBtn) closeBtn.focus()
      }, 150)
    } else {
      const triggerBtn = document.getElementById('command-center-trigger')
      if (triggerBtn) {
        setTimeout(() => triggerBtn.focus(), 150)
      }
    }
  }, [isCommandCenterOpen])

  // Escape key listener to dismiss command center drawer on mobile/tablet
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isCommandCenterOpen) {
        toggleCommandCenter(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isCommandCenterOpen, toggleCommandCenter])

  // Listen for window resize to recover and adapt layout state cleanly
  useEffect(() => {
    if (typeof window === 'undefined') return
    let wasMobile = window.innerWidth < 768
    
    const handleResize = () => {
      const isMobile = window.innerWidth < 768
      if (isMobile !== wasMobile) {
        if (isMobile) {
          toggleCommandCenter(false)
        } else {
          toggleCommandCenter(true)
        }
        wasMobile = isMobile
      }
    }
    
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [toggleCommandCenter])

  // One-time init — offer screen capture when user first holds Ctrl
  useEffect(() => {
    const onFirstCtrl = async (e: KeyboardEvent) => {
      if (e.key !== 'Control') return
      if (screenCapture.isActive()) return
      await screenCapture.init()
    }
    window.addEventListener('keydown', onFirstCtrl)
    return () => window.removeEventListener('keydown', onFirstCtrl)
  }, [screenCapture])

  // Real-time synchronization callback
  const onMessage = useCallback((msg: any) => {
    switch (msg.type) {
      case 'COMMENT_TRIAGED':
        // Legacy event: triage data now arrives as a marker_updated realtime event.
        // If the server sends a marker payload, upsert it; otherwise silently ignore.
        if (msg.marker) {
          useMarkerStore.getState().upsertMarkerFromServer(msg.marker)
        }
        break

      case 'NEW_COMMENT':
        // Legacy event: new feedback pins now arrive as marker_created realtime events.
        if (msg.marker) {
          useMarkerStore.getState().upsertMarkerFromServer(msg.marker)
        }
        break

      case 'CURSOR_MOVE':
        updateCursor(msg.tester_id, msg.x, msg.y, msg.name || msg.tester_name)
        break

      default:
        // Forward all other events (marker_created, marker_updated, marker_deleted,
        // session_snapshot, presence_updated, etc.) to the marker store handler.
        useMarkerStore.getState().handleRealtimeEvent(msg)
        break
    }
  }, [updateCursor])

  const { connected, send } = useRealtimeSync({
    projectId: id,
    onMessage,
    enabled: !!id
  })

  const actor = useMemo(() => {
    return { id: 'developer-user', role: 'developer' as const }
  }, [])

  useSessionSocket(sessionId || '', actor)


  // Initial Sync
  useEffect(() => {
    if (!id) return
    
    async function init() {
      await fetchProjects()
      const found = useProjectStore.getState().projects.find(p => p.id === id)
      if (found) setCurrentProject(found)
    }

    init()
  }, [id, fetchProjects, setCurrentProject])

  // Mouse Tracking
  const handleMouseMove = (e: React.MouseEvent) => {
    if (heavy_mode) return // Skip mouse cursor sync in heavy mode to reduce pointer listeners complexity
    const now = Date.now()
    if (now - lastEmitRef.current < 50) return
    lastEmitRef.current = now

    if (connected) {
      const rect = e.currentTarget.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * 100
      const y = ((e.clientY - rect.top) / rect.height) * 100

      send({
        type: 'CURSOR_MOVE',
        tester_id: localStorage.getItem('tester_id'),
        tester_name: localStorage.getItem('tester_name'),
        x, y
      })
    }
  }

  if (isProjectLoading) return (
    <div className="h-screen bg-pm-bg flex flex-col items-center justify-center space-y-4 overflow-hidden font-sans selection:bg-pm-cyan/20 transition-colors duration-300">
      <Loader2 className="w-8 h-8 animate-spin text-pm-accent" />
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-pm-muted">Hydrating Project Surface</p>
    </div>
  )

  const error = projectError
  if (error) return (
    <div className="h-screen bg-pm-bg flex items-center justify-center p-6 text-center transition-colors duration-300">
      <div className="max-w-md space-y-6">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <div>
          <h1 className="text-xl font-black tracking-tighter text-pm-text mb-2">Connection Blocked</h1>
          <p className="text-pm-muted text-xs font-mono uppercase leading-relaxed">{typeof error === 'string' ? error : 'Failed to synchronize with review substrate'}</p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => window.location.reload()}
          className="rounded-full px-8 bg-pm-surface-2 border-pm-border text-pm-text text-[10px] font-black uppercase tracking-widest hover:bg-pm-surface-3 transition-all"
        >
          Re-engage Substrate
        </Button>
      </div>
    </div>
  )

  const pageStyle = viewportHeight > 0 ? { height: `${viewportHeight}px` } : {}

  return (
    <div 
      style={pageStyle}
      className="h-screen flex flex-col overflow-hidden font-sans bg-pm-bg text-pm-text selection:bg-pm-cyan/20 transition-colors duration-300"
    >
      {/* Premium Navigation Header - Slim Adaptive Theme */}
      <header className="h-14 border-b border-pm-border bg-pm-surface flex items-center justify-between px-4 md:px-6 z-45 relative gap-4 flex-shrink-0 shadow-sm transition-all duration-300">
        <div className="flex items-center gap-4 min-w-0">
          <button 
            onClick={() => router.push('/dashboard')}
            className="w-9 h-9 rounded-xl flex items-center justify-center border border-pm-border bg-pm-surface text-pm-muted hover:text-pm-text hover:bg-pm-surface-2 transition-all flex-shrink-0 cursor-pointer shadow-sm"
            title="Return to Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          
          <div className="h-8 w-[1px] bg-pm-border hidden sm:block flex-shrink-0" />
          
          <div className="min-w-0 flex items-center gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-extrabold tracking-tight text-pm-text truncate max-w-[150px] sm:max-w-xs">
                  {currentProject?.name}
                </h1>
                <span className="px-2 py-0.5 rounded-full border border-pm-border bg-pm-surface-2 text-pm-text text-[8px] font-black uppercase tracking-widest flex-shrink-0">
                  Active Review
                </span>
                
                {/* Live Sync connection indicator */}
                <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
                  <span className={cn("w-1.5 h-1.5 rounded-full", connected ? "bg-emerald-500 animate-pulse" : "bg-rose-500")} />
                  <span className="text-[8.5px] font-mono font-black uppercase tracking-widest text-pm-muted">
                    {connected ? 'Live Sync' : 'Offline'}
                  </span>
                </div>
              </div>
              <p className="text-[9px] font-bold uppercase tracking-wider mt-0.5 font-mono text-pm-muted truncate max-w-[150px] sm:max-w-xs">
                {currentProject?.url}
              </p>
            </div>

            {/* In-Session View Switcher Tabs - Segmented Control */}
            <div className="hidden md:flex p-0.5 rounded-xl border border-pm-border bg-pm-surface-2 flex-shrink-0 transition-colors duration-300">
              <button
                type="button"
                onClick={() => {
                  const url = new URL(window.location.href)
                  url.searchParams.set('view', 'canvas')
                  router.push(url.pathname + url.search)
                }}
                className={cn(
                  "px-3.5 h-7.5 rounded-lg text-[9.5px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 focus:outline-none cursor-pointer",
                  view !== 'details'
                    ? "bg-pm-surface text-pm-text shadow-sm border border-pm-border"
                    : "text-pm-muted hover:text-pm-text"
                )}
              >
                Audit Canvas
              </button>
              <button
                type="button"
                onClick={() => {
                  const url = new URL(window.location.href)
                  url.searchParams.set('view', 'details')
                  router.push(url.pathname + url.search)
                }}
                className={cn(
                  "px-3.5 h-7.5 rounded-lg text-[9.5px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 focus:outline-none cursor-pointer",
                  view === 'details'
                    ? "bg-pm-surface text-pm-text shadow-sm border border-pm-border"
                    : "text-pm-muted hover:text-pm-text"
                )}
              >
                Observation Details
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 justify-end flex-shrink-0">
          {/* Drop Pin Guide Label for Non-Technical Clients */}
          {view !== 'details' && (
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-pm-cyan/10 border border-pm-border text-pm-text text-[9.5px] font-black uppercase tracking-widest font-mono transition-colors duration-300">
              <MapPin className="w-3.5 h-3.5 text-pm-cyan" />
              Click Canvas to Pin Feedback
            </div>
          )}

          {/* More Actions Dropdown Menu */}
          <div className="relative">
            <button
              onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
              className="h-9 px-3 rounded-xl border border-pm-border bg-pm-surface text-pm-muted font-bold text-xs uppercase tracking-wider hover:bg-pm-surface-2 flex items-center gap-1.5 focus:outline-none cursor-pointer transition-all shadow-sm"
            >
              <span>Actions</span>
              <ChevronDown className="w-3.5 h-3.5 text-pm-muted" />
            </button>
            
            <AnimatePresence>
              {isMoreMenuOpen && (
                <>
                  <div className="fixed inset-0 z-50" onClick={() => setIsMoreMenuOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    transition={{ duration: 0.12, ease: "easeOut" }}
                    className="absolute right-0 mt-2 w-56 rounded-2xl bg-pm-surface border border-pm-border shadow-xl z-55 py-2 flex flex-col select-none text-pm-text"
                  >
                    <ThemeSegmentedControl />
                    {view !== 'details' && (
                      <>
                        {/* Aesthetics Panel Toggle */}
                        <button
                          onClick={() => {
                            toggleDesignSystem()
                            setIsMoreMenuOpen(false)
                          }}
                          className={cn(
                            "flex items-center gap-2.5 px-4.5 py-2 text-xs font-bold uppercase tracking-wider text-left transition-colors hover:bg-pm-surface-2",
                            isDesignSystemOpen ? "text-pm-text bg-pm-surface-3" : "text-pm-muted"
                          )}
                        >
                          <Palette className="w-4 h-4 text-pm-muted" />
                          Aesthetics Controller
                        </button>
                        
                        {/* Analytics Panel Toggle */}
                        <button
                          onClick={() => {
                            toggleAnalytics()
                            setIsMoreMenuOpen(false)
                          }}
                          className={cn(
                            "flex items-center gap-2.5 px-4.5 py-2 text-xs font-bold uppercase tracking-wider text-left transition-colors hover:bg-pm-surface-2",
                            isAnalyticsOpen ? "text-pm-text bg-pm-surface-3" : "text-pm-muted"
                          )}
                        >
                          <BarChart3 className="w-4 h-4 text-pm-muted" />
                          Session Analytics
                        </button>
                        
                        <div className="h-[1px] bg-pm-border my-1" />
                      </>
                    )}

                    {/* Download Report Toggle */}
                    <button
                      onClick={() => {
                        toggleExportPanel()
                        setIsMoreMenuOpen(false)
                      }}
                      className={cn(
                        "flex items-center gap-2.5 px-4.5 py-2 text-xs font-bold uppercase tracking-wider text-left transition-colors hover:bg-pm-surface-2",
                        isExportPanelOpen ? "text-pm-text bg-pm-surface-3" : "text-pm-muted"
                      )}
                    >
                      <Share2 className="w-4 h-4 text-pm-muted" />
                      Download Report
                    </button>

                    {/* AI report generation */}
                    <button
                      onClick={() => {
                        handleGenerateReport()
                        setIsMoreMenuOpen(false)
                      }}
                      className="flex items-center gap-2.5 px-4.5 py-2 text-xs font-bold uppercase tracking-wider text-left transition-colors hover:bg-pm-surface-2 text-indigo-600 dark:text-indigo-400"
                    >
                      <Sparkles className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                      AI Review Report ✨
                    </button>

                    {/* Share Link Toggle */}
                    <button
                      onClick={() => {
                        toggleSharePanel()
                        setIsMoreMenuOpen(false)
                      }}
                      className={cn(
                        "flex items-center gap-2.5 px-4.5 py-2 text-xs font-bold uppercase tracking-wider text-left transition-colors hover:bg-pm-surface-2",
                        isSharePanelOpen ? "text-pm-text bg-pm-surface-3" : "text-pm-muted"
                      )}
                    >
                      <ExternalLink className="w-4 h-4 text-pm-muted" />
                      Share Session Link
                    </button>

                    <div className="h-[1px] bg-pm-border my-1" />

                    {/* Take Screenshot */}
                    <button
                      onClick={() => {
                        setIsMoreMenuOpen(false)
                        useScreenshotStore.getState().setMode('region')
                      }}
                      className="flex items-center gap-2.5 px-4.5 py-2 text-xs font-bold uppercase tracking-wider text-left transition-colors hover:bg-pm-surface-2 text-pm-muted"
                    >
                      <svg className="w-4 h-4 text-pm-muted" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><circle cx="12" cy="13" r="3"></circle></svg>
                      Take Screenshot
                    </button>

                    {/* Capture Frame */}
                    <button
                      onClick={() => {
                        setIsMoreMenuOpen(false)
                        window.postMessage({ type: 'PIXELMARK_TRIGGER_FRAME_CAPTURE_GLOBAL' }, '*')
                      }}
                      className="flex items-center gap-2.5 px-4.5 py-2 text-xs font-bold uppercase tracking-wider text-left transition-colors hover:bg-pm-surface-2 text-pm-muted"
                    >
                      <Eye className="w-4 h-4 text-pm-muted" />
                      Capture Frame
                    </button>

                    {/* Enable Captures */}
                    <button
                      onClick={() => {
                        setIsMoreMenuOpen(false)
                        useScreenshotStore.getState().setPermission('pending')
                      }}
                      className="flex items-center gap-2.5 px-4.5 py-2 text-xs font-bold uppercase tracking-wider text-left transition-colors hover:bg-pm-surface-2 text-amber-600 dark:text-amber-400"
                    >
                      <Zap className="w-4 h-4 text-amber-500" />
                      Enable Captures
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* Feedback Feed Drawer Toggle Button */}
          {view !== 'details' && (
            <>
              <div className="h-6 w-[1px] bg-pm-border" />
              <button 
                id="command-center-trigger"
                aria-label="Toggle Feedback Feed"
                aria-controls="command-center-drawer"
                aria-expanded={isCommandCenterOpen}
                onClick={() => toggleCommandCenter()}
                className={cn(
                  "h-9 px-4 rounded-xl border text-[9.5px] font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all shadow-sm focus:outline-none",
                  isCommandCenterOpen 
                    ? "bg-pm-surface-3 border-pm-border text-pm-text" 
                    : "bg-pm-surface border-pm-border text-pm-muted hover:text-pm-text hover:bg-pm-surface-2"
                )}
              >
                {isCommandCenterOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
                <span className="hidden sm:inline">Open Feedback</span>
                {markerCount > 0 && (
                  <span className="bg-pm-accent text-white text-[8.5px] font-mono font-black px-1.5 py-0.5 rounded-md ml-1 animate-pulse">
                    {markerCount}
                  </span>
                )}
              </button>
            </>
          )}
        </div>
      </header>
      
      {/* Main Viewport Substrate */}
      <main className="flex-1 flex overflow-hidden relative" onMouseMove={handleMouseMove}>
        <div className={cn("flex-1 relative h-full overflow-hidden", view === 'details' ? "bg-pm-bg" : "bg-black")}>
          {view === 'details' ? (
            sessionId ? (
              <ObservationDetails 
                sessionId={sessionId}
                projectId={id}
                onJumpToCanvas={handleJumpToCanvas}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-pm-bg">
                 <Loader2 className="w-8 h-8 animate-spin text-pm-accent mb-3" />
                 <p className="text-[10px] font-black uppercase tracking-[0.3em] text-pm-muted/40">Negotiating Review Session</p>
              </div>
            )
          ) : (
            <>
              {/* Status Indicator */}
              <div className={cn(
                "absolute bottom-6 left-6 z-30 px-4 py-2 rounded-2xl backdrop-blur-2xl border transition-all flex items-center gap-3",
                connected ? "bg-green-500/10 border-green-500/20" : "bg-rose-500/10 border-rose-500/20"
              )}>
                <div className={cn("w-2 h-2 rounded-full", connected ? "bg-green-500 animate-pulse" : "bg-rose-500")} />
                <span className={cn("text-[8px] font-black uppercase tracking-widest", connected ? "text-green-400" : "text-rose-400")}>
                  {connected ? 'Substrate Synced' : 'Sync Severed'}
                </span>
              </div>

              <AnimatePresence>
                {isDesignSystemOpen && (
                   <motion.div 
                     initial={{ x: -400, opacity: 0 }}
                     animate={{ x: 0, opacity: 1 }}
                     exit={{ x: -400, opacity: 0 }}
                     className="absolute left-0 top-0 bottom-0 w-full sm:w-[400px] z-50 pointer-events-none"
                   >
                     <div className="p-6 h-full pointer-events-auto">
                        <DesignSystemPanel projectId={id} />
                     </div>
                   </motion.div>
                )}
                {isAnalyticsOpen && (
                   <motion.div 
                     initial={{ x: -400, opacity: 0 }}
                     animate={{ x: 0, opacity: 1 }}
                     exit={{ x: -400, opacity: 0 }}
                     className="absolute left-0 top-0 bottom-0 w-full sm:w-[400px] z-50 pointer-events-none"
                   >
                     <div className="p-6 h-full pointer-events-auto">
                        <FeedbackAnalyticsPanel 
                          sessionId={sessionId} 
                          onClose={() => toggleAnalytics(false)} 
                        />
                     </div>
                   </motion.div>
                )}
              </AnimatePresence>
              
              {/* Interactive Proxy Board - Frame */}
              {proxyStatus === 'failed' ? (
                    <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-pm-bg animate-fade-in">
                       <AlertCircle className="w-12 h-12 text-rose-500 mb-4 opacity-40" />
                       <h3 className="text-pm-text font-black uppercase tracking-widest text-xs mb-2">Proxy Negotiation Failed</h3>
                       <p className="text-[10px] text-pm-muted font-bold uppercase tracking-[0.2em] max-w-sm text-center">Security policies are blocking the iframe. Try switching pages or contact admin.</p>
                       <Button 
                        onClick={() => setProxyStatus('ok')}
                        className="mt-6 rounded-full bg-pm-surface-2 border border-pm-border text-pm-text text-[9px] font-black uppercase hover:bg-pm-surface-3 transition-colors"
                       >
                          Retry Connection
                       </Button>
                    </div>
              ) : (
                    <div className="w-full h-full p-2 bg-pm-bg flex flex-col overflow-hidden">
                      {/* Premium Device Frame Mockup Header */}
                      <div className="h-7.5 rounded-t-xl bg-pm-surface-2 border-t border-x border-pm-border flex items-center justify-between px-4 flex-shrink-0 relative shadow-sm">
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-pm-muted/40" />
                          <div className="w-2 h-2 rounded-full bg-pm-muted/40" />
                          <div className="w-2 h-2 rounded-full bg-pm-muted/40" />
                        </div>
                        <div className="absolute left-1/2 -translate-x-1/2 text-[9px] font-mono text-pm-muted uppercase tracking-widest bg-pm-surface px-4 py-0.5 rounded-md border border-pm-border max-w-[200px] sm:max-w-xs md:max-w-md truncate text-center transition-all">
                          {currentProject?.url || "Audit Canvas Substrate"}
                        </div>
                        <div className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-wider text-pm-muted font-mono">
                          <span className="w-1 h-1 rounded-full bg-pm-accent animate-pulse" />
                          Review Active
                        </div>
                      </div>
                      
                      <div className="flex-1 relative border-b border-x border-pm-border rounded-b-xl overflow-hidden bg-pm-surface-2 shadow-md">
                        {sessionId ? (
                          <AuditSurface
                            sessionId={sessionId}
                            projectId={id}
                            shouldConnectSocket={false}
                            onMarkerCreated={(marker) => {
                              // Refresh markers from server after creation to stay in sync
                              useMarkerStore.getState().loadSessionMarkers(id)
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-pm-bg">
                             <Loader2 className="w-6 h-6 animate-spin text-pm-accent mb-3" />
                             <p className="text-[9px] font-black uppercase tracking-[0.3em] text-pm-muted">Negotiating Review Session</p>
                          </div>
                        )}
                      </div>
                    </div>
              )}
            </>
          )}
        </div>

        {/* Tap-dismiss backdrop overlay for mobile/tablet drawer */}
        <AnimatePresence>
            {view !== 'details' && isCommandCenterOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.6 }}
                    exit={{ opacity: 0 }}
                    onClick={() => toggleCommandCenter(false)}
                    className="absolute inset-0 bg-black/60 z-48 lg:hidden"
                />
            )}
        </AnimatePresence>

        {/* Command Center Slider (Fully Responsive Layout Wrapper) */}
        <AnimatePresence>
            {view !== 'details' && isCommandCenterOpen && (
                <motion.div
                    id="command-center-drawer"
                    role="dialog"
                    aria-label="Feedback Feed Stream"
                    aria-modal="true"
                    custom={{ isMobile, isDesktop }}
                    variants={drawerVariants}
                    initial={false}
                    animate={isCommandCenterOpen ? "open" : "closed"}
                    exit="closed"
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className={cn(
                      "bg-pm-surface shadow-2xl flex flex-col flex-shrink-0 transition-all duration-300 border-pm-border",
                      // Mobile: Bottom sheet styling
                      "w-full h-[60dvh] absolute bottom-0 left-0 right-0 border-t rounded-t-[32px] z-50 overflow-hidden",
                      // Tablet: Side drawer overlay
                      "md:w-[380px] md:h-full md:absolute md:top-0 md:right-0 md:bottom-0 md:left-auto md:border-l md:border-t-0 md:rounded-t-none md:z-50",
                      // Desktop: Side-by-side layout
                      "lg:relative lg:w-[400px] lg:z-40"
                    )}
                >
                    {/* Swipe bar for mobile bottom sheet */}
                    <div className="w-full flex justify-center py-2.5 md:hidden cursor-pointer" onClick={() => toggleCommandCenter()}>
                      <div className="w-12 h-1 rounded-full bg-pm-muted/20 hover:bg-pm-muted/40 transition-colors" />
                    </div>
                    <FeedbackFeed sessionId={sessionId} />
                </motion.div>
            )}
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {isExportPanelOpen && (
            <ExportPanel 
              projectId={id} 
              projectName={currentProject?.name || 'Unknown Project'}
              commentCount={markerCount}
              onClose={() => toggleExportPanel(false)}
            />
        )}
        {isSharePanelOpen && (
          <ShareLinkPanel 
            sessionId={sessionId || ''} 
            onClose={() => toggleSharePanel(false)} 
          />
        )}
        {showReportEmailModal && sessionId && (
          <ReportEmailModal
            sessionId={sessionId}
            projectName={currentProject?.name || 'Project'}
            onClose={() => setShowReportEmailModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

export default function ProjectPage() {
  return (
    <Suspense fallback={
      <div className="h-screen bg-[#0a0a0b] flex flex-col items-center justify-center overflow-hidden font-sans">
        <Loader2 className="w-10 h-10 animate-spin text-purple-500" />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 mt-3">Hydrating Project Surface</p>
      </div>
    }>
      <ProjectPageContent />
    </Suspense>
  )
}
