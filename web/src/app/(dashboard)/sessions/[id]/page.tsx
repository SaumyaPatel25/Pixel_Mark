'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { ArrowLeft, Loader2, ExternalLink } from 'lucide-react'

export default function SessionPage() {
  const params = useParams()
  const sessionId = typeof params.id === 'string' ? params.id : Array.isArray(params.id) ? params.id[0] : ''
  const router = useRouter()

  const [sessionTitle, setSessionTitle] = useState('Review Session')
  const [projectId, setProjectId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (sessionId) {
      api.sessions.getSession(sessionId)
        .then(res => {
          if (res) {
            setSessionTitle(res.title || 'Review Session')
            setProjectId(res.project_id)
            // Auto-redirect to project page where the full audit surface lives
            if (res.project_id) {
              router.replace(`/project/${res.project_id}?session=${sessionId}`)
            }
          }
        })
        .finally(() => setIsLoading(false))
    }
  }, [sessionId, router])

  // Show loading while we fetch and redirect
  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center gap-4">
      <Loader2 className="w-8 h-8 text-white/40 animate-spin" />
      <p className="text-white/30 text-xs font-mono uppercase tracking-widest">Opening session…</p>
      {!isLoading && projectId && (
        <button
          onClick={() => router.push(`/project/${projectId}?session=${sessionId}`)}
          className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600/20 border border-purple-500/30 text-purple-400 text-sm hover:bg-purple-600/30 transition-all"
        >
          <ExternalLink className="w-4 h-4" />
          Open in Project View
        </button>
      )}
      {!isLoading && !projectId && (
        <div className="flex flex-col items-center gap-3">
          <p className="text-white/50 text-sm">Session not found or project unavailable.</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/50 text-sm hover:bg-white/10 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
        </div>
      )}
    </div>
  )
}
