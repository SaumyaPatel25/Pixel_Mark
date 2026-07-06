import { describe, it, expect, beforeEach } from 'vitest'
import { useMarkerStore } from '@/store/markerStore'
import { Marker } from '@/types/markers'

function mockMarker(overrides: Partial<Marker> = {}): Marker {
  return {
    id: 'marker-1',
    session_id: 'session-abc',
    project_id: 'project-1',
    page_visit_id: null,
    creator_id: 'user-1',
    creator_name: 'Anika Sharma',
    creator_role: 'reviewer',
    color_token: 'violet',
    anchor_kind: 'manual',
    page_url: 'https://example.com',
    page_title: 'Test Page',
    target_selector: null,
    target_xpath: null,
    dom_text_excerpt: null,
    offset_x_ratio: null,
    offset_y_ratio: null,
    viewport_x: 100,
    viewport_y: 200,
    page_x: null,
    page_y: null,
    viewport_width: null,
    viewport_height: null,
    element_rect_json: null,
    scroll_x: null,
    scroll_y: null,
    canvas_id: null,
    canvas_x_ratio: null,
    canvas_y_ratio: null,
    webgl_clip_x: null,
    webgl_clip_y: null,
    renderer_type: null,
    title: 'Test Marker',
    description: null,
    status: 'open',
    priority: 'medium',
    is_deleted: false,
    created_at: new Date().toISOString(),
    updated_at: null,
    version: 1,
    browser: null,
    os: null,
    device_pixel_ratio: null,
    console_errors_json: null,
    network_errors_json: null,
    screenshot_url: null,
    encrypted_context: null,
    ...overrides,
  }
}

describe('MarkerStore: applySnapshot', () => {
  beforeEach(() => {
    useMarkerStore.setState({
      markersById: {},
      orderedMarkerIds: [],
      lastSnapshotAt: null,
      currentSessionId: null,
    })
  })

  it('loads markers into markersById and orderedMarkerIds', () => {
    const m1 = mockMarker({ id: 'a', created_at: '2024-01-01T00:00:00Z' })
    const m2 = mockMarker({ id: 'b', created_at: '2024-01-02T00:00:00Z' })

    useMarkerStore.getState().applySnapshot([m1, m2])

    const state = useMarkerStore.getState()
    expect(state.orderedMarkerIds).toEqual(['a', 'b'])
    expect(Object.keys(state.markersById)).toHaveLength(2)
  })

  it('excludes soft-deleted markers from orderedMarkerIds', () => {
    const m1 = mockMarker({ id: 'a', is_deleted: false })
    const m2 = mockMarker({ id: 'b', is_deleted: true })

    useMarkerStore.getState().applySnapshot([m1, m2])

    const state = useMarkerStore.getState()
    expect(state.orderedMarkerIds).toEqual(['a'])
    // But markersById still has both (for lookup)
    expect(state.markersById['b']).toBeDefined()
  })

  it('sets lastSnapshotAt after snapshot', () => {
    useMarkerStore.getState().applySnapshot([mockMarker()])
    expect(useMarkerStore.getState().lastSnapshotAt).not.toBeNull()
  })
})

describe('MarkerStore: upsertMarkerFromServer (stale event guard)', () => {
  beforeEach(() => {
    const m = mockMarker({ id: 'marker-1', version: 5, title: 'Server Version' })
    useMarkerStore.setState({
      markersById: { 'marker-1': m },
      orderedMarkerIds: ['marker-1'],
    })
  })

  it('updates marker when incoming version is newer', () => {
    const updated = mockMarker({ id: 'marker-1', version: 6, title: 'Updated' })
    useMarkerStore.getState().upsertMarkerFromServer(updated)

    expect(useMarkerStore.getState().markersById['marker-1'].title).toBe('Updated')
    expect(useMarkerStore.getState().markersById['marker-1'].version).toBe(6)
  })

  it('ignores incoming marker when version is older than local', () => {
    const stale = mockMarker({ id: 'marker-1', version: 3, title: 'Stale Event' })
    useMarkerStore.getState().upsertMarkerFromServer(stale)

    // Title should NOT be updated to stale value
    expect(useMarkerStore.getState().markersById['marker-1'].title).toBe('Server Version')
  })

  it('ignores incoming marker when version is equal to local', () => {
    const equal = mockMarker({ id: 'marker-1', version: 5, title: 'Same Version Different Title' })
    useMarkerStore.getState().upsertMarkerFromServer(equal)

    // Version must be strictly greater to overwrite
    expect(useMarkerStore.getState().markersById['marker-1'].title).toBe('Server Version')
  })
})

describe('MarkerStore: removeMarkerFromServer', () => {
  beforeEach(() => {
    const m1 = mockMarker({ id: 'a' })
    const m2 = mockMarker({ id: 'b' })
    useMarkerStore.setState({
      markersById: { a: m1, b: m2 },
      orderedMarkerIds: ['a', 'b'],
    })
  })

  it('removes marker id from orderedMarkerIds', () => {
    useMarkerStore.getState().removeMarkerFromServer('a')
    expect(useMarkerStore.getState().orderedMarkerIds).toEqual(['b'])
  })

  it('marks marker as is_deleted=true in markersById', () => {
    useMarkerStore.getState().removeMarkerFromServer('a')
    expect(useMarkerStore.getState().markersById['a'].is_deleted).toBe(true)
  })
})

