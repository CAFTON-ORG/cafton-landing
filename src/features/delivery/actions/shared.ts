import "server-only";

import { revalidatePath } from "next/cache";

import { guard } from "@/features/crm/actions/guard";
import type { Tx } from "@/features/crm/actions/shared";
import { live } from "@/features/crm/repository/mappers";
import { ActionError } from "@/lib/actions";
import { parseMinor } from "@/lib/money";
import {
  checkTemplate,
  parseDuration,
  planFromTemplate,
  type CloseFacts,
  type ProjectStatus,
  type TemplateBody,
} from "../rules/core";

export { guard };
export type { Tx };

/** Everything a Delivery change can affect. Cheap, and avoids a stale list after a write. */
export function refreshDelivery(projectId?: string) {
  revalidatePath("/dashboard/projects");
  revalidatePath("/dashboard/time");
  revalidatePath("/dashboard/audit");
  revalidatePath("/dashboard");
  if (projectId) revalidatePath(`/dashboard/projects/${projectId}`);
  revalidatePath("/dashboard/projects/[id]", "page");
}

/** The live project, or a plain-English refusal. */
export async function loadProject(tx: Tx, id: string) {
  const project = await tx.project.findFirst({ where: { id, ...live } });
  if (!project) throw new ActionError("That project no longer exists.");
  return project;
}

export const isProjectStatus = (value: string): value is ProjectStatus =>
  ["planned", "active", "on_hold", "completed", "cancelled"].includes(value);

/** Pesos typed into a form to minor units; "" is "not set"; bad text is a field error. */
export function moneyField(text: string, field: string, message: string): number | null {
  if (!text.trim()) return null;
  const minor = parseMinor(text);
  if (minor === null) throw new ActionError(message, "validation", { [field]: message });
  return minor;
}

/** Hours typed into a form ("120", "1:30") to minutes; "" is "not set". */
export function hoursField(text: string, field: string): number | null {
  if (!text.trim()) return null;
  const minutes = parseDuration(text);
  if (minutes === null || minutes <= 0) {
    const message = "Enter the hours like 120 or 1:30.";
    throw new ActionError(message, "validation", { [field]: message });
  }
  return minutes;
}

/** What is still loose on a project: the facts completing it depends on. */
export async function closeFactsFor(tx: Tx, projectId: string): Promise<CloseFacts> {
  const [openTasks, pendingTime, unfinishedBillable] = await Promise.all([
    tx.projectTask.count({ where: { projectId, status: { not: "done" } } }),
    tx.timeEntry.count({ where: { projectId, status: "submitted" } }),
    tx.milestone.count({ where: { projectId, billable: true, status: { not: "done" } } }),
  ]);
  return { openTasks, pendingTime, unfinishedBillable };
}

/** The person is on file (a manager or member must be real staff, not a stray id). */
export async function assertStaff(tx: Tx, profileId: string, field: string, message: string) {
  const profile = await tx.profile.findUnique({ where: { id: profileId }, select: { id: true } });
  if (!profile) throw new ActionError(message, "validation", { [field]: message });
}

/**
 * Creates a template's milestones and tasks on a project, inside the caller's transaction. Billable
 * amounts are shares of the project's price (nothing bills when it has none). Returns what was made.
 */
export async function applyTemplateTx(
  tx: Tx,
  project: { id: string; budgetMinor: bigint | null },
  template: { milestones: unknown; tasks: unknown },
): Promise<{ milestones: number; tasks: number }> {
  const parts: TemplateBody = {
    milestones: (Array.isArray(template.milestones)
      ? template.milestones
      : []) as TemplateBody["milestones"],
    tasks: (Array.isArray(template.tasks) ? template.tasks : []) as TemplateBody["tasks"],
  };
  const invalid = checkTemplate({ name: "template", ...parts });
  if (invalid) throw new ActionError(`That template can't be used: ${invalid}`, "rule");
  const plan = planFromTemplate(
    parts,
    project.budgetMinor === null ? null : Number(project.budgetMinor),
  );

  const ids = new Map<string, string>();
  for (const milestone of plan.milestones) {
    const created = await tx.milestone.create({
      data: {
        projectId: project.id,
        name: milestone.name,
        position: milestone.position,
        billable: milestone.billable,
        amountMinor: milestone.amountMinor,
      },
    });
    ids.set(milestone.name, created.id);
  }
  for (const task of plan.tasks) {
    await tx.projectTask.create({
      data: {
        projectId: project.id,
        milestoneId: task.milestone ? ids.get(task.milestone) : null,
        title: task.title,
        estimateMinutes: task.estimateMinutes,
        position: task.position,
      },
    });
  }
  return { milestones: plan.milestones.length, tasks: plan.tasks.length };
}
