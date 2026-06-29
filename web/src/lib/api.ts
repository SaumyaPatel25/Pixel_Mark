// PixelMark Core API Client (Unified exception & structured error handler)
// Version 2.0.1
const BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8765').replace(/\/$/, '')
import { apiQueue } from './apiQueue'
async function request(path: string, options: RequestInit = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('pm_token') : null
  const headers = new Headers(options.headers || {})

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  if (options.body && !(options.body instanceof Blob) && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    if (response.status === 401) {
      if (typeof window !== 'undefined') {
        import('../store/authStore').then((mod) => {
          mod.useAuthStore.getState().logout()
          window.location.href = '/login'
        }).catch(() => {})
      }
    }
    let detail: any = 'An error occurred'
    try {
      const errData = await response.json()
      if (errData.detail) {
        if (typeof errData.detail === 'string') {
          detail = errData.detail
        } else if (Array.isArray(errData.detail)) {
          // Format Pydantic list of validation errors
          detail = errData.detail.map((err: any) => {
            const loc = err.loc ? err.loc.join('.') : ''
            return `${loc ? loc + ': ' : ''}${err.msg || 'Invalid value'}`
          }).join(', ')
        } else {
          detail = JSON.stringify(errData.detail)
        }
      }
    } catch {
      // Non-JSON error
    }
    throw new Error(typeof detail === 'string' ? detail : JSON.stringify(detail))
  }

  const contentType = response.headers.get('Content-Type')
  if (contentType && contentType.includes('application/json')) {
    return response.json()
  }
  return response
}

export interface DOMEdit {
  id: string
  session_id: string
  selector: string
  xpath?: string
  property: string
  old_value?: string
  new_value?: string
  element_tag?: string
  element_text?: string
  page_url: string
  created_at: string
  created_by?: string
}

export interface DOMEditCreate {
  session_id: string
  selector: string
  xpath?: string
  property: string
  old_value?: string
  new_value?: string
  element_tag?: string
  element_text?: string
  page_url: string
  created_by?: string
}

export interface Project {
  id: string
  name: string
  url?: string
  created_at: string
}

export interface ProjectCreate {
  name: string
  url?: string
  description?: string
}

export interface ShareLink {
  id: string
  session_id: string
  token: string
  label: string | null
  can_comment: boolean
  is_active: boolean
  expires_at: string | null
  accessed_count: number
  created_at: string
  share_url: string
}

export interface ShareLinkCreate {
  session_id: string
  label?: string
  can_comment?: boolean
  password?: string
  expires_at?: string
}

export interface ShareLinkPublicRead {
  token: string
  session_id: string
  can_comment: boolean
  label: string | null
  session_title: string | null
  project_name: string | null
}

export interface ShareLinkAccess {
  token: string
  password?: string
}

export interface Comment {
  id: string
  project_id: string
  text: string
  component_selector: string
  xpath: string
  tag_name: string
  inner_text: string
  page_url: string
  tester_name: string
  severity: string | null
  status: 'open' | 'resolved' | 'failed'
  x: number
  y: number
  marker_number: number
  screenshot_url: string | null
  ai_summary?: string | null
  suggested_fix?: string | null
  page_title?: string | null
  title?: string | null
  created_at: string
  session_data?: any
}

export interface CommentCreate {
  project_id: string
  text: string
  component_selector?: string
  xpath?: string
  tag_name?: string
  inner_text?: string
  page_url?: string
  tester_name?: string
  x?: number
  y?: number
  marker_number?: number
  screenshot_url?: string | null
}

