import "server-only";

import { prisma } from "@/lib/db";
import { isDatabaseConfigured } from "@/lib/env";
import type { ActivityView, Subject } from "../types";

export async function listActivities(subject: Subject, limit = 100): Promise<ActivityView[]> {
  if (!isDatabaseConfigured) return [];
  const rows = await prisma.activity.findMany({
    where: subject,
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    body: row.body,
    by: row.createdByName,
    at: row.createdAt.toISOString(),
  }));
}
