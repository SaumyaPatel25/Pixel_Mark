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
  X
} from 'lucide-react'
import { CopilotResolution, ElementCropResult, CopilotStatus } from './CopilotTypes'
import { CopilotConfirmationModal } from './CopilotConfirmationModal'
import { request } from '@/lib/api'
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

  // Pending resolver promises
  const microDomResolverRef = useRef<((candidates: any[]) => void) | null>(null)
  const cropResolverRef = useRef<((crop: ElementCropResult) => void) | null>(null)
  const activeSelectorRef = useRef<string | null>(null)
  const speechRecognitionRef = useRef<any>(null)
  const inputRef = useRef<HTMLInputElement>(null)

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
    }

    window.addEventListener('message', handleWindowMessage)
    return () => {
      window.removeEventListener('message', handleWindowMessage)
    }
  }, [])

  // ─── Speech Recognition Setup ──────────────────────────────────────────────
  const toggleSpeechRecognition = useCallback(() => {
    if (typeof window === 'undefined') return

    // Stop if already recording
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

  // Cleanup speech recognition on unmount
  useEffect(() => {
    return () => {
      if (speechRecognitionRef.current) {
        try {
          speechRecognitionRef.current.abort()
        } catch (_) {}
      }
    }
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

  // ─── Main Submit & Handshake Flow ─────────────────────────────────────────
  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const trimmedPrompt = prompt.trim()
    if (!trimmedPrompt) return

    const iframe = iframeRef.current
    if (!iframe || !iframe.contentWindow) {
      setErrorMessage('Canvas frame is not ready. Please wait for the page to load.')
      setTimeout(() => setErrorMessage(null), 4000)
      return
    }

    setErrorMessage(null)
    setConfirmError(null)

    // Stop voice recording if active
    if (isRecording && speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop()
      } catch (_) {}
      setIsRecording(false)
    }

    try {
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

      // Timeout fallback for micro-DOM
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
          prompt: trimmedPrompt,
          micro_dom: candidates,
          viewport: {
            width: iframe.clientWidth || window.innerWidth,
            height: iframe.clientHeight || window.innerHeight,
          },
          session_id: sessionId,
        }),
      })

      if (!resolution || !resolution.selector) {
        throw new Error('AI was unable to locate a target element matching your request.')
      }

      // Step d: Apply ephemeral mutation to iframe
      setStatus('applying')
      setStatusMessage('Applying live preview & capturing crop...')
      applyEphemeralMutation(resolution)

      // Step d & e: Request element crop
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

      // Crop timeout fallback (3.5s)
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
  }, [prompt, iframeRef, sessionId, isRecording, applyEphemeralMutation])

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

      // Add to store so pin appears instantly on canvas and sidebar
      if (confirmedPin && confirmedPin.id) {
        useMarkerStore.getState().upsertMarkerFromServer(confirmedPin)
        onPinCreated?.(confirmedPin)
      }

      // Close modal and reset state
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
  }, [pendingResolution, pendingCrop, sessionId, reviewerId, onPinCreated])

  // ─── Modal Undo Handler ───────────────────────────────────────────────────
  const handleUndo = useCallback(() => {
    if (pendingResolution?.selector) {
      revertEphemeralMutation(pendingResolution.selector)
    } else {
      revertEphemeralMutation()
    }
    setIsModalOpen(false)
    setPendingResolution(null)
    setPendingCrop(null)
    setConfirmError(null)
  }, [pendingResolution, revertEphemeralMutation])

  const isLoading = status !== 'idle' && status !== 'error'

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
        <Maximize2 className="w-3.5 h-3.5 text-white/40 ml-1" />
      </button>
    )
  }

  return (
    <>
      <div
        className={cn(
          "fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-xl transition-all duration-300",
          className
        )}
      >
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
        <div className="relative flex items-center gap-2 p-1.5 pl-3 pr-2 rounded-full border border-white/10 bg-[#0d0d14]/90 text-white shadow-[0_12px_40px_rgba(0,0,0,0.65)] backdrop-blur-xl group hover:border-purple-500/30 transition-all">
          {/* AI Badge Icon */}
          <div
            className="flex-shrink-0 p-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400"
            title="STAGE AI Canvas Copilot"
          >
            <Sparkles className={cn("w-4 h-4", isLoading && "animate-spin text-purple-300")} />
          </div>

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
                placeholder={isRecording ? 'Listening to voice...' : 'Tell AI what to change or mark...'}
                disabled={isLoading}
                className={cn(
                  "w-full bg-transparent border-none text-xs sm:text-sm text-white placeholder-white/35 focus:outline-none focus:ring-0 px-1 py-1 min-w-0",
                  isRecording && "placeholder-rose-300 animate-pulse"
                )}
              />
            </form>
          )}

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
        onClose={handleUndo}
        resolution={pendingResolution}
        cropResult={pendingCrop}
        sessionId={sessionId}
        reviewerId={reviewerId}
        onConfirm={handleConfirmPin}
        onUndo={handleUndo}
        isConfirming={isConfirming}
        error={confirmError}
      />
    </>
  )
}
