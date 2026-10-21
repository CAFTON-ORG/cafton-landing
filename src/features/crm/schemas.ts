import { z } from "zod";

import { DEFAULT_CURRENCY, parseMinor } from "@/lib/money";
import { ACTIVITY_TYPES } from "./types";

const text = (max: number) => z.string().trim().max(max, `Keep this under ${max} characters.`);
const optionalText = (max: number) =>
  text(max)
    .optional()
    .transform((value) => value || undefined);
const optionalId = z
  .string()
  .optional()
  .transform((value) => (value && value !== "none" ? value : undefined));
const optionalDate = z
  .string()
  .optional()
  .refine((value) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value), "Use a valid date.")
  .transform((value) => value || undefined);

export const contactRecordSchema = z.object({
  firstName: text(100).min(1, "First name is required."),
  lastName: text(100).min(1, "Last name is required."),
  email: z
    .email("Enter a valid email address.")
    .max(254)
    .transform((value) => value.toLowerCase()),
  phone: optionalText(50),
  position: optionalText(120),
  organizationId: optionalId,
  ownerId: optionalId,
  notes: optionalText(5000),
});
export type ContactInput = z.input<typeof contactRecordSchema>;

export const organizationSchema = z.object({
  name: text(200).min(1, "Name is required."),
  industry: optionalText(120),
  size: optionalText(60),
  website: optionalText(300).refine(
    (value) => !value || /^https?:\/\/[^\s.]+\.[^\s]+$/i.test(value),
    "Enter a full web address, e.g. https://example.com.",
  ),
  phone: optionalText(50),
  address: optionalText(300),
  notes: optionalText(5000),
});
export type OrganizationInput = z.input<typeof organizationSchema>;

const amountField = z
  .string()
  .optional()
  .transform((value, ctx) => {
    const raw = (value ?? "").trim();
    if (!raw) return null;
    const minor = parseMinor(raw, DEFAULT_CURRENCY);
    if (minor === null) {
      ctx.addIssue({ code: "custom", message: "Enter an amount like 12500 or 12,500.50." });
      return z.NEVER;
    }
    return minor;
  });

export const dealSchema = z.object({
  title: text(200).min(1, "Give the deal a title."),
  contactId: z.string().min(1, "Choose a contact."),
  organizationId: optionalId,
  ownerId: optionalId,
  /** Pesos as typed by a person; stored as integer centavos. */
  amount: amountField,
  expectedCloseDate: optionalDate,
  description: optionalText(5000),
});
export type DealInput = z.input<typeof dealSchema>;

export const subjectSchema = z
  .object({
    leadId: z.string().optional(),
    contactId: z.string().optional(),
    dealId: z.string().optional(),
  })
  .refine(
    (value) => [value.leadId, value.contactId, value.dealId].filter(Boolean).length === 1,
    "Pick one record.",
  );

export const activitySchema = z.object({
  type: z.enum(ACTIVITY_TYPES),
  body: text(5000).min(1, "Write something first."),
  subject: subjectSchema,
});
export type ActivityInput = z.input<typeof activitySchema>;

export const taskSchema = z.object({
  title: text(200).min(1, "Describe the task."),
  /** yyyy-mm-dd; the task is due at the end of that day in the server's time zone. */
  due: optionalDate,
  assigneeId: optionalId,
  subject: subjectSchema.optional(),
});
export type TaskInput = z.input<typeof taskSchema>;

export const reasonSchema = text(500).min(1, "A reason is required.");
