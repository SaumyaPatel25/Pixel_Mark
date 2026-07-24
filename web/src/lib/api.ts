// STAGE Core API Client (Unified exception & structured error handler)
// Version 2.0.2
export function getApiBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_URL
  if (envUrl && envUrl.trim() !== '') {
    return envUrl.replace(/\/$/, '')
  }
  return 'http://127.0.0.1:8000'
}

import { apiQueue } from './apiQueue'

function getCookie(name: string) {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift();
  return null;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

export async function request(path: string, options: RequestInit = {}) {
  const baseUrl = getApiBaseUrl()
  // Dual-read migration shim for auth token cookie
  const token = getCookie('stagetoken') || getCookie('pm_token') || getCookie('pmtoken')
  const headers = new Headers(options.headers || {})

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  if (options.body && !(options.body instanceof Blob) && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(`${baseUrl}${path}`, {
    cache: 'no-store', // Prevent Next.js from caching dynamic dashboard data
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
    let rawBody = ''
    try {
      rawBody = await response.text()
      console.log('[API] Raw error response body:', rawBody)
      const errData = JSON.parse(rawBody)
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
      } else if (errData.error) {
        // Handle custom backend error format
        detail = errData.message || errData.error
        if (errData.fields && Array.isArray(errData.fields)) {
          const fieldMsgs = errData.fields.map((f: any) => `${f.field}: ${f.issue}`)
          detail += ' (' + fieldMsgs.join(', ') + ')'
        }
      }
    } catch {
      // Non-JSON error — use raw body if available
      if (rawBody) detail = rawBody
    }
    const method = (options.method || 'GET').toUpperCase()
    console.error(`[API] ${method} ${path} → ${response.status} ${response.statusText}`, detail)
    throw new ApiError(typeof detail === 'string' ? detail : JSON.stringify(detail), response.status)
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
  project_id: string | null
  can_comment: boolean
  label: string | null
  session_title: string | null
  title: string | null
  project_name: string | null
  name: string | null
  target_url: string | null
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
    return `${getApiBaseUrl()}/proxy?url=${encodeURIComponent(url)}`
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
    async firebaseSync(idToken: string, name?: string) {
      return apiQueue.enqueueWrite('Syncing session with backend...', () => request('/auth/firebase-sync', {
        method: 'POST',
        body: JSON.stringify({ id_token: idToken, name }),
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

  // BLUEPRINT PROJECT-SCOPED PERSISTENCE
  blueprint: {
    async getEdits(projectId: string) {
      return apiQueue.enqueueRead('Loading blueprint edits...', () => request(`/canvas/${projectId}/edits`))
    },
    async saveEdits(projectId: string, mutations: any[]) {
      return apiQueue.enqueueWrite('Saving blueprint edits...', () => request(`/canvas/${projectId}/edits`, {
        method: 'POST',
        body: JSON.stringify({ mutations })
      }))
    },
    async deleteEdit(projectId: string, editId: string) {
      return apiQueue.enqueueWrite('Deleting blueprint edit...', () => request(`/canvas/${projectId}/edits/${editId}`, {
        method: 'DELETE'
      }))
    },
    async clearEdits(projectId: string) {
      return apiQueue.enqueueWrite('Clearing blueprint edits...', () => request(`/canvas/${projectId}/edits`, {
        method: 'DELETE'
      }))
    },
    async exportJson(projectId: string) {
      return apiQueue.enqueueRead('Exporting JSON...', () => request(`/canvas/${projectId}/edits/export/json`))
    },
    async exportCss(projectId: string) {
      return apiQueue.enqueueRead('Exporting CSS...', () => request(`/canvas/${projectId}/edits/export/css`))
    },
    async exportMarkdown(projectId: string) {
      return apiQueue.enqueueRead('Exporting Markdown...', () => request(`/canvas/${projectId}/edits/export/markdown`))
    },
    async createPublication(projectId: string, name: string, metadata_json?: any) {
      return apiQueue.enqueueWrite('Creating publication...', () => request(`/canvas/${projectId}/publications`, {
        method: 'POST',
        body: JSON.stringify({ name, metadata_json })
      }))
    },
    async listPublications(projectId: string) {
      return apiQueue.enqueueRead('Loading publications...', () => request(`/canvas/${projectId}/publications`))
    },
    async getPublication(publicationId: string) {
      return apiQueue.enqueueRead('Loading publication...', () => request(`/canvas/publications/${publicationId}`))
    },
    async getPublicationByToken(shareToken: string) {
      return apiQueue.enqueueRead('Loading publication token...', () => request(`/canvas/publications/token/${shareToken}`))
    },
    async listComments(projectId: string) {
      return apiQueue.enqueueRead('Loading Blueprint comments...', () => request(`/canvas/${projectId}/comments`))
    },
    async createComment(projectId: string, data: {
      canvas_frame_id?: string
      blueprint_edit_id?: string
      target_selector?: string
      page_url?: string
      author_name?: string
      body: string
      parent_comment_id?: string
    }) {
      return apiQueue.enqueueWrite('Posting Blueprint comment...', () => request(`/canvas/${projectId}/comments`, {
        method: 'POST',
        body: JSON.stringify(data)
      }))
    },
    async updateComment(projectId: string, commentId: string, data: { body?: string; status?: string }) {
      return apiQueue.enqueueWrite('Updating Blueprint comment...', () => request(`/canvas/${projectId}/comments/${commentId}`, {
        method: 'PATCH',
        body: JSON.stringify(data)
      }))
    },
    async deleteComment(projectId: string, commentId: string) {
      return apiQueue.enqueueWrite('Deleting Blueprint comment...', () => request(`/canvas/${projectId}/comments/${commentId}`, {
        method: 'DELETE'
      }))
    },
    async resolveComment(projectId: string, commentId: string) {
      return apiQueue.enqueueWrite('Resolving Blueprint comment...', () => request(`/canvas/${projectId}/comments/${commentId}/resolve`, {
        method: 'POST'
      }))
    },
    async updatePublicationStatus(projectId: string, publicationId: string, status: string, note?: string, changed_by_name?: string, role?: string) {
      return apiQueue.enqueueWrite('Updating publication status...', () => request(`/canvas/${projectId}/publications/${publicationId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, note, changed_by_name, role })
      }))
    },
    async getPublicationHistory(projectId: string, publicationId: string) {
      return apiQueue.enqueueRead('Loading publication history...', () => request(`/canvas/${projectId}/publications/${publicationId}/history`))
    },
    async getActivity(projectId: string, params?: { limit?: number; before?: string; event_type?: string; target_type?: string }) {
      const q = new URLSearchParams()
      if (params?.limit) q.set('limit', String(params.limit))
      if (params?.before) q.set('before', params.before)
      if (params?.event_type) q.set('event_type', params.event_type)
      if (params?.target_type) q.set('target_type', params.target_type)
      const qs = q.toString() ? `?${q.toString()}` : ''
      return apiQueue.enqueueRead('Loading Blueprint activity...', () => request(`/canvas/${projectId}/activity${qs}`))
    },
    async getActivitySummary(projectId: string) {
      return apiQueue.enqueueRead('Loading activity summary...', () => request(`/canvas/${projectId}/activity/summary`))
    },
    async generateSummary(projectId: string, payload?: { publication_id?: string; edit_ids?: string[]; tone?: string; audience?: string }) {
      return apiQueue.enqueueWrite('Generating STAGE AI change summary...', () => request(`/canvas/${projectId}/summaries/generate`, {
        method: 'POST',
        body: JSON.stringify(payload || {})
      }))
    },
    async getSummaries(projectId: string, limit: number = 10) {
      return apiQueue.enqueueRead('Loading summaries...', () => request(`/canvas/${projectId}/summaries?limit=${limit}`))
    },
    async getSummaryDetail(projectId: string, summaryId: string) {
      return apiQueue.enqueueRead('Loading summary details...', () => request(`/canvas/${projectId}/summaries/${summaryId}`))
    },
    async getPublicationSummary(publicationId: string) {
      return apiQueue.enqueueRead('Loading publication summary...', () => request(`/canvas/publications/${publicationId}/summary`))
    },
  },

  // NOTIFICATIONS
  notifications: {
    async list(params?: { project_id?: string; source_type?: string; unread_only?: boolean; limit?: number; before?: string }) {
      const q = new URLSearchParams()
      if (params?.project_id) q.set('project_id', params.project_id)
      if (params?.source_type) q.set('source_type', params.source_type)
      if (params?.unread_only) q.set('unread_only', 'true')
      if (params?.limit) q.set('limit', String(params.limit))
      if (params?.before) q.set('before', params.before)
      const qs = q.toString() ? `?${q.toString()}` : ''
      return apiQueue.enqueueRead('Loading notifications...', () => request(`/notifications${qs}`))
    },
    async markRead(id: string) {
      return apiQueue.enqueueWrite('Marking notification read...', () => request(`/notifications/${id}/read`, { method: 'PATCH' }))
    },
    async markAllRead(projectId?: string) {
      const qs = projectId ? `?project_id=${projectId}` : ''
      return apiQueue.enqueueWrite('Marking all notifications read...', () => request(`/notifications/read-all${qs}`, { method: 'PATCH' }))
    },
    async getPreferences(projectId?: string) {
      const qs = projectId ? `?project_id=${projectId}` : ''
      return apiQueue.enqueueRead('Loading notification preferences...', () => request(`/notification-preferences${qs}`))
    },
    async updatePreferences(data: { project_id?: string; email_enabled?: boolean; digest_enabled?: boolean; allow_blueprint_events?: boolean; allow_session_events?: boolean; allow_critical?: boolean; allow_important?: boolean; allow_digest?: boolean }) {
      return apiQueue.enqueueWrite('Updating notification preferences...', () => request('/notification-preferences', {
        method: 'PUT',
        body: JSON.stringify(data)
      }))
    },
    async previewDigest(projectId?: string, hours: number = 24) {
      return apiQueue.enqueueRead('Building digest preview...', () => request('/notifications/digest/preview', {
        method: 'POST',
        body: JSON.stringify({ project_id: projectId, hours })
      }))
    },
    async sendTestEmail(projectId?: string) {
      return apiQueue.enqueueWrite('Sending test email...', () => request(`/notifications/test-email${projectId ? `?project_id=${projectId}` : ''}`, { method: 'POST' }))
    }
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
    async getSession(id: string, shareToken?: string) {
      const url = `/sessions/${id}${shareToken ? `?share_token=${shareToken}` : ''}`
      return apiQueue.enqueueRead('Loading session...', () => request(url))
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
      return Promise.resolve([])
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

  // MARKERS (Step 3 Rebuild)
  markers: {
    async list(sessionId: string, params?: { page_url?: string; creator_role?: string; creator_id?: string; status?: string; include_deleted?: boolean }): Promise<any[]> {
      const q = new URLSearchParams()
      if (params) {
        if (params.page_url) q.append('page_url', params.page_url)
        if (params.creator_role) q.append('creator_role', params.creator_role)
        if (params.creator_id) q.append('creator_id', params.creator_id)
        if (params.status) q.append('status', params.status)
        if (params.include_deleted !== undefined) q.append('include_deleted', String(params.include_deleted))
      }
      const qs = q.toString()
      return apiQueue.enqueueRead('Loading markers...', () => request(`/sessions/${sessionId}/markers${qs ? `?${qs}` : ''}`))
    },
    async create(sessionId: string, data: any, xReviewerId?: string): Promise<any> {
      const headers: Record<string, string> = {}
      if (xReviewerId) {
        headers['X-Reviewer-Id'] = xReviewerId
      }
      return apiQueue.enqueueWrite('Creating marker...', () => request(`/sessions/${sessionId}/markers`, {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
      }))
    },
    async update(markerId: string, data: { title?: string; description?: string; status?: string; priority?: string; color_token?: string; expected_version?: number }, xReviewerId?: string): Promise<any> {
      const headers: Record<string, string> = {}
      if (xReviewerId) {
        headers['X-Reviewer-Id'] = xReviewerId
      }
      return apiQueue.enqueueWrite('Updating marker...', () => request(`/markers/${markerId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(data),
      }))
    },
    async patchPosition(markerId: string, data: any, xReviewerId?: string): Promise<any> {
      const headers: Record<string, string> = {}
      if (xReviewerId) {
        headers['X-Reviewer-Id'] = xReviewerId
      }
      return apiQueue.enqueueWrite('Moving marker...', () => request(`/markers/${markerId}/position`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(data),
      }))
    },
    async delete(markerId: string, xReviewerId?: string): Promise<{ success: boolean; message: string }> {
      const headers: Record<string, string> = {}
      if (xReviewerId) {
        headers['X-Reviewer-Id'] = xReviewerId
      }
      return apiQueue.enqueueWrite('Deleting marker...', () => request(`/markers/${markerId}`, {
        method: 'DELETE',
        headers,
      }))
    },
    async registerReviewerIdentity(sessionId: string, data: { display_name: string; color_token?: string }): Promise<any> {
      return apiQueue.enqueueWrite('Registering reviewer...', () => request(`/sessions/${sessionId}/reviewer-identities`, {
        method: 'POST',
        body: JSON.stringify(data),
      }))
    }
  },
  // Deprecated compat alias
  feedback: {
    async create(sessionId: string, data: any, shareToken?: string, xReviewerId?: string) {
      return api.markers.create(sessionId, data, xReviewerId)
    },
    async list(sessionId: string, pageUrl?: string, shareToken?: string) {
      return api.markers.list(sessionId, { page_url: pageUrl })
    },
    async update(sessionId: string, markerId: string, patch: any, shareToken?: string, xReviewerId?: string) {
      return api.markers.update(markerId, patch, xReviewerId)
    }
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
      return apiQueue.enqueueRead('Exporting CSS...', () => fetch(`${getApiBaseUrl()}/api/sessions/${sessionId}/dom-edits/export/css`))
    },
    async exportMarkdown(sessionId: string): Promise<Response> {
      return apiQueue.enqueueRead('Exporting Markdown...', () => fetch(`${getApiBaseUrl()}/api/sessions/${sessionId}/dom-edits/export/markdown`))
    },
    async exportJSON(sessionId: string): Promise<Response> {
      return apiQueue.enqueueRead('Exporting JSON...', () => fetch(`${getApiBaseUrl()}/api/sessions/${sessionId}/dom-edits/export/json`))
    },
    async exportAIImplementation(sessionId: string): Promise<Response> {
      return apiQueue.enqueueRead('Exporting AI Implementation...', () => fetch(`${getApiBaseUrl()}/api/sessions/${sessionId}/dom-edits/export/ai-implementation`))
    }
  },
  blueprintDomEdits: {
    async getBlueprintDomTarget(projectId: string, frameId: string) {
      return apiQueue.enqueueRead('Loading Blueprint target...', () =>
        request(`/projects/${projectId}/blueprint/frames/${frameId}/dom-target`)
      )
    },
    async upsertBlueprintDomTarget(projectId: string, frameId: string, payload: any) {
      return apiQueue.enqueueWrite('Saving Blueprint target...', () =>
        request(`/projects/${projectId}/blueprint/frames/${frameId}/dom-target`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        })
      )
    },
    async listBlueprintEditSets(projectId: string, frameId: string) {
      return apiQueue.enqueueRead('Loading Blueprint edit sets...', () =>
        request(`/projects/${projectId}/blueprint/frames/${frameId}/edit-sets`)
      )
    },
    async createBlueprintEditSet(projectId: string, frameId: string, payload: any) {
      return apiQueue.enqueueWrite('Creating Blueprint edit set...', () =>
        request(`/projects/${projectId}/blueprint/frames/${frameId}/edit-sets`, {
          method: 'POST',
          body: JSON.stringify(payload),
        })
      )
    },
    async getBlueprintEditSet(projectId: string, editSetId: string) {
      return apiQueue.enqueueRead('Loading Blueprint edit set...', () =>
        request(`/projects/${projectId}/blueprint/edit-sets/${editSetId}`)
      )
    },
    async createBlueprintEditOperation(projectId: string, editSetId: string, payload: any) {
      return apiQueue.enqueueWrite('Creating edit operation...', () =>
        request(`/projects/${projectId}/blueprint/edit-sets/${editSetId}/operations`, {
          method: 'POST',
          body: JSON.stringify(payload),
        })
      )
    },
    async updateBlueprintEditOperation(projectId: string, operationId: string, payload: any) {
      return apiQueue.enqueueWrite('Updating edit operation...', () =>
        request(`/projects/${projectId}/blueprint/operations/${operationId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        })
      )
    },
    async deleteBlueprintEditOperation(projectId: string, operationId: string) {
      return apiQueue.enqueueWrite('Deleting edit operation...', () =>
        request(`/projects/${projectId}/blueprint/operations/${operationId}`, {
          method: 'DELETE',
        })
      )
    },
    async exportBlueprintFrameCSS(projectId: string, frameId: string): Promise<string> {
      return apiQueue.enqueueRead('Exporting Blueprint CSS...', async () => {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/projects/${projectId}/blueprint/frames/${frameId}/export.css`)
        if (!res.ok) {
          throw new Error('Failed to export Blueprint CSS')
        }
        return res.text()
      })
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
