import { z } from "zod";

import { MAX_LINES, MAX_NOTES, PAYMENT_METHODS } from "../rules/invoicing";

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

export const vendorSchema = z.object({
  /** Present when editing. */
  id: id.optional(),
  name: z.string().trim().max(200),
  email: text(200),
  phone: text(60),
  address: text(400),
  tin: text(30),
  defaultAccountId: optionalId,
  termsDays: z.coerce.number().int().min(0).max(180).default(15),
  notes: text(MAX_NOTES),
});
export type VendorInput = z.input<typeof vendorSchema>;

export const newBillSchema = z.object({ vendorId: id });
export type NewBillInput = z.input<typeof newBillSchema>;

export const billSchema = z.object({
  id,
  vendorId: id,
  vendorRef: text(100),
  billDate: z.string().trim().max(10),
  dueDate: z.string().trim().max(10),
  notes: text(MAX_NOTES),
  lines: z
    .array(
      z.object({
        description: z.string().max(2000),
        accountId: z.string().max(40),
        /** Pesos like "12,500.50". */
        amount: z.string().trim().max(24),
      }),
    )
    .max(MAX_LINES),
});
export type BillInput = z.input<typeof billSchema>;

export const billPaymentSchema = z.object({
  billId: id,
  paidDate: z.string().trim().max(10),
  /** Pesos that left the bank or the till. */
  amount: z.string().trim().max(24),
  /** Pesos of tax held back from the supplier. */
  wht: z.string().trim().max(24).default(""),
  method: z.enum(PAYMENT_METHODS),
  reference: text(120),
  paidFromAccountId: id,
  note: text(500),
});
export type BillPaymentInput = z.input<typeof billPaymentSchema>;
