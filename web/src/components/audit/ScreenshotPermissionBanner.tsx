'use client'

import React from 'react'
import { useScreenshotStore } from '@/store/screenshotStore'
import { useUIStore } from '@/store/uiStore'
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
      useUIStore.getState().addToast('Screen capture allowed successfully!', 'success')
    } else {
      setPermission('denied')
      useUIStore.getState().addToast('Permission denied. Screen capture is disabled.', 'error')
    }
  }

  const handleSkip = () => {
    setPermission('skipped')
  }

  return (
    <div className="fixed bottom-4 md:bottom-auto md:top-4 left-1/2 -translate-x-1/2 z-40 bg-white border border-[#293681]/20 rounded-2xl shadow-2xl p-4 sm:p-5 flex items-center space-x-3 sm:space-x-4 max-w-[calc(100vw-2rem)] md:max-w-xl w-full">
      <div className="flex-1 text-sm text-slate-800">
        <strong className="text-[#293681] font-black uppercase tracking-wider text-xs">Screen Capture Request</strong>
        <p className="text-slate-500 mt-1 text-xs font-bold leading-normal">
          STAGE can capture screenshots for this session to make your feedback easier to understand.
        </p>
      </div>
      <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0">
        <Button id="onboarding-allow-capture-btn" onClick={handleAllow} className="bg-[#293681] hover:bg-[#112E81] text-white text-xs py-2 px-3.5 rounded-xl h-auto font-black uppercase tracking-wider">
          Allow
        </Button>
        <Button onClick={handleSkip} className="text-xs py-2 px-3.5 rounded-xl h-auto border-slate-200 text-slate-600 hover:bg-slate-50 font-bold uppercase tracking-wider">
          Skip
        </Button>
      </div>
    </div>
  )
}
