import "server-only";

import { addDays } from "@/features/schedule/slots";
import { prisma } from "@/lib/db";
import { isDatabaseConfigured } from "@/lib/env";
import { periodLabel } from "./reports";

const num = (value: bigint | number | null | undefined) => Number(value ?? 0);

/** What the cash and bank accounts hold today: the sum of their ledger balances. */
export async function cashPosition(): Promise<number> {
  if (!isDatabaseConfigured) return 0;
  const [roles, banks] = await Promise.all([
    prisma.account.findMany({
      where: { systemKey: { in: ["cash", "bank"] } },
      select: { id: true },
    }),
    prisma.bankAccount.findMany({ where: { active: true }, select: { accountId: true } }),
  ]);
  const ids = [...new Set([...roles.map((r) => r.id), ...banks.map((b) => b.accountId)])];
  if (ids.length === 0) return 0;
  const sum = await prisma.journalLine.aggregate({
    where: { accountId: { in: ids } },
    _sum: { debitMinor: true, creditMinor: true },
  });
  return num(sum._sum.debitMinor) - num(sum._sum.creditMinor);
}

/** Income minus expenses over a period: the profit or loss the profit and loss report would show. */
export async function profitBetween(
  from: string,
  to: string,
): Promise<{ incomeMinor: number; expenseMinor: number }> {
  if (!isDatabaseConfigured) return { incomeMinor: 0, expenseMinor: 0 };
  const rows = await prisma.$queryRaw<{ income: bigint | null; expense: bigint | null }[]>`
    SELECT
      COALESCE(SUM(CASE WHEN a.type = 'revenue' THEN l.credit_minor - l.debit_minor ELSE 0 END), 0) AS income,
      COALESCE(SUM(CASE WHEN a.type = 'expense' THEN l.debit_minor - l.credit_minor ELSE 0 END), 0) AS expense
    FROM journal_lines l
    JOIN journal_entries e ON e.id = l.entry_id
    JOIN accounts a ON a.id = l.account_id
    WHERE e.entry_date >= ${new Date(`${from}T00:00:00Z`)}::date
      AND e.entry_date <= ${new Date(`${to}T00:00:00Z`)}::date
      AND a.type IN ('revenue', 'expense')`;
  return { incomeMinor: num(rows[0]?.income), expenseMinor: num(rows[0]?.expense) };
}

export interface MonthBar {
  /** "2026-10". */
  month: string;
  label: string;
  incomeMinor: number;
  expenseMinor: number;
}

const SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Income and expenses for each of the last `count` months, oldest first, with empty months filled in. */
export async function monthlyBars(today: string, count = 6): Promise<MonthBar[]> {
  const months: string[] = [];
  let year = Number(today.slice(0, 4));
  let month = Number(today.slice(5, 7));
  for (let i = 0; i < count; i++) {
    months.unshift(`${year}-${String(month).padStart(2, "0")}`);
    month -= 1;
    if (month === 0) {
      month = 12;
      year -= 1;
    }
  }
  const empty = months.map((key) => ({
    month: key,
    label: `${SHORT[Number(key.slice(5, 7)) - 1]}`,
    incomeMinor: 0,
    expenseMinor: 0,
  }));
  if (!isDatabaseConfigured) return empty;
  const from = `${months[0]}-01`;
  const rows = await prisma.$queryRaw<
    { month: string; income: bigint | null; expense: bigint | null }[]
  >`
    SELECT to_char(date_trunc('month', e.entry_date), 'YYYY-MM') AS month,
      COALESCE(SUM(CASE WHEN a.type = 'revenue' THEN l.credit_minor - l.debit_minor ELSE 0 END), 0) AS income,
      COALESCE(SUM(CASE WHEN a.type = 'expense' THEN l.debit_minor - l.credit_minor ELSE 0 END), 0) AS expense
    FROM journal_lines l
    JOIN journal_entries e ON e.id = l.entry_id
    JOIN accounts a ON a.id = l.account_id
    WHERE e.entry_date >= ${new Date(`${from}T00:00:00Z`)}::date
      AND e.entry_date <= ${new Date(`${addDays(today, 0)}T00:00:00Z`)}::date
      AND a.type IN ('revenue', 'expense')
    GROUP BY 1`;
  return empty.map((bar) => {
    const row = rows.find((item) => item.month === bar.month);
    return { ...bar, incomeMinor: num(row?.income), expenseMinor: num(row?.expense) };
  });
}

/** "1 October 2026 to 23 October 2026", for captions. */
export const rangeText = periodLabel;

/** Bank lines still waiting for a decision, across the active bank accounts. */
export async function bankLinesToCheck(): Promise<number> {
  if (!isDatabaseConfigured) return 0;
  return prisma.bankLine.count({ where: { status: "unmatched", bankAccount: { active: true } } });
}
