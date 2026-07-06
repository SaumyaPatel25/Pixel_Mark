import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { getStoredReviewerIdentity, setStoredReviewerIdentity, clearStoredReviewerIdentity, reviewerStorageKey } from '@/lib/reviewerIdentity'
import { ReviewerIdentity } from '@/types/markers'

const SESSION_ID = 'test-session-xyz'
const MOCK_IDENTITY: ReviewerIdentity = {
  id: 'reviewer-1',
  session_id: SESSION_ID,
  display_name: 'Anika Sharma',
  role: 'reviewer',
  color_token: 'violet',
  created_at: new Date().toISOString(),
}

describe('reviewerIdentity: localStorage helpers', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('generates the correct storage key', () => {
    expect(reviewerStorageKey(SESSION_ID)).toBe(`pm:reviewer:${SESSION_ID}`)
  })

  it('returns null when no identity has ever been stored', () => {
    const result = getStoredReviewerIdentity(SESSION_ID)
    expect(result).toBeNull()
  })

  it('stores and retrieves identity via global key', () => {
    setStoredReviewerIdentity(SESSION_ID, MOCK_IDENTITY)
    const result = getStoredReviewerIdentity(SESSION_ID)
    expect(result).not.toBeNull()
    expect(result?.id).toBe('reviewer-1')
    expect(result?.display_name).toBe('Anika Sharma')
    expect(result?.color_token).toBe('violet')
  })

  it('retrieves the same global identity regardless of session_id (cross-session persistence)', () => {
    setStoredReviewerIdentity(SESSION_ID, MOCK_IDENTITY)
    // Different session ID — should still return the globally stored identity
    const result = getStoredReviewerIdentity('other-session')
    expect(result?.id).toBe('reviewer-1')
  })

  it('clears stored identity globally', () => {
    setStoredReviewerIdentity(SESSION_ID, MOCK_IDENTITY)
    clearStoredReviewerIdentity(SESSION_ID)
    const result = getStoredReviewerIdentity(SESSION_ID)
    expect(result).toBeNull()
  })

  it('clearing identity removes it across all sessions', () => {
    const otherSession = 'other-session'
    const otherIdentity = { ...MOCK_IDENTITY, id: 'reviewer-2', session_id: otherSession }
    setStoredReviewerIdentity(otherSession, otherIdentity)

    clearStoredReviewerIdentity(otherSession)

    // Both sessions should now return null (global key cleared)
    expect(getStoredReviewerIdentity(SESSION_ID)).toBeNull()
    expect(getStoredReviewerIdentity(otherSession)).toBeNull()
  })
})
