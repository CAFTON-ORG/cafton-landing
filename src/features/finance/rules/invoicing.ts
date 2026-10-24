/**
 * The rules of invoices, payments and credit notes, in one place so the screens, the server and the
 * tests agree. Pure: no database. Money is whole centavos; dates are "YYYY-MM-DD" (Manila time).
 */

import { addDays } from "@/features/schedule/rules/slots";
import { isRealDate, roundDiv, taxOf } from "./core";

/* ------------------------------------------------------------------ invoices */

export const INVOICE_STATUSES = ["draft", "issued", "void"] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

/** What an invoice looks like to a person: its status and, once issued, where payment stands. */
export type InvoiceState = "draft" | "void" | "open" | "partial" | "overdue" | "paid";

export const INVOICE_STATE_LABEL: Record<InvoiceState, string> = {
  draft: "Draft",
  void: "Void",
  open: "Waiting for payment",
  partial: "Partly paid",
  overdue: "Overdue",
  paid: "Paid",
};

export const MAX_DESCRIPTION = 1000;
export const MAX_LINES = 100;
export const MAX_NOTES = 2000;
export const DEFAULT_TERMS_DAYS = 15;
export const MAX_TERMS_DAYS = 180;

/** One line's amount: quantity (in thousandths) times unit price, to the centavo. */
export function lineAmount(quantityMilli: number, unitPriceMinor: number): number {
  return Number(roundDiv(BigInt(quantityMilli) * BigInt(unitPriceMinor), BigInt(1000)));
}

export interface PricedLine {
  amountMinor: number;
  taxable: boolean;
}

export interface Totals {
  subtotalMinor: number;
  taxMinor: number;
  totalMinor: number;
}

/** Tax is the rate on the taxable lines taken together, rounded once: the same way quotes do it. */
export function invoiceTotals(lines: readonly PricedLine[], taxRateBp: number): Totals {
  const subtotalMinor = lines.reduce((sum, line) => sum + line.amountMinor, 0);
  const taxable = lines
    .filter((line) => line.taxable)
    .reduce((sum, line) => sum + line.amountMinor, 0);
  const taxMinor = taxOf(taxable, taxRateBp);
  return { subtotalMinor, taxMinor, totalMinor: subtotalMinor + taxMinor };
}

export interface DraftLine {
  description: string;
  quantityMilli: number;
  unitPriceMinor: number;
}

export interface DraftErrors {
  clientName?: string;
  dueDate?: string;
  issueDate?: string;
  form?: string;
  lines?: Record<number, string>;
}

/** Why a draft can't be saved as written, or null. */
export function checkDraft(input: {
  clientName: string;
  issueDate?: string | null;
  dueDate?: string | null;
  lines: readonly DraftLine[];
}): DraftErrors | null {
  const errors: DraftErrors = {};
  if (!input.clientName.trim()) errors.clientName = "Say who the invoice is for.";
  if (input.issueDate && !isRealDate(input.issueDate)) errors.issueDate = "Pick a real date.";
  if (input.dueDate && !isRealDate(input.dueDate)) errors.dueDate = "Pick a real date.";
  if (input.issueDate && input.dueDate && input.dueDate < input.issueDate) {
    errors.dueDate = "The due date can't be before the issue date.";
  }
  if (input.lines.length > MAX_LINES)
    errors.form = `An invoice can have at most ${MAX_LINES} lines.`;
  const lineErrors: Record<number, string> = {};
  input.lines.forEach((line, index) => {
    if (!line.description.trim()) lineErrors[index] = "Describe what is being charged.";
    else if (line.description.trim().length > MAX_DESCRIPTION)
      lineErrors[index] = `Keep it under ${MAX_DESCRIPTION} characters.`;
    else if (!Number.isSafeInteger(line.quantityMilli) || line.quantityMilli <= 0)
      lineErrors[index] = "The quantity must be more than zero.";
    else if (!Number.isSafeInteger(line.unitPriceMinor) || line.unitPriceMinor < 0)
      lineErrors[index] = "The price can't be negative.";
  });
  if (Object.keys(lineErrors).length > 0) errors.lines = lineErrors;
  return Object.keys(errors).length > 0 ? errors : null;
}

/** Why a draft can't be issued yet, or null. Issuing numbers it, posts it and freezes it. */
export function checkIssue(input: {
  status: InvoiceStatus;
  clientName: string;
  lineCount: number;
  totalMinor: number;
  issueDate: string | null;
  dueDate: string | null;
  today: string;
}): string | null {
  if (input.status !== "draft") return "Only a draft can be issued.";
  if (!input.clientName.trim()) return "Say who the invoice is for first.";
  if (input.lineCount === 0) return "Add at least one line first.";
  if (input.totalMinor <= 0) return "An invoice has to be for more than zero.";
  if (!input.issueDate || !input.dueDate) return "Set the issue and due dates first.";
  if (input.issueDate > addDays(input.today, 31)) return "The issue date is too far ahead.";
  if (input.dueDate < input.issueDate) return "The due date can't be before the issue date.";
  return null;
}

