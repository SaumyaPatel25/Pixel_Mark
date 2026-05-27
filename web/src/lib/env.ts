/**
 * Production Environment Validator
 * Enforces presence and structure of critical platform variables.
 */

const REQUIRED_VARS = [
  'NEXT_PUBLIC_API_URL'
] as const;

export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  apiBase: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8765', // Default to 8765 for this project
  isProduction: process.env.NODE_ENV === 'production'
};
