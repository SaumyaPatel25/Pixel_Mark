'use client';
import { useEffect, useState } from 'react';
import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

export default function MonkFeedWidget() {
  const user = useAuthStore(state => state.user);
  const pathname = usePathname();
  const [remountKey, setRemountKey] = useState(0);
  const [shouldLoad, setShouldLoad] = useState(false);

  // Exclude MonkFeed widget from project review, session canvas, and audit workspace routes
  const isSessionPage = !!pathname && (
    pathname.startsWith('/project/') ||
    pathname.startsWith('/sessions/') ||
    pathname.startsWith('/canvas/') ||
    pathname.startsWith('/review/') ||
    pathname.startsWith('/t/') ||
    pathname.startsWith('/blueprint/')
  );

  const isPublicMarketingPage = !pathname || pathname === '/' || pathname === '/pricing' || pathname === '/features' || pathname === '/faq' || pathname === '/company';

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const triggerLoad = () => {
      setShouldLoad(true);
      cleanup();
    };

    const cleanup = () => {
      window.removeEventListener('scroll', triggerLoad);
      window.removeEventListener('pointerdown', triggerLoad);
      window.removeEventListener('keydown', triggerLoad);
      window.removeEventListener('touchstart', triggerLoad);
    };

    window.addEventListener('scroll', triggerLoad, { passive: true, once: true });
    window.addEventListener('pointerdown', triggerLoad, { passive: true, once: true });
    window.addEventListener('keydown', triggerLoad, { passive: true, once: true });
    window.addEventListener('touchstart', triggerLoad, { passive: true, once: true });

    // Idle fallback after 12 seconds to prevent interfering with Core Web Vitals audit
    const timer = setTimeout(triggerLoad, 12000);

    return () => {
      cleanup();
      clearTimeout(timer);
    };
  }, []);

  // Accessibility observer to ensure 3rd party widget elements have valid ARIA labels and titles
  useEffect(() => {
    if (!shouldLoad || typeof window === 'undefined') return;

    const fixAccessibility = () => {
      // Fix buttons
      document.querySelectorAll('.monkfeed-sub-btn, .monkfeed-widget button').forEach((btn) => {
        if (!btn.getAttribute('aria-label')) {
          btn.setAttribute('aria-label', 'Customer Support and Feedback');
        }
      });
      // Fix iframes
      document.querySelectorAll('iframe[src*="monkfeed"]').forEach((iframe) => {
        if (!iframe.getAttribute('title')) {
          iframe.setAttribute('title', 'Feedback and Support Dialog');
        }
      });
      // Fix selects
      document.querySelectorAll('select').forEach((sel) => {
        if (!sel.getAttribute('aria-label') && !sel.getAttribute('id')) {
          sel.setAttribute('aria-label', 'Select option');
        }
      });
    };

    fixAccessibility();
    const observer = new MutationObserver(fixAccessibility);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, [shouldLoad]);

  useEffect(() => {
    setRemountKey(k => k + 1);
    if ((!user || isSessionPage) && (window as any).__monkfeed_cleanup) {
      (window as any).__monkfeed_cleanup();
    }
  }, [user, isSessionPage]);

  if (isSessionPage || !shouldLoad) {
    return null;
  }

  return (
    <div key={remountKey}>
      <div className="monkfeed-widget"
           data-application-id={process.env.NEXT_PUBLIC_MONKFEED_APP_ID || "6a60efa31a4920a4561af412"}
           data-user-id={user?.id || ''}
           data-email={user?.email || ''}
           data-require-identity="false"
           data-position="right"
           data-primary-color="#4f46e5"
           data-secondary-color="#000000"
           data-bg-color="#ffffff"
           data-text-color="#18181b"
           data-launcher-color="#4f46e5"
           data-launcher-active-color="#ef4444"
      />
      <Script src="https://www.monkfeed.com/widget.js" strategy="lazyOnload" />
    </div>
  );
}
