'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Layout, ArrowRight, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import PixelSentinel from '@/components/auth/PixelSentinel';
import { useMascotFormState } from '@/hooks/useMascotFormState';
import { event as trackEvent } from '@/lib/analytics';
import { api } from '@/lib/api';

type ScenePhase = 'intro' | 'sidePosition' | 'projecting' | 'submitting' | 'success' | 'error' | 'returnCenter';

export default function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, user, logout } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [showPassword, setShowPassword] = useState(false);
  const [phase, setPhase] = useState<ScenePhase>('intro');
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

  // Map mascotState dynamically based on phase
  const mascotState = (phase === 'projecting') ? hookMascotState : (
    phase === 'success' ? 'success' : (
      phase === 'submitting' ? 'submitting' : (
        phase === 'error' ? 'error' : 'idle'
      )
    )
  );

  useEffect(() => {
    // Only auto-redirect if they are already logged in when landing on the page
    // and no redirect parameter is present
    if (user && !searchParams.get('redirect') && (phase === 'intro' || phase === 'sidePosition' || phase === 'projecting')) {
      window.location.href = '/dashboard';
    }
  }, [user, phase, searchParams, logout]);

  // Intro -> Side Position Transition
  useEffect(() => {
    const t1 = setTimeout(() => {
      setPhase('sidePosition');
    }, 1400);
    return () => clearTimeout(t1);
  }, []);

  // Side Position -> Projecting (Reveal Hologram)
  useEffect(() => {
    if (phase === 'sidePosition') {
      const t2 = setTimeout(() => {
        setPhase('projecting');
      }, 800);
      return () => clearTimeout(t2);
    }
  }, [phase]);

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
      
      // Delay to play victory animation
      setTimeout(() => {
        setPhase('returnCenter');
        // Delay for center-glide return
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 800);
      }, 1400);
    } catch (err: any) {
      const isUnverified = err.message && err.message.toLowerCase().includes('verify your email');
      setError(err.message || 'Authentication failed');
      setPhase('error');
      if (isUnverified) {
        setShowResend(true);
      }
      
      // Revert to projection mode after showing error warning pose
      setTimeout(() => {
        setPhase('projecting');
      }, 1500);
    }
  };

  const handleResend = async () => {
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
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[#09090e] p-4 text-white font-sans overflow-hidden">
      
      {/* Back to Home Button */}
      <Link 
        href="/"
        className="absolute top-6 left-6 z-50 flex items-center gap-2 px-3 py-2 text-white/50 hover:text-white hover:bg-white/5 rounded-xl transition-all text-xs font-bold uppercase tracking-widest group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        Back to Home
      </Link>

      {/* Ambient background decoration blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <motion.div 
          animate={{
            scale: [1, 1.2, 1],
            x: [0, 30, 0],
            y: [0, -20, 0]
          }}
          transition={{ repeat: Infinity, duration: 15, ease: "easeInOut" }}
          className="absolute top-[15%] left-[15%] w-[350px] h-[350px] bg-purple-600/10 rounded-full blur-[100px]" 
        />
        <motion.div 
          animate={{
            scale: [1, 1.15, 1],
            x: [0, -30, 0],
            y: [0, 30, 0]
          }}
          transition={{ repeat: Infinity, duration: 18, ease: "easeInOut" }}
          className="absolute bottom-[15%] right-[15%] w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-[120px]" 
        />
      </div>

      <div className="w-full max-w-4xl min-h-[520px] flex items-center justify-center z-10 relative">
        {phase === 'intro' || phase === 'returnCenter' ? (
          <motion.div
            layout
            layoutId="robot-wrapper"
            className="flex items-center justify-center"
            transition={{ type: 'spring', stiffness: 80, damping: 15 }}
          >
            <PixelSentinel
              state={mascotState}
              showPassword={showPassword}
              focusedField={focusedField}
              emailLength={email.length}
              passwordLength={password.length}
            />
          </motion.div>
        ) : (
          <div className="w-full flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16">
            <motion.div
              layout
              layoutId="robot-wrapper"
              className="flex justify-center items-center relative"
              transition={{ type: 'spring', stiffness: 80, damping: 15 }}
            >
              <PixelSentinel
                state={mascotState}
                showPassword={showPassword}
                focusedField={focusedField}
                emailLength={email.length}
                passwordLength={password.length}
              />

              {/* Holographic Projection Beam overlay */}
              <AnimatePresence>
                {(phase === 'projecting' || phase === 'submitting' || phase === 'error') && (
                  <>
                    {/* Desktop Cone (Horizontal projection) */}
                    <motion.div
                      initial={{ opacity: 0, scaleX: 0 }}
                      animate={{ opacity: 0.12, scaleX: 1 }}
                      exit={{ opacity: 0, scaleX: 0 }}
                      transition={{ duration: 0.4 }}
                      style={{
                        originX: 1,
                        clipPath: 'polygon(0 40%, 100% 0, 100% 100%, 0 60%)',
                        background: 'linear-gradient(to right, rgba(6, 182, 212, 0.8) 0%, rgba(6, 182, 212, 0.05) 100%)',
                      }}
                      className="hidden md:block absolute left-full top-[10px] w-[64px] md:w-[90px] h-[260px] pointer-events-none"
                    />
                    {/* Mobile Cone (Vertical projection downward) */}
                    <motion.div
                      initial={{ opacity: 0, scaleY: 0 }}
                      animate={{ opacity: 0.1, scaleY: 1 }}
                      exit={{ opacity: 0, scaleY: 0 }}
                      transition={{ duration: 0.4 }}
                      style={{
                        originY: 0,
                        clipPath: 'polygon(45% 0, 55% 0, 100% 100%, 0 100%)',
                        background: 'linear-gradient(to bottom, rgba(6, 182, 212, 0.8) 0%, rgba(6, 182, 212, 0.05) 100%)',
                      }}
                      className="block md:hidden absolute top-[135px] left-1/2 -translate-x-1/2 w-[180px] h-[36px] pointer-events-none"
                    />
                  </>
                )}
              </AnimatePresence>
            </motion.div>

            <AnimatePresence>
              {(phase === 'projecting' || phase === 'submitting' || phase === 'error') && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, x: -30 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.85, x: -15, filter: 'blur(4px)' }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                  style={{
                    originX: 0,
                    backgroundImage: 'linear-gradient(rgba(6, 182, 212, 0.02) 1px, transparent 1px)',
                    backgroundSize: '100% 4px',
                  }}
                  className="w-full max-w-md bg-indigo-950/5 backdrop-blur-2xl border border-cyan-500/20 rounded-[32px] p-8 space-y-6 shadow-[0_0_50px_rgba(6,182,212,0.1)] hover:border-cyan-500/30 transition-colors duration-500 relative"
                >
                  {/* Glowing holographic corners */}
                  <div className="absolute -top-1 -left-1 w-3.5 h-3.5 border-t-2 border-l-2 border-cyan-400 rounded-tl-lg" />
                  <div className="absolute -top-1 -right-1 w-3.5 h-3.5 border-t-2 border-r-2 border-cyan-400 rounded-tr-lg" />
                  <div className="absolute -bottom-1 -left-1 w-3.5 h-3.5 border-b-2 border-l-2 border-cyan-400 rounded-bl-lg" />
                  <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 border-b-2 border-r-2 border-cyan-400 rounded-br-lg" />

                  <div className="text-center space-y-4">
                    <Link href="/" className="inline-flex flex-col items-center gap-1 group/logo">
                      <div className="inline-flex w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 items-center justify-center text-white shadow-xl shadow-cyan-500/20 mb-2 group-hover/logo:scale-105 transition-transform duration-300">
                        <Layout className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <h1 className="text-3xl font-black tracking-tight text-white flex items-center justify-center gap-2 group-hover/logo:text-cyan-400 transition-colors duration-300">
                          Pixel<span className="text-cyan-400">Mark</span>
                        </h1>
                        <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Sign in to your QA auditing dashboard</p>
                      </div>
                    </Link>
                  </div>

                  {error && (
                    <div className="space-y-2">
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-4 py-3 rounded-xl leading-relaxed text-center"
                      >
                        {error}
                      </motion.div>
                      {showResend && (
                        <div className="space-y-2 text-center pt-1">
                          <button
                            type="button"
                            onClick={handleResend}
                            disabled={resendStatus === 'sending'}
                            className="text-xs font-bold text-cyan-400 hover:text-cyan-300 underline uppercase tracking-widest cursor-pointer mt-1 disabled:opacity-50"
                          >
                            {resendStatus === 'sending' ? 'Sending link...' : 
                             resendStatus === 'success' ? 'Verification email resent!' : 
                             resendStatus === 'error' ? 'Failed to send. Try again.' : 
                             'Resend verification email'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Social Logins */}
                  <div className="flex justify-center">
                    <a
                      href={`${process.env.NEXT_PUBLIC_API_URL || ''}/auth/oauth/github/start`}
                      className="flex items-center justify-center gap-2 w-full py-3 bg-white/[0.02] hover:bg-white/[0.05] border border-white/10 rounded-xl transition-all duration-300 group cursor-pointer text-xs font-bold text-white"
                    >
                      <svg className="w-4 h-4 text-white/60 group-hover:text-white" viewBox="0 0 24 24" fill="currentColor">
                        <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.137 20.162 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
                      </svg>
                      Sign in with GitHub
                    </a>
                  </div>
                  
                  <div className="relative flex py-1 items-center">
                    <div className="flex-grow border-t border-white/5"></div>
                    <span className="flex-shrink mx-4 text-[9px] font-bold text-white/20 uppercase tracking-widest">or email & password</span>
                    <div className="flex-grow border-t border-white/5"></div>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-2">
                      <label className="text-white/40 text-[10px] font-black uppercase tracking-widest block">Email Address</label>
                      <input
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
                        className="w-full bg-white/[0.03] border border-white/[0.08] text-white rounded-xl px-4 py-3 text-xs placeholder:text-white/20 focus:border-cyan-500 outline-none transition-all focus:ring-1 focus:ring-cyan-500/50"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center pl-1">
                        <label className="text-white/40 text-[10px] font-black uppercase tracking-widest block">Password</label>
                        <Link href="/forgot-password" className="text-cyan-400/70 hover:text-cyan-400 text-[10px] font-bold uppercase tracking-widest transition-all">
                          Forgot?
                        </Link>
                      </div>
                      <div className="relative">
                        <input
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
                          placeholder="••••••••"
                          className="w-full bg-white/[0.03] border border-white/[0.08] text-white rounded-xl pl-4 pr-11 py-3 text-xs placeholder:text-white/20 focus:border-cyan-500 outline-none transition-all focus:ring-1 focus:ring-cyan-500/50"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors p-1"
                          disabled={phase === 'submitting'}
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={phase === 'submitting'}
                      className="w-full py-3.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:hover:bg-cyan-600 text-white font-bold rounded-xl transition-all shadow-lg shadow-cyan-900/20 active:scale-[0.98] text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 group"
                    >
                      {phase === 'submitting' ? 'Signing in...' : 'Sign In'}
                      {phase !== 'submitting' && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
                    </button>
                  </form>

                  <div className="text-center pt-2">
                    <Link href="/register" className="text-cyan-400 hover:text-cyan-300 text-xs transition-colors font-bold uppercase tracking-widest text-[10px]">
                      No account? Create one
                    </Link>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
