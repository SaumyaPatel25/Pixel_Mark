'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { motion } from 'framer-motion';
import { ArrowRight, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import PixelSentinel from '@/components/auth/PixelSentinel';
import { useMascotFormState } from '@/hooks/useMascotFormState';
import { event as trackEvent } from '@/lib/analytics';
import { api } from '@/lib/api';

type ScenePhase = 'projecting' | 'submitting' | 'success' | 'error';

export default function LoginClient() {
  const searchParams = useSearchParams();
  const { login, user, logout } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [phase, setPhase] = useState<ScenePhase>('projecting');
  const [showResend, setShowResend] = useState(false);
  const [resendStatus, setResendStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [devVerificationLink, setDevVerificationLink] = useState<string | null>(null);

  const { mascotState: hookMascotState, focusedField, emailProps, passwordProps } = useMascotFormState({
    isSubmitting: phase === 'submitting',
    isSuccess: phase === 'success',
    isError: phase === 'error',
    passwordLength: password.length,
    passwordStrength: 'none',
  });

  const mascotState = phase === 'projecting' ? hookMascotState :
    phase === 'success' ? 'success' :
    phase === 'submitting' ? 'submitting' :
    phase === 'error' ? 'error' : 'idle';

  useEffect(() => {
    if (user && !searchParams.get('redirect') && phase === 'projecting') {
      window.location.href = '/dashboard';
    }
  }, [user, phase, searchParams, logout]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setShowResend(false);
    setDevVerificationLink(null);
    setPhase('submitting');
    try {
      await login(email, password);
      trackEvent({ action: 'login', category: 'auth' });
      setPhase('success');
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 1200);
    } catch (err: any) {
      const isUnverified = err.message?.toLowerCase().includes('verify your email');
      setError(err.message || 'Authentication failed');
      setPhase('error');
      if (isUnverified) setShowResend(true);
      setTimeout(() => setPhase('projecting'), 1500);
    }
  };

  const handleResend = async () => {
    setResendStatus('sending');
    try {
      const res = await api.auth.resendVerification(email);
      setResendStatus('success');
      if (res?.dev_link) setDevVerificationLink(res.dev_link);
      setTimeout(() => setResendStatus('idle'), 5000);
    } catch {
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
              showPassword={showPassword}
              focusedField={focusedField}
              emailLength={email.length}
              passwordLength={password.length}
            />
          </div>

          {/* Caption */}
          <div className="text-center space-y-2.5 max-w-[280px]">
            <h2
              className="font-display font-bold"
              style={{ color: '#ffffff', fontSize: '1.0625rem', letterSpacing: '-0.015em', lineHeight: 1.35 }}
            >
              Your workspace awaits
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.75rem', lineHeight: 1.7, fontWeight: 400, letterSpacing: '0.005em' }}>
              Verify your identity to access visual feedback, QA sessions, and live collaboration.
            </p>
          </div>
        </div>
      </div>

      {/* ─── RIGHT PANEL: Login Form ─────────────────────────────────────── */}
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

        {/* Form centred vertically */}
        <div className="flex-1 flex items-center justify-center px-6 md:px-12 py-14">
          <div className="w-full max-w-[420px] space-y-7">

            {/* Logo + Headline */}
            <div className="space-y-5">
              <Link href="/" className="hidden lg:block">
                <img src="/logo.png" alt="PixelMark" className="h-24 w-auto object-contain dark-theme-logo" />
              </Link>

              <div className="space-y-3">
                <h1
                  className="auth-form-heading font-display font-extrabold"
                  style={{ color: '#0F172A', fontSize: '2.25rem', lineHeight: 1.1, letterSpacing: '-0.03em' }}
                >
                  Welcome back
                </h1>
                <p
                  className="auth-form-subtext"
                  style={{ color: '#64748B', fontSize: '0.875rem', lineHeight: 1.65, fontWeight: 400, maxWidth: '34ch' }}
                >
                  Sign in to continue your QA sessions and visual reviews.
                </p>
              </div>
            </div>

            {/* GitHub SSO */}
            <a
              href={`${process.env.NEXT_PUBLIC_API_URL || ''}/auth/oauth/github/start`}
              className="auth-github-btn btn-secondary-3d flex items-center justify-center gap-2.5 w-full rounded-xl transition-all duration-200"
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
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.137 20.162 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
              </svg>
              Continue with GitHub
            </a>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="auth-divider-line flex-1 h-px" style={{ background: 'rgba(37,59,128,0.08)' }} />
              <span
                className="auth-divider-text"
                style={{ color: '#B0BBCF', fontSize: '11px', fontWeight: 500, whiteSpace: 'nowrap', letterSpacing: '0.04em', textTransform: 'uppercase' }}
              >
                or with email
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
                {showResend && (
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={resendStatus === 'sending'}
                      className="underline font-semibold disabled:opacity-50"
                      style={{ color: '#1E40AF', fontSize: '12px' }}
                    >
                      {resendStatus === 'sending' ? 'Sending…' :
                       resendStatus === 'success' ? '✓ Resent!' :
                       resendStatus === 'error' ? 'Failed. Try again.' :
                       'Resend verification email'}
                    </button>
                  </div>
                )}
              </motion.div>
            )}

            {devVerificationLink && (
              <a
                href={devVerificationLink}
                className="block text-xs rounded-xl p-3 text-center break-all transition-colors"
                style={{ background: '#FFFBEB', border: '1px solid rgba(245,158,11,0.3)', color: '#92400E' }}
              >
                [Dev] Click to auto-verify →
              </a>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div className="space-y-1">
                <label
                  htmlFor="email"
                  className="auth-form-label"
                  style={{ color: '#475569', fontSize: '11.5px', fontWeight: 600, display: 'block', letterSpacing: '0.04em', textTransform: 'uppercase' }}
                >
                  Email
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

              {/* Password */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="password"
                    className="auth-form-label"
                    style={{ color: '#475569', fontSize: '11.5px', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}
                  >
                    Password
                  </label>
                  <Link
                    href="/forgot-password"
                    style={{ color: '#253B80', fontSize: '11.5px', fontWeight: 600, letterSpacing: '0.01em' }}
                    className="hover:underline transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    disabled={phase === 'submitting'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError(null);
                      passwordProps.onChange();
                    }}
                    onFocus={passwordProps.onFocus}
                    onBlur={passwordProps.onBlur}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    className="auth-form-input w-full rounded-xl outline-none transition-all duration-200 disabled:opacity-50"
                    style={{ padding: '10px 44px 10px 14px', fontSize: '0.875rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={phase === 'submitting'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors p-1 rounded-lg"
                    style={{ color: '#94A3B8' }}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={phase === 'submitting'}
                className="btn-primary-3d w-full flex items-center justify-center gap-2 group rounded-xl transition-all duration-200 font-display font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
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
                    Signing in…
                  </span>
                ) : (
                  <>
                    Sign in
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </button>
            </form>

            {/* Footer link */}
            <p className="auth-form-footer-text text-center" style={{ fontSize: '13px', color: '#94A3B8', fontWeight: 400 }}>
              No account?{' '}
              <Link
                href="/register"
                style={{ color: '#253B80', fontWeight: 600 }}
                className="hover:underline transition-colors"
              >
                Sign up free
              </Link>
            </p>
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
