/**
 * The rules of the books, in one place so the screens, the server and the tests all agree. Pure: no
 * database. Money is whole centavos (integers, never floats); dates are "YYYY-MM-DD" in Manila time.
 * The business reports in pesos on a calendar fiscal year (January to December).
 */

import { addDays } from "@/features/schedule/slots";

/* ------------------------------------------------------------------ accounts */

export const ACCOUNT_TYPES = ["asset", "liability", "equity", "revenue", "expense"] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const ACCOUNT_TYPE_LABEL: Record<AccountType, string> = {
  asset: "Assets",
  liability: "Liabilities",
  equity: "Equity",
  revenue: "Revenue",
  expense: "Expenses",
};

/** The side an account grows on: a debit raises an asset or an expense, a credit raises the rest. */
export const NORMAL_SIDE: Record<AccountType, "debit" | "credit"> = {
  asset: "debit",
  expense: "debit",
  liability: "credit",
  equity: "credit",
  revenue: "credit",
};

/** An account's balance as a positive number when it sits on its normal side. */
export function balanceOf(type: AccountType, debitMinor: number, creditMinor: number): number {
  return NORMAL_SIDE[type] === "debit" ? debitMinor - creditMinor : creditMinor - debitMinor;
}

export const MAX_ACCOUNT_NAME = 120;

export function checkAccount(input: { code: string; name: string }): {
  code?: string;
  name?: string;
} {
  const errors: { code?: string; name?: string } = {};
  if (!/^[0-9]{4,6}$/.test(input.code.trim())) errors.code = "Use 4 to 6 digits, like 6100.";
  if (!input.name.trim()) errors.name = "Give the account a name.";
  else if (input.name.trim().length > MAX_ACCOUNT_NAME) {
    errors.name = `Keep it under ${MAX_ACCOUNT_NAME} characters.`;
  }
  return errors;
}

/** Why an account can't be changed that way, or null. Accounts the system posts to keep their role. */
export function checkAccountChange(input: {
  systemKey: string | null;
  hasPostings: boolean;
  typeChanged: boolean;
  archiving: boolean;
}): string | null {
  if (input.typeChanged && input.hasPostings) return "An account that has postings keeps its type.";
  if (input.typeChanged && input.systemKey)
    return "The system posts to this account, so its type is fixed.";
  if (input.archiving && input.systemKey) {
    return "The system posts to this account, so it can't be archived.";
  }
  return null;
}

/** The accounts' codes group them: 1xxx assets, 2xxx liabilities, and so on. A code that doesn't fit its type is a typo. */
export function codeFitsType(code: string, type: AccountType): boolean {
  const first = code.trim()[0];
  const expected: Record<AccountType, string[]> = {
    asset: ["1"],
    liability: ["2"],
    equity: ["3"],
    revenue: ["4"],
    expense: ["5", "6", "7", "8", "9"],
  };
  return expected[type].includes(first);
}

/* ------------------------------------------------------------------- entries */

export interface EntryLine {
  accountId: string;
  debitMinor: number;
  creditMinor: number;
  memo?: string;
}

export interface EntryTotals {
  debitMinor: number;
  creditMinor: number;
  /** Debits less credits: zero when the entry balances. */
  differenceMinor: number;
}

export function entryTotals(lines: readonly EntryLine[]): EntryTotals {
  const debitMinor = lines.reduce((sum, line) => sum + line.debitMinor, 0);
  const creditMinor = lines.reduce((sum, line) => sum + line.creditMinor, 0);
  return { debitMinor, creditMinor, differenceMinor: debitMinor - creditMinor };
}

export const MAX_ENTRY_LINES = 100;
export const MAX_MEMO = 500;
/** A single line can't be bigger than this: a typo guard, and well inside what a BIGINT holds. */
export const MAX_LINE_MINOR = 1_000_000_000_000_00; // one trillion pesos

export interface EntryErrors {
  form?: string;
  memo?: string;
  date?: string;
  /** By line index. */
  lines?: Record<number, string>;
}

