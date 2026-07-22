'use client'
import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'

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
  tester:   { emoji: '✏️', label: 'Tester',   hint: 'Ctrl+Click any element to leave feedback', color: 'text-pm-accent border-pm-border bg-pm-accent-subtle' },
  reviewer: { emoji: '🔍', label: 'Reviewer', hint: 'Annotate and resolve issues',               color: 'text-pm-cyan border-pm-border bg-pm-cyan/10'     },
  viewer:   { emoji: '👁',  label: 'Viewer',   hint: 'Read-only access to this project',          color: 'text-pm-muted border-pm-border bg-pm-surface-2'  },
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
      <div className="min-h-screen bg-pm-bg flex flex-col items-center justify-center text-center px-6 text-pm-text transition-colors duration-300">
        <div className="text-6xl mb-5">{meta.icon}</div>
        <h1 className="text-pm-text font-black text-xl mb-2 uppercase">{meta.title}</h1>
        <p className="text-pm-muted text-xs max-w-xs leading-relaxed font-bold">{meta.body}</p>
      </div>
    )
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (state === 'loading') return (
    <div className="min-h-screen bg-pm-bg flex items-center justify-center transition-colors duration-300">
      <Loader2 className="w-8 h-8 animate-spin text-pm-accent" />
    </div>
  )

  // ── Password gate ──────────────────────────────────────────────────────────
  if (state === 'password') return (
    <div className="min-h-screen bg-pm-bg flex items-center justify-center px-4 transition-colors duration-300">
      <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }}
        className="w-full max-w-sm p-8 rounded-3xl bg-pm-surface border border-pm-border shadow-2xl transition-all">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🔐</div>
          <h2 className="text-pm-text text-lg font-black uppercase">Password Required</h2>
          <p className="text-pm-muted text-xs mt-2 font-bold">This review link is password protected</p>
        </div>
        <input type="password" value={password} autoFocus
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && resolve(password)}
          placeholder="Enter password"
          className="w-full bg-pm-surface-2 border border-pm-border rounded-xl px-4 py-3 text-pm-text text-xs mb-2
                     placeholder:text-pm-muted focus:outline-none focus:border-pm-accent transition-colors"
        />
        {pwError && <p className="text-red-400 text-xs mb-3 px-1 font-bold">{pwError}</p>}
        <button onClick={() => resolve(password)} disabled={!password.trim()}
          className="w-full bg-pm-accent hover:bg-pm-accent-bright disabled:opacity-30
                     text-white py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-colors shadow-md">
          Unlock →
        </button>
      </motion.div>
    </div>
  )

  // ── Ready — onboarding ─────────────────────────────────────────────────────
  const roleMeta = ROLE_META[data?.role ?? 'tester']

  return (
    <div className="min-h-screen bg-pm-bg flex items-center justify-center px-4 transition-colors duration-300">
      <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }}
        transition={{ duration:0.3 }} className="w-full max-w-sm space-y-6">

        {/* Brand */}
        <div className="text-center space-y-3">
          <p className="text-pm-accent font-mono text-[10px] font-black tracking-[0.4em]">STAGE</p>
          <h1 className="text-pm-text text-2xl font-black leading-tight truncate uppercase">{data?.project_name}</h1>
          {data?.project_description && (
            <p className="text-pm-muted text-xs leading-relaxed max-w-xs mx-auto font-bold">{data.project_description}</p>
          )}
          <div className="mt-2 flex justify-center">
            <span className={`text-[10px] px-3 py-1.5 rounded-full border font-mono font-black uppercase inline-flex items-center gap-1.5 ${roleMeta.color}`}>
              <span>{roleMeta.emoji}</span>
              <span>{roleMeta.label}</span>
            </span>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-pm-surface-2 border border-pm-border rounded-2xl p-4.5 space-y-2.5">
          <p className="text-pm-text/70 text-xs leading-relaxed font-bold"><span className="text-pm-accent font-black">✓</span> {roleMeta.hint}</p>
          <p className="text-pm-text/70 text-xs leading-relaxed font-bold"><span className="text-pm-accent font-black">✓</span> All feedback is sent directly to the dev team</p>
          <p className="text-pm-text/70 text-xs leading-relaxed font-bold"><span className="text-pm-accent font-black">✓</span> Your name helps the team follow up with you</p>
        </div>

        {/* Name */}
        <input ref={nameInputRef} type="text" value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && startSession()}
          placeholder="Your name (required)"
          className="w-full bg-pm-surface-2 border border-pm-border rounded-xl px-4 py-3 text-pm-text text-xs
                     focus:outline-none focus:border-pm-accent transition-colors placeholder:text-pm-muted"
        />

        <motion.button whileTap={{ scale:0.98 }} onClick={startSession} disabled={!name.trim()}
          className="w-full bg-pm-accent hover:bg-pm-accent-bright disabled:opacity-25 disabled:cursor-not-allowed
                     text-white py-3.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-md">
          Start Review Session →
        </motion.button>

        <p className="text-pm-muted/60 text-[9px] font-mono text-center">Powered by STAGE · Visual Feedback Platform</p>
      </motion.div>
    </div>
  )
}
