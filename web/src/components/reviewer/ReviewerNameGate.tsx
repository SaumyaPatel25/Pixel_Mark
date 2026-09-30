'use client'
import { useState } from 'react'
import { UserRound } from 'lucide-react'
import { StageSpinner } from '@/components/ui/StageLoader'
import { api } from '@/lib/api'
import { setStoredReviewerIdentity } from '@/lib/reviewerIdentity'
import { ReviewerIdentity } from '@/types/markers'

interface ReviewerNameGateProps {
  sessionId: string
  onIdentityReady: (identity: ReviewerIdentity) => void
}

// Ordered list of tasteful pastel / primary colors for new reviewers (curated palette)
const REVIEWER_COLOR_OPTIONS = [
  { token: 'cobalt', hex: '#2B4CFF' },
  { token: 'emerald', hex: '#137333' },
  { token: 'rose', hex: '#E8615A' },
  { token: 'amber', hex: '#B06000' },
  { token: 'lilac', hex: '#7C4DFF' },
  { token: 'slate', hex: '#5F5A66' },
]

export default function ReviewerNameGate({ sessionId, onIdentityReady }: ReviewerNameGateProps) {
  const [displayName, setDisplayName] = useState('')
  const [selectedColor, setSelectedColor] = useState<string>('cobalt')
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs">
      {/* Outer Bezel */}
      <div className="w-full max-w-sm mx-4 p-2 rounded-[2.25rem] bg-slate-900/[0.05] dark:bg-white/[0.08] border border-slate-200/80 dark:border-white/10 shadow-2xl overflow-hidden transition-all duration-300">
        
        {/* Inner Card */}
        <div className="p-7 rounded-[1.875rem] bg-white dark:bg-[#16141A] space-y-6">
          
          {/* Icon + Title (Section 9 exact copy) */}
          <div className="text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#EBF1FE] border border-[#D2E3FC] flex items-center justify-center mx-auto shadow-2xs">
              <UserRound className="w-6 h-6 text-[#1A73E8]" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold tracking-tight text-[#16141A] dark:text-white">
                What is your name?
              </h2>
              <p className="text-xs text-pm-muted mt-1.5 font-sans leading-relaxed">
                Click any part of the page to comment on it. Nothing to install.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name input (Section 9 placeholder) */}
            <div className="space-y-1.5">
              <input
                id="reviewer-name-input"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                maxLength={60}
                autoFocus
                className="w-full h-12 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-[#16141A] dark:text-white px-4 text-sm font-sans placeholder:text-slate-400 focus:outline-none focus:border-[#2B4CFF] transition-colors"
              />
            </div>

            {/* Subtle Color Accent */}
            <div className="flex items-center justify-center gap-2 pt-1">
              {REVIEWER_COLOR_OPTIONS.map(({ token, hex }) => (
                <button
                  key={token}
                  type="button"
                  onClick={() => setSelectedColor(token)}
                  title={token}
                  className="w-6 h-6 rounded-full border-2 transition-all focus:outline-none cursor-pointer"
                  style={{
                    backgroundColor: hex,
                    borderColor: selectedColor === token ? '#fff' : 'transparent',
                    boxShadow: selectedColor === token ? `0 0 0 2px ${hex}` : 'none',
                    transform: selectedColor === token ? 'scale(1.15)' : 'scale(1)',
                  }}
                />
              ))}
            </div>

            {/* Error message */}
            {error && (
              <p className="text-[#9E2A2B] bg-[#FCE7E4] p-2 rounded-xl text-xs font-mono font-medium">{error}</p>
            )}

            {/* Submit Button (Section 9 exact copy) */}
            <button
              id="reviewer-name-submit"
              type="submit"
              disabled={!displayName.trim() || loading}
              className="w-full h-12 rounded-full bg-[#16141A] hover:bg-black dark:bg-white dark:hover:bg-slate-100 text-white dark:text-[#16141A] font-mono font-bold uppercase tracking-wider text-xs shadow-sm cursor-pointer transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <StageSpinner size={16} variant="white" />
              ) : (
                'Continue'
              )}
            </button>
          </form>

          <p className="text-center text-[10px] text-pm-muted font-mono">
            Share. Review. Fix. · No card or login needed
          </p>
        </div>
      </div>
    </div>
  )
}
