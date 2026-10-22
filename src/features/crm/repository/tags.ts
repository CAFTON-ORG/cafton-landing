import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { isDatabaseConfigured } from "@/lib/env";
import type { Taggable } from "../tags";

const TABLE: Record<Taggable, string> = {
  lead: "leads",
  contact: "contacts",
  organization: "organizations",
  deal: "deals",
};

/** Every tag in use on one kind of record, A to Z, for suggestions and the filter. */
export async function listTagOptions(kind: Taggable): Promise<string[]> {
  if (!isDatabaseConfigured) return [];
  const rows = await prisma.$queryRaw<{ tag: string }[]>(
    Prisma.sql`SELECT DISTINCT unnest(tags) AS tag FROM ${Prisma.raw(`"${TABLE[kind]}"`)} WHERE deleted_at IS NULL ORDER BY tag`,
  );
  return rows.map((row) => row.tag);
}
