// Supabase is deprecated in favor of Neon DB / Backend API
// This file is kept as a dummy to avoid breaking existing imports during transition

export const supabase = {
  from: () => ({
    select: () => ({
      eq: () => ({
        single: () => Promise.resolve({ data: null, error: null }),
      }),
    }),
    update: () => ({
      eq: () => Promise.resolve({ error: null }),
    }),
  }),
} as any

export type AuthUser = {
  id: string
  email: string
  user_metadata: {
    full_name?: string
    avatar_url?: string
  }
}
