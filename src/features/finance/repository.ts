import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { isDatabaseConfigured } from "@/lib/env";
import { paginate, type Page } from "@/lib/pagination";
import type { TableParams } from "@/lib/table-params";
import { balanceOf, type AccountType, type PeriodStatus } from "./rules";
import type {
  AccountView,
  JournalDetail,
  JournalRow,
  PeriodView,
  TaxRateView,
  TrialBalanceRow,
} from "./types";

const day = (date: Date) => date.toISOString().slice(0, 10);
const num = (value: bigint | null | undefined) => Number(value ?? 0);

/* ------------------------------------------------------------------ accounts */

/** Debits and credits per account over everything, or up to and including `asOf`. */
async function sums(asOf?: string): Promise<Map<string, { debit: number; credit: number }>> {
  const rows = await prisma.journalLine.groupBy({
    by: ["accountId"],
    where: asOf ? { entry: { entryDate: { lte: new Date(`${asOf}T00:00:00Z`) } } } : {},
    _sum: { debitMinor: true, creditMinor: true },
  });
  return new Map(
    rows.map((row) => [
      row.accountId,
      { debit: num(row._sum.debitMinor), credit: num(row._sum.creditMinor) },
    ]),
  );
}

export async function listAccounts(
  options: { includeArchived?: boolean } = {},
): Promise<AccountView[]> {
  if (!isDatabaseConfigured) return [];
  const [rows, totals, used] = await Promise.all([
    prisma.account.findMany({
      where: options.includeArchived ? {} : { active: true },
      orderBy: { code: "asc" },
    }),
    sums(),
    prisma.journalLine.groupBy({ by: ["accountId"], _count: { _all: true } }),
  ]);
  const usedIds = new Set(used.map((row) => row.accountId));
  return rows.map((row) => {
    const total = totals.get(row.id) ?? { debit: 0, credit: 0 };
    const type = row.type as AccountType;
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      type,
      description: row.description ?? undefined,
      systemKey: row.systemKey ?? undefined,
      active: row.active,
      debitMinor: total.debit,
      creditMinor: total.credit,
      balanceMinor: balanceOf(type, total.debit, total.credit),
      used: usedIds.has(row.id),
    };
  });
}

/** Accounts a posting may use: active ones, for pickers. */
export async function listPostableAccounts(): Promise<
  { id: string; code: string; name: string; type: AccountType; systemKey?: string }[]
> {
  if (!isDatabaseConfigured) return [];
  const rows = await prisma.account.findMany({
    where: { active: true },
    orderBy: { code: "asc" },
    select: { id: true, code: true, name: true, type: true, systemKey: true },
  });
  return rows.map((row) => ({
    ...row,
    type: row.type as AccountType,
    systemKey: row.systemKey ?? undefined,
  }));
}

/** Every account with its totals as of a date: the trial balance's raw material. */
export async function trialBalance(asOf: string): Promise<TrialBalanceRow[]> {
  if (!isDatabaseConfigured) return [];
  const [accounts, totals] = await Promise.all([
    prisma.account.findMany({ orderBy: { code: "asc" } }),
    sums(asOf),
  ]);
  return accounts
    .map((account) => {
      const total = totals.get(account.id) ?? { debit: 0, credit: 0 };
      return {
        accountId: account.id,
        code: account.code,
        name: account.name,
        type: account.type as AccountType,
        debitMinor: total.debit,
        creditMinor: total.credit,
      };
    })
    .filter((row) => row.debitMinor !== 0 || row.creditMinor !== 0);
}

/* ------------------------------------------------------------------ journal */

const entryInclude = {
  lines: {
    include: { account: { select: { code: true, name: true } } },
    orderBy: { position: "asc" },
  },
  reverses: { select: { number: true } },
  reversedBy: { select: { id: true, number: true } },
} satisfies Prisma.JournalEntryInclude;

type EntryFull = Prisma.JournalEntryGetPayload<{ include: typeof entryInclude }>;

const toRow = (row: EntryFull): JournalRow => ({
  id: row.id,
  number: row.number,
  entryDate: day(row.entryDate),
  memo: row.memo,
  sourceKind: row.sourceKind,
  totalMinor: row.lines.reduce((sum, line) => sum + num(line.debitMinor), 0),
  createdByName: row.createdByName,
  createdAt: row.createdAt.toISOString(),
  reversesNumber: row.reverses?.number,
  reversedByNumber: row.reversedBy?.number,
});

