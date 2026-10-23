/**
 * Financial reports built from the ledger's account totals: profit and loss, balance sheet, trial
 * balance, cash flow and a tax summary. Pure: they take totals in and give a plain description of
 * the report out (`ReportSpec`), which the screen, the CSV and the PDF all draw from, so the three
 * can never disagree. Money is whole centavos; dates are "YYYY-MM-DD".
 */

import { toCsv } from "@/lib/csv";
import { balanceOf, type AccountType } from "./rules";

export const REPORT_KEYS = [
  "profit-and-loss",
  "balance-sheet",
  "trial-balance",
  "cash-flow",
  "tax-summary",
] as const;
export type ReportKey = (typeof REPORT_KEYS)[number];

export const REPORT_META: Record<
  ReportKey,
  { title: string; blurb: string; dated: "period" | "asOf" }
> = {
  "profit-and-loss": {
    title: "Profit and loss",
    blurb: "What came in and what went out over a period, and what was left.",
    dated: "period",
  },
  "balance-sheet": {
    title: "Balance sheet",
    blurb: "What the business owns, owes and is worth on one day.",
    dated: "asOf",
  },
  "trial-balance": {
    title: "Trial balance",
    blurb: "Every account's balance on one day. The two sides always match.",
    dated: "asOf",
  },
  "cash-flow": {
    title: "Cash flow",
    blurb: "Where cash came from and where it went over a period.",
    dated: "period",
  },
  "tax-summary": {
    title: "Tax summary",
    blurb: "Gross receipts and the tax withheld by and from others, for the accountant.",
    dated: "period",
  },
};

export type RowKind = "line" | "subtotal" | "total" | "note";

export interface ReportRow {
  label: string;
  /** One figure per column; null leaves a cell empty. */
  amounts?: (number | null)[];
  kind?: RowKind;
  /** The account code, shown in front of the label. */
  code?: string;
}

export interface ReportSection {
  heading?: string;
  rows: ReportRow[];
}

export interface ReportSpec {
  key: ReportKey;
  title: string;
  /** "1 January to 23 October 2026" or "As of 23 October 2026". */
  subtitle: string;
  columns: string[];
  sections: ReportSection[];
}

/** An account's totals over whatever span the report covers. */
export interface AccountTotals {
  code: string;
  name: string;
  type: AccountType;
  systemKey?: string;
  debitMinor: number;
  creditMinor: number;
}

const MONTHS = [
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
];

/** "2026-10-23" as "23 October 2026". */
export function longDate(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  return `${day} ${MONTHS[month - 1]} ${year}`;
}

export function periodLabel(from: string, to: string): string {
  return `${longDate(from)} to ${longDate(to)}`;
}

const sum = (values: readonly number[]) => values.reduce((total, value) => total + value, 0);
const nonZero = (account: AccountTotals) => account.debitMinor !== 0 || account.creditMinor !== 0;
const naturalBalance = (account: AccountTotals) =>
  balanceOf(account.type, account.debitMinor, account.creditMinor);

const accountRows = (accounts: readonly AccountTotals[]): ReportRow[] =>
  accounts.map((account) => ({
    label: account.name,
    code: account.code,
    amounts: [naturalBalance(account)],
  }));

/** Revenue minus expenses over the totals given. */
export function netIncomeOf(accounts: readonly AccountTotals[]): number {
  const revenue = sum(accounts.filter((a) => a.type === "revenue").map(naturalBalance));
  const expenses = sum(accounts.filter((a) => a.type === "expense").map(naturalBalance));
  return revenue - expenses;
}

/* ---------------------------------------------------------- profit and loss */

/** Totals are for the period only (not cumulative). */
export function buildProfitAndLoss(
  accounts: readonly AccountTotals[],
  from: string,
  to: string,
): ReportSpec {
  const used = accounts.filter(nonZero);
  const revenue = used.filter((a) => a.type === "revenue");
  const tax = used.filter((a) => a.type === "expense" && a.systemKey === "income_tax_expense");
  const costs = used.filter((a) => a.type === "expense" && a.systemKey !== "income_tax_expense");
  const totalRevenue = sum(revenue.map(naturalBalance));
  const totalCosts = sum(costs.map(naturalBalance));
  const totalTax = sum(tax.map(naturalBalance));
  const beforeTax = totalRevenue - totalCosts;

  return {
    key: "profit-and-loss",
    title: "Profit and loss",
    subtitle: periodLabel(from, to),
    columns: ["Amount"],
    sections: [
      {
        heading: "Income",
        rows: [
          ...accountRows(revenue),
          { label: "Total income", kind: "subtotal", amounts: [totalRevenue] },
        ],
      },
      {
        heading: "Expenses",
        rows: [
          ...accountRows(costs),
          { label: "Total expenses", kind: "subtotal", amounts: [totalCosts] },
        ],
      },
      {
        rows: [
          { label: "Profit before income tax", kind: "subtotal", amounts: [beforeTax] },
          ...accountRows(tax),
          { label: "Net income", kind: "total", amounts: [beforeTax - totalTax] },
        ],
      },
    ],
  };
}

