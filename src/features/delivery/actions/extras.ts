"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { siteOrigin } from "@/lib/mail";
import { generateToken, hashToken } from "@/features/sales/services/integrity";
import { ActionError, actorId, parse, runAction, type ActionResult } from "@/lib/actions";
import { recordAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { listComments } from "../repository/delivery";
import {
  MAX_COMMENT,
  checkApplyTemplate,
  checkComment,
  checkShareProgress,
  checkTemplate,
  type ProjectStatus,
} from "../rules";
import { commentSchema, templateSchema, type TemplateInput } from "../schemas";
import type { CommentView } from "../types";
import { applyTemplateTx, guard, loadProject, refreshDelivery } from "./shared";

/* ----------------------------------------------------------------- comments */

/** The conversation on a task, oldest first. */
export async function getComments(taskId: string): Promise<ActionResult<CommentView[]>> {
  return runAction(async () => {
    await guard("projects:view");
    return listComments(parse(z.string().uuid(), taskId));
  });
}

export async function addComment(input: {
  taskId: string;
  body: string;
}): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const actor = await guard("projects:update");
    const data = parse(commentSchema, input);
    const invalid = checkComment(data.body);
    if (invalid) throw new ActionError(invalid, "validation", { body: invalid });

    const id = await prisma.$transaction(async (tx) => {
      const task = await tx.projectTask.findUnique({ where: { id: data.taskId } });
      if (!task) throw new ActionError("That task no longer exists.");
      const project = await loadProject(tx, task.projectId);
      const comment = await tx.taskComment.create({
        data: {
          taskId: task.id,
          authorId: actorId(actor),
          authorName: actor.name,
          body: data.body.trim().slice(0, MAX_COMMENT),
        },
      });
      await recordAudit(
        actor,
        {
          action: "task.comment",
          entity: "project",
          entityId: project.id,
          summary: `Commented on ${task.title} (${project.reference})`,
        },
        tx,
      );
      return comment.id;
    });
    revalidatePath("/dashboard/projects/[id]", "page");
    return { id };
  });
}

/** You can remove your own comments; people who manage projects can remove anyone's. */
export async function deleteComment(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await guard("projects:update");
    await prisma.$transaction(async (tx) => {
      const comment = await tx.taskComment.findUnique({
        where: { id },
        include: { task: { select: { projectId: true, title: true } } },
      });
      if (!comment) throw new ActionError("That comment no longer exists.");
      const mine = comment.authorId !== null && comment.authorId === actorId(actor);
      if (!mine && !actor.permissions.includes("projects:delete")) {
        throw new ActionError("You can only remove your own comments.", "rule");
      }
      await tx.taskComment.delete({ where: { id } });
      await recordAudit(
        actor,
        {
          action: "task.comment_delete",
          entity: "project",
          entityId: comment.task.projectId,
          summary: `Removed a comment on ${comment.task.title}`,
        },
        tx,
      );
    });
    revalidatePath("/dashboard/projects/[id]", "page");
  });
}

/* ------------------------------------------------------------ client progress */

/**
 * Makes (or renews) the private link a client can follow their project's progress by. The secret is
 * shown once and only its hash is kept, so renewing is how you get a link again, and it stops the
 * old one working.
 */
export async function shareProgress(projectId: string): Promise<ActionResult<{ link: string }>> {
  return runAction(async () => {
    const actor = await guard("projects:update");
    const id = parse(z.string().uuid(), projectId);
    const token = generateToken();
    await prisma.$transaction(async (tx) => {
      const project = await loadProject(tx, id);
      const blocked = checkShareProgress(project.status as ProjectStatus);
      if (blocked) throw new ActionError(blocked, "rule");
      await tx.project.update({
        where: { id },
        data: { progressTokenHash: hashToken(token), progressSharedAt: new Date() },
      });
      await recordAudit(
        actor,
        {
          action: "project.share",
          entity: "project",
          entityId: id,
          summary: `Shared the progress of ${project.reference} with the client`,
        },
        tx,
      );
    });
    refreshDelivery(id);
    return { link: `${siteOrigin()}/p/${token}` };
  });
}

