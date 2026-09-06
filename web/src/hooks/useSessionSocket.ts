import { useEffect, useRef, useState } from 'react'
import { useMarkerStore } from '@/store/markerStore'
import { useNotificationStore } from '@/store/useNotificationStore'
import { useUIStore } from '@/store/uiStore'
import { getStoredReviewerIdentity } from '@/lib/reviewerIdentity'
import { getApiBaseUrl } from '@/lib/api'

const API_BASE = getApiBaseUrl()
const WS_BASE = API_BASE.replace(/^https:/, 'wss:').replace(/^http:/, 'ws:')

export interface UseSessionSocketResult {
  isConnected: boolean
  requestSnapshot: () => void
}

export function useSessionSocket(
  sessionId: string,
  actorContext?: { id: string; role: 'developer' | 'reviewer' } | null
): UseSessionSocketResult {
  const socketRef = useRef<WebSocket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const heartbeatIntervalRef = useRef<any>(null)
  const reconnectTimeoutRef = useRef<any>(null)
  const backoffRef = useRef<number>(1000) // Initial backoff 1s
  const isReconnectingRef = useRef<boolean>(false)

  // Use a ref for actorContext to avoid tearing connections on context updates
  const actorContextRef = useRef(actorContext)
  useEffect(() => {
    actorContextRef.current = actorContext
  }, [actorContext])

  const connect = () => {
    if (!sessionId) return

    // Clean up existing
    cleanupTimers()
    if (socketRef.current) {
      socketRef.current.onclose = null
      socketRef.current.onerror = null
      socketRef.current.onmessage = null
      socketRef.current.onopen = null
      socketRef.current.close()
    }

    // Resolve actor details (auth dev vs sessionStorage reviewer)
    let actorId = ''
    let actorRole = ''
    
    const ctx = actorContextRef.current
    if (ctx) {
      actorId = ctx.id
      actorRole = ctx.role
    } else {
      const stored = getStoredReviewerIdentity(sessionId)
      if (stored) {
        actorId = stored.id
        actorRole = 'reviewer'
      }
    }

    const params = new URLSearchParams()
    if (actorId) params.append('actor_id', actorId)
    if (actorRole) params.append('actor_role', actorRole)
    params.append('client_kind', 'browser')

    const wsUrl = `${WS_BASE}/ws/sessions/${sessionId}?${params.toString()}`
    console.log(`[WebSocket] Connecting to: ${wsUrl}`)

    const socket = new WebSocket(wsUrl)
    socketRef.current = socket

    socket.onopen = () => {
      console.log(`[WebSocket] Connection opened for session: ${sessionId}`)
      setIsConnected(true)
      useMarkerStore.getState().setConnectionStatus('connected')
      backoffRef.current = 1000 // Reset backoff on success

      // Reconnect/Open always triggers full session markers reconcile
      console.log(`[WebSocket] Reconnect/Open detected. Reconciling store markers...`)
      useMarkerStore.getState().reconcileSessionMarkers(sessionId)
      isReconnectingRef.current = false

      // Start heartbeat
      startHeartbeat()
    }

    socket.onmessage = (event) => {
      try {
        if (event.data === 'pong') return
        const parsed = JSON.parse(event.data)

        const evtType = parsed.type || parsed.event_type || ''
        const isNotifEvent = ['notification_dispatched', 'marker_created', 'marker_resolved'].includes(evtType)

        if (isNotifEvent) {
          const markerData = parsed.data?.marker || parsed.data || parsed
          const actorName = markerData.creator_name || parsed.actor_name || markerData.actor_name || (parsed.actor_role === 'reviewer' ? 'Reviewer' : 'Team member')
          const targetStr = markerData.target_selector || markerData.page_url || 'element'
          const detailStr = markerData.title || markerData.description || (markerData.marker_number ? `Pin #${markerData.marker_number}` : 'Feedback pin')
          const isResolved = evtType === 'marker_resolved'
          
          const notifTitle = isResolved 
            ? `Pin Resolved: ${markerData.title || 'Feedback Pin'}`
            : `New Pin: ${markerData.title || 'Feedback Pin'}`

          const notifBody = isResolved
            ? `${actorName} marked pin on '${targetStr}' as resolved.`
            : `${actorName} added a pin on '${targetStr}': "${detailStr}"`

          const payload = {
            id: `ws_notif_${parsed.event_id || Date.now()}`,
            source_type: 'session',
            event_type: isResolved ? 'pin_resolved' : 'pin_created',
            entity_type: 'marker',
            entity_id: parsed.marker_id || markerData.id,
            title: notifTitle,
            body: notifBody,
            actor_name: actorName,
            target_name: targetStr,
            marker_id: parsed.marker_id || markerData.id,
            created_at: parsed.occurred_at || new Date().toISOString()
          }

          useNotificationStore.getState().addNotification(payload)

          // Trigger lightweight UI toast
          const toastMsg = `${actorName}: ${notifTitle}`
          useUIStore.getState().addToast(toastMsg, 'info')

          // Sync full notifications list from server
          useNotificationStore.getState().fetchNotifications()
        }

        useMarkerStore.getState().handleRealtimeEvent(parsed)
      } catch (err) {
        console.error('[WebSocket] Message parse error:', err)
      }
    }

    socket.onclose = (event) => {
      console.log(`[WebSocket] Connection closed for session ${sessionId}. Reason: ${event.reason || 'None'}`)
      handleDisconnect()
    }

    socket.onerror = (err) => {
      console.error('[WebSocket] Socket error:', err)
      // socket.close() will trigger onclose
    }
  }

  const handleDisconnect = () => {
    setIsConnected(false)
    useMarkerStore.getState().setConnectionStatus('disconnected')
    cleanupTimers()

    isReconnectingRef.current = true

    const currentBackoff = backoffRef.current
    console.log(`[WebSocket] Reconnecting in ${currentBackoff / 1000}s...`)
    
    reconnectTimeoutRef.current = setTimeout(() => {
      // Cap exponential backoff around 15s
      backoffRef.current = Math.min(currentBackoff * 2, 15000)
      connect()
    }, currentBackoff)
  }

  const startHeartbeat = () => {
    heartbeatIntervalRef.current = setInterval(() => {
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({ type: 'heartbeat' }))
      }
    }, 10000) // Send heartbeat every 10s
  }

  const requestSnapshot = () => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'session_snapshot_requested' }))
    }
  }

  const cleanupTimers = () => {
    if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current)
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
  }

  useEffect(() => {
    if (sessionId) {
      useMarkerStore.getState().resetForSessionChange(sessionId)
    }
    connect()

    return () => {
      cleanupTimers()
      if (socketRef.current) {
        socketRef.current.onclose = null
        socketRef.current.onerror = null
        socketRef.current.onmessage = null
        socketRef.current.onopen = null
        socketRef.current.close()
      }
    }
  }, [sessionId, actorContext?.id, actorContext?.role])

  return {
    isConnected,
    requestSnapshot
  }
}
