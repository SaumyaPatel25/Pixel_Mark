'use client'

import React, { useEffect, useState } from 'react'
import { Activity, X, RefreshCw, AlertTriangle, CheckCircle2, ShieldAlert, RotateCw } from 'lucide-react'
import { useNotificationStore, DeliveryAttemptItem } from '@/store/useNotificationStore'

interface NotificationDeliveryMonitorModalProps {
  onClose: () => void
}

export function NotificationDeliveryMonitorModal({ onClose }: NotificationDeliveryMonitorModalProps) {
  const { deliveries, deliverySummary, fetchDeliveries, retryDelivery, retryAllFailed } = useNotificationStore()
  const [selectedStatus, setSelectedStatus] = useState<string>('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    fetchDeliveries(selectedStatus || undefined)
  }, [selectedStatus, fetchDeliveries])

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-none animate-in fade-in duration-200">
      <div className="bg-[#090d16] border border-slate-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>STAGE Delivery Inspector</span>
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[10px] font-mono font-extrabold uppercase">
                  Bookkeeping & Logs
                </span>
              </h3>
              <p className="text-xs text-slate-400">Delivery Monitoring & Retry Audit Log</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Health Summary Cards */}
        {deliverySummary && (
          <div className="p-3 bg-slate-950 border-b border-slate-800 grid grid-cols-5 gap-2 text-center text-xs">
            <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Total</span>
              <span className="font-bold text-white font-mono">{deliverySummary.total_attempts}</span>
            </div>
            <div className="p-2 rounded-lg bg-emerald-950/20 border border-emerald-500/30">
              <span className="text-[10px] text-emerald-400 uppercase font-bold block">Sent</span>
              <span className="font-bold text-emerald-400 font-mono">{deliverySummary.sent}</span>
            </div>
            <div className="p-2 rounded-lg bg-amber-950/20 border border-amber-500/30">
              <span className="text-[10px] text-amber-400 uppercase font-bold block">Retrying</span>
              <span className="font-bold text-amber-400 font-mono">{deliverySummary.retrying}</span>
            </div>
            <div className="p-2 rounded-lg bg-rose-950/20 border border-rose-500/30">
              <span className="text-[10px] text-rose-400 uppercase font-bold block">Failed</span>
              <span className="font-bold text-rose-400 font-mono">{deliverySummary.failed}</span>
            </div>
            <div className="p-2 rounded-lg bg-rose-950/30 border border-rose-500/40">
              <span className="text-[10px] text-rose-300 uppercase font-bold block">Dead Letter</span>
              <span className="font-bold text-rose-300 font-mono">{deliverySummary.dead_letter}</span>
            </div>
          </div>
        )}

        {/* Filter Bar & Retry All */}
        <div className="p-3 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between gap-2 overflow-x-auto">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">Filter Status:</span>
            {['', 'sent', 'retrying', 'failed', 'dead_letter'].map((st) => (
              <button
                key={st}
                onClick={() => setSelectedStatus(st)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer capitalize ${
                  selectedStatus === st
                    ? 'bg-cyan-500 text-slate-950 shadow-md font-extrabold'
                    : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                {st === '' ? 'All Statuses' : st.replace('_', ' ')}
              </button>
            ))}
          </div>

          <button
            onClick={() => retryAllFailed()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all cursor-pointer shadow-md"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Retry Failed Items</span>
          </button>
        </div>

        {/* Delivery Attempt Rows */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {deliveries.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-500">
              No delivery logs match the selected filter.
            </div>
          ) : (
            deliveries.map((att) => (
              <div
                key={att.id}
                className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2 transition-all hover:border-slate-700"
              >
                <div
                  className="flex items-center justify-between gap-2 cursor-pointer"
                  onClick={() => setExpandedId(expandedId === att.id ? null : att.id)}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                        att.status === 'sent'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : att.status === 'retrying'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {att.status}
                    </span>
                    <span className="text-xs font-bold text-white font-mono">Attempt #{att.attempt_number}</span>
                    <span className="text-[11px] text-slate-400">Channel: {att.channel}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-slate-500">
                      {new Date(att.created_at).toLocaleString()}
                    </span>

                    {(att.status === 'failed' || att.status === 'retrying' || att.status === 'dead_letter') && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          retryDelivery(att.id)
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[11px] font-bold transition-colors cursor-pointer"
                      >
                        Retry Now
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedId === att.id && (
                  <div className="pt-2 border-t border-slate-800 space-y-1.5 text-xs text-slate-300">
                    <p><strong>Provider Msg ID:</strong> <span className="font-mono text-slate-400">{att.provider_message_id || 'N/A'}</span></p>
                    <p><strong>Notification Event ID:</strong> <span className="font-mono text-slate-400">{att.notification_event_id}</span></p>
                    {att.error_message && (
                      <div className="p-2 rounded bg-rose-950/40 border border-rose-500/30 text-rose-300 text-[11px] font-mono">
                        <strong>Error:</strong> [{att.error_code}] {att.error_message}
                      </div>
                    )}
                    {att.next_retry_at && (
                      <p className="text-amber-400 text-[11px]"><strong>Next Scheduled Retry:</strong> {new Date(att.next_retry_at).toLocaleString()}</p>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-slate-800 bg-slate-900/90 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-cyan-500 text-slate-950 text-xs font-bold cursor-pointer shadow-lg shadow-cyan-500/20"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
