'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase'
import SettingsShell from '@/components/SettingsShell'
import { Cpu } from 'lucide-react'
import Link from 'next/link'

const PLAN_COLORS: Record<string, string> = { 
  free: 'text-[#1E2022]/40', 
  pro: 'text-[#253B80]', 
  team: 'text-blue-600' 
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
      <div className="min-h-screen bg-[#F8F7F4] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#253B80] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <SettingsShell title="Account Settings" description="Manage your PixelMark identity and service tier.">
      <div className="space-y-6">
        {/* Profile Section */}
        <section className="bg-white border border-[#253B80]/8 rounded-3xl p-8 shadow-sm">
          <h2 className="text-xs font-extrabold text-[#1E2022]/40 uppercase tracking-[0.2em] mb-6">Identity</h2>
          <div className="space-y-5">
            <div className="flex items-center gap-4 mb-2">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#253B80] to-blue-600 flex items-center justify-center text-2xl font-bold text-white shadow-md shadow-[#253B80]/20">
                {name ? name[0].toUpperCase() : user?.email?.[0].toUpperCase()}
              </div>
              <div>
                  <p className="text-[#1E2022] font-bold text-lg">{name || 'Your Name'}</p>
                  <p className="text-[#1E2022]/60 text-sm font-medium">{user?.email}</p>
              </div>
            </div>

            <div className="grid gap-2">
              <label className="text-[11px] font-bold text-[#1E2022]/60 ml-1">Display Name</label>
              <input 
                value={name} 
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Satoshi Nakamoto"
                className="w-full bg-[#F8F7F4] border border-[#253B80]/8 hover:border-[#253B80]/15 rounded-xl px-4 py-3 text-sm text-[#1E2022] focus:outline-none focus:border-[#253B80] focus:ring-1 focus:ring-[#253B80]/20 shadow-inner transition-all placeholder:text-[#1E2022]/30" 
              />
            </div>

            <div className="grid gap-2 opacity-60">
              <label className="text-[11px] font-bold text-[#1E2022]/60 ml-1">Email Address (Managed by Auth)</label>
              <input 
                value={user?.email ?? ''} 
                disabled 
                className="w-full bg-[#F8F7F4] border border-[#253B80]/8 rounded-xl px-4 py-3 text-sm text-[#1E2022] cursor-not-allowed" 
              />
            </div>
          </div>
        </section>

        {/* Plan Section */}
        <section className="bg-white border border-[#253B80]/8 rounded-3xl p-8 shadow-sm relative overflow-hidden">
           {/* Sparkle background item */}
           <div className="absolute top-0 right-0 w-32 h-32 bg-[#253B80]/5 blur-3xl rounded-full" />

          <div className="flex items-center justify-between mb-6 relative z-10">
            <h2 className="text-xs font-extrabold text-[#1E2022]/40 uppercase tracking-[0.2em]">Service Tier</h2>
            <span className={`text-[10px] font-mono font-black px-2 py-1 rounded-md border border-current/20 bg-current/5 ${PLAN_COLORS[profile?.plan ?? 'free']}`}>
              {PLAN_BADGES[profile?.plan ?? 'free']}
            </span>
          </div>

          {profile?.plan === 'free' ? (
            <div className="bg-gradient-to-br from-[#253B80]/5 to-transparent border border-[#253B80]/15 rounded-2xl p-6 relative z-10">
              <p className="text-sm text-[#1E2022]/70 leading-relaxed mb-5">
                Your <strong className="text-[#1E2022]">Free</strong> plan is restricted to 3 projects. Unlock industrial features including AI triage, GitHub integration, and session replay by upgrading.
              </p>
              <button className="bg-[#253B80] hover:bg-[#1E2E66] text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-md shadow-[#253B80]/20 transition-all active:scale-[0.98]">
                Upgrade to Pro →
              </button>
            </div>
          ) : (
              <div className="bg-gradient-to-br from-blue-50 to-transparent border border-blue-200 rounded-2xl p-6 relative z-10">
                  <p className="text-sm text-[#1E2022]/70 leading-relaxed">
                      Your enterprise tier is active. All limits are removed and full-speed AI triage is enabled.
                  </p>
              </div>
          )}
        </section>

        {/* Notifications Section */}
        <section className="bg-white border border-[#253B80]/8 rounded-3xl p-8 shadow-sm">
          <h2 className="text-xs font-extrabold text-[#1E2022]/40 uppercase tracking-[0.2em] mb-6">Notifications</h2>
          <div className="flex items-center justify-between p-1">
            <div className="space-y-1">
              <p className="text-sm text-[#1E2022] font-bold">Email Alerts</p>
              <p className="text-[11px] font-medium text-[#1E2022]/50">Get notified immediately when a new comment is posted.</p>
            </div>
            <button 
              onClick={() => setEmailNotifs(!emailNotifs)}
              className={`w-12 h-6 rounded-full transition-all relative border ${emailNotifs ? 'bg-[#253B80] border-[#253B80]' : 'bg-[#F8F7F4] border-[#253B80]/15'}`}>
              <motion.div 
                  layout
                  initial={false}
                  animate={{ x: emailNotifs ? 24 : 4 }}
                  className={`absolute top-[2px] w-4 h-4 rounded-full shadow-sm ${emailNotifs ? 'bg-white' : 'bg-[#1E2022]/20'}`} 
              />
            </button>
          </div>
        </section>

        {/* Actions */}
        <div className="flex flex-col gap-3 pt-4">
          <button 
            onClick={save} 
            disabled={saving}
            className="w-full bg-[#253B80] hover:bg-[#1E2E66] disabled:opacity-50 text-white py-4 rounded-2xl text-sm font-bold shadow-md shadow-[#253B80]/20 transition-all active:scale-[0.99]">
            {saving ? 'Saving...' : saved ? '✓ Profile Updated' : 'Save Changes'}
          </button>
          
          <button 
            onClick={() => logout()}
            className="w-full bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 py-4 rounded-2xl text-xs font-bold tracking-widest uppercase transition-all">
            Sign Out Securely
          </button>
        </div>
      </div>
    </SettingsShell>
  )
}
