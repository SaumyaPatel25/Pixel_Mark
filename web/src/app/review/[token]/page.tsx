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
import { PixelmarkLoader } from '@/components/ui/PixelmarkLoader'
import { getStoredReviewerIdentity, clearStoredReviewerIdentity } from '@/lib/reviewerIdentity'
import { getMarkerColors } from '@/lib/markerColors'
import { ReviewerIdentity } from '@/types/markers'
import { cn } from '@/lib/utils'
import { OnboardingTour } from '@/components/onboarding/OnboardingTour'
import { OnboardingChecklist } from '@/components/onboarding/OnboardingChecklist'
import { useOnboardingStore } from '@/store/onboardingStore'

export default function ReviewPage() {
  const params = useParams()
  const token = typeof params.token === 'string' ? params.token : ''
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false)
  
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
    // Auto-trigger reviewer tutorial
    useOnboardingStore.getState().startOnboarding('reviewer')
  }

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setVerifying(true)
    fetchSession(password)
  }

  if (loading && !verifying) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-pm-bg text-pm-text transition-colors duration-300">
        <PixelmarkLoader size="md" text="Loading Review Session" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-6 text-center space-y-6 bg-pm-bg text-pm-text transition-colors duration-300">
        <div className="w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shadow-lg">
          <Lock className="w-8 h-8 text-rose-500" />
        </div>
        <div>
          <h1 className="text-xl font-black tracking-tighter text-pm-text uppercase">Access Denied</h1>
          <p className="text-pm-muted text-xs font-mono mt-2">{error}</p>
        </div>
        <Button onClick={() => window.location.reload()} variant="outline" className="rounded-2xl h-11 px-8 border-pm-border bg-pm-surface-2 hover:bg-pm-surface-3 text-pm-text transition-all">
          Retry Access
        </Button>
      </div>
    )
  }

  if (needsPassword) {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-6 bg-pm-bg text-pm-text transition-colors duration-300">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md space-y-8 p-10 rounded-[2.5rem] bg-pm-surface border border-pm-border shadow-2xl transition-all"
        >
          <div className="text-center space-y-4">
            <div className="w-20 h-20 rounded-[2rem] bg-pm-accent-subtle border border-pm-border flex items-center justify-center mx-auto shadow-2xl">
              <Shield className="w-10 h-10 text-pm-accent" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tighter text-pm-text uppercase">Secure Audit</h1>
              <p className="text-[10px] text-pm-muted font-bold uppercase tracking-widest mt-2">Password required to view this audit</p>
            </div>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="space-y-2">
              <Input 
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="bg-pm-surface-2 border border-pm-border text-pm-text placeholder:text-pm-muted h-14 rounded-2xl px-6 focus:border-pm-accent transition-colors"
                autoFocus
              />
            </div>
            <Button 
              type="submit" 
              disabled={verifying}
              className="w-full h-14 bg-pm-accent hover:bg-pm-accent-bright text-white font-black uppercase tracking-widest rounded-2xl shadow-lg transition-all"
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
      <div className="h-screen flex flex-col overflow-hidden bg-pm-bg text-pm-text transition-colors duration-300">
        {/* Reviewer identity gate — shown until reviewer registers name */}
        {showIdentityGate && (
          <ReviewerNameGate
            sessionId={sessionInfo.session_id}
            onIdentityReady={handleIdentityReady}
          />
        )}

        {/* Minimal Public Header */}
        <header className={cn(
          "border-b border-pm-border flex items-center justify-between px-6 bg-pm-surface z-40 transition-all duration-300",
          isHeaderCollapsed ? "h-0 overflow-hidden border-b-0 py-0 opacity-0" : "h-16"
        )}>
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-xl bg-pm-accent flex items-center justify-center shadow-sm">
              <span className="text-white font-black text-lg">P</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-black text-pm-text uppercase truncate max-w-[200px]">{sessionInfo.session_title}</h1>
                <span className="px-2 py-0.5 rounded-full bg-pm-accent-subtle border border-pm-border text-[7px] font-black text-pm-accent uppercase tracking-widest">Public Review</span>
              </div>
              <p className="text-[8px] text-pm-muted font-bold uppercase tracking-widest mt-0.5">{sessionInfo.project_name}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Show reviewer's identity chip if logged in */}
            {reviewerIdentity && (
              <div className="flex items-center gap-2 bg-pm-surface-2 px-3 py-1.5 rounded-full border border-pm-border transition-colors">
                <div
                  className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{ backgroundColor: getMarkerColors(reviewerIdentity.color_token).dot }}
                />
                <span className="text-[10px] font-black text-pm-text/70 uppercase tracking-wide">
                  {reviewerIdentity.display_name}
                </span>
              </div>
            )}

            <div className="hidden md:flex items-center gap-2 bg-pm-surface-2 px-4 py-2 rounded-full border border-pm-border transition-colors">
              <Pin className="w-3 h-3 text-pm-accent" />
              <span className="text-[9px] font-bold text-pm-muted uppercase tracking-widest">Drop pins to leave feedback</span>
            </div>
            <div className="h-4 w-[1px] bg-pm-border" />
            <div className="flex items-center gap-2 text-pm-muted">
              <span className="text-[8px] font-black uppercase tracking-widest">Powered by</span>
              <strong className="text-[10px] text-pm-text tracking-tighter">PIXELMARK</strong>
            </div>
          </div>
        </header>

        <main className="flex-1 relative bg-black">
          <AuditSurface 
            sessionId={sessionInfo.session_id}
            projectId={sessionInfo.project_id!} 
            initialUrl={sessionInfo.target_url || undefined}
            shareToken={token}
            reviewerIdentity={reviewerIdentity}
            isReviewerGateOpen={showIdentityGate}
            isHeaderCollapsed={isHeaderCollapsed}
            onHeaderCollapsedChange={setIsHeaderCollapsed}
          />
        </main>
        <OnboardingTour />
        <OnboardingChecklist />
      </div>
    )
  }

  return null
}
