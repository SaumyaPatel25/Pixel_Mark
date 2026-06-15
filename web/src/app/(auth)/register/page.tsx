'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/store/authStore'
import { motion } from 'framer-motion'
import { Layout, ArrowRight } from 'lucide-react'

export default function RegisterPage() {
  const router = useRouter()
  const { register, isLoading, user } = useAuthStore()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      router.push('/dashboard')
    }
  }, [user, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      await register(email, password, name || undefined)
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message || 'Registration failed')
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[#09090e] p-4 text-white font-sans overflow-hidden">
      {/* Ambient background decoration blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <motion.div 
          animate={{
            scale: [1, 1.2, 1],
            x: [0, -30, 0],
            y: [0, 20, 0]
          }}
          transition={{ repeat: Infinity, duration: 16, ease: "easeInOut" }}
          className="absolute top-[10%] right-[15%] w-[350px] h-[350px] bg-indigo-600/10 rounded-full blur-[100px]" 
        />
        <motion.div 
          animate={{
            scale: [1, 1.15, 1],
            x: [0, 30, 0],
            y: [0, -30, 0]
          }}
          transition={{ repeat: Infinity, duration: 14, ease: "easeInOut" }}
          className="absolute bottom-[10%] left-[15%] w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[120px]" 
        />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-md bg-white/[0.01] backdrop-blur-2xl border border-white/5 rounded-[32px] p-8 space-y-6 shadow-2xl relative z-10 hover:border-indigo-500/20 transition-colors duration-500"
      >
        <div className="text-center space-y-4">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 items-center justify-center text-white shadow-xl shadow-indigo-500/20 mb-2">
            <Layout className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl font-black tracking-tight text-white flex items-center justify-center gap-2">
              Pixel<span className="text-indigo-400">Mark</span>
            </h1>
            <p className="text-white/40 text-xs font-bold uppercase tracking-widest">Create your personal QA workspace</p>
          </div>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-4 py-3 rounded-xl leading-relaxed"
          >
            {error}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-white/40 text-[10px] font-black uppercase tracking-widest block">Name (optional)</label>
            <input
              type="text"
              disabled={isLoading}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Pro Bro"
              className="w-full bg-white/[0.03] border border-white/[0.08] text-white rounded-xl px-4 py-3 text-xs placeholder:text-white/20 focus:border-indigo-500 outline-none transition-all focus:ring-1 focus:ring-indigo-500/50"
            />
          </div>

          <div className="space-y-2">
            <label className="text-white/40 text-[10px] font-black uppercase tracking-widest block">Email Address</label>
            <input
              type="email"
              required
              disabled={isLoading}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              className="w-full bg-white/[0.03] border border-white/[0.08] text-white rounded-xl px-4 py-3 text-xs placeholder:text-white/20 focus:border-indigo-500 outline-none transition-all focus:ring-1 focus:ring-indigo-500/50"
            />
          </div>

          <div className="space-y-2">
            <label className="text-white/40 text-[10px] font-black uppercase tracking-widest block">Password</label>
            <input
              type="password"
              required
              disabled={isLoading}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-white/[0.03] border border-white/[0.08] text-white rounded-xl px-4 py-3 text-xs placeholder:text-white/20 focus:border-indigo-500 outline-none transition-all focus:ring-1 focus:ring-indigo-500/50"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-900/20 active:scale-[0.98] text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 group mt-2"
          >
            {isLoading ? 'Creating...' : 'Create Account'}
            {!isLoading && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
          </button>
        </form>

        <div className="text-center pt-2">
          <Link href="/login" className="text-indigo-400 hover:text-indigo-300 text-xs transition-colors font-bold uppercase tracking-widest text-[10px]">
            Already have an account? Sign in
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
