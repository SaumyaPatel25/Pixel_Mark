import { posthog } from '@/lib/posthog'

export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: any[];
  }
}

export const pageview = (url: string) => {
  if (GA_MEASUREMENT_ID && typeof window !== "undefined" && window.gtag) {
    window.gtag("config", GA_MEASUREMENT_ID, {
      page_path: url,
    });
  }
};

export const event = ({
  action,
  category,
  label,
  value,
}: {
  action: string;
  category?: string;
  label?: string;
  value?: number;
}) => {
  // ── Google Analytics ──────────────────────────────────────────────────────
  if (GA_MEASUREMENT_ID && typeof window !== "undefined" && window.gtag) {
    window.gtag("event", action, {
      event_category: category,
      event_label: label,
      value: value,
    });
  }

  // ── PostHog ───────────────────────────────────────────────────────────────
  if (typeof window !== "undefined") {
    posthog.capture(action, {
      ...(category !== undefined && { category }),
      ...(label    !== undefined && { label    }),
      ...(value    !== undefined && { value    }),
    })
  }
};

export const trackCtaClick = async (
  ctaId: string,
  targetRole: string = 'client',
  pageUrl?: string,
  referrer?: string
) => {
  // 1. Google Analytics & PostHog
  event({
    action: 'cta_click',
    category: 'Conversion',
    label: `${ctaId}:${targetRole}`,
  });

  // 2. Persist to Database via Backend API
  try {
    const baseUrl =
      typeof window !== 'undefined'
        ? process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://127.0.0.1:8765'
        : '';
    const payload = {
      cta_id: ctaId,
      target_role: targetRole,
      page_url: pageUrl || (typeof window !== 'undefined' ? window.location.href : ''),
      referrer: referrer || (typeof document !== 'undefined' ? document.referrer : ''),
    };

    const endpoint = `${baseUrl}/marketing/cta-click`;
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      const ok = navigator.sendBeacon(endpoint, blob);
      if (!ok) {
        fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          keepalive: true,
        }).catch(() => {});
      }
    } else {
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => {});
    }
  } catch (err) {
    console.debug('[Analytics] Failed to track CTA click to backend', err);
  }
};
