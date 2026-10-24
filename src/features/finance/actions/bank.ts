"use server";

import { createHash } from "node:crypto";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { guard } from "@/features/crm/actions/guard";
import { manilaDate } from "@/features/schedule/rules/slots";
import { ActionError, actorId, parse, runAction, type ActionResult } from "@/lib/actions";
import { recordAudit } from "@/lib/audit";
import { parseCsv } from "@/lib/csv";
import { prisma } from "@/lib/db";
import { parseMinor } from "@/lib/money";
import {
  autoMatch,
  checkSignOff,
  fingerprintKeys,
  mapStatement,
  suggestMatches,
  type LedgerCandidate,
} from "../rules/bank";
import {
  bankAccountSchema,
  bookSchema,
  ignoreSchema,
  importSchema,
  matchSchema,
  signOffSchema,
  type BankAccountInput,
  type BookInput,
  type ImportInput,
  type SignOffInput,
} from "../schemas/bank";
import type { ImportReport } from "../types/bank";
import { isLocked, ledgerCandidates } from "../repository/bank";
import { postJournal } from "../services/ledger";

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

function refresh(id?: string) {
  revalidatePath("/dashboard/finance/bank");
  revalidatePath("/dashboard/finance/journal");
  revalidatePath("/dashboard/audit");
  revalidatePath("/dashboard/finance/bank/[id]", "page");
  if (id) revalidatePath(`/dashboard/finance/bank/${id}`);
}

const today = () => manilaDate(new Date());
const date = (value: string) => new Date(`${value}T00:00:00Z`);
const iso = (value: Date) => value.toISOString().slice(0, 10);
const hash = (text: string) => createHash("sha256").update(text).digest("hex");

/* ----------------------------------------------------------------- accounts */

export async function saveBankAccount(
  input: BankAccountInput,
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const actor = await guard("bank:manage");
    const data = parse(bankAccountSchema, input);
    if (!data.name) {
      const message = "Give the account a name, like BPI Checking.";
      throw new ActionError(message, "validation", { name: message });
    }
    const id = await prisma.$transaction(async (tx) => {
      const account = await tx.account.findUnique({ where: { id: data.accountId } });
      if (!account || !account.active || account.type !== "asset") {
        const message = "Choose an asset account from the chart: cash, bank or an e-wallet.";
        throw new ActionError(message, "validation", { accountId: message });
      }
      const taken = await tx.bankAccount.findFirst({
        where: { accountId: account.id, ...(data.id ? { id: { not: data.id } } : {}) },
      });
      if (taken) {
        const message = `That account is already used by ${taken.name}.`;
        throw new ActionError(message, "validation", { accountId: message });
      }
      const fields = { name: data.name, accountId: account.id, numberHint: data.numberHint };
      if (data.id) {
        const found = await tx.bankAccount.findUnique({ where: { id: data.id } });
        if (!found) throw new ActionError("That bank account no longer exists.");
        if (
          found.accountId !== account.id &&
          (await tx.bankLine.count({ where: { bankAccountId: found.id } })) > 0
        ) {
          const message =
            "Statement lines were already imported against the old account, so it can't change.";
          throw new ActionError(message, "rule", { accountId: message });
        }
        await tx.bankAccount.update({ where: { id: data.id }, data: fields });
        await recordAudit(
          actor,
          {
            action: "bank.update",
            entity: "bank_account",
            entityId: data.id,
            summary: `Edited the bank account ${data.name}`,
          },
          tx,
        );
        return data.id;
      }
      const created = await tx.bankAccount.create({
        data: { ...fields, createdBy: actorId(actor) },
      });
      await recordAudit(
        actor,
        {
          action: "bank.create",
          entity: "bank_account",
          entityId: created.id,
          summary: `Added the bank account ${data.name}`,
        },
        tx,
      );
      return created.id;
    });
    refresh();
    return { id };
  });
}

