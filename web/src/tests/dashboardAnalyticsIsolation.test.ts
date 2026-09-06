import { describe, it, expect, beforeEach, vi } from 'vitest'
import { apiQueue } from '@/lib/apiQueue'
import { useProjectStore } from '@/store/projectStore'

vi.mock('@/lib/api', () => {
  return {
    api: {
      projects: {
        getAnalytics: vi.fn(async (id: string) => {
          if (id === 'project-alpha') {
            return { total: 10, resolved: 8, open: 2, by_severity: { P0: 1, P1: 1 } }
          }
          if (id === 'project-beta') {
            return { total: 50, resolved: 10, open: 40, by_severity: { P0: 5, P1: 10 } }
          }
          return { total: 0, resolved: 0, open: 0 }
        })
      }
    }
  }
})

describe('Dashboard Project Analytics Data Isolation & apiQueue Tests', () => {
  beforeEach(() => {
    useProjectStore.setState({ projects: [], projectAnalytics: {} })
  })

  it('apiQueue.enqueueRead does NOT collapse distinct requests when dedupeKey is missing or distinct', async () => {
    let callCountA = 0
    let callCountB = 0

    const promiseA = apiQueue.enqueueRead('Loading analytics...', async () => {
      callCountA++
      return { id: 'proj-a', val: 100 }
    })

    const promiseB = apiQueue.enqueueRead('Loading analytics...', async () => {
      callCountB++
      return { id: 'proj-b', val: 200 }
    })

    const [resA, resB] = await Promise.all([promiseA, promiseB])

    expect(resA.id).toBe('proj-a')
    expect(resA.val).toBe(100)
    expect(resB.id).toBe('proj-b')
    expect(resB.val).toBe(200)

    expect(callCountA).toBe(1)
    expect(callCountB).toBe(1)
  })

  it('projectStore fetches and maintains strictly isolated analytics per project ID', async () => {
    const store = useProjectStore.getState()

    const analyticsAlpha = await store.fetchAnalytics('project-alpha')
    const analyticsBeta = await store.fetchAnalytics('project-beta')

    expect(analyticsAlpha.total).toBe(10)
    expect(analyticsAlpha.resolved).toBe(8)

    expect(analyticsBeta.total).toBe(50)
    expect(analyticsBeta.resolved).toBe(10)

    const cachedState = useProjectStore.getState().projectAnalytics
    expect(cachedState['project-alpha'].data.total).toBe(10)
    expect(cachedState['project-beta'].data.total).toBe(50)
  })

  it('projectStore.invalidateAnalytics removes specified project analytics or all analytics', async () => {
    const store = useProjectStore.getState()

    await store.fetchAnalytics('project-alpha')
    await store.fetchAnalytics('project-beta')

    expect(useProjectStore.getState().projectAnalytics['project-alpha']).toBeDefined()
    expect(useProjectStore.getState().projectAnalytics['project-beta']).toBeDefined()

    // Invalidate project-alpha only
    useProjectStore.getState().invalidateAnalytics('project-alpha')
    expect(useProjectStore.getState().projectAnalytics['project-alpha']).toBeUndefined()
    expect(useProjectStore.getState().projectAnalytics['project-beta']).toBeDefined()

    // Invalidate all
    useProjectStore.getState().invalidateAnalytics()
    expect(useProjectStore.getState().projectAnalytics).toEqual({})
  })
})
