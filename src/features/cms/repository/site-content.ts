import "server-only";

import type { z } from "zod";

import { prisma } from "@/lib/db";
import { fillDefaults } from "../lib/fill-defaults";
import { readContent } from "./source";

/**
 * Reads one document of site content (`site_content` row). Same promise as every other
 * read: the bundled content before the first seed or when the database fails, and also
 * when a stored document no longer matches its shape (fields added since it was saved are filled
 * in from the bundled content first, unless `fill` is off for a document whose keys are
 * themselves data, such as per-page overrides), so a bad edit can never break a page.
 */
export async function readSiteDocument<T>(
  key: string,
  schema: z.ZodType<T>,
  bundled: T,
  { fill = true }: { fill?: boolean } = {},
): Promise<T> {
  return readContent(
    `site document "${key}"`,
    {
      populated: () => prisma.siteContent.count({ where: { key } }),
      query: async () => {
        const row = await prisma.siteContent.findUnique({ where: { key } });
        const parsed = schema.safeParse(fill ? fillDefaults(row?.data, bundled) : row?.data);
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