export async function listJournal(params: TableParams): Promise<Page<JournalRow>> {
  const empty: Page<JournalRow> = {
    items: [],
    total: 0,
    page: 1,
    pageSize: params.pageSize,
    pageCount: 1,
  };
  if (!isDatabaseConfigured) return empty;
  const q = params.q.trim();
  const where: Prisma.JournalEntryWhereInput = {
    ...(params.filters.source ? { sourceKind: params.filters.source } : {}),
    ...(q
      ? {
          OR: [
            { number: { contains: q, mode: "insensitive" } },
            { memo: { contains: q, mode: "insensitive" } },
            { lines: { some: { account: { name: { contains: q, mode: "insensitive" } } } } },
          ],
        }
      : {}),
  };
  const dir = params.dir;
  const orderBy: Prisma.JournalEntryOrderByWithRelationInput =
    params.sort === "number" ? { number: dir } : { entryDate: dir };
  const total = await prisma.journalEntry.count({ where });
  const base = paginate(new Array(total), params.page, params.pageSize);
  const rows = await prisma.journalEntry.findMany({
    where,
    include: entryInclude,
    orderBy: [orderBy, { createdAt: "desc" }],
    skip: (base.page - 1) * base.pageSize,
    take: base.pageSize,
  });
  return { ...base, items: rows.map(toRow) };
}

export async function getJournalEntry(id: string): Promise<JournalDetail | null> {
  if (!isDatabaseConfigured) return null;
  const row = await prisma.journalEntry
    .findUnique({ where: { id }, include: entryInclude })
    .catch(() => null);
  if (!row) return null;
  return {
    ...toRow(row),
    sourceId: row.sourceId ?? undefined,
    reversesId: row.reversesId ?? undefined,
    reversedById: row.reversedBy?.id,
    lines: row.lines.map((line) => ({
      id: line.id,
      accountId: line.accountId,
      accountCode: line.account.code,
      accountName: line.account.name,
      debitMinor: num(line.debitMinor),
      creditMinor: num(line.creditMinor),
      memo: line.memo ?? undefined,
    })),
  };
}

/* ------------------------------------------------------------------ periods */

export async function listPeriods(year: number): Promise<PeriodView[]> {
  if (!isDatabaseConfigured) return [];
  const [rows, counts] = await Promise.all([
    prisma.fiscalPeriod.findMany({ where: { year }, orderBy: { month: "asc" } }),
    prisma.journalEntry.groupBy({
      by: ["entryDate"],
      where: {
        entryDate: {
          gte: new Date(`${year}-01-01T00:00:00Z`),
          lte: new Date(`${year}-12-31T00:00:00Z`),
        },
      },
      _count: { _all: true },
    }),
  ]);
  const closers = await prisma.profile.findMany({
    where: { id: { in: rows.map((row) => row.closedBy).filter((id): id is string => !!id) } },
    select: { id: true, fullName: true, email: true },
  });
  const names = new Map(closers.map((profile) => [profile.id, profile.fullName || profile.email]));
  const byMonth = new Map<number, number>();
  for (const row of counts) {
    const month = row.entryDate.getUTCMonth() + 1;
    byMonth.set(month, (byMonth.get(month) ?? 0) + row._count._all);
  }
  return rows.map((row) => ({
    year: row.year,
    month: row.month,
    startsOn: day(row.startsOn),
    endsOn: day(row.endsOn),
    status: row.status as PeriodStatus,
    closedAt: row.closedAt?.toISOString(),
    closedByName: row.closedBy ? names.get(row.closedBy) : undefined,
    entries: byMonth.get(row.month) ?? 0,
  }));
}

/* ---------------------------------------------------------------- tax rates */

export async function listTaxRates(): Promise<TaxRateView[]> {
  if (!isDatabaseConfigured) return [];
  const rows = await prisma.taxRate.findMany({
    orderBy: [{ active: "desc" }, { kind: "asc" }, { code: "asc" }],
  });
  return rows.map((row) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    rateBp: row.rateBp,
    kind: row.kind as TaxRateView["kind"],
    active: row.active,
  }));
}
