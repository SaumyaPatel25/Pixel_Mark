'use client'
import { useState } from 'react'
import { Loader2, UserRound, X } from 'lucide-react'
import { api } from '@/lib/api'
import { setStoredReviewerIdentity } from '@/lib/reviewerIdentity'
import { ReviewerIdentity } from '@/types/markers'
import { getMarkerColors } from '@/lib/markerColors'

interface ReviewerNameGateProps {
  sessionId: string
  onIdentityReady: (identity: ReviewerIdentity) => void
}

// Ordered list of tasteful default colors for new reviewers (curated palette)
const REVIEWER_COLOR_OPTIONS = [
  { token: 'violet', hex: '#7a39bb' },
  { token: 'emerald', hex: '#437a22' },
  { token: 'coral', hex: '#01696f' },
  { token: 'amber', hex: '#da7101' },
  { token: 'sky', hex: '#006494' },
  { token: 'rose', hex: '#a12c7b' },
]

export default function ReviewerNameGate({ sessionId, onIdentityReady }: ReviewerNameGateProps) {
  const [displayName, setDisplayName] = useState('')
  const [selectedColor, setSelectedColor] = useState<string>('violet')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = displayName.trim()
    if (!trimmed) return

    setLoading(true)
    setError(null)

    try {
      const identity = await api.markers.registerReviewerIdentity(sessionId, {
        display_name: trimmed,
        color_token: selectedColor,
      })

      console.log(`STAGE participant resolved [${identity.id}] [reviewer]`)

      // Persist to sessionStorage so future page loads in the same tab skip this gate
      setStoredReviewerIdentity(sessionId, identity)
      onIdentityReady(identity)
    } catch (err: any) {
      console.error('[ReviewerNameGate] Failed to register:', err)
      setError(err.message || 'Failed to register. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    // Backdrop
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-sm mx-4 rounded-3xl bg-pm-surface border border-pm-border shadow-2xl shadow-black/60 overflow-hidden transition-all duration-300">
        {/* Header gradient bar */}
        <div className="h-1 w-full bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600" />

        <div className="p-8 space-y-6">
          {/* Icon + title */}
          <div className="text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-pm-accent-subtle border border-pm-border flex items-center justify-center mx-auto shadow-sm">
              <UserRound className="w-7 h-7 text-pm-accent" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight text-pm-text uppercase">
                Who are you?
              </h2>
              <p className="text-xs text-pm-muted mt-1 font-medium font-sans">
                Your name helps the team follow up with your feedback.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name input */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-pm-muted">
                Your Name
              </label>
              <input
                id="reviewer-name-input"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Anika Sharma"
                maxLength={60}
                autoFocus
                className="w-full h-12 rounded-2xl bg-pm-surface-2 border border-pm-border text-pm-text px-4 text-sm
                           placeholder:text-pm-muted focus:outline-none focus:border-pm-accent transition-colors"
              />
            </div>

            {/* Color selection */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-pm-muted">
                Your Color
              </label>
              <div className="flex gap-2.5 flex-wrap">
                {REVIEWER_COLOR_OPTIONS.map(({ token, hex }) => (
                  <button
                    key={token}
                    type="button"
                    onClick={() => setSelectedColor(token)}
                    title={token}
                    className="w-8 h-8 rounded-full border-2 transition-all focus:outline-none cursor-pointer"
                    style={{
                      backgroundColor: hex,
                      borderColor: selectedColor === token ? '#fff' : 'transparent',
                      boxShadow: selectedColor === token ? `0 0 0 3px ${hex}40` : 'none',
                      transform: selectedColor === token ? 'scale(1.15)' : 'scale(1)',
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Error message */}
            {error && (
              <p className="text-rose-500 text-xs px-1 font-bold">{error}</p>
            )}

            {/* Submit */}
            <button
              id="reviewer-name-submit"
              type="submit"
              disabled={!displayName.trim() || loading}
              className="w-full h-12 rounded-2xl bg-pm-accent hover:bg-pm-accent-bright
                         text-white font-black uppercase tracking-widest text-xs shadow-md cursor-pointer
                         transition-all disabled:opacity-30 disabled:cursor-not-allowed
                         flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Start Leaving Feedback'
              )}
            </button>
          </form>

          <p className="text-center text-[10px] text-pm-muted/60 font-mono">
            Powered by STAGE · Visual Feedback Platform
          </p>
        </div>
      </div>
    </div>
  )
}
