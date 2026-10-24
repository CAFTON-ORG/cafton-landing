import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { scoreUnscoredLeads } from "@/features/crm/services/scoring-jobs";
import { runReminders } from "@/features/schedule/services/reminders";
import { expireDueQuotes } from "@/features/sales/services/quotes";
import { notifyTaxDeadlines } from "@/features/finance/services/tax-reminders";
import { generateDueRecurring } from "@/features/finance/services/recurring";
import { sendDueInvoiceReminders } from "@/features/finance/services/reminders";
import { expireDueContracts } from "@/features/contracts/services/contracts";
import { env, isDatabaseConfigured } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(request: Request) {
  const secret = env.CRON_SECRET;
  if (!secret) return null;
  const header = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  return (
    header.length === expected.length && timingSafeEqual(Buffer.from(header), Buffer.from(expected))
  );
}

/**
 * Sends the day-before meeting reminders, raises due tasks, and expires quotes past their date. Called once a day by the scheduler (see vercel.json),
 * which sends `Authorization: Bearer $CRON_SECRET`. Without CRON_SECRET the route refuses to run,
 * so a stranger can never trigger it.
 */
export async function GET(request: Request) {
  const ok = authorized(request);
  if (ok === null) return NextResponse.json({ error: "CRON_SECRET isn't set." }, { status: 503 });
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isDatabaseConfigured)
    return NextResponse.json({ error: "Database isn't configured." }, { status: 503 });
  return NextResponse.json({
    ok: true,
    ...(await runReminders()),
    // Sent quotes whose date has passed become "expired" and their makers are told.
    quotesExpired: await expireDueQuotes(),
    // The same for contracts that were not signed in time.
    contractsExpired: await expireDueContracts(),
    // Leads that have no score yet get one (new enquiries are scored as they arrive).
    leadsScored: await scoreUnscoredLeads(),
    // Overdue invoices get a polite reminder (a few days late, then weekly, three at most).
    invoiceRemindersSent: await sendDueInvoiceReminders(),
    // Recurring bills and expenses that fell due become drafts for a person to approve.
    recurring: await generateDueRecurring(),
    // Income tax returns due within two weeks, or late, are flagged to whoever records filings.
    taxReminders: await notifyTaxDeadlines(),
  });
}
