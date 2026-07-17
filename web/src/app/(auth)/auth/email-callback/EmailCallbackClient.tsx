'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { motion } from 'framer-motion';
import { Loader2, XCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export default function EmailCallbackClient() {
  const router = useRouter();
  const { firebaseSync } = useAuthStore();
  
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'verifying' | 'input-email' | 'success' | 'error'>('verifying');
  const [emailInput, setEmailInput] = useState('');
  const [submittingEmail, setSubmittingEmail] = useState(false);

  useEffect(() => {
    // Confirm if the link is a sign-in link
    if (!isSignInWithEmailLink(auth, window.location.href)) {
      setError('The link is invalid or has expired.');
      setStatus('error');
      return;
    }

    // Attempt to retrieve email from local storage
    const storedEmail = window.localStorage.getItem('emailForSignIn');
    if (storedEmail) {
      completeSignIn(storedEmail);
    } else {
      // Prompt user to enter their email address
      setStatus('input-email');
    }
  }, []);

  const completeSignIn = async (email: string) => {
    setStatus('verifying');
    try {
      // 1. Complete sign-in in Firebase
      const result = await signInWithEmailLink(auth, email, window.location.href);
      const fbUser = result.user;

      // 2. Fetch stored name (from registration) if any
      const name = window.localStorage.getItem('nameForSignIn') || undefined;

      // 3. Sync with backend using Firebase ID Token
      const idToken = await fbUser.getIdToken();
      await firebaseSync(idToken, name);

      // 4. Clean up local storage
      window.localStorage.removeItem('emailForSignIn');
      window.localStorage.removeItem('nameForSignIn');

      setStatus('success');
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Verification of email link failed.');
      setStatus('error');
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;
    setSubmittingEmail(true);
    await completeSignIn(emailInput.trim());
    setSubmittingEmail(false);
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[#09090e] p-4 text-white font-sans overflow-hidden">
      {/* Background design elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-[40%] -right-[30%] w-[80%] h-[80%] bg-[radial-gradient(circle,rgba(99,102,241,0.08)_0%,transparent_60%)]" />
        <div className="absolute -bottom-[40%] -left-[30%] w-[80%] h-[80%] bg-[radial-gradient(circle,rgba(139,92,246,0.08)_0%,transparent_60%)]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white/[0.02] border border-white/10 rounded-[32px] p-10 backdrop-blur-xl relative z-10 shadow-2xl flex flex-col items-center text-center space-y-6"
      >
        {/* Header Logo */}
        <div className="flex items-center gap-3 justify-center mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-lg">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="font-black text-2xl tracking-tighter bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">PixelMark</span>
        </div>

        {/* Verifying Loader */}
        {status === 'verifying' && (
          <div className="space-y-4 py-8 flex flex-col items-center w-full">
            <Loader2 className="w-16 h-16 text-indigo-500 animate-spin mx-auto" />
            <h2 className="text-xl font-bold">Completing authentication</h2>
            <p className="text-sm text-white/40">Synchronizing session with PixelMark backend...</p>
          </div>
        )}

        {/* Success State */}
        {status === 'success' && (
          <div className="space-y-4 py-8 flex flex-col items-center w-full">
            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto text-3xl">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-black italic tracking-tight">Access Granted</h2>
            <p className="text-sm text-white/40">Entering your workspace...</p>
          </div>
        )}

        {/* Error State */}
        {status === 'error' && (
          <div className="space-y-4 py-8 flex flex-col items-center w-full">
            <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-full flex items-center justify-center mx-auto text-3xl">
              <XCircle className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-black italic tracking-tight">Verification Failed</h2>
            <p className="text-sm text-rose-400/80">{error}</p>
            <div className="pt-6 w-full">
              <Link
                href="/login"
                className="w-full py-3 bg-white/5 hover:bg-white/10 text-white text-xs font-bold uppercase tracking-widest rounded-xl transition-all border border-white/5 block text-center"
              >
                Back to Login
              </Link>
            </div>
          </div>
        )}

        {/* Input Email Fallback State */}
        {status === 'input-email' && (
          <div className="space-y-4 py-4 flex flex-col items-stretch text-left w-full">
            <div className="text-center space-y-2 mb-2">
              <h2 className="text-xl font-bold">Please confirm your email</h2>
              <p className="text-xs text-white/60">
                You opened this link in a new tab or device. Please confirm the email address you originally entered.
              </p>
            </div>

            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="fallback-email" className="text-[10px] font-bold uppercase tracking-wider text-white/50">
                  Email Address
                </label>
                <input
                  id="fallback-email"
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="w-full rounded-xl bg-white/5 border border-white/10 p-3 text-sm text-white outline-none focus:border-indigo-500 transition-all placeholder:text-white/20"
                />
              </div>

              <button
                type="submit"
                disabled={submittingEmail || !emailInput.trim()}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submittingEmail ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    Confirm and Sign In
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </motion.div>
    </div>
  );
}