export const api = {
  proxyUrl(url: string) {
    return `${BASE_URL}/proxy?url=${encodeURIComponent(url)}`
  },
  async getProjects() {
    return this.projects.list()
  },
  async getAllSessions() {
    return apiQueue.enqueueRead('Loading all sessions...', () => request('/sessions/'))
  },
  async getAllMarkers() {
    return apiQueue.enqueueRead('Loading all markers...', () => request('/markers/'))
  },
  // AUTH
  auth: {
    async register(email: string, password: string, name?: string) {
      return apiQueue.enqueueWrite('Registering account...', () => request('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, name }),
      }))
    },
    async login(email: string, password: string) {
      return apiQueue.enqueueWrite('Logging in...', () => request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }))
    },
    async me() {
      return apiQueue.enqueueRead('Loading user...', () => request('/auth/me'))
    },
    async verifyEmail(token: string): Promise<{ message: string }> {
      return apiQueue.enqueueWrite('Verifying email...', () => request(`/auth/verify-email?token=${encodeURIComponent(token)}`, {
        method: 'POST',
      }))
    },
    async requestPasswordReset(email: string): Promise<{ message: string, dev_link?: string }> {
      return apiQueue.enqueueWrite('Requesting password reset...', () => request('/auth/request-password-reset', {
        method: 'POST',
        body: JSON.stringify({ email }),
      }))
    },
    async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
      return apiQueue.enqueueWrite('Resetting password...', () => request('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, new_password: newPassword }),
      }))
    },
    async resendVerification(email: string): Promise<{ message: string, dev_link?: string }> {
      return apiQueue.enqueueWrite('Resending verification email...', () => request('/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify({ email }),
      }))
    },
  },

  // PROJECTS
  projects: {
    async list(): Promise<Project[]> {
      return apiQueue.enqueueRead('Loading projects...', () => request('/projects/'))
    },
    async create(data: ProjectCreate): Promise<Project> {
      return apiQueue.enqueueWrite('Creating project...', () => request('/projects/', {
        method: 'POST',
        body: JSON.stringify(data),
      }))
    },
    async get(id: string): Promise<Project> {
      return apiQueue.enqueueRead('Loading project...', () => request(`/projects/${id}`))
    },
    async delete(id: string): Promise<void> {
      return apiQueue.enqueueWrite('Deleting project...', () => request(`/projects/${id}`, {
        method: 'DELETE',
      }))
    },
    async getAnalytics(id: string): Promise<any> {
      return apiQueue.enqueueRead('Loading analytics...', () => request(`/projects/${id}/analytics`))
    },
  },
  async getDashboardSummary() {
    return apiQueue.enqueueRead('Loading dashboard summary...', () => request('/projects/dashboard/summary'))
  },

  // SESSIONS
  sessions: {
    async getSessions(projectId: string) {
      return apiQueue.enqueueRead('Loading sessions...', () => request(`/sessions/project/${projectId}`))
    },
    async createSession(data: { project_id: string; title?: string }) {
      return apiQueue.enqueueWrite('Creating session...', () => request('/sessions/', {
        method: 'POST',
        body: JSON.stringify(data),
      }))
    },
    async getSession(id: string) {
      return apiQueue.enqueueRead('Loading session...', () => request(`/sessions/${id}`))
    },
    async sendHeartbeat(sessionId: string) {
      return request(`/sessions/${sessionId}/heartbeat`, {
        method: 'POST'
      })
    },
    async getVisits(sessionId: string) {
      return apiQueue.enqueueRead('Loading visits...', () => request(`/sessions/${sessionId}/pages`))
    },
    async getSessionStats(sessionId: string) {
      return apiQueue.enqueueRead('Loading session stats...', () => request(`/sessions/${sessionId}/stats`))
    },
    async recordVisit(sessionId: string, pageUrl: string, pageTitle?: string, parentPageId?: string, shareToken?: string) {
      const params = new URLSearchParams({ page_url: pageUrl })
      if (pageTitle) params.append('page_title', pageTitle)
      if (parentPageId) params.append('parent_page_id', parentPageId)
      if (shareToken) params.append('share_token', shareToken)
      return apiQueue.enqueueWrite('Recording page visit...', () => request(`/proxy/session/${sessionId}/page-visit?${params.toString()}`, {
        method: 'POST'
      }))
    },
    async updateRenderer(sessionId: string, data: { renderer_type: string; has_canvas: boolean; canvas_count: number; raf_detected: boolean; three_detected: boolean }) {
      return apiQueue.enqueueWrite('Updating renderer...', () => request(`/sessions/${sessionId}/renderer`, {
        method: 'POST',
        body: JSON.stringify(data)
      }))
    },
    async getAnalytics(sessionId: string) {
      return apiQueue.enqueueRead('Loading session analytics...', () => request(`/sessions/${sessionId}/analytics`))
    },
    async getFeedbackHistory(sessionId: string, feedbackId: string) {
      return apiQueue.enqueueRead('Loading feedback history...', () => request(`/sessions/${sessionId}/feedback/${feedbackId}/history`))
    },
    async getReport(sessionId: string) {
      return apiQueue.enqueueRead('Loading report...', () => request(`/sessions/${sessionId}/report`))
    },
    async sendReportEmail(sessionId: string, data: { email: string; message?: string }) {
      return apiQueue.enqueueWrite('Sending report...', () => request(`/sessions/${sessionId}/send-report`, {
        method: 'POST',
        body: JSON.stringify(data)
      }))
    },
  },

  // COMMENTS (Frontend calls it comments, Backend calls it markers)
  comments: {
    async list(projectId: string): Promise<Comment[]> {
      return apiQueue.enqueueRead('Loading comments...', () => request(`/markers/project/${projectId}`))
    },
    async create(data: CommentCreate): Promise<Comment> {
      return apiQueue.enqueueWrite('Creating comment...', () => request('/markers/', {
        method: 'POST',
        body: JSON.stringify(data),
      }))
    },
    async resolve(id: string): Promise<void> {
      return apiQueue.enqueueWrite('Resolving comment...', () => request(`/markers/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'resolved' }),
      }))
    },
    async delete(id: string): Promise<void> {
      return apiQueue.enqueueWrite('Deleting comment...', () => request(`/markers/${id}`, {
        method: 'DELETE',
      }))
    },
  },

  // MARKERS
  markers: {
    async getMarkers(sessionId: string) {
      return apiQueue.enqueueRead('Loading pins...', () => request(`/markers/session/${sessionId}`))
    },
    async createMarker(data: any) {
      return apiQueue.enqueueWrite('Saving feedback pin...', () => request('/markers/', {
        method: 'POST',
        body: JSON.stringify(data),
      }))
    },
    async updateMarker(id: string, data: any) {
      return apiQueue.enqueueWrite('Updating pin...', () => request(`/markers/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }), `update-marker-${id}`)
    },
    async deleteMarker(id: string) {
      return apiQueue.enqueueWrite('Deleting pin...', () => request(`/markers/${id}`, {
        method: 'DELETE',
      }), `delete-marker-${id}`)
    },
    async uploadScreenshot(id: string, blob: Blob) {
      const formData = new FormData()
      formData.append('screenshot', blob, 'screenshot.png')
      return apiQueue.enqueueWrite('Uploading screenshot...', () => request(`/markers/${id}/screenshot`, {
        method: 'POST',
        body: formData,
      }))
    },
  },

  // EXPORT
  export: {
    async exportMarkdown(sessionId: string): Promise<string> {
      return apiQueue.enqueueWrite('Preparing download...', async () => {
        const resp = await request(`/export/session/${sessionId}/markdown`)
        if (resp instanceof Response) {
          return resp.text()
        }
        return String(resp)
      })
    },
    async exportCSV(sessionId: string): Promise<Blob> {
      return apiQueue.enqueueWrite('Preparing download...', async () => {
        const resp = await request(`/export/session/${sessionId}/csv`)
        if (resp instanceof Response) {
          return resp.blob()
        }
        return new Blob([String(resp)], { type: 'text/csv' })
      })
    },
  },

  // SHARES
  shareLinks: {
    async list(sessionId: string): Promise<ShareLink[]> {
      return apiQueue.enqueueRead('Loading client links...', () => request(`/share-links/session/${sessionId}`))
    },
    async create(data: ShareLinkCreate): Promise<ShareLink> {
      return apiQueue.enqueueWrite('Generating client link...', () => request('/share-links/', {
        method: 'POST',
        body: JSON.stringify(data),
      }))
    },
    async revoke(linkId: string): Promise<void> {
      return apiQueue.enqueueWrite('Revoking link...', () => request(`/share-links/${linkId}`, {
        method: 'DELETE',
      }))
    },
    async resolve(data: ShareLinkAccess): Promise<ShareLinkPublicRead> {
      return apiQueue.enqueueWrite('Resolving client link...', () => request('/share-links/resolve', {
        method: 'POST',
        body: JSON.stringify(data),
      }))
    },
    async getInfo(token: string): Promise<{ label: string | null; can_comment: boolean; is_password_protected: boolean }> {
      return apiQueue.enqueueRead('Loading link info...', () => request(`/share-links/${token}/info`))
    },
  },

  // AI
  ai: {
    async triageSession(sessionId: string) {
      return apiQueue.enqueueWrite('Running AI triage...', () => request(`/ai/triage/session/${sessionId}`, {
        method: 'POST',
      }), `ai-triage-${sessionId}`)
    },
    async summarizeSession(sessionId: string) {
      return apiQueue.enqueueRead('Loading summary...', () => request(`/ai/summary/session/${sessionId}`))
    },
  },

  // CANVAS
  canvas: {
    async getCanvas(projectId: string) {
      return apiQueue.enqueueRead('Loading canvas...', () => request(`/canvas/${projectId}`))
    },
    async createFrame(data: any) {
      return apiQueue.enqueueWrite('Creating frame...', () => request('/canvas/frames', {
        method: 'POST',
        body: JSON.stringify(data),
      }))
    },
    async updateFrame(id: string, data: any) {
      return apiQueue.enqueueWrite('Updating frame...', () => request(`/canvas/frames/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }), `update-frame-${id}`)
    },
    async deleteFrame(id: string) {
      return apiQueue.enqueueWrite('Deleting frame...', () => request(`/canvas/frames/${id}`, {
        method: 'DELETE',
      }), `delete-frame-${id}`)
    },
    async createFlow(data: any) {
      return apiQueue.enqueueWrite('Creating flow...', () => request('/canvas/flows', {
        method: 'POST',
        body: JSON.stringify(data),
      }))
    },
    async deleteFlow(id: string) {
      return apiQueue.enqueueWrite('Deleting flow...', () => request(`/canvas/flows/${id}`, {
        method: 'DELETE',
      }), `delete-flow-${id}`)
    },
  },

  // FEEDBACK
  feedback: {
    async create(sessionId: string, data: any, shareToken?: string) {
      const url = `/sessions/${sessionId}/feedback${shareToken ? `?share_token=${shareToken}` : ''}`
      return apiQueue.enqueueWrite('Submitting feedback...', () => request(url, {
        method: 'POST',
        body: JSON.stringify(data),
      }))
    },
    async list(sessionId: string, pageUrl?: string, shareToken?: string) {
      const params = new URLSearchParams()
      if (pageUrl) params.append('pageurl', pageUrl)
      if (shareToken) params.append('share_token', shareToken)
      const query = params.toString()
      return apiQueue.enqueueRead('Loading feedback list...', () => request(`/sessions/${sessionId}/feedback${query ? `?${query}` : ''}`))
    },
    async get(sessionId: string, feedbackId: string, shareToken?: string) {
      const url = `/sessions/${sessionId}/feedback/${feedbackId}${shareToken ? `?share_token=${shareToken}` : ''}`
      return apiQueue.enqueueRead('Loading feedback details...', () => request(url))
    },
    async update(sessionId: string, feedbackId: string, patch: any, shareToken?: string) {
      const url = `/sessions/${sessionId}/feedback/${feedbackId}${shareToken ? `?share_token=${shareToken}` : ''}`
      return apiQueue.enqueueWrite('Updating feedback...', () => request(url, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      }), `update-feedback-${feedbackId}`)
    },
  },
  screenshot: {
    async take(sessionId: string, targetUrl: string, shareToken?: string) {
      const params = new URLSearchParams({ target_url: targetUrl })
      if (shareToken) params.append('share_token', shareToken)
      return apiQueue.enqueueWrite('Capturing viewport screenshot...', () => request(`/sessions/${sessionId}/screenshot?${params.toString()}`, {
        method: 'POST'
      }))
    }
  },
  domEdits: {
    async create(sessionId: string, data: DOMEditCreate, shareToken?: string): Promise<DOMEdit> {
      const url = `/sessions/${sessionId}/dom-edits${shareToken ? `?share_token=${shareToken}` : ''}`
      return apiQueue.enqueueWrite('Saving style changes...', () => request(url, {
        method: 'POST',
        body: JSON.stringify(data),
      }))
    },
    async list(sessionId: string, shareToken?: string): Promise<Record<string, DOMEdit[]>> {
      const url = `/sessions/${sessionId}/dom-edits${shareToken ? `?share_token=${shareToken}` : ''}`
      return apiQueue.enqueueRead('Loading style changes...', () => request(url, {
        method: 'GET',
      }))
    },
    async delete(sessionId: string, editId: string): Promise<{ status: string }> {
      return apiQueue.enqueueWrite('Deleting style change...', () => request(`/sessions/${sessionId}/dom-edits/${editId}`, {
        method: 'DELETE',
      }))
    },
    async deleteAll(sessionId: string): Promise<{ status: string, deleted_count: number }> {
      return apiQueue.enqueueWrite('Resetting style changes...', () => request(`/sessions/${sessionId}/dom-edits`, {
        method: 'DELETE',
      }))
    },
    async exportCSS(sessionId: string): Promise<Response> {
      return apiQueue.enqueueRead('Exporting style changes CSS...', () => request(`/sessions/${sessionId}/dom-edits/export/css`, {
        method: 'GET',
      }))
    }
  },
  settings: {
    async getApiKeys() {
      return getApiKeys()
    },
    async createApiKey(name: string) {
      return createApiKey(name)
    },
    async rotateApiKey(id: string) {
      return rotateApiKey(id)
    },
    async revokeApiKey(id: string) {
      return revokeApiKey(id)
    }
  }
}


// AI Provider Endpoints
import { AIProviderConfig, CreateAIProviderConfigInput, UpdateAIProviderConfigInput, TestAIProviderConfigResult } from '../types/ai-provider'

export async function getAIProviderConfigs(): Promise<AIProviderConfig[]> {
  return apiQueue.enqueueRead('Loading AI provider configs...', () => request('/ai/providers', { method: 'GET' }))
}

export async function createAIProviderConfig(data: CreateAIProviderConfigInput): Promise<AIProviderConfig> {
  return apiQueue.enqueueWrite('Saving AI provider config...', () => request('/ai/providers', {
    method: 'POST',
    body: JSON.stringify(data),
  }))
}

export async function updateAIProviderConfig(id: string, data: UpdateAIProviderConfigInput): Promise<AIProviderConfig> {
  return apiQueue.enqueueWrite('Updating AI provider config...', () => request(`/ai/providers/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }))
}