/** Why an entry can't be posted as written, or null. */
export function checkEntry(input: {
  date: string;
  memo: string;
  lines: readonly EntryLine[];
  today: string;
  /** Accounts that exist and can be posted to; a line to any other is refused. */
  usableAccountIds: ReadonlySet<string>;
}): EntryErrors | null {
  const errors: EntryErrors = {};
  if (!input.memo.trim()) errors.memo = "Say what this entry is for.";
  else if (input.memo.trim().length > MAX_MEMO)
    errors.memo = `Keep it under ${MAX_MEMO} characters.`;

  const dateError = checkPostingDate(input.date, input.today);
  if (dateError) errors.date = dateError;

  if (input.lines.length < 2) errors.form = "An entry needs at least two lines.";
  else if (input.lines.length > MAX_ENTRY_LINES) {
    errors.form = `An entry can have at most ${MAX_ENTRY_LINES} lines.`;
  }

  const lineErrors: Record<number, string> = {};
  input.lines.forEach((line, index) => {
    const { debitMinor: debit, creditMinor: credit } = line;
    if (!input.usableAccountIds.has(line.accountId))
      lineErrors[index] = "Choose an account that is in use.";
    else if (![debit, credit].every((n) => Number.isSafeInteger(n) && n >= 0)) {
      lineErrors[index] = "Amounts are whole centavos, not negative.";
    } else if (debit > 0 === credit > 0) {
      lineErrors[index] =
        debit > 0 ? "A line is a debit or a credit, not both." : "Enter a debit or a credit.";
    } else if (Math.max(debit, credit) > MAX_LINE_MINOR) {
      lineErrors[index] = "That amount is too large.";
    }
  });
  if (Object.keys(lineErrors).length > 0) errors.lines = lineErrors;

  if (!errors.form && !errors.lines) {
    const { differenceMinor } = entryTotals(input.lines);
    if (differenceMinor !== 0) {
      errors.form = `The entry doesn't balance: debits and credits differ by ₱${(Math.abs(differenceMinor) / 100).toFixed(2)}.`;
    }
  }
  return Object.keys(errors).length > 0 ? errors : null;
}

