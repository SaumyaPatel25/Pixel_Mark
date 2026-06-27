import React, { useState } from 'react'
import { useMarkerStore } from '@/store/markerStore'
import { Sparkles } from 'lucide-react'
import Link from 'next/link'

interface Props {
  sessionId: string
  markerCount: number
}

export function AITriageButton({ sessionId, markerCount }: Props) {
  const { triageSession, isTriaging, triageError } = useMarkerStore()
  const [success, setSuccess] = useState(false)

  const handleTriage = async () => {
    setSuccess(false)
    await triageSession(sessionId)
    // Checking if the store successfully triaged based on error presence in store
    if (!useMarkerStore.getState().triageError) {
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    }
  }

  const isNoProviderError = triageError?.toLowerCase().includes('no active default')

  return (
    <div className="relative inline-block">
      <button
        onClick={handleTriage}
        disabled={markerCount === 0 || isTriaging}
        className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
          markerCount === 0
            ? 'bg-slate-800/50 text-gray-500 cursor-not-allowed'
            : isTriaging
            ? 'bg-purple-600/50 text-purple-200 cursor-not-allowed'
            : 'bg-purple-600 hover:bg-purple-500 text-white shadow-sm shadow-purple-900/50'
        }`}
      >
        <Sparkles size={16} className={isTriaging ? 'animate-pulse' : ''} />
        {isTriaging ? 'Triaging...' : 'AI Triage'}
      </button>

      {success && (
        <div className="absolute top-full mt-2 right-0 whitespace-nowrap bg-green-500/10 text-green-400 border border-green-500/20 px-3 py-1.5 rounded-md text-xs font-medium animate-in fade-in slide-in-from-top-1">
          Triaged {markerCount} markers
        </div>
      )}

      {triageError && !success && (
        <div className="absolute top-full mt-2 right-0 w-64 bg-slate-800 border border-red-500/30 p-3 rounded-lg shadow-xl z-50 animate-in fade-in slide-in-from-top-1">
          {isNoProviderError ? (
            <div className="space-y-2">
              <p className="text-sm text-gray-300">
                Connect your own AI provider to use AI triage.
              </p>
              <Link 
                href="/settings/ai?source=session_cta" 
                className="inline-block text-xs font-medium text-blue-400 hover:text-blue-300"
              >
                Open AI settings →
              </Link>
            </div>
          ) : (
            <p className="text-sm text-red-400">{triageError}</p>
          )}
        </div>
      )}
    </div>
  )
}
