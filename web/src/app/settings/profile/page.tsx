'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase'
import SettingsShell from '@/components/SettingsShell'
import { Cpu } from 'lucide-react'
import Link from 'next/link'

const PLAN_COLORS: Record<string, string> = { 
  free: 'text-pm-muted', 
  pro: 'text-pm-accent', 
  team: 'text-blue-500' 
}

const PLAN_BADGES: Record<string, string> = { 
  free: 'FREE', 
  pro: '⚡ PRO', 
  team: '👥 TEAM' 
}

export default function ProfileSettingsPage() {
  const { user, logout } = useAuthStore()
  const [profile, setProfile] = useState<any>(null)
  const [name, setName] = useState('')
  const [emailNotifs, setEmailNotifs] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    
    const loadProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
          
        if (data) {
          setProfile(data)
          setName(data.full_name || '')
          setEmailNotifs(data.email_notifs ?? true)
        }
      } catch (err) {
        console.error("Profile load error:", err)
      } finally {
        setLoading(false)
      }
    }
    
    loadProfile()
  }, [user])

  const save = async () => {
    if (!user) return
    setSaving(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: name, email_notifs: emailNotifs })
        .eq('id', user.id)
      
      if (!error) {
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      }
    } catch (err) {
      console.error("Save error:", err)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-pm-bg flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-pm-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <SettingsShell title="Account Settings" description="Manage your STAGE identity and service tier.">
      <div className="space-y-6">
        {/* Profile Section */}
        <section className="bg-pm-surface border border-pm-border rounded-3xl p-8 shadow-sm">
          <h2 className="text-xs font-extrabold text-pm-text/40 uppercase tracking-[0.2em] mb-6 font-sans">Identity</h2>
          <div className="space-y-5">
            <div className="flex items-center gap-4 mb-2">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pm-accent to-pm-accent-bright flex items-center justify-center text-2xl font-bold text-white shadow-md">
                {name ? name[0].toUpperCase() : user?.email?.[0].toUpperCase()}
              </div>
              <div>
                  <p className="text-pm-text font-bold text-lg">{name || 'Your Name'}</p>
                  <p className="text-pm-muted text-sm font-medium">{user?.email}</p>
              </div>
            </div>

            <div className="grid gap-2">
              <label className="text-[11px] font-bold text-pm-muted ml-1 font-sans">Display Name</label>
              <input 
                value={name} 
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Satoshi Nakamoto"
                className="w-full bg-pm-bg border border-pm-border hover:border-pm-border-bright rounded-xl px-4 py-3 text-sm text-pm-text focus:outline-none focus:border-pm-accent focus:ring-1 focus:ring-pm-accent/20 shadow-inner transition-all placeholder:text-pm-muted font-sans" 
              />
            </div>

            <div className="grid gap-2 opacity-60">
              <label className="text-[11px] font-bold text-pm-muted ml-1 font-sans">Email Address (Managed by Auth)</label>
              <input 
                value={user?.email ?? ''} 
                disabled 
                className="w-full bg-pm-bg border border-pm-border rounded-xl px-4 py-3 text-sm text-pm-text cursor-not-allowed font-sans" 
              />
            </div>
          </div>
        </section>

        {/* Plan Section */}
        <section className="bg-pm-surface border border-pm-border rounded-3xl p-8 shadow-sm relative overflow-hidden">
           {/* Sparkle background item */}
           <div className="absolute top-0 right-0 w-32 h-32 bg-pm-accent-subtle blur-3xl rounded-full" />

          <div className="flex items-center justify-between mb-6 relative z-10">
            <h2 className="text-xs font-extrabold text-pm-text/40 uppercase tracking-[0.2em] font-sans">Service Tier</h2>
            <span className={`text-[10px] font-mono font-black px-2 py-1 rounded-md border border-current/20 bg-current/5 ${PLAN_COLORS[profile?.plan ?? 'free']}`}>
              {PLAN_BADGES[profile?.plan ?? 'free']}
            </span>
          </div>

          {profile?.plan === 'free' ? (
            <div className="bg-gradient-to-br from-pm-accent-subtle to-transparent border border-pm-border rounded-2xl p-6 relative z-10">
              <p className="text-sm text-pm-text/75 leading-relaxed mb-5">
                Your <strong className="text-pm-text">Free</strong> plan is restricted to 3 projects. Unlock industrial features including AI triage, GitHub integration, and session replay by upgrading.
              </p>
              <button className="bg-pm-accent hover:bg-pm-accent-bright text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-md shadow-black/10 transition-all active:scale-[0.98] cursor-pointer">
                Upgrade to Pro →
              </button>
            </div>
          ) : (
              <div className="bg-gradient-to-br from-pm-accent-subtle to-transparent border border-pm-border rounded-2xl p-6 relative z-10">
                  <p className="text-sm text-pm-text/75 leading-relaxed">
                      Your enterprise tier is active. All limits are removed and full-speed AI triage is enabled.
                  </p>
              </div>
          )}
        </section>

        {/* Notifications Section */}
        <section className="bg-pm-surface border border-pm-border rounded-3xl p-8 shadow-sm">
          <h2 className="text-xs font-extrabold text-pm-text/40 uppercase tracking-[0.2em] mb-6 font-sans">Notifications</h2>
          <div className="flex items-center justify-between p-1">
            <div className="space-y-1">
              <p className="text-sm text-pm-text font-bold">Email Alerts</p>
              <p className="text-[11px] font-medium text-pm-muted">Get notified immediately when a new comment is posted.</p>
            </div>
            <button 
              onClick={() => setEmailNotifs(!emailNotifs)}
              className={`w-12 h-6 rounded-full transition-all relative border cursor-pointer ${emailNotifs ? 'bg-pm-accent border-pm-accent' : 'bg-pm-bg border-pm-border'}`}>
              <motion.div 
                  layout
                  initial={false}
                  animate={{ x: emailNotifs ? 24 : 4 }}
                  className={`absolute top-[2px] w-4 h-4 rounded-full shadow-sm ${emailNotifs ? 'bg-white' : 'bg-pm-muted'}`} 
              />
            </button>
          </div>
        </section>

        {/* Actions */}
        <div className="flex flex-col gap-3 pt-4">
          <button 
            onClick={save} 
            disabled={saving}
            className="w-full bg-pm-accent hover:bg-pm-accent-bright disabled:opacity-50 text-white py-4 rounded-2xl text-sm font-bold shadow-md shadow-black/10 transition-all active:scale-[0.99] cursor-pointer">
            {saving ? 'Saving...' : saved ? '✓ Profile Updated' : 'Save Changes'}
          </button>
          
          <button 
            onClick={() => logout()}
            className="w-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 py-4 rounded-2xl text-xs font-bold tracking-widest uppercase transition-all cursor-pointer">
            Sign Out Securely
          </button>
        </div>
      </div>
    </SettingsShell>
  )
}
