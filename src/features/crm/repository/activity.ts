import "server-only";

import { prisma } from "@/lib/db";
import { isDatabaseConfigured } from "@/lib/env";
import { namesFor } from "./mappers";
import type { ActivityView, Subject } from "../types";

export async function listActivities(subject: Subject, limit = 100): Promise<ActivityView[]> {
  if (!isDatabaseConfigured) return [];
  const rows = await prisma.activity.findMany({
    where: subject,
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  const people = await namesFor(rows.map((row) => row.createdBy));
  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    body: row.body,
    by: row.createdByName,
    byId: row.createdBy ?? undefined,
    pinned: row.pinned,
    edited: row.editedAt !== null,
    byAvatar: row.createdBy ? people.get(row.createdBy)?.avatarUrl : undefined,
    at: row.createdAt.toISOString(),
  }));
}
