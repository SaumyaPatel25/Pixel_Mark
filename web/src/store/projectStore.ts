// src/store/projectStore.ts
import { create } from 'zustand'
import { api, Project, ProjectCreate } from '@/lib/api'

interface ProjectState {
  projects:        Project[]
  currentProject:  Project | null
  loading:         boolean
  error:           string | null
  projectAnalytics:  Record<string, { data: any; fetchedAt: number }>
  fetchAnalytics: (id: string, force?: boolean) => Promise<any>
  fetchProjects:     () => Promise<void>
  createProject:     (input: ProjectCreate) => Promise<Project>
  deleteProject:     (id: string) => Promise<void>
  setCurrentProject: (project: Project | null) => void
  clearError:        () => void
}

const inFlightRequests: Record<string, Promise<any> | undefined> = {}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects:       [],
  currentProject: null,
  loading:        false,
  error:          null,
  projectAnalytics: {},

  setCurrentProject: (project) => set({ currentProject: project }),
  clearError:        () => set({ error: null }),
  fetchAnalytics: async (id, force = false) => {
    const cache = get().projectAnalytics[id]
    const now = Date.now()
    const STALE_TIME = 1000 * 60 * 5 // 5 minutes stale time

    if (cache && (now - cache.fetchedAt < STALE_TIME) && !force) {
      return cache.data
    }

    if (inFlightRequests[id]) {
      return inFlightRequests[id]
    }

    const promise = (async () => {
      try {
        const data = await api.projects.getAnalytics(id)
        set((s) => ({
          projectAnalytics: {
            ...s.projectAnalytics,
            [id]: { data, fetchedAt: Date.now() }
          }
        }))
        return data
      } finally {
        delete inFlightRequests[id]
      }
    })()

    inFlightRequests[id] = promise
    return promise
  },

  fetchProjects: async () => {
    set({ loading: true, error: null })
    try {
      const projects = await api.projects.list()
      set({ projects, loading: false })
    } catch (err: unknown) {
      set({ 
        loading: false, 
        error: err instanceof Error ? err.message : 'Failed to fetch projects' 
      })
    }
  },

  createProject: async (input) => {
    set({ loading: true, error: null })
    try {
      const project = await api.projects.create(input)
      set(s => ({ 
        projects: [project, ...s.projects],
        currentProject: project,
        loading: false 
      }))
      return project
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create project'
      set({ loading: false, error: msg })
      throw err
    }
  },

  deleteProject: async (id) => {
    const prev = get().projects
    set(s => ({ projects: s.projects.filter(p => p.id !== id) }))
    
    try {
      await api.projects.delete(id)
    } catch (err: unknown) {
      set({ 
        projects: prev, 
        error: err instanceof Error ? err.message : 'Failed to delete project' 
      })
      throw err
    }
  }
}))
