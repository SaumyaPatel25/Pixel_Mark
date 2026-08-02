'use client'

import { useEffect } from 'react'
import { onIdTokenChanged } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { useAuthStore } from '@/store/authStore'

export function AuthInitializer() {
  const firebaseSync = useAuthStore(s => s.firebaseSync)

  useEffect(() => {
    // Synchronize refreshed Firebase ID token with backend session cookie
    const unsubscribe = onIdTokenChanged(auth, async (user) => {
      if (user) {
        try {
          const idToken = await user.getIdToken()
          await firebaseSync(idToken, user.displayName || undefined)
        } catch (err) {
          console.warn('[AuthInitializer] Background token sync notice:', err)
        }
      }
    })

    return () => unsubscribe()
  }, [firebaseSync])

  return null
}
