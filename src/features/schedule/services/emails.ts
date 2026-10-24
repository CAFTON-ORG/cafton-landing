import "server-only";
import { notify, staffIdsWith } from "@/features/notifications/services/notify";

import { getDocument } from "@/features/cms/repository/documents";
import { prisma } from "@/lib/db";
import { resolvePermissions, type Permission } from "@/lib/auth/permissions";
import { env } from "@/lib/env";
import { sendMail, siteOrigin } from "@/lib/mail";
import { renderEmail } from "@/lib/mail-templates";
import { buildIcs, icsAttachment } from "../rules/ics";
import { formatManila, formatManilaTime } from "../rules/slots";
import { MEETING_MODE_LABEL, type MeetingView } from "../types";

/** Staff who may act on meetings: they are told when a visitor asks for one. */
export async function staffEmailsWith(permission: Permission): Promise<string[]> {
  const profiles = await prisma.profile.findMany({
    include: { role: { include: { permissions: true } } },
  });
  return profiles
    .filter((profile) => resolvePermissions(profile.role).includes(permission))
    .map((profile) => profile.email);
}

const replyAddress = () =>
  (env.MAIL_FROM?.match(/<([^>]+)>/)?.[1] ?? env.MAIL_FROM ?? "no-reply@cafton.com").trim();

/** Where the call happens, in words the person can act on. */
async function whereText(meeting: MeetingView): Promise<string> {
  const booking = await getDocument("booking");
  if (meeting.mode === "video")
    return (
      meeting.location || booking.videoLink || "We will email you the video link before the call."
    );
  if (meeting.mode === "phone")
    return (
      meeting.location ||
      `We will call ${meeting.attendeePhone ?? "you"}${booking.phoneNumber ? ` (from ${booking.phoneNumber})` : ""}.`
    );
  return meeting.location || booking.office || "We will confirm the address.";
}

const when = (meeting: MeetingView) =>
  `${formatManila(new Date(meeting.startsAt))} to ${formatManilaTime(new Date(meeting.endsAt))} (Philippine time)`;

const facts = async (meeting: MeetingView): Promise<[string, string][]> => [
  ["When", when(meeting)],
  ["Type", MEETING_MODE_LABEL[meeting.mode]],
  ["Where", await whereText(meeting)],
];

/** To the visitor, right after they ask for a time on the contact form. */
export async function sendRequestReceived(meeting: MeetingView) {
  const { html, text } = renderEmail({
    title: "We received your request",
    paragraphs: [
      `Hi ${meeting.attendeeName.split(" ")[0]}, thanks for reaching out. We will confirm the time below by email, usually within one business day.`,
    ],
    facts: await facts(meeting),
    footnote: "Need a different time? Reply to this email.",
  });
  return sendMail({
    to: meeting.attendeeEmail,
    subject: "We received your meeting request",
    text,
    html,
    replyTo: replyAddress(),
  });
}

/** To the visitor when a request or a staff-made meeting is confirmed, with a calendar file. */
export async function sendConfirmed(meeting: MeetingView, options: { updated?: boolean } = {}) {
  const { html, text } = renderEmail({
    title: options.updated ? "Your meeting has been rescheduled" : "Your meeting is confirmed",
    paragraphs: [
      `Hi ${meeting.attendeeName.split(" ")[0]}, ${options.updated ? "here is the new time" : "we look forward to talking"}.`,
    ],
    facts: await facts(meeting),
    button: { label: "Visit cafton.com", href: siteOrigin() },
    footnote: "A calendar file is attached: open it to add the meeting to your calendar.",
  });
  const ics = buildIcs({
    uid: meeting.id,
    title: meeting.title,
    description: `Meeting with Cafton.\n${await whereText(meeting)}`,
    location: await whereText(meeting),
    start: new Date(meeting.startsAt),
    end: new Date(meeting.endsAt),
    organizerEmail: replyAddress(),
    attendeeEmail: meeting.attendeeEmail,
    attendeeName: meeting.attendeeName,
    sequence: options.updated ? 1 : 0,
  });
  return sendMail({
    to: meeting.attendeeEmail,
    subject: options.updated ? "Your meeting has been rescheduled" : "Your meeting is confirmed",
    text,
    html,
    replyTo: replyAddress(),
    attachments: [icsAttachment(ics)],
  });
}

/** To the visitor when a meeting is cancelled; the calendar file removes it from their calendar. */
export async function sendCancelled(meeting: MeetingView) {
  const { html, text } = renderEmail({
    title: "Your meeting was cancelled",
    paragraphs: [
      `Hi ${meeting.attendeeName.split(" ")[0]}, we had to cancel the meeting below.${meeting.cancelledReason ? ` ${meeting.cancelledReason}` : ""}`,
      "You are welcome to book another time on our contact page.",
    ],
    facts: [["Was", when(meeting)]],
    button: { label: "Book another time", href: `${siteOrigin()}/contact` },
  });
  const ics = buildIcs({
    uid: meeting.id,
    title: meeting.title,
    start: new Date(meeting.startsAt),
    end: new Date(meeting.endsAt),
    organizerEmail: replyAddress(),
    attendeeEmail: meeting.attendeeEmail,
    attendeeName: meeting.attendeeName,
    method: "CANCEL",
    sequence: 2,
  });
  return sendMail({
    to: meeting.attendeeEmail,
    subject: "Your meeting was cancelled",
    text,
    html,
    replyTo: replyAddress(),
    attachments: [icsAttachment(ics, "cancelled.ics")],
  });
}

/** To the team when a visitor asks for a time. */
export async function notifyStaffOfRequest(meeting: MeetingView, leadReference?: string) {
  await notify(await staffIdsWith("meetings:update"), {
    kind: "meeting.request",
    title: `Meeting request from ${meeting.attendeeName}`,
    body: when(meeting),
    href: "/dashboard/crm/schedule",
  });
  const to = await staffEmailsWith("meetings:update");
  if (to.length === 0) return { ok: false as const, reason: "rejected" as const };
  const { html, text } = renderEmail({
    title: "A visitor asked for a meeting",
    paragraphs: [
      `${meeting.attendeeName} asked for a time on the contact form. It is waiting for you to confirm.`,
    ],
    facts: [
      ["Who", `${meeting.attendeeName} (${meeting.attendeeEmail})`],
      ["When", when(meeting)],
      ["Type", MEETING_MODE_LABEL[meeting.mode]],
      ...(leadReference ? ([["Lead", leadReference]] as [string, string][]) : []),
    ],
    button: { label: "Open the schedule", href: `${siteOrigin()}/dashboard/crm/schedule` },
  });
  return sendMail({
    to,
    subject: `Meeting request from ${meeting.attendeeName}`,
    text,
    html,
    replyTo: meeting.attendeeEmail,
  });
}

/** To the visitor the day before, so nobody forgets or misses the link. */
export async function sendReminder(meeting: MeetingView) {
  const { html, text } = renderEmail({
    title: "A reminder about your meeting",
    paragraphs: [
      `Hi ${meeting.attendeeName.split(" ")[0]}, this is a reminder that we are meeting soon.`,
    ],
    facts: await facts(meeting),
    footnote: "Can't make it? Reply to this email and we will find another time.",
  });
  return sendMail({
    to: meeting.attendeeEmail,
    subject: "Reminder: your meeting with Cafton",
    text,
    html,
    replyTo: replyAddress(),
  });
}