export const dueDateFor = (issueDate: string, termsDays: number) => addDays(issueDate, termsDays);

export interface Standing {
  totalMinor: number;
  /** Payments (non-void) applied to it. */
  settledMinor: number;
  /** Credit notes (non-void) against it. */
  creditedMinor: number;
}

/** What is still owed. */
export const balanceOf = ({ totalMinor, settledMinor, creditedMinor }: Standing) =>
  totalMinor - settledMinor - creditedMinor;

export function stateOf(
  invoice: Standing & { status: InvoiceStatus; dueDate: string | null },
  today: string,
): InvoiceState {
  if (invoice.status === "draft") return "draft";
  if (invoice.status === "void") return "void";
  const balance = balanceOf(invoice);
  if (balance <= 0) return "paid";
  if (invoice.dueDate && invoice.dueDate < today) return "overdue";
  return invoice.settledMinor + invoice.creditedMinor > 0 ? "partial" : "open";
}

/* --------------------------------------------------------------------- aging */

export const AGING_BUCKETS = ["current", "1-30", "31-60", "61-90", "90+"] as const;
export type AgingBucket = (typeof AGING_BUCKETS)[number];

export const AGING_LABEL: Record<AgingBucket, string> = {
  current: "Not due yet",
  "1-30": "1 to 30 days late",
  "31-60": "31 to 60 days late",
  "61-90": "61 to 90 days late",
  "90+": "Over 90 days late",
};

/** Days after the due date (zero or negative: not late). */
export function daysPastDue(dueDate: string, today: string): number {
  const ms = Date.parse(`${today}T00:00:00Z`) - Date.parse(`${dueDate}T00:00:00Z`);
  return Math.floor(ms / 86_400_000);
}

export function agingBucket(dueDate: string, today: string): AgingBucket {
  const late = daysPastDue(dueDate, today);
  if (late <= 0) return "current";
  if (late <= 30) return "1-30";
  if (late <= 60) return "31-60";
  if (late <= 90) return "61-90";
  return "90+";
}

/* ----------------------------------------------------------------- reminders */

export const REMINDER_FIRST_AFTER_DAYS = 3;
export const REMINDER_EVERY_DAYS = 7;
export const MAX_REMINDERS = 3;

/** Whether a polite reminder is due: a few days late, then weekly, and never more than three. */
export function reminderDue(input: {
  state: InvoiceState;
  dueDate: string | null;
  today: string;
  reminderCount: number;
  lastReminderOn: string | null;
  hasEmail: boolean;
}): boolean {
  if (input.state !== "overdue" || !input.dueDate || !input.hasEmail) return false;
  if (input.reminderCount >= MAX_REMINDERS) return false;
  if (daysPastDue(input.dueDate, input.today) < REMINDER_FIRST_AFTER_DAYS) return false;
  if (!input.lastReminderOn) return true;
  return daysPastDue(input.lastReminderOn, input.today) >= REMINDER_EVERY_DAYS;
}

/* ------------------------------------------------------------------ payments */

export const PAYMENT_METHODS = [
  "bank_transfer",
  "cash",
  "check",
  "gcash",
  "maya",
  "card",
  "other",
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  bank_transfer: "Bank transfer",
  cash: "Cash",
  check: "Check",
  gcash: "GCash",
  maya: "Maya",
  card: "Card",
  other: "Other",
};

export interface AllocationInput {
  invoiceId: string;
  amountMinor: number;
}

export interface PaymentErrors {
  amount?: string;
  cwt?: string;
  date?: string;
  form?: string;
  /** By invoice id. */
  allocations?: Record<string, string>;
}

