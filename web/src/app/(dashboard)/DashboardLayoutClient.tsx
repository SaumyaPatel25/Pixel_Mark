'use client'

import React, { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/store/authStore'
import { LayoutDashboard, Folder, LogOut, BookOpen, HelpCircle, Download, Home } from 'lucide-react'

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
      <div className="flex h-screen items-center justify-center bg-[#F8F7F4] text-[#1E2022]">
        <span className="w-6 h-6 border-2 border-[#253B80] border-t-transparent rounded-full animate-spin mr-3" />
        <span className="text-xs uppercase font-mono tracking-widest text-[#253B80]/60">Restoring Session...</span>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8F7F4] text-[#1E2022] flex overflow-hidden">
      {/* Fixed Left Sidebar */}
      <aside className="w-56 fixed left-0 top-0 bottom-0 bg-white border-r border-[#253B80]/8 flex flex-col justify-between p-6 z-30">
        <div className="space-y-8">
          {/* Brand header */}
          <div className="space-y-1">
            <Link href="/dashboard" className="text-lg font-black tracking-tight text-[#1E2022] flex items-center gap-2">
              <svg width="18" height="18" viewBox="0 0 26 26" fill="none" className="text-[#253B80]">
                <rect x="1.5" y="1.5" width="23" height="23" rx="6" stroke="currentColor" strokeWidth="2.5" fill="none"/>
                <circle cx="13" cy="13" r="4.5" stroke="currentColor" strokeWidth="2.5" fill="none"/>
                <circle cx="13" cy="13" r="1.5" fill="currentColor"/>
              </svg>
              <span>PixelMark</span>
            </Link>
            <span className="text-[9px] font-mono tracking-widest text-[#253B80]/40 uppercase block leading-none pl-6">Visual QA OS</span>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1.5">
            <Link 
              href="/" 
              className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all ${
                pathname === '/' 
                  ? 'bg-[#253B80]/[0.06] text-[#253B80] font-semibold' 
                  : 'text-[#1E2022]/70 hover:text-[#1E2022] hover:bg-[#253B80]/[0.03]'
              }`}
            >
              <Home className="w-4 h-4" />
              Back to Home
            </Link>
            <Link 
              href="/dashboard" 
              className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all ${
                pathname === '/dashboard' 
                  ? 'bg-[#253B80]/[0.06] text-[#253B80] font-semibold' 
                  : 'text-[#1E2022]/70 hover:text-[#1E2022] hover:bg-[#253B80]/[0.03]'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </Link>
            <Link 
              href="/projects" 
              className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all ${
                pathname === '/projects' 
                  ? 'bg-[#253B80]/[0.06] text-[#253B80] font-semibold' 
                  : 'text-[#1E2022]/70 hover:text-[#1E2022] hover:bg-[#253B80]/[0.03]'
              }`}
            >
              <Folder className="w-4 h-4" />
              Projects
            </Link>
            <Link 
              href="/docs/api" 
              className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all ${
                pathname === '/docs/api' 
                  ? 'bg-[#253B80]/[0.06] text-[#253B80] font-semibold' 
                  : 'text-[#1E2022]/70 hover:text-[#1E2022] hover:bg-[#253B80]/[0.03]'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              Developer API Docs
            </Link>
            <Link 
              href="/support/diagnostics" 
              className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all ${
                pathname === '/support/diagnostics' 
                  ? 'bg-[#253B80]/[0.06] text-[#253B80] font-semibold' 
                  : 'text-[#1E2022]/70 hover:text-[#1E2022] hover:bg-[#253B80]/[0.03]'
              }`}
            >
              <HelpCircle className="w-4 h-4" />
              Diagnostic Support
            </Link>
            <div 
              className="flex items-center justify-between px-3 py-2 rounded-xl text-sm text-[#1E2022]/40 cursor-not-allowed select-none"
            >
              <div className="flex items-center gap-3">
                <Download className="w-4 h-4 text-[#1E2022]/30" />
                <span>Chrome Extension</span>
              </div>
              <span className="text-[8px] font-black uppercase bg-[#253B80]/5 border border-[#253B80]/15 text-[#253B80]/60 px-1.5 py-0.5 rounded">Soon</span>
            </div>
          </nav>
        </div>

        {/* User profile section + Sign out */}
        <div className="space-y-4 pt-4 border-t border-[#253B80]/8">
          {user && (
            <div className="px-3 min-w-0">
              <p className="text-xs font-bold text-[#1E2022] truncate">{user.name || 'Pro Reviewer'}</p>
              <p className="text-[10px] text-[#1E2022]/40 truncate mt-0.5">{user.email}</p>
            </div>
          )}
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs text-[#1E2022]/60 hover:text-rose-600 hover:bg-rose-50 transition-all text-left"
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