export async function setBankAccountActive(input: {
  id: string;
  active: boolean;
}): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await guard("bank:manage");
    const data = parse(z.object({ id: z.string().uuid(), active: z.boolean() }), input);
    await prisma.$transaction(async (tx) => {
      const found = await tx.bankAccount.findUnique({ where: { id: data.id } });
      if (!found) throw new ActionError("That bank account no longer exists.");
      await tx.bankAccount.update({ where: { id: data.id }, data: { active: data.active } });
      await recordAudit(
        actor,
        {
          action: data.active ? "bank.restore" : "bank.archive",
          entity: "bank_account",
          entityId: data.id,
          summary: `${data.active ? "Restored" : "Archived"} the bank account ${found.name}`,
        },
        tx,
      );
    });
    refresh();
  });
}

/* ------------------------------------------------------------------- import */

/** Reads a statement CSV; with `dryRun` it only says what would happen. */
export async function importStatement(input: ImportInput): Promise<ActionResult<ImportReport>> {
  return runAction(async () => {
    const actor = await guard("bank:manage");
    const data = parse(importSchema, input);
    const account = await prisma.bankAccount.findUnique({ where: { id: data.bankAccountId } });
    if (!account) throw new ActionError("That bank account no longer exists.");
    if (!account.active)
      throw new ActionError("That bank account is archived. Restore it to import into it.", "rule");

    const mapped = mapStatement(parseCsv(data.csv), data.dateFormat);
    if (mapped.fatal) throw new ActionError(mapped.fatal);

    const keys = fingerprintKeys(mapped.rows).map(hash);
    const [existing, periods] = await Promise.all([
      prisma.bankLine.findMany({
        where: { bankAccountId: account.id, fingerprint: { in: keys } },
        select: { fingerprint: true },
      }),
      prisma.bankReconciliation.findMany({
        where: { bankAccountId: account.id },
        select: { periodStart: true, periodEnd: true },
      }),
    ]);
    const have = new Set(existing.map((row) => row.fingerprint));
    const signed = periods.map((period) => ({
      start: iso(period.periodStart),
      end: iso(period.periodEnd),
    }));

    const fresh: { row: (typeof mapped.rows)[number]; fingerprint: string }[] = [];
    let alreadyHere = 0;
    let locked = 0;
    mapped.rows.forEach((row, index) => {
      if (have.has(keys[index])) alreadyHere += 1;
      else if (isLocked(row.date, signed)) locked += 1;
      else fresh.push({ row, fingerprint: keys[index] });
    });

    const dates = mapped.rows.map((row) => row.date).sort();
    const report: ImportReport = {
      preview: data.dryRun,
      total: mapped.rows.length + mapped.problems.length,
      created: fresh.length,
      existing: alreadyHere,
      locked,
      problems: mapped.problems.slice(0, 50),
      understood: mapped.understood,
      firstDate: dates[0],
      lastDate: dates.at(-1),
      sample: mapped.rows.slice(0, 3).map(({ date: when, description, amountMinor }) => ({
        date: when,
        description,
        amountMinor,
      })),
    };
    if (data.dryRun || fresh.length === 0) return report;

    await prisma.$transaction(async (tx) => {
      const batch = await tx.bankImport.create({
        data: {
          bankAccountId: account.id,
          fileName: data.fileName,
          rowsInFile: mapped.rows.length,
          rowsNew: fresh.length,
          importedBy: actorId(actor),
          importedByName: actor.name,
        },
      });
      await tx.bankLine.createMany({
        data: fresh.map(({ row, fingerprint }) => ({
          bankAccountId: account.id,
          importId: batch.id,
          lineDate: date(row.date),
          description: row.description,
          reference: row.reference ?? null,
          amountMinor: row.amountMinor,
          balanceMinor: row.balanceMinor ?? null,
          fingerprint,
        })),
        skipDuplicates: true,
      });
      await recordAudit(
        actor,
        {
          action: "bank.import",
          entity: "bank_account",
          entityId: account.id,
          summary: `Imported ${fresh.length} statement ${fresh.length === 1 ? "line" : "lines"} into ${account.name}`,
        },
        tx,
      );
    });
    refresh(account.id);
    return report;
  });
}

