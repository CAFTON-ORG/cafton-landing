import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { isDatabaseConfigured } from "@/lib/env";
import { namesFor } from "../mappers";
import { fullName } from "../rules";
import type { Subject, TaskView } from "../types";

const include = {
  lead: { select: { id: true, reference: true, firstName: true, lastName: true } },
  contact: { select: { id: true, firstName: true, lastName: true } },
  deal: { select: { id: true, title: true, reference: true } },
} satisfies Prisma.TaskInclude;

async function toTasks(
  rows: Prisma.TaskGetPayload<{ include: typeof include }>[],
): Promise<TaskView[]> {
  const names = await namesFor(rows.map((row) => row.assigneeId));
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    dueAt: row.dueAt?.toISOString(),
    doneAt: row.doneAt?.toISOString(),
    assigneeId: row.assigneeId ?? undefined,
    assigneeName: row.assigneeId ? names.get(row.assigneeId)?.name : undefined,
    assigneeAvatar: row.assigneeId ? names.get(row.assigneeId)?.avatarUrl : undefined,
    subject: row.deal
      ? { kind: "deal", id: row.deal.id, label: row.deal.title }
      : row.lead
        ? { kind: "lead", id: row.lead.id, label: `${row.lead.reference} ${fullName(row.lead)}` }
        : row.contact
          ? { kind: "contact", id: row.contact.id, label: fullName(row.contact) }
          : undefined,
  }));
}

/** Open tasks first (soonest due on top, undated last), then recently finished ones. */
export async function listTasks(filter: {
  scope: "mine" | "all";
  state: "open" | "done" | "overdue";
  staffId?: string | null;
  now?: Date;
}): Promise<TaskView[]> {
  if (!isDatabaseConfigured) return [];
  const now = filter.now ?? new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const where: Prisma.TaskWhereInput = {
    ...(filter.scope === "mine" && filter.staffId ? { assigneeId: filter.staffId } : {}),
    ...(filter.state === "done"
      ? { doneAt: { not: null } }
      : filter.state === "overdue"
        ? { doneAt: null, dueAt: { lt: startOfToday } }
        : { doneAt: null }),
  };
  const rows = await prisma.task.findMany({
    where,
    include,
    orderBy:
      filter.state === "done"
        ? { doneAt: "desc" }
        : [{ dueAt: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
    take: 200,
  });
  return toTasks(rows);
}

export async function listTasksFor(subject: Subject): Promise<TaskView[]> {
  if (!isDatabaseConfigured) return [];
  const rows = await prisma.task.findMany({
    where: subject,
    include,
    orderBy: [
      { doneAt: { sort: "asc", nulls: "first" } },
      { dueAt: { sort: "asc", nulls: "last" } },
    ],
  });
  return toTasks(rows);
}

export async function countOpenTasks(staffId: string | null, now: Date = new Date()) {
  if (!isDatabaseConfigured) return { open: 0, overdue: 0 };
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const mine = staffId ? { assigneeId: staffId } : {};
  const [open, overdue] = await Promise.all([
    prisma.task.count({ where: { ...mine, doneAt: null } }),
    prisma.task.count({ where: { ...mine, doneAt: null, dueAt: { lt: startOfToday } } }),
  ]);
  return { open, overdue };
}
