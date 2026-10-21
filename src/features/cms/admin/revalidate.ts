import "server-only";

import { revalidatePath } from "next/cache";

/**
 * Public pages are generated ahead of time. After any content change, mark the pages
 * that show it as stale so the next visit regenerates them from the database. The
 * dashboard's own pages are revalidated too, so lists and counts are current.
 */
export function revalidatePublicContent() {
  for (const path of ["/", "/blog", "/portfolio", "/events", "/services", "/sitemap.xml"])
    revalidatePath(path);
  for (const pattern of [
    "/blog/[slug]",
    "/portfolio/[slug]",
    "/events/[slug]",
    "/services/[slug]",
  ]) {
    revalidatePath(pattern, "page");
  }
  revalidatePath("/dashboard/content", "layout");
  revalidatePath("/dashboard/audit");
}
