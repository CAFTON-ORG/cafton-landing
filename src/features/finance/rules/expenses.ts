/**
 * The rules of expenses and their receipts, in one place so the screens, the server and the tests
 * agree. Pure: no database, no storage. Money is whole centavos; dates are "YYYY-MM-DD" (Manila time).
 */

import { addDays } from "@/features/schedule/rules/slots";
import { isRealDate } from "./core";

export const EXPENSE_STATUSES = ["submitted", "approved", "rejected", "void"] as const;
export type ExpenseStatus = (typeof EXPENSE_STATUSES)[number];

export const EXPENSE_STATUS_LABEL: Record<ExpenseStatus, string> = {
  submitted: "Waiting for approval",
  approved: "Approved",
  rejected: "Rejected",
  void: "Void",
};

/** The private storage bucket receipts live in. */
export const RECEIPTS_BUCKET = "finance-receipts";

export const MAX_DESCRIPTION = 500;
export const MAX_NOTES = 2000;

/** An expense above this needs a receipt before it can be approved. */
export const RECEIPT_REQUIRED_OVER_MINOR = 100_000;

/** A receipt can be added to an expense this many times: enough for a photo of each side and a PDF. */
export const MAX_RECEIPTS = 5;
export const MAX_RECEIPT_BYTES = 4 * 1024 * 1024;

export interface ExpenseErrors {
  payee?: string;
  description?: string;
  account?: string;
  paidFrom?: string;
  amount?: string;
  date?: string;
}

/** Why an expense can't be submitted as written, or null. */
export function checkExpense(input: {
  payee: string;
  description: string;
  accountId: string;
  paidFromAccountId: string;
  amountMinor: number;
  date: string;
  today: string;
}): ExpenseErrors | null {
  const errors: ExpenseErrors = {};
  if (!input.payee.trim()) errors.payee = "Say who was paid.";
  else if (input.payee.trim().length > 200) errors.payee = "Keep the name under 200 characters.";
  if (!input.description.trim()) errors.description = "Say what it was for.";
  else if (input.description.trim().length > MAX_DESCRIPTION)
    errors.description = `Keep it under ${MAX_DESCRIPTION} characters.`;
  if (!input.accountId) errors.account = "Choose the account it is booked to.";
  if (!input.paidFromAccountId) errors.paidFrom = "Say where the money came from.";
  if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0)
    errors.amount = "Enter an amount above zero.";
  if (!isRealDate(input.date)) errors.date = "Pick the date it was paid.";
  else if (input.date > addDays(input.today, 1))
    errors.date = "An expense can't be dated in the future.";
  return Object.keys(errors).length > 0 ? errors : null;
}

/** Whether the person may change an expense: its submitter, while it is still waiting or was sent back. */
export function checkEditExpense(input: {
  status: ExpenseStatus;
  submittedBy: string | null;
  actorId: string;
}): string | null {
  if (input.status === "approved" || input.status === "void")
    return "An approved expense can't be edited. Void it and enter it again.";
  if (input.submittedBy !== input.actorId)
    return "Only the person who submitted an expense can change it.";
  return null;
}

/** Withdrawing deletes it: the submitter's, or an approver's, before it is decided. */
export function checkWithdrawExpense(input: {
  status: ExpenseStatus;
  submittedBy: string | null;
  actorId: string;
  canApprove: boolean;
}): string | null {
  if (input.status === "approved" || input.status === "void")
    return "An approved expense can't be deleted. Void it instead.";
  if (input.submittedBy !== input.actorId && !input.canApprove)
    return "Only the person who submitted an expense can withdraw it.";
  return null;
}

/** Why an expense can't be approved yet, or null. Approving numbers it, posts it and fixes it. */
export function checkApproveExpense(input: {
  status: ExpenseStatus;
  amountMinor: number;
  receiptCount: number;
}): string | null {
  if (input.status !== "submitted") return "Only an expense waiting for approval can be approved.";
  if (input.amountMinor > RECEIPT_REQUIRED_OVER_MINOR && input.receiptCount === 0)
    return `Expenses over ${(RECEIPT_REQUIRED_OVER_MINOR / 100).toLocaleString("en-PH")} pesos need a receipt first.`;
  return null;
}

export function checkRejectExpense(input: {
  status: ExpenseStatus;
  reason: string;
}): string | null {
  if (input.status !== "submitted") return "Only an expense waiting for approval can be rejected.";
  if (!input.reason.trim()) return "Say why it is being sent back.";
  return null;
}

export function checkVoidExpense(input: { status: ExpenseStatus; reason: string }): string | null {
  if (input.status === "void") return "This expense is already void.";
  if (input.status !== "approved") return "Only an approved expense can be voided.";
  if (!input.reason.trim()) return "Say why it is being voided.";
  return null;
}

/** Why a receipt can't be added, or null. The bytes are checked separately, by the file rules. */
export function checkReceiptUpload(
  file: { size: number },
  existingCount: number,
  status: ExpenseStatus,
): string | null {
  if (status === "approved" || status === "void")
    return "Receipts can't be changed once an expense is approved.";
  if (file.size === 0) return "That file is empty.";
  if (file.size > MAX_RECEIPT_BYTES)
    return "That file is larger than 4 MB. Make it smaller and try again.";
  if (existingCount >= MAX_RECEIPTS)
    return `An expense can hold ${MAX_RECEIPTS} receipts. Remove one first.`;
  return null;
}

/** What kinds of file a receipt may be: a photo or a PDF, never an office document. */
export const RECEIPT_MIME_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;
export const RECEIPT_ACCEPT = ".pdf,.png,.jpg,.jpeg,.webp";

const RECEIPT_PATH =
  /^finance\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(pdf|png|jpg|webp)$/;

/** Stored paths are always `finance/<uuid>.<ext>`: nothing the uploader typed becomes part of a path. */
export const isReceiptPath = (value: string) => RECEIPT_PATH.test(value);
export const newReceiptPath = (ext: string) => `finance/${crypto.randomUUID()}.${ext}`;
