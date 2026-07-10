'use client'

import { useEffect, useState } from 'react'

export function useViewportHeight() {
  const [height, setHeight] = useState<number>(0)

  useEffect(() => {
    if (typeof window === 'undefined') return

    let rAFId: number | null = null
    const updateHeight = () => {
      if (rAFId) return
      rAFId = requestAnimationFrame(() => {
        // Use the VisualViewport API if available, which accounts for virtual keyboards and browser chrome
        const vv = window.visualViewport
        const vh = vv ? vv.height : window.innerHeight
        setHeight(vh)
        rAFId = null
      })
    }

    // Run first measurement synchronously to avoid initial render delay
    const vv = window.visualViewport
    setHeight(vv ? vv.height : window.innerHeight)

    window.addEventListener('resize', updateHeight, { passive: true })
    window.addEventListener('orientationchange', updateHeight, { passive: true })
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateHeight, { passive: true })
      window.visualViewport.addEventListener('scroll', updateHeight, { passive: true })
    }

    return () => {
      window.removeEventListener('resize', updateHeight)
      window.removeEventListener('orientationchange', updateHeight)
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', updateHeight)
        window.visualViewport.removeEventListener('scroll', updateHeight)
      }
      if (rAFId) cancelAnimationFrame(rAFId)
    }
  }, [])

  return height
}