export async function deleteAIProviderConfig(id: string): Promise<{ success: boolean }> {
  return apiQueue.enqueueWrite('Deleting AI provider config...', () => request(`/ai/providers/${id}`, { method: 'DELETE' }))
}

export async function setDefaultAIProviderConfig(id: string): Promise<AIProviderConfig> {
  return apiQueue.enqueueWrite('Setting default AI provider...', () => request(`/ai/providers/${id}/set-default`, { method: 'POST' }))
}

export async function testAIProviderConfig(id: string): Promise<TestAIProviderConfigResult> {
  return apiQueue.enqueueWrite('Testing AI provider connection...', () => request(`/ai/providers/${id}/test`, { method: 'POST' }))
}

export interface ApiKey {
  id: string
  name: string
  created_at: string
  last_used_at: string | null
  revoked_at: string | null
  masked_token: string
}

export interface ApiKeyCreatedResponse {
  id: string
  name: string
  created_at: string
  raw_token: string
}

export async function getApiKeys(): Promise<ApiKey[]> {
  return request('/settings/api-keys')
}

export async function createApiKey(name: string): Promise<ApiKeyCreatedResponse> {
  return apiQueue.enqueueWrite('Creating API key...', () =>
    request('/settings/api-keys', {
      method: 'POST',
      body: JSON.stringify({ name }),
    })
  )
}

