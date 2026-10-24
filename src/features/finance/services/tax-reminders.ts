import "server-only";

import { notify, staffIdsWith } from "@/features/notifications/services/notify";
import { manilaDate } from "@/features/schedule/rules/slots";
import { prisma } from "@/lib/db";
import { isDatabaseConfigured } from "@/lib/env";
import { formatDate } from "@/lib/format";
import { getTracker, isLiveYear } from "../repository/tax";

/**
 * The daily job: tells the people who record filings when a return is due within two weeks, and
 * again each week it stays late. Each reminder is claimed first (a unique key), so two overlapping
 * runs never send it twice. Returns how many were sent.
 */
export async function notifyTaxDeadlines(today = manilaDate(new Date())): Promise<number> {
  if (!isDatabaseConfigured) return 0;
  const year = Number(today.slice(0, 4));
  let sent = 0;
  for (const taxYear of [year - 1, year]) {
    const tracker = await getTracker(taxYear, today);
    if (!isLiveYear(tracker)) continue;
    for (const item of tracker.obligations) {
      if (item.status !== "due_soon" && item.status !== "overdue") continue;
      const { obligation } = item;
      const forKey =
        item.status === "overdue" ? `overdue-${Math.floor(-item.daysToDue / 7)}` : "due_soon";
      const claimed = await prisma.reminderLog.createMany({
        data: [{ kind: "tax_due", refId: `${taxYear}-${obligation.kind}`, forKey }],
        skipDuplicates: true,
      });
      if (claimed.count !== 1) continue;
      await notify(await staffIdsWith("finance:post"), {
        kind: "tax.due",
        title:
          item.status === "overdue"
            ? `Overdue: the ${obligation.form} for ${obligation.label.toLowerCase()} ${taxYear}`
            : `Due soon: the ${obligation.form} for ${obligation.label.toLowerCase()} ${taxYear}`,
        body: `Due ${formatDate(obligation.dueDate)}. The tracker has the estimate.`,
        href: "/dashboard/finance/taxes",
      });
      sent += 1;
    }
  }
  return sent;
}
