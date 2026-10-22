import "server-only";

import { getDocument } from "@/features/cms/repository/documents";
import { prisma } from "@/lib/db";
import { notifyStaffOfRequest, sendConfirmed, sendRequestReceived } from "./emails";
import { busyIntervals, getMeeting } from "./repository";
import { isOverlapError } from "./rules";
import { addDays, formatManila, isOfferedSlot, manilaDate, slotsByDate } from "./slots";
import type { MeetingMode } from "./types";

/** What the visitor is told about the time they asked for. */
export type BookingOutcome = "requested" | "confirmed" | "unavailable";

/**
 * Offered times for one month of the public calendar. Only free times are returned, never who holds
 * the others. `month` is "YYYY-MM".
 */
export async function availableMonth(month: string, now = new Date()) {
  const settings = await getDocument("booking");
  const first = `${month}-01`;
  const next = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 1));
  const last = addDays(next.toISOString().slice(0, 10), -1);
  if (!settings.enabled) return { enabled: false as const, days: {} as Record<string, string[]> };

  const from = new Date(Date.parse(`${first}T00:00:00Z`) - 24 * 3600_000);
  const to = new Date(Date.parse(`${last}T23:59:59Z`) + 24 * 3600_000);
  const busy = await busyIntervals(from, to);
  const days = slotsByDate(first, last, settings, busy, now);
  return {
    enabled: true as const,
    slotMinutes: settings.slotMinutes,
    intro: settings.intro,
    today: manilaDate(now),
    days: Object.fromEntries(
      Object.entries(days).map(([date, slots]) => [date, slots.map((slot) => slot.toISOString())]),
    ),
  };
}

/**
 * Books the time a visitor chose on the contact form, for the lead that was just created. The
 * time is checked again here (someone may have taken it meanwhile) and the database has the last
 * word: two overlapping meetings cannot exist. Never throws: the lead is already safe.
 */
export async function bookFromWebsite(options: {
  start: Date;
  mode: MeetingMode;
  lead: { id: string; reference: string; contactId?: string | null };
  attendee: { name: string; email: string; phone?: string };
  now?: Date;
}): Promise<BookingOutcome> {
  const now = options.now ?? new Date();
  try {
    const settings = await getDocument("booking");
    if (!settings.enabled) return "unavailable";

    const day = manilaDate(options.start);
    const busy = await busyIntervals(
      new Date(Date.parse(`${day}T00:00:00Z`) - 24 * 3600_000),
      new Date(Date.parse(`${day}T23:59:59Z`) + 24 * 3600_000),
    );
    if (!isOfferedSlot(options.start, settings, busy, now)) return "unavailable";

    const status = settings.autoConfirm ? "confirmed" : "requested";
    const end = new Date(options.start.getTime() + settings.slotMinutes * 60_000);
    const meeting = await prisma.$transaction(async (tx) => {
      const created = await tx.meeting.create({
        data: {
          title: `Call with ${options.attendee.name}`,
          startsAt: options.start,
          endsAt: end,
          mode: options.mode,
          status,
          source: "website",
          attendeeName: options.attendee.name,
          attendeeEmail: options.attendee.email,
          attendeePhone: options.attendee.phone,
          leadId: options.lead.id,
          contactId: options.lead.contactId ?? undefined,
        },
      });
      await tx.activity.create({
        data: {
          type: "meeting",
          leadId: options.lead.id,
          contactId: options.lead.contactId ?? undefined,
          body: `${options.attendee.name} asked for a ${options.mode.replace("_", " ")} call on ${formatManila(options.start)} (Philippine time). ${status === "confirmed" ? "It was confirmed automatically." : "Waiting for confirmation."}`,
          createdByName: "Website contact form",
        },
      });
      return created;
    });

    const view = await getMeeting(meeting.id);
    if (view) {
      if (status === "confirmed") await sendConfirmed(view);
      else await sendRequestReceived(view);
      await notifyStaffOfRequest(view, options.lead.reference);
    }
    return status;
  } catch (error) {
    if (!isOverlapError(error)) console.error("Unable to book the requested call.", error);
    return "unavailable";
  }
}
