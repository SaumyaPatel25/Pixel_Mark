'use client'

import React, { useEffect, useState } from 'react'
import { Bell, Mail, Video, Layers, Lock, CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react'
import { useNotificationStore } from '@/store/useNotificationStore'
import { usePlan } from '@/hooks/usePlan'
import Link from 'next/link'

export default function NotificationSettingsClient() {
  const { preferences, fetchPreferences, savePreferences, isLoading } = useNotificationStore()
  const { canUseBlueprintDomEdit } = usePlan()
  const [saveSuccess, setSaveSuccess] = useState(false)

  useEffect(() => {
    fetchPreferences()
  }, [fetchPreferences])

  const handleToggle = async (key: string, value: boolean) => {
    await savePreferences({ [key]: value })
    setSaveSuccess(true)
    setTimeout(() => setSaveSuccess(false), 2500)
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 relative overflow-hidden shadow-lg">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Bell className="w-32 h-32 text-cyan-400" />
        </div>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Notification & Alert Preferences</h2>
            <p className="text-xs text-slate-400">Control how and when STAGE delivers project activity alerts.</p>
          </div>
        </div>

        {saveSuccess && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Notification preferences updated successfully.</span>
          </div>
        )}
      </div>

      {/* Main Channels Section */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-5">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
          <Mail className="w-4 h-4 text-purple-400" />
          <span>Delivery Channels</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* In-App Notifications */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-cyan-400" />
                <span className="text-sm font-bold text-white">In-App Notifications</span>
              </div>
              <p className="text-xs text-slate-400">
                Receive unread badges and live activity alerts in the STAGE dashboard header.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer mt-1">
              <input
                type="checkbox"
                checked={preferences?.in_app_enabled ?? true}
                onChange={(e) => handleToggle('in_app_enabled', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
            </label>
          </div>

          {/* Email Notifications */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-purple-400" />
                <span className="text-sm font-bold text-white">Email Notifications</span>
              </div>
              <p className="text-xs text-slate-400">
                Receive direct notification emails for activity on your projects and sessions.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer mt-1">
              <input
                type="checkbox"
                checked={preferences?.email_enabled ?? true}
                onChange={(e) => handleToggle('email_enabled', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Event Sources Section */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-5">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span>Event Source Controls</span>
        </h3>

        <div className="space-y-4">
          {/* Session Events Toggle */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 mt-0.5">
                <Video className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Developer Project Session Activity</h4>
                <p className="text-xs text-slate-400">
                  Pins added/resolved, review sessions started/closed, share links generated, and exports ready.
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preferences?.allow_session_events ?? true}
                onChange={(e) => handleToggle('allow_session_events', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
            </label>
          </div>

          {/* Blueprint Canvas Events Toggle */}
          <div className={`p-4 rounded-xl border flex items-center justify-between gap-4 transition-all ${
            canUseBlueprintDomEdit
              ? 'bg-slate-950/80 border-slate-800'
              : 'bg-slate-950/40 border-amber-500/20 opacity-85'
          }`}>
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg border mt-0.5 ${
                canUseBlueprintDomEdit
                  ? 'bg-purple-500/10 border-purple-500/20 text-purple-400'
                  : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
              }`}>
                {canUseBlueprintDomEdit ? <Layers className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-white">Blueprint Canvas Activity</h4>
                  {!canUseBlueprintDomEdit && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-mono font-bold">
                      DEV TEAM PLAN REQUIRED
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400">
                  DOM edit mutations saved, comments added/resolved, publications created, and approval status changes.
                </p>
                {!canUseBlueprintDomEdit && (
                  <p className="text-xs text-amber-400/90 font-medium pt-1">
                    Your organization is currently on the Free plan.{' '}
                    <Link href="/pricing" className="underline font-bold text-amber-300 hover:text-amber-200">
                      Upgrade to Dev Team
                    </Link>{' '}
                    to unlock Blueprint Canvas features & notifications.
                  </p>
                )}
              </div>
            </div>

            {canUseBlueprintDomEdit ? (
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences?.allow_blueprint_events ?? true}
                  onChange={(e) => handleToggle('allow_blueprint_events', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500"></div>
              </label>
            ) : (
              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-500" title="Blueprint Canvas feature is locked on Free Plan">
                <Lock className="w-4 h-4" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
