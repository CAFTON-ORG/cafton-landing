"use server";

import { notify, staffIdsWith } from "@/features/notifications/services/notify";
import { manilaDate } from "@/features/schedule/rules/slots";
import { ActionError, actorId, parse, runAction, type ActionResult } from "@/lib/actions";
import { recordAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import {
  canEditEntry,
  checkLogTime,
  checkReview,
  checkSubmitWeek,
  formatMinutes,
  parseDuration,
  weekStartOf,
  type ProjectStatus,
  type TimeStatus,
} from "../rules/core";
import { reviewSchema, timeSchema, weekSchema, type TimeInput } from "../schemas/core";
import { guard, refreshDelivery } from "./shared";
import { z } from "zod";

const atDay = (value: string) => new Date(`${value}T00:00:00Z`);

/** Logs time on a project, or changes an entry that is still a draft or was sent back. */
export async function logTime(input: TimeInput): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const actor = await guard("time:log");
    const me = actorId(actor);
    if (!me) throw new ActionError("Sign in with your own account to log time.", "rule");
    const data = parse(timeSchema, input);
    const minutes = parseDuration(data.duration);

    const id = await prisma.$transaction(async (tx) => {
      const project = await tx.project.findFirst({
        where: { id: data.projectId, deletedAt: null },
      });
      if (!project) throw new ActionError("That project no longer exists.");
      const isMember = !!(await tx.projectMember.findUnique({
        where: { projectId_profileId: { projectId: data.projectId, profileId: me } },
      }));
      const existing = data.id ? await tx.timeEntry.findUnique({ where: { id: data.id } }) : null;
      if (data.id) {
        if (!existing || existing.profileId !== me)
          throw new ActionError("That entry no longer exists.");
        if (!canEditEntry(existing.status as TimeStatus)) {
          throw new ActionError(
            "Only a draft, or time that was sent back, can be changed.",
            "rule",
          );
        }
      }
      if (data.taskId) {
        const task = await tx.projectTask.findFirst({
          where: { id: data.taskId, projectId: data.projectId },
        });
        if (!task) {
          const message = "That task isn't on this project.";
          throw new ActionError(message, "validation", { taskId: message });
        }
      }

      const others = await tx.timeEntry.aggregate({
        where: {
          profileId: me,
          workDate: atDay(data.workDate),
          ...(data.id ? { id: { not: data.id } } : {}),
        },
        _sum: { minutes: true },
      });
      const invalid = checkLogTime({
        minutes,
        workDate: data.workDate,
        today: manilaDate(new Date()),
        otherMinutesThatDay: others._sum.minutes ?? 0,
        projectStatus: project.status as ProjectStatus,
        isMember,
      });
      if (invalid.minutes || invalid.workDate || invalid.form) {
        throw new ActionError(
          invalid.form ?? "Check the marked fields.",
          invalid.form ? "rule" : "validation",
          {
            ...(invalid.minutes ? { duration: invalid.minutes } : {}),
            ...(invalid.workDate ? { workDate: invalid.workDate } : {}),
          },
        );
      }

      const fields = {
        projectId: data.projectId,
        taskId: data.taskId,
        workDate: atDay(data.workDate),
        weekStart: atDay(weekStartOf(data.workDate)),
        minutes: minutes as number,
        note: data.note,
        billable: data.billable,
      };
      if (existing) {
        // Fixing time that was sent back puts it in the draft pile again, ready to resubmit.
        await tx.timeEntry.update({
          where: { id: existing.id },
          data: {
            ...fields,
            status: "draft",
            submittedAt: null,
            reviewedBy: null,
            reviewedAt: null,
            reviewNote: null,
          },
        });
        return existing.id;
      }
      const created = await tx.timeEntry.create({ data: { ...fields, profileId: me } });
      return created.id;
    });
    refreshDelivery(input.projectId);
    return { id };
  });
}

export async function deleteTime(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await guard("time:log");
    const me = actorId(actor);
    let projectId = "";
    await prisma.$transaction(async (tx) => {
      const entry = await tx.timeEntry.findUnique({ where: { id } });
      if (!entry || entry.profileId !== me) throw new ActionError("That entry no longer exists.");
      projectId = entry.projectId;
      if (!canEditEntry(entry.status as TimeStatus)) {
        throw new ActionError("Only a draft, or time that was sent back, can be deleted.", "rule");
      }
      await tx.timeEntry.delete({ where: { id } });
    });
    refreshDelivery(projectId);
  });
}

