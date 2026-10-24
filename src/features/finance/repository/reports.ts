import "server-only";

import { addDays, manilaDate } from "@/features/schedule/rules/slots";
import { prisma } from "@/lib/db";
import { isDatabaseConfigured } from "@/lib/env";
import {
  REPORT_META,
  buildBalanceSheet,
  buildCashFlow,
  buildProfitAndLoss,
  buildTaxSummary,
  buildTrialBalance,
  type AccountTotals,
  type CashMovement,
  type ReportKey,
  type ReportSpec,
} from "../rules/reports";
import { isRealDate, type AccountType } from "../rules/core";

const num = (value: bigint | null | undefined) => Number(value ?? 0);
const at = (iso: string) => new Date(`${iso}T00:00:00Z`);

/** What a report is asked about: a period (from and to) or a day (as of). */
export interface ReportParams {
  from: string;
  to: string;
  asOf: string;
}

/** The first day of the calendar fiscal year a date falls in. */
export const yearStart = (date: string) => `${date.slice(0, 4)}-01-01`;

/** Sensible dates when none are given: this year so far, and today. */
export function defaultParams(today = manilaDate(new Date())): ReportParams {
  return { from: yearStart(today), to: today, asOf: today };
}

/** Reads dates from a URL, falling back to the defaults for anything missing or not a real date. */
export function readParams(raw: { from?: string; to?: string; asOf?: string }): ReportParams {
  const base = defaultParams();
  const pick = (value: string | undefined, fallback: string) =>
    value && isRealDate(value) ? value : fallback;
  const from = pick(raw.from, base.from);
  const to = pick(raw.to, base.to);
  return { from, to: to < from ? from : to, asOf: pick(raw.asOf, base.asOf) };
}

/** Every account's debits and credits within a date range (either end may be open). */
async function totals(range: { from?: string; to?: string }): Promise<AccountTotals[]> {
  const [accounts, sums] = await Promise.all([
    prisma.account.findMany({ orderBy: { code: "asc" } }),
    prisma.journalLine.groupBy({
      by: ["accountId"],
      where: {
        entry: {
          entryDate: {
            ...(range.from ? { gte: at(range.from) } : {}),
            ...(range.to ? { lte: at(range.to) } : {}),
          },
        },
      },
      _sum: { debitMinor: true, creditMinor: true },
    }),
  ]);
  const byId = new Map(sums.map((row) => [row.accountId, row._sum]));
  return accounts.map((account) => ({
    code: account.code,
    name: account.name,
    type: account.type as AccountType,
    systemKey: account.systemKey ?? undefined,
    debitMinor: num(byId.get(account.id)?.debitMinor),
    creditMinor: num(byId.get(account.id)?.creditMinor),
  }));
}

/** The accounts that hold cash: the cash and bank roles, and any account a bank account is tied to. */
async function cashAccountIds(): Promise<string[]> {
  const [roles, banks] = await Promise.all([
    prisma.account.findMany({
      where: { systemKey: { in: ["cash", "bank"] } },
      select: { id: true },
    }),
    prisma.bankAccount.findMany({ select: { accountId: true } }),
  ]);
  return [...new Set([...roles.map((r) => r.id), ...banks.map((b) => b.accountId)])];
}

async function cashBalance(ids: string[], upTo?: string): Promise<number> {
  if (ids.length === 0) return 0;
  const sum = await prisma.journalLine.aggregate({
    where: {
      accountId: { in: ids },
      ...(upTo ? { entry: { entryDate: { lte: at(upTo) } } } : {}),
    },
    _sum: { debitMinor: true, creditMinor: true },
  });
  return num(sum._sum.debitMinor) - num(sum._sum.creditMinor);
}

/**
 * What moved cash in a period, by the account on the other side of each entry. An entry's other
 * lines are credited with the cash they brought in (credit minus debit), which adds up exactly to
 * the cash the entry moved; moves between two cash accounts cancel out.
 */
async function cashMovements(from: string, to: string): Promise<CashMovement[]> {
  const ids = await cashAccountIds();
  if (ids.length === 0) return [];
  const touched = await prisma.journalLine.findMany({
    where: { accountId: { in: ids }, entry: { entryDate: { gte: at(from), lte: at(to) } } },
    select: { entryId: true },
    distinct: ["entryId"],
  });
  const entryIds = touched.map((row) => row.entryId);
  if (entryIds.length === 0) return [];
  const others = await prisma.journalLine.groupBy({
    by: ["accountId"],
    where: { entryId: { in: entryIds }, accountId: { notIn: ids } },
    _sum: { debitMinor: true, creditMinor: true },
  });
  const accounts = await prisma.account.findMany({
    where: { id: { in: others.map((row) => row.accountId) } },
  });
  return others.map((row) => {
    const account = accounts.find((item) => item.id === row.accountId)!;
    return {
      code: account.code,
      name: account.name,
      type: account.type as AccountType,
      systemKey: account.systemKey ?? undefined,
      amountMinor: num(row._sum.creditMinor) - num(row._sum.debitMinor),
    };
  });
}

/** Builds a report from the ledger. */
export async function getReport(key: ReportKey, params: ReportParams): Promise<ReportSpec | null> {
  if (!isDatabaseConfigured) return null;
  switch (key) {
    case "profit-and-loss":
      return buildProfitAndLoss(
        await totals({ from: params.from, to: params.to }),
        params.from,
        params.to,
      );
    case "balance-sheet": {
      const [cumulative, before] = await Promise.all([
        totals({ to: params.asOf }),
        totals({ to: addDays(yearStart(params.asOf), -1) }),
      ]);
      return buildBalanceSheet(cumulative, before, params.asOf);
    }
    case "trial-balance":
      return buildTrialBalance(await totals({ to: params.asOf }), params.asOf);
    case "cash-flow": {
      const ids = await cashAccountIds();
      const [movements, opening, closing] = await Promise.all([
        cashMovements(params.from, params.to),
        cashBalance(ids, addDays(params.from, -1)),
        cashBalance(ids, params.to),
      ]);
      return buildCashFlow({
        movements,
        openingMinor: opening,
        closingMinor: closing,
        from: params.from,
        to: params.to,
      });
    }
    case "tax-summary":
      return buildTaxSummary(
        await totals({ from: params.from, to: params.to }),
        params.from,
        params.to,
      );
  }
}

export { REPORT_META };
