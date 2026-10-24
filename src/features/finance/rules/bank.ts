/**
 * The rules of bank statements and reconciliation: reading a statement file, recognising a line
 * already imported, suggesting which posting a line belongs to, and when a period can be signed
 * off. Pure: no database. Money is whole centavos (positive in, negative out); dates are
 * "YYYY-MM-DD" (Manila time).
 */

import { addDays } from "@/features/schedule/rules/slots";
import { isRealDate } from "./core";

export const IMPORT_LIMIT = 2000;
export const MAX_DESCRIPTION = 500;

export type DateFormat = "ymd" | "mdy" | "dmy";

export const DATE_FORMAT_LABEL: Record<DateFormat, string> = {
  ymd: "Year first (2026-10-23)",
  mdy: "Month first (10/23/2026)",
  dmy: "Day first (23/10/2026)",
};

/* ------------------------------------------------------------------- reading */

/** "1,234.50", "(1,234.50)", "-1234.5", "₱ 1,234.50 CR": whole centavos, or null when it is not an amount. */
export function parseAmount(input: string): number | null {
  let text = input.trim();
  if (!text) return null;
  let negative = false;
  if (/^\(.*\)$/.test(text)) {
    negative = true;
    text = text.slice(1, -1);
  }
  if (/\bDR\b\.?$/i.test(text)) negative = true;
  text = text.replace(/\b(CR|DR)\b\.?$/i, "").trim();
  text = text.replace(/^[₱$€£]|^PHP\s*/i, "").replace(/[\s,]/g, "");
  if (text.startsWith("-")) {
    negative = !negative;
    text = text.slice(1);
  } else if (text.startsWith("+")) text = text.slice(1);
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return null;
  const [whole, fraction = ""] = text.split(".");
  const minor = Number(whole + fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(minor)) return null;
  return negative ? -minor : minor;
}

const MONTHS: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

