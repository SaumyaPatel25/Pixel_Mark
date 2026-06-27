'use client'

/**
 * PostHogProvider — wraps the app, initialises PostHog on mount,
 * and fires a page-view on every client-side navigation.
 *
 * Placed in layout.tsx so it runs across every route.
 */

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { initPostHog, posthog } from '@/lib/posthog'

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const pathname     = usePathname()
  const searchParams = useSearchParams()

  // Initialise PostHog once on the client
  useEffect(() => {
    initPostHog()
  }, [])

  // Fire page-view on every route change
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return

    const url =
      pathname +
      (searchParams.toString() ? '?' + searchParams.toString() : '')

    posthog.capture('$pageview', { $current_url: window.location.href, path: url })
  }, [pathname, searchParams])

  return <>{children}</>
}