/* ------------------------------------------------------------ balance sheet */

/**
 * `cumulative` is every account's totals up to the date; `before` is the same up to the day before
 * this fiscal year began, so what was earned in earlier years and in this one can be told apart
 * (until the year is closed into retained earnings, income and expense accounts are not zeroed).
 */
export function buildBalanceSheet(
  cumulative: readonly AccountTotals[],
  before: readonly AccountTotals[],
  asOf: string,
): ReportSpec {
  const used = cumulative.filter(nonZero);
  const assets = used.filter((a) => a.type === "asset");
  const liabilities = used.filter((a) => a.type === "liability");
  const equity = used.filter((a) => a.type === "equity");
  const earnedBefore = netIncomeOf(before);
  const earnedThisYear = netIncomeOf(cumulative) - earnedBefore;

  const totalAssets = sum(assets.map(naturalBalance));
  const totalLiabilities = sum(liabilities.map(naturalBalance));
  const totalEquity = sum(equity.map(naturalBalance)) + earnedBefore + earnedThisYear;

  return {
    key: "balance-sheet",
    title: "Balance sheet",
    subtitle: `As of ${longDate(asOf)}`,
    columns: ["Amount"],
    sections: [
      {
        heading: "Assets",
        rows: [
          ...accountRows(assets),
          { label: "Total assets", kind: "subtotal", amounts: [totalAssets] },
        ],
      },
      {
        heading: "Liabilities",
        rows: [
          ...accountRows(liabilities),
          { label: "Total liabilities", kind: "subtotal", amounts: [totalLiabilities] },
        ],
      },
      {
        heading: "Equity",
        rows: [
          ...accountRows(equity),
          ...(earnedBefore !== 0
            ? [{ label: "Earnings from earlier years", amounts: [earnedBefore] } as ReportRow]
            : []),
          { label: "Earnings this year", amounts: [earnedThisYear] },
          { label: "Total equity", kind: "subtotal", amounts: [totalEquity] },
        ],
      },
      {
        rows: [
          {
            label: "Liabilities and equity",
            kind: "total",
            amounts: [totalLiabilities + totalEquity],
          },
          ...(totalAssets !== totalLiabilities + totalEquity
            ? [
                {
                  label: `The sides differ by ${((totalAssets - totalLiabilities - totalEquity) / 100).toFixed(2)}. Something was posted outside the normal flow.`,
                  kind: "note",
                } as ReportRow,
              ]
            : []),
        ],
      },
    ],
  };
}

/* ------------------------------------------------------------ trial balance */

/** Cumulative totals up to the date. Each account's net balance goes in the column it belongs to. */
export function buildTrialBalance(cumulative: readonly AccountTotals[], asOf: string): ReportSpec {
  const rows: ReportRow[] = [];
  let debits = 0;
  let credits = 0;
  for (const account of cumulative.filter(nonZero)) {
    const net = account.debitMinor - account.creditMinor;
    debits += net > 0 ? net : 0;
    credits += net < 0 ? -net : 0;
    rows.push({
      label: account.name,
      code: account.code,
      amounts: [net > 0 ? net : null, net < 0 ? -net : null],
    });
  }
  return {
    key: "trial-balance",
    title: "Trial balance",
    subtitle: `As of ${longDate(asOf)}`,
    columns: ["Debit", "Credit"],
    sections: [
      { rows: [...rows, { label: "Total", kind: "total", amounts: [debits, credits] }] },
      ...(debits !== credits
        ? [
            {
              rows: [
                {
                  label: "The two sides differ. Something was posted outside the normal flow.",
                  kind: "note" as const,
                },
              ],
            },
          ]
        : []),
    ],
  };
}

/* ---------------------------------------------------------------- cash flow */

/** Cash effect of an entry's other lines, summed by account over the period. */
export interface CashMovement {
  code: string;
  name: string;
  type: AccountType;
  systemKey?: string;
  /** Positive brought cash in, negative took it out. */
  amountMinor: number;
}

const GROUPS = [
  { id: "customers", label: "Received from customers", section: "operating" },
  { id: "withheld", label: "Tax withheld by clients", section: "operating" },
  { id: "suppliers", label: "Paid to suppliers and for expenses", section: "operating" },
  { id: "reimbursed", label: "Paid back to people who covered costs", section: "operating" },
  { id: "taxes", label: "Taxes and withholdings paid over", section: "operating" },
  { id: "other", label: "Other", section: "operating" },
  { id: "owner", label: "Put in or taken out by the owner", section: "financing" },
] as const;

/** Which group a movement belongs to, by the account on the other side of the cash. */
export function cashGroup(type: AccountType, systemKey?: string): (typeof GROUPS)[number]["id"] {
  if (systemKey === "cwt_receivable") return "withheld";
  if (systemKey === "reimbursable") return "reimbursed";
  if (
    systemKey === "withholding_payable" ||
    systemKey === "income_tax_payable" ||
    systemKey === "vat_payable"
  )
    return "taxes";
  if (systemKey === "ar" || systemKey === "customer_deposits" || type === "revenue")
    return "customers";
  if (systemKey === "ap" || type === "expense" || type === "asset") return "suppliers";
  if (type === "equity") return "owner";
  return "other";
}

