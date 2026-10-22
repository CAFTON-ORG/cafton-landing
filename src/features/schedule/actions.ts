"use server";

import { revalidatePath } from "next/cache";

import { guard, refreshCrm } from "@/features/crm/actions/guard";
import { logActivity } from "@/features/crm/actions/shared";
import { ActionError, actorId, parse, runAction, type ActionResult } from "@/lib/actions";
import { recordAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { sendCancelled, sendConfirmed } from "./emails";
import { getDocument } from "@/features/cms/repository/documents";
import { busyIntervals, getMeeting } from "./repository";
import { checkStatusChange, isEditable, isOverlapError } from "./rules";
import {
  meetingSchema,
  meetingStatusSchema,
  type MeetingInput,
  type MeetingStatusInput,
} from "./schemas";
import { addDays, formatManila, fromManila, manilaTime, slotsForDate } from "./slots";

const OVERLAP = "That time overlaps another meeting. Pick a different time.";

function refresh() {
  refreshCrm();
  revalidatePath("/dashboard/crm/schedule");
}

type Links = { leadId?: string; contactId?: string; dealId?: string };

/** The timeline entries a meeting leaves on each record it is about. */
async function logOn(
  tx: Parameters<typeof logActivity>[0],
  by: { id: string; name: string },
  links: Links,
  body: string,
) {
  if (links.leadId) await logActivity(tx, by, { leadId: links.leadId } as never, "meeting", body);
  if (links.dealId) await logActivity(tx, by, { dealId: links.dealId } as never, "meeting", body);
  if (!links.leadId && !links.dealId && links.contactId)
    await logActivity(tx, by, { contactId: links.contactId } as never, "meeting", body);
}

/** Staff schedule a meeting: it is confirmed straight away, because staff arranged it. */
export async function createMeeting(
  input: MeetingInput,
): Promise<ActionResult<{ id: string; emailed: boolean }>> {
  return runAction(async () => {
    const actor = await guard("meetings:create");
    const data = parse(meetingSchema, input);
    const startsAt = fromManila(data.date, data.time);
    const endsAt = new Date(startsAt.getTime() + data.durationMinutes * 60_000);
    if (startsAt.getTime() < Date.now() - 5 * 60_000)
      throw new ActionError("Pick a time in the future.", "validation", {
        time: "Pick a time in the future.",
      });

    let id: string;
    try {
      id = await prisma.$transaction(async (tx) => {
        const meeting = await tx.meeting.create({
          data: {
            title: data.title,
            startsAt,
            endsAt,
            mode: data.mode,
            location: data.location,
            status: "confirmed",
            source: "staff",
            notes: data.notes,
            attendeeName: data.attendeeName,
            attendeeEmail: data.attendeeEmail,
            attendeePhone: data.attendeePhone,
            leadId: data.leadId,
            contactId: data.contactId,
            dealId: data.dealId,
            ownerId: data.ownerId ?? actorId(actor),
            createdBy: actorId(actor),
          },
        });
        await logOn(
          tx,
          actor,
          data,
          `Scheduled "${data.title}" for ${formatManila(startsAt)} (Philippine time).`,
        );
        await recordAudit(
          actor,
          {
            action: "meeting.create",
            entity: "meeting",
            entityId: meeting.id,
            summary: `Scheduled "${data.title}" with ${data.attendeeName}`,
          },
          tx,
        );
        return meeting.id;
      });
    } catch (error) {
      if (isOverlapError(error)) throw new ActionError(OVERLAP, "rule", { time: OVERLAP });
      throw error;
    }

    refresh();
    let emailed = false;
    if (data.notify) {
      const view = await getMeeting(id);
      emailed = view ? (await sendConfirmed(view)).ok : false;
    }
    return { id, emailed };
  });
}

/** Changes a meeting's details or moves it to another time. Only open meetings can change. */
export async function updateMeeting(
  input: MeetingInput,
): Promise<ActionResult<{ emailed: boolean }>> {
  return runAction(async () => {
    const actor = await guard("meetings:update");
    const data = parse(meetingSchema, input);
    if (!data.id) throw new ActionError("That meeting no longer exists.");
    const existing = await prisma.meeting.findUnique({ where: { id: data.id } });
    if (!existing) throw new ActionError("That meeting no longer exists.");
    if (!isEditable(existing.status))
      throw new ActionError("This meeting is finished and can't be changed.", "rule");

    const startsAt = fromManila(data.date, data.time);
    const endsAt = new Date(startsAt.getTime() + data.durationMinutes * 60_000);
    const moved =
      startsAt.getTime() !== existing.startsAt.getTime() ||
      endsAt.getTime() !== existing.endsAt.getTime();

    try {
      await prisma.$transaction(async (tx) => {
        await tx.meeting.update({
          where: { id: data.id },
          data: {
            title: data.title,
            startsAt,
            endsAt,
            mode: data.mode,
            location: data.location ?? null,
            notes: data.notes ?? null,
            attendeeName: data.attendeeName,
            attendeeEmail: data.attendeeEmail,
            attendeePhone: data.attendeePhone ?? null,
            ownerId: data.ownerId ?? null,
            leadId: data.leadId ?? existing.leadId,
            contactId: data.contactId ?? existing.contactId,
            dealId: data.dealId ?? existing.dealId,
          },
        });
        if (moved)
          await logOn(
            tx,
            actor,
            {
              leadId: existing.leadId ?? undefined,
              dealId: existing.dealId ?? undefined,
              contactId: existing.contactId ?? undefined,
            },
            `Moved "${data.title}" to ${formatManila(startsAt)} (Philippine time).`,
          );
        await recordAudit(
          actor,
          {
            action: moved ? "meeting.reschedule" : "meeting.update",
            entity: "meeting",
            entityId: data.id,
            summary: `${moved ? "Rescheduled" : "Updated"} "${data.title}"`,
          },
          tx,
        );
      });
    } catch (error) {
      if (isOverlapError(error)) throw new ActionError(OVERLAP, "rule", { time: OVERLAP });
      throw error;
    }

    refresh();
    let emailed = false;
    if (data.notify && existing.status === "confirmed" && moved) {
      const view = await getMeeting(data.id);
      emailed = view ? (await sendConfirmed(view, { updated: true })).ok : false;
    }
    return { emailed };
  });
}

/** Confirm, cancel, complete or mark a no-show. Confirming and cancelling tell the person by email. */
export async function setMeetingStatus(
  input: MeetingStatusInput,
): Promise<ActionResult<{ emailed: boolean }>> {
  return runAction(async () => {
    const actor = await guard("meetings:update");
    const data = parse(meetingStatusSchema, input);
    const existing = await prisma.meeting.findUnique({ where: { id: data.id } });
    if (!existing) throw new ActionError("That meeting no longer exists.");

    const blocked = checkStatusChange(existing.status, data.status, {
      startsAt: existing.startsAt,
      now: new Date(),
      reason: data.reason,
    });
    if (blocked) throw new ActionError(blocked, "rule");

    const label = {
      confirmed: "Confirmed",
      completed: "Marked as held",
      cancelled: "Cancelled",
      no_show: "Marked as a no-show",
      requested: "Requested",
    }[data.status];
    await prisma.$transaction(async (tx) => {
      await tx.meeting.update({
        where: { id: data.id },
        data: {
          status: data.status,
          cancelledReason: data.status === "cancelled" ? data.reason : undefined,
        },
      });
      await logOn(
        tx,
        actor,
        {
          leadId: existing.leadId ?? undefined,
          dealId: existing.dealId ?? undefined,
          contactId: existing.contactId ?? undefined,
        },
        `${label} the meeting "${existing.title}"${data.reason ? `: ${data.reason}` : ""}.`,
      );
      await recordAudit(
        actor,
        {
          action: `meeting.${data.status}`,
          entity: "meeting",
          entityId: data.id,
          summary: `${label} "${existing.title}"`,
        },
        tx,
      );
    });

    refresh();
    const view = await getMeeting(data.id);
    let emailed = false;
    if (view && data.status === "confirmed") emailed = (await sendConfirmed(view)).ok;
    if (view && data.status === "cancelled") emailed = (await sendCancelled(view)).ok;
    return { emailed };
  });
}

/** Free start times on one day (inside the usual hours), as suggestions for staff scheduling a meeting. */
export async function suggestTimes(
  date: string,
  exceptMeetingId?: string,
): Promise<ActionResult<{ times: string[] }>> {
  return runAction(async () => {
    await guard("meetings:view");
    if (!/^d{4}-d{2}-d{2}$/.test(date)) return { times: [] };
    const settings = await getDocument("booking");
    const from = fromManila(date, "00:00");
    const busy = await busyIntervals(from, fromManila(addDays(date, 1), "00:00"), exceptMeetingId);
    // Staff may book at short notice and beyond the public window, so only the hours and the diary count.
    const open = { ...settings, enabled: true, minNoticeHours: 0, maxDaysAhead: 3650 };
    const slots = slotsForDate(date, open, busy, new Date(from.getTime() - 24 * 3600_000));
    return { times: slots.map(manilaTime) };
  });
}
