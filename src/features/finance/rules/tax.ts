/**
 * Income tax under the 8% option, for the tax tracker: when each return is due, what it comes to
 * (an estimate, for the accountant to confirm), what it is in progress, and when a filing can be
 * recorded. Pure: no database. Money is whole centavos; dates are "YYYY-MM-DD".
 *
 * The 8% option: instead of income tax on profit and a percentage tax, the business pays 8% of its
 * gross receipts above 250,000 pesos a year. It files a quarterly return (1701Q) for each of the
 * first three quarters, each working on the year so far, and an annual return (1701A) that settles
 * the year. What clients withheld from payments (creditable withholding tax) is credited against it.
 */

import { addDays } from "@/features/schedule/rules/slots";
import { isRealDate, taxOf } from "./core";

/** The option's rate (8%) and the yearly amount of gross receipts it leaves untaxed. */
export const EIGHT_PERCENT_RATE_BP = 800;
export const ANNUAL_ALLOWANCE_MINOR = 25_000_000;

export const FILING_KINDS = ["q1", "q2", "q3", "annual"] as const;
export type FilingKind = (typeof FILING_KINDS)[number];

export interface Obligation {
  year: number;
  kind: FilingKind;
  form: "1701Q" | "1701A";
  label: string;
  /** Always the start of the year: each return works on the year so far. */
  periodStart: string;
  periodEnd: string;
  dueDate: string;
}

/** The four returns of a tax year and when each is due (15 May, 15 August, 15 November; 15 April after the year). */
export function obligationsFor(year: number): Obligation[] {
  const base = { year, periodStart: `${year}-01-01` };
  return [
    {
      ...base,
      kind: "q1",
      form: "1701Q",
      label: "First quarter",
      periodEnd: `${year}-03-31`,
      dueDate: `${year}-05-15`,
    },
    {
      ...base,
      kind: "q2",
      form: "1701Q",
      label: "Second quarter",
      periodEnd: `${year}-06-30`,
      dueDate: `${year}-08-15`,
    },
    {
      ...base,
      kind: "q3",
      form: "1701Q",
      label: "Third quarter",
      periodEnd: `${year}-09-30`,
      dueDate: `${year}-11-15`,
    },
    {
      ...base,
      kind: "annual",
      form: "1701A",
      label: "Annual return",
      periodEnd: `${year}-12-31`,
      dueDate: `${year + 1}-04-15`,
    },
  ];
}

export interface Estimate {
  /** Gross receipts above the allowance. */
  taxableMinor: number;
  /** 8% of that: the tax for the year so far. */
  taxToDateMinor: number;
  /** What earlier returns this year already settled. */
  settledBeforeMinor: number;
  /** Still to settle after earlier returns. */
  remainingMinor: number;
  /** How much of that clients' withheld tax covers. */
  cwtToApplyMinor: number;
  /** What is left to pay in cash. */
  cashDueMinor: number;
  /** Paid in earlier returns beyond what this year's receipts come to: carried forward, not refunded here. */
  overpaidMinor: number;
}

/**
 * What a return comes to: 8% of the year's gross receipts so far above the allowance, less what
 * earlier returns settled, less the withheld tax available to claim.
 */
export function estimateTax(input: {
  grossToDateMinor: number;
  settledBeforeMinor: number;
  cwtAvailableMinor: number;
}): Estimate {
  const taxableMinor = Math.max(0, input.grossToDateMinor - ANNUAL_ALLOWANCE_MINOR);
  const taxToDateMinor = taxOf(taxableMinor, EIGHT_PERCENT_RATE_BP);
  const remainingMinor = Math.max(0, taxToDateMinor - input.settledBeforeMinor);
  const cwtToApplyMinor = Math.min(Math.max(0, input.cwtAvailableMinor), remainingMinor);
  return {
    taxableMinor,
    taxToDateMinor,
    settledBeforeMinor: input.settledBeforeMinor,
    remainingMinor,
    cwtToApplyMinor,
    cashDueMinor: remainingMinor - cwtToApplyMinor,
    overpaidMinor: Math.max(0, input.settledBeforeMinor - taxToDateMinor),
  };
}

