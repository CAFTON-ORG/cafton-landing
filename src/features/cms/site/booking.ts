import { z } from "zod";

import { booking } from "../content/booking";
import type { DocSpec } from "./spec";

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use 24-hour time such as 09:00.");

export const bookingSchema = z.object({
  enabled: z.boolean(),
  autoConfirm: z.boolean(),
  slotMinutes: z
    .number({ error: "Enter a number of minutes." })
    .int()
    .min(15, "At least 15 minutes.")
    .max(180, "At most 180 minutes."),
  bufferMinutes: z
    .number({ error: "Enter a number of minutes." })
    .int()
    .min(0)
    .max(120, "At most 120 minutes."),
  minNoticeHours: z
    .number({ error: "Enter a number of hours." })
    .int()
    .min(0)
    .max(336, "At most 336 hours (two weeks)."),
  maxDaysAhead: z
    .number({ error: "Enter a number of days." })
    .int()
    .min(1)
    .max(365, "At most 365 days."),
  hours: z
    .array(
      z
        .object({ open: z.boolean(), start: time, end: time })
        .refine((day) => !day.open || day.start < day.end, "The day must end after it starts."),
    )
    .length(7),
  blockedDates: z
    .array(
      z.object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use the form 2026-12-25."),
        reason: z.string().trim().max(80),
      }),
    )
    .max(100),
  videoLink: z.union([
    z.literal(""),
    z
      .string()
      .trim()
      .url("Enter a full link starting with https://")
      .startsWith("https://", "The link must start with https://"),
  ]),
  phoneNumber: z.string().trim().max(40),
  office: z.string().trim().max(200),
  intro: z.string().trim().max(300),
});

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export const bookingSpec: DocSpec = {
  key: "booking",
  title: "Booking settings",
  description:
    "When visitors and staff can book a call, and how long it lasts. Times are Philippine time.",
  path: "/contact",
  sections: [
    {
      title: "Availability",
      description:
        "Slots are offered inside these hours, minus meetings already booked and the buffer around them.",
      fields: [
        {
          kind: "checkbox",
          name: "enabled",
          label: "Let visitors book a call on the contact form",
        },
        {
          kind: "checkbox",
          name: "autoConfirm",
          label: "Confirm requests automatically",
          hint: "Off: every request waits for you to confirm it (recommended while the team is small).",
        },
        {
          kind: "list",
          name: "hours",
          label: "Weekly hours",
          itemName: "Day",
          itemLabels: DAYS,
          fixed: true,
          summary: "start",
          fields: [
            { kind: "checkbox", name: "open", label: "Open this day" },
            { kind: "text", name: "start", label: "From (24-hour)", placeholder: "09:00" },
            { kind: "text", name: "end", label: "Until (24-hour)", placeholder: "17:00" },
          ],
        },
      ],
    },
    {
      title: "Rules",
      fields: [
        {
          kind: "number",
          name: "slotMinutes",
          label: "Length of a call (minutes)",
          min: 15,
          max: 180,
          step: 15,
        },
        {
          kind: "number",
          name: "bufferMinutes",
          label: "Gap after each meeting (minutes)",
          min: 0,
          max: 120,
          step: 5,
        },
        {
          kind: "number",
          name: "minNoticeHours",
          label: "Earliest a visitor can book (hours from now)",
          min: 0,
          max: 336,
        },
        {
          kind: "number",
          name: "maxDaysAhead",
          label: "Furthest a visitor can book (days ahead)",
          min: 1,
          max: 365,
        },
        {
          kind: "list",
          name: "blockedDates",
          label: "Days off and holidays",
          itemName: "Day off",
          max: 100,
          summary: "date",
          fields: [
            {
              kind: "text",
              name: "date",
              label: "Date",
              placeholder: "2026-12-25",
              hint: "Year-month-day.",
            },
            { kind: "text", name: "reason", label: "Reason (optional)" },
          ],
        },
      ],
    },
    {
      title: "Where",
      fields: [
        {
          kind: "text",
          name: "videoLink",
          label: "Video call link",
          hint: "Sent with the confirmation. Empty: you send the link yourself.",
        },
        { kind: "text", name: "phoneNumber", label: "Phone number for phone calls" },
        { kind: "text", name: "office", label: "Address for in-person meetings" },
        {
          kind: "textarea",
          name: "intro",
          label: "Text above the calendar on the contact form",
          rows: 2,
        },
      ],
    },
  ],
};

export const bookingDefaults = booking;