/* ------------------------------------------------------------- reconciling */

async function loadOpenLine(tx: Tx, lineId: string) {
  const line = await tx.bankLine.findUnique({
    where: { id: lineId },
    include: { bankAccount: true },
  });
  if (!line) throw new ActionError("That statement line no longer exists.");
  const periods = await tx.bankReconciliation.findMany({
    where: { bankAccountId: line.bankAccountId },
    select: { periodStart: true, periodEnd: true },
  });
  if (
    isLocked(
      iso(line.lineDate),
      periods.map((p) => ({ start: iso(p.periodStart), end: iso(p.periodEnd) })),
    )
  ) {
    throw new ActionError("That period has been signed off, so its lines can't change.", "rule");
  }
  return line;
}

/** Ledger postings a line could be, nearest in time first (wider than the automatic match). */
export async function suggestForLine(lineId: string): Promise<ActionResult<LedgerCandidate[]>> {
  return runAction(async () => {
    await guard("bank:reconcile");
    const line = await prisma.bankLine.findUnique({
      where: { id: parse(z.string().uuid(), lineId) },
    });
    if (!line) throw new ActionError("That statement line no longer exists.");
    const candidates = await ledgerCandidates(line.bankAccountId);
    return suggestMatches(
      {
        id: line.id,
        date: iso(line.lineDate),
        amountMinor: Number(line.amountMinor),
        description: line.description,
        reference: line.reference ?? undefined,
      },
      candidates,
      31,
    );
  });
}

async function applyMatch(
  tx: Tx,
  actor: Awaited<ReturnType<typeof guard>>,
  lineId: string,
  ledgerLineId: string,
) {
  const line = await loadOpenLine(tx, lineId);
  if (line.status === "matched") throw new ActionError("That line is already matched.", "rule");
  const posting = await tx.journalLine.findUnique({
    where: { id: ledgerLineId },
    include: { entry: { select: { number: true } } },
  });
  if (!posting || posting.accountId !== line.bankAccount.accountId) {
    throw new ActionError("That posting isn't on this bank account.", "rule");
  }
  const signed = Number(posting.debitMinor) - Number(posting.creditMinor);
  if (signed !== Number(line.amountMinor)) {
    throw new ActionError(
      "That posting isn't the same amount and direction as the statement line.",
      "rule",
    );
  }
  if (
    await tx.bankLine.findFirst({ where: { journalLineId: ledgerLineId }, select: { id: true } })
  ) {
    throw new ActionError("That posting is already matched to another statement line.", "rule");
  }
  await tx.bankLine.update({
    where: { id: line.id },
    data: {
      status: "matched",
      journalLineId: ledgerLineId,
      decidedBy: actorId(actor),
      decidedAt: new Date(),
      note: null,
    },
  });
  return { line, entryNumber: posting.entry.number };
}

export async function matchLine(input: {
  lineId: string;
  ledgerLineId: string;
}): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await guard("bank:reconcile");
    const data = parse(matchSchema, input);
    let bankAccountId = "";
    await prisma.$transaction(async (tx) => {
      const done = await applyMatch(tx, actor, data.lineId, data.ledgerLineId);
      bankAccountId = done.line.bankAccountId;
      await recordAudit(
        actor,
        {
          action: "bank.match",
          entity: "bank_account",
          entityId: bankAccountId,
          summary: `Matched a statement line to ${done.entryNumber}`,
        },
        tx,
      );
    });
    refresh(bankAccountId);
  });
}

