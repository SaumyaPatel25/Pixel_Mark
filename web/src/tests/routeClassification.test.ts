import { describe, it, expect } from 'vitest'
import { isPublicRoute, isAuthRoute, isProtectedRoute, isAuthCallbackRoute } from '../lib/routes'

describe('Centralized Route Classification System', () => {
  describe('isPublicRoute', () => {
    it('should classify /pricing as a public route', () => {
      expect(isPublicRoute('/pricing')).toBe(true)
    })

    it('should classify root landing page / as public', () => {
      expect(isPublicRoute('/')).toBe(true)
    })

    it('should classify /faq and /features as public', () => {
      expect(isPublicRoute('/faq')).toBe(true)
      expect(isPublicRoute('/features')).toBe(true)
    })

    it('should classify /docs/api and /support/diagnostics as public via prefix', () => {
      expect(isPublicRoute('/docs/api')).toBe(true)
      expect(isPublicRoute('/support/diagnostics')).toBe(true)
      expect(isPublicRoute('/share-links/123')).toBe(true)
    })

    it('should NOT classify /dashboard or /projects as public', () => {
      expect(isPublicRoute('/dashboard')).toBe(false)
      expect(isPublicRoute('/projects/123')).toBe(false)
    })
  })

  describe('isAuthRoute', () => {
    it('should classify login and register routes', () => {
      expect(isAuthRoute('/login')).toBe(true)
      expect(isAuthRoute('/register')).toBe(true)
      expect(isAuthRoute('/signup')).toBe(true)
      expect(isAuthRoute('/auth/login')).toBe(true)
    })

    it('should NOT classify /pricing or /dashboard as auth routes', () => {
      expect(isAuthRoute('/pricing')).toBe(false)
      expect(isAuthRoute('/dashboard')).toBe(false)
    })
  })

  describe('isAuthCallbackRoute', () => {
    it('should classify OAuth callback paths', () => {
      expect(isAuthCallbackRoute('/auth/callback')).toBe(true)
      expect(isAuthCallbackRoute('/auth/oauth-callback')).toBe(true)
    })
  })

  describe('isProtectedRoute', () => {
    it('should classify protected dashboard and project routes', () => {
      expect(isProtectedRoute('/dashboard')).toBe(true)
      expect(isProtectedRoute('/projects')).toBe(true)
      expect(isProtectedRoute('/project/proj_123')).toBe(true)
      expect(isProtectedRoute('/settings/profile')).toBe(true)
    })

    it('should NOT classify /pricing or / as protected routes', () => {
      expect(isProtectedRoute('/pricing')).toBe(false)
      expect(isProtectedRoute('/')).toBe(false)
    })
  })
})
