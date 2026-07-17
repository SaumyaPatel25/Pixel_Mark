'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { motion } from 'framer-motion';
import { ArrowRight, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import PixelSentinel from '@/components/auth/PixelSentinel';
import { useMascotFormState } from '@/hooks/useMascotFormState';
import { event as trackEvent } from '@/lib/analytics';
import { api } from '@/lib/api';
import { createUserWithEmailAndPassword, updateProfile, sendEmailVerification, signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';

type ScenePhase = 'projecting' | 'submitting' | 'success' | 'error';

export default function RegisterClient() {
  const router = useRouter();
  const { firebaseSync, user } = useAuthStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [phase, setPhase] = useState<ScenePhase>('projecting');
  const [devVerificationLink, setDevVerificationLink] = useState<string | null>(null);
  const [resendStatus, setResendStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [isDirectLogin, setIsDirectLogin] = useState(false);

  // Password strength logic
  const getPasswordStrength = (pwd: string): 'none' | 'weak' | 'strong' => {
    if (!pwd) return 'none';
    if (pwd.length < 8) return 'weak';
    
    let score = 0;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[a-z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    
    return score >= 3 ? 'strong' : 'weak';
  };

  const { mascotState: hookMascotState, focusedField, emailProps, passwordProps, otherProps } = useMascotFormState({
    isSubmitting: phase === 'submitting',
    isSuccess: phase === 'success',
    isError: phase === 'error',
    passwordLength: password.length,
    passwordStrength: getPasswordStrength(password),
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
    setError(null);
    setDevVerificationLink(null);
    setPhase('submitting');
    try {
      // 1. Create user in Firebase
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const fbUser = userCredential.user;

      // 2. Set displayName
      if (name) {
        await updateProfile(fbUser, { displayName: name });
      }

      // 3. Send email verification
      await sendEmailVerification(fbUser);

      trackEvent({ action: 'sign_up', category: 'auth' });
      setPhase('success');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
      setPhase('error');
      setTimeout(() => setPhase('projecting'), 1500);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setDevVerificationLink(null);
    setPhase('submitting');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const fbUser = result.user;

      const idToken = await fbUser.getIdToken();
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
      if (auth.currentUser) {
        await sendEmailVerification(auth.currentUser);
        setResendStatus('success');
        setTimeout(() => setResendStatus('idle'), 5000);
      } else {
        setError('Firebase session not found. Please log in.');
        setResendStatus('error');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to resend. Try again.');
      setResendStatus('error');
    }
  };

  const handleCheckVerification = async () => {
    if (auth.currentUser) {
      setPhase('submitting');
      try {
        await auth.currentUser.reload();
        if (auth.currentUser.emailVerified) {
          const idToken = await auth.currentUser.getIdToken();
          await firebaseSync(idToken, name || undefined);
          setIsDirectLogin(true);
          setPhase('success');
          setTimeout(() => {
            window.location.href = '/dashboard';
          }, 1500);
        } else {
          setError('Email is still unverified. Please check your inbox.');
          setPhase('error');
          setTimeout(() => {
            setPhase('success');
            setError(null);
          }, 1500);
        }
      } catch (err: any) {
        setError(err.message || 'Verification check failed');
        setPhase('error');
        setTimeout(() => {
          setPhase('success');
          setError(null);
        }, 1500);
      }
    }
  };

  const strength = getPasswordStrength(password);

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
                    Get started with your free personal QA workspace today.
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
                      <h2 className="text-xl font-bold text-slate-800">Check your email</h2>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        We've sent a verification link to <strong>{email}</strong>. Please check your inbox and click the link to activate your account.
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
                        onClick={handleCheckVerification}
                        disabled={phase === 'submitting'}
                        className="w-full py-3 bg-[#253B80] hover:bg-[#1E2E60] text-white text-xs transition-colors font-bold uppercase tracking-widest rounded-xl disabled:opacity-50 cursor-pointer animate-pulse"
                      >
                        {phase === 'submitting' ? 'Checking...' : 'I have verified my email'}
                      </button>

                      <button
                        type="button"
                        onClick={handleResend}
                        disabled={resendStatus === 'sending'}
                        className="w-full py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs transition-colors font-bold uppercase tracking-widest rounded-xl disabled:opacity-50 cursor-pointer"
                      >
                        {resendStatus === 'sending' ? 'Resending...' :
                         resendStatus === 'success' ? 'Verification email resent!' :
                         resendStatus === 'error' ? 'Resend failed. Retry.' :
                         'Resend verification email'}
                      </button>
                      <Link href="/login" className="text-slate-400 hover:text-slate-600 text-xs transition-colors font-bold uppercase tracking-widest block py-2 cursor-pointer">
                        Back to sign in
                      </Link>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <>
                {/* SSO Providers */}
                <div className="flex flex-col sm:flex-row gap-3">
                  {/* Google SSO */}
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={phase === 'submitting'}
                    className="btn-secondary-3d flex items-center justify-center gap-2.5 flex-1 rounded-xl transition-all duration-200 cursor-pointer"
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
                    Google
                  </button>

                  {/* GitHub SSO */}
                  <a
                    href={`${process.env.NEXT_PUBLIC_API_URL || ''}/auth/oauth/github/start`}
                    className="auth-github-btn btn-secondary-3d flex items-center justify-center gap-2.5 flex-1 rounded-xl transition-all duration-200"
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
                    GitHub
                  </a>
                </div>

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
                      Name (optional)
                    </label>
                    <input
                      id="name"
                      type="text"
                      disabled={phase === 'submitting'}
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        otherProps.onChange();
                      }}
                      onFocus={otherProps.onFocus}
                      onBlur={otherProps.onBlur}
                      placeholder="e.g. John Doe"
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
                      {password.length > 0 && (
                        <span className={`text-[9.5px] font-bold uppercase tracking-wider ${strength === 'strong' ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {strength === 'strong' ? 'Strong' : 'Weak'}
                        </span>
                      )}
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
                        placeholder="Create a strong password"
                        autoComplete="new-password"
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
                        Creating Account…
                      </span>
                    ) : (
                      <>
                        Sign up free
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
