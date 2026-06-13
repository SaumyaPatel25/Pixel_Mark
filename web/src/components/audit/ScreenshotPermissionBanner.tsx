'use client'

import React from 'react'
import { useScreenshotStore } from '@/store/screenshotStore'
import { initScreenshotCapture } from '@/utils/screenshotCapture'
import { Button } from '@/components/ui/button'

export function ScreenshotPermissionBanner() {
  const { screenshotPermission, setPermission, setStream } = useScreenshotStore()

  if (screenshotPermission !== 'pending') {
    return null
  }

  const handleAllow = async () => {
    const stream = await initScreenshotCapture()
    if (stream) {
      // Listen for stream track ending (e.g., user clicks "Stop sharing" in browser UI)
      stream.getTracks().forEach((track) => {
        track.onended = () => {
          useScreenshotStore.getState().setStream(null)
          useScreenshotStore.getState().setPermission('ended')
        }
      })
      setStream(stream)
      setPermission('granted')
    } else {
      setPermission('denied')
    }
  }

  const handleSkip = () => {
    setPermission('skipped')
  }

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] bg-slate-900 border border-purple-500 rounded-lg shadow-xl p-4 flex items-center space-x-4 max-w-xl w-full">
      <div className="flex-1 text-sm text-white">
        <strong>PixelMark Screen Capture</strong>
        <p className="text-slate-300 mt-1 text-xs">
          PixelMark can capture screenshots for this session to make your feedback easier to understand.
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <Button onClick={handleAllow} className="bg-purple-600 hover:bg-purple-700 text-xs py-1 h-auto">
          Allow
        </Button>
        <Button variant="outline" onClick={handleSkip} className="text-xs py-1 h-auto border-slate-700 text-slate-300 hover:bg-slate-800">
          Skip for now
        </Button>
      </div>
    </div>
  )
}
