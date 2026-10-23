import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { isDatabaseConfigured } from "@/lib/env";
import { paginate, type Page } from "@/lib/pagination";
import type { TableParams } from "@/lib/table-params";
import type { ExpenseDetail, ExpenseRow, ReceiptView } from "./expense-types";
import type { ExpenseStatus } from "./expenses";

const day = (date: Date | null | undefined) => (date ? date.toISOString().slice(0, 10) : undefined);

const accountName = (account?: { code: string; name: string }) =>
  account ? `${account.code} ${account.name}` : "";

type Row = Prisma.ExpenseGetPayload<{ include: { _count: { select: { receipts: true } } } }>;

const toRow = (row: Row, accounts: Map<string, string>): ExpenseRow => ({
  id: row.id,
  number: row.number ?? undefined,
  status: row.status as ExpenseStatus,
  expenseDate: day(row.expenseDate) as string,
  payee: row.payee,
  description: row.description,
  accountName: accounts.get(row.accountId) ?? "",
  amountMinor: Number(row.amountMinor),
  submittedBy: row.submittedBy ?? undefined,
  submittedByName: row.submittedByName,
  receiptCount: row._count.receipts,
  createdAt: row.createdAt.toISOString(),
});

async function accountNames(ids: string[]): Promise<Map<string, string>> {
  const rows = await prisma.account.findMany({
    where: { id: { in: [...new Set(ids)] } },
    select: { id: true, code: true, name: true },
  });
  return new Map(rows.map((row) => [row.id, accountName(row)]));
}

/**
 * Expenses for the list. Someone who can only submit sees their own; an approver sees everyone's
 * (`viewAll`).
 */
export async function listExpenses(
  params: TableParams,
  scope: { actorId: string; viewAll: boolean },
): Promise<Page<ExpenseRow>> {
  const empty: Page<ExpenseRow> = {
    items: [],
    total: 0,
    page: 1,
    pageSize: params.pageSize,
    pageCount: 1,
  };
  if (!isDatabaseConfigured) return empty;

  const q = params.q.trim();
  const status = params.filters.status as ExpenseStatus | "";
  const where: Prisma.ExpenseWhereInput = {
    ...(scope.viewAll ? {} : { submittedBy: scope.actorId }),
    ...(status ? { status } : {}),
    ...(q
      ? {
          OR: [
            { number: { contains: q, mode: "insensitive" } },
            { payee: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
            { submittedByName: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const dir = params.dir;
  const orderBy: Prisma.ExpenseOrderByWithRelationInput =
    params.sort === "date"
      ? { expenseDate: dir }
      : params.sort === "amount"
        ? { amountMinor: dir }
        : { createdAt: dir };

  const total = await prisma.expense.count({ where });
  const base = paginate(new Array(total), params.page, params.pageSize);
  const rows = await prisma.expense.findMany({
    where,
    orderBy,
    skip: (base.page - 1) * base.pageSize,
    take: base.pageSize,
    include: { _count: { select: { receipts: true } } },
  });
  const accounts = await accountNames(rows.map((row) => row.accountId));
  return { ...base, items: rows.map((row) => toRow(row, accounts)) };
}

/** How many expenses wait for a decision: the badge on the page and the approver's to-do. */
export async function countAwaitingApproval(): Promise<number> {
  if (!isDatabaseConfigured) return 0;
  return prisma.expense.count({ where: { status: "submitted" } });
}

export async function getExpense(id: string): Promise<ExpenseDetail | null> {
  if (!isDatabaseConfigured) return null;
  const row = await prisma.expense
    .findUnique({
      where: { id },
      include: {
        _count: { select: { receipts: true } },
        receipts: { orderBy: { createdAt: "asc" } },
      },
    })
    .catch(() => null);
  if (!row) return null;
  const accounts = await accountNames([row.accountId, row.paidFromAccountId]);
  const receipts: ReceiptView[] = row.receipts.map((receipt) => ({
    id: receipt.id,
    name: receipt.name,
    mime: receipt.mime,
    sizeBytes: receipt.sizeBytes,
    uploadedByName: receipt.uploadedByName,
    uploadedBy: receipt.uploadedBy ?? undefined,
    createdAt: receipt.createdAt.toISOString(),
  }));
  return {
    ...toRow(row, accounts),
    vendorId: row.vendorId ?? undefined,
    accountId: row.accountId,
    paidFromAccountId: row.paidFromAccountId,
    paidFromName: accounts.get(row.paidFromAccountId) ?? "",
    notes: row.notes ?? undefined,
    decidedByName: row.decidedByName ?? undefined,
    decidedAt: row.decidedAt?.toISOString(),
    rejectReason: row.rejectReason ?? undefined,
    voidReason: row.voidReason ?? undefined,
    voidedAt: row.voidedAt?.toISOString(),
    journalEntryId: row.journalEntryId ?? undefined,
    receipts,
  };
}
