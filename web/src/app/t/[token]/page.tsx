'use client'
import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'

const BASE = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '')

type PageState = 'loading' | 'ready' | 'password' | 'revoked' | 'expired' | 'exhausted' | 'not_found' | 'error'

interface TokenData {
  project_id:          string
  project_name:        string
  project_description: string
  target_url:          string
  role:                'tester' | 'reviewer' | 'viewer'
  token:               string
}

const ROLE_META = {
  tester:   { emoji: '✏️', label: 'Tester',   hint: 'Ctrl+Click any element to leave feedback', color: 'text-purple-400 border-purple-500/30 bg-purple-500/10' },
  reviewer: { emoji: '🔍', label: 'Reviewer', hint: 'Annotate and resolve issues',               color: 'text-blue-400 border-blue-500/30 bg-blue-500/10'     },
  viewer:   { emoji: '👁',  label: 'Viewer',   hint: 'Read-only access to this project',          color: 'text-slate-400 border-slate-500/30 bg-slate-500/10'  },
}

const ERROR_META: Record<string, { icon: string; title: string; body: string }> = {
  revoked:   { icon: '🚫', title: 'Link Revoked',        body: 'The project owner has disabled this link.'         },
  expired:   { icon: '⏰', title: 'Link Expired',         body: 'This review link is no longer valid.'             },
  exhausted: { icon: '🔒', title: 'Usage Limit Reached', body: 'This link has reached its maximum number of uses.' },
  not_found: { icon: '🔍', title: 'Link Not Found',      body: "This link doesn't exist or was already deleted."   },
  error:     { icon: '⚠️', title: 'Something Went Wrong', body: 'Could not load this review. Check the link and try again.' },
}

export default function TesterLanding() {
  const { token }               = useParams<{ token: string }>()
  const router                  = useRouter()
  const [state, setState]       = useState<PageState>('loading')
  const [data, setData]         = useState<TokenData | null>(null)
  const [password, setPassword] = useState('')
  const [pwError, setPwError]   = useState('')
  const [name, setName]         = useState('')
  const nameInputRef            = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setName(localStorage.getItem('tester_name') ?? '')
    }
  }, [])

  const resolve = async (pw?: string) => {
    if (!token) { setState('not_found'); return }
    setState('loading')
    setPwError('')

    try {
      const res = await fetch(`${BASE}/resolve-token/${token}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ password: pw ?? null }),
      })
      const json = await res.json().catch(() => ({}))

      if (!res.ok) {
        const code = (json?.error ?? '').toLowerCase()
        if (code === 'link_revoked')      { setState('revoked');   return }
        if (code === 'link_expired')      { setState('expired');   return }
        if (code === 'link_exhausted')    { setState('exhausted'); return }
        if (code === 'not_found')         { setState('not_found'); return }
        if (code === 'password_required') { setState('password');  return }
        if (code === 'wrong_password')    { setState('password'); setPwError('Incorrect password. Try again.'); return }
        setState('error')
        return
      }

      if (!json.project_id || !json.project_name) {
        console.error('[TesterLanding] Malformed token response:', json)
        setState('error')
        return
      }

      setData(json)
      setState('ready')
      setTimeout(() => nameInputRef.current?.focus(), 80)
    } catch (err) {
      console.error('[TesterLanding] Network error:', err)
      setState('error')
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { resolve() }, [token])

  const startSession = () => {
    if (!data || !name.trim()) return
    localStorage.setItem('tester_name',       name.trim())
    localStorage.setItem('tester_role',       data.role)
    localStorage.setItem('tester_token',      data.token)
    localStorage.setItem('tester_project_id', data.project_id)
    router.push(`/review/${data.token}?role=${data.role}`)
  }

  // ── Error screens ──────────────────────────────────────────────────────────
  if (['revoked','expired','exhausted','not_found','error'].includes(state)) {
    const meta = ERROR_META[state] ?? ERROR_META.error
    return (
      <div className="min-h-screen bg-[#080810] flex flex-col items-center justify-center text-center px-6">
        <div className="text-6xl mb-5">{meta.icon}</div>
        <h1 className="text-white font-bold text-2xl mb-2">{meta.title}</h1>
        <p className="text-white/40 text-sm max-w-xs leading-relaxed">{meta.body}</p>
      </div>
    )
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (state === 'loading') return (
    <div className="min-h-screen bg-[#080810] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  // ── Password gate ──────────────────────────────────────────────────────────
  if (state === 'password') return (
    <div className="min-h-screen bg-[#080810] flex items-center justify-center px-4">
      <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }}
        className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🔐</div>
          <h2 className="text-white text-xl font-bold">Password Required</h2>
          <p className="text-white/40 text-sm mt-2">This review link is password protected</p>
        </div>
        <input type="password" value={password} autoFocus
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && resolve(password)}
          placeholder="Enter password"
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm mb-2
                     focus:outline-none focus:border-purple-500 transition-colors"
        />
        {pwError && <p className="text-red-400 text-xs mb-3 px-1">{pwError}</p>}
        <button onClick={() => resolve(password)} disabled={!password.trim()}
          className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-30
                     text-white py-3 rounded-xl font-semibold text-sm transition-colors">
          Unlock →
        </button>
      </motion.div>
    </div>
  )

  // ── Ready — onboarding ─────────────────────────────────────────────────────
  const roleMeta = ROLE_META[data?.role ?? 'tester']

  return (
    <div className="min-h-screen bg-[#080810] flex items-center justify-center px-4">
      <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }}
        transition={{ duration:0.3 }} className="w-full max-w-sm">

        {/* Brand */}
        <div className="text-center mb-8">
          <p className="text-purple-500 font-mono text-xs tracking-[0.4em] mb-4">PIXELMARK</p>
          <h1 className="text-white text-3xl font-bold leading-tight">{data?.project_name}</h1>
          {data?.project_description && (
            <p className="text-white/40 text-sm mt-2 leading-relaxed">{data.project_description}</p>
          )}
          <div className="mt-4 flex justify-center">
            <span className={`text-xs px-3 py-1.5 rounded-full border font-mono inline-flex items-center gap-1.5 ${roleMeta.color}`}>
              <span>{roleMeta.emoji}</span>
              <span>{roleMeta.label}</span>
            </span>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-4 mb-5 space-y-2">
          <p className="text-white/50 text-xs leading-relaxed"><span className="text-purple-400">✓</span> {roleMeta.hint}</p>
          <p className="text-white/50 text-xs leading-relaxed"><span className="text-purple-400">✓</span> All feedback is sent directly to the dev team</p>
          <p className="text-white/50 text-xs leading-relaxed"><span className="text-purple-400">✓</span> Your name helps the team follow up with you</p>
        </div>

        {/* Name */}
        <input ref={nameInputRef} type="text" value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && startSession()}
          placeholder="Your name (required)"
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm mb-3
                     focus:outline-none focus:border-purple-500 transition-colors placeholder-white/20"
        />

        <motion.button whileTap={{ scale:0.98 }} onClick={startSession} disabled={!name.trim()}
          className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-25 disabled:cursor-not-allowed
                     text-white py-3.5 rounded-xl font-semibold text-sm transition-all">
          Start Review Session →
        </motion.button>

        <p className="text-white/15 text-[10px] text-center mt-4">Powered by PixelMark · Visual Feedback Platform</p>
      </motion.div>
    </div>
  )
}
