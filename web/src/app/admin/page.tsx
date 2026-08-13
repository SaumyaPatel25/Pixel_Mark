'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '@/store/authStore'
import { api } from '@/lib/api'
import SettingsShell from '@/components/SettingsShell'
import {
  ShieldAlert,
  ShieldCheck,
  Users,
  Sparkles,
  Layers,
  Crown,
  Lock,
  PauseCircle,
  PlayCircle,
  RefreshCw,
  Search,
  Sliders,
  History,
  Ticket,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react'

export default function AdminPage() {
  const { user } = useAuthStore()
  const [users, setUsers] = useState<any[]>([])
  const [auditLogs, setAuditLogs] = useState<any[]>([])
  const [redemptionCodes, setRedemptionCodes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'users' | 'audit' | 'redemptions'>('users')

  // Override modal state
  const [showOverrideModal, setShowOverrideModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [targetPlan, setTargetPlan] = useState('stage_team')
  const [isManualOverride, setIsManualOverride] = useState(true)
  const [adminNotes, setAdminNotes] = useState('')
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    loadAdminData()
  }, [])

  const loadAdminData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [userData, auditData, redData] = await Promise.all([
        api.admin.getUsers().catch((err: any) => { throw err }),
        api.admin.getAuditLogs().catch(() => ({ logs: [] })),
        api.admin.getRedemptions().catch(() => ({ codes: [] }))
      ])

      setUsers(userData.users || [])
      setAuditLogs(auditData.logs || [])
      setRedemptionCodes(redData.codes || [])
    } catch (err: any) {
      console.error('[STAGE Admin] Error loading admin data:', err)
      setError(err.message || 'Access denied or server error while loading admin data.')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenOverride = (u: any) => {
    setSelectedUser(u)
    setTargetPlan(u.subscription?.plan_type || 'stage_team')
    setIsManualOverride(u.subscription?.is_manual_override ?? true)
    setAdminNotes('')
    setShowOverrideModal(true)
  }

  const handleSaveOverride = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser) return
    setUpdating(true)
    try {
      await api.admin.overridePlan({
        target_user_id: selectedUser.user_id,
        target_org_id: selectedUser.org_id,
        new_plan: targetPlan,
        is_manual_override: isManualOverride,
        notes: adminNotes || 'Updated from STAGE Admin Control Panel'
      })

      setShowOverrideModal(false)
      await loadAdminData()
    } catch (err: any) {
      alert(`Override failed: ${err.message}`)
    } finally {
      setUpdating(false)
    }
  }

  const handleTogglePause = async (orgId: string, currentPaused: boolean) => {
    if (!confirm(`Are you sure you want to ${currentPaused ? 'reactivate' : 'pause'} access for this organization?`)) return
    try {
      await api.admin.togglePause({
        target_org_id: orgId,
        is_paused: !currentPaused,
        notes: `Toggled via Admin Panel by ${user?.email}`
      })
      await loadAdminData()
    } catch (err: any) {
      alert(`Toggle pause failed: ${err.message}`)
    }
  }

  const filteredUsers = users.filter(u => {
    const q = searchQuery.toLowerCase()
    return (
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.org_name && u.org_name.toLowerCase().includes(q)) ||
      (u.subscription?.plan_type && u.subscription.plan_type.toLowerCase().includes(q))
    )
  })

  // Metrics
  const totalUsersCount = users.length
  const stageTeamCount = users.filter(u => u.subscription?.plan_type === 'stage_team').length
  const manualOverrideCount = users.filter(u => u.subscription?.is_manual_override).length
  const entrextDomainCount = users.filter(u => u.is_entrext_domain).length

  if (error) {
    return (
      <SettingsShell title="STAGE Admin Control Panel" description="Access Restricted">
        <div className="p-8 rounded-3xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 space-y-4">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-8 h-8 text-rose-500" />
            <div>
              <h3 className="font-extrabold text-lg">Server Access Control Blocked</h3>
              <p className="text-xs">{error}</p>
            </div>
          </div>
          <p className="text-xs font-mono">
            Only workspace super-admins and designated owner accounts can access this interface.
          </p>
        </div>
      </SettingsShell>
    )
  }

  return (
    <SettingsShell title="STAGE Admin Control Panel" description="Owner subscription overrides, entitlement precedence, and system audit logs.">
      <div className="space-y-8">
        
        {/* Top Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-sans">
          <div className="p-5 rounded-3xl bg-pm-surface border border-pm-border shadow-sm flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-pm-accent/10 text-pm-accent">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] font-extrabold text-pm-muted uppercase tracking-wider">Total Users</p>
              <p className="text-2xl font-black text-pm-text font-mono">{totalUsersCount}</p>
            </div>
          </div>

          <div className="p-5 rounded-3xl bg-pm-surface border border-pm-border shadow-sm flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-500">
              <Crown className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <p className="text-[11px] font-extrabold text-pm-muted uppercase tracking-wider">STAGE Team Tier</p>
              <p className="text-2xl font-black text-pm-text font-mono">{stageTeamCount}</p>
            </div>
          </div>

          <div className="p-5 rounded-3xl bg-pm-surface border border-pm-border shadow-sm flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-500">
              <Sliders className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] font-extrabold text-pm-muted uppercase tracking-wider">Manual Overrides</p>
              <p className="text-2xl font-black text-pm-text font-mono">{manualOverrideCount}</p>
            </div>
          </div>

          <div className="p-5 rounded-3xl bg-pm-surface border border-pm-border shadow-sm flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] font-extrabold text-pm-muted uppercase tracking-wider">@entrext.com Auto</p>
              <p className="text-2xl font-black text-pm-text font-mono">{entrextDomainCount}</p>
            </div>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center justify-between border-b border-pm-border pb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('users')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'users'
                  ? 'bg-pm-accent text-white shadow-md'
                  : 'bg-pm-surface border border-pm-border text-pm-muted hover:text-pm-text'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>User Accounts & Plans</span>
            </button>

            <button
              onClick={() => setActiveTab('audit')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'audit'
                  ? 'bg-pm-accent text-white shadow-md'
                  : 'bg-pm-surface border border-pm-border text-pm-muted hover:text-pm-text'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Entitlement Audit Log ({auditLogs.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('redemptions')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'redemptions'
                  ? 'bg-pm-accent text-white shadow-md'
                  : 'bg-pm-surface border border-pm-border text-pm-muted hover:text-pm-text'
              }`}
            >
              <Ticket className="w-4 h-4" />
              <span>Redemption Codes ({redemptionCodes.length})</span>
            </button>
          </div>

          <button
            onClick={() => loadAdminData()}
            disabled={loading}
            className="p-2 rounded-xl bg-pm-surface border border-pm-border text-pm-muted hover:text-pm-text hover:bg-pm-surface-2 transition-all cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* TAB 1: USERS LIST */}
        {activeTab === 'users' && (
          <section className="space-y-4">
            {/* Search Input */}
            <div className="relative max-w-md">
              <Search className="w-4 h-4 text-pm-muted absolute left-3.5 top-3.5" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search user, email, org name, or plan..."
                className="w-full bg-pm-surface border border-pm-border rounded-xl pl-10 pr-4 py-2.5 text-xs text-pm-text focus:outline-none focus:border-pm-accent font-sans"
              />
            </div>

            {/* Users Table */}
            <div className="bg-pm-surface border border-pm-border rounded-3xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-pm-surface-2 border-b border-pm-border text-[10px] font-mono uppercase tracking-wider text-pm-muted">
                    <tr>
                      <th className="px-6 py-4">User / Email</th>
                      <th className="px-6 py-4">Workspace Org</th>
                      <th className="px-6 py-4">Current Plan & Source</th>
                      <th className="px-6 py-4">Limits & Usage</th>
                      <th className="px-6 py-4">Status & Precedence</th>
                      <th className="px-6 py-4 text-right">Admin Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-pm-border font-sans">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-pm-muted">
                          No accounts found matching your query.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map(u => {
                        const planType = u.subscription?.plan_type || 'none'
                        const isManual = u.subscription?.is_manual_override
                        const isPaused = u.subscription?.is_paused
                        const planSource = u.subscription?.plan_source || 'default'

                        return (
                          <tr key={u.user_id} className="hover:bg-pm-surface-2/50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="font-bold text-pm-text">{u.name || 'Unnamed Developer'}</div>
                              <div className="text-[11px] text-pm-muted font-mono">{u.email}</div>
                              <div className="flex items-center gap-1.5 mt-1 font-mono text-[10px]">
                                {u.auth_providers.map((p: string) => (
                                  <span key={p} className="px-1.5 py-0.5 rounded bg-pm-surface-2 border border-pm-border capitalize text-pm-muted">
                                    {p}
                                  </span>
                                ))}
                                {u.is_entrext_domain && (
                                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 font-bold">
                                    @entrext.com
                                  </span>
                                )}
                              </div>
                            </td>

                            <td className="px-6 py-4">
                              <div className="font-bold text-pm-text">{u.org_name || 'Personal Workspace'}</div>
                              <div className="text-[10px] text-pm-muted font-mono capitalize">
                                Role: {u.role} {u.is_internal ? '· Internal Org' : ''}
                              </div>
                            </td>

                            <td className="px-6 py-4 font-mono">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border ${
                                planType === 'stage_team'
                                  ? 'bg-purple-500/10 border-purple-500/30 text-purple-400'
                                  : planType === 'dev_team' || planType === 'dev_team_early_bird'
                                  ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                                  : planType === 'enterprise'
                                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                                  : 'bg-pm-surface-2 border-pm-border text-pm-muted'
                              }`}>
                                {planType === 'stage_team' && <Crown className="w-3 h-3 text-amber-400" />}
                                <span>{planType}</span>
                              </span>
                              <div className="text-[10px] text-pm-muted mt-1">
                                Source: <strong className="text-pm-text">{planSource}</strong>
                              </div>
                            </td>

                            <td className="px-6 py-4 font-mono text-[11px]">
                              <div>Projects: <strong className="text-pm-text">{u.projects_count} / {u.subscription?.projects_allowed ?? 1}</strong></div>
                              <div>Seats: <strong className="text-pm-text">1 / {u.subscription?.seats_allowed ?? 1}</strong></div>
                            </td>

                            <td className="px-6 py-4 font-mono text-[10px]">
                              <div className="space-y-1">
                                {isManual && (
                                  <span className="inline-block px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/30 text-blue-400 font-bold">
                                    Manual Override Active
                                  </span>
                                )}
                                {isPaused && (
                                  <span className="inline-block px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/30 text-rose-400 font-bold">
                                    Paused
                                  </span>
                                )}
                                {!isManual && !isPaused && (
                                  <span className="inline-block px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold">
                                    Normal Precedence
                                  </span>
                                )}
                              </div>
                            </td>

                            <td className="px-6 py-4 text-right space-x-2">
                              <button
                                onClick={() => handleOpenOverride(u)}
                                className="px-3 py-1.5 rounded-lg bg-pm-accent hover:bg-pm-accent-bright text-white text-[11px] font-bold shadow-sm transition-all cursor-pointer"
                              >
                                Override Plan
                              </button>

                              {u.org_id && (
                                <button
                                  onClick={() => handleTogglePause(u.org_id, isPaused)}
                                  className={`p-1.5 rounded-lg border text-[11px] transition-colors cursor-pointer ${
                                    isPaused
                                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                                      : 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20'
                                  }`}
                                  title={isPaused ? 'Reactivate Org' : 'Pause Org Access'}
                                >
                                  {isPaused ? <PlayCircle className="w-4 h-4" /> : <PauseCircle className="w-4 h-4" />}
                                </button>
                              )}
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* TAB 2: AUDIT LOGS */}
        {activeTab === 'audit' && (
          <section className="bg-pm-surface border border-pm-border rounded-3xl p-6 shadow-sm space-y-4 font-sans">
            <h3 className="text-xs font-mono font-extrabold uppercase tracking-wider text-pm-accent">
              Entitlement Audit Log History
            </h3>
            <p className="text-xs text-pm-muted">
              Every administrative plan override, auto-provisioning event, and pause state change is permanently logged below.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-pm-surface-2 border-b border-pm-border text-[10px] font-mono uppercase tracking-wider text-pm-muted">
                  <tr>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">Actor Email</th>
                    <th className="px-4 py-3">Target Org</th>
                    <th className="px-4 py-3">Transition</th>
                    <th className="px-4 py-3">Audit Reason / Trigger</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pm-border font-mono text-[11px]">
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-pm-muted">
                        No audit log entries recorded yet.
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((l: any) => (
                      <tr key={l.id} className="hover:bg-pm-surface-2/50">
                        <td className="px-4 py-3 text-pm-muted">
                          {l.created_at ? new Date(l.created_at).toLocaleString() : 'N/A'}
                        </td>
                        <td className="px-4 py-3 font-bold text-pm-text">{l.actor_email || 'System Auto'}</td>
                        <td className="px-4 py-3 text-pm-muted">{l.target_org_id}</td>
                        <td className="px-4 py-3">
                          <span className="text-rose-400">{l.old_tier}</span>
                          <span className="text-pm-muted"> → </span>
                          <span className="text-emerald-400 font-bold">{l.new_tier}</span>
                        </td>
                        <td className="px-4 py-3 text-pm-muted font-sans text-xs">{l.reason || '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* TAB 3: REDEMPTION CODES */}
        {activeTab === 'redemptions' && (
          <section className="bg-pm-surface border border-pm-border rounded-3xl p-6 shadow-sm space-y-4 font-sans">
            <h3 className="text-xs font-mono font-extrabold uppercase tracking-wider text-pm-accent">
              Redemption Code Registry
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-pm-surface-2 border-b border-pm-border text-[10px] uppercase tracking-wider text-pm-muted">
                  <tr>
                    <th className="px-4 py-3">Code</th>
                    <th className="px-4 py-3">Plan Granted</th>
                    <th className="px-4 py-3">Uses / Max</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Created Date</th>
                    <th className="px-4 py-3 font-sans">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pm-border">
                  {redemptionCodes.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-pm-muted font-sans">
                        No redemption codes created in database yet.
                      </td>
                    </tr>
                  ) : (
                    redemptionCodes.map((c: any) => (
                      <tr key={c.id} className="hover:bg-pm-surface-2/50">
                        <td className="px-4 py-3 font-bold text-pm-accent">{c.code}</td>
                        <td className="px-4 py-3 text-pm-text">{c.plan}</td>
                        <td className="px-4 py-3 text-pm-muted">{c.uses_count} / {c.max_uses}</td>
                        <td className="px-4 py-3">
                          {c.is_active ? (
                            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold">Active</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 font-bold">Exhausted</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-pm-muted">{new Date(c.created_at).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-pm-muted font-sans">{c.notes || '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

      </div>

      {/* OVERRIDE PLAN MODAL */}
      <AnimatePresence>
        {showOverrideModal && selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-pm-surface border border-pm-border rounded-3xl p-6 shadow-2xl relative text-pm-text font-sans"
            >
              <h3 className="text-lg font-extrabold mb-1">Override Account Subscription Plan</h3>
              <p className="text-xs text-pm-muted mb-5">
                Target User: <strong className="text-pm-text font-mono">{selectedUser.email}</strong>
              </p>

              <form onSubmit={handleSaveOverride} className="space-y-4 text-xs">
                <div>
                  <label className="font-bold text-pm-text mb-1 block font-sans">Select Target Plan Tier</label>
                  <select
                    value={targetPlan}
                    onChange={e => setTargetPlan(e.target.value)}
                    className="w-full bg-pm-bg border border-pm-border rounded-xl px-3 py-2.5 text-xs text-pm-text focus:outline-none focus:border-pm-accent font-sans capitalize"
                  >
                    <option value="stage_team">STAGE Team (Unlimited internal access)</option>
                    <option value="dev_team">Dev Team (5 seats, 10 projects)</option>
                    <option value="dev_team_early_bird">Dev Team Early Bird (25% OFF)</option>
                    <option value="enterprise">Enterprise (Unlimited custom)</option>
                    <option value="none">Free Workspace (1 seat, 1 project)</option>
                  </select>
                </div>

                <div className="p-3.5 rounded-2xl bg-pm-surface-2 border border-pm-border space-y-2">
                  <label className="flex items-center gap-2 font-bold text-pm-text cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isManualOverride}
                      onChange={e => setIsManualOverride(e.target.checked)}
                      className="rounded border-pm-border text-pm-accent focus:ring-pm-accent"
                    />
                    <span>Set Manual Admin Override Flag</span>
                  </label>
                  <p className="text-[11px] text-pm-muted leading-relaxed">
                    When checked, Dodo billing webhooks will be strictly blocked from overwriting or reverting this decision.
                  </p>
                </div>

                <div>
                  <label className="font-bold text-pm-text mb-1 block font-sans">Admin Audit Reason / Notes</label>
                  <textarea
                    rows={3}
                    value={adminNotes}
                    onChange={e => setAdminNotes(e.target.value)}
                    placeholder="e.g. Granted for client VIP partner demo"
                    className="w-full bg-pm-bg border border-pm-border rounded-xl p-3 text-xs text-pm-text focus:outline-none focus:border-pm-accent font-sans"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-pm-border">
                  <button
                    type="button"
                    onClick={() => setShowOverrideModal(false)}
                    className="px-4 py-2 rounded-xl bg-pm-surface-2 border border-pm-border text-pm-text text-xs font-bold hover:bg-pm-surface-3 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updating}
                    className="px-5 py-2 rounded-xl bg-pm-accent hover:bg-pm-accent-bright text-white text-xs font-bold transition-all shadow-md cursor-pointer"
                  >
                    {updating ? 'Saving Changes...' : 'Apply Plan Override'}
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
