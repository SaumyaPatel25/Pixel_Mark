export interface ColorTheme {
  bg: string
  border: string
  text: string
  dot: string
}

export const MARKER_COLOR_MAP: Record<string, ColorTheme> = {
  // Named Tailwind-inspired color tokens
  coral: { bg: '#fee2e2', border: '#f87171', text: '#991b1b', dot: '#ef4444' },
  rose: { bg: '#ffe4e6', border: '#fb7185', text: '#9f1239', dot: '#f43f5e' },
  blue: { bg: '#dbeafe', border: '#60a5fa', text: '#1e3a8a', dot: '#3b82f6' },
  sky: { bg: '#e0f2fe', border: '#38bdf8', text: '#075985', dot: '#0ea5e9' },
  emerald: { bg: '#d1fae5', border: '#34d399', text: '#065f46', dot: '#10b981' },
  green: { bg: '#dcfce7', border: '#4ade80', text: '#166534', dot: '#22c55e' },
  amber: { bg: '#fef3c7', border: '#fbbf24', text: '#92400e', dot: '#f59e0b' },
  yellow: { bg: '#fef9c3', border: '#facc15', text: '#854d0e', dot: '#eab308' },
  violet: { bg: '#ede9fe', border: '#a78bfa', text: '#5b21b6', dot: '#8b5cf6' },
  purple: { bg: '#f3e8ff', border: '#c084fc', text: '#6b21a8', dot: '#a855f7' },
  magenta: { bg: '#fdf2f8', border: '#f472b6', text: '#9d174d', dot: '#ec4899' },
  indigo: { bg: '#e0e7ff', border: '#818cf8', text: '#3730a3', dot: '#6366f1' },
}

const DEFAULT_COLOR: ColorTheme = {
  bg: '#f1f5f9',
  border: '#cbd5e1',
  text: '#334155',
  dot: '#64748b',
}

/**
 * Deterministically resolves a color token or color hex to a cohesive design token.
 * Falls back to a neutral gray slate palette.
 */
export function getMarkerColors(tokenOrHex: string | null | undefined): ColorTheme {
  if (!tokenOrHex) return DEFAULT_COLOR

  const clean = tokenOrHex.trim().toLowerCase()
  if (clean in MARKER_COLOR_MAP) {
    return MARKER_COLOR_MAP[clean]
  }

  // If it's a hex code, let's derive styling or check if it matches a mapped hex
  // Or check if we can return a default based on custom matching
  for (const [key, value] of Object.entries(MARKER_COLOR_MAP)) {
    if (value.dot.toLowerCase() === clean) {
      return value
    }
  }

  // If clean is a custom hex, construct a basic aesthetic on the fly
  if (clean.startsWith('#')) {
    return {
      bg: `${clean}15`, // ~8% opacity
      border: `${clean}40`, // ~25% opacity
      text: clean,
      dot: clean,
    }
  }

  return DEFAULT_COLOR
}
