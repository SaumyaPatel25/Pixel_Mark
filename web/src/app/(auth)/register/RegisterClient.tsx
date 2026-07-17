'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { motion } from 'framer-motion';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import PixelSentinel from '@/components/auth/PixelSentinel';
import { useMascotFormState } from '@/hooks/useMascotFormState';
import { event as trackEvent } from '@/lib/analytics';
import { signInWithPopup, sendSignInLinkToEmail } from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';

type ScenePhase = 'projecting' | 'submitting' | 'success' | 'error';

export default function RegisterClient() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<ScenePhase>('projecting');
  const [resendStatus, setResendStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [isDirectLogin, setIsDirectLogin] = useState(false);

  const { mascotState: hookMascotState, focusedField, emailProps, otherProps } = useMascotFormState({
    isSubmitting: phase === 'submitting',
    isSuccess: phase === 'success',
    isError: phase === 'error',
    passwordLength: 0,
    passwordStrength: 'none',
  });

  const mascotState = phase === 'projecting' ? hookMascotState :
    phase === 'success' ? 'success' :
    phase === 'submitting' ? 'submitting' :
    phase === 'error' ? 'error' : 'idle';

  useEffect(() => {
    if (user && phase === 'projecting') {
      window.location.href = '/dashboard';
    }
  }, [user, phase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setError(null);
    setPhase('submitting');
    try {
      const actionCodeSettings = {
        url: window.location.origin + '/auth/email-callback',
        handleCodeInApp: true,
      };
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);

      // Save email and name locally to complete registration on callback
      window.localStorage.setItem('emailForSignIn', email);
      if (name) {
        window.localStorage.setItem('nameForSignIn', name);
      }

      trackEvent({ action: 'send_register_link', category: 'auth' });
      setPhase('success');
    } catch (err: any) {
      setError(err.message || 'Registration link dispatch failed.');
      setPhase('error');
      setTimeout(() => setPhase('projecting'), 1500);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setPhase('submitting');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const fbUser = result.user;

      const idToken = await fbUser.getIdToken();
      const { firebaseSync } = useAuthStore.getState();
      await firebaseSync(idToken, fbUser.displayName || undefined);

      trackEvent({ action: 'google_login', category: 'auth' });
      setIsDirectLogin(true);
      setPhase('success');
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Google sign-in failed');
      setPhase('error');
      setTimeout(() => setPhase('projecting'), 1500);
    }
  };

  const handleResend = async () => {
    setResendStatus('sending');
    try {
      const actionCodeSettings = {
        url: window.location.origin + '/auth/email-callback',
        handleCodeInApp: true,
      };
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      setResendStatus('success');
      setTimeout(() => setResendStatus('idle'), 5000);
    } catch (err: any) {
      setError(err.message || 'Failed to resend link. Try again.');
      setResendStatus('error');
    }
  };

  return (
    <div className="min-h-screen flex bg-white font-sans overflow-hidden">

      {/* ─── LEFT PANEL: Sentinel ─────────────────────────────────────────── */}
      <div
        className="auth-dark-panel auth-sentinel-panel hidden lg:flex lg:w-[44%] relative flex-col justify-between p-12 select-none"
        style={{ backgroundColor: '#0B0F19' }}
      >
        {/* Ambient glow blobs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-none">
          <div className="absolute top-[15%] left-[10%] w-[280px] h-[280px] rounded-full"
               style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.14) 0%, transparent 70%)' }} />
          <div className="absolute bottom-[18%] right-[8%] w-[320px] h-[320px] rounded-full"
               style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)' }} />
        </div>

        {/* Top: Back link */}
        <div className="relative z-10">
          <Link
            href="/"
            className="auth-back-link inline-flex items-center gap-2 transition-all duration-200 group"
            style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontFamily: 'var(--font-mono)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}
          >
            <ArrowLeft
              className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform"
            />
            <span className="group-hover:opacity-100 transition-opacity">Back to Home</span>
          </Link>
        </div>

        {/* Middle: Sentinel mascot */}
        <div className="relative z-10 flex flex-col items-center justify-center flex-1 gap-8">
          {/* Card */}
          <div
            className="auth-sentinel-card relative w-full max-w-[248px] rounded-[28px] flex flex-col items-center justify-center p-6"
            style={{
              background: 'rgba(255,255,255,0.028)',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 32px 64px rgba(0,0,0,0.35), 0 0 0 1px rgba(99,102,241,0.08) inset',
            }}
          >
            {/* Corner accents */}
            <span className="auth-sentinel-corner absolute top-0 left-0 w-4 h-4 border-t border-l border-white/15 rounded-tl-[10px]" />
            <span className="auth-sentinel-corner absolute top-0 right-0 w-4 h-4 border-t border-r border-white/15 rounded-tr-[10px]" />
            <span className="auth-sentinel-corner absolute bottom-0 left-0 w-4 h-4 border-b border-l border-white/15 rounded-bl-[10px]" />
            <span className="auth-sentinel-corner absolute bottom-0 right-0 w-4 h-4 border-b border-r border-white/15 rounded-br-[10px]" />

            <PixelSentinel
              state={mascotState}
              showPassword={false}
              focusedField={focusedField}
              emailLength={email.length}
              passwordLength={0}
              nameLength={name.length}
            />
          </div>

          {/* Caption */}
          <div className="text-center space-y-2.5 max-w-[280px]">
            <h2
              className="font-display font-bold"
              style={{ color: '#ffffff', fontSize: '1.0625rem', letterSpacing: '-0.015em', lineHeight: 1.35 }}
            >
              Start your workspace
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.75rem', lineHeight: 1.7, fontWeight: 400, letterSpacing: '0.005em' }}>
              Create an account to start visual QA sessions, invite teammates, and manage reviews.
            </p>
          </div>
        </div>
      </div>

      {/* ─── RIGHT PANEL: Form ────────────────────────────────────────── */}
      <div
        className="auth-form-panel flex-1 flex flex-col min-h-screen overflow-y-auto"
        style={{ background: '#F8F7F4' }}
      >
        {/* Mobile top bar */}
        <div className="flex items-center justify-between px-6 py-5 lg:hidden border-b" style={{ borderColor: 'rgba(37,59,128,0.07)' }}>
          <Link href="/" className="inline-flex items-center gap-1.5 text-pm-muted hover:text-[#253B80] transition-colors group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span style={{ fontSize: '13px', fontWeight: 600 }}>Home</span>
          </Link>
          <Link href="/">
            <img src="/logo.png" alt="PixelMark" className="h-24 w-auto object-contain dark-theme-logo" />
          </Link>
        </div>

        {/* Form centered vertically */}
        <div className="flex-1 flex items-center justify-center px-6 md:px-12 py-14">
          <div className="w-full max-w-[420px] space-y-7">

            {/* Logo + Headline */}
            <div className="space-y-5">
              <Link href="/" className="hidden lg:block">
                <img src="/logo.png" alt="PixelMark" className="h-24 w-auto object-contain dark-theme-logo" />
              </Link>

              {phase !== 'success' && (
                <div className="space-y-3">
                  <h1
                    className="auth-form-heading font-display font-extrabold"
                    style={{ color: '#0F172A', fontSize: '2.25rem', lineHeight: 1.1, letterSpacing: '-0.03em' }}
                  >
                    Create account
                  </h1>
                  <p
                    className="auth-form-subtext"
                    style={{ color: '#64748B', fontSize: '0.875rem', lineHeight: 1.65, fontWeight: 400, maxWidth: '34ch' }}
                  >
                    Sign up with Google or receive a secure passwordless registration link via email.
                  </p>
                </div>
              )}
            </div>

            {phase === 'success' ? (
              <div
                className="w-full rounded-2xl border p-6 space-y-5 shadow-sm text-center"
                style={{
                  background: '#ffffff',
                  borderColor: 'rgba(37,59,128,0.12)',
                }}
              >
                {isDirectLogin ? (
                  <>
                    <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-xl font-bold">
                      🎉
                    </div>

                    <div className="space-y-2">
                      <h2 className="text-xl font-bold text-slate-800">Account Created!</h2>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Welcome, <strong>{name || email}</strong>! Logging you in and redirecting to the dashboard...
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto text-xl font-bold">
                      ✉️
                    </div>

                    <div className="space-y-2">
                      <h2 className="text-xl font-bold text-slate-800">Check your inbox</h2>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        We've sent a passwordless sign-in link to <strong>{email}</strong>. Click the link in your email to complete registration.
                      </p>
                    </div>

                    {error && (
                      <div className="text-xs text-rose-600 font-semibold p-2 bg-rose-50 rounded-lg">
                        {error}
                      </div>
                    )}

                    <div className="border-t border-slate-100 pt-4 flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={handleResend}
                        disabled={resendStatus === 'sending'}
                        className="w-full py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs transition-colors font-bold uppercase tracking-widest rounded-xl disabled:opacity-50 cursor-pointer"
                      >
                        {resendStatus === 'sending' ? 'Resending...' :
                         resendStatus === 'success' ? 'Registration link resent!' :
                         resendStatus === 'error' ? 'Resend failed. Retry.' :
                         'Resend registration link'}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setPhase('projecting');
                          setError(null);
                        }}
                        className="text-slate-400 hover:text-slate-600 text-xs transition-colors font-bold uppercase tracking-widest block py-2 cursor-pointer"
                      >
                        Back to sign up
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <>
                {/* SSO Providers */}
                <div className="flex flex-col gap-3">
                  {/* Google SSO */}
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={phase === 'submitting'}
                    className="btn-secondary-3d flex items-center justify-center gap-2.5 w-full rounded-xl transition-all duration-200 cursor-pointer"
                    style={{
                      background: '#ffffff',
                      border: '1px solid rgba(37,59,128,0.12)',
                      color: '#1E2022',
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      letterSpacing: '0.02em',
                      padding: '10px 16px',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                    }}
                  >
                    <svg className="w-[15px] h-[15px]" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                    </svg>
                    Continue with Google
                  </button>
                </div>

                {/* Divider */}
                <div className="flex items-center gap-3">
                  <div className="auth-divider-line flex-1 h-px" style={{ background: 'rgba(37,59,128,0.08)' }} />
                  <span
                    className="auth-divider-text"
                    style={{ color: '#B0BBCF', fontSize: '11px', fontWeight: 500, whiteSpace: 'nowrap', letterSpacing: '0.04em', textTransform: 'uppercase' }}
                  >
                    or passwordless link
                  </span>
                  <div className="auth-divider-line flex-1 h-px" style={{ background: 'rgba(37,59,128,0.08)' }} />
                </div>

                {/* Error banner */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl px-4 py-3 text-sm text-center font-medium"
                    style={{
                      background: 'rgba(254,226,226,0.9)',
                      border: '1px solid rgba(239,68,68,0.25)',
                      color: '#B91C1C',
                    }}
                  >
                    {error}
                  </motion.div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Name */}
                  <div className="space-y-1">
                    <label
                      htmlFor="name"
                      className="auth-form-label"
                      style={{ color: '#475569', fontSize: '11.5px', fontWeight: 600, display: 'block', letterSpacing: '0.04em', textTransform: 'uppercase' }}
                    >
                      Full Name
                    </label>
                    <input
                      id="name"
                      type="text"
                      disabled={phase === 'submitting'}
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        if (error) setError(null);
                        otherProps.onChange();
                      }}
                      onFocus={otherProps.onFocus}
                      onBlur={otherProps.onBlur}
                      placeholder="Jane Doe"
                      autoComplete="name"
                      className="auth-form-input w-full rounded-xl outline-none transition-all duration-200 disabled:opacity-50"
                      style={{ padding: '10px 14px', fontSize: '0.875rem' }}
                    />
                  </div>

                  {/* Email */}
                  <div className="space-y-1">
                    <label
                      htmlFor="email"
                      className="auth-form-label"
                      style={{ color: '#475569', fontSize: '11.5px', fontWeight: 600, display: 'block', letterSpacing: '0.04em', textTransform: 'uppercase' }}
                    >
                      Email Address
                    </label>
                    <input
                      id="email"
                      type="email"
                      required
                      disabled={phase === 'submitting'}
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (error) setError(null);
                        emailProps.onChange();
                      }}
                      onFocus={emailProps.onFocus}
                      onBlur={emailProps.onBlur}
                      placeholder="name@company.com"
                      autoComplete="email"
                      className="auth-form-input w-full rounded-xl outline-none transition-all duration-200 disabled:opacity-50"
                      style={{ padding: '10px 14px', fontSize: '0.875rem' }}
                    />
                  </div>

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={phase === 'submitting'}
                    className="btn-primary-3d w-full flex items-center justify-center gap-2 group rounded-xl transition-all duration-200 font-display font-semibold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    style={{
                      background: '#253B80',
                      color: '#ffffff',
                      fontSize: '0.875rem',
                      letterSpacing: '0.03em',
                      padding: '11px 20px',
                      marginTop: '8px',
                    }}
                  >
                    {phase === 'submitting' ? (
                      <span className="flex items-center gap-2">
                        <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Sending link…
                      </span>
                    ) : (
                      <>
                        Send Registration Link
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </>
                    )}
                  </button>
                </form>

                {/* Footer link */}
                <p className="auth-form-footer-text text-center" style={{ fontSize: '13px', color: '#94A3B8', fontWeight: 400 }}>
                  Already have an account?{' '}
                  <Link
                    href="/login"
                    style={{ color: '#253B80', fontWeight: 600 }}
                    className="hover:underline transition-colors"
                  >
                    Sign in
                  </Link>
                </p>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          className="auth-form-footer-bar text-center py-5 border-t"
          style={{ borderColor: 'rgba(37,59,128,0.07)', color: '#94A3B8', fontSize: '12px' }}
        >
          © {new Date().getFullYear()} PixelMark · Secure Workspace · All rights reserved
        </div>
      </div>
    </div>
  );
}
