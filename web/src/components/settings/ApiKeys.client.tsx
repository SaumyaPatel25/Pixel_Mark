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
    <div className="space-y-6">
      
      {/* ── ALERTS / ERROR FEEDBACK ── */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs flex items-center gap-3 font-bold">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ── SECURITY TIPS ── */}
      <div className="bg-white border border-[#253B80]/8 shadow-sm rounded-3xl p-6 flex flex-col md:flex-row gap-4 items-start md:items-center">
        <div className="p-3 bg-[#253B80]/5 rounded-xl text-[#253B80]">
          <Key className="w-6 h-6" />
        </div>
        <div className="flex-1 space-y-1">
          <h4 className="text-xs font-black uppercase tracking-wider text-[#1E2022]">API Credentials Policy</h4>
          <p className="text-[11px] text-[#1E2022]/60 font-medium leading-relaxed">
            API keys grant full programmatic access to your PixelMark organization. Keep them secure, never check them into git repositories, and rotate keys regularly.
          </p>
        </div>
        <a 
          href="#curl-help"
          className="text-xs font-bold text-[#253B80] hover:text-[#1E2E66] transition-colors shrink-0 underline underline-offset-4"
        >
          View Integration Guide →
        </a>
      </div>

      {/* ── KEY CREATOR FORM ── */}
      <div className="bg-white border border-[#253B80]/8 rounded-3xl p-6 md:p-8 space-y-4 shadow-sm">
        <h3 className="text-sm font-extrabold text-[#1E2022] uppercase tracking-wider">Generate Developer API Key</h3>
        
        <form onSubmit={handleCreateKey} className="flex flex-col sm:flex-row gap-3">
          <input
            required
            disabled={isCreating}
            type="text"
            placeholder="e.g. Production CI/CD Pipeline"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            className="flex-1 bg-[#F8F7F4] border border-[#253B80]/8 hover:border-[#253B80]/15 rounded-xl px-4 py-3 text-sm font-medium text-[#1E2022] focus:outline-none focus:border-[#253B80] focus:ring-1 focus:ring-[#253B80]/20 transition-all placeholder:text-[#1E2022]/30 outline-none"
          />
          <button
            type="submit"
            disabled={isCreating || !newKeyName.trim()}
            className="px-6 py-3 rounded-xl bg-[#253B80] hover:bg-[#1E2E66] text-white font-bold text-xs transition-all shadow-md shadow-[#253B80]/20 flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            Generate New Key
          </button>
        </form>
      </div>

      {/* ── KEYS TABLE ── */}
      <div className="bg-white border border-[#253B80]/8 rounded-3xl overflow-hidden shadow-sm">
        <div className="px-6 py-5 border-b border-[#253B80]/8 bg-white">
          <h3 className="text-sm font-extrabold text-[#1E2022] uppercase tracking-wider">Active Credentials</h3>
        </div>
        
        {keys.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#1E2022]/40 uppercase tracking-widest font-black bg-slate-50/50">
            No API Keys generated yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#253B80]/8 bg-[#F8F7F4] text-[10px] uppercase tracking-widest text-[#1E2022]/50 font-black">
                  <th className="px-6 py-3.5">Name</th>
                  <th className="px-6 py-3.5">Masked Key</th>
                  <th className="px-6 py-3.5">Created</th>
                  <th className="px-6 py-3.5">Last Used</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#253B80]/8">
                {keys.map((k) => {
                  const isRevoked = !!k.revoked_at
                  return (
                    <tr key={k.id} className="hover:bg-[#F8F7F4]/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-[#1E2022] whitespace-nowrap">{k.name}</td>
                      <td className="px-6 py-4 font-mono font-medium text-[#253B80] whitespace-nowrap">{k.masked_token}</td>
                      <td className="px-6 py-4 text-[#1E2022]/60 whitespace-nowrap">
                        {new Date(k.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-[#1E2022]/60 whitespace-nowrap">
                        {k.last_used_at ? new Date(k.last_used_at).toLocaleDateString() : 'Never'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isRevoked ? (
                          <span className="inline-flex items-center gap-1.5 py-0.5 px-2.5 rounded bg-red-50 border border-red-200 text-[10px] font-black uppercase text-red-600">
                            Revoked
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 py-0.5 px-2.5 rounded bg-emerald-50 border border-emerald-200 text-[10px] font-black uppercase text-emerald-600">
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
                              className="p-2 rounded-lg bg-white border border-[#253B80]/15 hover:bg-[#F8F7F4] hover:text-[#253B80] transition-all text-[#1E2022]/50 shadow-sm"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setConfirmRevokeId(k.id)}
                              title="Revoke Key"
                              className="p-2 rounded-lg bg-red-50 border border-red-100 hover:bg-red-100 hover:border-red-200 hover:text-red-600 transition-all text-red-400 shadow-sm"
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
      <section id="curl-help" className="bg-white border border-[#253B80]/8 shadow-sm rounded-3xl p-6 md:p-8 space-y-4 scroll-mt-6">
        <div className="flex items-center gap-3 border-b border-[#253B80]/8 pb-4">
          <Code className="w-5 h-5 text-[#253B80]" />
          <h3 className="text-sm font-extrabold text-[#1E2022] uppercase tracking-wider">How to use this key</h3>
        </div>
        <p className="text-xs text-[#1E2022]/70 font-medium leading-relaxed">
          Provide your API token inside the <code className="font-mono text-[#253B80] bg-[#F8F7F4] px-1.5 py-0.5 rounded border border-[#253B80]/10">Authorization</code> header as a Bearer credentials token to perform admin-level queries:
        </p>
        <pre className="bg-slate-50 border border-slate-200 rounded-xl p-4 font-mono text-xs text-[#253B80] overflow-x-auto leading-relaxed shadow-inner">
{`curl -H "Authorization: Bearer pm_YOUR_TOKEN_HERE" \\
     https://api.pixelmark.io/projects`}
        </pre>
      </section>

      {/* ── REVEAL KEY MODAL ── */}
      {revealedToken && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-[#1E2022]/40 backdrop-blur-sm">
          <div className="bg-white border border-[#253B80]/10 rounded-3xl max-w-lg w-full p-8 space-y-6 shadow-2xl relative">
            <div className="text-center space-y-3">
              <div className="inline-flex p-3 bg-emerald-50 border border-emerald-100 text-emerald-500 rounded-full shadow-sm">
                <Check className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-black text-[#1E2022] uppercase tracking-wide">Developer Token Generated</h3>
              <p className="text-xs text-amber-600 flex items-center justify-center gap-1.5 font-bold uppercase tracking-wider">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                This token will be shown only once!
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-[11px] text-[#1E2022]/50 font-bold uppercase tracking-wider">Secret Token</p>
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-4 font-mono font-medium text-sm text-[#253B80] break-all select-all shadow-inner">
                <span className="flex-1">{revealedToken}</span>
                <button
                  onClick={() => handleCopy(revealedToken)}
                  className={`p-2.5 rounded-lg border transition-all ${
                    copied 
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-600' 
                      : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-700 shadow-sm'
                  }`}
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[9px] text-[#1E2022]/40 font-bold uppercase tracking-widest text-right mt-1">
                {copied ? 'Copied to clipboard' : 'Click clipboard icon to copy'}
              </p>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setRevealedToken(null)}
                className="w-full py-3.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-[#1E2022] font-bold text-xs transition-all uppercase tracking-widest shadow-sm active:scale-[0.98]"
              >
                I have stored this safely
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ROTATE CONFIRMATION MODAL ── */}
      {confirmRotateId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-[#1E2022]/40 backdrop-blur-sm">
          <div className="bg-white border border-[#253B80]/10 rounded-3xl max-w-md w-full p-8 space-y-6 shadow-2xl">
            <div className="text-center space-y-3">
              <div className="inline-flex p-3 bg-amber-50 border border-amber-100 text-amber-500 rounded-full shadow-sm">
                <AlertTriangle className="w-8 h-8 animate-pulse" />
              </div>
              <h3 className="text-lg font-black text-[#1E2022] uppercase tracking-wide">Rotate Developer Token?</h3>
              <p className="text-xs text-[#1E2022]/70 font-medium leading-relaxed">
                Rotating this API key will immediately invalidate the current credentials. Any systems, CI/CD runners, or scripts using the existing key will immediately fail authentication.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmRotateId(null)}
                disabled={actionInProgress}
                className="flex-1 py-3.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-[#1E2022] font-bold text-xs transition-all uppercase tracking-widest disabled:opacity-50 shadow-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRotateKey(confirmRotateId)}
                disabled={actionInProgress}
                className="flex-1 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs transition-all uppercase tracking-widest disabled:opacity-50 shadow-md shadow-amber-500/20 active:scale-[0.98]"
              >
                {actionInProgress ? 'Rotating...' : 'Rotate Key'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── REVOKE CONFIRMATION MODAL ── */}
      {confirmRevokeId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-[#1E2022]/40 backdrop-blur-sm">
          <div className="bg-white border border-[#253B80]/10 rounded-3xl max-w-md w-full p-8 space-y-6 shadow-2xl">
            <div className="text-center space-y-3">
              <div className="inline-flex p-3 bg-red-50 border border-red-100 text-red-500 rounded-full shadow-sm">
                <Trash2 className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-black text-[#1E2022] uppercase tracking-wide">Revoke API Key?</h3>
              <p className="text-xs text-[#1E2022]/70 font-medium leading-relaxed">
                Are you absolutely sure you want to revoke this API key? This action is permanent and cannot be undone. All clients using this key will immediately be blocked.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmRevokeId(null)}
                disabled={actionInProgress}
                className="flex-1 py-3.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-[#1E2022] font-bold text-xs transition-all uppercase tracking-widest disabled:opacity-50 shadow-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRevokeKey(confirmRevokeId)}
                disabled={actionInProgress}
                className="flex-1 py-3.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition-all uppercase tracking-widest disabled:opacity-50 shadow-md shadow-red-600/20 active:scale-[0.98]"
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
