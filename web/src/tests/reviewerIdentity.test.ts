import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
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

describe('reviewerIdentity: sessionStorage helpers', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  afterEach(() => {
    sessionStorage.clear()
  })

  it('generates the correct storage key', () => {
    expect(reviewerStorageKey(SESSION_ID)).toBe(`pm:reviewer:${SESSION_ID}`)
  })

  it('returns null for a session with no stored identity', () => {
    const result = getStoredReviewerIdentity(SESSION_ID)
    expect(result).toBeNull()
  })

  it('stores and retrieves identity', () => {
    setStoredReviewerIdentity(SESSION_ID, MOCK_IDENTITY)
    const result = getStoredReviewerIdentity(SESSION_ID)
    expect(result).not.toBeNull()
    expect(result?.id).toBe('reviewer-1')
    expect(result?.display_name).toBe('Anika Sharma')
    expect(result?.color_token).toBe('violet')
  })

  it('retrieves the identity for the correct session_id only', () => {
    setStoredReviewerIdentity(SESSION_ID, MOCK_IDENTITY)
    const result = getStoredReviewerIdentity('other-session')
    expect(result).toBeNull()
  })

  it('clears stored identity', () => {
    setStoredReviewerIdentity(SESSION_ID, MOCK_IDENTITY)
    clearStoredReviewerIdentity(SESSION_ID)
    const result = getStoredReviewerIdentity(SESSION_ID)
    expect(result).toBeNull()
  })

  it('clearing one session does not affect another', () => {
    const otherSession = 'other-session'
    const otherIdentity = { ...MOCK_IDENTITY, id: 'reviewer-2', session_id: otherSession }
    setStoredReviewerIdentity(SESSION_ID, MOCK_IDENTITY)
    setStoredReviewerIdentity(otherSession, otherIdentity)

    clearStoredReviewerIdentity(SESSION_ID)

    expect(getStoredReviewerIdentity(SESSION_ID)).toBeNull()
    expect(getStoredReviewerIdentity(otherSession)?.id).toBe('reviewer-2')
  })
})
