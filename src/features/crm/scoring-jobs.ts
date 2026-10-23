import "server-only";

import { prisma } from "@/lib/db";
import { isDatabaseConfigured } from "@/lib/env";
import { live } from "./mappers";
import { scoreLead } from "./scoring";

/**
 * Stores a score on leads that have none yet: every lead that existed before scoring was added, and
 * any that were written another way. New website enquiries are scored as they arrive. Safe to run
 * repeatedly; it only touches unscored leads, a batch at a time.
 */
export async function scoreUnscoredLeads(limit = 500): Promise<number> {
  if (!isDatabaseConfigured) return 0;
  const rows = await prisma.lead.findMany({
    where: { ...live, score: null },
    take: limit,
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      budget: true,
      timeline: true,
      phone: true,
      email: true,
      businessName: true,
      answers: true,
    },
  });
  for (const row of rows) {
    const answers =
      row.answers && typeof row.answers === "object" && !Array.isArray(row.answers)
        ? (row.answers as Record<string, unknown>)
        : null;
    const { score } = scoreLead({ ...row, answers });
    await prisma.lead.updateMany({ where: { id: row.id, score: null }, data: { score } });
  }
  return rows.length;
}
