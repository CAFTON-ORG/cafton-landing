/** Everything about where media lives and how it is addressed. Pure: safe in the browser and on the server. */

export const MEDIA_BUCKET = "media";

/**
 * Largest file the dashboard accepts. Uploads go through a Server Action, and hosts
 * cap request bodies (Vercel: 4.5 MB), so this is a little under that.
 */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export type MediaExtension = "jpg" | "png" | "webp";

const MEDIA_PATH =
  /^content\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/;

/** Stored paths are always `content/<uuid>.<ext>`: nothing the uploader typed ends up in a path. */
export const isMediaPath = (value: string) => MEDIA_PATH.test(value);

export const newMediaPath = (extension: MediaExtension) =>
  `content/${crypto.randomUUID()}.${extension}`;

/** Public address of a stored file. Empty when Supabase is not configured. */
export function mediaPublicUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return base ? `${base.replace(/\/+$/, "")}/storage/v1/object/public/${MEDIA_BUCKET}/${path}` : "";
}

/** The storage path inside one of our public URLs, or null for anything else (a /public path, another host). */
export function mediaPathFromUrl(url: string): string | null {
  const marker = `/storage/v1/object/public/${MEDIA_BUCKET}/`;
  const at = url.indexOf(marker);
  if (at === -1) return null;
  const path = url.slice(at + marker.length).split(/[?#]/)[0];
  return isMediaPath(path) ? path : null;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
