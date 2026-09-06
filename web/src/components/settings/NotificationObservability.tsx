'use client'

import React, { useEffect, useState, useCallback } from 'react'
import {
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Mail,
  Webhook,
  Bell,
  ShieldAlert,
  Loader2,
  Filter,
  ArrowRight,
  Database,
} from 'lucide-react'

export interface DeliveryAttemptItem {
  id: string
  outbox_id?: string | null
  channel: string
  target?: string | null
  status: 'failed' | 'dead_letter' | 'success' | string
  error_context: {
    error?: string
    retry_count?: number
    max_retries?: number
    error_type?: string
    status_code?: number
    [key: string]: unknown
  }
  created_at?: string | null
  event_type?: string | null
  outbox_status?: string | null
  retry_count?: number | null
}

export interface NotificationObservabilityProps {
  projectId: string
  userRole?: 'owner' | 'admin' | 'member' | 'guest' | string
}

export default function NotificationObservability({
  projectId,
  userRole = 'owner',
}: NotificationObservabilityProps) {
  const [deliveries, setDeliveries] = useState<DeliveryAttemptItem[]>([])
  const [total, setTotal] = useState<number>(0)
  const [deadLetterCount, setDeadLetterCount] = useState<number>(0)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false)
  const [statusFilter, setStatusFilter] = useState<'all' | 'dead_letter' | 'failed'>('dead_letter')
  const [replayingId, setReplayingId] = useState<string | null>(null)
  const [replayToast, setReplayToast] = useState<{ id: string; message: string; success: boolean } | null>(null)

  const isAuthorized = userRole === 'owner' || userRole === 'admin'

  const fetchDeliveries = useCallback(
    async (showRefreshIndicator = false) => {
      if (!isAuthorized) return

      if (showRefreshIndicator) {
        setIsRefreshing(true)
      } else {
        setIsLoading(true)
      }

      try {
        const filterQuery = statusFilter === 'all' ? '' : `&status=${statusFilter}`
        const res = await fetch(
          `/api/proxy/projects/${encodeURIComponent(projectId)}/notifications/deliveries?limit=50&offset=0${filterQuery}`,
          { credentials: 'include' }
        )

        if (!res.ok) {
          throw new Error(`Failed to load delivery telemetry (HTTP ${res.status})`)
        }

        const data: {
          items: DeliveryAttemptItem[]
          total: number
          dead_letter_count: number
        } = await res.json()

        setDeliveries(data.items || [])
        setTotal(data.total || 0)
        setDeadLetterCount(data.dead_letter_count || 0)
      } catch (err) {
        console.warn('[STAGE Observability] Fetch deliveries error:', err)
      } finally {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    },
    [projectId, isAuthorized, statusFilter]
  )

  useEffect(() => {
    fetchDeliveries()
  }, [fetchDeliveries])

  const handleReplay = async (outboxId: string) => {
    if (!outboxId) return
    setReplayingId(outboxId)
    setReplayToast(null)

    try {
      const res = await fetch(
        `/api/proxy/projects/${encodeURIComponent(projectId)}/notifications/dlq/${encodeURIComponent(outboxId)}/replay`,
        {
          method: 'POST',
          credentials: 'include',
        }
      )

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}))
        throw new Error(errJson.detail || `Replay request failed (HTTP ${res.status})`)
      }

      const replayData: { message: string } = await res.json()

      setReplayToast({
        id: outboxId,
        message: replayData.message || 'Dispatch successfully moved to pending queue.',
        success: true,
      })

      // Refresh list to update status
      await fetchDeliveries(true)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to replay dispatch'
      setReplayToast({
        id: outboxId,
        message: msg,
        success: false,
      })
    } finally {
      setReplayingId(null)
      setTimeout(() => {
        setReplayToast(null)
      }, 4000)
    }
  }

  // Access Restriction Guard
  if (!isAuthorized) {
    return (
      <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 text-center space-y-3">
        <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-bold text-white">Privilege Escalation Protected</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Message queue telemetry and Dead-Letter Queue (DLQ) replay controls are restricted to workspace{' '}
          <strong className="text-slate-300">owners</strong> and <strong className="text-slate-300">admins</strong>.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Top Banner / Telemetry Overview */}
      <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400">
              <Database className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-white">Dead-Letter Queue & Telemetry</h2>
          </div>
          <p className="text-xs text-slate-400">
            Monitor failed delivery attempts across Email, Webhook, and In-App channels. Replay dead letters to retry.
          </p>
        </div>

        {/* Status Pill & Refresh Action */}
        <div className="flex items-center gap-3 self-start md:self-auto">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800">
            <span
              className={`w-2 h-2 rounded-full ${deadLetterCount > 0 ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`}
            />
            <span className="text-xs font-mono font-bold text-slate-300">
              {deadLetterCount} Dead {deadLetterCount === 1 ? 'Letter' : 'Letters'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => fetchDeliveries(true)}
            disabled={isRefreshing || isLoading}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer disabled:opacity-50"
            title="Refresh telemetry"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Global Feedback Toast */}
      {replayToast && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs font-medium animate-in fade-in ${
            replayToast.success
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
          }`}
        >
          <div className="flex items-center gap-2">
            {replayToast.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            <span>{replayToast.message}</span>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <button
          type="button"
          onClick={() => setStatusFilter('dead_letter')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            statusFilter === 'dead_letter'
              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Dead Letters ({deadLetterCount})
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('failed')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            statusFilter === 'failed'
              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Retrying / Transient Failures
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            statusFilter === 'all'
              ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          All Attempts
        </button>
      </div>

      {/* Telemetry Data Table */}
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800 overflow-hidden shadow-xl">
        {isLoading ? (
          <div className="p-12 text-center space-y-3">
            <Loader2 className="w-6 h-6 animate-spin text-cyan-400 mx-auto" />
            <p className="text-xs text-slate-400">Loading delivery attempts...</p>
          </div>
        ) : deliveries.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
            <h4 className="text-xs font-bold text-white">Queue Healthy — No Dead Letters</h4>
            <p className="text-[11px] text-slate-500">
              No failed delivery attempts matching the current filter criteria.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Channel</th>
                  <th className="py-3 px-4">Target</th>
                  <th className="py-3 px-4">Error Context</th>
                  <th className="py-3 px-4">Retries</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {deliveries.map((item) => {
                  const errorMsg =
                    item.error_context?.error ||
                    (typeof item.error_context === 'string'
                      ? item.error_context
                      : 'Delivery dispatch failed')
                  const isDead = item.status === 'dead_letter' || (item.retry_count && item.retry_count >= 3)
                  const isDelivered = item.outbox_status === 'delivered'
                  const outboxId = item.outbox_id

                  return (
                    <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                      {/* Timestamp */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-400 font-mono text-[11px]">
                        {item.created_at ? new Date(item.created_at).toLocaleString() : 'Just now'}
                      </td>

                      {/* Channel Badge */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-mono text-[10px] uppercase font-bold">
                          {item.channel === 'webhook' ? (
                            <Webhook className="w-3 h-3 text-emerald-400" />
                          ) : item.channel === 'email' ? (
                            <Mail className="w-3 h-3 text-purple-400" />
                          ) : (
                            <Bell className="w-3 h-3 text-cyan-400" />
                          )}
                          <span>{item.channel}</span>
                        </span>
                      </td>

                      {/* Target */}
                      <td className="py-3.5 px-4 max-w-xs truncate text-slate-300 font-mono text-[11px]" title={item.target || ''}>
                        {item.target || '(Unknown Target)'}
                      </td>

                      {/* Error Reason */}
                      <td className="py-3.5 px-4 max-w-sm">
                        <div className="space-y-0.5">
                          <p className="text-rose-400 font-mono text-[11px] truncate" title={String(errorMsg)}>
                            {String(errorMsg)}
                          </p>
                          {item.event_type && (
                            <span className="text-[10px] text-slate-500 font-mono">Event: {item.event_type}</span>
                          )}
                        </div>
                      </td>

                      {/* Retry Count / Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            isDead
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {isDead ? 'DLQ' : 'RETRYING'} &middot; {item.retry_count ?? item.error_context?.retry_count ?? 1}x
                        </span>
                      </td>

                      {/* Action / Replay Button */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        {outboxId && !isDelivered ? (
                          <button
                            type="button"
                            onClick={() => handleReplay(outboxId)}
                            disabled={replayingId === outboxId}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-[11px] font-bold transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                          >
                            {replayingId === outboxId ? (
                              <>
                                <Loader2 className="w-3 h-3 animate-spin" />
                                <span>Replaying...</span>
                              </>
                            ) : (
                              <>
                                <RefreshCw className="w-3 h-3" />
                                <span>Replay</span>
                              </>
                            )}
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-500 font-mono">Delivered</span>
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
    </div>
  )
}
