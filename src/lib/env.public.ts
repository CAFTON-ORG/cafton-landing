/**
 * Environment that is safe in the browser (NEXT_PUBLIC_ only). Server code that
 * needs the full, validated environment imports `@/lib/env` instead.
 */
export const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
);
