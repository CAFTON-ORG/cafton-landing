import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { isDatabaseConfigured } from "@/lib/env";
import { paginate, type Page } from "@/lib/pagination";
import type { TableParams } from "@/lib/table-params";
import type { LedgerCandidate } from "../rules/bank";
import type {
  BankAccountView,
  BankLineRow,
  BankLineStatus,
  ReconciliationView,
} from "../types/bank";

const day = (date: Date | null | undefined) => (date ? date.toISOString().slice(0, 10) : undefined);
const num = (value: bigint | null | undefined) => Number(value ?? 0);

/** What the books hold in each ledger account: debits minus credits. */
async function ledgerBalances(accountIds: string[]): Promise<Map<string, number>> {
  const rows = await prisma.journalLine.groupBy({
    by: ["accountId"],
    where: { accountId: { in: accountIds } },
    _sum: { debitMinor: true, creditMinor: true },
  });
  return new Map(
    rows.map((row) => [row.accountId, num(row._sum.debitMinor) - num(row._sum.creditMinor)]),
  );
}

export async function listBankAccounts(): Promise<BankAccountView[]> {
  if (!isDatabaseConfigured) return [];
  const rows = await prisma.bankAccount.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
    include: {
      account: { select: { code: true, name: true } },
      imports: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } },
      reconciliations: { orderBy: { periodEnd: "desc" }, take: 1, select: { periodEnd: true } },
    },
  });
  const [balances, unmatched, totals] = await Promise.all([
    ledgerBalances(rows.map((row) => row.accountId)),
    prisma.bankLine.groupBy({
      by: ["bankAccountId"],
      where: { status: "unmatched" },
      _count: { _all: true },
    }),
    prisma.bankLine.groupBy({ by: ["bankAccountId"], _count: { _all: true } }),
  ]);
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    accountId: row.accountId,
    accountName: `${row.account.code} ${row.account.name}`,
    numberHint: row.numberHint ?? undefined,
    active: row.active,
    ledgerBalanceMinor: balances.get(row.accountId) ?? 0,
    unmatchedCount: unmatched.find((item) => item.bankAccountId === row.id)?._count._all ?? 0,
    lineCount: totals.find((item) => item.bankAccountId === row.id)?._count._all ?? 0,
    lastImportAt: row.imports[0]?.createdAt.toISOString(),
    signedOffThrough: day(row.reconciliations[0]?.periodEnd),
  }));
}

export async function getBankAccount(id: string): Promise<BankAccountView | null> {
  const all = await listBankAccounts();
  return all.find((item) => item.id === id) ?? null;
}

/** The last day of each signed-off period, for marking lines that can no longer change. */
async function signedPeriods(bankAccountId: string) {
  const rows = await prisma.bankReconciliation.findMany({
    where: { bankAccountId },
    select: { periodStart: true, periodEnd: true },
  });
  return rows.map((row) => ({
    start: day(row.periodStart) as string,
    end: day(row.periodEnd) as string,
  }));
}

export const isLocked = (date: string, periods: { start: string; end: string }[]) =>
  periods.some((period) => date >= period.start && date <= period.end);

export async function listBankLines(
  bankAccountId: string,
  params: TableParams,
): Promise<Page<BankLineRow>> {
  const empty: Page<BankLineRow> = {
    items: [],
    total: 0,
    page: 1,
    pageSize: params.pageSize,
    pageCount: 1,
  };
  if (!isDatabaseConfigured) return empty;
  const q = params.q.trim();
  const status = params.filters.status as BankLineStatus | "";
  const where: Prisma.BankLineWhereInput = {
    bankAccountId,
    ...(status ? { status } : {}),
    ...(q
      ? {
          OR: [
            { description: { contains: q, mode: "insensitive" } },
            { reference: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const dir = params.dir;
  const orderBy: Prisma.BankLineOrderByWithRelationInput[] =
    params.sort === "amount"
      ? [{ amountMinor: dir }, { lineDate: "desc" }]
      : [{ lineDate: dir }, { createdAt: dir }];
  const total = await prisma.bankLine.count({ where });
  const base = paginate(new Array(total), params.page, params.pageSize);
  const rows = await prisma.bankLine.findMany({
    where,
    orderBy,
    skip: (base.page - 1) * base.pageSize,
    take: base.pageSize,
  });
  const matched = rows.map((row) => row.journalLineId).filter((id): id is string => !!id);
  const [lines, periods] = await Promise.all([
    prisma.journalLine.findMany({
      where: { id: { in: matched } },
      select: { id: true, entry: { select: { id: true, number: true } } },
    }),
    signedPeriods(bankAccountId),
  ]);
  const items: BankLineRow[] = rows.map((row) => {
    const entry = lines.find((line) => line.id === row.journalLineId)?.entry;
    const date = day(row.lineDate) as string;
    return {
      id: row.id,
      date,
      description: row.description,
      reference: row.reference ?? undefined,
      amountMinor: num(row.amountMinor),
      balanceMinor: row.balanceMinor === null ? undefined : num(row.balanceMinor),
      status: row.status as BankLineStatus,
      note: row.note ?? undefined,
      entryId: entry?.id,
      entryNumber: entry?.number,
      locked: isLocked(date, periods),
    };
  });
  return { ...base, items };
}

/**
 * Postings on the bank's ledger account that no statement line has been put against yet: what a
 * statement line could be. A posting that was reversed, and the reversal itself, cancel out and
 * are left out.
 */
export async function ledgerCandidates(
  bankAccountId: string,
  options: { from?: string; to?: string } = {},
): Promise<LedgerCandidate[]> {
  if (!isDatabaseConfigured) return [];
  const account = await prisma.bankAccount.findUnique({
    where: { id: bankAccountId },
    select: { accountId: true },
  });
  if (!account) return [];
  const lines = await prisma.journalLine.findMany({
    where: {
      accountId: account.accountId,
      entry: {
        reversesId: null,
        reversedBy: null,
        ...(options.from || options.to
          ? {
              entryDate: {
                ...(options.from ? { gte: new Date(`${options.from}T00:00:00Z`) } : {}),
                ...(options.to ? { lte: new Date(`${options.to}T00:00:00Z`) } : {}),
              },
            }
          : {}),
      },
    },
    include: { entry: { select: { number: true, entryDate: true, memo: true } } },
    orderBy: { entry: { entryDate: "desc" } },
    take: 1000,
  });
  const taken = new Set(
    (
      await prisma.bankLine.findMany({
        where: { journalLineId: { in: lines.map((line) => line.id) } },
        select: { journalLineId: true },
      })
    ).map((row) => row.journalLineId),
  );
  return lines
    .filter((line) => !taken.has(line.id))
    .map((line) => ({
      lineId: line.id,
      entryNumber: line.entry.number,
      entryDate: day(line.entry.entryDate) as string,
      memo: line.entry.memo,
      signedMinor: num(line.debitMinor) - num(line.creditMinor),
    }))
    .filter((candidate) => candidate.signedMinor !== 0);
}

export async function listReconciliations(bankAccountId: string): Promise<ReconciliationView[]> {
  if (!isDatabaseConfigured) return [];
  const rows = await prisma.bankReconciliation.findMany({
    where: { bankAccountId },
    orderBy: { periodEnd: "desc" },
  });
  return rows.map((row) => ({
    id: row.id,
    periodStart: day(row.periodStart) as string,
    periodEnd: day(row.periodEnd) as string,
    openingMinor: num(row.openingMinor),
    closingMinor: num(row.closingMinor),
    lineCount: row.lineCount,
    signedByName: row.signedByName,
    createdAt: row.createdAt.toISOString(),
  }));
}