/** Matches every line that has exactly one possible posting, and that posting no other line. */
export async function autoMatchLines(
  bankAccountId: string,
): Promise<ActionResult<{ matched: number }>> {
  return runAction(async () => {
    const actor = await guard("bank:reconcile");
    const id = parse(z.string().uuid(), bankAccountId);
    const [lines, candidates, periods] = await Promise.all([
      prisma.bankLine.findMany({
        where: { bankAccountId: id, status: "unmatched" },
        take: 500,
        orderBy: { lineDate: "asc" },
      }),
      ledgerCandidates(id),
      prisma.bankReconciliation.findMany({
        where: { bankAccountId: id },
        select: { periodStart: true, periodEnd: true },
      }),
    ]);
    const signed = periods.map((p) => ({ start: iso(p.periodStart), end: iso(p.periodEnd) }));
    const open = lines.filter((line) => !isLocked(iso(line.lineDate), signed));
    const pairs = autoMatch(
      open.map((line) => ({
        id: line.id,
        date: iso(line.lineDate),
        amountMinor: Number(line.amountMinor),
        description: line.description,
        reference: line.reference ?? undefined,
      })),
      candidates,
    );
    let matched = 0;
    await prisma.$transaction(async (tx) => {
      for (const pair of pairs) {
        try {
          await applyMatch(tx, actor, pair.lineId, pair.ledgerLineId);
          matched += 1;
        } catch (error) {
          if (!(error instanceof ActionError)) throw error; // an odd one is skipped, never forced
        }
      }
      await recordAudit(
        actor,
        {
          action: "bank.automatch",
          entity: "bank_account",
          entityId: id,
          summary: `Matched ${matched} statement ${matched === 1 ? "line" : "lines"} automatically`,
        },
        tx,
      );
    });
    refresh(id);
    return { matched };
  });
}

export async function unmatchLine(lineId: string): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await guard("bank:reconcile");
    let bankAccountId = "";
    await prisma.$transaction(async (tx) => {
      const line = await loadOpenLine(tx, parse(z.string().uuid(), lineId));
      bankAccountId = line.bankAccountId;
      if (line.status === "unmatched") return;
      await tx.bankLine.update({
        where: { id: line.id },
        data: {
          status: "unmatched",
          journalLineId: null,
          decidedBy: null,
          decidedAt: null,
          note: null,
        },
      });
      await recordAudit(
        actor,
        {
          action: "bank.unmatch",
          entity: "bank_account",
          entityId: bankAccountId,
          summary: "Put a statement line back to unmatched",
        },
        tx,
      );
    });
    refresh(bankAccountId);
  });
}

/**
 * Books a statement line the books don't have yet (a bank charge, interest, a deposit): posts an
 * entry between the bank account and the account chosen, and puts the line against it.
 */
export async function bookLine(input: BookInput): Promise<ActionResult<{ entryNumber: string }>> {
  return runAction(async () => {
    const actor = await guard("bank:reconcile");
    const data = parse(bookSchema, input);
    let bankAccountId = "";
    const entryNumber = await prisma.$transaction(async (tx) => {
      const line = await loadOpenLine(tx, data.lineId);
      bankAccountId = line.bankAccountId;
      if (line.status !== "unmatched")
        throw new ActionError("That line has already been dealt with.", "rule");
      const counter = await tx.account.findUnique({ where: { id: data.counterAccountId } });
      if (!counter || !counter.active) {
        throw new ActionError("Choose an account that is switched on.", "validation");
      }
      if (counter.id === line.bankAccount.accountId) {
        throw new ActionError(
          "Choose the other side of it, not the bank account itself.",
          "validation",
        );
      }
      const amount = Number(line.amountMinor);
      const posted = await postJournal(tx, actor, {
        date: iso(line.lineDate),
        memo: data.memo ?? `${line.description}${line.reference ? ` (${line.reference})` : ""}`,
        sourceKind: "bank",
        sourceId: line.id,
        lines:
          amount > 0
            ? [
                { accountId: line.bankAccount.accountId, debitMinor: amount, creditMinor: 0 },
                { accountId: counter.id, debitMinor: 0, creditMinor: amount },
              ]
            : [
                { accountId: counter.id, debitMinor: -amount, creditMinor: 0 },
                { accountId: line.bankAccount.accountId, debitMinor: 0, creditMinor: -amount },
              ],
      });
      const bankSide = await tx.journalLine.findFirstOrThrow({
        where: { entryId: posted.id, accountId: line.bankAccount.accountId },
      });
      await tx.bankLine.update({
        where: { id: line.id },
        data: {
          status: "matched",
          journalLineId: bankSide.id,
          decidedBy: actorId(actor),
          decidedAt: new Date(),
        },
      });
      await recordAudit(
        actor,
        {
          action: "bank.book",
          entity: "bank_account",
          entityId: bankAccountId,
          summary: `Booked a statement line as ${posted.number}`,
        },
        tx,
      );
      return posted.number;
    });
    refresh(bankAccountId);
    return { entryNumber };
  });
}

