import { Suspense } from 'react';
import EmailCallbackClient from './EmailCallbackClient';

export default function EmailCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#09090e] flex flex-col items-center justify-center text-white space-y-4">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-white/40">Processing sign-in link...</span>
      </div>
    }>
      <EmailCallbackClient />
    </Suspense>
  );
}
