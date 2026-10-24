import { z } from "zod";

import { FREQUENCIES, RECURRING_KINDS } from "../rules/recurring";

const id = z.string().uuid();
const optionalId = z
  .string()
  .nullable()
  .optional()
  .transform((value) => (!value || value === "none" ? null : value))
  .pipe(id.nullable());
const day = z
  .string()
  .trim()
  .max(10)
  .optional()
  .transform((value) => value || null);

export const recurringSchema = z.object({
  /** Present when editing. */
  id: id.optional(),
  kind: z.enum(RECURRING_KINDS),
  name: z.string().trim().max(120),
  frequency: z.enum(FREQUENCIES),
  /** The first date; when editing, the next one. */
  startDate: z.string().trim().max(10),
  endDate: day,
  vendorId: optionalId,
  payee: z.string().trim().max(200).default(""),
  description: z.string().trim().max(500),
  accountId: z.string().max(40),
  /** Pesos like "15,000". */
  amount: z.string().trim().max(24),
  paidFromAccountId: z.string().max(40).default(""),
});
export type RecurringInput = z.input<typeof recurringSchema>;
