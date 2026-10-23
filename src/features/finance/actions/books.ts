"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { guard } from "@/features/crm/actions/guard";
import { manilaDate } from "@/features/schedule/slots";
import { ActionError, actorId, parse, runAction, type ActionResult } from "@/lib/actions";
import { recordAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { parseMinor } from "@/lib/money";
import { ensureFiscalYear, postJournal, reverseJournal } from "../ledger";
import {
  MONTH_NAMES,
  checkAccount,
  checkAccountChange,
  checkClose,
  checkReopen,
  checkTaxRate,
  codeFitsType,
  parseRate,
  type PeriodStatus,
} from "../rules";
import {
  accountSchema,
  entrySchema,
  periodSchema,
  reverseSchema,
  taxRateSchema,
  type AccountInput,
  type EntryInput,
  type TaxRateInput,
} from "../schemas";

function refresh() {
  for (const path of [
    "/dashboard/finance",
    "/dashboard/finance/accounts",
    "/dashboard/finance/journal",
    "/dashboard/finance/periods",
    "/dashboard/finance/tax",
    "/dashboard/audit",
  ]) {
    revalidatePath(path);
  }
  revalidatePath("/dashboard/finance/journal/[id]", "page");
}

/* ----------------------------------------------------------------- accounts */

export async function saveAccount(input: AccountInput): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const actor = await guard("finance:manage");
    const data = parse(accountSchema, input);
    const invalid = checkAccount({ code: data.code, name: data.name });
    if (invalid.code || invalid.name)
      throw new ActionError("Check the marked fields.", "validation", invalid);
    if (!codeFitsType(data.code, data.type)) {
      const message = `A ${data.type} account's code starts with ${
        { asset: "1", liability: "2", equity: "3", revenue: "4", expense: "5 to 9" }[data.type]
      }.`;
      throw new ActionError(message, "validation", { code: message });
    }

    const id = await prisma.$transaction(async (tx) => {
      const clash = await tx.account.findFirst({
        where: { code: data.code, ...(data.id ? { id: { not: data.id } } : {}) },
        select: { id: true },
      });
      if (clash) {
        const message = "Another account already uses that code.";
        throw new ActionError(message, "validation", { code: message });
      }
      if (data.id) {
        const existing = await tx.account.findUnique({ where: { id: data.id } });
        if (!existing) throw new ActionError("That account no longer exists.");
        const blocked = checkAccountChange({
          systemKey: existing.systemKey,
          hasPostings: (await tx.journalLine.count({ where: { accountId: existing.id } })) > 0,
          typeChanged: existing.type !== data.type,
          archiving: false,
        });
        if (blocked) throw new ActionError(blocked, "rule", { type: blocked });
        await tx.account.update({
          where: { id: existing.id },
          data: {
            code: data.code,
            name: data.name,
            type: data.type,
            description: data.description,
          },
        });
        await recordAudit(
          actor,
          {
            action: "account.update",
            entity: "account",
            entityId: existing.id,
            summary: `Edited account ${data.code} ${data.name}`,
          },
          tx,
        );
        return existing.id;
      }
      const created = await tx.account.create({
        data: {
          code: data.code,
          name: data.name,
          type: data.type,
          description: data.description,
          createdBy: actorId(actor),
        },
      });
      await recordAudit(
        actor,
        {
          action: "account.create",
          entity: "account",
          entityId: created.id,
          summary: `Added account ${data.code} ${data.name}`,
        },
        tx,
      );
      return created.id;
    });
    refresh();
    return { id };
  });
}

/** Archiving hides an account from pickers and stops new postings; its history stays. */
export async function setAccountActive(id: string, active: boolean): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await guard("finance:manage");
    await prisma.$transaction(async (tx) => {
      const account = await tx.account.findUnique({ where: { id: parse(z.string().uuid(), id) } });
      if (!account) throw new ActionError("That account no longer exists.");
      const blocked = checkAccountChange({
        systemKey: account.systemKey,
        hasPostings: false,
        typeChanged: false,
        archiving: !active,
      });
      if (blocked) throw new ActionError(blocked, "rule");
      await tx.account.update({ where: { id }, data: { active } });
      await recordAudit(
        actor,
        {
          action: active ? "account.restore" : "account.archive",
          entity: "account",
          entityId: id,
          summary: `${active ? "Restored" : "Archived"} account ${account.code} ${account.name}`,
        },
        tx,
      );
    });
    refresh();
  });
}

/* ------------------------------------------------------------------ journal */

