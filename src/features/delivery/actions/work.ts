"use server";

import { ActionError, actorId, parse, runAction, type ActionResult } from "@/lib/actions";
import { recordAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import {
  checkMilestone,
  checkMilestoneDone,
  checkTask,
  completedAtFor,
  isOpenProject,
  parseDuration,
  type MilestoneStatus,
  type ProjectStatus,
  type TaskStatus,
} from "../rules";
import {
  milestoneSchema,
  milestoneStatusSchema,
  taskMoveSchema,
  taskSchema,
  type MilestoneInput,
  type TaskInput,
} from "../schemas";
import { guard, loadProject, moneyField, refreshDelivery, type Tx } from "./shared";

const date = (value: string | null) => (value ? new Date(`${value}T00:00:00Z`) : null);

/** Work can be added to a project that is still open; a finished or cancelled one is a record. */
function assertOpen(status: string) {
  if (!isOpenProject(status as ProjectStatus)) {
    throw new ActionError(
      "This project is closed. Reopen it to change its milestones and tasks.",
      "rule",
    );
  }
}

/* --------------------------------------------------------------- milestones */

export async function saveMilestone(input: MilestoneInput): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const actor = await guard("projects:update");
    const data = parse(milestoneSchema, input);
    const amountMinor = data.billable
      ? moneyField(data.amount, "amount", "Enter the amount like 50000 or 50,000.50.")
      : null;

    const id = await prisma.$transaction(async (tx) => {
      const project = await loadProject(tx, data.projectId);
      assertOpen(project.status);
      const others = await tx.milestone.aggregate({
        where: {
          projectId: data.projectId,
          billable: true,
          ...(data.id ? { id: { not: data.id } } : {}),
        },
        _sum: { amountMinor: true },
      });
      const invalid = checkMilestone({
        name: data.name,
        billable: data.billable,
        amountMinor,
        otherBillableMinor: Number(others._sum.amountMinor ?? 0),
        budgetMinor: project.budgetMinor === null ? null : Number(project.budgetMinor),
      });
      if (invalid.name || invalid.amount) {
        throw new ActionError("Check the marked fields.", "validation", invalid);
      }

      const fields = {
        name: data.name,
        description: data.description,
        dueDate: date(data.dueDate),
        billable: data.billable,
        amountMinor: data.billable ? amountMinor : null,
      };
      if (data.id) {
        const existing = await tx.milestone.findFirst({
          where: { id: data.id, projectId: data.projectId },
        });
        if (!existing) throw new ActionError("That milestone no longer exists.");
        // Once finished, what it bills is what the client was told.
        if (
          existing.status === "done" &&
          (existing.billable !== data.billable ||
            existing.amountMinor !==
              (fields.amountMinor === null ? null : BigInt(fields.amountMinor)))
        ) {
          throw new ActionError("This milestone is done, so what it bills can't change.", "rule");
        }
        await tx.milestone.update({ where: { id: existing.id }, data: fields });
        await recordAudit(
          actor,
          {
            action: "milestone.update",
            entity: "project",
            entityId: project.id,
            summary: `Edited milestone ${data.name} on ${project.reference}`,
          },
          tx,
        );
        return existing.id;
      }
      const last = await tx.milestone.aggregate({
        where: { projectId: data.projectId },
        _max: { position: true },
      });
      const created = await tx.milestone.create({
        data: { projectId: data.projectId, ...fields, position: (last._max.position ?? -1) + 1 },
      });
      await recordAudit(
        actor,
        {
          action: "milestone.create",
          entity: "project",
          entityId: project.id,
          summary: `Added milestone ${data.name} to ${project.reference}`,
        },
        tx,
      );
      return created.id;
    });
    refreshDelivery(input.projectId);
    return { id };
  });
}

export async function setMilestoneStatus(
  id: string,
  status: MilestoneStatus,
): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await guard("projects:update");
    const data = parse(milestoneStatusSchema, { id, status });
    let projectId = "";
    await prisma.$transaction(async (tx) => {
      const milestone = await tx.milestone.findUnique({ where: { id: data.id } });
      if (!milestone) throw new ActionError("That milestone no longer exists.");
      projectId = milestone.projectId;
      const project = await loadProject(tx, milestone.projectId);
      assertOpen(project.status);
      if (milestone.status === data.status) return;
      if (data.status === "done") {
        const open = await tx.projectTask.count({
          where: { milestoneId: milestone.id, status: { not: "done" } },
        });
        const blocked = checkMilestoneDone(open);
        if (blocked) throw new ActionError(blocked, "rule");
      }
      await tx.milestone.update({
        where: { id: milestone.id },
        data: { status: data.status, completedAt: data.status === "done" ? new Date() : null },
      });
      await recordAudit(
        actor,
        {
          action: "milestone.status",
          entity: "project",
          entityId: project.id,
          summary: `Milestone ${milestone.name} on ${project.reference} is now ${data.status.replace("_", " ")}`,
        },
        tx,
      );
    });
    refreshDelivery(projectId);
  });
}

export async function deleteMilestone(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await guard("projects:update");
    let projectId = "";
    await prisma.$transaction(async (tx) => {
      const milestone = await tx.milestone.findUnique({ where: { id } });
      if (!milestone) throw new ActionError("That milestone no longer exists.");
      projectId = milestone.projectId;
      const project = await loadProject(tx, milestone.projectId);
      assertOpen(project.status);
      if (milestone.billable && milestone.status === "done") {
        throw new ActionError(
          "A finished billable milestone is kept: it is what gets invoiced.",
          "rule",
        );
      }
      // Its tasks stay on the project, just not under a milestone.
      await tx.milestone.delete({ where: { id } });
      await recordAudit(
        actor,
        {
          action: "milestone.delete",
          entity: "project",
          entityId: project.id,
          summary: `Removed milestone ${milestone.name} from ${project.reference}`,
        },
        tx,
      );
    });
    refreshDelivery(projectId);
  });
}

