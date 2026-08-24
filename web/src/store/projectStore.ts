// src/store/projectStore.ts
import { create } from 'zustand'
import { api, Project, ProjectCreate } from '@/lib/api'

interface ProjectState {
  projects:        Project[]
  currentProject:  Project | null
  loading:         boolean
  error:           string | null
  lastProjectsFetchedAt: number
  projectAnalytics:  Record<string, { data: any; fetchedAt: number }>
  fetchAnalytics: (id: string, force?: boolean) => Promise<any>
  fetchProjects:     (force?: boolean) => Promise<Project[]>
  createProject:     (input: ProjectCreate) => Promise<Project>
  deleteProject:     (id: string) => Promise<void>
  setCurrentProject: (project: Project | null) => void
  clearError:        () => void
}

const inFlightRequests: Record<string, Promise<any> | undefined> = {}
let inFlightProjectsPromise: Promise<Project[]> | null = null

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects:       [],
  currentProject: null,
  loading:        false,
  error:          null,
  lastProjectsFetchedAt: 0,
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

  fetchProjects: async (force = false) => {
    const { projects, lastProjectsFetchedAt } = get()
    const now = Date.now()
    const STALE_TIME = 1000 * 60 * 2 // 2 minutes stale time

    // If we have cached projects within 2 minutes and not forced, return immediately
    if (!force && projects.length > 0 && (now - lastProjectsFetchedAt < STALE_TIME)) {
      return projects
    }

    // If a request is already in-flight, return the existing promise
    if (inFlightProjectsPromise) {
      return inFlightProjectsPromise
    }

    // Only show loading spinner if we have no projects yet
    if (projects.length === 0) {
      set({ loading: true, error: null })
    }

    inFlightProjectsPromise = (async () => {
      try {
        const fetched = await api.projects.list()
        set({ projects: fetched, lastProjectsFetchedAt: Date.now(), loading: false, error: null })
        return fetched
      } catch (err: unknown) {
        set({ 
          loading: false, 
          error: err instanceof Error ? err.message : 'Failed to fetch projects' 
        })
        return get().projects
      } finally {
        inFlightProjectsPromise = null
      }
    })()

    return inFlightProjectsPromise
  },

  createProject: async (input) => {
    set({ loading: true, error: null })
    try {
      const project = await api.projects.create(input)
      set(s => ({ 
        projects: [project, ...s.projects],
        currentProject: project,
        lastProjectsFetchedAt: Date.now(),
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
    set(s => ({ 
      projects: s.projects.filter(p => p.id !== id),
      lastProjectsFetchedAt: Date.now()
    }))
    
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
