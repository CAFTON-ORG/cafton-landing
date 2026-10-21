import "server-only";

import { z } from "zod";

const optionalString = z.string().min(1).optional();

/**
 * Server environment, validated once. Everything is optional here so the
 * public site builds and runs without the platform services; code that needs a
 * value calls `requireEnv` and fails with a clear message at the point of use.
 */
const schema = z.object({
  // Public site (existing)
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: optionalString,
  TURNSTILE_SECRET_KEY: optionalString,

  // Platform: database (Prisma). DATABASE_URL is pooled, DIRECT_URL is for migrations.
  DATABASE_URL: optionalString,
  DIRECT_URL: optionalString,
  DATABASE_POOL_MAX: z.coerce.number().int().positive().optional(),

  // Platform: Supabase (Auth + Storage only)
  NEXT_PUBLIC_SUPABASE_URL: z.url().optional(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: optionalString,

  // Platform: email
  RESEND_API_KEY: optionalString,
  MAIL_FROM: optionalString,

  // Platform: site
  SITE_URL: z.url().optional(),
});

const blank = (value: string | undefined) => value || undefined;

const parsed = schema.safeParse(
  Object.fromEntries(Object.keys(schema.shape).map((key) => [key, blank(process.env[key])])),
);

if (!parsed.success) {
  throw new Error(`Invalid environment: ${parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ")}`);
}

export const env = parsed.data;

export const isProduction = process.env.NODE_ENV === "production";

/** DATABASE_URL set: Prisma can be used. */
export const isDatabaseConfigured = Boolean(env.DATABASE_URL);

/** Read a value the calling feature cannot work without. */
export function requireEnv<K extends keyof typeof env>(key: K): NonNullable<(typeof env)[K]> {
  const value = env[key];
  if (value === undefined) {
    throw new Error(`Missing environment variable ${key}. See .env.example.`);
  }
  return value as NonNullable<(typeof env)[K]>;
}
