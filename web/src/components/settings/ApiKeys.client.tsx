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
  X, 
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
      
      // Update local keys list by inserting a temporary client representation
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
      
      // Replace old key status and append rotated key
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
    <div className="space-y-6">
      
      {/* ── ALERTS / ERROR FEEDBACK ── */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-3 font-medium">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ── SECURITY TIPS ── */}
      <div className="bg-[#0c0c0e]/80 border border-white/5 rounded-3xl p-6 flex flex-col md:flex-row gap-4 items-start md:items-center">
        <div className="p-3 bg-purple-500/10 rounded-xl text-purple-400">
          <Key className="w-6 h-6" />
        </div>
        <div className="flex-1 space-y-1">
          <h4 className="text-xs font-black uppercase tracking-wider text-white">API Credentials Policy</h4>
          <p className="text-[11px] text-white/40 leading-relaxed">
            API keys grant full programmatic access to your PixelMark organization. Keep them secure, never check them into git repositories, and rotate keys regularly.
          </p>
        </div>
        <a 
          href="#curl-help"
          className="text-xs font-bold text-purple-400 hover:text-purple-300 transition-colors shrink-0 underline underline-offset-4"
        >
          View Integration Guide →
        </a>
      </div>

      {/* ── KEY CREATOR FORM ── */}
      <div className="bg-[#0c0c0e]/85 border border-white/5 rounded-3xl p-6 md:p-8 space-y-4 shadow-xl">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Generate Developer API Key</h3>
        
        <form onSubmit={handleCreateKey} className="flex flex-col sm:flex-row gap-3">
          <input
            required
            disabled={isCreating}
            type="text"
            placeholder="e.g. Production CI/CD Pipeline"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            className="flex-1 bg-white/[0.02] border border-white/10 hover:border-white/20 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-purple-500 transition-all placeholder:text-white/25 outline-none"
          />
          <button
            type="submit"
            disabled={isCreating || !newKeyName.trim()}
            className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs transition-all shadow-lg shadow-purple-900/20 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            Generate New Key
          </button>
        </form>
      </div>

      {/* ── KEYS TABLE ── */}
      <div className="bg-[#0c0c0e]/80 border border-white/5 rounded-3xl overflow-hidden shadow-xl">
        <div className="px-6 py-5 border-b border-white/[0.03]">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Active Credentials</h3>
        </div>
        
        {keys.length === 0 ? (
          <div className="p-12 text-center text-xs text-white/30 uppercase tracking-widest font-black">
            No API Keys generated yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/[0.04] bg-white/[0.01] text-[10px] uppercase tracking-widest text-white/30 font-black">
                  <th className="px-6 py-3.5">Name</th>
                  <th className="px-6 py-3.5">Masked Key</th>
                  <th className="px-6 py-3.5">Created</th>
                  <th className="px-6 py-3.5">Last Used</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.02]">
                {keys.map((k) => {
                  const isRevoked = !!k.revoked_at
                  return (
                    <tr key={k.id} className="hover:bg-white/[0.01] transition-colors">
                      <td className="px-6 py-4 font-bold text-white whitespace-nowrap">{k.name}</td>
                      <td className="px-6 py-4 font-mono text-purple-300 whitespace-nowrap">{k.masked_token}</td>
                      <td className="px-6 py-4 text-white/40 whitespace-nowrap">
                        {new Date(k.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-white/40 whitespace-nowrap">
                        {k.last_used_at ? new Date(k.last_used_at).toLocaleDateString() : 'Never'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isRevoked ? (
                          <span className="inline-flex items-center gap-1.5 py-0.5 px-2.5 rounded bg-rose-500/10 border border-rose-500/20 text-[9px] font-black uppercase text-rose-400">
                            Revoked
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 py-0.5 px-2.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-black uppercase text-emerald-400">
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
                              className="p-2 rounded-lg bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] hover:text-purple-400 transition-all text-white/50"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setConfirmRevokeId(k.id)}
                              title="Revoke Key"
                              className="p-2 rounded-lg bg-rose-500/5 border border-rose-500/10 hover:bg-rose-500/15 hover:text-rose-400 transition-all text-white/30"
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
      <section id="curl-help" className="bg-[#0c0c0e]/85 border border-white/5 rounded-3xl p-6 md:p-8 space-y-4 scroll-mt-6">
        <div className="flex items-center gap-3 border-b border-white/[0.03] pb-4">
          <Code className="w-5 h-5 text-indigo-400" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">How to use this key</h3>
        </div>
        <p className="text-xs text-white/40 leading-relaxed">
          Provide your API token inside the <code className="font-mono text-purple-300 bg-black/40 px-1 py-0.5 rounded">Authorization</code> header as a Bearer credentials token to perform admin-level queries:
        </p>
        <pre className="bg-black/50 border border-white/[0.04] rounded-xl p-4 font-mono text-xs text-purple-300 overflow-x-auto leading-relaxed">
{`curl -H "Authorization: Bearer pm_YOUR_TOKEN_HERE" \\
     https://api.pixelmark.io/projects`}
        </pre>
      </section>

      {/* ── REVEAL KEY MODAL ── */}
      {revealedToken && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/75 backdrop-blur-sm">
          <div className="bg-[#0c0c0e] border border-white/10 rounded-3xl max-w-lg w-full p-8 space-y-6 shadow-2xl relative">
            <div className="text-center space-y-3">
              <div className="inline-flex p-3 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-full">
                <Check className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-black text-white uppercase tracking-wide">Developer Token Generated</h3>
              <p className="text-xs text-amber-400/90 flex items-center justify-center gap-1.5 font-bold uppercase tracking-wider">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                This token will be shown only once!
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-[11px] text-white/40 font-semibold uppercase tracking-wider">Secret Token</p>
              <div className="flex items-center gap-2 bg-black/50 border border-white/5 rounded-xl p-4 font-mono text-xs text-purple-300 break-all select-all">
                <span className="flex-1">{revealedToken}</span>
                <button
                  onClick={() => handleCopy(revealedToken)}
                  className={`p-2.5 rounded-lg border transition-all ${
                    copied 
                      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' 
                      : 'bg-white/5 border-white/10 text-white/55 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[9px] text-white/20 font-bold uppercase tracking-widest text-right mt-1">
                {copied ? 'Copied to clipboard' : 'Click clipboard icon to copy'}
              </p>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setRevealedToken(null)}
                className="w-full py-3.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold text-xs transition-all uppercase tracking-widest"
              >
                I have stored this safely
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ROTATE CONFIRMATION MODAL ── */}
      {confirmRotateId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/75 backdrop-blur-sm">
          <div className="bg-[#0c0c0e] border border-white/10 rounded-3xl max-w-md w-full p-8 space-y-6 shadow-2xl">
            <div className="text-center space-y-3">
              <div className="inline-flex p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-full">
                <AlertTriangle className="w-8 h-8 animate-pulse" />
              </div>
              <h3 className="text-lg font-black text-white uppercase tracking-wide">Rotate Developer Token?</h3>
              <p className="text-xs text-white/40 leading-relaxed">
                Rotating this API key will immediately invalidate the current credentials. Any systems, CI/CD runners, or scripts using the existing key will immediately fail authentication.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmRotateId(null)}
                disabled={actionInProgress}
                className="flex-1 py-3.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold text-xs transition-all uppercase tracking-widest disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRotateKey(confirmRotateId)}
                disabled={actionInProgress}
                className="flex-1 py-3.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition-all uppercase tracking-widest disabled:opacity-50"
              >
                {actionInProgress ? 'Rotating...' : 'Rotate Key'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── REVOKE CONFIRMATION MODAL ── */}
      {confirmRevokeId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/75 backdrop-blur-sm">
          <div className="bg-[#0c0c0e] border border-white/10 rounded-3xl max-w-md w-full p-8 space-y-6 shadow-2xl">
            <div className="text-center space-y-3">
              <div className="inline-flex p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-full">
                <Trash2 className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-black text-white uppercase tracking-wide">Revoke API Key?</h3>
              <p className="text-xs text-white/40 leading-relaxed">
                Are you absolutely sure you want to revoke this API key? This action is permanent and cannot be undone. All clients using this key will immediately be blocked.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmRevokeId(null)}
                disabled={actionInProgress}
                className="flex-1 py-3.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold text-xs transition-all uppercase tracking-widest disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRevokeKey(confirmRevokeId)}
                disabled={actionInProgress}
                className="flex-1 py-3.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-all uppercase tracking-widest disabled:opacity-50"
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
