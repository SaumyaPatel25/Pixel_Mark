'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'

export function AuthInitializer() {
  const firebaseSync = useAuthStore(s => s.firebaseSync)
  const pathname = usePathname()

  const isPublicMarketingPage = !pathname || pathname === '/' || pathname === '/pricing' || pathname === '/features' || pathname === '/faq' || pathname === '/company'

  useEffect(() => {
    let unsubscribe = () => {}

    const initFirebase = async () => {
      try {
        const { auth } = await import('@/lib/firebase')
        const { onIdTokenChanged } = await import('firebase/auth')

        unsubscribe = onIdTokenChanged(auth, async (user) => {
          if (user) {
            try {
              const idToken = await user.getIdToken()
              await firebaseSync(idToken, user.displayName || undefined)
            } catch (err) {
              console.warn('[AuthInitializer] Background token sync notice:', err)
            }
          }
        })
      } catch (err) {
        console.warn('[AuthInitializer] Firebase init failed:', err)
      }
    }

    if (isPublicMarketingPage) {
      // Defer firebase token monitoring on marketing pages to user interaction or 6s idle
      const triggerLoad = () => {
        initFirebase()
        cleanup()
      }
      const cleanup = () => {
        window.removeEventListener('scroll', triggerLoad)
        window.removeEventListener('pointerdown', triggerLoad)
        window.removeEventListener('keydown', triggerLoad)
        window.removeEventListener('touchstart', triggerLoad)
      }
      window.addEventListener('scroll', triggerLoad, { passive: true, once: true })
      window.addEventListener('pointerdown', triggerLoad, { passive: true, once: true })
      window.addEventListener('keydown', triggerLoad, { passive: true, once: true })
      window.addEventListener('touchstart', triggerLoad, { passive: true, once: true })
      const timer = setTimeout(triggerLoad, 6000)
      return () => {
        cleanup()
        clearTimeout(timer)
        unsubscribe()
      }
    } else {
      initFirebase()
      return () => unsubscribe()
    }
  }, [firebaseSync, isPublicMarketingPage])

  return null
}
