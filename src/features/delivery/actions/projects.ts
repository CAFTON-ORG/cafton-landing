"use server";

import { revalidatePath } from "next/cache";

import { logActivity } from "@/features/crm/actions/shared";
import { live } from "@/features/crm/repository/mappers";
import { ActionError, actorId, parse, runAction, type ActionResult } from "@/lib/actions";
import { recordAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import {
  PROJECT_STATUS_LABEL,
  checkProject,
  checkPortfolioLink,
  checkProjectStatusChange,
  type ProjectStatus,
} from "../rules";
import {
  memberSchema,
  projectSchema,
  statusSchema,
  type MemberInput,
  type ProjectInput,
} from "../schemas";
import {
  applyTemplateTx,
  assertStaff,
  closeFactsFor,
  guard,
  hoursField,
  loadProject,
  moneyField,
  refreshDelivery,
} from "./shared";
import { z } from "zod";

const date = (value: string | null) => (value ? new Date(`${value}T00:00:00Z`) : null);

/** Starts a project by hand: from a won deal, or on its own for internal work. */
export async function createProject(input: ProjectInput): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const actor = await guard("projects:create");
    const data = parse(projectSchema, input);
    const invalid = checkProject({
      name: data.name,
      startDate: data.startDate,
      dueDate: data.dueDate,
    });
    if (invalid.name || invalid.dueDate) {
      throw new ActionError("Check the marked fields.", "validation", invalid);
    }
    const budgetMinor = moneyField(
      data.budget,
      "budget",
      "Enter the price like 250000 or 250,000.50.",
    );
    const budgetMinutes = hoursField(data.budgetHours, "budgetHours");

    const id = await prisma.$transaction(async (tx) => {
      const deal = data.dealId
        ? await tx.deal.findFirst({
            where: { id: data.dealId, ...live },
            include: { stage: { select: { kind: true } } },
          })
        : null;
      if (data.dealId && !deal) {
        throw new ActionError("That deal no longer exists.", "validation", {
          dealId: "That deal no longer exists.",
        });
      }
      if (deal && deal.stage.kind !== "won") {
        const message = "Win the deal before starting its project.";
        throw new ActionError(message, "rule", { dealId: message });
      }
      if (data.managerId) {
        await assertStaff(tx, data.managerId, "managerId", "Choose someone on the team.");
      }

      const project = await tx.project.create({
        data: {
          name: data.name,
          description: data.description,
          dealId: deal?.id,
          contactId: deal?.contactId,
          organizationId: deal?.organizationId,
          managerId: data.managerId,
          startDate: date(data.startDate),
          dueDate: date(data.dueDate),
          budgetMinor,
          budgetMinutes,
          currency: deal?.currency ?? "PHP",
          createdBy: actorId(actor),
          // The person running it is on its team from the start.
          members: data.managerId ? { create: { profileId: data.managerId } } : undefined,
        },
      });
      if (deal) {
        await logActivity(
          tx,
          actor,
          { dealId: deal.id },
          "system",
          `Started project ${project.reference}`,
        );
      }
      if (data.templateId) {
        const template = await tx.projectTemplate.findUnique({ where: { id: data.templateId } });
        if (!template || !template.active) {
          const message = "That template isn't available. Pick another.";
          throw new ActionError(message, "validation", { templateId: message });
        }
        await applyTemplateTx(tx, project, template);
      }
      await recordAudit(
        actor,
        {
          action: "project.create",
          entity: "project",
          entityId: project.id,
          summary: `Started project ${project.reference} ${project.name}`,
        },
        tx,
      );
      return project.id;
    });
    refreshDelivery(id);
    return { id };
  });
}

export async function updateProject(
  id: string,
  input: ProjectInput,
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const actor = await guard("projects:update");
    const data = parse(projectSchema, input);
    const invalid = checkProject({
      name: data.name,
      startDate: data.startDate,
      dueDate: data.dueDate,
    });
    if (invalid.name || invalid.dueDate) {
      throw new ActionError("Check the marked fields.", "validation", invalid);
    }
    const budgetMinor = moneyField(
      data.budget,
      "budget",
      "Enter the price like 250000 or 250,000.50.",
    );
    const budgetMinutes = hoursField(data.budgetHours, "budgetHours");

    await prisma.$transaction(async (tx) => {
      const project = await loadProject(tx, id);
      if (data.managerId) {
        await assertStaff(tx, data.managerId, "managerId", "Choose someone on the team.");
      }
      // Lowering the price below what milestones already ask to invoice would contradict them.
      if (budgetMinor !== null) {
        const billable = await tx.milestone.aggregate({
          where: { projectId: id, billable: true },
          _sum: { amountMinor: true },
        });
        const asked = Number(billable._sum.amountMinor ?? 0);
        if (asked > budgetMinor) {
          const message = "The billable milestones already add up to more than that price.";
          throw new ActionError(message, "rule", { budget: message });
        }
      }
      await tx.project.update({
        where: { id },
        data: {
          name: data.name,
          description: data.description,
          managerId: data.managerId,
          startDate: date(data.startDate),
          dueDate: date(data.dueDate),
          budgetMinor,
          budgetMinutes,
        },
      });
      if (data.managerId && data.managerId !== project.managerId) {
        await tx.projectMember.upsert({
          where: { projectId_profileId: { projectId: id, profileId: data.managerId } },
          update: {},
          create: { projectId: id, profileId: data.managerId },
        });
      }
      await recordAudit(
        actor,
        {
          action: "project.update",
          entity: "project",
          entityId: id,
          summary: `Edited project ${project.reference}`,
        },
        tx,
      );
    });
    refreshDelivery(id);
    return { id };
  });
}

