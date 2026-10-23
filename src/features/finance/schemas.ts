import { z } from "zod";

import { ACCOUNT_TYPES, MAX_ACCOUNT_NAME, MAX_ENTRY_LINES, MAX_MEMO } from "./rules";

/** What the forms send. Amounts arrive as pesos text and are parsed (and checked again) on the server. */

const id = z.string().uuid();

export const accountSchema = z.object({
  id: id.optional(),
  code: z.string().trim().max(6),
  name: z
    .string()
    .trim()
    .max(MAX_ACCOUNT_NAME * 2),
  type: z.enum(ACCOUNT_TYPES),
  description: z
    .string()
    .trim()
    .max(300)
    .optional()
    .transform((value) => value || null),
});
export type AccountInput = z.input<typeof accountSchema>;

export const entrySchema = z.object({
  date: z.string().trim().max(10),
  memo: z.string().max(MAX_MEMO * 2),
  lines: z
    .array(
      z.object({
        accountId: z.string().max(60),
        /** Pesos like "1,250.50"; "" for none. */
        debit: z.string().trim().max(24).default(""),
        credit: z.string().trim().max(24).default(""),
        memo: z.string().trim().max(200).optional(),
      }),
    )
    .max(MAX_ENTRY_LINES * 2),
});
export type EntryInput = z.input<typeof entrySchema>;

export const reverseSchema = z.object({
  id,
  reason: z.string().trim().max(300),
  /** Defaults to today. */
  date: z.string().trim().max(10).optional(),
});

export const periodSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
});

export const taxRateSchema = z.object({
  id: id.optional(),
  code: z.string().trim().toUpperCase().max(20),
  name: z.string().trim().max(120),
  /** Percent like "12" or "2.5". */
  rate: z.string().trim().max(8),
  kind: z.enum(["vat", "percentage", "withholding"]),
  active: z.boolean().default(true),
});
export type TaxRateInput = z.input<typeof taxRateSchema>;
