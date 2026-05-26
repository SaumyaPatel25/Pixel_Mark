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
    let detail = 'An error occurred'
    try {
      const errData = await response.json()
      detail = errData.detail || detail
    } catch {
      // Non-JSON error
    }
    throw new Error(detail)
  }

  const contentType = response.headers.get('Content-Type')
  if (contentType && contentType.includes('application/json')) {
    return response.json()
  }
  return response
}

export const api = {
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
    async getProjects() {
      return request('/projects/')
    },
    async createProject(data: { name: string; url?: string }) {
      return request('/projects/', {
        method: 'POST',
        body: JSON.stringify(data),
      })
    },
    async getProject(id: string) {
      return request(`/projects/${id}`)
    },
    async deleteProject(id: string) {
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
  shares: {
    async createShareLink(data: { session_id: string; can_comment: boolean }) {
      return request('/shares/', {
        method: 'POST',
        body: JSON.stringify(data),
      })
    },
    async getShareLinks(sessionId: string) {
      return request(`/shares/session/${sessionId}`)
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
