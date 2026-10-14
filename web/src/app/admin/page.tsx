'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
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
  CheckCircle2,
  Activity,
  FolderKanban,
  ExternalLink,
  Calendar,
  Clock,
  ArrowUpRight,
  Filter,
  Eye,
  Check,
  X,
  MessageSquare
} from 'lucide-react'

function formatRelativeTime(isoString: string | null): string {
  if (!isoString) return 'Never'
  const date = new Date(isoString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHours = Math.floor(diffMin / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSec < 60) return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 30) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

export default function AdminPage() {
  const { user } = useAuthStore()
  const [users, setUsers] = useState<any[]>([])
  const [metrics, setMetrics] = useState<any>(null)
  const [auditLogs, setAuditLogs] = useState<any[]>([])
  const [redemptionCodes, setRedemptionCodes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'activity' | 'users' | 'audit' | 'redemptions'>('activity')
  const [activityFilter, setActivityFilter] = useState<'all' | 'returning' | 'active_recent' | 'has_projects' | 'never_returned'>('all')

  // Modals state
  const [showOverrideModal, setShowOverrideModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [targetPlan, setTargetPlan] = useState('stage_team')
  const [isManualOverride, setIsManualOverride] = useState(true)
  const [adminNotes, setAdminNotes] = useState('')
  const [updating, setUpdating] = useState(false)

  // Project details modal
  const [viewProjectsUser, setViewProjectsUser] = useState<any>(null)

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
      setMetrics(userData.metrics || null)
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

  // Filter users based on query and selected activity pill
  const filteredUsers = users.filter(u => {
    const q = searchQuery.toLowerCase()
    const matchesSearch =
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.org_name && u.org_name.toLowerCase().includes(q)) ||
      (u.subscription?.plan_type && u.subscription.plan_type.toLowerCase().includes(q)) ||
      (u.projects && u.projects.some((p: any) => p.name?.toLowerCase().includes(q) || p.url?.toLowerCase().includes(q)))

    if (!matchesSearch) return false

    if (activeTab === 'activity') {
      if (activityFilter === 'returning') return u.is_returning === true
      if (activityFilter === 'active_recent') return u.activity_status === 'active_today' || u.activity_status === 'active_this_week'
      if (activityFilter === 'has_projects') return (u.projects_count || 0) > 0
      if (activityFilter === 'never_returned') return u.activity_status === 'never_returned' || (!u.is_returning && (u.projects_count || 0) === 0)
    }

    return true
  })

  // Computed metrics
  const totalUsersCount = metrics?.total_users ?? users.length
  const returningCount = metrics?.returning_users ?? users.filter(u => u.is_returning).length
  const retentionRate = metrics?.retention_rate ?? (totalUsersCount > 0 ? Math.round((returningCount / totalUsersCount) * 100) : 0)
  const activeRecentCount = metrics?.active_7d ?? users.filter(u => u.activity_status === 'active_today' || u.activity_status === 'active_this_week').length
  const totalProjectsCount = metrics?.total_projects ?? users.reduce((acc, u) => acc + (u.projects_count || 0), 0)
  const totalMarkersCount = metrics?.total_markers ?? users.reduce((acc, u) => acc + (u.total_markers_count || 0), 0)

  const stageTeamCount = users.filter(u => u.subscription?.plan_type === 'stage_team').length
  const manualOverrideCount = users.filter(u => u.subscription?.is_manual_override).length
  const entrextDomainCount = users.filter(u => u.is_entrext_domain).length

  const renderActivityBadge = (u: any) => {
    const status = u.activity_status
    if (status === 'active_today') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Active Today</span>
        </span>
      )
    }
    if (status === 'active_this_week') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
          <span>Returned (This Week)</span>
        </span>
      )
    }
    if (status === 'returning_dormant') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          <span>Returned ({u.days_since_last_seen ?? 14}d ago)</span>
        </span>
      )
    }
    if (status === 'new_today') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
          <span>New Today</span>
        </span>
      )
    }
    if (status === 'never_returned') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
          <span>Never Returned</span>
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium bg-slate-500/10 text-pm-muted border border-slate-500/20">
        <span>Inactive</span>
      </span>
    )
  }

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
    <SettingsShell
      title="STAGE Admin Control Panel"
      description="Private user intelligence, project activity, retention telemetry, and subscription management."
    >
      <div className="space-y-8">

        {/* Top Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-sans">
          
          <div className="p-5 rounded-3xl bg-pm-surface border border-pm-border shadow-sm flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-pm-accent/10 text-pm-accent shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] font-extrabold text-pm-muted uppercase tracking-wider">Total Signups</p>
              <p className="text-2xl font-black text-pm-text font-mono">{totalUsersCount}</p>
              <p className="text-[10px] text-pm-muted mt-0.5">All registered users</p>
            </div>
          </div>

          <div className="p-5 rounded-3xl bg-pm-surface border border-pm-border shadow-sm flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500 shrink-0">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] font-extrabold text-pm-muted uppercase tracking-wider">Returning Users</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-pm-text font-mono">{returningCount}</span>
                <span className="text-xs font-bold text-emerald-500 font-mono">({retentionRate}%)</span>
              </div>
              <p className="text-[10px] text-pm-muted mt-0.5">Logged in after signup day</p>
            </div>
          </div>

          <div className="p-5 rounded-3xl bg-pm-surface border border-pm-border shadow-sm flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-500 shrink-0">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] font-extrabold text-pm-muted uppercase tracking-wider">Active (7 Days)</p>
              <p className="text-2xl font-black text-pm-text font-mono">{activeRecentCount}</p>
              <p className="text-[10px] text-pm-muted mt-0.5">Recent return visits</p>
            </div>
          </div>

          <div className="p-5 rounded-3xl bg-pm-surface border border-pm-border shadow-sm flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-500 shrink-0">
              <FolderKanban className="w-6 h-6 text-[#2B4CFF]" />
            </div>
            <div>
              <p className="text-[11px] font-extrabold text-pm-muted uppercase tracking-wider">Projects Launched</p>
              <p className="text-2xl font-black text-pm-text font-mono">{totalProjectsCount}</p>
              <p className="text-[10px] text-pm-muted mt-0.5">{totalMarkersCount} feedback pins created</p>
            </div>
          </div>

        </div>

        {/* Tab Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-pm-border pb-4">
          <div className="flex flex-wrap items-center gap-2">
            
            <button
              onClick={() => setActiveTab('activity')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'activity'
                  ? 'bg-[#2B4CFF] text-white shadow-md shadow-[#2B4CFF]/20'
                  : 'bg-pm-surface border border-pm-border text-pm-muted hover:text-pm-text'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>User Intelligence &amp; Retention</span>
            </button>

            <button
              onClick={() => setActiveTab('users')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'users'
                  ? 'bg-pm-accent text-white shadow-md'
                  : 'bg-pm-surface border border-pm-border text-pm-muted hover:text-pm-text'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Plans &amp; Entitlements ({users.length})</span>
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
            className="p-2 rounded-xl bg-pm-surface border border-pm-border text-pm-muted hover:text-pm-text hover:bg-pm-surface-2 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-mono"
            title="Refresh Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

        {/* TAB 0: USER INTELLIGENCE & RETENTION (PRIMARY) */}
        {activeTab === 'activity' && (
          <section className="space-y-4 font-sans">
            
            {/* Search & Filter Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-pm-muted absolute left-3.5 top-3.5" />
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Filter by email, name, project title, or URL..."
                  className="w-full bg-pm-surface border border-pm-border rounded-xl pl-10 pr-4 py-2.5 text-xs text-pm-text focus:outline-none focus:border-[#2B4CFF] font-sans"
                />
              </div>

              {/* Quick Filter Pills */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                {[
                  { id: 'all', label: `All (${users.length})` },
                  { id: 'returning', label: `Returned (${returningCount})` },
                  { id: 'active_recent', label: `Active 7d (${activeRecentCount})` },
                  { id: 'has_projects', label: `Has Projects` },
                  { id: 'never_returned', label: `Never Returned` }
                ].map(pill => (
                  <button
                    key={pill.id}
                    onClick={() => setActivityFilter(pill.id as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer border ${
                      activityFilter === pill.id
                        ? 'bg-[#2B4CFF] text-white border-[#2B4CFF] font-bold shadow-sm'
                        : 'bg-pm-surface border-pm-border text-pm-muted hover:text-pm-text'
                    }`}
                  >
                    {pill.label}
                  </button>
                ))}
              </div>
            </div>

            {/* User Intelligence Table */}
            <div className="bg-pm-surface border border-pm-border rounded-3xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-pm-surface-2 border-b border-pm-border text-[10px] font-mono uppercase tracking-wider text-pm-muted">
                    <tr>
                      <th className="px-6 py-4">User &amp; Email</th>
                      <th className="px-6 py-4">First Joined</th>
                      <th className="px-6 py-4">Did They Return? / Last Seen</th>
                      <th className="px-6 py-4">Projects Created</th>
                      <th className="px-6 py-4">Pins &amp; Sessions</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-pm-border font-sans">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-10 text-center text-pm-muted">
                          No users found matching this filter or search query.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map(u => {
                        const projectsCount = u.projects_count || 0
                        const markersCount = u.total_markers_count || 0
                        const sessionsCount = u.total_sessions_count || 0

                        return (
                          <tr key={u.user_id} className="hover:bg-pm-surface-2/50 transition-colors">
                            
                            {/* User & Email */}
                            <td className="px-6 py-4">
                              <div className="font-bold text-pm-text">{u.name || 'Unnamed Developer'}</div>
                              <div className="text-[11px] text-pm-muted font-mono select-all">{u.email}</div>
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

                            {/* Signup Date */}
                            <td className="px-6 py-4 font-mono text-xs">
                              <div className="text-pm-text font-bold">
                                {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}
                              </div>
                              <div className="text-[11px] text-pm-muted">
                                {formatRelativeTime(u.created_at)}
                              </div>
                            </td>

                            {/* Did they return? / Last Seen */}
                            <td className="px-6 py-4 space-y-1">
                              <div>{renderActivityBadge(u)}</div>
                              <div className="text-[11px] font-mono text-pm-muted">
                                {u.last_login_at ? (
                                  <span>Last seen: <strong className="text-pm-text">{formatRelativeTime(u.last_login_at)}</strong></span>
                                ) : (
                                  <span className="text-pm-muted italic">Never logged back in</span>
                                )}
                              </div>
                            </td>

                            {/* Projects Created */}
                            <td className="px-6 py-4">
                              {projectsCount > 0 ? (
                                <button
                                  onClick={() => setViewProjectsUser(u)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-mono text-xs font-bold border border-blue-500/25 transition-all cursor-pointer"
                                >
                                  <FolderKanban className="w-3.5 h-3.5" />
                                  <span>{projectsCount} {projectsCount === 1 ? 'Project' : 'Projects'}</span>
                                </button>
                              ) : (
                                <span className="text-pm-muted font-mono text-xs">0 projects</span>
                              )}
                            </td>

                            {/* Pins & Sessions */}
                            <td className="px-6 py-4 font-mono text-xs">
                              <div><strong className="text-pm-text">{markersCount}</strong> pins placed</div>
                              <div className="text-[11px] text-pm-muted">{sessionsCount} review sessions</div>
                            </td>

                            {/* Actions */}
                            <td className="px-6 py-4 text-right space-x-2">
                              {projectsCount > 0 && (
                                <button
                                  onClick={() => setViewProjectsUser(u)}
                                  className="px-3 py-1.5 rounded-lg bg-pm-surface-2 hover:bg-pm-surface-3 border border-pm-border text-pm-text text-[11px] font-bold transition-all cursor-pointer inline-flex items-center gap-1"
                                >
                                  <Eye className="w-3 h-3 text-[#2B4CFF]" />
                                  <span>Inspect Projects</span>
                                </button>
                              )}
                              <button
                                onClick={() => handleOpenOverride(u)}
                                className="px-3 py-1.5 rounded-lg bg-pm-surface-2 hover:bg-pm-surface-3 border border-pm-border text-pm-text text-[11px] font-bold transition-all cursor-pointer"
                              >
                                Plan
                              </button>
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

        {/* TAB 1: ACCOUNTS & PLANS OVERRIDE LIST */}
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
                      <th className="px-6 py-4">Current Plan &amp; Source</th>
                      <th className="px-6 py-4">Limits &amp; Usage</th>
                      <th className="px-6 py-4">Status &amp; Precedence</th>
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
                              <div className="text-[11px] text-pm-muted font-mono select-all">{u.email}</div>
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
                    When checked, billing webhooks will be strictly blocked from overwriting this decision.
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

      {/* VIEW PROJECTS DETAILS MODAL */}
      <AnimatePresence>
        {viewProjectsUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl bg-pm-surface border border-pm-border rounded-3xl p-6 sm:p-7 shadow-2xl relative text-pm-text font-sans max-h-[85vh] flex flex-col"
            >
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-pm-border">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <FolderKanban className="w-5 h-5 text-[#2B4CFF]" />
                    <h3 className="text-lg font-black text-pm-text">
                      Projects Launched by User
                    </h3>
                  </div>
                  <p className="text-xs text-pm-muted font-mono">
                    {viewProjectsUser.email} {viewProjectsUser.name ? `(${viewProjectsUser.name})` : ''}
                  </p>
                </div>

                <button
                  onClick={() => setViewProjectsUser(null)}
                  className="p-2 rounded-xl bg-pm-surface-2 hover:bg-pm-surface-3 text-pm-muted hover:text-pm-text border border-pm-border transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto py-4 space-y-3 pr-1">
                {!viewProjectsUser.projects || viewProjectsUser.projects.length === 0 ? (
                  <div className="text-center py-10 space-y-2">
                    <p className="text-sm font-bold text-pm-text">No projects launched yet</p>
                    <p className="text-xs text-pm-muted">This user has registered but has not created any projects.</p>
                  </div>
                ) : (
                  viewProjectsUser.projects.map((proj: any) => (
                    <div
                      key={proj.id}
                      className="p-4 rounded-2xl bg-pm-surface-2 border border-pm-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-pm-border-hover transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-pm-text">{proj.name}</h4>
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full uppercase font-bold border ${
                            proj.status === 'active'
                              ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                              : 'bg-slate-500/10 text-pm-muted border-slate-500/20'
                          }`}>
                            {proj.status || 'active'}
                          </span>
                        </div>

                        {proj.url && (
                          <div className="flex items-center gap-1.5 text-xs text-pm-muted font-mono">
                            <span className="truncate max-w-xs">{proj.url}</span>
                            <a
                              href={proj.url.startsWith('http') ? proj.url : `https://${proj.url}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-500 hover:text-blue-400 p-0.5 inline-flex"
                              title="Visit live site"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        )}

                        <div className="text-[10px] font-mono text-pm-muted flex items-center gap-2 pt-1">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>Created: {proj.created_at ? new Date(proj.created_at).toLocaleDateString() : 'N/A'}</span>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                        <Link
                          href={`/canvas/${proj.id}`}
                          target="_blank"
                          className="px-3 py-1.5 rounded-xl bg-[#2B4CFF] hover:bg-[#1E3BD0] text-white text-xs font-mono font-bold flex items-center gap-1 transition-all shadow-sm"
                        >
                          <span>Open Canvas</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="pt-4 border-t border-pm-border flex justify-between items-center text-xs">
                <span className="text-pm-muted font-mono">
                  Total: {viewProjectsUser.projects?.length || 0} projects
                </span>
                <button
                  onClick={() => setViewProjectsUser(null)}
                  className="px-4 py-2 rounded-xl bg-pm-surface-2 hover:bg-pm-surface-3 border border-pm-border text-pm-text font-bold cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </SettingsShell>
  )
}