function pesos(text: string, field: string): number {
  if (!text.trim()) return 0;
  const minor = parseMinor(text);
  if (minor === null) {
    throw new ActionError("Enter an amount like 1250 or 1,250.50.", "validation", {
      [field]: "Enter an amount like 1250 or 1,250.50.",
    });
  }
  return minor;
}

/** A journal entry typed in by someone who keeps the books. */
export async function postManualEntry(
  input: EntryInput,
): Promise<ActionResult<{ id: string; number: string }>> {
  return runAction(async () => {
    const actor = await guard("finance:post");
    const data = parse(entrySchema, input);
    const lines = data.lines.map((line, index) => ({
      accountId: line.accountId,
      debitMinor: pesos(line.debit, `line${index}`),
      creditMinor: pesos(line.credit, `line${index}`),
      memo: line.memo,
    }));
    const posted = await prisma.$transaction((tx) =>
      postJournal(tx, actor, { date: data.date, memo: data.memo, sourceKind: "manual", lines }),
    );
    refresh();
    return posted;
  });
}

export async function reverseEntry(
  input: z.input<typeof reverseSchema>,
): Promise<ActionResult<{ id: string; number: string }>> {
  return runAction(async () => {
    const actor = await guard("finance:post");
    const data = parse(reverseSchema, input);
    const reversed = await prisma.$transaction((tx) =>
      reverseJournal(tx, actor, data.id, {
        date: data.date || manilaDate(new Date()),
        reason: data.reason,
      }),
    );
    refresh();
    return reversed;
  });
}

/* ------------------------------------------------------------------ periods */

async function statuses(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  year: number,
): Promise<PeriodStatus[]> {
  await ensureFiscalYear(tx, year);
  const rows = await tx.fiscalPeriod.findMany({ where: { year }, orderBy: { month: "asc" } });
  return rows.map((row) => row.status as PeriodStatus);
}

export async function closePeriod(input: { year: number; month: number }): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await guard("finance:close");
    const { year, month } = parse(periodSchema, input);
    await prisma.$transaction(async (tx) => {
      const blocked = checkClose(await statuses(tx, year), month);
      if (blocked) throw new ActionError(blocked, "rule");
      await tx.fiscalPeriod.update({
        where: { year_month: { year, month } },
        data: { status: "closed", closedAt: new Date(), closedBy: actorId(actor) },
      });
      await recordAudit(
        actor,
        {
          action: "period.close",
          entity: "fiscal_period",
          summary: `Closed ${MONTH_NAMES[month - 1]} ${year}`,
        },
        tx,
      );
    });
    refresh();
  });
}

export async function reopenPeriod(input: { year: number; month: number }): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await guard("finance:close");
    const { year, month } = parse(periodSchema, input);
    await prisma.$transaction(async (tx) => {
      const blocked = checkReopen(await statuses(tx, year), month);
      if (blocked) throw new ActionError(blocked, "rule");
      await tx.fiscalPeriod.update({
        where: { year_month: { year, month } },
        data: { status: "open", closedAt: null, closedBy: null },
      });
      await recordAudit(
        actor,
        {
          action: "period.reopen",
          entity: "fiscal_period",
          summary: `Reopened ${MONTH_NAMES[month - 1]} ${year}`,
        },
        tx,
      );
    });
    refresh();
  });
}

/* ---------------------------------------------------------------- tax rates */

export async function saveTaxRate(input: TaxRateInput): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const actor = await guard("finance:manage");
    const data = parse(taxRateSchema, input);
    const rateBp = parseRate(data.rate);
    const invalid = checkTaxRate({ code: data.code, name: data.name, rateBp: rateBp ?? -1 });
    if (invalid.code || invalid.name || invalid.rate) {
      throw new ActionError("Check the marked fields.", "validation", invalid);
    }
    const id = await prisma.$transaction(async (tx) => {
      const clash = await tx.taxRate.findFirst({
        where: { code: data.code, ...(data.id ? { id: { not: data.id } } : {}) },
        select: { id: true },
      });
      if (clash) {
        const message = "Another rate already uses that code.";
        throw new ActionError(message, "validation", { code: message });
      }
      const fields = {
        code: data.code,
        name: data.name,
        rateBp: rateBp as number,
        kind: data.kind,
        active: data.active,
      };
      const saved = data.id
        ? await tx.taxRate.update({ where: { id: data.id }, data: fields })
        : await tx.taxRate.create({ data: fields });
      await recordAudit(
        actor,
        {
          action: data.id ? "tax_rate.update" : "tax_rate.create",
          entity: "tax_rate",
          entityId: saved.id,
          summary: `${data.id ? "Edited" : "Added"} the tax rate ${data.code} (${data.rate}%)`,
        },
        tx,
      );
      return saved.id;
    });
    refresh();
    return { id };
  });
}
