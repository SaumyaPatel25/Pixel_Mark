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
    <div className="min-h-screen bg-[#F8F7F4] text-[#1E2022] font-sans selection:bg-[#253B80]/10 relative overflow-x-hidden">
      {/* Background Dots */}
      <div 
        className="absolute inset-0 z-0 pointer-events-none opacity-25"
        style={{
          backgroundImage: 'radial-gradient(circle, #253B80 1px, transparent 1px)',
          backgroundSize: '32px 32px'
        }}
      />

      <div className="max-w-6xl mx-auto px-6 py-12 space-y-8 relative z-10">
        {/* Top bar back link */}
        <div className="flex items-center justify-between border-b border-[#253B80]/8 pb-6">
          <div className="space-y-1.5">
            <h1 className="text-3xl font-extrabold tracking-tight text-[#1E2022] leading-tight">
              {title}
            </h1>
            <p className="text-[#1E2022]/60 text-xs font-bold uppercase tracking-wider">{description}</p>
          </div>
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-[#253B80]/12 hover:bg-[#F8F7F4] text-[#1E2022]/70 hover:text-[#1E2022] text-xs font-bold transition-all active:scale-95 shadow-sm"
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
                  className={`flex items-start gap-3 p-4 rounded-2xl border transition-all text-left group shadow-sm ${
                    isActive
                      ? 'bg-white border-[#253B80]/15 ring-1 ring-[#253B80]/5'
                      : 'bg-white/50 border-[#253B80]/8 hover:bg-white hover:border-[#253B80]/15'
                  }`}
                >
                  <div className={`p-2 rounded-xl border ${isActive ? 'bg-[#253B80]/[0.06] border-[#253B80]/10' : 'bg-white border-[#253B80]/5 group-hover:bg-[#253B80]/[0.02]'}`}>
                    <Icon className={`w-4 h-4 ${isActive ? 'text-[#253B80]' : 'text-[#1E2022]/40 group-hover:text-[#253B80]/70'}`} />
                  </div>
                  <div className="space-y-0.5 mt-0.5">
                    <p className={`text-xs font-extrabold ${isActive ? 'text-[#253B80]' : 'text-[#1E2022]/70 group-hover:text-[#1E2022]'}`}>{tab.name}</p>
                    <p className="text-[10px] text-[#1E2022]/50 font-semibold leading-normal">{tab.desc}</p>
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
