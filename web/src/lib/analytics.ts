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
