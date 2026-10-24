import "server-only";

import { createClient } from "@supabase/supabase-js";

import { env } from "@/lib/env";

/**
 * Whether files that only the server may touch can be stored: the project address and the
 * service-role key are both set.
 */
export const isAdminStorageConfigured = Boolean(
  env.NEXT_PUBLIC_SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY,
);

/**
 * A Supabase client that acts as the project itself, not as a signed-in person: it bypasses row
 * level security and storage policies. That is the point and the danger. Use it only on the server,
 * only after the app has checked the person's permission, and only for data that must not be
 * reachable by every signed-in staff account (the private `crm-files` bucket). The key never
 * reaches the browser: no `NEXT_PUBLIC_` prefix, and this module is `server-only`.
 */
export function createAdminClient() {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. See .env.example.",
    );
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
