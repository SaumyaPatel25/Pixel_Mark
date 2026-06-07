// PixelMark Core API Client (Unified exception & structured error handler)
// Version 2.0.1
const BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8765').replace(/\/$/, '')

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
  // AUTH
  auth: {
    async register(email: string, password: string, name?: string) {
      return request('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, name }),
      })
    },
    async login(email: string, password: string) {
      return request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
    },
    async me() {
      return request('/auth/me')
    },
  },

  // PROJECTS
  projects: {
    async list(): Promise<Project[]> {
      return request('/projects/')
    },
    async create(data: ProjectCreate): Promise<Project> {
      return request('/projects/', {
        method: 'POST',
        body: JSON.stringify(data),
      })
    },
    async get(id: string): Promise<Project> {
      return request(`/projects/${id}`)
    },
    async delete(id: string): Promise<void> {
      return request(`/projects/${id}`, {
        method: 'DELETE',
      })
    },
  },

  // SESSIONS
  sessions: {
    async getSessions(projectId: string) {
      return request(`/sessions/project/${projectId}`)
    },
    async createSession(data: { project_id: string; title?: string }) {
      return request('/sessions/', {
        method: 'POST',
        body: JSON.stringify(data),
      })
    },
    async getSession(id: string) {
      return request(`/sessions/${id}`)
    },
    async getVisits(sessionId: string) {
      return request(`/sessions/${sessionId}/pages`)
    },
    async getSessionStats(sessionId: string) {
      return request(`/sessions/${sessionId}/stats`)
    },
    async recordVisit(sessionId: string, pageUrl: string, pageTitle?: string, parentPageId?: string, shareToken?: string) {
      const params = new URLSearchParams({ page_url: pageUrl })
      if (pageTitle) params.append('page_title', pageTitle)
      if (parentPageId) params.append('parent_page_id', parentPageId)
      if (shareToken) params.append('share_token', shareToken)
      return request(`/proxy/session/${sessionId}/page-visit?${params.toString()}`, {
        method: 'POST'
      })
    },
    async updateRenderer(sessionId: string, data: { renderer_type: string; has_canvas: boolean; canvas_count: number; raf_detected: boolean; three_detected: boolean }) {
      return request(`/sessions/${sessionId}/renderer`, {
        method: 'POST',
        body: JSON.stringify(data)
      })
    },
  },

  // COMMENTS (Frontend calls it comments, Backend calls it markers)
  comments: {
    async list(projectId: string): Promise<Comment[]> {
      return request(`/markers/project/${projectId}`)
    },
    async create(data: CommentCreate): Promise<Comment> {
      return request('/markers/', {
        method: 'POST',
        body: JSON.stringify(data),
      })
    },
    async resolve(id: string): Promise<void> {
      return request(`/markers/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'resolved' }),
      })
    },
    async delete(id: string): Promise<void> {
      return request(`/markers/${id}`, {
        method: 'DELETE',
      })
    },
  },

  // MARKERS
  markers: {
    async getMarkers(sessionId: string) {
      return request(`/markers/session/${sessionId}`)
    },
    async createMarker(data: any) {
      return request('/markers/', {
        method: 'POST',
        body: JSON.stringify(data),
      })
    },
    async updateMarker(id: string, data: any) {
      return request(`/markers/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      })
    },
    async deleteMarker(id: string) {
      return request(`/markers/${id}`, {
        method: 'DELETE',
      })
    },
    async uploadScreenshot(id: string, blob: Blob) {
      const formData = new FormData()
      formData.append('screenshot', blob, 'screenshot.png')
      return request(`/markers/${id}/screenshot`, {
        method: 'POST',
        body: formData,
      })
    },
  },

  // EXPORT
  export: {
    async exportMarkdown(sessionId: string): Promise<string> {
      const resp = await request(`/export/session/${sessionId}/markdown`)
      if (resp instanceof Response) {
        return resp.text()
      }
      return String(resp)
    },
    async exportCSV(sessionId: string): Promise<Blob> {
      const resp = await request(`/export/session/${sessionId}/csv`)
      if (resp instanceof Response) {
        return resp.blob()
      }
      return new Blob([String(resp)], { type: 'text/csv' })
    },
  },

  // SHARES
  shareLinks: {
    async list(sessionId: string): Promise<ShareLink[]> {
      return request(`/share-links/session/${sessionId}`)
    },
    async create(data: ShareLinkCreate): Promise<ShareLink> {
      return request('/share-links/', {
        method: 'POST',
        body: JSON.stringify(data),
      })
    },
    async revoke(linkId: string): Promise<void> {
      return request(`/share-links/${linkId}`, {
        method: 'DELETE',
      })
    },
    async resolve(data: ShareLinkAccess): Promise<ShareLinkPublicRead> {
      return request('/share-links/resolve', {
        method: 'POST',
        body: JSON.stringify(data),
      })
    },
    async getInfo(token: string): Promise<{ label: string | null; can_comment: boolean; is_password_protected: boolean }> {
      return request(`/share-links/${token}/info`)
    },
  },

  // AI
  ai: {
    async triageSession(sessionId: string) {
      return request(`/ai/triage/session/${sessionId}`, {
        method: 'POST',
      })
    },
    async summarizeSession(sessionId: string) {
      return request(`/ai/summary/session/${sessionId}`)
    },
  },

  // CANVAS
  canvas: {
    async getCanvas(projectId: string) {
      return request(`/canvas/project/${projectId}`)
    },
    async createFrame(data: any) {
      return request('/canvas/frames/', {
        method: 'POST',
        body: JSON.stringify(data),
      })
    },
    async updateFrame(id: string, data: any) {
      return request(`/canvas/frames/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      })
    },
    async createFlow(data: any) {
      return request('/canvas/flows/', {
        method: 'POST',
        body: JSON.stringify(data),
      })
    },
  },
}
