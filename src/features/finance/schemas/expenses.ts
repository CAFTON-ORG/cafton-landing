import { z } from "zod";

import { MAX_DESCRIPTION, MAX_NOTES } from "../rules/expenses";

const id = z.string().uuid();
const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => value || null);
const optionalId = z
  .string()
  .nullable()
  .optional()
  .transform((value) => (!value || value === "none" ? null : value))
  .pipe(id.nullable());

export const expenseSchema = z.object({
  /** Present when editing. */
  id: id.optional(),
  expenseDate: z.string().trim().max(10),
  payee: z.string().trim().max(200),
  vendorId: optionalId,
  description: z.string().trim().max(MAX_DESCRIPTION),
  accountId: z.string().max(40),
  /** Pesos like "850" or "1,250.50". */
  amount: z.string().trim().max(24),
  paidFromAccountId: z.string().max(40),
  notes: text(MAX_NOTES),
});
export type ExpenseInput = z.input<typeof expenseSchema>;

export const reasonSchema = z.object({ id, reason: z.string().trim().max(300) });
