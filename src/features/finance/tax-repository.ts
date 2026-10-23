import "server-only";

import { manilaDate } from "@/features/schedule/slots";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { isDatabaseConfigured } from "@/lib/env";
import {
  ANNUAL_ALLOWANCE_MINOR,
  daysUntil,
  estimateTax,
  filingStatus,
  measuredUpTo,
  obligationsFor,
  type Estimate,
  type FilingStatus,
  type Obligation,
} from "./tax";

const day = (date: Date | null | undefined) => (date ? date.toISOString().slice(0, 10) : undefined);
const num = (value: bigint | null | undefined) => Number(value ?? 0);
const at = (iso: string) => new Date(`${iso}T00:00:00Z`);

export interface FilingView {
  id: string;
  filedOn: string;
  reference?: string;
  grossReceiptsMinor: number;
  estimateMinor: number;
  cashPaidMinor: number;
  cwtAppliedMinor: number;
  notes?: string;
  journalEntryId?: string;
  filedByName: string;
}

export interface ObligationView {
  obligation: Obligation;
  status: FilingStatus;
  /** Days until it is due (negative once late). */
  daysToDue: number;
  /** Gross receipts counted, up to the end of the period or today. */
  grossMinor: number;
  measuredUpTo: string;
  /** Present until it is filed. */
  estimate?: Estimate;
  cwtAvailableMinor: number;
  filing?: FilingView;
}

export interface Tracker {
  year: number;
  today: string;
  /** Gross receipts so far this year (up to today, or the year's end for a past year). */
  grossToDateMinor: number;
  allowanceMinor: number;
  /** Tax recorded as settled so far this year (cash and withheld tax). */
  settledMinor: number;
  obligations: ObligationView[];
}

/** Gross receipts: what the books recognised as income (revenue accounts), from 1 January up to a day. */
/** A database client, or the transaction a caller is in (so it never waits on a second connection). */
type Client = Pick<Prisma.TransactionClient, "journalLine" | "taxFiling">;

export async function grossReceipts(
  year: number,
  upTo: string,
  db: Client = prisma,
): Promise<number> {
  const sum = await db.journalLine.aggregate({
    where: {
      account: { type: "revenue" },
      entry: { entryDate: { gte: at(`${year}-01-01`), lte: at(upTo) } },
    },
    _sum: { debitMinor: true, creditMinor: true },
  });
  return num(sum._sum.creditMinor) - num(sum._sum.debitMinor);
}

/**
 * Tax clients withheld that is still there to claim on a return covering up to a day: what was
 * withheld by then (debits to the creditable withholding tax account), less what recorded filings
 * have already used, whatever date those filings were made on. (Counting the account's own credits
 * by date would miss a filing made after the period it covers, which is how every filing is made.)
 */
export async function cwtAvailable(upTo: string, db: Client = prisma): Promise<number> {
  const [withheld, used] = await Promise.all([
    db.journalLine.aggregate({
      where: {
        account: { systemKey: "cwt_receivable" },
        entry: { entryDate: { lte: at(upTo) } },
      },
      _sum: { debitMinor: true },
    }),
    db.taxFiling.aggregate({ where: { status: "filed" }, _sum: { cwtAppliedMinor: true } }),
  ]);
  return Math.max(0, num(withheld._sum.debitMinor) - num(used._sum.cwtAppliedMinor));
}

/** What the filings of a year that are still live have settled, in order. */
export async function liveFilings(year: number) {
  return prisma.taxFiling.findMany({ where: { taxYear: year, status: "filed" } });
}

export async function getTracker(
  year: number,
  today = manilaDate(new Date()),
): Promise<Tracker | null> {
  if (!isDatabaseConfigured) return null;
  const filings = await liveFilings(year);
  const all = obligationsFor(year);
  const obligations: ObligationView[] = [];
  let settledBefore = 0;

  for (const obligation of all) {
    const filed = filings.find((f) => f.kind === obligation.kind);
    const upTo = measuredUpTo(obligation, today);
    const [gross, cwt] = await Promise.all([grossReceipts(year, upTo), cwtAvailable(upTo)]);
    const status = filingStatus(obligation, Boolean(filed), today);
    obligations.push({
      obligation,
      status,
      daysToDue: daysUntil(obligation.dueDate, today),
      grossMinor: filed ? num(filed.grossReceiptsMinor) : gross,
      measuredUpTo: upTo,
      cwtAvailableMinor: cwt,
      estimate: filed
        ? undefined
        : estimateTax({
            grossToDateMinor: gross,
            settledBeforeMinor: settledBefore,
            cwtAvailableMinor: cwt,
          }),
      filing: filed
        ? {
            id: filed.id,
            filedOn: day(filed.filedOn) as string,
            reference: filed.reference ?? undefined,
            grossReceiptsMinor: num(filed.grossReceiptsMinor),
            estimateMinor: num(filed.estimateMinor),
            cashPaidMinor: num(filed.cashPaidMinor),
            cwtAppliedMinor: num(filed.cwtAppliedMinor),
            notes: filed.notes ?? undefined,
            journalEntryId: filed.journalEntryId ?? undefined,
            filedByName: filed.filedByName,
          }
        : undefined,
    });
    if (filed) settledBefore += num(filed.cashPaidMinor) + num(filed.cwtAppliedMinor);
  }

  const end = `${year}-12-31`;
  return {
    year,
    today,
    grossToDateMinor: await grossReceipts(year, today < end ? today : end),
    allowanceMinor: ANNUAL_ALLOWANCE_MINOR,
    settledMinor: settledBefore,
    obligations,
  };
}

/**
 * Whether a tax year is one the business actually traded in: it had receipts, or a return was
 * recorded. A year with neither (the year before the books were started, say) is not chased for
 * returns that were never the books' to file.
 */
export const isLiveYear = (tracker: Tracker | null): tracker is Tracker =>
  tracker !== null &&
  (tracker.grossToDateMinor > 0 || tracker.obligations.some((item) => item.filing !== undefined));
