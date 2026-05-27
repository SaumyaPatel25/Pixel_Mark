import { useEffect, useRef, useState } from 'react'
import { useMarkerStore, Marker } from '@/store/markerStore'

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8765').replace(/\/$/, '')
const WS_BASE = API_BASE.replace(/^http/, 'ws')

export function useSessionSocket(sessionId: string) {
  const socketRef = useRef<WebSocket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const reconnectTimeoutRef = useRef<any>(null)

  const connect = () => {
    if (!sessionId) return

    // Clean up existing if any
    if (socketRef.current) {
      socketRef.current.close()
    }

    const wsUrl = `${WS_BASE}/ws/session/${sessionId}`
    const socket = new WebSocket(wsUrl)
    socketRef.current = socket

    socket.onopen = () => {
      setIsConnected(true)
      console.log(`[WebSocket] Connected to session socket: ${sessionId}`)
    };

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        const store = useMarkerStore.getState()

        switch (message.type) {
          case 'marker_created': {
            const newMarker: Marker = message.marker
            useMarkerStore.setState({
              markers: [...store.markers, newMarker],
              filtered: [...store.filtered, newMarker],
            })
            break
          }
          case 'marker_updated': {
            const updated: Marker = message.marker
            const nextMarkers = store.markers.map((m) =>
              m.id === updated.id ? updated : m
            )
            useMarkerStore.setState({ markers: nextMarkers })
            store.setFilter({}) // refresh view
            break
          }
          case 'marker_deleted': {
            const deletedId = message.marker_id
            const nextMarkers = store.markers.filter((m) => m.id !== deletedId)
            useMarkerStore.setState({ markers: nextMarkers })
            store.setFilter({}) // refresh view
            break
          }
          default:
            console.log('[WebSocket] Unhandled broadcast message type:', message.type)
        }
      } catch (err) {
        console.error('[WebSocket] Message parsing error:', err)
      }
    };

    socket.onclose = (event) => {
      setIsConnected(false)
      socketRef.current = null
      console.log('[WebSocket] Closed. Attempting reconnect in 2 seconds...', event.reason)
      
      // Auto-reconnect every 2 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        connect()
      }, 2000)
    };

    socket.onerror = (err) => {
      console.error('[WebSocket] Error occurred:', err)
      socket.close()
    };
  }

  useEffect(() => {
    connect()

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (socketRef.current) {
        socketRef.current.close()
      }
    }
  }, [sessionId])

  const sendMessage = (data: object) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(data))
    } else {
      console.warn('[WebSocket] Cannot send message, socket is not connected')
    }
  }

  return { sendMessage, isConnected }
}
