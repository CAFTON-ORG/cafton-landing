import "server-only";

import { revalidatePath } from "next/cache";

import { guard } from "@/features/crm/actions/guard";
import type { Tx } from "@/features/crm/actions/shared";
import { live } from "@/features/crm/mappers";
import { ActionError } from "@/lib/actions";
import { parseMinor } from "@/lib/money";
import { parseDuration, type CloseFacts, type ProjectStatus } from "../rules";

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