/* -------------------------------------------------------------------- tasks */

async function memberIds(tx: Tx, projectId: string) {
  const rows = await tx.projectMember.findMany({
    where: { projectId },
    select: { profileId: true },
  });
  return rows.map((row) => row.profileId);
}

export async function saveTask(input: TaskInput): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const actor = await guard("projects:update");
    const data = parse(taskSchema, input);
    let estimateMinutes: number | null = null;
    if (data.estimate.trim()) {
      estimateMinutes = parseDuration(data.estimate);
      if (estimateMinutes === null || estimateMinutes <= 0) {
        const message = "Enter the estimate like 4 or 1:30.";
        throw new ActionError(message, "validation", { estimate: message });
      }
    }

    const id = await prisma.$transaction(async (tx) => {
      const project = await loadProject(tx, data.projectId);
      assertOpen(project.status);
      const invalid = checkTask({
        title: data.title,
        assigneeId: data.assigneeId,
        memberIds: await memberIds(tx, data.projectId),
      });
      if (invalid.title || invalid.assigneeId) {
        throw new ActionError("Check the marked fields.", "validation", invalid);
      }
      if (data.milestoneId) {
        const milestone = await tx.milestone.findFirst({
          where: { id: data.milestoneId, projectId: data.projectId },
        });
        if (!milestone) {
          const message = "That milestone isn't on this project.";
          throw new ActionError(message, "validation", { milestoneId: message });
        }
        if (milestone.status === "done") {
          const message = "That milestone is done. Reopen it to add work to it.";
          throw new ActionError(message, "rule", { milestoneId: message });
        }
      }
      const fields = {
        title: data.title,
        description: data.description,
        milestoneId: data.milestoneId,
        assigneeId: data.assigneeId,
        priority: data.priority,
        dueDate: date(data.dueDate),
        estimateMinutes,
      };
      if (data.id) {
        const existing = await tx.projectTask.findFirst({
          where: { id: data.id, projectId: data.projectId },
        });
        if (!existing) throw new ActionError("That task no longer exists.");
        await tx.projectTask.update({ where: { id: existing.id }, data: fields });
        await recordAudit(
          actor,
          {
            action: "task.update",
            entity: "project",
            entityId: project.id,
            summary: `Edited task ${data.title} on ${project.reference}`,
          },
          tx,
        );
        return existing.id;
      }
      const last = await tx.projectTask.aggregate({
        where: { projectId: data.projectId, status: "todo" },
        _max: { position: true },
      });
      const created = await tx.projectTask.create({
        data: {
          projectId: data.projectId,
          ...fields,
          position: (last._max.position ?? -1) + 1,
          createdBy: actorId(actor),
        },
      });
      await recordAudit(
        actor,
        {
          action: "task.create",
          entity: "project",
          entityId: project.id,
          summary: `Added task ${data.title} to ${project.reference}`,
        },
        tx,
      );
      return created.id;
    });
    refreshDelivery(input.projectId);
    return { id };
  });
}

/** Moves a task to a column of the board, before another task or at the end. */
export async function moveTask(input: {
  id: string;
  status: TaskStatus;
  beforeId?: string;
}): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await guard("projects:update");
    const data = parse(taskMoveSchema, input);
    let projectId = "";
    await prisma.$transaction(async (tx) => {
      const task = await tx.projectTask.findUnique({ where: { id: data.id } });
      if (!task) throw new ActionError("That task no longer exists.");
      projectId = task.projectId;
      const project = await loadProject(tx, task.projectId);
      assertOpen(project.status);

      const column = (
        await tx.projectTask.findMany({
          where: { projectId: task.projectId, status: data.status, id: { not: task.id } },
          orderBy: [{ position: "asc" }, { createdAt: "asc" }],
          select: { id: true },
        })
      ).map((row) => row.id);
      const index = data.beforeId ? column.indexOf(data.beforeId) : -1;
      column.splice(index === -1 ? column.length : index, 0, task.id);

      await tx.projectTask.update({
        where: { id: task.id },
        data: {
          status: data.status,
          completedAt: completedAtFor(
            { status: task.status as TaskStatus, completedAt: task.completedAt },
            data.status,
            new Date(),
          ),
        },
      });
      for (const [position, taskId] of column.entries()) {
        await tx.projectTask.update({ where: { id: taskId }, data: { position } });
      }
      if (task.status !== data.status) {
        await recordAudit(
          actor,
          {
            action: "task.status",
            entity: "project",
            entityId: project.id,
            summary: `Task ${task.title} on ${project.reference} moved to ${data.status.replace("_", " ")}`,
          },
          tx,
        );
      }
    });
    refreshDelivery(projectId);
  });
}

export async function deleteTask(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await guard("projects:update");
    let projectId = "";
    await prisma.$transaction(async (tx) => {
      const task = await tx.projectTask.findUnique({ where: { id } });
      if (!task) throw new ActionError("That task no longer exists.");
      projectId = task.projectId;
      const project = await loadProject(tx, task.projectId);
      assertOpen(project.status);
      if ((await tx.timeEntry.count({ where: { taskId: id } })) > 0) {
        throw new ActionError(
          "Hours were logged on this task, so it is kept. Mark it done instead.",
          "rule",
        );
      }
      await tx.projectTask.delete({ where: { id } });
      await recordAudit(
        actor,
        {
          action: "task.delete",
          entity: "project",
          entityId: project.id,
          summary: `Removed task ${task.title} from ${project.reference}`,
        },
        tx,
      );
    });
    refreshDelivery(projectId);
  });
}
