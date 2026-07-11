import { Marker } from '@/types/markers'
import { getMarkerColors } from '@/lib/markerColors'
import { canCurrentActorMutateMarker, ActorContext } from '@/lib/permissions'
import { Trash2, Move } from 'lucide-react'
import { useState } from 'react'

interface MarkerPinProps {
  marker: Marker
  actor: ActorContext | null
  onDelete?: (markerId: string) => void
  onMove?: (markerId: string) => void
  onDragStart?: (markerId: string, e: React.PointerEvent) => void
  onClick?: (markerId: string) => void
  size?: 'sm' | 'md'
  dragging?: boolean
}

/**
 * A marker dot/pin rendered on the review overlay.
 * Color is driven deterministically by marker.color_token.
 * Delete/move affordances are shown only if the actor has permission.
 */
export function MarkerPin({ marker, actor, onDelete, onMove, onDragStart, onClick, size = 'md', dragging = false }: MarkerPinProps) {
  const colors = getMarkerColors(marker.color_token)
  const canMutate = canCurrentActorMutateMarker(actor, marker)
  const initials = (marker.creator_name ?? '?').slice(0, 2).toUpperCase()
  const sizeClass = size === 'sm' ? 'w-7 h-7 text-[10px]' : 'w-9 h-9 text-xs'
  const [isHovered, setIsHovered] = useState(false)

  const showStrip = canMutate && (onDelete || onMove || onDragStart) && isHovered && !dragging

  return (
    <div
      className={`relative select-none ${dragging ? 'cursor-grabbing' : 'cursor-pointer'}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => { if (!dragging) onClick?.(marker.id) }}
      title={`${marker.creator_name ?? 'Anonymous'}: ${marker.title ?? ''}`}
    >
      {/* Dot */}
      <div
        className={`${sizeClass} rounded-full flex items-center justify-center font-black border-2 shadow-lg transition-transform ${dragging ? 'scale-125 ring-4 ring-purple-500/30' : (isHovered ? 'scale-110' : '')}`}
        style={{
          backgroundColor: colors.dot,
          borderColor: colors.border,
          color: '#fff',
          boxShadow: dragging ? `0 0 15px ${colors.dot}` : `0 0 0 3px ${colors.dot}30`,
        }}
      >
        {initials}
      </div>

      {/* Invisible bridge fills the gap between pin bottom and action strip so mousing down stays within hover zone */}
      {canMutate && (onDelete || onMove || onDragStart) && (
        <div className="absolute left-1/2 -translate-x-1/2 top-full w-20 h-3" />
      )}

      {/* Hover action strip (delete / move) */}
      {showStrip && (
        <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-pm-surface border border-pm-border rounded-2xl p-1.5 shadow-2xl z-10 animate-in fade-in zoom-in-95 duration-100 transition-all">
          {(onMove || onDragStart) && (
            <button
              title="Move marker (Drag me)"
              onClick={(e) => { e.stopPropagation(); onMove?.(marker.id) }}
              onPointerDown={(e) => { e.stopPropagation(); onDragStart?.(marker.id, e) }}
              className="p-1.5 border border-pm-border hover:border-pm-accent-bright/30 rounded-lg hover:text-pm-accent text-pm-muted bg-pm-surface-2 hover:bg-pm-accent/10 transition-colors cursor-grab active:cursor-grabbing"
            >
              <Move className="w-3.5 h-3.5" />
            </button>
          )}
          {onDelete && (
            <button
              title="Delete marker"
              onClick={(e) => { e.stopPropagation(); onDelete(marker.id) }}
              className="p-1.5 border border-pm-border hover:border-rose-500/30 rounded-lg hover:text-rose-500 text-pm-muted bg-pm-surface-2 hover:bg-rose-500/10 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  )
}

interface MarkerCardProps {
  marker: Marker
  actor: ActorContext | null
  onDelete?: (markerId: string) => void
  isSelected?: boolean
  onClick?: (markerId: string) => void
}

/**
 * A marker card for use in the developer command center list.
 * Shows creator name, color, title, status, priority.
 * Delete is shown based on actor permissions.
 */
export function MarkerCard({ marker, actor, onDelete, isSelected, onClick }: MarkerCardProps) {
  const colors = getMarkerColors(marker.color_token)
  const canDelete = canCurrentActorMutateMarker(actor, marker)
  const creatorLabel = marker.creator_name ?? 'Anonymous'
  const roleLabel = marker.creator_role === 'developer' ? 'Dev' : 'Reviewer'

  return (
    <div
      id={`marker-card-${marker.id}`}
      onClick={() => onClick?.(marker.id)}
      className={`group relative rounded-2xl border p-4 cursor-pointer transition-all
        ${isSelected
          ? 'bg-white/5 border-violet-500/50 shadow-lg shadow-violet-900/20'
          : 'bg-white/[0.02] border-white/5 hover:border-white/10 hover:bg-white/[0.04]'
        }`}
    >
      {/* Color accent bar */}
      <div
        className="absolute left-0 top-3 bottom-3 w-0.5 rounded-full"
        style={{ backgroundColor: colors.dot }}
      />

      <div className="pl-3 space-y-2">
        {/* Creator identity chip */}
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border"
            style={{
              backgroundColor: `${colors.dot}15`,
              borderColor: `${colors.dot}30`,
              color: colors.dot
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: colors.dot }}
            />
            {creatorLabel}
          </span>
          <span className="text-[9px] text-white/20 uppercase font-black tracking-wider">{roleLabel}</span>
        </div>

        {/* Title */}
        {marker.title && (
          <p className="text-[11px] font-semibold text-white/80 leading-snug line-clamp-2">{marker.title}</p>
        )}

        {/* Status + Priority row */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest ${
            marker.status === 'resolved' ? 'bg-green-900/30 text-green-400' :
            marker.status === 'in_progress' ? 'bg-blue-900/30 text-blue-400' :
            marker.status === 'dismissed' ? 'bg-white/5 text-white/30' :
            'bg-purple-900/30 text-purple-400'
          }`}>
            {marker.status === 'resolved' ? '✓ Fixed' :
             marker.status === 'in_progress' ? '⚡ In Progress' :
             marker.status === 'dismissed' ? '— Dismissed' :
             '● Open'}
          </span>
          {marker.priority && (
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest ${
              marker.priority === 'critical' ? 'bg-rose-900/30 text-rose-400' :
              marker.priority === 'high' ? 'bg-orange-900/30 text-orange-400' :
              marker.priority === 'medium' ? 'bg-yellow-900/30 text-yellow-500' :
              'bg-white/5 text-white/30'
            }`}>
              {marker.priority}
            </span>
          )}
        </div>

        {/* Delete */}
        {canDelete && onDelete && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(marker.id) }}
            className="mt-1 text-[9px] text-rose-400/50 hover:text-rose-400 font-black uppercase tracking-widest transition-colors"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  )
}
