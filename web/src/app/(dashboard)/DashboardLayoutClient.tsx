'use client'

import React, { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/store/authStore'
import { StageLoader } from '@/components/ui/StageLoader'
import { LayoutDashboard, Folder, FolderKanban, FileText, Settings, CreditCard, Sparkles, Globe, LogOut, BookOpen, HelpCircle, Download, Home, Compass, Play, RotateCcw, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { useOnboardingStore } from '@/store/onboardingStore'
import { useProjectStore } from '@/store/projectStore'
import { OnboardingTour } from '@/components/onboarding/OnboardingTour'
import { OnboardingChecklist } from '@/components/onboarding/OnboardingChecklist'
import { PlanBadge } from '@/components/billing/PlanBadge'
import { PastDueWarningBanner } from '@/components/billing/PastDueWarningBanner'
import { useBillingStore } from '@/store/useBillingStore'

export default function DashboardLayoutClient({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const user = useAuthStore(s => s.user)
  const token = useAuthStore(s => s.token)
  const logout = useAuthStore(s => s.logout)
  const fetchMe = useAuthStore(s => s.fetchMe)
  const isLoading = useAuthStore(s => s.isLoading)

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(pathname.startsWith('/canvas'))

  // Auto-collapse sidebar when entering canvas route
  useEffect(() => {
    if (pathname.startsWith('/canvas')) {
      setIsSidebarCollapsed(true)
    }
  }, [pathname])
  const {
    startOnboarding,
    isOnboardingActive,
    isCompleted,
    isDismissed,
    setDismissed,
    userRole,
    currentUserId,
    currentOrgId,
    hydrateFromUserProfile,
  } = useOnboardingStore()

  const { projects, loading: projectsLoading, error: projectsError, fetchProjects } = useProjectStore()
  const [projectsFetched, setProjectsFetched] = useState(false)
  const subscription = useBillingStore(s => s.subscription)
  const orgId = subscription?.org_id || 'default'

  useEffect(() => {
    // Restore saved onboarding state on mount when user is resolved
    if (user) {
      hydrateFromUserProfile(user, orgId)
    }
  }, [user, orgId, hydrateFromUserProfile])

  // Fetch projects when user session is resolved
  useEffect(() => {
    if (user && !projectsFetched && !projectsLoading) {
      fetchProjects().then(() => {
        setProjectsFetched(true)
      })
    }
  }, [user, projectsFetched, projectsLoading, fetchProjects])

  // Reset projectsFetched & clear cache if user changes/logs out
  useEffect(() => {
    if (!user) {
      setProjectsFetched(false)
      useProjectStore.setState({ projects: [], currentProject: null, projectAnalytics: {} })
    }
  }, [user])

  // Onboarding auto-open trigger
  useEffect(() => {
    // Wait until user session is resolved
    if (isLoading || !user) return

    // Wait until projects list is fully resolved
    if (!projectsFetched || projectsLoading || projectsError) return

    // Ensure onboarding state belongs to the current user and organization scope before checking
    if (currentUserId !== user.id || currentOrgId !== orgId) return

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
    projectsError,
    projects.length,
    currentUserId,
    currentOrgId,
    orgId,
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
      const parts = value.split(`; stagetoken=`)
      if (parts.length === 2) return parts.pop()?.split(';').shift()
      const parts2 = value.split(`; stagetoken=`)
      if (parts2.length === 2) return parts2.pop()?.split(';').shift()
      return null
    }

    const getPersistedToken = () => {
      if (typeof window === 'undefined') return null
      try {
        const raw = localStorage.getItem('stage_auth')
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

  const handleSignOut = async () => {
    await logout()
    router.push('/login')
  }

  // If page is not mounted or is restoring user session, display simple full viewport loader
  if (!mounted || (isLoading && !user)) {
    return (
      <div className="flex h-screen items-center justify-center bg-pm-bg text-pm-text transition-colors duration-300">
        <StageLoader size="md" text="Restoring Session..." />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-pm-bg text-pm-text flex overflow-hidden transition-colors duration-300 relative">
      {/* Floating Toggle Button when Sidebar is Collapsed */}
      {isSidebarCollapsed && (
        <button
          onClick={() => setIsSidebarCollapsed(false)}
          className="fixed top-3 left-3 z-50 bg-[#0d1322]/90 border border-cyan-500/30 p-2 rounded-xl text-cyan-400 hover:text-white hover:bg-slate-800 shadow-xl backdrop-blur-md transition-all hover:scale-105 cursor-pointer"
          title="Open Navigation Menu"
        >
          <PanelLeftOpen className="w-4 h-4" />
        </button>
      )}

      {/* Fixed Left Sidebar (Slidable) */}
      <aside
        className={`w-56 fixed left-0 top-0 bottom-0 bg-pm-surface border-r border-pm-border flex flex-col justify-between p-6 z-40 transition-transform duration-300 ease-in-out ${
          isSidebarCollapsed ? '-translate-x-full' : 'translate-x-0'
        }`}
      >
        <div className="space-y-8">
          {/* Brand header + Collapse trigger */}
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <Link href="/dashboard" className="block">
                <img 
                  src="/logo.png" 
                  alt="STAGE" 
                  width={144} 
                  height={64} 
                  fetchPriority="high"
                  className="h-16 w-auto object-contain dark-theme-logo" 
                />
              </Link>
              <span className="text-[9px] font-mono tracking-widest text-pm-muted uppercase block leading-none pl-1">Visual QA OS</span>
            </div>
            <button
              onClick={() => setIsSidebarCollapsed(true)}
              className="p-1 rounded-lg text-pm-muted hover:text-pm-text hover:bg-pm-surface-2 transition-colors cursor-pointer"
              title="Collapse Menu to Left"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
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
              <span>Home</span>
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
              <span>Dashboard</span>
            </Link>

            <Link 
              href="/sessions" 
              className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all ${
                pathname === '/sessions' 
                  ? 'bg-pm-accent-subtle text-pm-accent font-semibold' 
                  : 'text-pm-muted hover:text-pm-text hover:bg-pm-surface-2'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>All Sessions</span>
            </Link>

            <Link 
              href="/projects" 
              className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all ${
                pathname === '/projects' 
                  ? 'bg-pm-accent-subtle text-pm-accent font-semibold' 
                  : 'text-pm-muted hover:text-pm-text hover:bg-pm-surface-2'
              }`}
            >
              <FolderKanban className="w-4 h-4" />
              <span>Projects</span>
            </Link>

            <Link 
              href="/settings" 
              className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all ${
                pathname === '/settings' 
                  ? 'bg-pm-accent-subtle text-pm-accent font-semibold' 
                  : 'text-pm-muted hover:text-pm-text hover:bg-pm-surface-2'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </Link>

            <Link 
              href="/pricing" 
              className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all ${
                pathname === '/pricing' 
                  ? 'bg-pm-accent-subtle text-pm-accent font-semibold' 
                  : 'text-pm-muted hover:text-pm-text hover:bg-pm-surface-2'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>Plans & Pricing</span>
            </Link>

            <Link 
              href="/features" 
              className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all ${
                pathname === '/features' 
                  ? 'bg-pm-accent-subtle text-pm-accent font-semibold' 
                  : 'text-pm-muted hover:text-pm-text hover:bg-pm-surface-2'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Features</span>
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
              <span>API Reference</span>
            </Link>

            <Link 
              href="/chrome-extension" 
              className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all ${
                pathname === '/chrome-extension' 
                  ? 'bg-pm-accent-subtle text-pm-accent font-semibold' 
                  : 'text-pm-muted hover:text-pm-text hover:bg-pm-surface-2'
              }`}
            >
              <Globe className="w-4 h-4" />
              <span>Chrome Extension</span>
            </Link>

            <div className="pt-2 pb-1">
              <div className="h-px bg-pm-border w-full" />
            </div>

            {isDismissed && userRole ? (
              <>
                <button 
                  onClick={() => {
                    setDismissed(false);
                    router.push('/dashboard');
                  }}
                  className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-pm-muted hover:text-pm-text hover:bg-pm-surface-2 transition-all w-full text-left cursor-pointer"
                >
                  <Play className="w-4 h-4 text-emerald-400 animate-pulse" />
                  Resume Product Tour
                </button>
                <button 
                  onClick={() => {
                    startOnboarding('developer');
                    router.push('/dashboard');
                  }}
                  className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-pm-muted hover:text-pm-text hover:bg-pm-surface-2 transition-all w-full text-left cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4 text-purple-400" />
                  Restart Product Tour
                </button>
              </>
            ) : null}
            <div 
              className="flex items-center justify-between px-3 py-2 rounded-xl text-sm text-pm-muted dark:text-zinc-400 font-medium cursor-not-allowed select-none"
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
            <div className="px-3 min-w-0 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-pm-text truncate">{user.name || 'Pro Reviewer'}</p>
              </div>
              <p className="text-[10px] text-pm-muted truncate mt-0.5">{user.email}</p>
              <div className="pt-1">
                <PlanBadge />
              </div>
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
      <main
        className={`flex-1 min-h-screen relative overflow-y-auto transition-all duration-300 ease-in-out ${
          isSidebarCollapsed ? 'ml-0' : 'ml-56'
        }`}
      >
        <PastDueWarningBanner />
        {children}
      </main>

      {/* Onboarding overlays — rendered at layout level so they persist across all pages */}
      <OnboardingTour />
      <OnboardingChecklist isSidebarCollapsed={isSidebarCollapsed} />
    </div>
  )
}
