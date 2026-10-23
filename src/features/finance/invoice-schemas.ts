import { z } from "zod";

import { MAX_LINES, MAX_NOTES, PAYMENT_METHODS } from "./invoicing";

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
const day = z
  .string()
  .trim()
  .max(10)
  .optional()
  .transform((value) => value || null);

export const invoiceSchema = z.object({
  id,
  organizationId: optionalId,
  contactId: optionalId,
  clientName: z.string().trim().max(200),
  clientEmail: text(200),
  clientAddress: text(400),
  clientTin: text(30),
  issueDate: day,
  dueDate: day,
  taxCode: z.string().trim().toUpperCase().max(20).default("NOVAT"),
  notes: text(MAX_NOTES),
  paymentInstructions: text(MAX_NOTES),
  lines: z
    .array(
      z.object({
        /** The line's id when it is already on the draft, so what it bills (a milestone, time) stays with it. */
        id: id.optional(),
        description: z.string().max(2000),
        /** Like "1" or "1.5". */
        quantity: z.string().trim().max(12).default("1"),
        unitLabel: z.string().trim().max(30).default("item"),
        /** Pesos like "12,500.50". */
        price: z.string().trim().max(24),
        taxable: z.boolean().default(false),
      }),
    )
    .max(MAX_LINES * 2),
});
export type InvoiceInput = z.input<typeof invoiceSchema>;

export const newInvoiceSchema = z.discriminatedUnion("source", [
  z.object({
    source: z.literal("blank"),
    organizationId: optionalId,
    contactId: optionalId,
    clientName: z.string().trim().max(200).optional().default(""),
  }),
  z.object({ source: z.literal("quote"), quoteId: id }),
  z.object({ source: z.literal("milestones"), milestoneIds: z.array(id).min(1).max(50) }),
  z.object({
    source: z.literal("time"),
    projectId: id,
    /** Approved time worked up to and including this day (yyyy-mm-dd); left out, up to today. */
    upTo: z
      .string()
      .trim()
      .max(10)
      .optional()
      .transform((value) => value || null),
  }),
]);
export type NewInvoiceInput = z.input<typeof newInvoiceSchema>;

export const paymentSchema = z.object({
  receivedDate: z.string().trim().max(10),
  /** Pesos received. */
  amount: z.string().trim().max(24),
  /** Pesos the client withheld, if any. */
  cwt: z.string().trim().max(24).default(""),
  method: z.enum(PAYMENT_METHODS),
  reference: text(120),
  depositAccountId: id,
  note: text(500),
  allocations: z.array(z.object({ invoiceId: id, amount: z.string().trim().max(24) })).max(50),
  /** Who paid, when no invoice says (a deposit before invoicing). */
  clientName: z.string().trim().max(200).optional().default(""),
});
export type PaymentInput = z.input<typeof paymentSchema>;

export const creditNoteSchema = z.object({
  invoiceId: id,
  issueDate: z.string().trim().max(10),
  reason: z.string().trim().max(500),
  /** Pesos, before tax. */
  subtotal: z.string().trim().max(24),
  /** Pesos of tax inside the credit; "" works it out from the invoice. */
  tax: z.string().trim().max(24).default(""),
});
export type CreditNoteInput = z.input<typeof creditNoteSchema>;

export const voidSchema = z.object({ id, reason: z.string().trim().max(300) });
