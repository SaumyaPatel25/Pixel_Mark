'use client'

import React, { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/store/authStore'
import { PixelmarkLoader } from '@/components/ui/PixelmarkLoader'
import { LayoutDashboard, Folder, LogOut, BookOpen, HelpCircle, Download, Home, Compass, Play } from 'lucide-react'
import { useOnboardingStore } from '@/store/onboardingStore'
import { useProjectStore } from '@/store/projectStore'
import { OnboardingTour } from '@/components/onboarding/OnboardingTour'
import { OnboardingChecklist } from '@/components/onboarding/OnboardingChecklist'

export default function DashboardLayoutClient({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const user = useAuthStore(s => s.user)
  const token = useAuthStore(s => s.token)
  const logout = useAuthStore(s => s.logout)
  const fetchMe = useAuthStore(s => s.fetchMe)
  const isLoading = useAuthStore(s => s.isLoading)
  const { 
    startOnboarding, 
    hydrateFromLocalStorage,
    isOnboardingActive,
    isCompleted,
    isDismissed
  } = useOnboardingStore()

  const { projects, loading: projectsLoading, fetchProjects } = useProjectStore()
  const [projectsFetched, setProjectsFetched] = useState(false)

  useEffect(() => {
    // Restore saved onboarding state on mount
    hydrateFromLocalStorage()
  }, [hydrateFromLocalStorage])

  // Fetch projects when user session is resolved
  useEffect(() => {
    if (user && !projectsFetched && !projectsLoading) {
      fetchProjects().then(() => {
        setProjectsFetched(true)
      })
    }
  }, [user, projectsFetched, projectsLoading, fetchProjects])

  // Reset projectsFetched if user changes/logs out
  useEffect(() => {
    if (!user) {
      setProjectsFetched(false)
    }
  }, [user])

  // Onboarding auto-open trigger
  useEffect(() => {
    // Wait until user session is resolved
    if (isLoading || !user) return

    // Wait until projects list is fully resolved
    if (!projectsFetched || projectsLoading) return

    // Check if onboarding is already active, completed, or dismissed
    if (isOnboardingActive || isCompleted || isDismissed) return

    // Trigger onboarding if they have zero projects
    if (projects.length === 0) {
      const timer = setTimeout(() => {
        startOnboarding('developer')
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [
    user,
    isLoading,
    projectsFetched,
    projectsLoading,
    projects.length,
    isOnboardingActive,
    isCompleted,
    isDismissed,
    startOnboarding
  ])

  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    const getCookieToken = () => {
      if (typeof document === 'undefined') return null
      const value = `; ${document.cookie}`
      const parts = value.split(`; pm_token=`)
      if (parts.length === 2) return parts.pop()?.split(';').shift()
      const parts2 = value.split(`; pmtoken=`)
      if (parts2.length === 2) return parts2.pop()?.split(';').shift()
      return null
    }

    const getPersistedToken = () => {
      if (typeof window === 'undefined') return null
      try {
        const raw = localStorage.getItem('pm_auth')
        if (raw) {
          const parsed = JSON.parse(raw)
          return parsed.state?.token || null
        }
      } catch {
        // ignore
      }
      return null
    }

    const activeToken = token || getCookieToken() || getPersistedToken()
    if (!activeToken) {
      router.push('/login')
    } else if (!user && !isLoading) {
      fetchMe()
    }
  }, [mounted, token, user, isLoading, router, fetchMe])

  const handleSignOut = () => {
    logout()
    router.push('/login')
  }

  // If page is not mounted or is restoring user session, display simple full viewport loader
  if (!mounted || (isLoading && !user)) {
    return (
      <div className="flex h-screen items-center justify-center bg-pm-bg text-pm-text transition-colors duration-300">
        <PixelmarkLoader size="md" text="Restoring Session..." />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-pm-bg text-pm-text flex overflow-hidden transition-colors duration-300">
      {/* Fixed Left Sidebar */}
      <aside className="w-56 fixed left-0 top-0 bottom-0 bg-pm-surface border-r border-pm-border flex flex-col justify-between p-6 z-30 transition-all duration-300">
        <div className="space-y-8">
          {/* Brand header */}
          <div className="space-y-1">
            <Link href="/dashboard" className="block">
              <img src="/logo.png" alt="PixelMark" className="h-20 w-auto object-contain dark-theme-logo" />
            </Link>
            <span className="text-[9px] font-mono tracking-widest text-pm-muted uppercase block leading-none pl-1">Visual QA OS</span>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1.5">
            <Link 
              href="/" 
              className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all ${
                pathname === '/' 
                  ? 'bg-pm-accent-subtle text-pm-accent font-semibold' 
                  : 'text-pm-muted hover:text-pm-text hover:bg-pm-surface-2'
              }`}
            >
              <Home className="w-4 h-4" />
              Back to Home
            </Link>

            <Link 
              href="/dashboard" 
              className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all ${
                pathname === '/dashboard' 
                  ? 'bg-pm-accent-subtle text-pm-accent font-semibold' 
                  : 'text-pm-muted hover:text-pm-text hover:bg-pm-surface-2'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </Link>
            <Link 
              href="/projects" 
              className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all ${
                pathname === '/projects' 
                  ? 'bg-pm-accent-subtle text-pm-accent font-semibold' 
                  : 'text-pm-muted hover:text-pm-text hover:bg-pm-surface-2'
              }`}
            >
              <Folder className="w-4 h-4" />
              Projects
            </Link>
            <Link 
              href="/docs/api" 
              className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all ${
                pathname === '/docs/api' 
                  ? 'bg-pm-accent-subtle text-pm-accent font-semibold' 
                  : 'text-pm-muted hover:text-pm-text hover:bg-pm-surface-2'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              Developer API Docs
            </Link>
            <Link 
              href="/support/diagnostics" 
              className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all ${
                pathname === '/support/diagnostics' 
                  ? 'bg-pm-accent-subtle text-pm-accent font-semibold' 
                  : 'text-pm-muted hover:text-pm-text hover:bg-pm-surface-2'
              }`}
            >
              <HelpCircle className="w-4 h-4" />
              Diagnostic Support
            </Link>
            <button 
              onClick={() => {
                startOnboarding('developer');
                router.push('/dashboard');
              }}
              className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-pm-muted hover:text-pm-text hover:bg-pm-surface-2 transition-all w-full text-left cursor-pointer"
            >
              <Play className="w-4 h-4 text-purple-400" />
              Restart Product Tour
            </button>
            <div 
              className="flex items-center justify-between px-3 py-2 rounded-xl text-sm text-pm-muted/60 cursor-not-allowed select-none"
            >
              <div className="flex items-center gap-3">
                <Download className="w-4 h-4 text-pm-muted" />
                <span>Chrome Extension</span>
              </div>
              <span className="text-[8px] font-black uppercase bg-pm-accent-subtle border border-pm-border text-pm-accent px-1.5 py-0.5 rounded">Soon</span>
            </div>
          </nav>
        </div>

        {/* User profile section + Sign out */}
        <div className="space-y-4 pt-4 border-t border-pm-border">
          {user && (
            <div className="px-3 min-w-0">
              <p className="text-xs font-bold text-pm-text truncate">{user.name || 'Pro Reviewer'}</p>
              <p className="text-[10px] text-pm-muted truncate mt-0.5">{user.email}</p>
            </div>
          )}
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs text-pm-muted hover:text-rose-600 hover:bg-rose-500/10 transition-all text-left"
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

      {/* Onboarding overlays — rendered at layout level so they persist across all pages */}
      <OnboardingTour />
      <OnboardingChecklist />
    </div>
  )
}