/* -------------------------------------------------------------------- status */

export type FilingStatus = "in_progress" | "due" | "due_soon" | "overdue" | "filed";

export const FILING_STATUS_LABEL: Record<FilingStatus, string> = {
  in_progress: "In progress",
  due: "Ready to file",
  due_soon: "Due soon",
  overdue: "Overdue",
  filed: "Filed",
};

export const DUE_SOON_DAYS = 14;

export function daysUntil(date: string, today: string): number {
  return Math.round(
    (Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000,
  );
}

/** Where a return stands: still being earned, ready to file, due within two weeks, late, or filed. */
export function filingStatus(obligation: Obligation, filed: boolean, today: string): FilingStatus {
  if (filed) return "filed";
  if (today <= obligation.periodEnd) return "in_progress";
  if (today > obligation.dueDate) return "overdue";
  return daysUntil(obligation.dueDate, today) <= DUE_SOON_DAYS ? "due_soon" : "due";
}

/** The date to measure a return's gross receipts up to: the end of its period, or today while it is still running. */
export const measuredUpTo = (obligation: Obligation, today: string) =>
  today < obligation.periodEnd ? today : obligation.periodEnd;

/* -------------------------------------------------------------- recording one */

export interface FilingErrors {
  filedOn?: string;
  cash?: string;
  cwt?: string;
  paidFrom?: string;
  reference?: string;
  form?: string;
}

/** Why a filing can't be recorded as written, or null. */
export function checkFiling(input: {
  obligation: Obligation;
  /** The earlier returns of the year, each whether it has been recorded. */
  earlierFiled: readonly boolean[];
  alreadyFiled: boolean;
  filedOn: string;
  today: string;
  cashMinor: number;
  cwtMinor: number;
  cwtAvailableMinor: number;
  paidFromAccountId: string;
  reference: string;
}): FilingErrors | null {
  const errors: FilingErrors = {};
  if (input.alreadyFiled) {
    errors.form = `${input.obligation.label} is already recorded. Void it first to record it again.`;
    return errors;
  }
  if (input.today <= input.obligation.periodEnd)
    errors.form = `${input.obligation.label} can't be filed until its period ends on ${input.obligation.periodEnd}.`;
  else if (input.earlierFiled.some((filed) => !filed))
    errors.form =
      "Record the earlier returns first: each one works on what the earlier ones settled.";
  if (!isRealDate(input.filedOn)) errors.filedOn = "Pick the date it was filed.";
  else if (input.filedOn > addDays(input.today, 0))
    errors.filedOn = "It can't have been filed in the future.";
  else if (input.filedOn <= input.obligation.periodEnd)
    errors.filedOn = "It can't have been filed before its period ended.";
  if (!Number.isSafeInteger(input.cashMinor) || input.cashMinor < 0)
    errors.cash = "The amount paid can't be negative.";
  if (!Number.isSafeInteger(input.cwtMinor) || input.cwtMinor < 0)
    errors.cwt = "The withheld tax used can't be negative.";
  else if (input.cwtMinor > input.cwtAvailableMinor)
    errors.cwt = `Only ${(input.cwtAvailableMinor / 100).toFixed(2)} of withheld tax is available to claim.`;
  if (!errors.cash && input.cashMinor > 0 && !input.paidFromAccountId)
    errors.paidFrom = "Say which account the payment came from.";
  if (input.reference.trim().length > 60)
    errors.reference = "Keep the reference under 60 characters.";
  return Object.keys(errors).length > 0 ? errors : null;
}

export function checkVoidFiling(input: { status: string; reason: string }): string | null {
  if (input.status === "void") return "This filing is already void.";
  if (!input.reason.trim()) return "Say why it is being voided.";
  return null;
}
