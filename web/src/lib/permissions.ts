import { Marker, CreatorRole } from '@/types/markers'

export interface ActorContext {
  id?: string | null
  role?: 'developer' | 'reviewer' | null
}

/**
 * Returns true if the current actor is permitted to update, move, or delete a marker.
 * Rules:
 * - Developer role can mutate any marker.
 * - Reviewer role can only mutate markers they created themselves.
 */
export function canCurrentActorMutateMarker(
  actor: ActorContext | null | undefined,
  marker: Marker
): boolean {
  if (!actor) return false

  // Developer can mutate any marker in the session
  if (actor.role === 'developer') return true

  // Reviewers can only edit markers they created
  if (actor.role === 'reviewer') {
    return (
      marker.creator_role === 'reviewer' &&
      marker.creator_id !== null &&
      marker.creator_id === actor.id
    );
  }

  return false
}
