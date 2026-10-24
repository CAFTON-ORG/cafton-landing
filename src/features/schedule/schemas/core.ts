import { z } from "zod";

import { MEETING_MODES, MEETING_STATUSES } from "../types/core";

const text = (max: number) => z.string().trim().max(max, `Keep this under ${max} characters.`);
const optionalText = (max: number) =>
  text(max)
    .optional()
    .transform((value) => value || undefined);
const optionalId = z
  .string()
  .optional()
  .transform((value) => (value && value !== "none" ? value : undefined));

/** A meeting as staff type it: a Manila date and time, plus how long it lasts. */
export const meetingSchema = z.object({
  id: z.string().optional(),
  title: text(120).min(1, "Give the meeting a title."),
  attendeeName: text(120).min(1, "Who is it with?"),
  attendeeEmail: z
    .email("Enter a valid email address.")
    .max(254)
    .transform((value) => value.toLowerCase()),
  attendeePhone: optionalText(50),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date."),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Pick a time."),
  durationMinutes: z
    .number({ error: "Enter the length in minutes." })
    .int()
    .min(15, "At least 15 minutes.")
    .max(480, "At most 8 hours."),
  mode: z.enum(MEETING_MODES),
  location: optionalText(300),
  notes: optionalText(2000),
  ownerId: optionalId,
  leadId: optionalId,
  contactId: optionalId,
  dealId: optionalId,
  /** Email the person (with a calendar file) when it is saved. */
  notify: z.boolean().default(true),
});
export type MeetingInput = z.input<typeof meetingSchema>;

export const meetingStatusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(MEETING_STATUSES),
  reason: optionalText(300),
});
export type MeetingStatusInput = z.input<typeof meetingStatusSchema>;
