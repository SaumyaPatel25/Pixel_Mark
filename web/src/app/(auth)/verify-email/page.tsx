import { Suspense } from 'react';
import VerifyEmailClient from './VerifyEmailClient';

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#09090e] flex flex-col items-center justify-center text-white space-y-4">
        <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-white/40">Handshaking secure email validation...</span>
      </div>
    }>
      <VerifyEmailClient />
    </Suspense>
  );
}
