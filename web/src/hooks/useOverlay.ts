// src/hooks/useOverlay.ts
import { useEffect, useCallback } from 'react'

export interface ElementRect {
  x: number; y: number; width: number; height: number
}

export interface MarkerPayload {
  type:         'MARKER_DROPPED'
  markerNumber: number
  projectId:    string
  selector:     string
  xpath:        string
  tagName:      string
  innerText:    string
  pageUrl:      string
  clientX:      number
  clientY:      number
  elementRect:  ElementRect | null
  screenshot:   string | null   // base64 PNG — filled in by parent after capture
}

interface UseOverlayOptions {
  projectId:       string
  iframeRef:       React.RefObject<HTMLIFrameElement | null>
  onMarkerDropped: (payload: MarkerPayload) => void
  captureScreen?:  (rect: ElementRect | null) => Promise<string | null>
  enabled?:        boolean
}

export function useOverlay({
  projectId,
  iframeRef,
  onMarkerDropped,
  captureScreen,
  enabled = true,
}: UseOverlayOptions) {

  const handleMessage = useCallback(async (event: MessageEvent) => {
    if (!event.data || event.data.source !== 'stage-overlay') return
    if (event.data.type !== 'MARKER_DROPPED') return
    if (event.data.projectId !== projectId) return

    const payload = event.data as Omit<MarkerPayload, 'screenshot'>

    // Take screenshot via Screen Capture API if enabled, otherwise null
    const screenshot = captureScreen ? await captureScreen(payload.elementRect) : null

    onMarkerDropped({ ...payload, screenshot })
  }, [projectId, captureScreen, onMarkerDropped])

  useEffect(() => {
    if (!enabled) return
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [handleMessage, enabled])
}