export async function ignoreLine(input: { lineId: string; note: string }): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await guard("bank:reconcile");
    const data = parse(ignoreSchema, input);
    if (!data.note) {
      const message = "Say why it is being set aside.";
      throw new ActionError(message, "validation", { note: message });
    }
    let bankAccountId = "";
    await prisma.$transaction(async (tx) => {
      const line = await loadOpenLine(tx, data.lineId);
      bankAccountId = line.bankAccountId;
      if (line.status !== "unmatched")
        throw new ActionError("That line has already been dealt with.", "rule");
      await tx.bankLine.update({
        where: { id: line.id },
        data: {
          status: "ignored",
          note: data.note,
          decidedBy: actorId(actor),
          decidedAt: new Date(),
        },
      });
      await recordAudit(
        actor,
        {
          action: "bank.ignore",
          entity: "bank_account",
          entityId: bankAccountId,
          summary: `Set a statement line aside: ${data.note}`,
        },
        tx,
      );
    });
    refresh(bankAccountId);
  });
}

/* ----------------------------------------------------------------- sign-off */

/**
 * Signs off a statement period: its own opening and closing balances agree with its lines, and
 * every line in it is matched, booked or set aside. A signed-off period can't change.
 */
export async function signOffPeriod(input: SignOffInput): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await guard("bank:reconcile");
    const data = parse(signOffSchema, input);
    const opening = data.opening.trim() ? parseMinor(data.opening) : null;
    const closing = data.closing.trim() ? parseMinor(data.closing) : null;
    await prisma.$transaction(async (tx) => {
      const account = await tx.bankAccount.findUnique({ where: { id: data.bankAccountId } });
      if (!account) throw new ActionError("That bank account no longer exists.");
      const inPeriod = await tx.bankLine.findMany({
        where: {
          bankAccountId: account.id,
          lineDate: { gte: date(data.periodStart), lte: date(data.periodEnd) },
        },
        select: { amountMinor: true, status: true },
      });
      const overlaps = await tx.bankReconciliation.count({
        where: {
          bankAccountId: account.id,
          periodStart: { lte: date(data.periodEnd) },
          periodEnd: { gte: date(data.periodStart) },
        },
      });
      const blocked = checkSignOff({
        periodStart: data.periodStart,
        periodEnd: data.periodEnd,
        today: today(),
        openingMinor: opening,
        closingMinor: closing,
        amounts: inPeriod.map((line) => Number(line.amountMinor)),
        unresolved: inPeriod.filter((line) => line.status === "unmatched").length,
        overlapsSignedOff: overlaps > 0,
      });
      if (blocked) throw new ActionError(blocked, "rule", { form: blocked });
      await tx.bankReconciliation.create({
        data: {
          bankAccountId: account.id,
          periodStart: date(data.periodStart),
          periodEnd: date(data.periodEnd),
          openingMinor: opening as number,
          closingMinor: closing as number,
          lineCount: inPeriod.length,
          signedBy: actorId(actor),
          signedByName: actor.name,
        },
      });
      await recordAudit(
        actor,
        {
          action: "bank.signoff",
          entity: "bank_account",
          entityId: account.id,
          summary: `Signed off ${account.name} from ${data.periodStart} to ${data.periodEnd}`,
        },
        tx,
      );
    });
    refresh(data.bankAccountId);
  });
}