/** "2026-02-30" is not a day: the text has to name one that exists. */
export function isRealDate(date: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

/** Entries are dated today or earlier; a month ahead at most, for things booked in advance. */
export const MAX_DAYS_AHEAD = 31;

export function checkPostingDate(date: string, today: string): string | null {
  if (!isRealDate(date)) return "Pick a date.";
  if (date < "2000-01-01") return "That date is too far back.";
  if (date > addDays(today, MAX_DAYS_AHEAD)) {
    return `You can't post more than ${MAX_DAYS_AHEAD} days ahead.`;
  }
  return null;
}

/** The lines that undo an entry: every debit becomes a credit and every credit a debit. */
export function reversalLines(lines: readonly EntryLine[]): EntryLine[] {
  return lines.map((line) => ({
    accountId: line.accountId,
    debitMinor: line.creditMinor,
    creditMinor: line.debitMinor,
    memo: line.memo,
  }));
}

/** Why an entry can't be reversed, or null. An entry is undone once, and an undo is not undone. */
export function checkReverse(input: {
  alreadyReversed: boolean;
  isReversal: boolean;
  reason: string;
}): string | null {
  if (input.isReversal) return "This entry already undoes another. Post a new entry instead.";
  if (input.alreadyReversed) return "This entry was already reversed.";
  if (!input.reason.trim()) return "Say why it is being reversed.";
  return null;
}

/* ------------------------------------------------------------------- periods */

export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

/** The first and last day of a calendar month. */
export function monthRange(year: number, month: number): { startsOn: string; endsOn: string } {
  const pad = (n: number) => String(n).padStart(2, "0");
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { startsOn: `${year}-${pad(month)}-01`, endsOn: `${year}-${pad(month)}-${pad(last)}` };
}

/** The fiscal period a date falls in. The fiscal year is the calendar year. */
export function periodOf(date: string): { year: number; month: number } {
  return { year: Number(date.slice(0, 4)), month: Number(date.slice(5, 7)) };
}

export type PeriodStatus = "open" | "closed";

/**
 * Months close in order, so a closed month never has an open one before it: closing needs every
 * earlier month of the year closed first.
 */
export function checkClose(statuses: readonly PeriodStatus[], month: number): string | null {
  if (statuses[month - 1] === "closed") return "That month is already closed.";
  const earlierOpen = statuses.slice(0, month - 1).findIndex((status) => status !== "closed");
  if (earlierOpen !== -1) return `Close ${MONTH_NAMES[earlierOpen]} first. Months close in order.`;
  return null;
}

/** Only the latest closed month can be reopened, so nothing open sits before a closed month. */
export function checkReopen(statuses: readonly PeriodStatus[], month: number): string | null {
  if (statuses[month - 1] !== "closed") return "That month isn't closed.";
  const laterClosed = statuses.slice(month).findIndex((status) => status === "closed");
  if (laterClosed !== -1) {
    return `Reopen ${MONTH_NAMES[month + laterClosed]} first. Only the latest closed month can be reopened.`;
  }
  return null;
}

/* -------------------------------------------------------------------- tax rates */

/** Whole percent text of a rate in basis points: 1200 -> "12%", 250 -> "2.5%". */
export const rateText = (rateBp: number) => `${Number((rateBp / 100).toFixed(2))}%`;

export function checkTaxRate(input: { code: string; name: string; rateBp: number }): {
  code?: string;
  name?: string;
  rate?: string;
} {
  const errors: { code?: string; name?: string; rate?: string } = {};
  if (!/^[A-Z0-9_-]{2,20}$/.test(input.code.trim())) {
    errors.code = "Use 2 to 20 capital letters, digits, dashes or underscores, like VAT12.";
  }
  if (!input.name.trim()) errors.name = "Give the rate a name.";
  if (!Number.isInteger(input.rateBp) || input.rateBp < 0 || input.rateBp > 10000) {
    errors.rate = "Enter a rate from 0% to 100%, with at most two decimals.";
  }
  return errors;
}

/** "12" or "2.5" to basis points; null when it isn't a rate. */
export function parseRate(text: string): number | null {
  const match = /^(\d{1,3})(?:\.(\d{1,2}))?$/.exec(text.trim().replace(/%$/, ""));
  if (!match) return null;
  const bp = Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0") || 0);
  return bp <= 10000 ? bp : null;
}

/* -------------------------------------------------------------------- rounding */

/**
 * numerator / denominator rounded to the nearest whole number, halves away from zero. The one place
 * Finance rounds, so a total is never off by a centavo depending on who added it up.
 */
export function roundDiv(numerator: bigint, denominator: bigint): bigint {
  if (denominator === BigInt(0)) throw new Error("Division by zero.");
  const negative = numerator < BigInt(0) !== denominator < BigInt(0);
  const n = numerator < BigInt(0) ? -numerator : numerator;
  const d = denominator < BigInt(0) ? -denominator : denominator;
  const rounded = (BigInt(2) * n + d) / (BigInt(2) * d);
  return negative ? -rounded : rounded;
}

/** The tax on a net amount: `rateBp` basis points of it, rounded to the centavo. */
export function taxOf(netMinor: number, rateBp: number): number {
  return Number(roundDiv(BigInt(netMinor) * BigInt(rateBp), BigInt(10000)));
}

/** Takes a tax-inclusive price apart: the net amount, and the tax inside it (they add up to the gross). */
export function splitGross(
  grossMinor: number,
  rateBp: number,
): { netMinor: number; taxMinor: number } {
  const netMinor = Number(roundDiv(BigInt(grossMinor) * BigInt(10000), BigInt(10000 + rateBp)));
  return { netMinor, taxMinor: grossMinor - netMinor };
}

/**
 * Divides an amount across weights so the parts add up to it exactly (largest remainder: the
 * centavos left over go to the parts that lost the most in rounding down, earliest first). Weights
 * are whole numbers (usually amounts in centavos); done in BigInt so nothing is lost to floats.
 */
export function splitProportionally(totalMinor: number, weights: readonly number[]): number[] {
  if (weights.length === 0) return [];
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum <= 0) {
    // Nothing to weigh by: split evenly.
    const base = Math.floor(totalMinor / weights.length);
    const parts = weights.map(() => base);
    for (let index = 0; index < totalMinor - base * weights.length; index++) parts[index] += 1;
    return parts;
  }
  const total = BigInt(totalMinor);
  const whole = BigInt(sum);
  const shares = weights.map((weight) => total * BigInt(weight));
  const parts = shares.map((share) => share / whole);
  const remainders = shares.map((share, index) => ({ index, remainder: share % whole }));
  let left = Number(total - parts.reduce((a, b) => a + b, BigInt(0)));
  remainders.sort((a, b) =>
    a.remainder === b.remainder ? a.index - b.index : a.remainder > b.remainder ? -1 : 1,
  );
  const result = parts.map(Number);
  for (const { index } of remainders) {
    if (left <= 0) break;
    result[index] += 1;
    left -= 1;
  }
  return result;
}
