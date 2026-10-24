/**
 * The rules of recurring bills and expenses: when each one falls due. Pure: no database. Dates are
 * "YYYY-MM-DD" (Manila time) and are compared as text, which sorts the same as the calendar.
 */

import { addDays } from "@/features/schedule/rules/slots";
import { isRealDate } from "./core";

export const FREQUENCIES = ["weekly", "monthly", "quarterly", "yearly"] as const;
export type Frequency = (typeof FREQUENCIES)[number];

export const FREQUENCY_LABEL: Record<Frequency, string> = {
  weekly: "Every week",
  monthly: "Every month",
  quarterly: "Every 3 months",
  yearly: "Every year",
};

export const RECURRING_KINDS = ["bill", "expense"] as const;
export type RecurringKind = (typeof RECURRING_KINDS)[number];

export const RECURRING_KIND_LABEL: Record<RecurringKind, string> = {
  bill: "Bill",
  expense: "Expense",
};

/** One run makes at most this many, so a long-forgotten item can't flood the drafts. */
export const MAX_CATCH_UP = 12;

const MONTHS_PER: Record<Exclude<Frequency, "weekly">, number> = {
  monthly: 1,
  quarterly: 3,
  yearly: 12,
};

const daysInMonth = (year: number, month: number) =>
  new Date(Date.UTC(year, month, 0)).getUTCDate();

/** The day of the month an item keeps to, taken from its first date. */
export const anchorDayOf = (date: string) => Number(date.slice(8, 10));

/**
 * The date after `date`. A weekly item moves 7 days. The others move whole months and keep to
 * `anchorDay`, clamped to the month's length: 31 January, 28 February, 31 March, never drifting to
 * the 28th for good.
 */
export function occurrenceAfter(date: string, frequency: Frequency, anchorDay: number): string {
  if (frequency === "weekly") return addDays(date, 7);
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7));
  const total = year * 12 + (month - 1) + MONTHS_PER[frequency];
  const nextYear = Math.floor(total / 12);
  const nextMonth = (total % 12) + 1;
  const day = Math.min(anchorDay, daysInMonth(nextYear, nextMonth));
  return `${String(nextYear).padStart(4, "0")}-${String(nextMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export interface Schedule {
  nextDate: string;
  endDate: string | null;
  frequency: Frequency;
  anchorDay: number;
  active: boolean;
}

/**
 * What a run should make: every date up to and including today that is due and not past the end,
 * oldest first (at most MAX_CATCH_UP), and where the schedule stands afterwards. `finished` is true
 * once nothing more will ever be due.
 */
export function dueOccurrences(
  schedule: Schedule,
  today: string,
  cap = MAX_CATCH_UP,
): { dates: string[]; nextDate: string; finished: boolean } {
  const dates: string[] = [];
  let next = schedule.nextDate;
  if (schedule.active) {
    while (next <= today && dates.length < cap && (!schedule.endDate || next <= schedule.endDate)) {
      dates.push(next);
      next = occurrenceAfter(next, schedule.frequency, schedule.anchorDay);
    }
  }
  const finished = Boolean(schedule.endDate && next > schedule.endDate);
  return { dates, nextDate: next, finished };
}

export interface RecurringErrors {
  name?: string;
  startDate?: string;
  endDate?: string;
  vendor?: string;
  payee?: string;
  description?: string;
  account?: string;
  paidFrom?: string;
  amount?: string;
}

/** Why a recurring item can't be saved as written, or null. */
export function checkRecurring(input: {
  kind: RecurringKind;
  name: string;
  startDate: string;
  endDate: string | null;
  vendorId: string | null;
  payee: string;
  description: string;
  accountId: string;
  paidFromAccountId: string;
  amountMinor: number;
}): RecurringErrors | null {
  const errors: RecurringErrors = {};
  if (!input.name.trim()) errors.name = "Give it a name, like Office rent.";
  else if (input.name.trim().length > 120) errors.name = "Keep the name under 120 characters.";
  if (!isRealDate(input.startDate)) errors.startDate = "Pick the first date.";
  if (input.endDate && !isRealDate(input.endDate)) errors.endDate = "Pick a real end date.";
  else if (input.endDate && isRealDate(input.startDate) && input.endDate < input.startDate)
    errors.endDate = "It can't end before it starts.";
  if (input.kind === "bill" && !input.vendorId) errors.vendor = "Choose the supplier.";
  if (input.kind === "expense") {
    if (!input.payee.trim()) errors.payee = "Say who is paid.";
    if (!input.paidFromAccountId) errors.paidFrom = "Say where the money comes from.";
  }
  if (!input.description.trim()) errors.description = "Say what it is for.";
  if (!input.accountId) errors.account = "Choose the account it is booked to.";
  if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0)
    errors.amount = "Enter an amount above zero.";
  return Object.keys(errors).length > 0 ? errors : null;
}
