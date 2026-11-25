'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import {
  Sparkles,
  Mic,
  MicOff,
  Send,
  Loader2,
  AlertCircle,
  Minimize2,
  Maximize2,
  X,
  Undo2,
  Redo2,
  Lightbulb,
  Image as ImageIcon,
  Target,
} from 'lucide-react'
import {
  CopilotResolution,
  ElementCropResult,
  CopilotStatus,
  SiteSuggestion,
  SiteAnalysisResult,
  MutationHistoryItem,
  ActiveInspiration,
  FocusedElement,
} from './CopilotTypes'
import { CopilotConfirmationModal } from './CopilotConfirmationModal'
import { CopilotSuggestionsModal } from './CopilotSuggestionsModal'
import { CopilotInspoUploadModal } from './CopilotInspoUploadModal'
import { request, api } from '@/lib/api'
import { useMarkerStore } from '@/store/markerStore'
import { cn } from '@/lib/utils'

interface CanvasCopilotBarProps {
  iframeRef: React.RefObject<HTMLIFrameElement | null>
  sessionId: string
  projectId?: string
  currentUrl?: string
  reviewerId?: string | null
  onPinCreated?: (marker: any) => void
  className?: string
  activeMarker?: any
  onClearActiveMarker?: () => void
}

export function CanvasCopilotBar({
  iframeRef,
  sessionId,
  projectId,
  currentUrl,
  reviewerId,
  onPinCreated,
  className,
  activeMarker,
  onClearActiveMarker,
}: CanvasCopilotBarProps) {
  const [prompt, setPrompt] = useState('')
  const [status, setStatus] = useState<CopilotStatus>('idle')
  const [statusMessage, setStatusMessage] = useState<string>('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)

  // Confirmation modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [pendingResolution, setPendingResolution] = useState<CopilotResolution | null>(null)
  const [pendingCrop, setPendingCrop] = useState<ElementCropResult | null>(null)
  const [isConfirming, setIsConfirming] = useState(false)
  const [confirmError, setConfirmError] = useState<string | null>(null)

  // Site Analysis State
  const [siteAnalysisStatus, setSiteAnalysisStatus] = useState<'idle' | 'analyzing' | 'ready'>('idle')
  const [siteAnalysis, setSiteAnalysis] = useState<SiteAnalysisResult | null>(null)
  const siteAnalysisStatusRef = useRef<'idle' | 'analyzing' | 'ready'>('idle')

  // Focused Element & Gemini Circle-to-Inspect State
  const [isCircleModeActive, setIsCircleModeActive] = useState(false)
  const [focusedElement, setFocusedElement] = useState<FocusedElement | null>(null)
  const [isDrawingCircle, setIsDrawingCircle] = useState(false)
  const [circlePoints, setCirclePoints] = useState<{ x: number; y: number }[]>([])
  const [circleHighlightRect, setCircleHighlightRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null)
  const siteFingerprintRef = useRef<any>(null)
  const circlePointResolverRef = useRef<((element: any) => void) | null>(null)

  // Sync activeMarker prop to focusedElement if available
  useEffect(() => {
    if (activeMarker && activeMarker.target_selector) {
      setFocusedElement({
        selector: activeMarker.target_selector,
        tag: activeMarker.element_rect_json?.tagName || 'ELEMENT',
        text: activeMarker.dom_text_excerpt || activeMarker.title || '',
        source: 'pin',
        rect: activeMarker.element_rect_json || null,
      })
    }
  }, [activeMarker?.id])

  // Modals state
  const [isSuggestionsModalOpen, setIsSuggestionsModalOpen] = useState(false)
  const [isInspoModalOpen, setIsInspoModalOpen] = useState(false)
  const [activeInspo, setActiveInspo] = useState<ActiveInspiration | null>(null)

  // Mutation History Stack (Undo / Redo)
  const [mutationHistory, setMutationHistory] = useState<MutationHistoryItem[]>([])
  const [historyIndex, setHistoryIndex] = useState<number>(-1)
  const historyRef = useRef<MutationHistoryItem[]>([])
  const historyIndexRef = useRef<number>(-1)

  // Pending resolver promises
  const microDomResolverRef = useRef<((candidates: any[]) => void) | null>(null)
  const cropResolverRef = useRef<((crop: ElementCropResult) => void) | null>(null)
  const activeSelectorRef = useRef<string | null>(null)
  const speechRecognitionRef = useRef<any>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Keep history refs synchronized with state
  useEffect(() => {
    historyRef.current = mutationHistory
    historyIndexRef.current = historyIndex
  }, [mutationHistory, historyIndex])

  // ─── Mutation History Push Helper ──────────────────────────────────────────
  const pushMutationHistory = useCallback((item: MutationHistoryItem) => {
    setMutationHistory((prev) => {
      const curIdx = historyIndexRef.current
      const nextList = prev.slice(0, curIdx + 1).concat(item)
      const nextIdx = nextList.length - 1
      historyRef.current = nextList
      historyIndexRef.current = nextIdx
      setHistoryIndex(nextIdx)
      return nextList
    })
  }, [])

  // ─── Ephemeral Mutation Helpers ───────────────────────────────────────────
  const applyEphemeralMutation = useCallback((resolution: CopilotResolution) => {
    const iframe = iframeRef.current
    if (!iframe || !iframe.contentWindow) return

    activeSelectorRef.current = resolution.selector
    iframe.contentWindow.postMessage(
      {
        type: 'STAGE_APPLY_EPHEMERAL_MUTATION',
        cssRules: resolution.css_rules,
        selector: resolution.selector,
        textMutation: resolution.text_mutation,
        projectId: projectId,
      },
      '*'
    )
  }, [iframeRef, projectId])

  const revertEphemeralMutation = useCallback((selector?: string | null) => {
    const iframe = iframeRef.current
    if (!iframe || !iframe.contentWindow) return

    const targetSelector = selector || activeSelectorRef.current
    iframe.contentWindow.postMessage(
      {
        type: 'STAGE_REVERT_EPHEMERAL_MUTATION',
        selector: targetSelector || undefined,
        projectId: projectId,
      },
      '*'
    )
    activeSelectorRef.current = null
  }, [iframeRef, projectId])

  // ─── Undo & Redo Handlers ─────────────────────────────────────────────────
  const handleUndo = useCallback(() => {
    const curIdx = historyIndexRef.current
    const list = historyRef.current
    if (curIdx < 0) return

    const iframe = iframeRef.current
    if (!iframe || !iframe.contentWindow) return

    const curItem = list[curIdx]

    if (curIdx === 0) {
      // Revert completely back to initial state
      iframe.contentWindow.postMessage(
        {
          type: 'STAGE_REVERT_EPHEMERAL_MUTATION',
          selector: curItem.selector,
        },
        '*'
      )
      activeSelectorRef.current = null
      historyIndexRef.current = -1
      setHistoryIndex(-1)
    } else {
      const prevItem = list[curIdx - 1]
      // If selector changed, revert current selector first
      if (curItem.selector !== prevItem.selector) {
        iframe.contentWindow.postMessage(
          {
            type: 'STAGE_REVERT_EPHEMERAL_MUTATION',
            selector: curItem.selector,
          },
          '*'
        )
      }
      // Apply previous snapshot
      iframe.contentWindow.postMessage(
        {
          type: 'STAGE_APPLY_EPHEMERAL_MUTATION',
          cssRules: prevItem.cssRules,
          selector: prevItem.selector,
          textMutation: prevItem.textMutation,
        },
        '*'
      )
      activeSelectorRef.current = prevItem.selector
      historyIndexRef.current = curIdx - 1
      setHistoryIndex(curIdx - 1)
    }
  }, [iframeRef])

  const handleRedo = useCallback(() => {
    const curIdx = historyIndexRef.current
    const list = historyRef.current
    if (curIdx >= list.length - 1) return

    const iframe = iframeRef.current
    if (!iframe || !iframe.contentWindow) return

    const nextIdx = curIdx + 1
    const nextItem = list[nextIdx]

    iframe.contentWindow.postMessage(
      {
        type: 'STAGE_APPLY_EPHEMERAL_MUTATION',
        cssRules: nextItem.cssRules,
        selector: nextItem.selector,
        textMutation: nextItem.textMutation,
      },
      '*'
    )
    activeSelectorRef.current = nextItem.selector
    historyIndexRef.current = nextIdx
    setHistoryIndex(nextIdx)
  }, [iframeRef])

  // ─── Global Keyboard Shortcuts for Undo/Redo ──────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform)
      const modifier = isMac ? e.metaKey : e.ctrlKey

      if (!modifier) return

      // Don't intercept when user is typing text inside an input or textarea
      const target = e.target as HTMLElement | null
      const isEditingText =
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      if (isEditingText) return

      if ((e.key === 'z' || e.key === 'Z') && e.shiftKey) {
        e.preventDefault()
        handleRedo()
      } else if (e.key === 'y' || e.key === 'Y') {
        e.preventDefault()
        handleRedo()
      } else if (e.key === 'z' || e.key === 'Z') {
        e.preventDefault()
        handleUndo()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleUndo, handleRedo])

  // ─── Trigger Site Fingerprint Request ─────────────────────────────────────
  const requestFingerprint = useCallback(() => {
    const iframe = iframeRef.current
    if (iframe?.contentWindow) {
      iframe.contentWindow.postMessage({ type: 'STAGE_REQUEST_SITE_FINGERPRINT' }, '*')
    }
  }, [iframeRef])

  useEffect(() => {
    requestFingerprint()
    const t1 = setTimeout(requestFingerprint, 800)
    const t2 = setTimeout(requestFingerprint, 2500)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [requestFingerprint])

  // ─── Listen for messages from iframe ───────────────────────────────────────
  useEffect(() => {
    const handleWindowMessage = (event: MessageEvent) => {
      const data = event.data
      if (!data || typeof data !== 'object') return

      // Handle micro-DOM extraction response
      if (data.type === 'STAGE_MICRO_DOM_RESULT') {
        if (microDomResolverRef.current) {
          microDomResolverRef.current(data.candidates || [])
          microDomResolverRef.current = null
        }
      }

      // Handle element crop response
      if (data.type === 'STAGE_ELEMENT_CROP_RESULT') {
        if (cropResolverRef.current) {
          cropResolverRef.current({
            selector: data.selector,
            imageBase64: data.imageBase64 || null,
            rect: data.rect || null,
          })
          cropResolverRef.current = null
        }
      }

      // Handle Site Fingerprint response & trigger background analysis
      if (data.type === 'STAGE_SITE_FINGERPRINT_RESULT') {
        siteFingerprintRef.current = data
        if (
          siteAnalysisStatusRef.current === 'ready' ||
          siteAnalysisStatusRef.current === 'analyzing'
        ) {
          return
        }

        setSiteAnalysisStatus('analyzing')
        siteAnalysisStatusRef.current = 'analyzing'

        // Safety timeout to prevent background analysis from hanging indefinitely
        const safetyTimer = setTimeout(() => {
          if (siteAnalysisStatusRef.current === 'analyzing') {
            setSiteAnalysisStatus('idle')
            siteAnalysisStatusRef.current = 'idle'
          }
        }, 6000)

        api.copilot
          .analyzeSite({
            title: data.title || '',
            description: data.description || '',
            hero_summary: data.hero_summary || '',
            nav_items: data.nav_items || [],
            headings: data.headings || [],
            dominant_colors: data.dominant_colors || data.colors || [],
            cta_buttons: data.cta_buttons || data.ctas || [],
          })
          .then((result: any) => {
            clearTimeout(safetyTimer)
            if (result && result.business_category) {
              setSiteAnalysis(result)
              setSiteAnalysisStatus('ready')
              siteAnalysisStatusRef.current = 'ready'
            } else {
              setSiteAnalysisStatus('idle')
              siteAnalysisStatusRef.current = 'idle'
            }
          })
          .catch((err) => {
            clearTimeout(safetyTimer)
            console.warn('[STAGE Copilot] Site context analysis error:', err)
            setSiteAnalysisStatus('idle')
            siteAnalysisStatusRef.current = 'idle'
          })
      }

      // Handle element inspection result from stage-agent
      if (data.type === 'STAGE_ELEMENT_AT_POINT_RESULT') {
        if (circlePointResolverRef.current) {
          circlePointResolverRef.current(data.element)
          circlePointResolverRef.current = null
        }
      }
    }

    window.addEventListener('message', handleWindowMessage)
    return () => {
      window.removeEventListener('message', handleWindowMessage)
    }
  }, [])

  // ─── Speech Recognition Setup ──────────────────────────────────────────────
  const toggleSpeechRecognition = useCallback(() => {
    if (typeof window === 'undefined') return

    if (isRecording) {
      if (speechRecognitionRef.current) {
        try {
          speechRecognitionRef.current.stop()
        } catch (_) {}
      }
      setIsRecording(false)
      return
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

    if (!SpeechRecognition) {
      setErrorMessage('Speech recognition is not supported in this browser. Please type your prompt.')
      setTimeout(() => setErrorMessage(null), 4000)
      return
    }

    try {
      const recognition = new SpeechRecognition()
      recognition.continuous = false
      recognition.interimResults = true
      recognition.lang = 'en-US'

      recognition.onstart = () => {
        setIsRecording(true)
        setErrorMessage(null)
      }

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((res: any) => res[0].transcript)
          .join('')
        setPrompt(transcript)
      }

      recognition.onerror = (event: any) => {
        console.warn('[STAGE Copilot] Speech recognition error:', event.error)
        setIsRecording(false)
        if (event.error !== 'no-speech') {
          setErrorMessage(`Voice dictation: ${event.error}`)
          setTimeout(() => setErrorMessage(null), 4000)
        }
      }

      recognition.onend = () => {
        setIsRecording(false)
      }

      speechRecognitionRef.current = recognition
      recognition.start()
    } catch (err: any) {
      console.warn('[STAGE Copilot] Failed to start speech recognition:', err)
      setIsRecording(false)
      setErrorMessage('Failed to access microphone.')
      setTimeout(() => setErrorMessage(null), 4000)
    }
  }, [isRecording])

  useEffect(() => {
    return () => {
      if (speechRecognitionRef.current) {
        try {
          speechRecognitionRef.current.abort()
        } catch (_) {}
      }
    }
  }, [])

  // ─── Focused Analysis Trigger ────────────────────────────────────────────
  const triggerFocusedAnalysis = useCallback(async (focused: FocusedElement) => {
    setSiteAnalysisStatus('analyzing')
    siteAnalysisStatusRef.current = 'analyzing'
    try {
      const fp = siteFingerprintRef.current || {}
      const result: any = await api.copilot.analyzeSite({
        title: fp.title || '',
        description: fp.description || '',
        hero_summary: fp.hero_summary || '',
        nav_items: fp.nav_items || [],
        headings: fp.headings || [],
        dominant_colors: fp.dominant_colors || fp.colors || [],
        cta_buttons: fp.cta_buttons || fp.ctas || [],
        focused_element: {
          selector: focused.selector,
          tag: focused.tag,
          text: focused.text,
          rect: focused.rect,
          source: focused.source || 'circle',
        },
      })
      if (result && result.top_3_suggestions) {
        setSiteAnalysis({
          ...result,
          focusContext: focused,
        })
        setSiteAnalysisStatus('ready')
        siteAnalysisStatusRef.current = 'ready'
        setIsSuggestionsModalOpen(true)
      } else {
        setSiteAnalysisStatus('idle')
        siteAnalysisStatusRef.current = 'idle'
      }
    } catch (err) {
      console.warn('[STAGE Copilot] Focused analysis error:', err)
      setSiteAnalysisStatus('idle')
      siteAnalysisStatusRef.current = 'idle'
    }
  }, [])

  // ─── Gemini-style Circle & Inspect Pointer Handlers ───────────────────────
  const handleCirclePointerDown = (e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    } catch (_) {}
    setIsDrawingCircle(true)
    setCirclePoints([{ x: e.clientX, y: e.clientY }])
  }

  const handleCirclePointerMove = (e: React.PointerEvent) => {
    if (!isDrawingCircle) return
    e.preventDefault()
    e.stopPropagation()
    setCirclePoints((prev) => [...prev, { x: e.clientX, y: e.clientY }])
  }

  const handleCirclePointerUp = (e: React.PointerEvent) => {
    if (!isDrawingCircle) return
    e.preventDefault()
    e.stopPropagation()
    setIsDrawingCircle(false)
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    } catch (_) {}

    const pts = circlePoints.length > 0 ? circlePoints : [{ x: e.clientX, y: e.clientY }]
    let cx = e.clientX
    let cy = e.clientY
    if (pts.length > 2) {
      const minX = Math.min(...pts.map((p) => p.x))
      const maxX = Math.max(...pts.map((p) => p.x))
      const minY = Math.min(...pts.map((p) => p.y))
      const maxY = Math.max(...pts.map((p) => p.y))
      cx = (minX + maxX) / 2
      cy = (minY + maxY) / 2
    }

    const iframe = iframeRef.current
    if (iframe) {
      const iframeRect = iframe.getBoundingClientRect()
      const rawX = cx - iframeRect.left
      const rawY = cy - iframeRect.top
      const iframeX = Math.max(10, Math.min(Math.round(rawX), (iframeRect.width || 1280) - 10))
      const iframeY = Math.max(10, Math.min(Math.round(rawY), (iframeRect.height || 800) - 10))

      console.log('[STAGE Copilot] Circle inspect point:', { cx, cy, iframeX, iframeY })

      let targetEl: Element | null = null
      try {
        const doc = iframe.contentDocument || iframe.contentWindow?.document
        if (doc) {
          targetEl = doc.elementFromPoint(iframeX, iframeY)
          if (
            targetEl &&
            targetEl.tagName === 'SPAN' &&
            targetEl.parentElement &&
            ['BUTTON', 'A', 'H1', 'H2', 'H3', 'H4', 'NAV'].includes(targetEl.parentElement.tagName)
          ) {
            targetEl = targetEl.parentElement
          }
        }
      } catch (_) {}

      if (targetEl) {
        let selector = targetEl.id ? `#${targetEl.id}` : ''
        if (!selector) {
          const tag = targetEl.tagName.toLowerCase()
          const classList = Array.from(targetEl.classList).filter(
            (c) => c && !c.includes(':') && !c.includes('/') && !c.startsWith('stage-')
          )
          if (classList.length > 0) {
            selector = `${tag}.${classList.slice(0, 2).join('.')}`
          } else if (targetEl.parentElement && targetEl.parentElement.tagName !== 'BODY') {
            const pTag = targetEl.parentElement.tagName.toLowerCase()
            selector = `${pTag} > ${tag}`
          } else {
            selector = tag
          }
        }

        const rect = targetEl.getBoundingClientRect()
        const text = (targetEl.textContent || '').trim().slice(0, 100)
        const newFocused: FocusedElement = {
          selector,
          tag: targetEl.tagName,
          text,
          source: 'circle',
          rect: {
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
            scroll_x: iframe.contentWindow?.scrollX || 0,
            scroll_y: iframe.contentWindow?.scrollY || 0,
          },
        }

        console.log('[STAGE Copilot] Resolved element directly from document:', newFocused)
        setFocusedElement(newFocused)
        setCircleHighlightRect({
          top: iframeRect.top + rect.top,
          left: iframeRect.left + rect.left,
          width: rect.width,
          height: rect.height,
        })
        setTimeout(() => setCircleHighlightRect(null), 2500)
        setIsCircleModeActive(false)
        setCirclePoints([])
        triggerFocusedAnalysis(newFocused)
        return
      }

      // If cross-origin or direct access failed, use postMessage to stage-agent
      if (iframe.contentWindow) {
        const reqId = `circle_inspect_${Date.now()}`
        circlePointResolverRef.current = (resolvedElement: any) => {
          if (resolvedElement && resolvedElement.selector) {
            console.log('[STAGE Copilot] Resolved element via postMessage:', resolvedElement)
            const newFocused: FocusedElement = {
              selector: resolvedElement.selector,
              tag: resolvedElement.tag,
              text: resolvedElement.text,
              source: 'circle',
              rect: resolvedElement.rect,
            }
            setFocusedElement(newFocused)
            if (resolvedElement.rect) {
              setCircleHighlightRect({
                top: iframeRect.top + resolvedElement.rect.top,
                left: iframeRect.left + resolvedElement.rect.left,
                width: resolvedElement.rect.width,
                height: resolvedElement.rect.height,
              })
              setTimeout(() => setCircleHighlightRect(null), 2500)
            }
            triggerFocusedAnalysis(newFocused)
          }
        }

        iframe.contentWindow.postMessage(
          {
            type: 'STAGE_GET_ELEMENT_AT_POINT',
            requestId: reqId,
            clientX: iframeX,
            clientY: iframeY,
          },
          '*'
        )

        // Fallback safety timeout: if stage-agent didn't resolve within 2.5s, use site fingerprint
        setTimeout(() => {
          if (circlePointResolverRef.current) {
            console.warn('[STAGE Copilot] Circle inspect timeout, falling back to top component')
            circlePointResolverRef.current = null
            const fp = siteFingerprintRef.current || {}
            const fallbackEl = (fp.cta_buttons && fp.cta_buttons[0]) || (fp.headings && fp.headings[0])
            if (fallbackEl && fallbackEl.selector) {
              const fallbackFocused: FocusedElement = {
                selector: fallbackEl.selector,
                tag: fallbackEl.tag || 'ELEMENT',
                text: fallbackEl.text || '',
                source: 'circle',
              }
              setFocusedElement(fallbackFocused)
              triggerFocusedAnalysis(fallbackFocused)
            }
          }
        }, 2500)
      }
    }

    setIsCircleModeActive(false)
    setCirclePoints([])
  }

  // ─── Main Submit & Handshake Flow ─────────────────────────────────────────
  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      if (e) e.preventDefault()
      const trimmedPrompt = prompt.trim()
      if (!trimmedPrompt) return

      // If site analysis is still running in background, allow user prompt to proceed
      if (siteAnalysisStatus === 'analyzing') {
        setSiteAnalysisStatus('idle')
        siteAnalysisStatusRef.current = 'idle'
      }

      const iframe = iframeRef.current
      if (!iframe || !iframe.contentWindow) {
        setErrorMessage('Canvas frame is not ready. Please wait for the page to load.')
        setTimeout(() => setErrorMessage(null), 4000)
        return
      }

      setErrorMessage(null)
      setConfirmError(null)

      if (isRecording && speechRecognitionRef.current) {
        try {
          speechRecognitionRef.current.stop()
        } catch (_) {}
        setIsRecording(false)
      }

      try {
        // Prepend inspiration prompt if active, and include focused element context if selected
        let effectivePrompt = activeInspo?.prompt
          ? `[Inspiration: ${activeInspo.prompt}] ${trimmedPrompt}`
          : trimmedPrompt

        if (focusedElement && focusedElement.selector) {
          effectivePrompt = `[Focus on <${focusedElement.tag || 'element'}> ${focusedElement.selector}: "${focusedElement.text || ''}"] ${effectivePrompt}`
        }

        // Step a: Request micro-DOM from iframe
        setStatus('extracting')
        setStatusMessage('Extracting canvas DOM elements...')

        const candidatesPromise = new Promise<any[]>((resolve) => {
          microDomResolverRef.current = resolve
          iframe.contentWindow?.postMessage(
            {
              type: 'STAGE_REQUEST_MICRO_DOM',
              query: trimmedPrompt,
              maxElements: 40,
            },
            '*'
          )
        })

        const microDomTimeoutPromise = new Promise<any[]>((resolve) => {
          setTimeout(() => resolve([]), 5000)
        })

        const candidates = await Promise.race([candidatesPromise, microDomTimeoutPromise])

        // Step b & c: Call backend /api/copilot/parse
        setStatus('analyzing')
        setStatusMessage('Locating element & applying preview...')

        const parsePromise = request('/api/copilot/parse', {
          method: 'POST',
          headers: reviewerId ? { 'x-reviewer-id': reviewerId } : undefined,
          body: JSON.stringify({
            prompt: effectivePrompt,
            micro_dom: candidates,
            viewport: {
              width: iframe.clientWidth || window.innerWidth,
              height: iframe.clientHeight || window.innerHeight,
            },
            session_id: sessionId,
            inspo_image_url: activeInspo?.imageUrl || null,
          }),
        }) as Promise<CopilotResolution>

        const parseTimeout = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('AI response timed out. Please try again.')), 45000)
        })

        const resolution: CopilotResolution = await Promise.race([parsePromise, parseTimeout])

        if (!resolution || !resolution.selector) {
          throw new Error('AI was unable to locate a target element matching your request.')
        }

        // Step d: Apply ephemeral mutation to iframe
        setStatus('applying')
        setStatusMessage('Applying live preview & capturing crop...')
        applyEphemeralMutation(resolution)

        // Push mutation to history stack
        pushMutationHistory({
          id: `mut-${Date.now()}`,
          selector: resolution.selector,
          cssRules: resolution.css_rules,
          textMutation: resolution.text_mutation,
          summary: resolution.client_summary || 'Visual mutation',
        })

        // Step e: Request element crop
        const cropPromise = new Promise<ElementCropResult>((resolve) => {
          cropResolverRef.current = resolve
          iframe.contentWindow?.postMessage(
            {
              type: 'STAGE_CAPTURE_ELEMENT_CROP',
              selector: resolution.selector,
            },
            '*'
          )
        })

        const cropTimeoutPromise = new Promise<ElementCropResult>((resolve) => {
          setTimeout(
            () =>
              resolve({
                selector: resolution.selector,
                imageBase64: null,
                rect: null,
              }),
            3500
          )
        })

        const cropResult = await Promise.race([cropPromise, cropTimeoutPromise])

        // Step f: Open confirmation modal
        setPendingResolution(resolution)
        setPendingCrop(cropResult)
        setIsModalOpen(true)
        setStatus('idle')
        setStatusMessage('')
      } catch (err: any) {
        console.error('[STAGE Copilot] Error in parse/apply flow:', err)
        setStatus('error')
        setErrorMessage(err.message || 'Failed to process AI copilot request.')
        setTimeout(() => {
          setStatus('idle')
          setErrorMessage(null)
        }, 5000)
      }
    },
    [
      prompt,
      iframeRef,
      sessionId,
      isRecording,
      siteAnalysisStatus,
      activeInspo,
      applyEphemeralMutation,
      pushMutationHistory,
    ]
  )

  // ─── Modal Confirm & Pin Handler ──────────────────────────────────────────
  const handleConfirmPin = useCallback(async () => {
    if (!pendingResolution) return
    setIsConfirming(true)
    setConfirmError(null)

    try {
      let rect = pendingCrop?.rect || (pendingCrop as any)?.cropRect || pendingResolution.rect || null
      if (!rect && iframeRef.current?.contentDocument && pendingResolution.selector) {
        try {
          const el = iframeRef.current.contentDocument.querySelector(pendingResolution.selector) as HTMLElement | null
          if (el) {
            const b = el.getBoundingClientRect()
            const scrollX = iframeRef.current.contentWindow?.scrollX || 0
            const scrollY = iframeRef.current.contentWindow?.scrollY || 0
            rect = {
              left: Math.round(b.left + scrollX),
              top: Math.round(b.top + scrollY),
              width: Math.round(b.width),
              height: Math.round(b.height),
              viewport_width: iframeRef.current.contentWindow?.innerWidth || 1280,
              viewport_height: iframeRef.current.contentWindow?.innerHeight || 800,
              scroll_x: scrollX,
              scroll_y: scrollY,
            }
          }
        } catch (_) {}
      }

      const confirmPayload = {
        session_id: sessionId,
        selector: pendingResolution.selector,
        image_base64: pendingCrop?.imageBase64 || null,
        inspo_image_url: activeInspo?.imageUrl || null,
        css_mutations: pendingResolution.css_mutations || {},
        css_rules: pendingResolution.css_rules || '',
        text_mutation: pendingResolution.text_mutation || null,
        client_summary: pendingResolution.client_summary || 'AI Visual Mutation',
        developer_explanation: pendingResolution.developer_explanation || '',
        developer_directive: pendingResolution.developer_directive || pendingResolution.developer_explanation || '',
        benchmark_name: pendingResolution.benchmark_name || null,
        benchmark_url: pendingResolution.benchmark_url || null,
        benchmark_pattern: pendingResolution.benchmark_pattern || null,
        developer_code_spec: pendingResolution.developer_code_spec || pendingResolution.css_rules || null,
        rect,
        page_url: currentUrl || null,
        offset_x_ratio: 0.5,
        offset_y_ratio: 0.5,
      }

      const confirmedPin = await request('/api/copilot/confirm-pin', {
        method: 'POST',
        headers: reviewerId ? { 'x-reviewer-id': reviewerId } : undefined,
        body: JSON.stringify(confirmPayload),
      })

      if (confirmedPin && confirmedPin.id) {
        useMarkerStore.getState().upsertMarkerFromServer(confirmedPin)
        onPinCreated?.(confirmedPin)
      }

      setIsModalOpen(false)
      setPendingResolution(null)
      setPendingCrop(null)
      setPrompt('')
      activeSelectorRef.current = null
    } catch (err: any) {
      console.error('[STAGE Copilot] Error confirming pin:', err)
      setConfirmError(err.message || 'Failed to persist AI pin to server.')
    } finally {
      setIsConfirming(false)
    }
  }, [pendingResolution, pendingCrop, activeInspo, sessionId, reviewerId, onPinCreated, currentUrl])

  // ─── Modal Cancel / Dismiss Handler ───────────────────────────────────────
  const handleModalCancel = useCallback(() => {
    // Revert preview on canvas
    if (pendingResolution?.selector) {
      revertEphemeralMutation(pendingResolution.selector)
    } else {
      revertEphemeralMutation()
    }
    // Rewind history stack by 1 if current item is this preview
    if (historyIndexRef.current >= 0) {
      setMutationHistory((prev) => prev.slice(0, prev.length - 1))
      const nextIdx = historyIndexRef.current - 1
      historyIndexRef.current = nextIdx
      setHistoryIndex(nextIdx)
    }
    setIsModalOpen(false)
    setPendingResolution(null)
    setPendingCrop(null)
    setConfirmError(null)
  }, [pendingResolution, revertEphemeralMutation])

  // ─── Suggestions Modal Handlers ───────────────────────────────────────────
  const handleSuggestionPreview = useCallback(
    (suggestion: SiteSuggestion) => {
      applyEphemeralMutation({
        selector: suggestion.selector,
        css_mutations: suggestion.css_mutations,
        css_rules: suggestion.css_rules,
        text_mutation: null,
        client_summary: suggestion.title,
        developer_explanation: suggestion.description,
        confidence: 1.0,
      })
      pushMutationHistory({
        id: suggestion.id,
        selector: suggestion.selector,
        cssRules: suggestion.css_rules,
        summary: suggestion.title,
      })
    },
    [applyEphemeralMutation, pushMutationHistory]
  )

  const handleSuggestionRevertPreview = useCallback(
    (selector: string) => {
      revertEphemeralMutation(selector)
    },
    [revertEphemeralMutation]
  )

  const handleSuggestionConfirmPin = useCallback(
    async (suggestion: SiteSuggestion) => {
      let rect: any = null
      let imageBase64: string | null = null

      const iframe = iframeRef.current
      if (iframe?.contentWindow && suggestion.selector) {
        try {
          const cropPromise = new Promise<ElementCropResult>((resolve) => {
            cropResolverRef.current = resolve
            iframe.contentWindow?.postMessage(
              {
                type: 'STAGE_CAPTURE_ELEMENT_CROP',
                selector: suggestion.selector,
              },
              '*'
            )
          })

          const timeoutPromise = new Promise<ElementCropResult>((resolve) => {
            setTimeout(
              () =>
                resolve({
                  selector: suggestion.selector,
                  imageBase64: null,
                  rect: null,
                }),
              1500
            )
          })

          const cropResult = await Promise.race([cropPromise, timeoutPromise])
          if (cropResult?.rect) {
            rect = cropResult.rect
          }
          if (cropResult?.imageBase64) {
            imageBase64 = cropResult.imageBase64
          }
        } catch (_) {}

        if (!rect && iframe.contentDocument && suggestion.selector) {
          try {
            const el = iframe.contentDocument.querySelector(suggestion.selector) as HTMLElement | null
            if (el) {
              const b = el.getBoundingClientRect()
              const scrollX = iframe.contentWindow?.scrollX || 0
              const scrollY = iframe.contentWindow?.scrollY || 0
              rect = {
                left: Math.round(b.left + scrollX),
                top: Math.round(b.top + scrollY),
                width: Math.round(b.width),
                height: Math.round(b.height),
                viewport_width: iframe.contentWindow?.innerWidth || 1280,
                viewport_height: iframe.contentWindow?.innerHeight || 800,
              }
            }
          } catch (_) {}
        }
      }

      const confirmedPin = await request('/api/copilot/confirm-pin', {
        method: 'POST',
        headers: reviewerId ? { 'x-reviewer-id': reviewerId } : undefined,
        body: JSON.stringify({
          session_id: sessionId,
          selector: suggestion.selector,
          image_base64: imageBase64,
          inspo_image_url: activeInspo?.imageUrl || null,
          css_mutations: suggestion.css_mutations || {},
          css_rules: suggestion.css_rules || '',
          text_mutation: null,
          client_summary: suggestion.title,
          developer_explanation: suggestion.description,
          developer_directive: suggestion.developer_directive || suggestion.description,
          benchmark_name: suggestion.benchmark_name || null,
          benchmark_url: suggestion.benchmark_url || null,
          benchmark_pattern: suggestion.benchmark_pattern || null,
          developer_code_spec: suggestion.developer_code_spec || null,
          rect,
          page_url: currentUrl || null,
          offset_x_ratio: 0.5,
          offset_y_ratio: 0.5,
        }),
      })

      if (confirmedPin && confirmedPin.id) {
        useMarkerStore.getState().upsertMarkerFromServer(confirmedPin)
        onPinCreated?.(confirmedPin)
      }
    },
    [sessionId, reviewerId, activeInspo, onPinCreated, currentUrl, iframeRef]
  )

  const isLoading = status !== 'idle' && status !== 'error'
  const canUndo = historyIndex >= 0
  const canRedo = historyIndex < mutationHistory.length - 1

  // Minimized docked trigger button
  if (isMinimized) {
    return (
      <button
        type="button"
        onClick={() => setIsMinimized(false)}
        className={cn(
          "fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#0d0d14]/95 border border-purple-500/40 text-purple-300 shadow-2xl backdrop-blur-xl hover:bg-purple-900/30 transition-all cursor-pointer group active:scale-95",
          className
        )}
        title="Open AI Canvas Copilot"
      >
        <Sparkles className="w-4 h-4 text-purple-400 group-hover:rotate-12 transition-transform" />
        <span className="text-xs font-bold tracking-wide">STAGE Copilot</span>
        {siteAnalysis && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30 font-medium">
            {siteAnalysis.business_category}
          </span>
        )}
        <Maximize2 className="w-3.5 h-3.5 text-white/40 ml-1" />
      </button>
    )
  }

  return (
    <>
      <div
        className={cn(
          "fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-2xl transition-all duration-300",
          className
        )}
      >
        {/* Subtle Site Analysis DNA Badge Notification */}
        {siteAnalysisStatus === 'analyzing' && (
          <div className="mb-2 mx-auto w-fit flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-violet-950/80 border border-violet-500/30 text-violet-200 text-xs shadow-lg backdrop-blur-md animate-pulse">
            <Sparkles className="w-3.5 h-3.5 text-violet-400 animate-spin" />
            <span>✨ Analyzing site with AI in background...</span>
          </div>
        )}

        {siteAnalysisStatus === 'ready' && siteAnalysis && (
          <button
            type="button"
            onClick={() => setIsSuggestionsModalOpen(true)}
            className="mb-2 mx-auto w-fit flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#12121f]/90 border border-violet-500/30 hover:border-violet-400 text-violet-300 hover:text-white text-xs shadow-lg backdrop-blur-md transition-all cursor-pointer group hover:bg-violet-950/40"
            title="Click to view AI Design Suggestions"
          >
            <Sparkles className="w-3.5 h-3.5 text-violet-400 group-hover:rotate-12 transition-transform" />
            <span className="font-semibold">
              ✨ AI Ready: {siteAnalysis.business_category}
            </span>
            {siteAnalysis.top_3_suggestions && siteAnalysis.top_3_suggestions.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-violet-500/30 text-violet-200 font-bold border border-violet-400/30">
                {siteAnalysis.top_3_suggestions.length} suggestions
              </span>
            )}
          </button>
        )}

        {/* Error Notification Bubble */}
        {errorMessage && (
          <div className="mb-2 mx-auto flex items-center justify-between gap-2 px-4 py-2.5 rounded-2xl bg-rose-950/90 border border-rose-500/40 text-rose-200 text-xs shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="p-1 hover:bg-white/10 rounded-lg text-rose-300 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Floating Pill Container */}
        <div className="relative flex items-center gap-1.5 sm:gap-2 p-1.5 pl-3 pr-2 rounded-full border border-white/10 bg-[#0d0d14]/90 text-white shadow-[0_12px_40px_rgba(0,0,0,0.65)] backdrop-blur-xl group hover:border-purple-500/30 transition-all">
          {/* AI Badge Icon */}
          <div
            className="flex-shrink-0 p-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400"
            title="STAGE AI Canvas Copilot"
          >
            <Sparkles className={cn("w-4 h-4", isLoading && "animate-spin text-purple-300")} />
          </div>

          {/* "🖼️ Inspo" Button */}
          <button
            type="button"
            onClick={() => setIsInspoModalOpen(true)}
            disabled={isLoading}
            className={cn(
              "p-2 rounded-full transition-all cursor-pointer flex-shrink-0 disabled:opacity-40",
              activeInspo
                ? "bg-fuchsia-600/30 text-fuchsia-300 border border-fuchsia-400/40 shadow-sm"
                : "text-white/50 hover:text-white hover:bg-white/10"
            )}
            title={activeInspo ? "Inspiration active (click to edit)" : "Attach Visual Inspiration"}
          >
            <ImageIcon className="w-4 h-4" />
          </button>

          {/* "🎯 Circle & Inspect" Button (Gemini-style visual area/element focus) */}
          <button
            type="button"
            onClick={() => {
              setIsCircleModeActive((prev) => !prev)
              setCirclePoints([])
            }}
            disabled={isLoading}
            className={cn(
              "p-2 rounded-full transition-all cursor-pointer flex-shrink-0 disabled:opacity-40",
              isCircleModeActive
                ? "bg-cyan-500/30 text-cyan-300 border border-cyan-400/50 shadow-md shadow-cyan-900/40 ring-2 ring-cyan-400/40 animate-pulse"
                : focusedElement
                ? "bg-emerald-500/25 text-emerald-300 border border-emerald-500/40"
                : "text-white/50 hover:text-white hover:bg-white/10"
            )}
            title={
              isCircleModeActive
                ? "Circle mode active: Draw a circle or click any element"
                : focusedElement
                ? `Focused: ${focusedElement.selector} (click to re-circle)`
                : "Circle to Inspect: Draw a circle or click any element (Gemini style)"
            }
          >
            <Target className="w-4 h-4" />
          </button>

          {/* Focused Element Chip Badge */}
          {focusedElement && (
            <div className="flex items-center gap-1.5 pl-2 pr-1.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-[11px] flex-shrink-0 animate-in fade-in zoom-in-95">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span className="max-w-[100px] truncate text-[10px] font-mono font-medium">
                {focusedElement.tag?.toLowerCase() || 'target'}
                {focusedElement.text ? ` "${focusedElement.text}"` : ''}
              </span>
              <button
                type="button"
                onClick={() => {
                  setFocusedElement(null)
                  if (activeMarker && onClearActiveMarker) {
                    onClearActiveMarker()
                  }
                }}
                className="text-emerald-300 hover:text-white p-0.5 rounded-full hover:bg-white/10 cursor-pointer"
                title="Clear focus"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* "💡 3 Suggestions" Button (Adaptive for whole site or focused element) */}
          {siteAnalysis && siteAnalysis.top_3_suggestions && siteAnalysis.top_3_suggestions.length > 0 && (
            <button
              type="button"
              onClick={() => setIsSuggestionsModalOpen(true)}
              disabled={isLoading}
              className={cn(
                "flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer flex-shrink-0 active:scale-95",
                focusedElement
                  ? "bg-emerald-600/25 hover:bg-emerald-600/35 border border-emerald-500/50 text-emerald-300 shadow-sm shadow-emerald-950/40"
                  : "bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/40 text-violet-300"
              )}
              title={focusedElement ? "View Focused AI Suggestions for Selected Element" : "View 3 AI Heuristic Recommendations"}
            >
              {focusedElement ? <Target className="w-3.5 h-3.5 text-emerald-400" /> : <Lightbulb className="w-3.5 h-3.5 text-violet-400" />}
              <span className="hidden sm:inline">{focusedElement ? "Focused Suggestions" : "3 Suggestions"}</span>
            </button>
          )}

          {/* Active Inspo Thumbnail Badge */}
          {activeInspo && (
            <div className="flex items-center gap-1.5 pl-1 pr-2 py-0.5 rounded-full bg-fuchsia-500/20 border border-fuchsia-500/40 text-fuchsia-200 text-[11px] flex-shrink-0">
              <img
                src={activeInspo.imageUrl}
                alt="Inspo"
                className="w-4 h-4 rounded-full object-cover border border-white/20"
              />
              <span className="max-w-[70px] truncate text-[10px] font-medium hidden md:inline">
                Inspo
              </span>
              <button
                type="button"
                onClick={() => setActiveInspo(null)}
                className="text-fuchsia-300 hover:text-white p-0.5 rounded-full hover:bg-white/10 cursor-pointer"
                title="Clear inspiration"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Input or Loading Status */}
          {isLoading ? (
            <div className="flex-1 flex items-center gap-2.5 px-2 py-1 text-xs font-medium text-purple-200 animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin text-purple-400 flex-shrink-0" />
              <span className="truncate">{statusMessage || 'Processing AI mutation...'}</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex-1 flex items-center gap-2 min-w-0">
              <input
                ref={inputRef}
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={
                  isRecording
                    ? 'Listening to voice...'
                    : focusedElement
                    ? `Ask AI to change <${focusedElement.tag?.toLowerCase() || 'element'}> "${(focusedElement.text || focusedElement.selector).slice(0, 24)}..."`
                    : activeInspo
                    ? 'Prompt guided by attached inspiration...'
                    : 'Tell AI what to change or mark...'
                }
                disabled={isLoading}
                className={cn(
                  "w-full bg-transparent border-none text-xs sm:text-sm text-white placeholder-white/35 focus:outline-none focus:ring-0 px-1 py-1 min-w-0",
                  isRecording && "placeholder-rose-300 animate-pulse"
                )}
              />
            </form>
          )}

          {/* Undo Button */}
          <button
            type="button"
            onClick={handleUndo}
            disabled={!canUndo || isLoading}
            className="p-1.5 sm:p-2 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer flex-shrink-0 disabled:opacity-25 disabled:cursor-not-allowed"
            title="Undo mutation (Ctrl+Z)"
          >
            <Undo2 className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
          </button>

          {/* Redo Button */}
          <button
            type="button"
            onClick={handleRedo}
            disabled={!canRedo || isLoading}
            className="p-1.5 sm:p-2 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer flex-shrink-0 disabled:opacity-25 disabled:cursor-not-allowed"
            title="Redo mutation (Ctrl+Shift+Z)"
          >
            <Redo2 className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
          </button>

          {/* Voice Dictation Button */}
          <button
            type="button"
            onClick={toggleSpeechRecognition}
            disabled={isLoading}
            className={cn(
              "relative p-2 rounded-full transition-all cursor-pointer flex-shrink-0 disabled:opacity-40",
              isRecording
                ? "bg-rose-600 text-white shadow-lg shadow-rose-900/50 scale-105"
                : "text-white/50 hover:text-white hover:bg-white/10"
            )}
            title={isRecording ? 'Stop Voice Recording' : 'Voice Dictation'}
          >
            {isRecording ? (
              <>
                <span className="absolute inset-0 rounded-full bg-rose-500/40 animate-ping" />
                <MicOff className="w-4 h-4 relative z-10" />
              </>
            ) : (
              <Mic className="w-4 h-4" />
            )}
          </button>

          {/* Submit / Send Button */}
          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={isLoading || !prompt.trim()}
            className={cn(
              "h-8 px-3.5 rounded-full font-extrabold text-[10px] uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer flex-shrink-0 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed",
              prompt.trim() && !isLoading
                ? "bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-900/40 border border-purple-400/30"
                : "bg-white/5 text-white/30"
            )}
            title="Send request (Enter)"
          >
            {isLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <>
                <Send className="w-3 h-3" />
                <span className="hidden sm:inline">Ask AI</span>
              </>
            )}
          </button>

          {/* Minimize Button */}
          <button
            type="button"
            onClick={() => setIsMinimized(true)}
            className="p-1.5 rounded-full text-white/30 hover:text-white/70 hover:bg-white/10 transition-colors cursor-pointer flex-shrink-0"
            title="Minimize Bar"
          >
            <Minimize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      <CopilotConfirmationModal
        isOpen={isModalOpen}
        onClose={handleModalCancel}
        resolution={pendingResolution}
        cropResult={pendingCrop}
        sessionId={sessionId}
        reviewerId={reviewerId}
        onConfirm={handleConfirmPin}
        onUndo={handleModalCancel}
        isConfirming={isConfirming}
        error={confirmError}
      />

      {/* 3 AI Suggestions Modal */}
      <CopilotSuggestionsModal
        isOpen={isSuggestionsModalOpen}
        onClose={() => setIsSuggestionsModalOpen(false)}
        suggestions={siteAnalysis?.top_3_suggestions || []}
        focusContext={siteAnalysis?.focusContext || focusedElement}
        onPreview={handleSuggestionPreview}
        onRevertPreview={handleSuggestionRevertPreview}
        onConfirmPin={handleSuggestionConfirmPin}
      />

      {/* Inspiration Upload Modal */}
      <CopilotInspoUploadModal
        isOpen={isInspoModalOpen}
        onClose={() => setIsInspoModalOpen(false)}
        onSubmitInspo={(inspo) => setActiveInspo(inspo)}
        initialInspo={activeInspo}
      />

      {/* ── Gemini-style Circle & Inspect Overlay ── */}
      {isCircleModeActive && (
        <div
          className="fixed inset-0 z-[80] cursor-crosshair select-none bg-black/10 backdrop-blur-[0.5px]"
          onPointerDown={handleCirclePointerDown}
          onPointerMove={handleCirclePointerMove}
          onPointerUp={handleCirclePointerUp}
        >
          {/* Instruction Floating Pill */}
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[85] px-4 py-2 rounded-full bg-[#0d0d14]/90 border border-purple-500/40 shadow-[0_0_30px_rgba(168,85,247,0.35)] backdrop-blur-md flex items-center gap-2.5 text-xs text-white font-medium animate-in fade-in slide-in-from-top-3">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <Target className="w-4 h-4 text-cyan-400" />
            <span>Draw a circle or click any element to inspect with AI</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setIsCircleModeActive(false)
                setCirclePoints([])
              }}
              className="p-1 rounded-full hover:bg-white/10 text-white/60 hover:text-white cursor-pointer ml-1"
              title="Cancel (Esc)"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Render live SVG iridescent stroke */}
          {circlePoints.length > 1 && (
            <svg className="fixed inset-0 pointer-events-none w-full h-full z-[82]">
              <defs>
                <linearGradient id="geminiGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#06b6d4" />
                  <stop offset="50%" stopColor="#a855f7" />
                  <stop offset="100%" stopColor="#ec4899" />
                </linearGradient>
                <filter id="glowBlur" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <path
                d={circlePoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')}
                fill="none"
                stroke="url(#geminiGlow)"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#glowBlur)"
              />
            </svg>
          )}
        </div>
      )}

      {/* Render element lock halo ring */}
      {circleHighlightRect && (
        <div
          style={{
            position: 'fixed',
            top: circleHighlightRect.top - 6,
            left: circleHighlightRect.left - 6,
            width: circleHighlightRect.width + 12,
            height: circleHighlightRect.height + 12,
            zIndex: 75,
            pointerEvents: 'none',
          }}
          className="rounded-xl border-2 border-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.6)] animate-pulse"
        >
          <span className="absolute -top-3 -right-3 p-1 rounded-full bg-cyan-500 text-black shadow-lg">
            <Target className="w-3 h-3" />
          </span>
        </div>
      )}
    </>
  )
}
