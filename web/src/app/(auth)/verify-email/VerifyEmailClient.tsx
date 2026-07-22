'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/api';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle2, XCircle, Mail, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function VerifyEmailClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  const { verifyEmail } = useAuthStore();

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [resendStatus, setResendStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [devVerificationLink, setDevVerificationLink] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError('Verification token is missing. Please check your link.');
      setStatus('error');
      return;
    }

    const triggerVerification = async () => {
      try {
        await verifyEmail(token);
        setStatus('success');
      } catch (err: any) {
        setError(err.message || 'The verification link is invalid, expired, or has already been used.');
        setStatus('error');
      }
    };

    triggerVerification();
  }, [token, verifyEmail]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setResendStatus('sending');
    try {
      const res = await api.auth.resendVerification(email);
      setResendStatus('success');
      if (res && res.dev_link) {
        setDevVerificationLink(res.dev_link);
      }
      setTimeout(() => {
        setResendStatus('idle');
      }, 5000);
    } catch (err: any) {
      setResendStatus('error');
      setError(err.message || 'Failed to resend. Try again.');
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[#09090e] p-4 text-white font-sans overflow-hidden">
      {/* Dynamic background decoration */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-[40%] -right-[30%] w-[80%] h-[80%] bg-[radial-gradient(circle,rgba(124,58,237,0.08)_0%,transparent_60%)]" />
        <div className="absolute -bottom-[40%] -left-[30%] w-[80%] h-[80%] bg-[radial-gradient(circle,rgba(6,182,212,0.08)_0%,transparent_60%)]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white/[0.02] border border-white/10 rounded-[32px] p-8 backdrop-blur-xl relative z-10 shadow-2xl flex flex-col items-center text-center space-y-6"
      >
        <div className="flex items-center gap-3 justify-center mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center text-white shadow-lg">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="font-black text-2xl tracking-tighter bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">STAGE</span>
        </div>

        {status === 'loading' && (
          <div className="space-y-4 py-8 flex flex-col items-center">
            <Loader2 className="w-16 h-16 text-cyan-500 animate-spin mx-auto" />
            <h2 className="text-xl font-bold tracking-tight">Verifying your email</h2>
            <p className="text-sm text-white/40 leading-relaxed max-w-xs mx-auto">
              Please wait while we confirm your verification signature...
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-6 py-6 flex flex-col items-center w-full">
            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto text-3xl">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black italic tracking-tight">Email Verified!</h2>
              <p className="text-xs text-white/40 leading-relaxed max-w-xs mx-auto">
                Your account is fully activated. You are ready to log in and review your project canvases.
              </p>
            </div>
            <div className="pt-4 w-full">
              <Link
                href="/login"
                className="w-full py-3.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-cyan-900/20 flex items-center justify-center gap-2 group cursor-pointer"
              >
                Sign In
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-6 py-4 flex flex-col items-center w-full text-left">
            <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 text-red-400 rounded-full flex items-center justify-center mx-auto text-3xl mb-2">
              <XCircle className="w-10 h-10" />
            </div>
            <div className="space-y-2 text-center w-full">
              <h2 className="text-2xl font-black italic tracking-tight text-white">Verification Failed</h2>
              <p className="text-xs text-red-400/80 leading-relaxed max-w-xs mx-auto">
                {error}
              </p>
            </div>

            <div className="w-full border-t border-white/5 pt-6 space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-white/40 text-center">Need a new link?</h3>
              <form onSubmit={handleResend} className="space-y-3">
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter registered email address"
                    className="w-full bg-white/[0.03] border border-white/[0.08] text-white rounded-xl px-4 py-3 text-xs placeholder:text-white/20 focus:border-cyan-500 outline-none transition-all"
                  />
                </div>
                <button
                  type="submit"
                  disabled={resendStatus === 'sending'}
                  className="w-full py-3 bg-white/5 hover:bg-white/10 text-white text-xs font-bold uppercase tracking-widest rounded-xl transition-all border border-white/5 cursor-pointer disabled:opacity-50"
                >
                  {resendStatus === 'sending' ? 'Sending link...' :
                   resendStatus === 'success' ? 'Link Sent!' :
                   'Request New Link'}
                </button>
              </form>

              {devVerificationLink && (
                <div className="mt-4 p-3 bg-cyan-950/20 border border-cyan-500/20 rounded-xl space-y-2 text-left">
                  <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block">Local Dev link:</span>
                  <a href={devVerificationLink} className="text-xs text-cyan-300 hover:underline break-all block">{devVerificationLink}</a>
                </div>
              )}

              <div className="text-center pt-2">
                <Link href="/login" className="text-xs text-white/40 hover:text-white transition-colors underline">
                  Back to login
                </Link>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
