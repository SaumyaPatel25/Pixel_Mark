'use client'

import React, { useState } from 'react'
import { 
  Key, 
  Copy, 
  RefreshCw, 
  Trash2, 
  Plus, 
  AlertTriangle, 
  Check, 
  Code,
  AlertCircle
} from 'lucide-react'
import { ApiKey, createApiKey, rotateApiKey, revokeApiKey } from '@/lib/api'

interface ApiKeysClientProps {
  initialKeys: ApiKey[]
}

export default function ApiKeysClient({ initialKeys }: ApiKeysClientProps) {
  const [keys, setKeys] = useState<ApiKey[]>(initialKeys)
  const [newKeyName, setNewKeyName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  
  // Modals / Status
  const [revealedToken, setRevealedToken] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  
  // Confirmation state
  const [confirmRevokeId, setConfirmRevokeId] = useState<string | null>(null)
  const [confirmRotateId, setConfirmRotateId] = useState<string | null>(null)
  const [actionInProgress, setActionInProgress] = useState(false)

  // Copy to clipboard helper
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Create Key handler
  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newKeyName.trim() || isCreating) return

    setIsCreating(true)
    setErrorMsg('')
    try {
      const res = await createApiKey(newKeyName.trim())
      setRevealedToken(res.raw_token)
      setNewKeyName('')
      
      const newKeyItem: ApiKey = {
        id: res.id,
        name: res.name,
        created_at: res.created_at,
        last_used_at: null,
        revoked_at: null,
        masked_token: 'pm_••••••••' + res.raw_token.slice(-4)
      }
      setKeys(prev => [newKeyItem, ...prev])
    } catch (err: any) {
      console.error(err)
      setErrorMsg(err.message || 'Failed to create API key.')
    } finally {
      setIsCreating(false)
    }
  }

  // Rotate Key handler
  const handleRotateKey = async (id: string) => {
    setActionInProgress(true)
    setErrorMsg('')
    try {
      const res = await rotateApiKey(id)
      setRevealedToken(res.raw_token)
      
      setKeys(prev => prev.map(k => {
        if (k.id === id) {
          return { ...k, revoked_at: new Date().toISOString() }
        }
        return k
      }))
      
      const rotatedItem: ApiKey = {
        id: res.id,
        name: res.name,
        created_at: res.created_at,
        last_used_at: null,
        revoked_at: null,
        masked_token: 'pm_••••••••' + res.raw_token.slice(-4)
      }
      setKeys(prev => [rotatedItem, ...prev])
      setConfirmRotateId(null)
    } catch (err: any) {
      console.error(err)
      setErrorMsg(err.message || 'Failed to rotate API key.')
    } finally {
      setActionInProgress(false)
    }
  }

  // Revoke Key handler
  const handleRevokeKey = async (id: string) => {
    setActionInProgress(true)
    setErrorMsg('')
    try {
      await revokeApiKey(id)
      setKeys(prev => prev.map(k => {
        if (k.id === id) {
          return { ...k, revoked_at: new Date().toISOString() }
        }
        return k
      }))
      setConfirmRevokeId(null)
    } catch (err: any) {
      console.error(err)
      setErrorMsg(err.message || 'Failed to revoke API key.')
    } finally {
      setActionInProgress(false)
    }
  }

  return (
    <div className="space-y-6 text-pm-text transition-colors duration-300">
      
      {/* ── ALERTS / ERROR FEEDBACK ── */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center gap-3 font-bold">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ── SECURITY TIPS ── */}
      <div className="bg-pm-surface border border-pm-border shadow-sm rounded-3xl p-6 flex flex-col md:flex-row gap-4 items-start md:items-center">
        <div className="p-3 bg-pm-accent-subtle rounded-xl text-pm-accent">
          <Key className="w-6 h-6" />
        </div>
        <div className="flex-1 space-y-1">
          <h4 className="text-xs font-black uppercase tracking-wider text-pm-text">API Credentials Policy</h4>
          <p className="text-[11px] text-pm-muted font-medium leading-relaxed">
            API keys grant full programmatic access to your STAGE organization. Keep them secure, never check them into git repositories, and rotate keys regularly.
          </p>
        </div>
        <a 
          href="#curl-help"
          className="text-xs font-bold text-pm-accent hover:text-pm-accent-bright transition-colors shrink-0 underline underline-offset-4"
        >
          View Integration Guide →
        </a>
      </div>

      {/* ── KEY CREATOR FORM ── */}
      <div className="bg-pm-surface border border-pm-border rounded-3xl p-6 md:p-8 space-y-4 shadow-sm">
        <h3 className="text-sm font-extrabold text-pm-text uppercase tracking-wider">Generate Developer API Key</h3>
        
        <form onSubmit={handleCreateKey} className="flex flex-col sm:flex-row gap-3">
          <input
            required
            disabled={isCreating}
            type="text"
            placeholder="e.g. Production CI/CD Pipeline"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            className="flex-1 bg-pm-bg border border-pm-border hover:border-pm-border-bright rounded-xl px-4 py-3 text-sm font-medium text-pm-text focus:outline-none focus:border-pm-accent focus:ring-1 focus:ring-pm-accent/20 transition-all placeholder:text-pm-muted outline-none font-sans"
          />
          <button
            type="submit"
            disabled={isCreating || !newKeyName.trim()}
            className="px-6 py-3 rounded-xl bg-pm-accent hover:bg-pm-accent-bright text-white font-bold text-xs transition-all shadow-md shadow-black/10 flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Generate New Key
          </button>
        </form>
      </div>

      {/* ── KEYS TABLE ── */}
      <div className="bg-pm-surface border border-pm-border rounded-3xl overflow-hidden shadow-sm">
        <div className="px-6 py-5 border-b border-pm-border bg-pm-surface">
          <h3 className="text-sm font-extrabold text-pm-text uppercase tracking-wider">Active Credentials</h3>
        </div>
        
        {keys.length === 0 ? (
          <div className="p-12 text-center text-xs text-pm-muted uppercase tracking-widest font-black bg-pm-surface-2/40">
            No API Keys generated yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-pm-border bg-pm-surface-2 text-[10px] uppercase tracking-widest text-pm-muted font-black">
                  <th className="px-6 py-3.5">Name</th>
                  <th className="px-6 py-3.5">Masked Key</th>
                  <th className="px-6 py-3.5">Created</th>
                  <th className="px-6 py-3.5">Last Used</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-pm-border">
                {keys.map((k) => {
                  const isRevoked = !!k.revoked_at
                  return (
                    <tr key={k.id} className="hover:bg-pm-surface-2/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-pm-text whitespace-nowrap">{k.name}</td>
                      <td className="px-6 py-4 font-mono font-medium text-pm-accent whitespace-nowrap">{k.masked_token}</td>
                      <td className="px-6 py-4 text-pm-muted whitespace-nowrap">
                        {new Date(k.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-pm-muted whitespace-nowrap">
                        {k.last_used_at ? new Date(k.last_used_at).toLocaleDateString() : 'Never'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isRevoked ? (
                          <span className="inline-flex items-center gap-1.5 py-0.5 px-2.5 rounded bg-rose-500/10 border border-rose-500/20 text-[10px] font-black uppercase text-rose-500">
                            Revoked
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 py-0.5 px-2.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-black uppercase text-emerald-500">
                            Active
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        {!isRevoked && (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setConfirmRotateId(k.id)}
                              title="Rotate Key (Invalidate current, issue new)"
                              className="p-2 rounded-lg bg-pm-surface border border-pm-border hover:bg-pm-surface-2 hover:text-pm-accent transition-all text-pm-muted shadow-sm cursor-pointer"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setConfirmRevokeId(k.id)}
                              title="Revoke Key"
                              className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 hover:border-rose-500/30 hover:text-rose-500 transition-all text-rose-400 shadow-sm cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── INTEGRATION GUIDE ── */}
      <section id="curl-help" className="bg-pm-surface border border-pm-border shadow-sm rounded-3xl p-6 md:p-8 space-y-4 scroll-mt-6">
        <div className="flex items-center gap-3 border-b border-pm-border pb-4">
          <Code className="w-5 h-5 text-pm-accent" />
          <h3 className="text-sm font-extrabold text-pm-text uppercase tracking-wider">How to use this key</h3>
        </div>
        <p className="text-xs text-pm-text/80 font-medium leading-relaxed">
          Provide your API token inside the <code className="font-mono text-pm-accent bg-pm-surface-2 px-1.5 py-0.5 rounded border border-pm-border">Authorization</code> header as a Bearer credentials token to perform admin-level queries:
        </p>
        <pre className="bg-pm-bg border border-pm-border rounded-xl p-4 font-mono text-xs text-pm-accent overflow-x-auto leading-relaxed shadow-inner">
{`curl -H "Authorization: Bearer pm_YOUR_TOKEN_HERE" \\
     https://api.stage.io/projects`}
        </pre>
      </section>

      {/* ── REVEAL KEY MODAL ── */}
      {revealedToken && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
          <div className="bg-pm-surface border border-pm-border rounded-3xl max-w-lg w-full p-8 space-y-6 shadow-2xl relative">
            <div className="text-center space-y-3">
              <div className="inline-flex p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-full shadow-sm">
                <Check className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-black text-pm-text uppercase tracking-wide">Developer Token Generated</h3>
              <p className="text-xs text-amber-500 flex items-center justify-center gap-1.5 font-bold uppercase tracking-wider">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                This token will be shown only once!
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-[11px] text-pm-muted font-bold uppercase tracking-wider font-sans">Secret Token</p>
              <div className="flex items-center gap-2 bg-pm-bg border border-pm-border rounded-xl p-4 font-mono font-medium text-sm text-pm-accent break-all select-all shadow-inner">
                <span className="flex-1">{revealedToken}</span>
                <button
                  onClick={() => handleCopy(revealedToken)}
                  className={`p-2.5 rounded-lg border transition-all cursor-pointer ${
                    copied 
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' 
                      : 'bg-pm-surface border-pm-border text-pm-muted hover:bg-pm-surface-2 hover:text-pm-text shadow-sm'
                  }`}
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[9px] text-pm-muted font-bold uppercase tracking-widest text-right mt-1 font-sans">
                {copied ? 'Copied to clipboard' : 'Click clipboard icon to copy'}
              </p>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setRevealedToken(null)}
                className="w-full py-3.5 rounded-xl bg-pm-surface border border-pm-border hover:bg-pm-surface-2 text-pm-text font-bold text-xs transition-all uppercase tracking-widest shadow-sm active:scale-[0.98] cursor-pointer"
              >
                I have stored this safely
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ROTATE CONFIRMATION MODAL ── */}
      {confirmRotateId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
          <div className="bg-pm-surface border border-pm-border rounded-3xl max-w-md w-full p-8 space-y-6 shadow-2xl">
            <div className="text-center space-y-3">
              <div className="inline-flex p-3 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-full shadow-sm">
                <AlertTriangle className="w-8 h-8 animate-pulse" />
              </div>
              <h3 className="text-lg font-black text-pm-text uppercase tracking-wide">Rotate Developer Token?</h3>
              <p className="text-xs text-pm-muted font-medium leading-relaxed font-semibold">
                Rotating this API key will immediately invalidate the current credentials. Any systems, CI/CD runners, or scripts using the existing key will immediately fail authentication.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmRotateId(null)}
                disabled={actionInProgress}
                className="flex-1 py-3.5 rounded-xl bg-pm-surface border border-pm-border hover:bg-pm-surface-2 text-pm-text font-bold text-xs transition-all uppercase tracking-widest disabled:opacity-50 shadow-sm cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRotateKey(confirmRotateId)}
                disabled={actionInProgress}
                className="flex-1 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs transition-all uppercase tracking-widest disabled:opacity-50 shadow-md shadow-black/10 active:scale-[0.98] cursor-pointer"
              >
                {actionInProgress ? 'Rotating...' : 'Rotate Key'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── REVOKE CONFIRMATION MODAL ── */}
      {confirmRevokeId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
          <div className="bg-pm-surface border border-pm-border rounded-3xl max-w-md w-full p-8 space-y-6 shadow-2xl">
            <div className="text-center space-y-3">
              <div className="inline-flex p-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-full shadow-sm">
                <Trash2 className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-black text-pm-text uppercase tracking-wide">Revoke API Key?</h3>
              <p className="text-xs text-pm-muted font-medium leading-relaxed font-semibold">
                Are you absolutely sure you want to revoke this API key? This action is permanent and cannot be undone. All clients using this key will immediately be blocked.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmRevokeId(null)}
                disabled={actionInProgress}
                className="flex-1 py-3.5 rounded-xl bg-pm-surface border border-pm-border hover:bg-pm-surface-2 text-pm-text font-bold text-xs transition-all uppercase tracking-widest disabled:opacity-50 shadow-sm cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRevokeKey(confirmRevokeId)}
                disabled={actionInProgress}
                className="flex-1 py-3.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-all uppercase tracking-widest disabled:opacity-50 shadow-md shadow-black/10 active:scale-[0.98] cursor-pointer"
              >
                {actionInProgress ? 'Revoking...' : 'Revoke Key'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
