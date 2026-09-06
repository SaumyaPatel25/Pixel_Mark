'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { Bell, Mail, Clock, CheckCircle2, AlertCircle, Loader2, Check, Sparkles, Filter } from 'lucide-react'

export type EmailFrequency = 'immediate' | 'digest_15m' | 'daily' | 'off'

export interface NotificationPreferencesData {
  id?: string
  user_id?: string
  project_id?: string | null
  project_name?: string | null
  in_app_enabled: boolean
  email_enabled: boolean
  email_frequency: EmailFrequency
  notify_on_all_pins: boolean
  notify_on_assigned: boolean
  notify_on_mentions: boolean
  notify_on_status_change: boolean
  updated_at?: string | null
}

export interface NotificationPreferencesProps {
  projectId?: string | null
  projectName?: string | null
  onSaved?: (prefs: NotificationPreferencesData) => void
}

const DEFAULT_PREFERENCES: NotificationPreferencesData = {
  in_app_enabled: true,
  email_enabled: true,
  email_frequency: 'digest_15m',
  notify_on_all_pins: false,
  notify_on_assigned: true,
  notify_on_mentions: true,
  notify_on_status_change: true,
}

const FREQUENCY_OPTIONS: { id: EmailFrequency; label: string; description: string }[] = [
  { id: 'immediate', label: 'Immediate', description: 'Real-time alert per marker' },
  { id: 'digest_15m', label: '15-Min Batch', description: 'Debounced review digest' },
  { id: 'daily', label: 'Daily Digest', description: 'Daily summary digest' },
  { id: 'off', label: 'Off', description: 'No emails will be sent' },
]