export async function setProjectStatus(id: string, status: ProjectStatus): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await guard("projects:update");
    const data = parse(statusSchema, { id, status });

    await prisma.$transaction(async (tx) => {
      const project = await loadProject(tx, data.id);
      const from = project.status as ProjectStatus;
      const blocked = checkProjectStatusChange(from, data.status, await closeFactsFor(tx, data.id));
      if (blocked) throw new ActionError(blocked, "rule");
      if (from === data.status) return;

      await tx.project.update({
        where: { id: data.id },
        data: {
          status: data.status,
          // Starting a project with no start date sets it to today.
          startDate:
            data.status === "active" && !project.startDate
              ? date(new Date().toISOString().slice(0, 10))
              : undefined,
          completedAt: data.status === "completed" ? new Date() : null,
        },
      });
      await recordAudit(
        actor,
        {
          action: "project.status",
          entity: "project",
          entityId: data.id,
          summary: `Project ${project.reference} went from ${PROJECT_STATUS_LABEL[from]} to ${PROJECT_STATUS_LABEL[data.status]}`,
        },
        tx,
      );
    });
    refreshDelivery(id);
  });
}

/** Removes a project that never got going. Anything with hours logged is kept as a record. */
export async function deleteProject(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await guard("projects:delete");
    await prisma.$transaction(async (tx) => {
      const project = await loadProject(tx, id);
      if (project.status !== "planned" && project.status !== "cancelled") {
        throw new ActionError(
          "Only a project that hasn't started, or was cancelled, can be deleted.",
          "rule",
        );
      }
      if ((await tx.timeEntry.count({ where: { projectId: id } })) > 0) {
        throw new ActionError(
          "Hours were logged on this project, so it is kept as a record. Cancel it instead.",
          "rule",
        );
      }
      await tx.project.update({ where: { id }, data: { deletedAt: new Date() } });
      await recordAudit(
        actor,
        {
          action: "project.delete",
          entity: "project",
          entityId: id,
          summary: `Deleted project ${project.reference} ${project.name}`,
        },
        tx,
      );
    });
    refreshDelivery(id);
  });
}

/* --------------------------------------------------------------------- team */

export async function addMember(input: MemberInput): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await guard("projects:update");
    const data = parse(memberSchema, input);
    const costRate = moneyField(
      data.costRate,
      "costRate",
      "Enter the hourly cost like 350 or 350.50.",
    );

    await prisma.$transaction(async (tx) => {
      const project = await loadProject(tx, data.projectId);
      await assertStaff(tx, data.profileId, "profileId", "Choose someone on the team.");
      const existing = await tx.projectMember.findUnique({
        where: { projectId_profileId: { projectId: data.projectId, profileId: data.profileId } },
      });
      if (existing) {
        const message = "They are already on this project.";
        throw new ActionError(message, "rule", { profileId: message });
      }
      await tx.projectMember.create({
        data: { projectId: data.projectId, profileId: data.profileId, costRateMinor: costRate },
      });
      await recordAudit(
        actor,
        {
          action: "project.member_add",
          entity: "project",
          entityId: data.projectId,
          summary: `Added a team member to ${project.reference}`,
        },
        tx,
      );
    });
    refreshDelivery(input.projectId);
  });
}

const rateSchema = z.object({
  id: z.string().uuid(),
  costRate: z.string().trim().max(20),
});

/** Changes what an hour of one member costs. Only affects cost figures, never what was approved. */
export async function setMemberCostRate(input: {
  id: string;
  costRate: string;
}): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await guard("projects:update");
    const data = parse(rateSchema, input);
    const costRate = moneyField(
      data.costRate,
      "costRate",
      "Enter the hourly cost like 350 or 350.50.",
    );
    await prisma.$transaction(async (tx) => {
      const member = await tx.projectMember.findUnique({ where: { id: data.id } });
      if (!member) throw new ActionError("That team member is no longer on the project.");
      await tx.projectMember.update({ where: { id: data.id }, data: { costRateMinor: costRate } });
      await recordAudit(
        actor,
        {
          action: "project.member_rate",
          entity: "project",
          entityId: member.projectId,
          summary: "Changed a team member's hourly cost",
        },
        tx,
      );
      refreshDelivery(member.projectId);
    });
  });
}

