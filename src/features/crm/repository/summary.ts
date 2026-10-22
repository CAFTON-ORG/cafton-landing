import "server-only";

import { prisma } from "@/lib/db";

type Kind = "lead" | "contact" | "deal";
const FIELD = { lead: "leadId", contact: "contactId", deal: "dealId" } as const;

export interface ActivitySummary {
  lastContactedAt?: string;
  nextActivityAt?: string;
}

const earliest = (a?: Date | null, b?: Date | null) =>
  a && b ? (a < b ? a : b) : (a ?? b ?? undefined);
const latest = (a?: Date | null, b?: Date | null) =>
  a && b ? (a > b ? a : b) : (a ?? b ?? undefined);

/**
 * For a page of records: when someone last wrote, called, emailed or met them, and the soonest
 * thing still to do (an open task or an upcoming meeting). Four grouped queries for the whole page.
 */
export async function activitySummary(
  kind: Kind,
  ids: string[],
  now = new Date(),
): Promise<Map<string, ActivitySummary>> {
  const result = new Map<string, ActivitySummary>();
  if (ids.length === 0) return result;
  const field = FIELD[kind];
  const where = { [field]: { in: ids } };

  const [notes, held, tasks, meetings] = await Promise.all([
    prisma.activity.groupBy({
      by: [field],
      where: { ...where, type: { in: ["note", "call", "email", "meeting"] } },
      _max: { createdAt: true },
    }),
    prisma.meeting.groupBy({
      by: [field],
      where: { ...where, status: "completed" },
      _max: { startsAt: true },
    }),
    prisma.task.groupBy({
      by: [field],
      where: { ...where, doneAt: null, dueAt: { not: null } },
      _min: { dueAt: true },
    }),
    prisma.meeting.groupBy({
      by: [field],
      where: { ...where, status: { in: ["requested", "confirmed"] }, startsAt: { gte: now } },
      _min: { startsAt: true },
    }),
  ]);

  const get = (id: string | null) => {
    const key = id ?? "";
    if (!result.has(key)) result.set(key, {});
    return result.get(key)!;
  };
  const lastOf = new Map<string, Date>();
  for (const row of notes as { [k: string]: unknown; _max: { createdAt: Date | null } }[]) {
    const id = row[field] as string | null;
    if (id) lastOf.set(id, latest(lastOf.get(id), row._max.createdAt)!);
  }
  for (const row of held as { [k: string]: unknown; _max: { startsAt: Date | null } }[]) {
    const id = row[field] as string | null;
    if (id) lastOf.set(id, latest(lastOf.get(id), row._max.startsAt)!);
  }
  const nextOf = new Map<string, Date>();
  for (const row of tasks as { [k: string]: unknown; _min: { dueAt: Date | null } }[]) {
    const id = row[field] as string | null;
    if (id) nextOf.set(id, earliest(nextOf.get(id), row._min.dueAt)!);
  }
  for (const row of meetings as { [k: string]: unknown; _min: { startsAt: Date | null } }[]) {
    const id = row[field] as string | null;
    if (id) nextOf.set(id, earliest(nextOf.get(id), row._min.startsAt)!);
  }
  for (const [id, at] of lastOf) get(id).lastContactedAt = at.toISOString();
  for (const [id, at] of nextOf) get(id).nextActivityAt = at.toISOString();
  return result;
}

/** Adds `lastContactedAt` and `nextActivityAt` to each record of a page. */
export async function withActivity<T extends { id: string }>(
  kind: Kind,
  items: T[],
): Promise<(T & ActivitySummary)[]> {
  const summary = await activitySummary(
    kind,
    items.map((item) => item.id),
  );
  return items.map((item) => ({ ...item, ...summary.get(item.id) }));
}
