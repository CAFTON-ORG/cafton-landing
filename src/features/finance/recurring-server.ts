import "server-only";

import { notify, staffIdsWith } from "@/features/notifications/server";
import { addDays, manilaDate } from "@/features/schedule/slots";
import { prisma } from "@/lib/db";
import { isDatabaseConfigured } from "@/lib/env";
import { dueOccurrences, type Frequency, type RecurringKind } from "./recurring";

const iso = (value: Date) => value.toISOString().slice(0, 10);
const date = (value: string) => new Date(`${value}T00:00:00Z`);

export interface RecurringRun {
  bills: number;
  expenses: number;
  skipped: number;
}

/**
 * Makes what has fallen due: a DRAFT bill for a recurring bill, an expense waiting for approval for
 * a recurring expense. Nothing is posted to the books here; a person still approves it. Each item
 * runs on its own, and each date is made once (a unique key on the item and the date), so running
 * the job twice, or after a failure, never doubles anything.
 */
export async function generateDueRecurring(today = manilaDate(new Date())): Promise<RecurringRun> {
  const run: RecurringRun = { bills: 0, expenses: 0, skipped: 0 };
  if (!isDatabaseConfigured) return run;

  const items = await prisma.recurringItem.findMany({
    where: { active: true, nextDate: { lte: date(today) } },
    include: { vendor: true },
    take: 200,
  });

  for (const item of items) {
    const schedule = dueOccurrences(
      {
        nextDate: iso(item.nextDate),
        endDate: item.endDate ? iso(item.endDate) : null,
        frequency: item.frequency as Frequency,
        anchorDay: item.anchorDay,
        active: item.active,
      },
      today,
    );
    if (schedule.dates.length === 0 && !schedule.finished) continue;
    if (item.kind === "bill" && (!item.vendor || !item.vendor.active)) {
      run.skipped += 1; // their supplier is archived: leave it for a person to sort out
      continue;
    }

    try {
      await prisma.$transaction(async (tx) => {
        for (const day of schedule.dates) {
          const where = { recurringId: item.id, recursOn: date(day) };
          if (item.kind === "bill" && item.vendor) {
            if (await tx.bill.findFirst({ where, select: { id: true } })) continue;
            await tx.bill.create({
              data: {
                ...where,
                vendorId: item.vendor.id,
                vendorName: item.vendor.name,
                billDate: date(day),
                dueDate: date(addDays(day, item.vendor.termsDays)),
                totalMinor: item.amountMinor,
                notes: `Made by the recurring item "${item.name}".`,
                lines: {
                  create: [
                    {
                      position: 0,
                      description: item.description,
                      accountId: item.accountId,
                      amountMinor: item.amountMinor,
                    },
                  ],
                },
              },
            });
            run.bills += 1;
          } else if (item.kind === "expense") {
            if (await tx.expense.findFirst({ where, select: { id: true } })) continue;
            await tx.expense.create({
              data: {
                ...where,
                expenseDate: date(day),
                payee: item.payee as string,
                description: item.description,
                accountId: item.accountId,
                amountMinor: item.amountMinor,
                paidFromAccountId: item.paidFromAccountId as string,
                submittedByName: `Recurring: ${item.name}`,
              },
            });
            run.expenses += 1;
          }
        }
        await tx.recurringItem.update({
          where: { id: item.id },
          data: {
            nextDate: date(schedule.nextDate),
            lastGeneratedOn: date(today),
            createdCount: { increment: schedule.dates.length },
            ...(schedule.finished ? { active: false } : {}),
          },
        });
      });
    } catch (error) {
      console.error(`Recurring: could not make ${item.name}.`, error);
      run.skipped += 1;
    }
  }

  const kinds = new Set<RecurringKind>();
  if (run.bills > 0) kinds.add("bill");
  if (run.expenses > 0) kinds.add("expense");
  if (kinds.has("bill")) {
    await notify(await staffIdsWith("payables:approve"), {
      kind: "recurring.bills",
      title: `${run.bills} recurring ${run.bills === 1 ? "bill is" : "bills are"} ready to check`,
      href: "/dashboard/finance/bills?state=draft",
    });
  }
  if (kinds.has("expense")) {
    await notify(await staffIdsWith("expenses:approve"), {
      kind: "recurring.expenses",
      title: `${run.expenses} recurring ${run.expenses === 1 ? "expense is" : "expenses are"} waiting for approval`,
      href: "/dashboard/finance/expenses?status=submitted",
    });
  }
  return run;
}
