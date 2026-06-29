'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { motion } from 'framer-motion';
import { Loader2, XCircle, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default function CallbackClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  const errorParam = searchParams.get('error');
  const emailParam = searchParams.get('email');
  const { oauthLogin } = useAuthStore();
  
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    if (errorParam) {
      if (errorParam === 'link_unverified_email') {
        setError(`An account with the email "${emailParam || ''}" already exists but is not verified. To prevent unauthorized account takeover, please verify your email address using the verification link sent to you before linking it to a social login.`);
      } else if (errorParam === 'csrf_failure') {
        setError('CSRF validation failed. The state nonce was missing or invalid. Please try logging in again.');
      } else {
        setError(errorParam.replace(/_/g, ' '));
      }
      setStatus('error');
      return;
    }

    if (!token) {
      setError('Authentication token missing from response.');
      setStatus('error');
      return;
    }

    const completeLogin = async () => {
      try {
        await oauthLogin(token);
        setStatus('success');
        setTimeout(() => {
          router.push('/dashboard');
        }, 1500);
      } catch (err: any) {
        setError(err.message || 'Verification of token handshake failed.');
        setStatus('error');
      }
    };

    completeLogin();
  }, [token, errorParam, emailParam, oauthLogin, router]);

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[#09090e] p-4 text-white font-sans overflow-hidden">
      {/* Background design elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-[40%] -right-[30%] w-[80%] h-[80%] bg-[radial-gradient(circle,rgba(124,58,237,0.08)_0%,transparent_60%)]" />
        <div className="absolute -bottom-[40%] -left-[30%] w-[80%] h-[80%] bg-[radial-gradient(circle,rgba(6,182,212,0.08)_0%,transparent_60%)]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white/[0.02] border border-white/10 rounded-[32px] p-10 backdrop-blur-xl relative z-10 shadow-2xl flex flex-col items-center text-center space-y-6"
      >
        <div className="flex items-center gap-3 justify-center mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-lg">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="font-black text-2xl tracking-tighter bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">PixelMark</span>
        </div>

        {status === 'loading' && (
          <div className="space-y-4 py-8 flex flex-col items-center">
            <Loader2 className="w-16 h-16 text-purple-500 animate-spin mx-auto" />
            <h2 className="text-xl font-bold">Verifying credentials</h2>
            <p className="text-sm text-white/40">Securing your session token...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4 py-8 flex flex-col items-center">
            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto text-3xl">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-black italic tracking-tight">Access Granted</h2>
            <p className="text-sm text-white/40">Restoring your workspace...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4 py-8 flex flex-col items-center">
            <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 text-red-400 rounded-full flex items-center justify-center mx-auto text-3xl">
              <XCircle className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-black italic tracking-tight">Handshake Failed</h2>
            <p className="text-sm text-red-400/80">{error}</p>
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
      </motion.div>
    </div>
  );
}
