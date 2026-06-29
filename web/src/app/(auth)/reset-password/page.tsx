import { Suspense } from 'react';
import ResetPasswordClient from './ResetPasswordClient';

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#09090e] flex flex-col items-center justify-center text-white space-y-4">
        <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-white/40">Handshaking secure reset request...</span>
      </div>
    }>
      <ResetPasswordClient />
    </Suspense>
  );
}
