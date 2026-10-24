import "server-only";

import { notify } from "@/features/notifications/services/notify";
import { prisma } from "@/lib/db";
import { sendReminder } from "./emails";
import { getMeeting } from "../repository/schedule";

/**
 * The scheduler runs once a day (09:00 Philippine time), so a confirmed meeting is reminded on the
 * first run that finds it within the next 36 hours: the morning before. A reminder is sent once
 * per start time, so a rescheduled meeting is reminded again.
 */
export const REMINDER_LEAD_HOURS = 36;
const KIND = "meeting_reminder";

export const reminderWindow = (now: Date) => ({
  from: now,
  to: new Date(now.getTime() + REMINDER_LEAD_HOURS * 3_600_000),
});

export interface ReminderRun {
  sent: number;
  failed: number;
  /** Staff told about a task that is due or overdue. */
  tasks: number;
}

export async function runReminders(now = new Date()): Promise<ReminderRun> {
  const run: ReminderRun = { sent: 0, failed: 0, tasks: 0 };
  const { from, to } = reminderWindow(now);
  const due = await prisma.meeting.findMany({
    where: { status: "confirmed", startsAt: { gt: from, lte: to } },
    select: { id: true, startsAt: true },
  });
  for (const { id, startsAt } of due) {
    const forKey = startsAt.toISOString();
    // Claim first: the unique key means two overlapping runs can't both send it.
    const claimed = await prisma.reminderLog.createMany({
      data: [{ kind: KIND, refId: id, forKey }],
      skipDuplicates: true,
    });
    if (claimed.count !== 1) continue;
    const meeting = await getMeeting(id);
    const sent = meeting ? await sendReminder(meeting) : { ok: false as const };
    if (sent.ok) run.sent += 1;
    else {
      run.failed += 1;
      // Forget the claim so the next run tries again.
      await prisma.reminderLog.deleteMany({ where: { kind: KIND, refId: id, forKey } });
    }
  }

  // Tasks that are due within a day and a half, or already late: tell whoever owns them, once.
  const tasks = await prisma.task.findMany({
    where: { doneAt: null, assigneeId: { not: null }, dueAt: { lte: to } },
    select: { id: true, title: true, dueAt: true, assigneeId: true },
    take: 500,
  });
  for (const task of tasks) {
    const forKey = task.dueAt!.toISOString();
    const claimed = await prisma.reminderLog.createMany({
      data: [{ kind: "task_due", refId: task.id, forKey }],
      skipDuplicates: true,
    });
    if (claimed.count !== 1) continue;
    await notify([task.assigneeId], {
      kind: "task.due",
      title: task.dueAt! < now ? `Overdue: ${task.title}` : `Due soon: ${task.title}`,
      href: "/dashboard/crm/tasks",
    });
    run.tasks += 1;
  }
  return run;
}
