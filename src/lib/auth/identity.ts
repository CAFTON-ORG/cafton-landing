type Metadata = Record<string, unknown> | null | undefined;

/**
 * user_metadata can be edited by the signed-in user, so it is never trusted
 * as-is: the photo must be an https URL on Google's image host.
 */
export function googleAvatarUrl(metadata: Metadata) {
  const value = metadata?.avatar_url ?? metadata?.picture;
  if (typeof value !== "string") return undefined;
  try {
    const url = new URL(value);
    const ok = url.protocol === "https:" && url.hostname.endsWith(".googleusercontent.com");
    return ok ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

export function googleName(metadata: Metadata) {
  const value = metadata?.full_name ?? metadata?.name;
  return typeof value === "string" && value.trim() ? value.trim().slice(0, 120) : undefined;
}
