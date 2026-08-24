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

  // Initialise PostHog on interaction or idle time to keep initial paint blocking-free
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const triggerInit = () => {
      initPostHog();
      cleanup();
    };

    const cleanup = () => {
      window.removeEventListener('scroll', triggerInit);
      window.removeEventListener('pointerdown', triggerInit);
      window.removeEventListener('keydown', triggerInit);
      window.removeEventListener('touchstart', triggerInit);
    };

    window.addEventListener('scroll', triggerInit, { passive: true, once: true });
    window.addEventListener('pointerdown', triggerInit, { passive: true, once: true });
    window.addEventListener('keydown', triggerInit, { passive: true, once: true });
    window.addEventListener('touchstart', triggerInit, { passive: true, once: true });

    // Idle fallback after 8 seconds
    const timer = setTimeout(triggerInit, 8000);

    return () => {
      cleanup();
      clearTimeout(timer);
    };
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
