import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { isDatabaseConfigured } from "@/lib/env";
import { paginate, type Page } from "@/lib/pagination";
import type { TableParams } from "@/lib/table-params";
import { agingBucket, type PaymentMethod } from "./invoicing";
import type {
  BillDetail,
  BillPaymentView,
  BillRow,
  OpenBill,
  PayableAgingRow,
  VendorView,
} from "./payable-types";
import { billBalance, billStateOf, type BillState, type BillStatus } from "./payables";

const day = (date: Date | null | undefined) => (date ? date.toISOString().slice(0, 10) : undefined);
const num = (value: bigint | null | undefined) => Number(value ?? 0);

/** What has been paid against each bill (cash and withheld tax; voided payments don't count). */
export async function paidAmounts(ids: string[]): Promise<Map<string, number>> {
  const map = new Map<string, number>(ids.map((id) => [id, 0]));
  if (ids.length === 0) return map;
  const rows = await prisma.billPayment.groupBy({
    by: ["billId"],
    where: { billId: { in: ids }, status: "recorded" },
    _sum: { amountMinor: true, whtMinor: true },
  });
  for (const row of rows) {
    map.set(row.billId, num(row._sum.amountMinor) + num(row._sum.whtMinor));
  }
  return map;
}

type Full = Prisma.BillGetPayload<object>;

function toRow(row: Full, paidMinor: number, today: string): BillRow {
  const standing = { totalMinor: num(row.totalMinor), paidMinor };
  const dueDate = day(row.dueDate) as string;
  return {
    id: row.id,
    number: row.number ?? undefined,
    status: row.status as BillStatus,
    state: billStateOf({ ...standing, status: row.status as BillStatus, dueDate }, today),
    vendorId: row.vendorId,
    vendorName: row.vendorName,
    vendorRef: row.vendorRef ?? undefined,
    billDate: day(row.billDate) as string,
    dueDate,
    totalMinor: standing.totalMinor,
    balanceMinor: row.status === "approved" ? billBalance(standing) : 0,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listVendors(): Promise<VendorView[]> {
  if (!isDatabaseConfigured) return [];
  const rows = await prisma.vendor.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
    include: {
      bills: { select: { id: true, status: true, totalMinor: true } },
    },
  });
  const accountIds = [
    ...new Set(rows.map((row) => row.defaultAccountId).filter(Boolean)),
  ] as string[];
  const accounts = await prisma.account.findMany({
    where: { id: { in: accountIds } },
    select: { id: true, code: true, name: true },
  });
  const approved = rows.flatMap((row) => row.bills.filter((bill) => bill.status === "approved"));
  const paid = await paidAmounts(approved.map((bill) => bill.id));
  return rows.map((row) => {
    const account = accounts.find((item) => item.id === row.defaultAccountId);
    const owedMinor = row.bills
      .filter((bill) => bill.status === "approved")
      .reduce((sum, bill) => sum + Math.max(0, num(bill.totalMinor) - (paid.get(bill.id) ?? 0)), 0);
    return {
      id: row.id,
      name: row.name,
      email: row.email ?? undefined,
      phone: row.phone ?? undefined,
      address: row.address ?? undefined,
      tin: row.tin ?? undefined,
      defaultAccountId: row.defaultAccountId ?? undefined,
      defaultAccountName: account ? `${account.code} ${account.name}` : undefined,
      termsDays: row.termsDays,
      notes: row.notes ?? undefined,
      active: row.active,
      billCount: row.bills.length,
      owedMinor,
    };
  });
}

