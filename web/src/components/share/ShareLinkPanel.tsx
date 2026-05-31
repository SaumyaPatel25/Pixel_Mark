'use client'
import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Link2, Copy, Check, Trash2, Shield, Calendar, MessageSquare } from 'lucide-react'
import { api, ShareLink, ShareLinkCreate } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface ShareLinkPanelProps {
  sessionId: string
  onClose: () => void
}

export function ShareLinkPanel({ sessionId, onClose }: ShareLinkPanelProps) {
  const [links, setLinks] = useState<ShareLink[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Form state
  const [label, setLabel] = useState('')
  const [canComment, setCanComment] = useState(true)
  const [password, setPassword] = useState('')
  const [expiry, setExpiry] = useState<'none' | '24h' | '7d' | '30d'>('none')

  const fetchLinks = useCallback(async () => {
    if (!sessionId) {
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      const data = await api.shareLinks.list(sessionId)
      setLinks(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [sessionId])

  useEffect(() => {
    fetchLinks()
  }, [fetchLinks])

  const handleCreate = async () => {
    if (!sessionId) {
      setError("Session is still initializing. Please wait.")
      return
    }
    try {
      setCreating(true)
      setError(null)
      
      let expiresAt: string | undefined
      if (expiry !== 'none') {
        const date = new Date()
        if (expiry === '24h') date.setHours(date.getHours() + 24)
        if (expiry === '7d') date.setDate(date.getDate() + 7)
        if (expiry === '30d') date.setDate(date.getDate() + 30)
        expiresAt = date.toISOString()
      }

      const data: ShareLinkCreate = {
        session_id: sessionId,
        label: label || 'Client Review Link',
        can_comment: canComment,
        password: password || undefined,
        expires_at: expiresAt
      }

      const newLink = await api.shareLinks.create(data)
      setLinks([newLink, ...links])
      
      // Reset form
      setLabel('')
      setPassword('')
      
      // Copy to clipboard
      handleCopy(newLink.share_url, newLink.id)
      
    } catch (err: any) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  const handleRevoke = async (id: string) => {
    try {
      await api.shareLinks.revoke(id)
      setLinks(links.filter(l => l.id !== id))
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleCopy = (url: string, id: string) => {
    navigator.clipboard.writeText(url)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="fixed inset-y-0 right-0 w-[400px] bg-[#0a0a0f] border-l border-white/10 shadow-2xl z-50 flex flex-col"
    >
      <div className="p-6 border-b border-white/5 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black tracking-tighter text-white uppercase">Share This Audit</h2>
          <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-1">Generate client review links</p>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
          <X className="w-5 h-5 text-white/40" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {/* Create Form */}
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Link Label</label>
            <Input 
              placeholder="e.g. Client Review - May 2026"
              value={label}
              onChange={e => setLabel(e.target.value)}
              className="bg-white/5 border-white/10 text-white placeholder:text-white/20 h-11 rounded-xl"
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
            <div className="flex items-center gap-3">
              <MessageSquare className="w-4 h-4 text-purple-400" />
              <div>
                <p className="text-xs font-bold text-white">Allow Comments</p>
                <p className="text-[10px] text-white/40">Clients can leave markers</p>
              </div>
            </div>
            <button 
              onClick={() => setCanComment(!canComment)}
              className={cn(
                "w-12 h-6 rounded-full transition-all relative",
                canComment ? "bg-purple-600" : "bg-white/10"
              )}
            >
              <div className={cn(
                "absolute top-1 w-4 h-4 rounded-full bg-white transition-all",
                canComment ? "right-1" : "left-1"
              )} />
            </button>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Password Protection</label>
            <div className="relative">
              <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
              <Input 
                type="password"
                placeholder="Set password (optional)"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/20 h-11 rounded-xl pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Expiration</label>
            <div className="grid grid-cols-4 gap-2">
              {(['none', '24h', '7d', '30d'] as const).map(opt => (
                <button
                  key={opt}
                  onClick={() => setExpiry(opt)}
                  className={cn(
                    "h-10 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all",
                    expiry === opt ? "bg-white/10 border-white/20 text-white" : "border-white/5 text-white/40 hover:bg-white/5"
                  )}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-xs text-rose-400 bg-rose-500/10 p-3 rounded-xl border border-rose-500/20">{error}</p>}

          <Button 
            onClick={handleCreate}
            disabled={creating}
            className="w-full h-12 bg-purple-600 hover:bg-purple-500 text-white font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-purple-900/20"
          >
            {creating ? 'Generating...' : 'Generate Share Link'}
          </Button>
        </div>

        {/* Existing Links */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-black text-white/40 uppercase tracking-widest">Active Share Links</h3>
          <div className="space-y-3">
            {loading ? (
              <p className="text-xs text-white/20 animate-pulse">Loading links...</p>
            ) : links.length === 0 ? (
              <div className="p-8 border border-dashed border-white/5 rounded-3xl text-center">
                <Link2 className="w-8 h-8 text-white/10 mx-auto mb-2" />
                <p className="text-xs text-white/20 font-bold uppercase tracking-widest">No active links</p>
              </div>
            ) : links.map(link => (
              <div key={link.id} className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white">{link.label}</h4>
                    <p className="text-[10px] text-white/40 mt-0.5">{link.accessed_count} accesses</p>
                  </div>
                  <button 
                    onClick={() => handleRevoke(link.id)}
                    className="p-2 hover:bg-rose-500/20 rounded-xl group transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-white/20 group-hover:text-rose-400" />
                  </button>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-black/40 px-3 py-2 rounded-xl border border-white/5 overflow-hidden">
                    <p className="text-[10px] text-purple-400 font-mono truncate">{link.share_url}</p>
                  </div>
                  <button 
                    onClick={() => handleCopy(link.share_url, link.id)}
                    className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all"
                  >
                    {copiedId === link.id ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-white/40" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
