'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { useBillingStore } from '@/store/useBillingStore'
import { StageLoader } from '@/components/ui/StageLoader'
import { Users, Lock, ArrowRight, ShieldCheck, AlertCircle, LayoutDashboard } from 'lucide-react'
import Link from 'next/link'

export default function JoinInvitePage() {
  const params = useParams()
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const fetchBillingStatus = useBillingStore((s) => s.fetchBillingStatus)

  const inviteId = typeof params.inviteId === 'string' ? params.inviteId : ''

  const [preview, setPreview] = useState<any>(null)
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!inviteId) return

    const loadPreview = async () => {
      try {
        const data = await api.invites.preview(inviteId)
        setPreview(data)
      } catch (err: any) {
        setError(err.message || 'Invalid or expired invite link.')
      } finally {
        setLoading(false)
      }
    }

    loadPreview()
  }, [inviteId])

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) {
      router.push(`/login?redirectTo=/join/${inviteId}`)
      return
    }

    setJoining(true)
    setError(null)
    try {
      await api.invites.join(inviteId, password || undefined)
      await fetchBillingStatus()
      setSuccess(true)
      setTimeout(() => {
        router.push('/dashboard')
      }, 1500)
    } catch (err: any) {
      setError(err.message || 'Failed to join organization.')
    } finally {
      setJoining(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-pm-bg flex items-center justify-center">
        <StageLoader size="md" text="Loading Team Invite..." />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-pm-bg text-pm-text font-sans flex items-center justify-center p-6 transition-colors duration-500">
      <div className="w-full max-w-md bg-pm-surface border border-pm-border rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        {/* Top Glow */}
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-pm-accent-subtle blur-3xl rounded-full pointer-events-none" />

        <div className="text-center space-y-3 mb-8">
          <div className="w-16 h-16 rounded-2xl bg-pm-accent/10 border border-pm-accent/20 flex items-center justify-center text-pm-accent mx-auto shadow-inner">
            <Users className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-extrabold text-pm-text tracking-tight">
            Team Invitation
          </h1>
          <p className="text-xs text-pm-muted">
            You've been invited to join <strong className="text-pm-text">{preview?.org_name || 'STAGE Team'}</strong>
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-300 text-center space-y-2">
            <ShieldCheck className="w-8 h-8 mx-auto" />
            <h3 className="font-bold text-sm">Welcome to the Team!</h3>
            <p className="text-xs text-pm-muted">Redirecting you to the dashboard...</p>
          </div>
        ) : preview?.is_revoked ? (
          <div className="p-6 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-center space-y-4">
            <p className="text-xs font-bold text-amber-600 dark:text-amber-300">
              This invite link has been revoked by the team administrator.
            </p>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 text-xs font-bold text-pm-accent hover:underline"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              Go to Dashboard
            </Link>
          </div>
        ) : preview?.is_expired ? (
          <div className="p-6 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-center space-y-4">
            <p className="text-xs font-bold text-amber-600 dark:text-amber-300">
              This invite link has expired. Ask your team administrator for a new invite link.
            </p>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 text-xs font-bold text-pm-accent hover:underline"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              Go to Dashboard
            </Link>
          </div>
        ) : preview?.is_full ? (
          <div className="p-6 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-center space-y-4">
            <p className="text-xs font-bold text-amber-600 dark:text-amber-300">
              Team is full. The developer seat limit has been reached for this organization.
            </p>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 text-xs font-bold text-pm-accent hover:underline"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              Go to Dashboard
            </Link>
          </div>
        ) : (
          <form onSubmit={handleJoin} className="space-y-5">
            <div className="bg-pm-surface-2 border border-pm-border rounded-2xl p-4 space-y-2 text-xs text-pm-muted">
              <div className="flex items-center justify-between">
                <span className="font-bold text-pm-text">Role Assigned:</span>
                <span className="capitalize font-mono font-bold text-pm-accent px-2 py-0.5 rounded bg-pm-accent/10">
                  {preview?.role || 'Developer'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-pm-text">Seats Available:</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {preview?.seats_remaining} seats remaining
                </span>
              </div>
            </div>

            {preview?.requires_password && (
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-pm-muted ml-1 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-pm-accent" />
                  <span>Invite Password Required</span>
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter invite password..."
                  required
                  className="w-full bg-pm-bg border border-pm-border rounded-xl px-4 py-3 text-sm text-pm-text focus:outline-none focus:border-pm-accent shadow-inner transition-all placeholder:text-pm-muted"
                />
              </div>
            )}

            {!user && (
              <p className="text-xs text-amber-600 dark:text-amber-400 font-medium text-center">
                You will be asked to sign in or create an account to accept this invitation.
              </p>
            )}

            <button
              type="submit"
              disabled={joining}
              className="w-full py-3.5 rounded-2xl bg-pm-accent hover:bg-pm-accent-bright disabled:opacity-50 text-white font-extrabold text-xs transition-all shadow-lg shadow-pm-accent/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              {joining ? (
                <span>Joining Organization...</span>
              ) : (
                <>
                  <span>Accept & Join Team</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
