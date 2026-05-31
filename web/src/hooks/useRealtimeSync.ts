import { useEffect, useRef, useCallback, useState } from 'react'
import { useCommentStore } from '@/store/commentStore'

const WS_BASE = process.env.NEXT_PUBLIC_WS_BASE?.replace(/\/$/, '')
  || 'ws://localhost:8765'

const MAX_RETRIES = 4
const BACKOFF_BASE_MS = 1500   // 1.5s, 3s, 6s, 12s

interface RealtimeSyncOptions {
  projectId: string
  onMessage: (payload: unknown) => void
  enabled?: boolean
}

export function useRealtimeSync({ projectId, onMessage, enabled = true }: RealtimeSyncOptions) {
  const [connected, setConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const retryRef = useRef(0)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const unmountedRef = useRef(false)

  const cleanup = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    if (wsRef.current) {
      // Remove all handlers first to prevent onclose re-triggering connect()
      wsRef.current.onopen = null
      wsRef.current.onmessage = null
      wsRef.current.onerror = null
      wsRef.current.onclose = null
      if (wsRef.current.readyState <= WebSocket.OPEN) {
        wsRef.current.close(1000, 'cleanup')
      }
      wsRef.current = null
    }
  }, [])

  const connect = useCallback(() => {
    if (unmountedRef.current) return
    if (!enabled || !projectId) return

    // Validate UUID format before connecting — prevents 4000 closes
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(projectId)) {
      console.warn('[PixelMark WS] Invalid projectId format — WebSocket skipped:', projectId)
      return
    }

    // Don't open a second socket if one is already open/connecting
    if (wsRef.current && wsRef.current.readyState <= WebSocket.OPEN) return

    const url = `${WS_BASE}/ws/${projectId}`
    console.log(`[PixelMark WS] Connecting → ${url} (attempt ${retryRef.current + 1})`)

    let ws: WebSocket
    try {
      ws = new WebSocket(url)
    } catch (err) {
      // This only throws on completely invalid URLs, not connection failures
      console.error('[PixelMark WS] Invalid WebSocket URL:', url, err)
      return
    }

    wsRef.current = ws

    ws.onopen = () => {
      if (unmountedRef.current) { ws.close(1000); return }
      console.log('[PixelMark WS] ✓ Connected to project:', projectId)
      retryRef.current = 0
      setConnected(true)
    }

    ws.onmessage = (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data as string)
        console.log('[PixelMark WS] Recv:', payload.type)

        // Route message types to the correct store actions
        switch (payload.type) {
          case 'NEW_COMMENT':
            useCommentStore.getState().addCommentFromWS(payload.comment)
            break
          case 'COMMENT_TRIAGED':
            useCommentStore.getState().updateSeverity(payload.comment_id, payload.severity)
            break
          case 'COMMENT_RESOLVED':
            useCommentStore.getState().updateStatus(payload.comment_id, 'resolved')
            break
          default:
            // Fallback for generic untyped messages or other modules
            if (onMessage) onMessage(payload)
            else console.warn('[PixelMark WS] Unknown message type:', payload.type)
        }
      } catch {
        console.warn('[PixelMark WS] Unparseable message — ignored')
      }
    }

    ws.onerror = () => {
      // onerror NEVER has useful details in the browser — that's the spec.
      // onclose fires immediately after with the close code — handle retry there.
      console.warn(`[PixelMark WS] Socket error on project ${projectId} — waiting for close event`)
    }

    ws.onclose = (event: CloseEvent) => {
      if (unmountedRef.current) return
      setConnected(false)
      wsRef.current = null

      const cleanClose = event.code === 1000 || event.code === 1001
      const serverRejected = event.code === 4000  // our custom "invalid project" code
      const retriesLeft = retryRef.current < MAX_RETRIES

      if (cleanClose || serverRejected || !retriesLeft) {
        if (serverRejected) console.warn('[PixelMark WS] Server rejected connection (invalid project ID?)')
        if (!retriesLeft) console.error('[PixelMark WS] Max retries reached — realtime sync disabled until reload')
        return
      }

      const delay = BACKOFF_BASE_MS * Math.pow(2, retryRef.current)
      retryRef.current++
      console.log(`[PixelMark WS] Reconnecting in ${delay}ms (attempt ${retryRef.current}/${MAX_RETRIES})...`)
      timeoutRef.current = setTimeout(connect, delay)
    }
  }, [projectId, enabled, onMessage])

  useEffect(() => {
    unmountedRef.current = false
    connect()
    return () => {
      unmountedRef.current = true
      cleanup()
    }
  }, [connect, cleanup])

  const send = useCallback((data: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data))
    } else {
      console.warn('[PixelMark WS] Cannot send — socket not open')
    }
  }, [])

  return { connected, send }
}
