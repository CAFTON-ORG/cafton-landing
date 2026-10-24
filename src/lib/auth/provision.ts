interface Claims {
  email?: unknown;
  app_metadata?: { provider?: unknown; providers?: unknown } | null;
}

/**
 * The email an invite may be claimed with, or null. It comes only from the signed
 * token's own email claim and the server-written app_metadata. user_metadata is
 * editable by the user and is never consulted. Google is the only sign-in method
 * and verifies the address before issuing it.
 */
export function inviteEmailFromClaims(claims: Claims | null | undefined): string | null {
  if (!claims || typeof claims.email !== "string") return null;
  const meta = claims.app_metadata;
  const viaGoogle =
    meta?.provider === "google" ||
    (Array.isArray(meta?.providers) && meta.providers.includes("google"));
  if (!viaGoogle) return null;
  const email = claims.email.trim().toLowerCase();
  return email.includes("@") ? email : null;
}
