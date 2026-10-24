import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { ActionError, actorId } from "@/lib/actions";
import { recordAudit } from "@/lib/audit";
import { manilaDate } from "@/features/schedule/rules/slots";
import {
  checkEntry,
  checkReverse,
  entryTotals,
  monthRange,
  periodOf,
  reversalLines,
  type EntryLine,
} from "../rules/core";

type Tx = Prisma.TransactionClient;

/** Who is posting: a signed-in person, or the system (a payment arriving, a job running). */
export interface Poster {
  id: string;
  name: string;
}
export const SYSTEM: Poster = { id: "system", name: "System" };

export type SourceKind =
  | "manual"
  | "invoice"
  | "credit_note"
  | "payment"
  | "bill"
  | "expense"
  | "bank"
  | "reversal"
  | "opening"
  | "tax";

export interface PostInput {
  date: string;
  memo: string;
  sourceKind: SourceKind;
  sourceId?: string;
  reversesId?: string;
  lines: EntryLine[];
}

/** Makes sure every month of a year has its period row (open until someone closes it). */
export async function ensureFiscalYear(tx: Tx, year: number) {
  const existing = await tx.fiscalPeriod.count({ where: { year } });
  if (existing === 12) return;
  // One statement, not twelve: over a remote pooler each round trip counts against the transaction.
  await tx.fiscalPeriod.createMany({
    data: Array.from({ length: 12 }, (_, index) => {
      const month = index + 1;
      const { startsOn, endsOn } = monthRange(year, month);
      return {
        year,
        month,
        startsOn: new Date(`${startsOn}T00:00:00Z`),
        endsOn: new Date(`${endsOn}T00:00:00Z`),
      };
    }),
    skipDuplicates: true,
  });
}

/** The account that plays a role ("ar", "cash", "revenue_services"...), as a line's account id. */
export async function accountForRole(tx: Tx, systemKey: string): Promise<string> {
  const account = await tx.account.findUnique({
    where: { systemKey },
    select: { id: true, active: true },
  });
  if (!account || !account.active) {
    throw new ActionError(
      `The books have no active account for "${systemKey}". Add or restore it in the chart of accounts.`,
      "rule",
    );
  }
  return account.id;
}

/**
 * Posts one balanced entry, inside the caller's transaction. Every posting in the system goes
 * through here, so the same checks apply to a person's journal entry and to an invoice: the lines
 * balance, the accounts are in use, the date is sensible, and the month is open. The database
 * refuses the same things again as the last line of defence.
 */
export async function postJournal(
  tx: Tx,
  poster: Poster,
  input: PostInput,
): Promise<{ id: string; number: string }> {
  const accounts = await tx.account.findMany({
    where: { id: { in: [...new Set(input.lines.map((line) => line.accountId))] }, active: true },
    select: { id: true },
  });
  const invalid = checkEntry({
    date: input.date,
    memo: input.memo,
    lines: input.lines,
    today: manilaDate(new Date()),
    usableAccountIds: new Set(accounts.map((account) => account.id)),
  });
  if (invalid) {
    const first =
      invalid.form ?? invalid.memo ?? invalid.date ?? Object.values(invalid.lines ?? {})[0];
    throw new ActionError(first ?? "That entry can't be posted.", "validation", {
      ...(invalid.memo ? { memo: invalid.memo } : {}),
      ...(invalid.date ? { date: invalid.date } : {}),
      ...(invalid.form ? { form: invalid.form } : {}),
      ...Object.fromEntries(
        Object.entries(invalid.lines ?? {}).map(([index, message]) => [`line${index}`, message]),
      ),
    });
  }

  const { year, month } = periodOf(input.date);
  await ensureFiscalYear(tx, year);
  const period = await tx.fiscalPeriod.findUnique({ where: { year_month: { year, month } } });
  if (period?.status === "closed") {
    throw new ActionError(
      `${input.date.slice(0, 7)} is closed. Reopen the month, or date the entry in an open one.`,
      "rule",
      { date: "That month is closed." },
    );
  }

  const entry = await tx.journalEntry.create({
    data: {
      entryDate: new Date(`${input.date}T00:00:00Z`),
      memo: input.memo.trim(),
      sourceKind: input.sourceKind,
      sourceId: input.sourceId,
      reversesId: input.reversesId,
      createdBy: actorId(poster),
      createdByName: poster.name,
      lines: {
        create: input.lines.map((line, position) => ({
          accountId: line.accountId,
          position,
          debitMinor: line.debitMinor,
          creditMinor: line.creditMinor,
          memo: line.memo?.trim() || null,
        })),
      },
    },
    select: { id: true, number: true },
  });
  await recordAudit(
    poster,
    {
      action: input.sourceKind === "reversal" ? "journal.reverse" : "journal.post",
      entity: "journal_entry",
      entityId: entry.id,
      summary: `Posted ${entry.number}: ${input.memo.trim().slice(0, 120)} (₱${(entryTotals(input.lines).debitMinor / 100).toFixed(2)})`,
    },
    tx,
  );
  return entry;
}

/**
 * Undoes a posted entry with a new one that swaps its sides, dated as given (today by default), and
 * links the two. The original stays exactly as it was; the books show both.
 */
export async function reverseJournal(
  tx: Tx,
  poster: Poster,
  entryId: string,
  options: { date?: string; reason: string },
): Promise<{ id: string; number: string }> {
  const original = await tx.journalEntry.findUnique({
    where: { id: entryId },
    include: { lines: { orderBy: { position: "asc" } }, reversedBy: { select: { id: true } } },
  });
  if (!original) throw new ActionError("That entry no longer exists.");
  const blocked = checkReverse({
    alreadyReversed: !!original.reversedBy,
    isReversal: original.reversesId !== null,
    reason: options.reason,
  });
  if (blocked) throw new ActionError(blocked, "rule");

  return postJournal(tx, poster, {
    date: options.date ?? manilaDate(new Date()),
    memo: `Reverses ${original.number}: ${options.reason.trim()}`,
    sourceKind: "reversal",
    sourceId: original.sourceId ?? undefined,
    reversesId: original.id,
    lines: reversalLines(
      original.lines.map((line) => ({
        accountId: line.accountId,
        debitMinor: Number(line.debitMinor),
        creditMinor: Number(line.creditMinor),
        memo: line.memo ?? undefined,
      })),
    ),
  });
}
