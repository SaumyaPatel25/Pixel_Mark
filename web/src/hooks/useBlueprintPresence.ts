'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useBlueprintPresenceStore } from '@/store/useBlueprintPresenceStore'
import { getApiBaseUrl } from '@/lib/api'

export function useBlueprintPresence(projectId: string, currentFrameId?: string) {
  const socketRef = useRef<WebSocket | null>(null)
  const lastCursorSendRef = useRef<number>(0)

  const {
    localUserId,
    localUserName,
    localUserColor,
    setConnected,
    setPresenceState,
    addOrUpdateUser,
    removeUser,
    setRemoteCursor,
    setRemoteSelection,
    reset
  } = useBlueprintPresenceStore()

  useEffect(() => {
    if (!projectId) return

    let isUnmounted = false

    // Determine WS protocol & host
    const apiBase = getApiBaseUrl()
    let wsHost = 'localhost:8765'
    try {
      const parsed = new URL(apiBase)
      wsHost = parsed.host
    } catch (_) {}

    const wsProtocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${wsProtocol}//${wsHost}/ws/canvas/${projectId}?user_id=${encodeURIComponent(localUserId)}&name=${encodeURIComponent(localUserName)}&color=${encodeURIComponent(localUserColor)}`

    console.log(`[STAGE Blueprint WS] Connecting to ${wsUrl}`)
    const ws = new WebSocket(wsUrl)
    socketRef.current = ws

    ws.onopen = () => {
      if (isUnmounted) return
      console.log('[STAGE Blueprint WS] Connected successfully')
      setConnected(true)
    }

    ws.onmessage = (event) => {
      if (isUnmounted) return
      try {
        const data = JSON.parse(event.data)
        const type = data.type

        if (type === 'presence_state') {
          setPresenceState(data.users || [])
        } else if (type === 'presence_join') {
          if (data.user?.user_id) {
            addOrUpdateUser({
              userId: data.user.user_id,
              name: data.user.name,
              color: data.user.color,
              avatarUrl: data.user.avatar_url
            })
          }
        } else if (type === 'presence_leave') {
          if (data.user_id) {
            removeUser(data.user_id)
          }
        } else if (type === 'cursor_move') {
          if (data.user_id) {
            setRemoteCursor(data.user_id, {
              x: data.x,
              y: data.y,
              frameId: data.frame_id
            })
          }
        } else if (type === 'selection_change') {
          if (data.user_id) {
            setRemoteSelection(data.user_id, {
              frameId: data.frame_id,
              targetSelector: data.target_selector
            })
          }
        }
      } catch (err) {
        console.warn('[STAGE Blueprint WS] Invalid frame payload:', err)
      }
    }

    ws.onerror = (err) => {
      console.warn('[STAGE Blueprint WS] Error:', err)
      setConnected(false)
    }

    ws.onclose = () => {
      if (isUnmounted) return
      console.log('[STAGE Blueprint WS] Closed')
      setConnected(false)
      reset()
    }

    const handleBeforeUnload = () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close()
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      isUnmounted = true
      window.removeEventListener('beforeunload', handleBeforeUnload)
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close()
      }
      socketRef.current = null
      reset()
    }
  }, [projectId, localUserId, localUserName, localUserColor, setConnected, setPresenceState, addOrUpdateUser, removeUser, setRemoteCursor, setRemoteSelection, reset])

  // Throttled cursor broadcast action (max 1 frame per 60ms)
  const sendCursorMove = useCallback((x: number, y: number, frameId?: string) => {
    const now = Date.now()
    if (now - lastCursorSendRef.current < 60) return
    lastCursorSendRef.current = now

    const socket = socketRef.current
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'cursor_move',
        x,
        y,
        frame_id: frameId || currentFrameId
      }))
    }
  }, [currentFrameId])

  // Selection change broadcast action
  const sendSelectionChange = useCallback((frameId?: string, targetSelector?: string) => {
    const socket = socketRef.current
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'selection_change',
        frame_id: frameId || currentFrameId,
        target_selector: targetSelector
      }))
    }
  }, [currentFrameId])

  return {
    sendCursorMove,
    sendSelectionChange
  }
}
