import "server-only";

import { randomBytes } from "node:crypto";

import { prisma } from "@/lib/db";
import { escapeText, fold, stamp } from "../rules/ics";
import { MEETING_MODE_LABEL, type MeetingMode } from "../types";

/** A new unguessable link token: 32 random bytes, URL safe, 43 characters. */
export const newCalendarToken = () => randomBytes(32).toString("base64url");

const DAY = 86_400_000;

export interface FeedEvent {
  uid: string;
  title: string;
  start: Date;
  end: Date;
  location?: string;
  description?: string;
  tentative: boolean;
  updatedAt: Date;
}

/** A subscribable calendar: Google, Outlook and Apple Calendar poll it and stay up to date. */
export function buildFeed(name: string, events: FeedEvent[]): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Cafton//Schedule feed//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(name)}`,
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    ...events.flatMap((event) => [
      "BEGIN:VEVENT",
      `UID:${event.uid}@cafton.com`,
      `DTSTAMP:${stamp(event.updatedAt)}`,
      `DTSTART:${stamp(event.start)}`,
      `DTEND:${stamp(event.end)}`,
      `SUMMARY:${escapeText(event.title)}`,
      ...(event.description ? [`DESCRIPTION:${escapeText(event.description)}`] : []),
      ...(event.location ? [`LOCATION:${escapeText(event.location)}`] : []),
      `STATUS:${event.tentative ? "TENTATIVE" : "CONFIRMED"}`,
      "END:VEVENT",
    ]),
    "END:VCALENDAR",
  ];
  return `${lines.map(fold).join("\r\n")}\r\n`;
}

/**
 * The calendar behind a personal link: the meetings that person hosts (and those nobody hosts
 * yet), from last month on. Null when the link is unknown, so a stranger learns nothing.
 */
export async function calendarForToken(token: string, now = new Date()) {
  const profile = await prisma.profile.findUnique({
    where: { calendarToken: token },
    select: { id: true, fullName: true, email: true },
  });
  if (!profile) return null;
  const meetings = await prisma.meeting.findMany({
    where: {
      status: { in: ["requested", "confirmed"] },
      startsAt: {
        gte: new Date(now.getTime() - 30 * DAY),
        lte: new Date(now.getTime() + 365 * DAY),
      },
      OR: [{ ownerId: profile.id }, { ownerId: null }],
    },
    orderBy: { startsAt: "asc" },
  });
  const events: FeedEvent[] = meetings.map((meeting) => ({
    uid: meeting.id,
    title: meeting.title,
    start: meeting.startsAt,
    end: meeting.endsAt,
    location: meeting.location ?? undefined,
    description: [
      `With: ${meeting.attendeeName} (${meeting.attendeeEmail})`,
      meeting.attendeePhone ? `Phone: ${meeting.attendeePhone}` : "",
      `Type: ${MEETING_MODE_LABEL[meeting.mode as MeetingMode]}`,
      meeting.status === "requested" ? "Waiting for confirmation" : "",
      meeting.notes ? `Notes: ${meeting.notes}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
    tentative: meeting.status === "requested",
    updatedAt: meeting.updatedAt,
  }));
  return { name: `Cafton schedule (${profile.fullName ?? profile.email})`, events };
}
