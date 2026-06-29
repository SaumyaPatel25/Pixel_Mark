'use client'

import React, { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/store/authStore'
import { LayoutDashboard, Folder, LogOut, BookOpen, HelpCircle, Download } from 'lucide-react'

export default function DashboardLayoutClient({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const user = useAuthStore(s => s.user)
  const token = useAuthStore(s => s.token)
  const logout = useAuthStore(s => s.logout)
  const fetchMe = useAuthStore(s => s.fetchMe)
  const isLoading = useAuthStore(s => s.isLoading)

  useEffect(() => {
    const activeToken = token || (typeof window !== 'undefined' ? localStorage.getItem('pm_token') : null)
    if (!activeToken) {
      router.push('/login')
    } else {
      fetchMe()
    }
  }, [router, fetchMe])

  const handleSignOut = () => {
    logout()
    router.push('/login')
  }

  // If page is loading and no user yet, display simple full viewport loader
  if (isLoading && !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0a0a0f] text-white">
        <span className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mr-3" />
        <span className="text-xs uppercase font-mono tracking-widest text-white/50">Restoring Session...</span>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex overflow-hidden">
      {/* Fixed Left Sidebar */}
      <aside className="w-56 fixed left-0 top-0 bottom-0 bg-[#0d0d14] border-r border-white/5 flex flex-col justify-between p-6 z-30">
        <div className="space-y-8">
          {/* Brand header */}
          <div className="space-y-1">
            <Link href="/dashboard" className="text-lg font-black tracking-tight text-white block">
              Pixel<span className="text-purple-500">Mark</span>
            </Link>
            <span className="text-[9px] font-mono tracking-widest text-white/20 uppercase block leading-none">Visual QA OS</span>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-2">
            <Link 
              href="/dashboard" 
              className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all ${
                pathname === '/dashboard' 
                  ? 'bg-white/5 text-white font-semibold' 
                  : 'text-gray-400 hover:text-white hover:bg-white/[0.02]'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </Link>
            <Link 
              href="/projects" 
              className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all ${
                pathname === '/projects' 
                  ? 'bg-white/5 text-white font-semibold' 
                  : 'text-gray-400 hover:text-white hover:bg-white/[0.02]'
              }`}
            >
              <Folder className="w-4 h-4" />
              Projects
            </Link>
            <Link 
              href="/docs/api" 
              className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all ${
                pathname === '/docs/api' 
                  ? 'bg-white/5 text-white font-semibold' 
                  : 'text-gray-400 hover:text-white hover:bg-white/[0.02]'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              Developer API Docs
            </Link>
            <Link 
              href="/support/diagnostics" 
              className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all ${
                pathname === '/support/diagnostics' 
                  ? 'bg-white/5 text-white font-semibold' 
                  : 'text-gray-400 hover:text-white hover:bg-white/[0.02]'
              }`}
            >
              <HelpCircle className="w-4 h-4" />
              Diagnostic Support
            </Link>
            <div 
              className="flex items-center justify-between px-3 py-2 rounded-xl text-sm text-gray-500 cursor-not-allowed select-none"
            >
              <div className="flex items-center gap-3">
                <Download className="w-4 h-4 text-gray-600" />
                <span>Chrome Extension</span>
              </div>
              <span className="text-[8px] font-black uppercase bg-purple-500/10 border border-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded">Soon</span>
            </div>
          </nav>
        </div>

        {/* User profile section + Sign out */}
        <div className="space-y-4 pt-4 border-t border-white/5">
          {user && (
            <div className="px-3 min-w-0">
              <p className="text-xs font-bold text-white truncate">{user.name || 'Pro Bro'}</p>
              <p className="text-[10px] text-white/30 truncate mt-0.5">{user.email}</p>
            </div>
          )}
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs text-gray-500 hover:text-red-400 hover:bg-red-500/5 transition-all text-left"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Pane */}
      <main className="flex-1 ml-56 min-h-screen relative overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
