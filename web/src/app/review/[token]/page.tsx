'use client'
import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { api, ShareLinkPublicRead } from '@/lib/api'
import { AuditSurface } from '@/components/audit/AuditSurface'
import ReviewerNameGate from '@/components/reviewer/ReviewerNameGate'
import { Loader2, Shield, Lock, Pin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { motion } from 'framer-motion'
import { getStoredReviewerIdentity, clearStoredReviewerIdentity } from '@/lib/reviewerIdentity'
import { getMarkerColors } from '@/lib/markerColors'
import { ReviewerIdentity } from '@/types/markers'

export default function ReviewPage() {
  const params = useParams()
  const token = typeof params.token === 'string' ? params.token : ''
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sessionInfo, setSessionInfo] = useState<ShareLinkPublicRead | null>(null)
  
  const [password, setPassword] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [needsPassword, setNeedsPassword] = useState(false)

  // Reviewer identity state — stored in sessionStorage only (not localStorage)
  const [reviewerIdentity, setReviewerIdentity] = useState<ReviewerIdentity | null>(null)
  const [showIdentityGate, setShowIdentityGate] = useState(false)

  const fetchSession = async (pwd?: string) => {
    try {
      setLoading(true)
      setError(null)
      
      const resolved = await api.shareLinks.resolve({ token, password: pwd })
      setSessionInfo(resolved)
      setNeedsPassword(false)
    } catch (err: any) {
      if (err.message.toLowerCase().includes('password') || err.message.includes('403')) {
        setNeedsPassword(true)
      } else {
        setError(err.message)
      }
    } finally {
      setLoading(false)
      setVerifying(false)
    }
  }

  useEffect(() => {
    if (token) {
      const checkInfo = async () => {
        try {
          const info = await api.shareLinks.getInfo(token)
          if (info.is_password_protected) {
            setNeedsPassword(true)
            setLoading(false)
          } else {
            fetchSession()
          }
        } catch (err: any) {
          setError(err.message)
          setLoading(false)
        }
      }
      checkInfo()
    }
  }, [token])

  // Once session resolves, check reviewer identity from sessionStorage
  useEffect(() => {
    if (sessionInfo) {
      const stored = getStoredReviewerIdentity(sessionInfo.session_id)
      if (stored) {
        console.log(`PixelMark reviewer identity restored [${stored.id}]`)
        setReviewerIdentity(stored)
      } else {
        // Show gate to collect reviewer display name
        setShowIdentityGate(true)
      }
    }
  }, [sessionInfo])

  const handleIdentityReady = (identity: ReviewerIdentity) => {
    setReviewerIdentity(identity)
    setShowIdentityGate(false)
  }

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setVerifying(true)
    fetchSession(password)
  }

  if (loading && !verifying) {
    return (
      <div className="h-screen flex flex-col items-center justify-center space-y-4 bg-[#0a0a0f]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Loading Review Session</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-6 text-center space-y-6 bg-[#0a0a0f]">
        <div className="w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
          <Lock className="w-8 h-8 text-rose-500" />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tighter text-white uppercase">Access Denied</h1>
          <p className="text-white/40 text-xs font-mono mt-2">{error}</p>
        </div>
        <Button onClick={() => window.location.reload()} variant="outline" className="rounded-2xl h-11 px-8 border-white/10 hover:bg-white/5">
          Retry Access
        </Button>
      </div>
    )
  }

  if (needsPassword) {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-6 bg-[#0a0a0f]">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md space-y-8 p-10 rounded-[2.5rem] bg-[#0f0f16] border border-white/5 shadow-2xl"
        >
          <div className="text-center space-y-4">
            <div className="w-20 h-20 rounded-[2rem] bg-purple-600/10 border border-purple-600/20 flex items-center justify-center mx-auto shadow-2xl shadow-purple-900/20">
              <Shield className="w-10 h-10 text-purple-500" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tighter text-white uppercase">Secure Audit</h1>
              <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-2">Password required to view this audit</p>
            </div>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="space-y-2">
              <Input 
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/20 h-14 rounded-2xl px-6"
                autoFocus
              />
            </div>
            <Button 
              type="submit" 
              disabled={verifying}
              className="w-full h-14 bg-purple-600 hover:bg-purple-500 text-white font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-purple-900/20"
            >
              {verifying ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Access Audit'}
            </Button>
          </form>
        </motion.div>
      </div>
    )
  }

  if (sessionInfo) {
    return (
      <div className="h-screen flex flex-col overflow-hidden bg-[#0a0a0f]">
        {/* Reviewer identity gate — shown until reviewer registers name */}
        {showIdentityGate && (
          <ReviewerNameGate
            sessionId={sessionInfo.session_id}
            onIdentityReady={handleIdentityReady}
          />
        )}

        {/* Minimal Public Header */}
        <header className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-[#0a0a0f] z-40">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-xl bg-purple-600 flex items-center justify-center">
              <span className="text-white font-black text-lg">P</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-black text-white uppercase truncate max-w-[200px]">{sessionInfo.session_title}</h1>
                <span className="px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-[7px] font-black text-purple-400 uppercase tracking-widest">Public Review</span>
              </div>
              <p className="text-[8px] text-white/20 font-bold uppercase tracking-widest">{sessionInfo.project_name}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Show reviewer's identity chip if logged in */}
            {reviewerIdentity && (
              <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full border border-white/8">
                <div
                  className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{ backgroundColor: getMarkerColors(reviewerIdentity.color_token).dot }}
                />
                <span className="text-[10px] font-black text-white/70 uppercase tracking-wide">
                  {reviewerIdentity.display_name}
                </span>
              </div>
            )}

            <div className="hidden md:flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full border border-white/5">
              <Pin className="w-3 h-3 text-purple-400" />
              <span className="text-[9px] font-bold text-white/60 uppercase tracking-widest">Drop pins to leave feedback</span>
            </div>
            <div className="h-4 w-[1px] bg-white/10" />
            <div className="flex items-center gap-2 text-white/20">
              <span className="text-[8px] font-black uppercase tracking-widest">Powered by</span>
              <strong className="text-[10px] text-white/40 tracking-tighter">PIXELMARK</strong>
            </div>
          </div>
        </header>

        <main className="flex-1 relative bg-black">
          <AuditSurface 
            sessionId={sessionInfo.session_id}
            projectId={sessionInfo.project_id!} 
            shareToken={token}
            reviewerIdentity={reviewerIdentity}
            isReviewerGateOpen={showIdentityGate}
          />
        </main>
      </div>
    )
  }

  return null
}
