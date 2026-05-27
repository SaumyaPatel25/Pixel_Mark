'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase'

const PLAN_COLORS: Record<string, string> = { 
  free: 'text-white/40', 
  pro: 'text-purple-400', 
  team: 'text-blue-400' 
}

const PLAN_BADGES: Record<string, string> = { 
  free: 'FREE', 
  pro: '⚡ PRO', 
  team: '👥 TEAM' 
}

export default function SettingsPage() {
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
      <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white selection:bg-purple-500/30">
      <div className="max-w-2xl mx-auto py-16 px-6">
        <header className="mb-12">
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-white/40 mt-2 text-sm">Manage your Entrext identity and preferences.</p>
        </header>

        <div className="space-y-6">
          {/* Profile Section */}
          <section className="bg-white/[0.03] border border-white/10 rounded-3xl p-8 backdrop-blur-xl">
            <h2 className="text-xs font-bold text-white/30 uppercase tracking-[0.2em] mb-6">Identity</h2>
            <div className="space-y-5">
              <div className="flex items-center gap-4 mb-2">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center text-2xl font-bold shadow-lg shadow-purple-500/10">
                  {name ? name[0].toUpperCase() : user?.email?.[0].toUpperCase()}
                </div>
                <div>
                    <p className="text-white font-medium">{name || 'Your Name'}</p>
                    <p className="text-white/30 text-xs">{user?.email}</p>
                </div>
              </div>

              <div className="grid gap-2">
                <label className="text-[11px] font-semibold text-white/40 ml-1">Display Name</label>
                <input 
                  value={name} 
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Satoshi Nakamoto"
                  className="w-full bg-white/5 border border-white/10 hover:border-white/20 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-purple-500 shadow-inner transition-all placeholder:text-white/10" 
                />
              </div>

              <div className="grid gap-2 opacity-50">
                <label className="text-[11px] font-semibold text-white/40 ml-1">Email Address (Managed by Auth)</label>
                <input 
                  value={user?.email ?? ''} 
                  disabled 
                  className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-sm text-white cursor-not-allowed" 
                />
              </div>
            </div>
          </section>

          {/* Plan Section */}
          <section className="bg-white/[0.03] border border-white/10 rounded-3xl p-8 backdrop-blur-xl relative overflow-hidden">
             {/* Sparkle background item */}
             <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 blur-3xl rounded-full" />

            <div className="flex items-center justify-between mb-6 relative z-10">
              <h2 className="text-xs font-bold text-white/30 uppercase tracking-[0.2em]">Service Tier</h2>
              <span className={`text-[10px] font-mono font-black px-2 py-1 rounded-md border border-current/20 bg-current/5 ${PLAN_COLORS[profile?.plan ?? 'free']}`}>
                {PLAN_BADGES[profile?.plan ?? 'free']}
              </span>
            </div>

            {profile?.plan === 'free' ? (
              <div className="bg-gradient-to-br from-purple-900/20 to-transparent border border-purple-500/20 rounded-2xl p-6 relative z-10">
                <p className="text-sm text-white/70 leading-relaxed mb-5">
                  Your <strong className="text-white">Free</strong> plan is restricted to 3 projects. Unlock industrial features including AI triage, GitHub integration, and session replay by upgrading.
                </p>
                <button className="bg-white text-black hover:bg-white/90 px-6 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-[0.98]">
                  Upgrade to Pro →
                </button>
              </div>
            ) : (
                <div className="bg-gradient-to-br from-blue-900/20 to-transparent border border-blue-500/20 rounded-2xl p-6 relative z-10">
                    <p className="text-sm text-white/70 leading-relaxed">
                        Your enterprise tier is active. All limits are removed and full-speed AI triage is enabled.
                    </p>
                </div>
            )}
          </section>

          {/* Notifications Section */}
          <section className="bg-white/[0.03] border border-white/10 rounded-3xl p-8 backdrop-blur-xl">
            <h2 className="text-xs font-bold text-white/30 uppercase tracking-[0.2em] mb-6">Notifications</h2>
            <div className="flex items-center justify-between p-1">
              <div className="space-y-1">
                <p className="text-sm text-white/80 font-medium">Email Alerts</p>
                <p className="text-[11px] text-white/30">Get notified immediately when a new comment is posted.</p>
              </div>
              <button 
                onClick={() => setEmailNotifs(!emailNotifs)}
                className={`w-12 h-6 rounded-full transition-all relative ${emailNotifs ? 'bg-purple-600' : 'bg-white/10'}`}>
                <motion.div 
                    layout
                    initial={false}
                    animate={{ x: emailNotifs ? 24 : 4 }}
                    className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-lg" 
                />
              </button>
            </div>
          </section>

          {/* Actions */}
          <div className="flex flex-col gap-3 pt-4">
            <button 
              onClick={save} 
              disabled={saving}
              className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white py-4 rounded-2xl text-sm font-bold shadow-xl shadow-purple-500/10 transition-all active:scale-[0.99]">
              {saving ? 'Saving...' : saved ? '✓ Profile Updated' : 'Save Changes'}
            </button>
            
            <button 
              onClick={() => logout()}
              className="w-full bg-red-500/[0.02] hover:bg-red-500/[0.06] text-red-500/60 hover:text-red-500 border border-red-500/10 hover:border-red-500/20 py-4 rounded-2xl text-xs font-bold tracking-widest uppercase transition-all">
              Sign Out Securely
            </button>
          </div>
        </div>

        <footer className="mt-16 pt-8 border-t border-white/5 text-center">
             <p className="text-[10px] text-white/10 uppercase tracking-[0.5em]">Entrext Identity Layer v1.0.4</p>
        </footer>
      </div>
    </div>
  )
}
