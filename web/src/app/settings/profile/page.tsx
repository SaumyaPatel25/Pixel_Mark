'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '@/store/authStore'
import { usePlan } from '@/hooks/usePlan'
import { api } from '@/lib/api'
import SettingsShell from '@/components/SettingsShell'
import { 
  Users, 
  ShieldCheck, 
  Crown, 
  Sparkles, 
  Lock, 
  ArrowRight, 
  Copy, 
  Check, 
  Trash2, 
  Plus, 
  Layers,
  Zap,
  ShieldAlert
} from 'lucide-react'
import Link from 'next/link'

export default function ProfileSettingsPage() {
  const { user, logout } = useAuthStore()
  const plan = usePlan()

  const [name, setName] = useState(user?.name || '')
  const [emailNotifs, setEmailNotifs] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Invite Links Management State
  const [invites, setInvites] = useState<any[]>([])
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteRole, setInviteRole] = useState('developer')
  const [inviteMaxUses, setInviteMaxUses] = useState(plan.capabilities.seats_remaining || 4)
  const [inviteDays, setInviteDays] = useState(7)
  const [invitePassword, setInvitePassword] = useState('')
  const [creatingInvite, setCreatingInvite] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [inviteError, setInviteError] = useState<string | null>(null)

  useEffect(() => {
    if (user?.name) {
      setName(user.name)
    }
  }, [user])

  useEffect(() => {
    if (plan.capabilities.is_billing_owner || plan.capabilities.role === 'admin' || plan.capabilities.role === 'owner') {
      loadInvites()
    }
  }, [plan.capabilities.role, plan.capabilities.is_billing_owner])

  const loadInvites = async () => {
    try {
      const data = await api.invites.list()
      setInvites(data || [])
    } catch (err) {
      console.error('Failed to load invites:', err)
    }
  }

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreatingInvite(true)
    setInviteError(null)
    try {
      await api.invites.create({
        role: inviteRole,
        max_uses: Number(inviteMaxUses),
        expires_in_days: Number(inviteDays),
        password: invitePassword || undefined
      })
      await loadInvites()
      await plan.fetchBillingStatus()
      setShowInviteModal(false)
      setInvitePassword('')
    } catch (err: any) {
      setInviteError(err.message || 'Failed to create invite link.')
    } finally {
      setCreatingInvite(false)
    }
  }

  const handleRevokeInvite = async (id: string) => {
    try {
      await api.invites.revoke(id)
      await loadInvites()
      await plan.fetchBillingStatus()
    } catch (err) {
      console.error('Failed to revoke invite:', err)
    }
  }

  const handleCopyLink = (inviteId: string) => {
    const link = `${window.location.origin}/join/${inviteId}`
    navigator.clipboard.writeText(link)
    setCopiedId(inviteId)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const caps = plan.capabilities

  return (
    <SettingsShell title="Account & Plan Settings" description="Manage your identity, organization team seats, and service plan capabilities.">
      <div className="space-y-8">

        {/* 1. Identity Section */}
        <section className="bg-pm-surface border border-pm-border rounded-3xl p-8 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xs font-extrabold text-pm-text/40 uppercase tracking-[0.2em] font-sans">User Identity</h2>
            {caps.is_billing_owner && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-300 text-[10px] font-mono font-bold uppercase tracking-wider">
                <Crown className="w-3.5 h-3.5 text-amber-500" />
                <span>Billing Owner</span>
              </span>
            )}
          </div>

          <div className="space-y-5">
            <div className="flex items-center gap-4 mb-2">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pm-accent to-pm-accent-bright flex items-center justify-center text-2xl font-bold text-white shadow-md font-mono">
                {name ? name[0].toUpperCase() : user?.email?.[0].toUpperCase()}
              </div>
              <div>
                <p className="text-pm-text font-bold text-lg">{name || 'Developer User'}</p>
                <p className="text-pm-muted text-sm font-medium">{user?.email}</p>
                <p className="text-xs text-pm-muted font-mono capitalize mt-0.5">
                  Role: <strong className="text-pm-accent">{caps.role}</strong> ({caps.org_name})
                </p>
              </div>
            </div>

            <div className="grid gap-2">
              <label className="text-[11px] font-bold text-pm-muted ml-1 font-sans">Display Name</label>
              <input 
                value={name} 
                onChange={e => setName(e.target.value)}
                placeholder="Your Name"
                className="w-full bg-pm-bg border border-pm-border hover:border-pm-border-bright rounded-xl px-4 py-3 text-sm text-pm-text focus:outline-none focus:border-pm-accent focus:ring-1 focus:ring-pm-accent/20 shadow-inner transition-all font-sans" 
              />
            </div>
          </div>
        </section>

        {/* 2. Plan Badge & Billing Status */}
        <section className="bg-pm-surface border border-pm-border rounded-3xl p-8 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-44 h-44 bg-pm-accent-subtle blur-3xl rounded-full pointer-events-none" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 relative z-10">
            <div>
              <h2 className="text-xs font-extrabold text-pm-text/40 uppercase tracking-[0.2em] font-sans mb-1">Organization Plan</h2>
              <div className="flex items-center gap-2">
                <span className="text-xl font-extrabold text-pm-text tracking-tight">{caps.org_name}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {caps.is_paid ? (
                <span className="px-3.5 py-1.5 rounded-full bg-gradient-to-r from-purple-600 to-pm-accent text-white text-xs font-extrabold shadow-md flex items-center gap-1.5 uppercase tracking-wider font-mono">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{caps.plan_type === 'dev_team_early_bird' ? 'Dev Team Early Bird (25% OFF)' : caps.plan_type.toUpperCase()}</span>
                </span>
              ) : (
                <span className="px-3.5 py-1.5 rounded-full bg-pm-surface-2 border border-pm-border text-pm-muted text-xs font-bold font-mono uppercase tracking-wider">
                  Free Workspace
                </span>
              )}

              <span className={`px-2.5 py-1 rounded-md text-[10px] font-mono font-extrabold uppercase border ${
                caps.status === 'active' 
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-300' 
                  : caps.status === 'past_due'
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-300'
                  : 'bg-pm-surface-2 border-pm-border text-pm-muted'
              }`}>
                Status: {caps.status}
              </span>
            </div>
          </div>

          {/* Resource Usage Meters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 relative z-10">
            
            {/* Seat Meter */}
            <div className="bg-pm-surface-2 border border-pm-border rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-pm-text flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-pm-accent" />
                  <span>Developer Seats</span>
                </span>
                <span className="font-mono font-extrabold text-pm-text">
                  {caps.seats_used} / {caps.seats_allowed} seats
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2.5 bg-pm-bg rounded-full overflow-hidden border border-pm-border">
                <div 
                  className="h-full bg-pm-accent transition-all duration-500" 
                  style={{ width: `${Math.min(100, (caps.seats_used / caps.seats_allowed) * 100)}%` }}
                />
              </div>

              <p className="text-[11px] text-pm-muted">
                {caps.seats_remaining > 0 
                  ? `${caps.seats_remaining} developer seats remaining in this organization.`
                  : 'All developer seats claimed in your organization.'}
              </p>
            </div>

            {/* Project Meter */}
            <div className="bg-pm-surface-2 border border-pm-border rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-pm-text flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-pm-accent" />
                  <span>Projects Limit</span>
                </span>
                <span className="font-mono font-extrabold text-pm-text">
                  {caps.projects_used} / {caps.projects_allowed} projects
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2.5 bg-pm-bg rounded-full overflow-hidden border border-pm-border">
                <div 
                  className="h-full bg-pm-accent transition-all duration-500" 
                  style={{ width: `${Math.min(100, (caps.projects_used / caps.projects_allowed) * 100)}%` }}
                />
              </div>

              <p className="text-[11px] text-pm-muted">
                {caps.projects_remaining > 0 
                  ? `${caps.projects_remaining} project slots remaining in this plan.`
                  : 'Project limit reached for your plan.'}
              </p>
            </div>

          </div>

          {/* Feature Access Summary */}
          <div className="bg-pm-surface-2 border border-pm-border rounded-2xl p-6 relative z-10 space-y-4">
            <h3 className="text-xs font-mono font-extrabold uppercase tracking-wider text-pm-accent">
              Workspace Feature Entitlements
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-3.5 rounded-xl bg-pm-surface border border-pm-border flex items-center gap-3">
                {caps.can_use_blueprint_dom ? (
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                    <Zap className="w-4 h-4" />
                  </div>
                ) : (
                  <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
                    <Lock className="w-4 h-4" />
                  </div>
                )}
                <div>
                  <p className="font-bold text-pm-text">Blueprint DOM Mode</p>
                  <p className="text-[10px] text-pm-muted">
                    {caps.can_use_blueprint_dom ? 'Unlocked & Active' : 'Locked (Paid Plan Required)'}
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-pm-surface border border-pm-border flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold text-pm-text">AI Change Summaries</p>
                  <p className="text-[10px] text-pm-muted">
                    {caps.is_paid ? 'Industrial AI Enabled' : 'Basic Triage'}
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-pm-surface border border-pm-border flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold text-pm-text">Team Onboarding</p>
                  <p className="text-[10px] text-pm-muted">
                    {caps.is_paid ? 'Up to 5 Teammates' : '1 Seat (Solo)'}
                  </p>
                </div>
              </div>
            </div>

            {/* CTA depending on plan */}
            {!caps.is_paid ? (
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-pm-border/60">
                <p className="text-xs text-pm-muted">
                  Upgrade your workspace to Dev Team to unlock Blueprint DOM mode, 5 seats, and 10 projects.
                </p>
                <Link
                  href="/pricing"
                  className="px-5 py-2.5 rounded-xl bg-pm-accent hover:bg-pm-accent-bright text-white text-xs font-bold shadow-md transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer"
                >
                  <span>Upgrade to Dev Team</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ) : (
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-pm-border/60">
                <p className="text-xs text-pm-muted">
                  Your Dev Team subscription is active. Share invite links with up to 5 developers.
                </p>
                {(caps.is_billing_owner || caps.role === 'admin' || caps.role === 'owner') && (
                  <button
                    onClick={() => setShowInviteModal(true)}
                    className="px-5 py-2.5 rounded-xl bg-pm-accent hover:bg-pm-accent-bright text-white text-xs font-bold shadow-md transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Invite Teammates</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </section>

        {/* 3. Team Invites Management (Billing Owner / Admin / Paid Users) */}
        {(caps.is_billing_owner || caps.role === 'admin' || caps.role === 'owner' || caps.is_paid) && (
          <section className="bg-pm-surface border border-pm-border rounded-3xl p-8 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xs font-extrabold text-pm-text/40 uppercase tracking-[0.2em] font-sans mb-1">
                  Team Members & Invite Links
                </h2>
                <p className="text-xs text-pm-muted">
                  Manage organization developer seats and team invite links.
                </p>
              </div>

              {(caps.is_billing_owner || caps.role === 'admin' || caps.role === 'owner') && (
                <button
                  onClick={() => setShowInviteModal(true)}
                  disabled={caps.seats_remaining <= 0}
                  className="px-4 py-2 rounded-xl bg-pm-accent hover:bg-pm-accent-bright disabled:opacity-50 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Invite Link</span>
                </button>
              )}
            </div>

            {/* Invite Links List */}
            {invites.length === 0 ? (
              <div className="p-6 text-center border border-dashed border-pm-border rounded-2xl text-xs text-pm-muted">
                No active team invite links created yet. Click "Create Invite Link" to invite your developers.
              </div>
            ) : (
              <div className="space-y-3">
                {invites.map((inv) => (
                  <div
                    key={inv.id}
                    className="p-4 rounded-2xl bg-pm-surface-2 border border-pm-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 font-mono">
                        <span className="font-bold text-pm-text">Role: {inv.role}</span>
                        <span className="px-2 py-0.5 rounded bg-pm-accent/10 text-pm-accent font-bold text-[10px]">
                          {inv.current_use_count} / {inv.max_uses} claimed
                        </span>
                        {inv.is_revoked ? (
                          <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-500 font-bold text-[10px]">
                            Revoked
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-bold text-[10px]">
                            Active Link
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-pm-muted">
                        Created {new Date(inv.created_at).toLocaleDateString()}
                        {inv.expires_at ? ` · Expires ${new Date(inv.expires_at).toLocaleDateString()}` : ''}
                        {inv.has_password ? ' · 🔒 Password Protected' : ''}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {!inv.is_revoked && (
                        <button
                          onClick={() => handleCopyLink(inv.id)}
                          className="px-3 py-1.5 rounded-lg bg-pm-surface border border-pm-border hover:bg-pm-surface-3 text-pm-text font-bold text-[11px] flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          {copiedId === inv.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                              <span>Copied Link!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-pm-accent" />
                              <span>Copy Link</span>
                            </>
                          )}
                        </button>
                      )}

                      {(caps.is_billing_owner || caps.role === 'admin' || caps.role === 'owner') && !inv.is_revoked && (
                        <button
                          onClick={() => handleRevokeInvite(inv.id)}
                          className="p-1.5 rounded-lg text-pm-muted hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          title="Revoke Invite Link"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* 4. Action buttons */}
        <div className="flex flex-col gap-3 pt-2">
          <button 
            onClick={async () => {
              setSaving(true)
              try {
                const { supabase } = await import('@/lib/supabase')
                await supabase.from('profiles').update({ full_name: name }).eq('id', user?.id)
                setSaved(true)
                setTimeout(() => setSaved(false), 2000)
              } catch (err) {
                console.error(err)
              } finally {
                setSaving(false)
              }
            }} 
            disabled={saving}
            className="w-full bg-pm-accent hover:bg-pm-accent-bright disabled:opacity-50 text-white py-4 rounded-2xl text-sm font-bold shadow-md transition-all active:scale-[0.99] cursor-pointer"
          >
            {saving ? 'Saving...' : saved ? '✓ Profile Updated' : 'Save Profile Changes'}
          </button>
          
          <button 
            onClick={() => logout()}
            className="w-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 py-4 rounded-2xl text-xs font-bold tracking-widest uppercase transition-all cursor-pointer"
          >
            Sign Out Securely
          </button>
        </div>

      </div>

      {/* CREATE INVITE LINK MODAL */}
      <AnimatePresence>
        {showInviteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-pm-surface border border-pm-border rounded-3xl p-6 shadow-2xl relative text-pm-text"
            >
              <h3 className="text-lg font-extrabold mb-1">Create Team Invite Link</h3>
              <p className="text-xs text-pm-muted mb-5">
                Generate an onboarding link to invite developers into <strong className="text-pm-text">{caps.org_name}</strong>.
              </p>

              {inviteError && (
                <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs font-bold">
                  {inviteError}
                </div>
              )}

              <form onSubmit={handleCreateInvite} className="space-y-4 text-xs">
                <div>
                  <label className="font-bold text-pm-text mb-1 block">Role Assigned</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="w-full bg-pm-bg border border-pm-border rounded-xl px-3 py-2.5 text-xs text-pm-text focus:outline-none focus:border-pm-accent font-sans"
                  >
                    <option value="developer">Developer Seat</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-pm-text mb-1 block">Max Uses (Seat Cap Capped)</label>
                  <input
                    type="number"
                    min={1}
                    max={caps.seats_remaining || 5}
                    value={inviteMaxUses}
                    onChange={(e) => setInviteMaxUses(Number(e.target.value))}
                    className="w-full bg-pm-bg border border-pm-border rounded-xl px-3 py-2.5 text-xs text-pm-text focus:outline-none focus:border-pm-accent font-sans"
                  />
                  <p className="text-[10px] text-pm-muted mt-1">
                    Capped at {caps.seats_remaining} available developer seats remaining.
                  </p>
                </div>

                <div>
                  <label className="font-bold text-pm-text mb-1 block">Expiration (Days)</label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={inviteDays}
                    onChange={(e) => setInviteDays(Number(e.target.value))}
                    className="w-full bg-pm-bg border border-pm-border rounded-xl px-3 py-2.5 text-xs text-pm-text focus:outline-none focus:border-pm-accent font-sans"
                  />
                </div>

                <div>
                  <label className="font-bold text-pm-text mb-1 block">Optional Password Protection</label>
                  <input
                    type="password"
                    value={invitePassword}
                    onChange={(e) => setInvitePassword(e.target.value)}
                    placeholder="Leave blank for no password"
                    className="w-full bg-pm-bg border border-pm-border rounded-xl px-3 py-2.5 text-xs text-pm-text focus:outline-none focus:border-pm-accent font-sans"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-pm-border">
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(false)}
                    className="px-4 py-2 rounded-xl bg-pm-surface-2 border border-pm-border text-pm-text text-xs font-bold hover:bg-pm-surface-3 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creatingInvite}
                    className="px-4 py-2 rounded-xl bg-pm-accent hover:bg-pm-accent-bright text-white text-xs font-bold transition-all shadow-md cursor-pointer"
                  >
                    {creatingInvite ? 'Generating Link...' : 'Generate Invite Link'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </SettingsShell>
  )
}
