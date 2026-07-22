'use client';

import React, { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/api';
import { motion } from 'framer-motion';
import { Loader2, Mail, CheckCircle2, ArrowRight, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [devResetLink, setDevResetLink] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setStatus('loading');
    setError(null);
    setDevResetLink(null);
    try {
      const res = await api.auth.requestPasswordReset(email);
      setStatus('success');
      if (res && res.dev_link) {
        setDevResetLink(res.dev_link);
      }
    } catch (err: any) {
      setError(err.message || 'Request failed. Please try again.');
      setStatus('error');
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[#09090e] p-4 text-white font-sans overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-[40%] -right-[30%] w-[80%] h-[80%] bg-[radial-gradient(circle,rgba(124,58,237,0.08)_0%,transparent_60%)]" />
        <div className="absolute -bottom-[40%] -left-[30%] w-[80%] h-[80%] bg-[radial-gradient(circle,rgba(6,182,212,0.08)_0%,transparent_60%)]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white/[0.02] border border-white/10 rounded-[32px] p-8 backdrop-blur-xl relative z-10 shadow-2xl flex flex-col space-y-6"
      >
        <div className="flex items-center gap-3 justify-center mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center text-white shadow-lg">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="font-black text-2xl tracking-tighter bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">STAGE</span>
        </div>

        {status === 'success' ? (
          <div className="space-y-6 text-center py-6 w-full">
            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto text-3xl">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black italic tracking-tight">Check your email</h2>
              <p className="text-xs text-white/40 leading-relaxed max-w-xs mx-auto">
                If that email exists, we sent a password reset link to <strong className="text-white">{email}</strong>. Please check your inbox.
              </p>
            </div>

            {devResetLink && (
              <div className="mt-4 p-3.5 bg-cyan-950/20 border border-cyan-500/20 rounded-xl space-y-2 text-left">
                <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block">Local Dev Reset Link:</span>
                <a 
                  href={devResetLink}
                  className="text-xs text-cyan-300 hover:underline break-all block"
                >
                  {devResetLink}
                </a>
              </div>
            )}

            <div className="pt-4 border-t border-white/5">
              <Link
                href="/login"
                className="text-cyan-400 hover:text-cyan-300 text-xs transition-colors font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Login
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-black italic tracking-tight">Forgot Password?</h2>
              <p className="text-xs text-white/40 leading-relaxed max-w-xs mx-auto">
                Enter your email address below, and we'll send you a link to reset your password.
              </p>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-4 py-3 rounded-xl text-center leading-relaxed">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 pt-2">
              <div className="space-y-2">
                <label className="text-white/40 text-[10px] font-black uppercase tracking-widest block">Email Address</label>
                <input
                  type="email"
                  required
                  disabled={status === 'loading'}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full bg-white/[0.03] border border-white/[0.08] text-white rounded-xl px-4 py-3 text-xs placeholder:text-white/20 focus:border-cyan-500 outline-none transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={status === 'loading'}
                className="w-full py-3.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white font-bold rounded-xl transition-all shadow-lg shadow-cyan-900/20 flex items-center justify-center gap-2 group text-xs font-black uppercase tracking-widest cursor-pointer mt-2"
              >
                {status === 'loading' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending link...
                  </>
                ) : (
                  <>
                    Send Reset Link
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>

            <div className="text-center pt-2">
              <Link href="/login" className="text-cyan-400/80 hover:text-cyan-300 text-xs transition-colors font-bold uppercase tracking-widest text-[10px] inline-flex items-center gap-1.5">
                <ArrowLeft className="w-3 h-3" />
                Back to login
              </Link>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