export default function NotificationPreferences({
  projectId = null,
  projectName = null,
  onSaved,
}: NotificationPreferencesProps) {
  const [preferences, setPreferences] = useState<NotificationPreferencesData>(DEFAULT_PREFERENCES)
  const [initialPreferences, setInitialPreferences] = useState<NotificationPreferencesData>(DEFAULT_PREFERENCES)
  const [isInheritedFromGlobal, setIsInheritedFromGlobal] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Fetch preferences from API
  const loadPreferences = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage(null)
    try {
      const url = projectId
        ? `/api/proxy/notification-preferences?project_id=${encodeURIComponent(projectId)}`
        : '/api/proxy/notification-preferences'

      const res = await fetch(url, { credentials: 'include' })
      if (!res.ok) {
        throw new Error(`Failed to fetch preferences (status ${res.status})`)
      }

      const data: {
        global_preferences: NotificationPreferencesData
        project_overrides: NotificationPreferencesData[]
        effective?: NotificationPreferencesData | null
      } = await res.json()

      let activePrefs: NotificationPreferencesData

      if (projectId) {
        // If effective is provided, use it
        if (data.effective) {
          activePrefs = data.effective
          // Check if this project has an explicit override
          const hasOverride = data.project_overrides.some((o) => o.project_id === projectId)
          setIsInheritedFromGlobal(!hasOverride)
        } else {
          const match = data.project_overrides.find((o) => o.project_id === projectId)
          if (match) {
            activePrefs = match
            setIsInheritedFromGlobal(false)
          } else {
            activePrefs = { ...data.global_preferences, project_id: projectId }
            setIsInheritedFromGlobal(true)
          }
        }
      } else {
        activePrefs = data.global_preferences
        setIsInheritedFromGlobal(false)
      }

      setPreferences(activePrefs)
      setInitialPreferences(activePrefs)
    } catch (err) {
      console.warn('[STAGE Preferences] Using default preferences fallback:', err)
      setPreferences(DEFAULT_PREFERENCES)
      setInitialPreferences(DEFAULT_PREFERENCES)
    } finally {
      setIsLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    loadPreferences()
  }, [loadPreferences])

  // Toggle handlers
  const handleToggle = (key: keyof NotificationPreferencesData) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
    setSaveStatus('idle')
  }

  const handleFrequencyChange = (frequency: EmailFrequency) => {
    setPreferences((prev) => ({
      ...prev,
      email_frequency: frequency,
    }))
    setSaveStatus('idle')
  }

  // Save changes to API
  const handleSave = async () => {
    setIsSaving(true)
    setSaveStatus('idle')
    setErrorMessage(null)

    try {
      const payload = {
        project_id: projectId || null,
        in_app_enabled: preferences.in_app_enabled,
        email_enabled: preferences.email_enabled,
        email_frequency: preferences.email_frequency,
        notify_on_all_pins: preferences.notify_on_all_pins,
        notify_on_assigned: preferences.notify_on_assigned,
        notify_on_mentions: preferences.notify_on_mentions,
        notify_on_status_change: preferences.notify_on_status_change,
      }

      const res = await fetch('/api/proxy/notification-preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.detail || `Failed to save preferences (HTTP ${res.status})`)
      }

      const updated: NotificationPreferencesData = await res.json()
      setPreferences(updated)
      setInitialPreferences(updated)
      setIsInheritedFromGlobal(false)
      setSaveStatus('success')

      if (onSaved) {
        onSaved(updated)
      }

      setTimeout(() => {
        setSaveStatus('idle')
      }, 3000)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred while saving.'
      setErrorMessage(msg)
      setSaveStatus('error')
    } finally {
      setIsSaving(false)
    }
  }

  const isDirty = JSON.stringify(preferences) !== JSON.stringify(initialPreferences)

  if (isLoading) {
    return (
      <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-center gap-3 text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
        <span className="text-sm font-medium">Loading notification preferences...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Context Indicator */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              {projectId ? (
                <>
                  <span>Project Alert Rules</span>
                  {projectName && (
                    <span className="text-xs px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-slate-300 font-mono">
                      {projectName}
                    </span>
                  )}
                </>
              ) : (
                <span>Global Notification Matrix</span>
              )}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {projectId
                ? isInheritedFromGlobal
                  ? 'Currently inheriting your global default preferences. Modifying below will create a project override.'
                  : 'Custom project-level notification override is active.'
                : 'Default rules applied to all STAGE projects without custom overrides.'}
            </p>
          </div>
        </div>

        {projectId && isInheritedFromGlobal && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-medium self-start sm:self-auto">
            <Filter className="w-3.5 h-3.5" />
            <span>Inheriting Global Rules</span>
          </div>
        )}
      </div>

      {/* Section 1: Global Channel Toggles */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span>Delivery Channels</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* In-App Toggle */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-cyan-400" />
                <span className="text-sm font-bold text-white">In-App Alerts</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Real-time WebSocket badges and activity cards in the STAGE live drawer.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
              <input
                type="checkbox"
                checked={preferences.in_app_enabled}
                onChange={() => handleToggle('in_app_enabled')}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
            </label>
          </div>

          {/* Email Master Toggle */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-purple-400" />
                <span className="text-sm font-bold text-white">Email Notifications</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Aggregated activity digests and urgent thread updates sent to your inbox.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
              <input
                type="checkbox"
                checked={preferences.email_enabled}
                onChange={() => handleToggle('email_enabled')}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Section 2: Email Frequency Segmented Radio Group */}
      <div
        className={`p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4 transition-opacity duration-200 ${
          preferences.email_enabled ? 'opacity-100' : 'opacity-40 pointer-events-none'
        }`}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Clock className="w-4 h-4 text-sky-400" />
            <span>Email Frequency & Debounce</span>
          </h3>
          <span className="text-[11px] text-slate-500 font-mono">
            {preferences.email_frequency === 'off' ? 'Delivery suspended' : 'Automated dispatch'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {FREQUENCY_OPTIONS.map((opt) => {
            const isSelected = preferences.email_frequency === opt.id
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleFrequencyChange(opt.id)}
                className={`p-3.5 rounded-xl text-left border transition-all duration-150 relative ${
                  isSelected
                    ? 'bg-cyan-500/10 border-cyan-500/50 text-white shadow-sm'
                    : 'bg-slate-950/60 border-slate-800/80 text-slate-300 hover:border-slate-700 hover:bg-slate-900/50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold">{opt.label}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">{opt.description}</p>
              </button>
            )
          })}
        </div>
      </div>

      {/* Section 3: Event Notification Checkboxes */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
          <Bell className="w-4 h-4 text-emerald-400" />
          <span>Event Notification Triggers</span>
        </h3>

        <div className="space-y-3">
          {/* Notify on all pins */}
          <label className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-start gap-3 cursor-pointer hover:border-slate-700 transition-colors">
            <input
              type="checkbox"
              checked={preferences.notify_on_all_pins}
              onChange={() => handleToggle('notify_on_all_pins')}
              className="mt-0.5 rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-slate-950"
            />
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-white">When a new pin is placed</span>
              <p className="text-[11px] text-slate-400">Receive alerts whenever any collaborator drops feedback anywhere on the page.</p>
            </div>
          </label>

          {/* Assigned to me */}
          <label className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-start gap-3 cursor-pointer hover:border-slate-700 transition-colors">
            <input
              type="checkbox"
              checked={preferences.notify_on_assigned}
              onChange={() => handleToggle('notify_on_assigned')}
              className="mt-0.5 rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-slate-950"
            />
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-white">When a pin is assigned to me</span>
              <p className="text-[11px] text-slate-400">Directly notify me when a task or feedback issue is delegated to my account.</p>
            </div>
          </label>

          {/* Mentions & replies */}
          <label className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-start gap-3 cursor-pointer hover:border-slate-700 transition-colors">
            <input
              type="checkbox"
              checked={preferences.notify_on_mentions}
              onChange={() => handleToggle('notify_on_mentions')}
              className="mt-0.5 rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-slate-950"
            />
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-white">When someone mentions me or replies to my thread</span>
              <p className="text-[11px] text-slate-400">Alerts when @mentioned in comments or when a reviewer responds to my feedback.</p>
            </div>
          </label>

          {/* Status change */}
          <label className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-start gap-3 cursor-pointer hover:border-slate-700 transition-colors">
            <input
              type="checkbox"
              checked={preferences.notify_on_status_change}
              onChange={() => handleToggle('notify_on_status_change')}
              className="mt-0.5 rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-slate-950"
            />
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-white">When a pin status changes</span>
              <p className="text-[11px] text-slate-400">Notify when markers transition between Open, In Progress, and Resolved.</p>
            </div>
          </label>
        </div>
      </div>

      {/* Save / Feedback Action Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          {saveStatus === 'success' && (
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Preferences saved successfully!</span>
            </div>
          )}
          {saveStatus === 'error' && (
            <div className="flex items-center gap-2 text-rose-400 text-xs font-bold">
              <AlertCircle className="w-4 h-4" />
              <span>{errorMessage || 'Failed to save preferences. Please try again.'}</span>
            </div>
          )}
          {saveStatus === 'idle' && (
            <p className="text-xs text-slate-500">
              {isDirty ? 'Unsaved changes pending' : 'All preferences are up to date'}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving || !isDirty}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            isDirty
              ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/20 cursor-pointer active:scale-95'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
          }`}
        >
          {isSaving ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Saving Preferences...</span>
            </>
          ) : (
            <span>Save Preferences</span>
          )}
        </button>
      </div>
    </div>
  )
}
