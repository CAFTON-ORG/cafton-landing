import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { live, namesFor, type People } from "@/features/crm/mappers";
import { fullName } from "@/features/crm/rules";
import { prisma } from "@/lib/db";
import { isDatabaseConfigured } from "@/lib/env";
import { paginate, type Page } from "@/lib/pagination";
import type { TableParams } from "@/lib/table-params";
import type { MilestoneStatus, ProjectStatus, TaskPriority, TaskStatus, TimeStatus } from "./rules";
import type {
  MemberView,
  MilestoneView,
  ProjectRow,
  ProjectView,
  TaskCount,
  TaskView,
  TimeEntryView,
} from "./types";

const day = (date: Date | null) => (date ? date.toISOString().slice(0, 10) : undefined);
const iso = (date: Date | null) => (date ? date.toISOString() : undefined);
const num = (value: bigint | null) => (value === null ? undefined : Number(value));

const emptyPage = (pageSize: number): Page<ProjectRow> => ({
  items: [],
  total: 0,
  page: 1,
  pageSize,
  pageCount: 1,
});

/* ----------------------------------------------------------------- counting */

/** Done and total tasks for a set of projects (or milestones), by id. */
async function taskCounts(
  by: "projectId" | "milestoneId",
  ids: string[],
): Promise<Map<string, TaskCount>> {
  const counts = new Map<string, TaskCount>();
  if (ids.length === 0) return counts;
  const rows = await prisma.projectTask.groupBy({
    by: [by, "status"],
    where: { [by]: { in: ids } },
    _count: { _all: true },
  });
  for (const row of rows) {
    const key = row[by];
    if (!key) continue;
    const entry = counts.get(key) ?? { total: 0, done: 0 };
    entry.total += row._count._all;
    if (row.status === "done") entry.done += row._count._all;
    counts.set(key, entry);
  }
  return counts;
}

/** Minutes of time per project, for entries in the given states. */
async function minutesByProject(
  ids: string[],
  statuses: ("draft" | "submitted" | "approved" | "rejected")[],
): Promise<Map<string, number>> {
  const totals = new Map<string, number>();
  if (ids.length === 0) return totals;
  const rows = await prisma.timeEntry.groupBy({
    by: ["projectId"],
    where: { projectId: { in: ids }, status: { in: statuses } },
    _sum: { minutes: true },
  });
  for (const row of rows) totals.set(row.projectId, row._sum.minutes ?? 0);
  return totals;
}

/* ----------------------------------------------------------------- projects */

const include = {
  contact: { select: { firstName: true, lastName: true } },
  organization: { select: { name: true } },
  deal: { select: { title: true } },
  quote: { select: { reference: true } },
} satisfies Prisma.ProjectInclude;

type Full = Prisma.ProjectGetPayload<{ include: typeof include }>;

