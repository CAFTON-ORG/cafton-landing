"use server";

import { ActionError, actorId, parse, runAction, type ActionResult } from "@/lib/actions";
import { notify } from "@/features/notifications/server";
import { recordAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { live } from "../mappers";
import { checkAddTaskToDeal } from "../rules";
import { activitySchema, taskSchema, type ActivityInput, type TaskInput } from "../schemas";
import { guard, refreshCrm } from "./guard";
import { logActivity, type Tx } from "./shared";

/** Which permission a timeline entry needs depends on what it is attached to. */
const subjectPermission = (subject: { leadId?: string; dealId?: string }) =>
  subject.dealId
    ? ("deals:update" as const)
    : subject.leadId
      ? ("leads:update" as const)
      : ("contacts:update" as const);

async function assertSubjectExists(
  tx: Tx,
  subject: { leadId?: string; contactId?: string; dealId?: string },
) {
  const found = subject.dealId
    ? await tx.deal.findFirst({ where: { id: subject.dealId, ...live }, select: { id: true } })
    : subject.leadId
      ? await tx.lead.findFirst({ where: { id: subject.leadId, ...live }, select: { id: true } })
      : await tx.contact.findFirst({
          where: { id: subject.contactId, ...live },
          select: { id: true },
        });
  if (!found) throw new ActionError("That record no longer exists.");
}

/** A note, call, email or meeting on a lead, contact or deal. */
export async function addActivity(input: ActivityInput): Promise<ActionResult> {
  return runAction(async () => {
    const data = parse(activitySchema, input);
    const subject = data.subject;
    const actor = await guard(subjectPermission(subject));

    await prisma.$transaction(async (tx) => {
      await assertSubjectExists(tx, subject);
      await logActivity(tx, actor, subject as never, data.type, data.body);
    });
    refreshCrm();
  });
}

export async function createTask(input: TaskInput): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const actor = await guard("tasks:create");
    const data = parse(taskSchema, input);

    const id = await prisma.$transaction(async (tx) => {
      if (data.subject) {
        await assertSubjectExists(tx, data.subject);
        if (data.subject.dealId) {
          const deal = await tx.deal.findUnique({
            where: { id: data.subject.dealId },
            include: { stage: true },
          });
          const blocked = deal
            ? checkAddTaskToDeal({ stageKind: deal.stage.kind, amountMinor: null })
            : null;
          if (blocked) throw new ActionError(blocked, "rule");
        }
      }
      const due = data.due ? new Date(`${data.due}T23:59:59`) : undefined;
      const task = await tx.task.create({
        data: {
          title: data.title,
          dueAt: due,
          assigneeId: data.assigneeId,
          leadId: data.subject?.leadId,
          contactId: data.subject?.contactId,
          dealId: data.subject?.dealId,
          createdBy: actorId(actor),
        },
      });
      await recordAudit(
        actor,
        {
          action: "task.create",
          entity: "task",
          entityId: task.id,
          summary: `Created task: ${task.title}`,
        },
        tx,
      );
      return task.id;
    });
    await notify(
      [data.assigneeId],
      {
        kind: "task.assigned",
        title: `New task for you: ${data.title}`,
        body: data.due ? `Due ${data.due}` : undefined,
        href: "/dashboard/crm/tasks",
      },
      actorId(actor),
    );
    refreshCrm();
    return { id };
  });
}

export async function setTaskDone(id: string, done: boolean): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await guard("tasks:update");
    await prisma.$transaction(async (tx) => {
      const task = await tx.task.findUnique({ where: { id } });
      if (!task) throw new ActionError("That task no longer exists.");
      await tx.task.update({ where: { id }, data: { doneAt: done ? new Date() : null } });
      await recordAudit(
        actor,
        {
          action: done ? "task.complete" : "task.reopen",
          entity: "task",
          entityId: id,
          summary: `${done ? "Completed" : "Reopened"} task: ${task.title}`,
        },
        tx,
      );
    });
    refreshCrm();
  });
}

export async function reassignTask(id: string, assigneeId: string | null): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await guard("tasks:update");
    await prisma.$transaction(async (tx) => {
      const task = await tx.task.findUnique({ where: { id } });
      if (!task) throw new ActionError("That task no longer exists.");
      await tx.task.update({ where: { id }, data: { assigneeId } });
      await recordAudit(
        actor,
        {
          action: "task.assign",
          entity: "task",
          entityId: id,
          summary: `Reassigned task: ${task.title}`,
        },
        tx,
      );
    });
    await notify(
      [assigneeId],
      { kind: "task.assigned", title: "A task was assigned to you", href: "/dashboard/crm/tasks" },
      actorId(actor),
    );
    refreshCrm();
  });
}

export async function deleteTask(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await guard("tasks:update");
    await prisma.$transaction(async (tx) => {
      const task = await tx.task.findUnique({ where: { id } });
      if (!task) throw new ActionError("That task no longer exists.");
      await tx.task.delete({ where: { id } });
      await recordAudit(
        actor,
        {
          action: "task.delete",
          entity: "task",
          entityId: id,
          summary: `Deleted task: ${task.title}`,
        },
        tx,
      );
    });
    refreshCrm();
  });
}
