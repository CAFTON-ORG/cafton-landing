import { z } from "zod";

const id = z.string().uuid();

export const bankAccountSchema = z.object({
  /** Present when editing. */
  id: id.optional(),
  name: z.string().trim().max(120),
  /** The asset account in the books this statement is checked against. */
  accountId: z.string().max(40),
  numberHint: z
    .string()
    .trim()
    .max(6)
    .optional()
    .transform((value) => value || null),
});
export type BankAccountInput = z.input<typeof bankAccountSchema>;

export const importSchema = z.object({
  bankAccountId: id,
  fileName: z.string().trim().max(200).default("statement.csv"),
  csv: z.string().max(2_000_000, "That file is too large (2 MB at most)."),
  dateFormat: z.enum(["ymd", "mdy", "dmy"]),
  /** Preview first: nothing is written until it is false. */
  dryRun: z.boolean(),
});
export type ImportInput = z.input<typeof importSchema>;

export const matchSchema = z.object({ lineId: id, ledgerLineId: id });

export const bookSchema = z.object({
  lineId: id,
  counterAccountId: id,
  memo: z
    .string()
    .trim()
    .max(300)
    .optional()
    .transform((value) => value || null),
});
export type BookInput = z.input<typeof bookSchema>;

export const ignoreSchema = z.object({ lineId: id, note: z.string().trim().max(300) });

export const signOffSchema = z.object({
  bankAccountId: id,
  periodStart: z.string().trim().max(10),
  periodEnd: z.string().trim().max(10),
  /** Pesos from the statement. */
  opening: z.string().trim().max(24),
  closing: z.string().trim().max(24),
});
export type SignOffInput = z.input<typeof signOffSchema>;
