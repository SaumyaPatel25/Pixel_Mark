'use client';
import { useEffect, useState, useCallback } from 'react';
import Script from 'next/script';

export default function MonkFeedWidget() {
  const [userData, setUserData] = useState<any>(null);
  const [remountKey, setRemountKey] = useState(0);

  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch(`/api/auth/session?t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        setUserData(data.user?.email ? data.user : null);
      }
    } catch (e) {
      console.error("Failed to fetch session for MonkFeed", e);
    }
  }, []);

  useEffect(() => {
    fetchSession();
    const handleLogin = (e: any) => { setUserData(e.detail); setRemountKey(k => k + 1); };
    const handleLogout = () => {
      setUserData(null); setRemountKey(k => k + 1);
      if ((window as any).__monkfeed_cleanup) (window as any).__monkfeed_cleanup();
    };
    window.addEventListener('monkfeed:login', handleLogin);
    window.addEventListener('monkfeed:logout', handleLogout);
    window.addEventListener('focus', fetchSession);
    return () => {
      window.removeEventListener('monkfeed:login', handleLogin);
      window.removeEventListener('monkfeed:logout', handleLogout);
      window.removeEventListener('focus', fetchSession);
    };
  }, [fetchSession]);

  return (
    <div key={remountKey}>
      <div className="monkfeed-widget"
           data-application-id={process.env.NEXT_PUBLIC_MONKFEED_APP_ID || "6a60efa31a4920a4561af412"}
           data-user-id={userData?.id || ''}
           data-email={userData?.email || ''}
           data-require-identity="false"
           data-position="right"
           data-primary-color="#4f46e5"
           data-secondary-color="#000000"
           data-bg-color="#ffffff"
           data-text-color="#18181b"
           data-launcher-color="#4f46e5"
           data-launcher-active-color="#ef4444"
      />
      <Script src="https://www.monkfeed.com//widget.js" strategy="afterInteractive" />
    </div>
  );
}
