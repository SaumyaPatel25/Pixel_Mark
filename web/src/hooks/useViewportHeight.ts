'use client'

import { useEffect, useState } from 'react'

export function useViewportHeight() {
  const [height, setHeight] = useState<number>(0)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const updateHeight = () => {
      // Use the VisualViewport API if available, which accounts for virtual keyboards and browser chrome
      const vv = window.visualViewport
      const vh = vv ? vv.height : window.innerHeight
      setHeight(vh)
    }

    updateHeight()

    window.addEventListener('resize', updateHeight)
    window.addEventListener('orientationchange', updateHeight)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateHeight)
      window.visualViewport.addEventListener('scroll', updateHeight)
    }

    return () => {
      window.removeEventListener('resize', updateHeight)
      window.removeEventListener('orientationchange', updateHeight)
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', updateHeight)
        window.visualViewport.removeEventListener('scroll', updateHeight)
      }
    }
  }, [])

  return height
}
