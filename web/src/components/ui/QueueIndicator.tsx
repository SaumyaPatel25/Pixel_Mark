'use client'

import { useState, useEffect } from 'react'
import { apiQueue } from '@/lib/apiQueue'

export function QueueIndicator() {
  const [status, setStatus] = useState(apiQueue.getStatus())
  
  useEffect(() => {
    const unsubscribe = apiQueue.subscribe(setStatus)
    return () => {
      unsubscribe()
    }
  }, [])
  
  if (status.isIdle) return null
  
  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 bg-stone-900 border border-stone-700 rounded-full px-3 py-1.5 text-xs text-stone-400 shadow-lg animate-in slide-in-from-bottom-2">
      <div className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
      {status.pendingWrites > 0
        ? `Saving ${status.pendingWrites} change${status.pendingWrites > 1 ? 's' : ''}...`
        : 'Loading...'}
    </div>
  )
}
