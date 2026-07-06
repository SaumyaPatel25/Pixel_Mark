import { ReviewerIdentity } from '@/types/markers'

// Per-session key (kept for backward compat)
export function reviewerStorageKey(sessionId: string): string {
  return `pm:reviewer:${sessionId}`;
}

// Global key — stores identity independent of session so the user never has to sign in again
const GLOBAL_REVIEWER_KEY = 'pm:reviewer:identity';

/**
 * Returns stored identity, checking the global key first, then the per-session key.
 * Migrates legacy per-session entries to the global key on first read.
 */
export function getStoredReviewerIdentity(sessionId: string): ReviewerIdentity | null {
  if (typeof window === "undefined") return null;

  // 1. Check global persistent identity
  const globalRaw = localStorage.getItem(GLOBAL_REVIEWER_KEY);
  if (globalRaw) {
    try { return JSON.parse(globalRaw); } catch { localStorage.removeItem(GLOBAL_REVIEWER_KEY); }
  }

  // 2. Fallback: check legacy per-session key and migrate it
  const sessionRaw = localStorage.getItem(reviewerStorageKey(sessionId));
  if (sessionRaw) {
    try {
      const identity = JSON.parse(sessionRaw);
      // Migrate to global key
      localStorage.setItem(GLOBAL_REVIEWER_KEY, sessionRaw);
      return identity;
    } catch { /* ignore corrupt data */ }
  }

  return null;
}

export function setStoredReviewerIdentity(sessionId: string, identity: ReviewerIdentity): void {
  if (typeof window === "undefined") return;
  const serialized = JSON.stringify(identity);
  // Store globally (persists across all sessions) and per-session
  localStorage.setItem(GLOBAL_REVIEWER_KEY, serialized);
  localStorage.setItem(reviewerStorageKey(sessionId), serialized);
}

export function clearStoredReviewerIdentity(sessionId: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(GLOBAL_REVIEWER_KEY);
  localStorage.removeItem(reviewerStorageKey(sessionId));
}
