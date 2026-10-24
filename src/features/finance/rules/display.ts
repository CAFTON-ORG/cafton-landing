/**
 * How the finance screens say things, in one place so an invoice, a bill and a tax return all read
 * the same way: when something is due, and what colour an amount is. Pure.
 */

import { daysUntil } from "./tax";

export type Tone = "neutral" | "warning" | "danger" | "success";

export interface DueHint {
  text: string;
  tone: Tone;
}

/**
 * "Due in 5 days", "Due today", "5 days overdue": the line a person scans for on an invoice or
 * bill. Nothing is said once there is nothing left to pay.
 */
export function dueHint(dueDate: string, today: string, owing: boolean): DueHint | null {
  if (!owing) return null;
  const days = daysUntil(dueDate, today);
  if (days === 0) return { text: "Due today", tone: "warning" };
  if (days > 0)
    return {
      text: `Due in ${days} ${days === 1 ? "day" : "days"}`,
      tone: days <= 7 ? "warning" : "neutral",
    };
  return { text: `${-days} ${-days === 1 ? "day" : "days"} overdue`, tone: "danger" };
}

/** An amount's sign, for colouring: money out and amounts below zero read as negative. */
export const signOf = (minor: number): "positive" | "negative" | "zero" =>
  minor > 0 ? "positive" : minor < 0 ? "negative" : "zero";

/**
 * Accounting style for an amount: a negative is shown in parentheses (₱1,000.00) instead of with a
 * minus sign, as accountants and every accounting package write it. Pass the formatted absolute
 * value, so this stays independent of how money is formatted.
 */
export const accountingText = (formattedAbsolute: string, minor: number) =>
  minor < 0 ? `(${formattedAbsolute})` : formattedAbsolute;

export interface StateTotal {
  count: number;
  amountMinor: number;
}

/** Add one more to a running total. */
export const addTo = (total: StateTotal, amountMinor: number): StateTotal => ({
  count: total.count + 1,
  amountMinor: total.amountMinor + amountMinor,
});

export const EMPTY_TOTAL: StateTotal = { count: 0, amountMinor: 0 };