const year4 = (value: string) => (value.length === 2 ? 2000 + Number(value) : Number(value));
const iso = (y: number, m: number, d: number) =>
  `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

/** A statement date as "YYYY-MM-DD", or null when it is not a real date in that format. */
export function parseBankDate(input: string, format: DateFormat): string | null {
  const text = input.trim().replace(/\s+\d{1,2}:\d{2}(:\d{2})?(\s*[AP]M)?$/i, "");
  if (!text) return null;
  let y: number, m: number, d: number;
  const named =
    text.match(/^(\d{1,2})[\s-]([A-Za-z]{3,9})[\s,-]+(\d{2,4})$/) ??
    text.match(/^([A-Za-z]{3,9})\s+(\d{1,2}),?\s+(\d{2,4})$/);
  if (named) {
    const dayFirst = /^\d/.test(named[1]);
    const month = MONTHS[(dayFirst ? named[2] : named[1]).slice(0, 3).toLowerCase()];
    if (!month) return null;
    d = Number(dayFirst ? named[1] : named[2]);
    m = month;
    y = year4(named[3]);
  } else if (format === "ymd") {
    const found = text.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
    if (!found) return null;
    [y, m, d] = [Number(found[1]), Number(found[2]), Number(found[3])];
  } else {
    const found = text.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
    if (!found) return null;
    y = year4(found[3]);
    [m, d] =
      format === "mdy"
        ? [Number(found[1]), Number(found[2])]
        : [Number(found[2]), Number(found[1])];
  }
  const out = iso(y, m, d);
  return isRealDate(out) ? out : null;
}

export interface StatementRow {
  /** The row's number in the file, counting the header as 1. */
  line: number;
  date: string;
  description: string;
  reference?: string;
  amountMinor: number;
  balanceMinor?: number;
}

export interface RowProblem {
  line: number;
  message: string;
}

const norm = (header: string) => header.toLowerCase().replace(/[^a-z0-9]/g, "");
const ALIASES = {
  date: [
    "date",
    "transactiondate",
    "postingdate",
    "valuedate",
    "txndate",
    "bookingdate",
    "posteddate",
  ],
  description: [
    "description",
    "details",
    "particulars",
    "narrative",
    "transactiondetails",
    "memo",
    "remarks",
    "transactiondescription",
  ],
  reference: [
    "reference",
    "referenceno",
    "referencenumber",
    "refno",
    "ref",
    "checkno",
    "chequeno",
    "checknumber",
  ],
  amount: ["amount", "transactionamount"],
  debit: ["debit", "debits", "withdrawal", "withdrawals", "moneyout", "paidout"],
  credit: ["credit", "credits", "deposit", "deposits", "moneyin", "paidin"],
  balance: ["balance", "runningbalance", "endingbalance", "availablebalance"],
} as const;

const find = (headers: string[], names: readonly string[]) =>
  headers.findIndex((h) => names.includes(h));

/**
 * Reads a statement's rows (a header line, then one line per transaction). It understands one
 * signed amount column or separate debit and credit columns. Rows it can't read are reported with
 * their line number rather than guessed at; the rest are still returned.
 */
export function mapStatement(
  table: readonly (readonly string[])[],
  format: DateFormat,
): { rows: StatementRow[]; problems: RowProblem[]; understood: string[]; fatal?: string } {
  const empty = { rows: [], problems: [], understood: [] as string[] };
  if (table.length < 2)
    return { ...empty, fatal: "The file has no rows. The first line must be the column titles." };
  if (table.length - 1 > IMPORT_LIMIT)
    return {
      ...empty,
      fatal: `That file has ${table.length - 1} rows. Import ${IMPORT_LIMIT} or fewer at a time.`,
    };

  const headers = table[0].map(norm);
  const at = {
    date: find(headers, ALIASES.date),
    description: find(headers, ALIASES.description),
    reference: find(headers, ALIASES.reference),
    amount: find(headers, ALIASES.amount),
    debit: find(headers, ALIASES.debit),
    credit: find(headers, ALIASES.credit),
    balance: find(headers, ALIASES.balance),
  };
  if (at.date < 0)
    return {
      ...empty,
      fatal: "There is no date column. Name it Date, Posting Date or Transaction Date.",
    };
  if (at.description < 0)
    return {
      ...empty,
      fatal: "There is no description column. Name it Description, Details or Particulars.",
    };
  if (at.amount < 0 && at.debit < 0 && at.credit < 0)
    return {
      ...empty,
      fatal: "There is no amount column. Use Amount, or separate Debit and Credit columns.",
    };

  const understood = [
    `Date: ${table[0][at.date]}`,
    `Description: ${table[0][at.description]}`,
    ...(at.amount >= 0
      ? [`Amount: ${table[0][at.amount]}`]
      : [
          at.debit >= 0 ? `Money out: ${table[0][at.debit]}` : "",
          at.credit >= 0 ? `Money in: ${table[0][at.credit]}` : "",
        ].filter(Boolean)),
    ...(at.balance >= 0 ? [`Balance: ${table[0][at.balance]}`] : []),
    ...(at.reference >= 0 ? [`Reference: ${table[0][at.reference]}`] : []),
  ];

  const rows: StatementRow[] = [];
  const problems: RowProblem[] = [];
  for (let index = 1; index < table.length; index++) {
    const cells = table[index];
    const line = index + 1;
    const date = parseBankDate(cells[at.date] ?? "", format);
    if (!date) {
      problems.push({
        line,
        message: `"${(cells[at.date] ?? "").trim()}" isn't a date in the chosen format.`,
      });
      continue;
    }
    const description = (cells[at.description] ?? "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, MAX_DESCRIPTION);
    let amountMinor: number | null;
    if (at.amount >= 0) amountMinor = parseAmount(cells[at.amount] ?? "");
    else {
      const out =
        at.debit >= 0 && (cells[at.debit] ?? "").trim() ? parseAmount(cells[at.debit]) : 0;
      const into =
        at.credit >= 0 && (cells[at.credit] ?? "").trim() ? parseAmount(cells[at.credit]) : 0;
      amountMinor = out === null || into === null ? null : Math.abs(into) - Math.abs(out);
    }
    if (amountMinor === null) {
      problems.push({ line, message: "The amount isn't a number." });
      continue;
    }
    if (amountMinor === 0) {
      problems.push({ line, message: "The amount is zero, so there is nothing to match." });
      continue;
    }
    const balanceText = at.balance >= 0 ? (cells[at.balance] ?? "").trim() : "";
    const balance = balanceText ? parseAmount(balanceText) : null;
    const reference = at.reference >= 0 ? (cells[at.reference] ?? "").trim() : "";
    rows.push({
      line,
      date,
      description: description || "(no description)",
      amountMinor,
      ...(balance !== null ? { balanceMinor: balance } : {}),
      ...(reference ? { reference: reference.slice(0, 80) } : {}),
    });
  }
  return { rows, problems, understood };
}

