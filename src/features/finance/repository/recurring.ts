import "server-only";

import { prisma } from "@/lib/db";
import { isDatabaseConfigured } from "@/lib/env";
import type { Frequency, RecurringKind } from "../rules/recurring";

export interface RecurringItemView {
  id: string;
  kind: RecurringKind;
  name: string;
  frequency: Frequency;
  nextDate: string;
  endDate?: string;
  active: boolean;
  vendorId?: string;
  vendorName?: string;
  payee?: string;
  description: string;
  accountId: string;
  accountName: string;
  amountMinor: number;
  paidFromAccountId?: string;
  createdCount: number;
}

const day = (date: Date | null) => (date ? date.toISOString().slice(0, 10) : undefined);

export async function listRecurring(): Promise<RecurringItemView[]> {
  if (!isDatabaseConfigured) return [];
  const rows = await prisma.recurringItem.findMany({
    orderBy: [{ active: "desc" }, { nextDate: "asc" }, { name: "asc" }],
    include: { vendor: { select: { name: true } } },
  });
  const accounts = await prisma.account.findMany({
    where: { id: { in: [...new Set(rows.map((row) => row.accountId))] } },
    select: { id: true, code: true, name: true },
  });
  return rows.map((row) => {
    const account = accounts.find((item) => item.id === row.accountId);
    return {
      id: row.id,
      kind: row.kind as RecurringKind,
      name: row.name,
      frequency: row.frequency as Frequency,
      nextDate: day(row.nextDate) as string,
      endDate: day(row.endDate),
      active: row.active,
      vendorId: row.vendorId ?? undefined,
      vendorName: row.vendor?.name,
      payee: row.payee ?? undefined,
      description: row.description,
      accountId: row.accountId,
      accountName: account ? `${account.code} ${account.name}` : "",
      amountMinor: Number(row.amountMinor),
      paidFromAccountId: row.paidFromAccountId ?? undefined,
      createdCount: row.createdCount,
    };
  });
}
