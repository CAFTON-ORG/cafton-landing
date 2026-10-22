import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { namesFor } from "@/features/crm/mappers";
import { fullName } from "@/features/crm/rules";
import { prisma } from "@/lib/db";
import { isDatabaseConfigured } from "@/lib/env";
import { HOLDING } from "./rules";
import type { Interval } from "./slots";
import type { MeetingMode, MeetingStatus, MeetingView } from "./types";

const include = {
  lead: { select: { id: true, reference: true } },
  deal: { select: { id: true, reference: true } },
  contact: { select: { id: true, firstName: true, lastName: true } },
} satisfies Prisma.MeetingInclude;

type Row = Prisma.MeetingGetPayload<{ include: typeof include }>;

async function toViews(rows: Row[]): Promise<MeetingView[]> {
  const names = await namesFor(rows.map((row) => row.ownerId));
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt.toISOString(),
    mode: row.mode as MeetingMode,
    location: row.location ?? undefined,
    status: row.status as MeetingStatus,
    source: row.source === "website" ? "website" : "staff",
    notes: row.notes ?? undefined,
    cancelledReason: row.cancelledReason ?? undefined,
    attendeeName: row.attendeeName,
    attendeeEmail: row.attendeeEmail,
    attendeePhone: row.attendeePhone ?? undefined,
    lead: row.lead ? { id: row.lead.id, label: row.lead.reference } : undefined,
    deal: row.deal ? { id: row.deal.id, label: row.deal.reference } : undefined,
    contact: row.contact ? { id: row.contact.id, label: fullName(row.contact) } : undefined,
    ownerId: row.ownerId ?? undefined,
    ownerName: row.ownerId ? names.get(row.ownerId)?.name : undefined,
    ownerAvatar: row.ownerId ? names.get(row.ownerId)?.avatarUrl : undefined,
  }));
}

/** Meetings that start between two moments, soonest first. */
export async function listMeetings(from: Date, to: Date): Promise<MeetingView[]> {
  if (!isDatabaseConfigured) return [];
  const rows = await prisma.meeting.findMany({
    where: { startsAt: { gte: from, lt: to } },
    orderBy: { startsAt: "asc" },
    include,
  });
  return toViews(rows);
}

/** Requests waiting for an answer (and not already in the past), soonest first. */
export async function listRequests(now: Date): Promise<MeetingView[]> {
  if (!isDatabaseConfigured) return [];
  const rows = await prisma.meeting.findMany({
    where: { status: "requested", endsAt: { gte: now } },
    orderBy: { startsAt: "asc" },
    include,
    take: 50,
  });
  return toViews(rows);
}

/** Meetings about one lead, contact or deal, newest first. */
export async function listMeetingsFor(subject: {
  leadId?: string;
  contactId?: string;
  dealId?: string;
}): Promise<MeetingView[]> {
  if (!isDatabaseConfigured) return [];
  const rows = await prisma.meeting.findMany({
    where: subject,
    orderBy: { startsAt: "desc" },
    include,
    take: 50,
  });
  return toViews(rows);
}

export async function getMeeting(id: string): Promise<MeetingView | null> {
  if (!isDatabaseConfigured) return null;
  const row = await prisma.meeting.findUnique({ where: { id }, include });
  return row ? (await toViews([row]))[0] : null;
}

/**
 * The times already taken, and nothing else (no names): safe to use for the public booking
 * calendar. `except` leaves one meeting out, for moving a meeting to a nearby time.
 */
export async function busyIntervals(from: Date, to: Date, except?: string): Promise<Interval[]> {
  if (!isDatabaseConfigured) return [];
  const rows = await prisma.meeting.findMany({
    where: {
      status: { in: [...HOLDING] as MeetingStatus[] },
      startsAt: { lt: to },
      endsAt: { gt: from },
      ...(except ? { id: { not: except } } : {}),
    },
    select: { startsAt: true, endsAt: true },
  });
  return rows.map((row) => ({ start: row.startsAt, end: row.endsAt }));
}

/** Counts for the schedule header and the sidebar. */
export async function scheduleCounts(now: Date) {
  if (!isDatabaseConfigured) return { requests: 0, upcoming: 0 };
  const [requests, upcoming] = await Promise.all([
    prisma.meeting.count({ where: { status: "requested", endsAt: { gte: now } } }),
    prisma.meeting.count({ where: { status: "confirmed", startsAt: { gte: now } } }),
  ]);
  return { requests, upcoming };
}
