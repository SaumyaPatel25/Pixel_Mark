// src/lib/posthog.ts
// PostHog singleton — safe to import on both client and server.
// On the server (Node) posthog-js is not loaded; guards below keep it SSR-safe.

import posthog from 'posthog-js'

const KEY  = process.env.NEXT_PUBLIC_POSTHOG_KEY  ?? ''
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://app.posthog.com'

let initialised = false

export function initPostHog() {
  if (typeof window === 'undefined') return
  if (initialised || !KEY) return

  posthog.init(KEY, {
    api_host:                    HOST,
    ui_host:                     'https://app.posthog.com',
    capture_pageview:            false, // handled manually via usePathname()
    capture_pageleave:           true,
    session_recording: {
      // Never record content inside the proxy iframe
      maskAllInputs:  false,
    },
    person_profiles:             'identified_only',
    loaded: (ph) => {
      if (process.env.NODE_ENV === 'development') ph.debug()
    },
  })

  initialised = true
}

export { posthog }