describe('MarkerStore: handleRealtimeEvent', () => {
  beforeEach(() => {
    useMarkerStore.setState({ markersById: {}, orderedMarkerIds: [] })
  })

  it('upserts marker on marker_created event', () => {
    const m = mockMarker({ id: 'x', version: 1 })
    useMarkerStore.getState().handleRealtimeEvent({
      type: 'marker_created',
      session_id: 'session-abc',
      event_id: 'evt-1',
      occurred_at: new Date().toISOString(),
      marker_id: 'x',
      version: 1,
      data: { marker: m },
    })

    expect(useMarkerStore.getState().markersById['x']).toBeDefined()
  })

  it('removes marker on marker_deleted event', () => {
    const m = mockMarker({ id: 'x', version: 1 })
    useMarkerStore.setState({ markersById: { x: m }, orderedMarkerIds: ['x'] })

    useMarkerStore.getState().handleRealtimeEvent({
      type: 'marker_deleted',
      session_id: 'session-abc',
      event_id: 'evt-2',
      occurred_at: new Date().toISOString(),
      marker_id: 'x',
      version: 2,
      data: { marker_id: 'x' },
    })

    expect(useMarkerStore.getState().orderedMarkerIds).not.toContain('x')
  })

  it('replaces all markers on session_snapshot event', () => {
    const m1 = mockMarker({ id: 'old', version: 1 })
    useMarkerStore.setState({ markersById: { old: m1 }, orderedMarkerIds: ['old'] })

    const fresh = mockMarker({ id: 'fresh', version: 1 })
    useMarkerStore.getState().handleRealtimeEvent({
      type: 'session_snapshot',
      session_id: 'session-abc',
      event_id: 'evt-snap',
      occurred_at: new Date().toISOString(),
      data: {
        generated_at: new Date().toISOString(),
        markers: [fresh],
        connection_count: 1,
      },
    })

    expect(useMarkerStore.getState().orderedMarkerIds).toEqual(['fresh'])
    expect(useMarkerStore.getState().markersById['old']).toBeUndefined()
  })
})

describe('MarkerStore: resetForSessionChange', () => {
  it('clears all markers and resets session id', () => {
    const m = mockMarker()
    useMarkerStore.setState({
      markersById: { 'marker-1': m },
      orderedMarkerIds: ['marker-1'],
      selectedMarkerId: 'marker-1',
      lastSnapshotAt: new Date().toISOString(),
      currentSessionId: 'old-session',
      activeSessionId: 'old-session',
    })

    useMarkerStore.getState().resetForSessionChange('new-session')

    const state = useMarkerStore.getState()
    expect(state.markersById).toEqual({})
    expect(state.orderedMarkerIds).toEqual([])
    expect(state.selectedMarkerId).toBeNull()
    expect(state.lastSnapshotAt).toBeNull()
    expect(state.currentSessionId).toBe('new-session')
    expect(state.activeSessionId).toBe('new-session')
  })
})

describe('MarkerStore: Derived Selectors', () => {
  beforeEach(() => {
    const m1 = mockMarker({ id: 'm1', session_id: 'session-a', page_url: 'https://google.com', priority: 'critical', status: 'open' })
    const m2 = mockMarker({ id: 'm2', session_id: 'session-a', page_url: 'https://google.com', priority: 'medium', status: 'resolved' })
    const m3 = mockMarker({ id: 'm3', session_id: 'session-b', page_url: 'https://yahoo.com', priority: 'low', status: 'open' })
    const m4 = mockMarker({ id: 'm4', session_id: 'session-a', page_url: 'https://google.com', priority: 'high', status: 'open', is_deleted: true })

    useMarkerStore.setState({
      markersById: { m1, m2, m3, m4 },
      orderedMarkerIds: ['m1', 'm2', 'm3'],
      filters: { status: 'all', priority: 'all', creatorId: 'all' }
    })
  })

  it('filters markers by session using getMarkersForSession', () => {
    const sessionAMarkers = useMarkerStore.getState().getMarkersForSession('session-a')
    expect(sessionAMarkers.map(m => m.id)).toEqual(['m1', 'm2'])
  })

  it('filters markers by page using getMarkersForPage', () => {
    const pageMarkers = useMarkerStore.getState().getMarkersForPage('https://google.com')
    expect(pageMarkers.map(m => m.id)).toEqual(['m1', 'm2'])
  })

  it('filters visible markers using getVisibleMarkers', () => {
    const store = useMarkerStore.getState()
    expect(store.getVisibleMarkers().map(m => m.id)).toEqual(['m1', 'm2', 'm3'])

    useMarkerStore.getState().setFilters({ status: 'open' })
    expect(useMarkerStore.getState().getVisibleMarkers().map(m => m.id)).toEqual(['m1', 'm3'])

    useMarkerStore.getState().setFilters({ priority: 'critical' })
    expect(useMarkerStore.getState().getVisibleMarkers().map(m => m.id)).toEqual(['m1'])
  })

  it('computes correct statistics via getMarkerStats', () => {
    const stats = useMarkerStore.getState().getMarkerStats()
    expect(stats.total).toBe(3)
    expect(stats.open).toBe(2)
    expect(stats.resolved).toBe(1)
    expect(stats.critical).toBe(1)
    expect(stats.high).toBe(0)
    expect(stats.medium).toBe(1)
    expect(stats.low).toBe(1)
  })

  it('groups markers by page using getMarkersGroupedByPage', () => {
    const grouped = useMarkerStore.getState().getMarkersGroupedByPage()
    expect(Object.keys(grouped)).toContain('https://google.com')
    expect(Object.keys(grouped)).toContain('https://yahoo.com')
    expect(grouped['https://google.com'].markers.map(m => m.id)).toEqual(['m1', 'm2'])
  })
})