export function buildCashFlow(input: {
  movements: readonly CashMovement[];
  openingMinor: number;
  closingMinor: number;
  from: string;
  to: string;
}): ReportSpec {
  const byGroup = new Map<string, CashMovement[]>();
  for (const movement of input.movements.filter((m) => m.amountMinor !== 0)) {
    const id = cashGroup(movement.type, movement.systemKey);
    byGroup.set(id, [...(byGroup.get(id) ?? []), movement]);
  }
  const sectionTotals = { operating: 0, financing: 0 };
  const section = (name: "operating" | "financing", heading: string): ReportSection => {
    const rows: ReportRow[] = [];
    for (const group of GROUPS.filter((g) => g.section === name)) {
      const found = (byGroup.get(group.id) ?? []).sort((a, b) => a.code.localeCompare(b.code));
      if (found.length === 0) continue;
      rows.push({ label: group.label, kind: "note" });
      for (const m of found) rows.push({ label: m.name, code: m.code, amounts: [m.amountMinor] });
      const total = sum(found.map((m) => m.amountMinor));
      sectionTotals[name] += total;
      rows.push({
        label: `Subtotal: ${group.label.toLowerCase()}`,
        kind: "subtotal",
        amounts: [total],
      });
    }
    const net = sectionTotals[name];
    rows.push({
      label: `Net cash from ${name === "operating" ? "operations" : "the owner"}`,
      kind: "subtotal",
      amounts: [net],
    });
    return { heading, rows };
  };
  const operating = section("operating", "Operations");
  const financing = section("financing", "Owner");
  const change = sectionTotals.operating + sectionTotals.financing;

  return {
    key: "cash-flow",
    title: "Cash flow",
    subtitle: periodLabel(input.from, input.to),
    columns: ["Amount"],
    sections: [
      operating,
      financing,
      {
        rows: [
          { label: "Net change in cash", kind: "subtotal", amounts: [change] },
          { label: "Cash at the start", amounts: [input.openingMinor] },
          { label: "Cash at the end", kind: "total", amounts: [input.openingMinor + change] },
          ...(input.openingMinor + change !== input.closingMinor
            ? [
                {
                  label: "The cash accounts hold a different amount than this adds up to.",
                  kind: "note" as const,
                },
              ]
            : []),
        ],
      },
    ],
  };
}

/* -------------------------------------------------------------- tax summary */

/** Period totals. Gross receipts are what the business earned; the rest are tax held by or for others. */
export function buildTaxSummary(
  accounts: readonly AccountTotals[],
  from: string,
  to: string,
): ReportSpec {
  const revenue = accounts.filter((a) => a.type === "revenue" && nonZero(a));
  const gross = sum(revenue.map(naturalBalance));
  const key = (systemKey: string) => accounts.find((a) => a.systemKey === systemKey);
  const cwt = key("cwt_receivable");
  const withholding = key("withholding_payable");
  const vat = key("vat_payable");

  return {
    key: "tax-summary",
    title: "Tax summary",
    subtitle: periodLabel(from, to),
    columns: ["Amount"],
    sections: [
      {
        heading: "Gross receipts",
        rows: [
          ...accountRows(revenue),
          { label: "Gross receipts and sales", kind: "total", amounts: [gross] },
          {
            label:
              "The 8% income tax option applies to receipts above 250,000 pesos in the year. See the tax tracker for the estimate.",
            kind: "note",
          },
        ],
      },
      {
        heading: "Tax withheld by clients",
        rows: [
          {
            label: "Creditable withholding tax claimed in the period",
            amounts: [cwt?.debitMinor ?? 0],
          },
          { label: "Used against tax or refunded in the period", amounts: [cwt?.creditMinor ?? 0] },
        ],
      },
      {
        heading: "Tax withheld from suppliers, to pay over",
        rows: [
          { label: "Withheld in the period", amounts: [withholding?.creditMinor ?? 0] },
          { label: "Paid over in the period", amounts: [withholding?.debitMinor ?? 0] },
        ],
      },
      {
        heading: "VAT",
        rows: [
          { label: "Output VAT charged in the period", amounts: [vat?.creditMinor ?? 0] },
          { label: "The business is not VAT-registered, so this should be zero.", kind: "note" },
        ],
      },
    ],
  };
}

/* ------------------------------------------------------------------ export */

const pesos = (minor: number) => (minor / 100).toFixed(2);

/** The report as CSV: a section column, the label (with the account code) and a figure per column. */
export function reportToCsv(spec: ReportSpec): string {
  const rows: (string | number)[][] = [];
  for (const section of spec.sections) {
    for (const row of section.rows) {
      if (row.kind === "note") continue;
      rows.push([
        section.heading ?? "",
        row.code ? `${row.code} ${row.label}` : row.label,
        ...spec.columns.map((_, index) => {
          const amount = row.amounts?.[index];
          return amount === null || amount === undefined ? "" : pesos(amount);
        }),
      ]);
    }
  }
  return toCsv(["Section", spec.title, ...spec.columns], rows);
}