/**
 * Text that identifies a line, so the same line is recognised when statements overlap. Two
 * identical lines in one file are real (two ₱50 fees on a day), so each gets its own number.
 */
export function fingerprintKeys(rows: readonly StatementRow[]): string[] {
  const seen = new Map<string, number>();
  return rows.map((row) => {
    const base = [
      row.date,
      row.amountMinor,
      row.description.toLowerCase(),
      (row.reference ?? "").toLowerCase(),
    ].join("|");
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    return `${base}|${n}`;
  });
}

/* ------------------------------------------------------------------- matching */

export interface LedgerCandidate {
  lineId: string;
  entryNumber: string;
  entryDate: string;
  memo: string;
  /** Debit minus credit on the bank's ledger account: money in is positive. */
  signedMinor: number;
}

export interface StatementLineLite {
  id: string;
  date: string;
  amountMinor: number;
  description: string;
  reference?: string;
}

export const MATCH_WINDOW_DAYS = 7;

const days = (a: string, b: string) =>
  Math.abs(Math.round((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 86_400_000));

/** Ledger postings this line could be: the same amount in the same direction, within a week, best first. */
export function suggestMatches(
  line: StatementLineLite,
  candidates: readonly LedgerCandidate[],
  windowDays = MATCH_WINDOW_DAYS,
): LedgerCandidate[] {
  const ref = (line.reference ?? "").toLowerCase();
  const mentions = (candidate: LedgerCandidate) =>
    ref.length > 2 && candidate.memo.toLowerCase().includes(ref) ? 0 : 1;
  return candidates
    .filter((c) => c.signedMinor === line.amountMinor && days(c.entryDate, line.date) <= windowDays)
    .sort(
      (a, b) =>
        mentions(a) - mentions(b) ||
        days(a.entryDate, line.date) - days(b.entryDate, line.date) ||
        a.entryNumber.localeCompare(b.entryNumber),
    )
    .slice(0, 5);
}

/** Pairs that are certain: a line with one possible posting, which has no other possible line. */
export function autoMatch(
  lines: readonly StatementLineLite[],
  candidates: readonly LedgerCandidate[],
): { lineId: string; ledgerLineId: string }[] {
  const options = new Map(lines.map((line) => [line.id, suggestMatches(line, candidates)]));
  const claims = new Map<string, number>();
  for (const found of options.values())
    for (const candidate of found)
      claims.set(candidate.lineId, (claims.get(candidate.lineId) ?? 0) + 1);
  const pairs: { lineId: string; ledgerLineId: string }[] = [];
  for (const [lineId, found] of options) {
    if (found.length === 1 && claims.get(found[0].lineId) === 1)
      pairs.push({ lineId, ledgerLineId: found[0].lineId });
  }
  return pairs;
}

/* ------------------------------------------------------------- signing off */

/** What the statement's own figures say: opening plus its lines should be its closing. 0 means they agree. */
export const statementDifference = (input: {
  openingMinor: number;
  closingMinor: number;
  amounts: readonly number[];
}) =>
  input.openingMinor + input.amounts.reduce((sum, amount) => sum + amount, 0) - input.closingMinor;

/** Why a period can't be signed off, or null. */
export function checkSignOff(input: {
  periodStart: string;
  periodEnd: string;
  today: string;
  openingMinor: number | null;
  closingMinor: number | null;
  amounts: readonly number[];
  unresolved: number;
  overlapsSignedOff: boolean;
}): string | null {
  if (!isRealDate(input.periodStart) || !isRealDate(input.periodEnd))
    return "Pick the first and last day of the statement.";
  if (input.periodEnd < input.periodStart) return "The statement can't end before it starts.";
  if (input.periodEnd > addDays(input.today, 0)) return "A statement can't end in the future.";
  if (input.overlapsSignedOff) return "Part of that period has already been signed off.";
  if (input.openingMinor === null || input.closingMinor === null)
    return "Enter the opening and closing balances from the statement.";
  if (input.amounts.length === 0) return "No statement lines fall in that period.";
  if (input.unresolved > 0)
    return `${input.unresolved} ${input.unresolved === 1 ? "line is" : "lines are"} still unmatched. Match, book or set each one aside first.`;
  const difference = statementDifference({
    openingMinor: input.openingMinor,
    closingMinor: input.closingMinor,
    amounts: input.amounts,
  });
  if (difference !== 0)
    return `The statement's lines don't add up to its closing balance: they are out by ${(Math.abs(difference) / 100).toFixed(2)}. A line may be missing from the import.`;
  return null;
}
