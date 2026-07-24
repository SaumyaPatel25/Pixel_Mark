'use client'

import React, { useEffect } from 'react'
import { CheckCircle2, AlertTriangle, ShieldAlert, Activity, RefreshCw } from 'lucide-react'
import { useNotificationStore } from '@/store/useNotificationStore'

interface NotificationHealthWidgetProps {
  onOpenMonitor: () => void
}

export function NotificationHealthWidget({ onOpenMonitor }: NotificationHealthWidgetProps) {
  const { deliverySummary, fetchDeliverySummary } = useNotificationStore()

  useEffect(() => {
    fetchDeliverySummary()
  }, [fetchDeliverySummary])

  if (!deliverySummary) return null

  const { health_status, sent, failed, retrying, dead_letter, total_attempts } = deliverySummary

  return (
    <div
      onClick={onOpenMonitor}
      className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all cursor-pointer shadow-sm ${
        health_status === 'healthy'
          ? 'bg-emerald-950/20 border-emerald-500/30 hover:border-emerald-500/50'
          : health_status === 'warnings'
          ? 'bg-amber-950/20 border-amber-500/30 hover:border-amber-500/50'
          : 'bg-rose-950/20 border-rose-500/30 hover:border-rose-500/50'
      }`}
    >
      <div className="flex items-center gap-2.5">
        {health_status === 'healthy' ? (
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
        ) : health_status === 'warnings' ? (
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
        ) : (
          <ShieldAlert className="w-4 h-4 text-rose-400 flex-shrink-0" />
        )}

        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white capitalize">
              Delivery Health: {health_status.replace('_', ' ')}
            </span>
            <span className="text-[10px] font-mono text-slate-400 font-bold">
              ({sent}/{total_attempts} sent)
            </span>
          </div>
          {(dead_letter > 0 || failed > 0) && (
            <p className="text-[10px] text-rose-400 mt-0.5">
              {dead_letter} dead letter • {failed} failed • {retrying} retrying
            </p>
          )}
        </div>
      </div>

      <span className="text-[11px] font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
        <span>Inspect</span>
        <Activity className="w-3.5 h-3.5" />
      </span>
    </div>
  )
}