/** Sends a whole week for approval: every draft and sent-back entry of that week. */
export async function submitWeek(weekStart: string): Promise<ActionResult<{ count: number }>> {
  return runAction(async () => {
    const actor = await guard("time:log");
    const me = actorId(actor);
    if (!me) throw new ActionError("Sign in with your own account to submit time.", "rule");
    const data = parse(weekSchema, { weekStart });
    if (weekStartOf(data.weekStart) !== data.weekStart) {
      throw new ActionError("That is not the start of a week.", "validation");
    }

    const count = await prisma.$transaction(async (tx) => {
      const entries = await tx.timeEntry.findMany({
        where: { profileId: me, weekStart: atDay(data.weekStart) },
        select: { id: true, status: true, minutes: true },
      });
      const blocked = checkSubmitWeek(
        entries.map((entry) => ({ status: entry.status as TimeStatus })),
      );
      if (blocked) throw new ActionError(blocked, "rule");
      const sendable = entries.filter((entry) => canEditEntry(entry.status as TimeStatus));
      await tx.timeEntry.updateMany({
        where: { id: { in: sendable.map((entry) => entry.id) } },
        data: {
          status: "submitted",
          submittedAt: new Date(),
          reviewedBy: null,
          reviewedAt: null,
          reviewNote: null,
        },
      });
      await recordAudit(
        actor,
        {
          action: "time.submit",
          entity: "time",
          summary: `Submitted ${formatMinutes(sendable.reduce((sum, entry) => sum + entry.minutes, 0))} for the week of ${data.weekStart}`,
        },
        tx,
      );
      return sendable.length;
    });
    refreshDelivery();
    await notify(
      await staffIdsWith("time:approve"),
      {
        kind: "time",
        title: `${actor.name} submitted a timesheet`,
        body: `Week of ${data.weekStart}`,
        href: "/dashboard/time?tab=approvals",
      },
      me,
    );
    return { count };
  });
}

/** Approves submitted time, or sends it back with a reason. Never your own. */
export async function reviewTime(
  input: z.input<typeof reviewSchema>,
): Promise<ActionResult<{ count: number }>> {
  return runAction(async () => {
    const actor = await guard("time:approve");
    const me = actorId(actor);
    const data = parse(reviewSchema, input);

    const result = await prisma.$transaction(async (tx) => {
      const entries = await tx.timeEntry.findMany({
        where: { id: { in: data.ids } },
        select: { id: true, profileId: true, status: true, minutes: true, projectId: true },
      });
      if (entries.length !== new Set(data.ids).size) {
        throw new ActionError("Some of that time no longer exists. Refresh and try again.");
      }
      const blocked = checkReview({
        reviewerId: me ?? actor.id,
        action: data.action,
        note: data.note,
        entries: entries.map((entry) => ({
          profileId: entry.profileId,
          status: entry.status as TimeStatus,
        })),
      });
      if (blocked)
        throw new ActionError(
          blocked,
          "rule",
          data.action === "reject" && !data.note.trim() ? { note: blocked } : undefined,
        );

      await tx.timeEntry.updateMany({
        where: { id: { in: entries.map((entry) => entry.id) } },
        data:
          data.action === "approve"
            ? { status: "approved", reviewedBy: me, reviewedAt: new Date(), reviewNote: null }
            : { status: "rejected", reviewedBy: me, reviewedAt: new Date(), reviewNote: data.note },
      });
      await recordAudit(
        actor,
        {
          action: data.action === "approve" ? "time.approve" : "time.reject",
          entity: "time",
          summary: `${data.action === "approve" ? "Approved" : "Sent back"} ${entries.length} time ${entries.length === 1 ? "entry" : "entries"} (${formatMinutes(entries.reduce((sum, entry) => sum + entry.minutes, 0))})`,
        },
        tx,
      );
      return {
        count: entries.length,
        owners: [...new Set(entries.map((entry) => entry.profileId))],
        projects: [...new Set(entries.map((entry) => entry.projectId))],
      };
    });
    for (const projectId of result.projects) refreshDelivery(projectId);
    refreshDelivery();
    await notify(
      result.owners,
      {
        kind: "time",
        title: data.action === "approve" ? "Your time was approved" : "Your time was sent back",
        body: data.action === "reject" ? data.note : undefined,
        href: "/dashboard/time",
      },
      me,
    );
    return { count: result.count };
  });
}
