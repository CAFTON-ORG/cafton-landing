import "server-only";

import { manilaDate } from "@/features/schedule/rules/slots";
import { prisma } from "@/lib/db";
import { sendInvoiceEmail } from "./emails";
import { getInvoice, standings } from "../repository/invoices";
import { balanceOf, reminderDue, stateOf, type InvoiceStatus } from "../rules/invoicing";

/**
 * The daily job: overdue invoices get a polite email a few days late, then weekly, three at most.
 * Returns how many were sent. It sends nothing when email isn't set up.
 */
export async function sendDueInvoiceReminders(): Promise<number> {
  const today = manilaDate(new Date());
  const rows = await prisma.invoice.findMany({
    where: {
      status: "issued",
      clientEmail: { not: null },
      dueDate: { lt: new Date(`${today}T00:00:00Z`) },
    },
    take: 200,
  });
  const stand = await standings(rows.map((row) => row.id));
  let sent = 0;
  for (const row of rows) {
    const standing = stand.get(row.id)!;
    const full = {
      totalMinor: Number(row.totalMinor),
      ...standing,
      status: row.status as InvoiceStatus,
      dueDate: row.dueDate?.toISOString().slice(0, 10) ?? null,
    };
    if (balanceOf(full) <= 0) continue;
    const due = reminderDue({
      state: stateOf(full, today),
      dueDate: full.dueDate,
      today,
      reminderCount: row.reminderCount,
      lastReminderOn: row.lastReminderAt ? manilaDate(row.lastReminderAt) : null,
      hasEmail: Boolean(row.clientEmail),
    });
    if (!due) continue;
    const invoice = await getInvoice(row.id, today);
    if (!invoice?.clientEmail) continue;
    const result = await sendInvoiceEmail({
      to: invoice.clientEmail,
      invoice,
      senderName: "Cafton",
      reminder: true,
    });
    if (!result.ok) continue;
    await prisma.invoice.update({
      where: { id: row.id },
      data: { reminderCount: { increment: 1 }, lastReminderAt: new Date() },
    });
    sent += 1;
  }
  return sent;
}
