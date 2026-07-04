'use client'

import { useState } from 'react'
import { Code, Save, Send, CheckCircle2, AlertTriangle, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function GitHubExportPanel({ projectId }: { projectId: string }) {
  const [repo, setRepo] = useState('')
  const [token, setToken] = useState('')
  const [pushing, setPushing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<any>(null)
  
  const BASE = process.env.NEXT_PUBLIC_API_URL || ''

  const saveConfig = async () => {
    setSaving(true)
    try {
      await fetch(`${BASE}/projects/${projectId}/github`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ github_repo: repo, github_token: token })
      })
      // Could add a toast here
    } finally {
      setSaving(false)
    }
  }

  const pushIssues = async () => {
    setPushing(true)
    setResult(null)
    try {
      const res = await fetch(`${BASE}/projects/${projectId}/push-github`, { method: 'POST' })
      const data = await res.json()
      setResult(data)
    } catch (err) {
      console.error('[GITHUB_PUSH_FAILED]', err)
    } finally {
      setPushing(false)
    }
  }

  return (
    <div className="p-6 space-y-6 bg-white/[0.02] border-t border-white/[0.03]">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-purple-500/10 flex items-center justify-center">
          <Code className="w-4 h-4 text-purple-400" />
        </div>
        <div>
          <h3 className="text-white font-black text-[10px] tracking-widest uppercase">GitHub Sync Substrate</h3>
          <p className="text-[9px] text-white/30 uppercase font-bold tracking-widest">Enterprise Issue Orchestration</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-[8px] font-black text-white/30 uppercase tracking-widest ml-1">Repository Path</label>
          <input
            value={repo} onChange={e => setRepo(e.target.value)}
            placeholder="owner/repository (e.g. pixelmark/core)"
            className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder:text-white/10 focus:border-purple-500/50 outline-none transition-all font-mono"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[8px] font-black text-white/30 uppercase tracking-widest ml-1">Personal Access Token</label>
          <input
            value={token} onChange={e => setToken(e.target.value)}
            type="password" placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
            className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder:text-white/10 focus:border-purple-500/50 outline-none transition-all font-mono"
          />
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <button 
          onClick={saveConfig}
          disabled={saving}
          className="flex-1 h-10 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 text-[9px] font-black uppercase tracking-widest transition-all border border-white/5 flex items-center justify-center gap-2"
        >
          <Save className="w-3 h-3" />
          {saving ? 'Saving...' : 'Save Config'}
        </button>
        <button 
          onClick={pushIssues} 
          disabled={pushing || !repo || !token}
          className="flex-1 h-10 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-[9px] font-black uppercase tracking-widest transition-all shadow-xl shadow-purple-900/20 flex items-center justify-center gap-2"
        >
          <Send className="w-3 h-3" />
          {pushing ? 'Syncing...' : 'Push Issues'}
        </button>
      </div>

      {result && (
        <div className="space-y-3 pt-4 border-t border-white/[0.03] animate-in fade-in slide-in-from-top-2 duration-500">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
              <span className="text-[10px] font-black text-green-400 tracking-widest uppercase">{result.created} Issues Created</span>
            </div>
            {result.failed > 0 && (
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                <span className="text-[10px] font-black text-rose-400 tracking-widest uppercase">{result.failed} Failed</span>
              </div>
            )}
          </div>
          
          <div className="space-y-1 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
            {result.urls?.map((url: string, i: number) => (
              <a 
                key={i} 
                href={url} 
                target="_blank" 
                className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition-all group"
              >
                <span className="text-[9px] font-mono text-white/40 truncate mr-4">Issue #{url.split('/').pop()}</span>
                <ExternalLink className="w-3 h-3 text-purple-400 opacity-0 group-hover:opacity-100 transition-all" />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