export async function rotateApiKey(id: string): Promise<ApiKeyCreatedResponse> {
  return apiQueue.enqueueWrite('Rotating API key...', () =>
    request(`/settings/api-keys/${id}/rotate`, {
      method: 'POST',
    })
  )
}

export async function revokeApiKey(id: string): Promise<{ success: boolean; message: string }> {
  return apiQueue.enqueueWrite('Revoking API key...', () =>
    request(`/settings/api-keys/${id}`, {
      method: 'DELETE',
    })
  )
}

// AI Session Endpoints
import { TriageResult, SessionSummary } from '../types/ai'

export async function triageSession(sessionId: string): Promise<TriageResult> {
  return api.ai.triageSession(sessionId)
}

export async function summarizeSession(sessionId: string): Promise<SessionSummary> {
  return api.ai.summarizeSession(sessionId)
}

export async function createDOMEdit(sessionId: string, data: DOMEditCreate, shareToken?: string): Promise<DOMEdit> {
  return api.domEdits.create(sessionId, data, shareToken)
}

export async function getDOMEdits(sessionId: string, shareToken?: string): Promise<Record<string, DOMEdit[]>> {
  return api.domEdits.list(sessionId, shareToken)
}

export async function deleteDOMEdit(sessionId: string, editId: string): Promise<{ status: string }> {
  return api.domEdits.delete(sessionId, editId)
}

export async function deleteAllDOMEdits(sessionId: string): Promise<{ status: string, deleted_count: number }> {
  return api.domEdits.deleteAll(sessionId)
}

export async function exportDOMEditCSS(sessionId: string): Promise<Response> {
  return api.domEdits.exportCSS(sessionId)
}