export async function stopSharingProgress(projectId: string): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await guard("projects:update");
    const id = parse(z.string().uuid(), projectId);
    await prisma.$transaction(async (tx) => {
      const project = await loadProject(tx, id);
      await tx.project.update({
        where: { id },
        data: { progressTokenHash: null, progressSharedAt: null },
      });
      await recordAudit(
        actor,
        {
          action: "project.unshare",
          entity: "project",
          entityId: id,
          summary: `Stopped sharing the progress of ${project.reference}`,
        },
        tx,
      );
    });
    refreshDelivery(id);
  });
}

/* ---------------------------------------------------------------- templates */

function refreshTemplates() {
  revalidatePath("/dashboard/projects/templates");
}

export async function saveTemplate(input: TemplateInput): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const actor = await guard("projects:templates");
    const data = parse(templateSchema, input);
    const body = {
      milestones: data.milestones.map((milestone) => ({
        name: milestone.name.trim(),
        billablePercent: milestone.billablePercent,
      })),
      tasks: data.tasks.map((task) => ({
        title: task.title.trim(),
        milestone: task.milestone.trim(),
        ...(task.estimateMinutes === undefined ? {} : { estimateMinutes: task.estimateMinutes }),
      })),
    };
    const invalid = checkTemplate({ name: data.name, ...body });
    if (invalid) throw new ActionError(invalid, "validation", { form: invalid });

    const id = await prisma.$transaction(async (tx) => {
      const fields = {
        name: data.name,
        description: data.description,
        active: data.active,
        milestones: body.milestones,
        tasks: body.tasks,
      };
      if (data.id) {
        const existing = await tx.projectTemplate.findUnique({ where: { id: data.id } });
        if (!existing) throw new ActionError("That template no longer exists.");
        await tx.projectTemplate.update({ where: { id: existing.id }, data: fields });
      }
      const saved = data.id
        ? { id: data.id }
        : await tx.projectTemplate.create({ data: { ...fields, createdBy: actorId(actor) } });
      await recordAudit(
        actor,
        {
          action: data.id ? "project_template.update" : "project_template.create",
          entity: "project_template",
          entityId: saved.id,
          summary: `${data.id ? "Edited" : "Added"} the project template ${data.name}`,
        },
        tx,
      );
      return saved.id;
    });
    refreshTemplates();
    return { id };
  });
}

export async function deleteTemplate(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await guard("projects:templates");
    await prisma.$transaction(async (tx) => {
      const template = await tx.projectTemplate.findUnique({ where: { id } });
      if (!template) throw new ActionError("That template no longer exists.");
      // Projects keep what they were given; nothing refers back to the template.
      await tx.projectTemplate.delete({ where: { id } });
      await recordAudit(
        actor,
        {
          action: "project_template.delete",
          entity: "project_template",
          entityId: id,
          summary: `Deleted the project template ${template.name}`,
        },
        tx,
      );
    });
    refreshTemplates();
  });
}

/** Fills an empty project with a template's milestones and tasks. */
export async function applyTemplate(
  projectId: string,
  templateId: string,
): Promise<ActionResult<{ milestones: number; tasks: number }>> {
  return runAction(async () => {
    const actor = await guard("projects:update");
    const ids = parse(z.object({ projectId: z.string().uuid(), templateId: z.string().uuid() }), {
      projectId,
      templateId,
    });
    const counts = await prisma.$transaction(async (tx) => {
      const project = await loadProject(tx, ids.projectId);
      const template = await tx.projectTemplate.findUnique({ where: { id: ids.templateId } });
      if (!template || !template.active) {
        throw new ActionError("That template isn't available. Pick another.", "rule");
      }
      const blocked = checkApplyTemplate({
        status: project.status as ProjectStatus,
        milestones: await tx.milestone.count({ where: { projectId: project.id } }),
        tasks: await tx.projectTask.count({ where: { projectId: project.id } }),
      });
      if (blocked) throw new ActionError(blocked, "rule");
      const made = await applyTemplateTx(tx, project, template);
      await recordAudit(
        actor,
        {
          action: "project.apply_template",
          entity: "project",
          entityId: project.id,
          summary: `Applied the template ${template.name} to ${project.reference}`,
        },
        tx,
      );
      return made;
    });
    refreshDelivery(projectId);
    return counts;
  });
}
