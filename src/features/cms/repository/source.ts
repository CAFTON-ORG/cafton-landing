import "server-only";

import { isDatabaseConfigured } from "@/lib/env";

/**
 * Where a read gets its content:
 *
 * - No database configured (CI, a fresh clone): the bundled content in
 *   `features/cms/content`, exactly what the site shipped with.
 * - Database configured but this content type was never populated (migrations run,
 *   seed not yet): the bundled content too, so a forgotten seed can never blank
 *   the site. Once any row exists, even an unpublished or deleted one, the
 *   database is authoritative and editors can unpublish everything on purpose.
 * - The database fails: log it and serve the bundled content rather than break
 *   the page or the build.
 */
export async function readContent<T>(
  label: string,
  source: { populated: () => Promise<number>; query: () => Promise<T> },
  bundled: () => T,
): Promise<T> {
  if (!isDatabaseConfigured) return bundled();
  try {
    if ((await source.populated()) === 0) return bundled();
    return await source.query();
  } catch (error) {
    console.error(`CMS: reading ${label} from the database failed; serving the bundled content.`, error);
    return bundled();
  }
}

/** Optional column to optional field: null becomes undefined, so shapes match the bundled content. */
export const opt = <T>(value: T | null | undefined): T | undefined => value ?? undefined;

/** Only published, not deleted, rows are public. */
export const publicRows = { status: "published", deletedAt: null } as const;