export async function removeMember(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await guard("projects:update");
    await prisma.$transaction(async (tx) => {
      const member = await tx.projectMember.findUnique({
        where: { id },
        include: { project: { select: { reference: true, managerId: true } } },
      });
      if (!member) throw new ActionError("That team member is no longer on the project.");
      if (member.project.managerId === member.profileId) {
        throw new ActionError("They manage this project. Choose a new manager first.", "rule");
      }
      const openTasks = await tx.projectTask.count({
        where: {
          projectId: member.projectId,
          assigneeId: member.profileId,
          status: { not: "done" },
        },
      });
      if (openTasks > 0) {
        throw new ActionError(
          `${openTasks} open ${openTasks === 1 ? "task is" : "tasks are"} assigned to them. Reassign ${openTasks === 1 ? "it" : "them"} first.`,
          "rule",
        );
      }
      const unsent = await tx.timeEntry.count({
        where: {
          projectId: member.projectId,
          profileId: member.profileId,
          status: { in: ["draft", "submitted", "rejected"] },
        },
      });
      if (unsent > 0) {
        throw new ActionError(
          "They have time on this project that isn't approved yet. Settle it first.",
          "rule",
        );
      }
      await tx.projectMember.delete({ where: { id } });
      await recordAudit(
        actor,
        {
          action: "project.member_remove",
          entity: "project",
          entityId: member.projectId,
          summary: `Removed a team member from ${member.project.reference}`,
        },
        tx,
      );
      refreshDelivery(member.projectId);
    });
  });
}

/** Shows a delivered project as a case study: points it at a portfolio entry (or clears the link). */
export async function linkPortfolio(projectId: string, slug: string): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await guard("projects:update");
    const data = parse(
      z.object({ projectId: z.string().uuid(), slug: z.string().trim().max(200) }),
      {
        projectId,
        slug,
      },
    );
    await prisma.$transaction(async (tx) => {
      const project = await loadProject(tx, data.projectId);
      if (data.slug) {
        const blocked = checkPortfolioLink({
          projectStatus: project.status as ProjectStatus,
          slugExists:
            (await tx.portfolioProject.count({ where: { slug: data.slug, deletedAt: null } })) > 0,
          linkedElsewhere:
            (await tx.project.count({
              where: { portfolioSlug: data.slug, id: { not: project.id }, ...live },
            })) > 0,
        });
        if (blocked) throw new ActionError(blocked, "rule", { slug: blocked });
      }
      await tx.project.update({
        where: { id: project.id },
        data: { portfolioSlug: data.slug || null },
      });
      await recordAudit(
        actor,
        {
          action: "project.portfolio",
          entity: "project",
          entityId: project.id,
          summary: data.slug
            ? `Linked ${project.reference} to the portfolio entry ${data.slug}`
            : `Removed the portfolio link from ${project.reference}`,
        },
        tx,
      );
    });
    refreshDelivery(projectId);
  });
}

/**
 * Starts the project of a won deal that has none: the way in when a deal was won without a quote
 * the client accepted online (a phone call, a purchase order). Same result as an accepted quote:
 * named after the deal, for its client, priced at the deal's value, managed by its owner.
 */
export async function startProjectFromDeal(dealId: string): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const actor = await guard("projects:create");
    const id = parse(z.string().uuid(), dealId);
    const created = await prisma.$transaction(async (tx) => {
      const deal = await tx.deal.findFirst({
        where: { id, ...live },
        include: { stage: { select: { kind: true } } },
      });
      if (!deal) throw new ActionError("That deal no longer exists.");
      if (deal.stage.kind !== "won") {
        throw new ActionError("Win the deal before starting its project.", "rule");
      }
      if (await tx.project.findFirst({ where: { dealId: id, ...live }, select: { id: true } })) {
        throw new ActionError("This deal already has a project.", "rule");
      }
      const project = await tx.project.create({
        data: {
          name: deal.title,
          dealId: deal.id,
          contactId: deal.contactId,
          organizationId: deal.organizationId,
          managerId: deal.ownerId,
          budgetMinor: deal.amountMinor,
          currency: deal.currency,
          createdBy: actorId(actor),
          members: deal.ownerId ? { create: { profileId: deal.ownerId } } : undefined,
        },
      });
      await logActivity(
        tx,
        actor,
        { dealId: deal.id },
        "system",
        `Started project ${project.reference}`,
      );
      await recordAudit(
        actor,
        {
          action: "project.create",
          entity: "project",
          entityId: project.id,
          summary: `Started project ${project.reference} ${project.name} from won deal ${deal.reference}`,
        },
        tx,
      );
      return project.id;
    });
    refreshDelivery(created);
    revalidatePath(`/dashboard/crm/deals/${id}`);
    return { id: created };
  });
}
