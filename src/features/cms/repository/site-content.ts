import "server-only";

import type { z } from "zod";

import { prisma } from "@/lib/db";
import { readContent } from "./source";

/**
 * Reads one document of site content (`site_content` row). Same promise as every other
 * read: the bundled content before the first seed or when the database fails, and also
 * when a stored document no longer matches its shape, so a bad edit can never break a page.
 */
export async function readSiteDocument<T>(
  key: string,
  schema: z.ZodType<T>,
  bundled: T,
): Promise<T> {
  return readContent(
    `site document "${key}"`,
    {
      populated: () => prisma.siteContent.count({ where: { key } }),
      query: async () => {
        const row = await prisma.siteContent.findUnique({ where: { key } });
        const parsed = schema.safeParse(row?.data);
        if (parsed.success) return parsed.data;
        console.error(
          `CMS: site document "${key}" is malformed; serving the bundled content.`,
          parsed.error.issues,
        );
        return bundled;
      },
    },
    () => bundled,
  );
}
