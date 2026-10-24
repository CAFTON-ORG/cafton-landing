/**
 * The rules of vendors, bills and the payments made against them, in one place so the screens, the
 * server and the tests agree. Pure: no database. Money is whole centavos; dates are "YYYY-MM-DD"
 * (Manila time).
 */

import { addDays } from "@/features/schedule/rules/slots";
import { MAX_DESCRIPTION, MAX_LINES } from "./invoicing";
import { isRealDate } from "./core";

export const BILL_STATUSES = ["draft", "approved", "void"] as const;
export type BillStatus = (typeof BILL_STATUSES)[number];

/** Where a bill stands, derived from what has been paid: never stored. */
export type BillState = "draft" | "void" | "open" | "partial" | "overdue" | "paid";

export const BILL_STATE_LABEL: Record<BillState, string> = {
  draft: "Draft",
  void: "Void",
  open: "To pay",
  partial: "Partly paid",
  overdue: "Overdue",
  paid: "Paid",
};

export const DEFAULT_VENDOR_TERMS_DAYS = 15;
export const MAX_VENDOR_TERMS_DAYS = 180;

/* ------------------------------------------------------------------- vendors */

export interface VendorErrors {
  name?: string;
  email?: string;
  terms?: string;
}

export function checkVendor(input: {
  name: string;
  email?: string | null;
  termsDays: number;
}): VendorErrors | null {
  const errors: VendorErrors = {};
  if (!input.name.trim()) errors.name = "Give the supplier a name.";
  else if (input.name.trim().length > 200) errors.name = "Keep the name under 200 characters.";
  if (input.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim()))
    errors.email = "That doesn't look like an email address.";
  if (
    !Number.isInteger(input.termsDays) ||
    input.termsDays < 0 ||
    input.termsDays > MAX_VENDOR_TERMS_DAYS
  )
    errors.terms = `Payment terms are 0 to ${MAX_VENDOR_TERMS_DAYS} days.`;
  return Object.keys(errors).length > 0 ? errors : null;
}

/* --------------------------------------------------------------------- bills */

export interface BillLineInput {
  description: string;
  accountId: string;
  amountMinor: number;
}

export interface BillErrors {
  vendor?: string;
  billDate?: string;
  dueDate?: string;
  form?: string;
  lines?: Record<number, string>;
}

/** Why a bill draft can't be saved as written, or null. */
export function checkBillDraft(input: {
  vendorId: string | null;
  billDate: string;
  dueDate: string;
  lines: readonly BillLineInput[];
}): BillErrors | null {
  const errors: BillErrors = {};
  if (!input.vendorId) errors.vendor = "Choose the supplier.";
  if (!isRealDate(input.billDate)) errors.billDate = "Pick the date on the bill.";
  if (!isRealDate(input.dueDate)) errors.dueDate = "Pick the date it is due.";
  else if (isRealDate(input.billDate) && input.dueDate < input.billDate)
    errors.dueDate = "The due date can't be before the bill date.";
  if (input.lines.length > MAX_LINES) errors.form = `A bill can have at most ${MAX_LINES} lines.`;
  const lineErrors: Record<number, string> = {};
  input.lines.forEach((line, index) => {
    if (!line.description.trim()) lineErrors[index] = "Say what it was for.";
    else if (line.description.trim().length > MAX_DESCRIPTION)
      lineErrors[index] = `Keep it under ${MAX_DESCRIPTION} characters.`;
    else if (!line.accountId) lineErrors[index] = "Choose the account it is booked to.";
    else if (!Number.isSafeInteger(line.amountMinor) || line.amountMinor <= 0)
      lineErrors[index] = "Enter an amount above zero.";
  });
  if (Object.keys(lineErrors).length > 0) errors.lines = lineErrors;
  return Object.keys(errors).length > 0 ? errors : null;
}

export const billTotal = (lines: readonly { amountMinor: number }[]) =>
  lines.reduce((sum, line) => sum + line.amountMinor, 0);

/** Why a draft can't be approved yet, or null. Approving numbers it, posts it and fixes it. */
export function checkApproveBill(input: {
  status: BillStatus;
  vendorActive: boolean;
  lineCount: number;
  totalMinor: number;
  billDate: string;
  today: string;
}): string | null {
  if (input.status !== "draft") return "Only a draft can be approved.";
  if (!input.vendorActive) return "This supplier is archived. Restore them or choose another.";
  if (input.lineCount === 0) return "Add at least one line first.";
  if (input.totalMinor <= 0) return "A bill has to be for more than zero.";
  if (input.billDate > addDays(input.today, 31)) return "The bill date is too far ahead.";
  return null;
}

export interface BillStanding {
  totalMinor: number;
  /** Payments (non-void) made against it: cash and withheld tax together. */
  paidMinor: number;
}

export const billBalance = ({ totalMinor, paidMinor }: BillStanding) => totalMinor - paidMinor;

export function billStateOf(
  bill: BillStanding & { status: BillStatus; dueDate: string },
  today: string,
): BillState {
  if (bill.status === "draft") return "draft";
  if (bill.status === "void") return "void";
  if (billBalance(bill) <= 0) return "paid";
  if (bill.dueDate < today) return "overdue";
  return bill.paidMinor > 0 ? "partial" : "open";
}

/* ------------------------------------------------------------------ payments */

export interface BillPaymentErrors {
  amount?: string;
  wht?: string;
  date?: string;
  form?: string;
}

/** Why a payment can't be recorded as written, or null. Cash and withheld tax together settle the bill. */
export function checkBillPayment(input: {
  billStatus: BillStatus;
  balanceMinor: number;
  amountMinor: number;
  whtMinor: number;
  paidDate: string;
  today: string;
}): BillPaymentErrors | null {
  const errors: BillPaymentErrors = {};
  if (input.billStatus !== "approved") {
    errors.form = "Only an approved bill can be paid.";
    return errors;
  }
  if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0)
    errors.amount = "Enter the amount paid.";
  if (!Number.isSafeInteger(input.whtMinor) || input.whtMinor < 0)
    errors.wht = "The withheld amount can't be negative.";
  if (!isRealDate(input.paidDate)) errors.date = "Pick the date it was paid.";
  else if (input.paidDate > input.today) errors.date = "A payment can't be dated in the future.";
  if (!errors.amount && !errors.wht && input.amountMinor + input.whtMinor > input.balanceMinor) {
    errors.form = `That is more than the ${(input.balanceMinor / 100).toFixed(2)} still owed.`;
  }
  return Object.keys(errors).length > 0 ? errors : null;
}

/** A bill can be voided only while nothing has been paid against it. */
export function checkVoidBill(input: {
  status: BillStatus;
  paidMinor: number;
  reason: string;
}): string | null {
  if (input.status !== "approved")
    return input.status === "void"
      ? "This bill is already void."
      : "A draft is deleted, not voided.";
  if (input.paidMinor > 0) return "Payments are recorded against this bill. Void them first.";
  if (!input.reason.trim()) return "Say why it is being voided.";
  return null;
}
