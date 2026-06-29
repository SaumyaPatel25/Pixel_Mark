import { Suspense } from 'react';
import CallbackClient from './CallbackClient';

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#09090e] flex flex-col items-center justify-center text-white space-y-4">
        <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-white/40">Completing secure handshake...</span>
      </div>
    }>
      <CallbackClient />
    </Suspense>
  );
}
