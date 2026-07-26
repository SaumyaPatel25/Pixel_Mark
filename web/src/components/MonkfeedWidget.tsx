'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { usePathname } from 'next/navigation'
import Script from 'next/script'
import { useAuthStore } from '@/store/authStore'

export default function MonkfeedWidget() {
  const pathname = usePathname()
  const user = useAuthStore((s) => s.user)
  const [remountKey, setRemountKey] = useState(0)

  // Listen to login/logout custom events to update remountKey and re-initialize
  useEffect(() => {
    const handleAuthChange = () => {
      setRemountKey((prev) => prev + 1)
    }

    window.addEventListener('monkfeed-login', handleAuthChange)
    window.addEventListener('monkfeed-logout', handleAuthChange)

    return () => {
      window.removeEventListener('monkfeed-login', handleAuthChange)
      window.removeEventListener('monkfeed-logout', handleAuthChange)
    }
  }, [])

  // Do not render inside Blueprint Canvas or live session review iframe surfaces
  const shouldShowWidget = useMemo(() => {
    if (typeof window !== 'undefined') {
      try {
        if (window.self !== window.top) {
          return false // loaded inside an iframe context
        }
      } catch (e) {
        return false
      }
    }

    if (!pathname) return true

    const isBlueprint = pathname.includes('/blueprint')
    const isReview = pathname.includes('/review')
    const isTest = pathname.includes('/test')
    const isSampleTarget = pathname.includes('/sample-target')

    return !(isBlueprint || isReview || isTest || isSampleTarget)
  }, [pathname])

  if (!shouldShowWidget) {
    return null
  }

  return (
    <div key={remountKey}>
      <style dangerouslySetInnerHTML={{__html: `
        #monkfeed-widget-container,
        #monkfeed-launcher-container,
        iframe[id^="monkfeed"],
        iframe[src*="monkfeed"],
        .monkfeed-widget-launcher {
          left: 24px !important;
          right: auto !important;
          bottom: 24px !important;
          z-index: 99999 !important;
        }
      `}} />
      <div
        className="monkfeed-widget"
        data-application-id="6a60efa31a4920a4561af412"
        data-user-id={user?.id || ''}
        data-email={user?.email || ''}
        data-require-identity="false"
        data-primary-color="var(--color-primary)"
        data-launcher-color="var(--color-primary)"
        data-bg-color="var(--color-bg)"
        data-text-color="var(--color-text)"
        data-widget-name="STAGE Support"
        data-catchphrase="Got feedback or visual QA questions? Ask us here!"
        data-position="bottom-left"
      />
      <Script
        key={`monkfeed-script-${remountKey}`}
        src="https://www.monkfeed.com/widget.js"
        strategy="afterInteractive"
      />
    </div>
  )
}
