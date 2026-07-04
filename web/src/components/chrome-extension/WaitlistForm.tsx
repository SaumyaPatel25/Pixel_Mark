'use client'

import React, { useState } from 'react'
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react'

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '')

export default function WaitlistForm() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || status === 'submitting') return

    setStatus('submitting')
    setErrorMsg('')

    try {
      const res = await fetch(`${API_BASE}/waitlist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: email.trim(),
          source: 'chrome-extension'
        })
      })

      const data = await res.json()
      if (res.ok && data.success) {
        setStatus('success')
        setEmail('')
      } else {
        setStatus('error')
        setErrorMsg(data.detail || 'Failed to join waitlist.')
      }
    } catch (err: any) {
      console.error(err)
      setStatus('error')
      setErrorMsg('Network error. Please try again.')
    }
  }

  if (status === 'success') {
    return (
      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6 text-center space-y-3">
        <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto" />
        <h4 className="font-bold text-white">You're on the list!</h4>
        <p className="text-xs text-white/50 leading-relaxed uppercase tracking-wider font-bold">
          We'll email you as soon as the PixelMark Chrome Extension is ready for beta testing.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-[#0c0c0e]/80 border border-white/5 rounded-2xl p-6 md:p-8 space-y-4 shadow-xl">
      <h3 className="text-sm font-bold text-white">Get Early Access</h3>
      <p className="text-xs text-white/40 leading-relaxed">
        Be the first to test the extension and get exclusive early-adopter access.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2.5">
        <input
          required
          disabled={status === 'submitting'}
          type="email"
          placeholder="developer@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1 bg-white/[0.02] border border-white/5 rounded-xl px-4 py-3 text-xs text-white placeholder:text-white/20 focus:border-purple-500 outline-none transition-all"
        />
        <button
          type="submit"
          disabled={status === 'submitting' || !email.trim()}
          className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs transition-all shadow-lg shadow-purple-900/20 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {status === 'submitting' ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Notify Me When It Launches
        </button>
      </form>

      {status === 'error' && (
        <div className="flex items-center gap-2 text-rose-400 text-xs font-mono">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  )
}
