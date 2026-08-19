'use client';
import { useEffect, useState } from 'react';
import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

export default function MonkFeedWidget() {
  const user = useAuthStore(state => state.user);
  const pathname = usePathname();
  const [remountKey, setRemountKey] = useState(0);

  // Exclude MonkFeed widget from project review, session canvas, and audit workspace routes
  const isSessionPage = !!pathname && (
    pathname.startsWith('/project/') ||
    pathname.startsWith('/sessions/') ||
    pathname.startsWith('/canvas/') ||
    pathname.startsWith('/review/') ||
    pathname.startsWith('/t/') ||
    pathname.startsWith('/blueprint/')
  );

  useEffect(() => {
    setRemountKey(k => k + 1);
    if ((!user || isSessionPage) && (window as any).__monkfeed_cleanup) {
      (window as any).__monkfeed_cleanup();
    }
  }, [user, isSessionPage]);

  if (isSessionPage) {
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
