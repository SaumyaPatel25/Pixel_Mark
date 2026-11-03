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
} from 'lucide-react'
import {
  CopilotResolution,
  ElementCropResult,
  CopilotStatus,
  SiteSuggestion,
  SiteAnalysisResult,
  MutationHistoryItem,
  ActiveInspiration,
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
  reviewerId?: string | null
  onPinCreated?: (marker: any) => void
  className?: string
}

export function CanvasCopilotBar({
  iframeRef,
  sessionId,
  reviewerId,
  onPinCreated,
  className,
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
      },
      '*'
    )
  }, [iframeRef])

  const revertEphemeralMutation = useCallback((selector?: string | null) => {
    const iframe = iframeRef.current
    if (!iframe || !iframe.contentWindow) return

    const targetSelector = selector || activeSelectorRef.current
    iframe.contentWindow.postMessage(
      {
        type: 'STAGE_REVERT_EPHEMERAL_MUTATION',
        selector: targetSelector || undefined,
      },
      '*'
    )
    activeSelectorRef.current = null
  }, [iframeRef])

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
        if (
          siteAnalysisStatusRef.current === 'ready' ||
          siteAnalysisStatusRef.current === 'analyzing'
        ) {
          return
        }

        setSiteAnalysisStatus('analyzing')
        siteAnalysisStatusRef.current = 'analyzing'

        api.copilot
          .analyzeSite({
            title: data.title || '',
            description: data.description || '',
            headings: data.headings || [],
            dominant_colors: data.dominant_colors || data.colors || [],
            cta_buttons: data.cta_buttons || data.ctas || [],
          })
          .then((result: any) => {
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
            console.warn('[STAGE Copilot] Site context analysis error:', err)
            setSiteAnalysisStatus('idle')
            siteAnalysisStatusRef.current = 'idle'
          })
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

  // ─── Main Submit & Handshake Flow ─────────────────────────────────────────
  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      if (e) e.preventDefault()
      const trimmedPrompt = prompt.trim()
      if (!trimmedPrompt) return

      // Guard: If site is still being analyzed in the background
      if (siteAnalysisStatus === 'analyzing') {
        setErrorMessage('✨ Analyzing site with AI in background... Please wait a moment.')
        setTimeout(() => setErrorMessage(null), 4000)
        return
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
        // Prepend inspiration prompt if active
        const effectivePrompt = activeInspo?.prompt
          ? `[Inspiration: ${activeInspo.prompt}] ${trimmedPrompt}`
          : trimmedPrompt

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

        const resolution: CopilotResolution = await request('/api/copilot/parse', {
          method: 'POST',
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
        })

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
        rect: pendingCrop?.rect || null,
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
  }, [pendingResolution, pendingCrop, activeInspo, sessionId, reviewerId, onPinCreated])

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
      const confirmedPin = await request('/api/copilot/confirm-pin', {
        method: 'POST',
        headers: reviewerId ? { 'x-reviewer-id': reviewerId } : undefined,
        body: JSON.stringify({
          session_id: sessionId,
          selector: suggestion.selector,
          image_base64: null,
          inspo_image_url: activeInspo?.imageUrl || null,
          css_mutations: suggestion.css_mutations || {},
          css_rules: suggestion.css_rules || '',
          text_mutation: null,
          client_summary: suggestion.title,
          developer_explanation: suggestion.description,
          rect: null,
        }),
      })

      if (confirmedPin && confirmedPin.id) {
        useMarkerStore.getState().upsertMarkerFromServer(confirmedPin)
        onPinCreated?.(confirmedPin)
      }
    },
    [sessionId, reviewerId, activeInspo, onPinCreated]
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

          {/* "💡 3 Suggestions" Button */}
          {siteAnalysis && siteAnalysis.top_3_suggestions && siteAnalysis.top_3_suggestions.length > 0 && (
            <button
              type="button"
              onClick={() => setIsSuggestionsModalOpen(true)}
              disabled={isLoading}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/40 text-violet-300 text-xs font-semibold transition-all cursor-pointer flex-shrink-0 active:scale-95"
              title="View 3 AI Heuristic Recommendations"
            >
              <Lightbulb className="w-3.5 h-3.5 text-violet-400" />
              <span className="hidden sm:inline">3 Suggestions</span>
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
    </>
  )
}
