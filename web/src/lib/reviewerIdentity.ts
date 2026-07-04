import { ReviewerIdentity } from '@/types/markers'

export function reviewerStorageKey(sessionId: string): string {
  return `pm:reviewer:${sessionId}`;
}

export function getStoredReviewerIdentity(sessionId: string): ReviewerIdentity | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(reviewerStorageKey(sessionId));
  return raw ? JSON.parse(raw) : null;
}

export function setStoredReviewerIdentity(sessionId: string, identity: ReviewerIdentity): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(reviewerStorageKey(sessionId), JSON.stringify(identity));
}

export function clearStoredReviewerIdentity(sessionId: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(reviewerStorageKey(sessionId));
}
