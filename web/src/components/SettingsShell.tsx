'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { User, Cpu, Key, ArrowLeft } from 'lucide-react'

interface SettingsShellProps {
  children: React.ReactNode
  title?: string
  description?: string
}

export default function SettingsShell({
  children,
  title = "Settings",
  description = "Manage your PixelMark workspace, authentication, and integrations."
}: SettingsShellProps) {
  const pathname = usePathname()

  const tabs = [
    {
      name: 'Account & Identity',
      href: '/settings/profile',
      icon: User,
      desc: 'Manage your profile and display name'
    },
    {
      name: 'AI Providers',
      href: '/settings/ai',
      icon: Cpu,
      desc: 'Configure custom LLM models'
    },
    {
      name: 'Developer API Keys',
      href: '/settings',
      icon: Key,
      desc: 'Create and rotate access tokens'
    }
  ]

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white font-sans selection:bg-purple-500/30 relative">
      {/* Background Dots */}
      <div 
        className="absolute inset-0 z-0 pointer-events-none opacity-[0.15]"
        style={{
          backgroundImage: 'radial-gradient(circle, #7c3aed 1px, transparent 1px)',
          backgroundSize: '24px 24px'
        }}
      />

      <div className="max-w-6xl mx-auto px-6 py-12 space-y-8 relative z-10">
        {/* Top bar back link */}
        <div className="flex items-center justify-between border-b border-white/[0.03] pb-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-black tracking-tight text-white leading-tight">
              {title}
            </h1>
            <p className="text-white/45 text-xs font-semibold uppercase tracking-wider">{description}</p>
          </div>
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] text-white/60 hover:text-white text-xs font-bold transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
        </div>

        {/* Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Navigation Sidebar */}
          <aside className="lg:col-span-1 flex flex-col gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = pathname === tab.href
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`flex items-start gap-3 p-3.5 rounded-2xl border transition-all text-left ${
                    isActive
                      ? 'bg-purple-500/10 border-purple-500/20 text-purple-400 font-bold'
                      : 'bg-[#0c0c0e]/40 border-white/5 text-white/50 hover:text-white hover:bg-white/[0.02]'
                  }`}
                >
                  <Icon className={`w-5 h-5 mt-0.5 ${isActive ? 'text-purple-400' : 'text-white/35'}`} />
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold">{tab.name}</p>
                    <p className="text-[10px] text-white/30 font-medium leading-normal">{tab.desc}</p>
                  </div>
                </Link>
              )
            })}
          </aside>

          {/* Content Pane */}
          <div className="lg:col-span-3">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