function toRow(
  row: Full,
  people: People,
  tasks: Map<string, TaskCount>,
  approved: Map<string, number>,
): ProjectRow {
  return {
    id: row.id,
    reference: row.reference,
    name: row.name,
    status: row.status as ProjectStatus,
    clientName: row.organization?.name ?? (row.contact ? fullName(row.contact) : undefined),
    manager: row.managerId ? people.get(row.managerId) : undefined,
    startDate: day(row.startDate),
    dueDate: day(row.dueDate),
    budgetMinor: num(row.budgetMinor),
    currency: row.currency,
    tasks: tasks.get(row.id) ?? { total: 0, done: 0 },
    approvedMinutes: approved.get(row.id) ?? 0,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listProjects(
  params: TableParams,
  staffId?: string | null,
): Promise<Page<ProjectRow>> {
  if (!isDatabaseConfigured) return emptyPage(params.pageSize);

  const q = params.q.trim();
  const where: Prisma.ProjectWhereInput = {
    ...live,
    ...(params.filters.status ? { status: params.filters.status as ProjectStatus } : {}),
    ...(params.filters.manager === "me" && staffId ? { managerId: staffId } : {}),
    ...(params.filters.manager === "none" ? { managerId: null } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { reference: { contains: q, mode: "insensitive" } },
            { organization: { name: { contains: q, mode: "insensitive" } } },
            { contact: { lastName: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };
  const dir = params.dir;
  const orderBy: Prisma.ProjectOrderByWithRelationInput =
    params.sort === "name"
      ? { name: dir }
      : params.sort === "status"
        ? { status: dir }
        : params.sort === "due"
          ? { dueDate: { sort: dir, nulls: "last" } }
          : { createdAt: dir };

  const total = await prisma.project.count({ where });
  const base = paginate(new Array(total), params.page, params.pageSize); // page maths only
  const rows = await prisma.project.findMany({
    where,
    include,
    orderBy,
    skip: (base.page - 1) * base.pageSize,
    take: base.pageSize,
  });
  const ids = rows.map((row) => row.id);
  const [people, tasks, approved] = await Promise.all([
    namesFor(rows.map((row) => row.managerId)),
    taskCounts("projectId", ids),
    minutesByProject(ids, ["approved"]),
  ]);
  return { ...base, items: rows.map((row) => toRow(row, people, tasks, approved)) };
}

export async function getProject(id: string): Promise<ProjectView | null> {
  if (!isDatabaseConfigured) return null;
  const row = await prisma.project.findFirst({ where: { id, ...live }, include }).catch(() => null);
  if (!row) return null;
  const [people, tasks, approved, logged, pending] = await Promise.all([
    namesFor([row.managerId]),
    taskCounts("projectId", [row.id]),
    minutesByProject([row.id], ["approved"]),
    minutesByProject([row.id], ["draft", "submitted", "approved"]),
    minutesByProject([row.id], ["submitted"]),
  ]);
  return {
    ...toRow(row, people, tasks, approved),
    description: row.description ?? undefined,
    dealId: row.dealId ?? undefined,
    dealTitle: row.deal?.title,
    quoteId: row.quoteId ?? undefined,
    quoteReference: row.quote?.reference,
    contactId: row.contactId ?? undefined,
    organizationId: row.organizationId ?? undefined,
    budgetMinutes: row.budgetMinutes ?? undefined,
    portfolioSlug: row.portfolioSlug ?? undefined,
    completedAt: iso(row.completedAt),
    loggedMinutes: logged.get(row.id) ?? 0,
    pendingMinutes: pending.get(row.id) ?? 0,
  };
}

/** Projects for a picker: the open ones, newest first. */
export async function listProjectOptions(): Promise<
  { id: string; name: string; reference: string }[]
> {
  if (!isDatabaseConfigured) return [];
  const rows = await prisma.project.findMany({
    where: { ...live, status: { in: ["planned", "active", "on_hold"] } },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, reference: true },
  });
  return rows;
}

/** Won deals that have no project yet: what a project can be started from by hand. */
export async function listDealsReadyForProject(): Promise<{ id: string; title: string }[]> {
  if (!isDatabaseConfigured) return [];
  const rows = await prisma.deal.findMany({
    where: { ...live, stage: { kind: "won" }, projects: { none: { ...live } } },
    orderBy: { wonAt: "desc" },
    take: 100,
    select: { id: true, title: true, reference: true },
  });
  return rows.map((row) => ({ id: row.id, title: `${row.title} (${row.reference})` }));
}

/* -------------------------------------------------------------------- team */

export async function listMembers(projectId: string): Promise<MemberView[]> {
  if (!isDatabaseConfigured) return [];
  const rows = await prisma.projectMember.findMany({
    where: { projectId },
    orderBy: { createdAt: "asc" },
  });
  const [people, logged] = await Promise.all([
    namesFor(rows.map((row) => row.profileId)),
    prisma.timeEntry.groupBy({
      by: ["profileId"],
      where: { projectId, status: { in: ["draft", "submitted", "approved"] } },
      _sum: { minutes: true },
    }),
  ]);
  const minutes = new Map(logged.map((row) => [row.profileId, row._sum.minutes ?? 0]));
  return rows.map((row) => {
    const person = people.get(row.profileId);
    return {
      id: row.id,
      profileId: row.profileId,
      name: person?.name ?? "Former team member",
      avatarUrl: person?.avatarUrl,
      costRateMinor: num(row.costRateMinor),
      loggedMinutes: minutes.get(row.profileId) ?? 0,
    };
  });
}

/* -------------------------------------------------------------- milestones */

export async function listMilestones(projectId: string): Promise<MilestoneView[]> {
  if (!isDatabaseConfigured) return [];
  const rows = await prisma.milestone.findMany({
    where: { projectId },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
  });
  const counts = await taskCounts(
    "milestoneId",
    rows.map((row) => row.id),
  );
  return rows.map((row) => ({
    id: row.id,
    projectId: row.projectId,
    name: row.name,
    description: row.description ?? undefined,
    dueDate: day(row.dueDate),
    status: row.status as MilestoneStatus,
    billable: row.billable,
    amountMinor: num(row.amountMinor),
    completedAt: iso(row.completedAt),
    tasks: counts.get(row.id) ?? { total: 0, done: 0 },
  }));
}

/* ------------------------------------------------------------------- tasks */

const taskInclude = { milestone: { select: { name: true } } } satisfies Prisma.ProjectTaskInclude;

export async function listTasks(projectId: string): Promise<TaskView[]> {
  if (!isDatabaseConfigured) return [];
  const rows = await prisma.projectTask.findMany({
    where: { projectId },
    include: taskInclude,
    orderBy: [{ status: "asc" }, { position: "asc" }, { createdAt: "asc" }],
  });
  const [people, logged] = await Promise.all([
    namesFor(rows.map((row) => row.assigneeId)),
    prisma.timeEntry.groupBy({
      by: ["taskId"],
      where: {
        projectId,
        taskId: { not: null },
        status: { in: ["draft", "submitted", "approved"] },
      },
      _sum: { minutes: true },
    }),
  ]);
  const minutes = new Map(logged.map((row) => [row.taskId, row._sum.minutes ?? 0]));
  return rows.map((row) => ({
    id: row.id,
    projectId: row.projectId,
    milestoneId: row.milestoneId ?? undefined,
    milestoneName: row.milestone?.name,
    title: row.title,
    description: row.description ?? undefined,
    status: row.status as TaskStatus,
    priority: row.priority as TaskPriority,
    assignee: row.assigneeId ? people.get(row.assigneeId) : undefined,
    dueDate: day(row.dueDate),
    estimateMinutes: row.estimateMinutes ?? undefined,
    position: row.position,
    loggedMinutes: minutes.get(row.id) ?? 0,
    completedAt: iso(row.completedAt),
  }));
}

/** Open work assigned to one person across projects: what "My tasks" lists. */
export async function countOpenTasksFor(profileId: string): Promise<number> {
  if (!isDatabaseConfigured) return 0;
  return prisma.projectTask.count({
    where: {
      assigneeId: profileId,
      status: { not: "done" },
      project: { ...live, status: "active" },
    },
  });
}

/* ------------------------------------------------------------------ totals */

export interface ProjectTotals {
  active: number;
  planned: number;
  overdue: number;
  /** Hours waiting for someone to approve them, across all projects. */
  pendingApprovals: number;
}

/** The figures above the projects list. `today` is a Manila date. */
export async function projectTotals(today: string): Promise<ProjectTotals> {
  if (!isDatabaseConfigured) return { active: 0, planned: 0, overdue: 0, pendingApprovals: 0 };
  const [active, planned, overdue, pendingApprovals] = await Promise.all([
    prisma.project.count({ where: { ...live, status: "active" } }),
    prisma.project.count({ where: { ...live, status: "planned" } }),
    prisma.project.count({
      where: {
        ...live,
        status: { in: ["planned", "active", "on_hold"] },
        dueDate: { lt: new Date(`${today}T00:00:00Z`) },
      },
    }),
    prisma.timeEntry.count({ where: { status: "submitted" } }),
  ]);
  return { active, planned, overdue, pendingApprovals };
}

/* -------------------------------------------------------------------- time */

const entryInclude = {
  project: { select: { name: true, reference: true } },
  task: { select: { title: true } },
} satisfies Prisma.TimeEntryInclude;

type EntryRow = Prisma.TimeEntryGetPayload<{ include: typeof entryInclude }>;

async function toEntries(rows: EntryRow[]): Promise<TimeEntryView[]> {
  const people = await namesFor([...rows.map((row) => row.profileId), ...rows.map((row) => row.reviewedBy)]);
  return rows.map((row) => ({
    id: row.id,
    projectId: row.projectId,
    projectName: row.project.name,
    projectReference: row.project.reference,
    taskId: row.taskId ?? undefined,
    taskTitle: row.task?.title,
    person: people.get(row.profileId) ?? { id: row.profileId, name: "Former team member" },
    workDate: day(row.workDate) as string,
    weekStart: day(row.weekStart) as string,
    minutes: row.minutes,
    note: row.note ?? undefined,
    billable: row.billable,
    status: row.status as TimeStatus,
    reviewNote: row.reviewNote ?? undefined,
    reviewedByName: row.reviewedBy ? people.get(row.reviewedBy)?.name : undefined,
  }));
}

/** One person's entries for the week starting on `weekStart`, oldest day first. */
export async function listWeek(profileId: string, weekStart: string): Promise<TimeEntryView[]> {
  if (!isDatabaseConfigured) return [];
  const rows = await prisma.timeEntry.findMany({
    where: { profileId, weekStart: new Date(`${weekStart}T00:00:00Z`) },
    include: entryInclude,
    orderBy: [{ workDate: "asc" }, { createdAt: "asc" }],
  });
  return toEntries(rows);
}

export interface LoggableProject {
  id: string;
  name: string;
  reference: string;
  tasks: { id: string; title: string }[];
}

/** The projects a person can log hours on right now (they are on the team and it is under way), with their open tasks. */
export async function listLoggable(profileId: string): Promise<LoggableProject[]> {
  if (!isDatabaseConfigured) return [];
  const rows = await prisma.project.findMany({
    where: { ...live, status: "active", members: { some: { profileId } } },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      reference: true,
      tasks: {
        where: { status: { not: "done" } },
        orderBy: { createdAt: "asc" },
        select: { id: true, title: true },
      },
    },
  });
  return rows;
}

/** Time waiting for approval, oldest week first. */
export async function listSubmitted(): Promise<TimeEntryView[]> {
  if (!isDatabaseConfigured) return [];
  const rows = await prisma.timeEntry.findMany({
    where: { status: "submitted" },
    include: entryInclude,
    orderBy: [{ weekStart: "asc" }, { profileId: "asc" }, { workDate: "asc" }],
    take: 1000,
  });
  return toEntries(rows);
}

/** The latest entries on one project, any state. */
export async function listProjectTime(projectId: string, limit = 100): Promise<TimeEntryView[]> {
  if (!isDatabaseConfigured) return [];
  const rows = await prisma.timeEntry.findMany({
    where: { projectId },
    include: entryInclude,
    orderBy: [{ workDate: "desc" }, { createdAt: "desc" }],
    take: limit,
  });
  return toEntries(rows);
}
