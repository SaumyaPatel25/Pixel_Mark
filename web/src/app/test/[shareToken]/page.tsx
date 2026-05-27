// src/app/test/[shareToken]/page.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { api } from '@/lib/api'
import { Comment } from '@/lib/api-contracts'
import { Loader2, AlertCircle } from 'lucide-react'

import { useProjectStore } from '@/store/projectStore'
import { useCommentStore } from '@/store/commentStore'
import { useRealtimeStore } from '@/store/realtimeStore'
import { useOverlayStore } from '@/store/overlayStore'

export default function TesterPage() {
  const params = useParams()
  const shareToken = params.shareToken as string
  
  const { currentProject, setCurrentProject, loading: isProjectLoading, error: projectError } = useProjectStore()
  const { comments, loadComments, error: commentError } = useCommentStore()
  const { setConnected, updateCursor } = useRealtimeStore()

  const wsRef = useRef<WebSocket | null>(null)
  const lastEmitRef = useRef(0)

  useEffect(() => {
    if (!shareToken) return

    async function initAudit() {
      try {
        // 1. Resolve token to project
        const project = await api.shareLinks.resolve(shareToken)
        setCurrentProject(project)
        
        // 2. Load existing comments
        await loadComments(project.id)

        // 3. Setup WebSocket
        const tester_id = localStorage.getItem('tester_id') ?? (() => {
          const id = crypto.randomUUID()
          localStorage.setItem('tester_id', id)
          return id
        })()
        const tester_name = localStorage.getItem('tester_name') ?? 'Auditor'

        const host = window.location.host.includes('localhost') ? 'localhost:8765' : window.location.host
        const protocol = window.location.protocol.replace('http', 'ws')
        const wsUrl = `${protocol}//${host}/ws/project/${project.id}?tester_id=${encodeURIComponent(tester_id)}&tester_name=${encodeURIComponent(tester_name)}`
        
        const socket = new WebSocket(wsUrl)
        wsRef.current = socket

        socket.onopen = () => setConnected(true)
        socket.onclose = () => setConnected(false)
        socket.onmessage = (event) => {
          const data = JSON.parse(event.data)
          if (data.type === 'CURSOR_MOVE') {
            updateCursor(data.tester_id, data.x, data.y, data.name || data.tester_name)
          }
          if (data.type === 'NEW_COMMENT') {
            useCommentStore.getState().addCommentFromWS(data.comment)
          }
        }
      } catch (err: unknown) {
        console.error('[TesterPage] Audit Initialization Failed:', err)
      }
    }

    initAudit()
    return () => wsRef.current?.close()
  }, [shareToken, setCurrentProject, loadComments, setConnected, updateCursor])

  const handleMouseMove = (e: React.MouseEvent) => {
    const now = Date.now()
    if (now - lastEmitRef.current < 50) return
    lastEmitRef.current = now

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const rect = e.currentTarget.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * 100
      const y = ((e.clientY - rect.top) / rect.height) * 100
      wsRef.current.send(JSON.stringify({ type: 'CURSOR_MOVE', x, y }))
    }
  }

  if (isProjectLoading) return (
    <div className="flex h-screen items-center justify-center bg-[#0a0a0a]">
      <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
    </div>
  )

  const error = projectError || commentError
  if (error || !currentProject) return (
    <div className="flex h-screen items-center justify-center bg-[#0a0a0a] text-white p-6 text-center">
      <div className="space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h1 className="text-2xl font-black uppercase tracking-widest text-white/90">Audit Expired</h1>
        <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest leading-relaxed">
          {typeof error === 'string' ? error : 'Invalid link or unauthorized access'}
        </p>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-[#0a0a0a] text-white overflow-hidden font-sans">
      <div className="flex-1 relative border-r border-white/5 bg-white/[0.02]" onMouseMove={handleMouseMove}>
        <div className="absolute top-4 left-6 z-20 flex items-center gap-4 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-white/50">Live Tester View</span>
          </div>
          <div className="h-4 w-[1px] bg-white/10" />
          <span className="text-xs font-bold uppercase tracking-widest">{currentProject.name}</span>
        </div>

        <iframe 
          src={api.proxyUrl(currentProject.target_url)}
          className="w-full h-full border-none"
          title="Testing Viewport"
        />
      </div>

      <div className="w-96 h-full border-l border-white/5 flex flex-col items-center justify-center bg-black/40">
         <p className="text-[10px] font-black uppercase tracking-widest text-white/20">Audit Stream Engaged</p>
      </div>
    </div>
  )
}