export async function listBills(params: TableParams, today: string): Promise<Page<BillRow>> {
  const empty: Page<BillRow> = {
    items: [],
    total: 0,
    page: 1,
    pageSize: params.pageSize,
    pageCount: 1,
  };
  if (!isDatabaseConfigured) return empty;

  const state = params.filters.state as BillState | "";
  const q = params.q.trim();
  const where: Prisma.BillWhereInput = {
    ...(state === "draft"
      ? { status: "draft" }
      : state === "void"
        ? { status: "void" }
        : state
          ? { status: "approved" }
          : {}),
    ...(q
      ? {
          OR: [
            { number: { contains: q, mode: "insensitive" } },
            { vendorName: { contains: q, mode: "insensitive" } },
            { vendorRef: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const dir = params.dir;
  const orderBy: Prisma.BillOrderByWithRelationInput =
    params.sort === "number"
      ? { number: { sort: dir, nulls: "last" } }
      : params.sort === "due"
        ? { dueDate: dir }
        : params.sort === "total"
          ? { totalMinor: dir }
          : { createdAt: dir };

  // Where a bill stands depends on payments, so a state filter is applied after reading them.
  if (state === "open" || state === "partial" || state === "overdue" || state === "paid") {
    const all = await prisma.bill.findMany({ where, orderBy, take: 2000 });
    const paid = await paidAmounts(all.map((row) => row.id));
    const rows = all
      .map((row) => toRow(row, paid.get(row.id) ?? 0, today))
      .filter((row) => row.state === state);
    const base = paginate(rows, params.page, params.pageSize);
    return {
      ...base,
      items: rows.slice((base.page - 1) * base.pageSize, base.page * base.pageSize),
    };
  }

  const total = await prisma.bill.count({ where });
  const base = paginate(new Array(total), params.page, params.pageSize);
  const rows = await prisma.bill.findMany({
    where,
    orderBy,
    skip: (base.page - 1) * base.pageSize,
    take: base.pageSize,
  });
  const paid = await paidAmounts(rows.map((row) => row.id));
  return { ...base, items: rows.map((row) => toRow(row, paid.get(row.id) ?? 0, today)) };
}

const toPayment = (
  row: Prisma.BillPaymentGetPayload<object>,
  paidFromName: string,
): BillPaymentView => ({
  id: row.id,
  number: row.number,
  paidDate: day(row.paidDate) as string,
  amountMinor: num(row.amountMinor),
  whtMinor: num(row.whtMinor),
  method: row.method as PaymentMethod,
  reference: row.reference ?? undefined,
  paidFromName,
  status: row.status as "recorded" | "void",
  journalEntryId: row.journalEntryId,
  voidReason: row.voidReason ?? undefined,
});

export async function getBill(id: string, today: string): Promise<BillDetail | null> {
  if (!isDatabaseConfigured) return null;
  const row = await prisma.bill
    .findUnique({
      where: { id },
      include: {
        vendor: { select: { active: true, termsDays: true } },
        lines: { orderBy: { position: "asc" } },
        payments: { orderBy: { paidDate: "asc" } },
      },
    })
    .catch(() => null);
  if (!row) return null;
  const accountIds = [
    ...new Set([
      ...row.lines.map((line) => line.accountId),
      ...row.payments.map((p) => p.paidFromAccountId),
    ]),
  ];
  const accounts = await prisma.account.findMany({
    where: { id: { in: accountIds } },
    select: { id: true, code: true, name: true },
  });
  const account = (accountId: string) => accounts.find((item) => item.id === accountId);
  const paidMinor = row.payments
    .filter((payment) => payment.status === "recorded")
    .reduce((sum, payment) => sum + num(payment.amountMinor) + num(payment.whtMinor), 0);
  return {
    ...toRow(row, paidMinor, today),
    notes: row.notes ?? undefined,
    journalEntryId: row.journalEntryId ?? undefined,
    approvedAt: row.approvedAt?.toISOString(),
    voidedAt: row.voidedAt?.toISOString(),
    voidReason: row.voidReason ?? undefined,
    paidMinor,
    vendorActive: row.vendor.active,
    vendorTermsDays: row.vendor.termsDays,
    lines: row.lines.map((line) => ({
      id: line.id,
      description: line.description,
      accountId: line.accountId,
      accountCode: account(line.accountId)?.code ?? "",
      accountName: account(line.accountId)?.name ?? "",
      amountMinor: num(line.amountMinor),
    })),
    payments: row.payments.map((payment) => {
      const from = account(payment.paidFromAccountId);
      return toPayment(payment, from ? `${from.code} ${from.name}` : "");
    }),
  };
}

/** Approved bills still owed on, oldest due date first. */
export async function listOpenBills(): Promise<OpenBill[]> {
  if (!isDatabaseConfigured) return [];
  const rows = await prisma.bill.findMany({
    where: { status: "approved" },
    orderBy: [{ dueDate: "asc" }, { number: "asc" }],
  });
  const paid = await paidAmounts(rows.map((row) => row.id));
  return rows
    .map((row) => ({
      id: row.id,
      number: row.number as string,
      vendorId: row.vendorId,
      vendorName: row.vendorName,
      dueDate: day(row.dueDate) as string,
      totalMinor: num(row.totalMinor),
      balanceMinor: num(row.totalMinor) - (paid.get(row.id) ?? 0),
    }))
    .filter((row) => row.balanceMinor > 0);
}

/** Money owed to suppliers, by how late it is, as of `today`. */
export async function payablesAging(today: string): Promise<PayableAgingRow[]> {
  const open = await listOpenBills();
  const byVendor = new Map<string, PayableAgingRow>();
  for (const bill of open) {
    const row =
      byVendor.get(bill.vendorId) ??
      ({
        vendorId: bill.vendorId,
        vendorName: bill.vendorName,
        bills: 0,
        current: 0,
        d1_30: 0,
        d31_60: 0,
        d61_90: 0,
        d90: 0,
        totalMinor: 0,
      } satisfies PayableAgingRow);
    row.bills += 1;
    row.totalMinor += bill.balanceMinor;
    const bucket = agingBucket(bill.dueDate, today);
    if (bucket === "current") row.current += bill.balanceMinor;
    else if (bucket === "1-30") row.d1_30 += bill.balanceMinor;
    else if (bucket === "31-60") row.d31_60 += bill.balanceMinor;
    else if (bucket === "61-90") row.d61_90 += bill.balanceMinor;
    else row.d90 += bill.balanceMinor;
    byVendor.set(bill.vendorId, row);
  }
  return [...byVendor.values()].sort((a, b) => b.totalMinor - a.totalMinor);
}