/** Why a payment can't be recorded as written, or null. What it brings in beyond the invoices becomes a customer deposit. */
export function checkPayment(input: {
  amountMinor: number;
  cwtMinor: number;
  receivedDate: string;
  today: string;
  allocations: readonly AllocationInput[];
  /** The invoices being settled: what each is still owed and whether it can take payment. */
  invoices: ReadonlyMap<
    string,
    { status: InvoiceStatus; balanceMinor: number; number: string | null }
  >;
}): PaymentErrors | null {
  const errors: PaymentErrors = {};
  if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0)
    errors.amount = "Enter the amount received.";
  if (!Number.isSafeInteger(input.cwtMinor) || input.cwtMinor < 0)
    errors.cwt = "The withheld amount can't be negative.";
  if (!isRealDate(input.receivedDate)) errors.date = "Pick the date it was received.";
  else if (input.receivedDate > input.today)
    errors.date = "A payment can't be dated in the future.";

  const allocationErrors: Record<string, string> = {};
  const seen = new Set<string>();
  let applied = 0;
  for (const allocation of input.allocations) {
    const invoice = input.invoices.get(allocation.invoiceId);
    if (seen.has(allocation.invoiceId))
      allocationErrors[allocation.invoiceId] = "Each invoice can be listed once.";
    seen.add(allocation.invoiceId);
    if (!invoice) allocationErrors[allocation.invoiceId] = "That invoice no longer exists.";
    else if (invoice.status !== "issued")
      allocationErrors[allocation.invoiceId] =
        `${invoice.number ?? "That invoice"} isn't open for payment.`;
    else if (!Number.isSafeInteger(allocation.amountMinor) || allocation.amountMinor <= 0)
      allocationErrors[allocation.invoiceId] = "Enter more than zero.";
    else if (allocation.amountMinor > invoice.balanceMinor)
      allocationErrors[allocation.invoiceId] =
        `${invoice.number} is only owed ${(invoice.balanceMinor / 100).toFixed(2)}.`;
    applied += Number.isSafeInteger(allocation.amountMinor) ? allocation.amountMinor : 0;
  }
  if (Object.keys(allocationErrors).length > 0) errors.allocations = allocationErrors;
  if (!errors.amount && !errors.cwt && applied > input.amountMinor + input.cwtMinor) {
    errors.form =
      "The invoices add up to more than was received. Lower an amount, or record the withholding tax.";
  }
  if (!errors.cwt && input.cwtMinor > applied && applied > 0) {
    errors.cwt = "The tax withheld can't be more than what the invoices are being paid.";
  }
  return Object.keys(errors).length > 0 ? errors : null;
}

/** What a payment leaves unapplied: money held for the client until it is put against an invoice. */
export const unappliedOf = (
  amountMinor: number,
  cwtMinor: number,
  allocations: readonly AllocationInput[],
) =>
  amountMinor + cwtMinor - allocations.reduce((sum, allocation) => sum + allocation.amountMinor, 0);

/* -------------------------------------------------------------- credit notes */

export interface CreditNoteErrors {
  subtotal?: string;
  tax?: string;
  reason?: string;
  form?: string;
}

/** Why a credit note can't be issued, or null. It can't take back more than is still owed. */
export function checkCreditNote(input: {
  invoiceStatus: InvoiceStatus;
  balanceMinor: number;
  subtotalMinor: number;
  taxMinor: number;
  reason: string;
}): CreditNoteErrors | null {
  const errors: CreditNoteErrors = {};
  if (input.invoiceStatus !== "issued") errors.form = "A credit note is for an issued invoice.";
  if (!Number.isSafeInteger(input.subtotalMinor) || input.subtotalMinor <= 0)
    errors.subtotal = "Enter the amount to take back.";
  if (!Number.isSafeInteger(input.taxMinor) || input.taxMinor < 0)
    errors.tax = "The tax can't be negative.";
  if (!input.reason.trim()) errors.reason = "Say why the credit is given.";
  if (
    !errors.subtotal &&
    !errors.tax &&
    !errors.form &&
    input.subtotalMinor + input.taxMinor > input.balanceMinor
  ) {
    errors.form = `That is more than the ${(input.balanceMinor / 100).toFixed(2)} still owed. Credit what is unpaid, or void the payment first.`;
  }
  return Object.keys(errors).length > 0 ? errors : null;
}

/* ---------------------------------------------------------------------- voids */

/** An invoice can be voided only while nothing has been paid or credited against it. */
export function checkVoidInvoice(input: {
  status: InvoiceStatus;
  settledMinor: number;
  creditedMinor: number;
  reason: string;
}): string | null {
  if (input.status !== "issued")
    return input.status === "void"
      ? "This invoice is already void."
      : "A draft is deleted, not voided.";
  if (input.settledMinor > 0) return "Payments are recorded against this invoice. Void them first.";
  if (input.creditedMinor > 0)
    return "Credit notes are recorded against this invoice. Void them first.";
  if (!input.reason.trim()) return "Say why it is being voided.";
  return null;
}

export function checkVoidSettlement(input: { status: string; reason: string }): string | null {
  if (input.status === "void") return "This is already void.";
  if (!input.reason.trim()) return "Say why it is being voided.";
  return null;
}

/* ------------------------------------------------------------- from milestones */

/** Why a milestone can't go on an invoice, or null: it is done, billable, has an amount and wasn't billed already. */
export function checkMilestoneInvoiceable(input: {
  name: string;
  status: string;
  billable: boolean;
  amountMinor: number | null;
  alreadyInvoiced: boolean;
}): string | null {
  if (!input.billable || !input.amountMinor) return `${input.name} isn't billable.`;
  if (input.status !== "done") return `${input.name} isn't finished yet.`;
  if (input.alreadyInvoiced) return `${input.name} is already on an invoice.`;
  return null;
}
