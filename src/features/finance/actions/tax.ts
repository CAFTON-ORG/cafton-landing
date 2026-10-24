"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { guard } from "@/features/crm/actions/guard";
import { manilaDate } from "@/features/schedule/rules/slots";
import { ActionError, actorId, parse, runAction, type ActionResult } from "@/lib/actions";
import { recordAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { parseMinor } from "@/lib/money";
import { accountForRole, postJournal, reverseJournal } from "../services/ledger";
import { cwtAvailable, grossReceipts } from "../repository/tax";
import {
  checkFiling,
  checkVoidFiling,
  estimateTax,
  obligationsFor,
  type FilingKind,
} from "../rules/tax";

const date = (value: string) => new Date(`${value}T00:00:00Z`);

const filingSchema = z.object({
  year: z.coerce.number().int().min(2020).max(2100),
  kind: z.enum(["q1", "q2", "q3", "annual"]),
  filedOn: z.string().trim().max(10),
  reference: z.string().trim().max(120).default(""),
  /** Pesos paid in cash. */
  cash: z.string().trim().max(24).default(""),
  /** Pesos of creditable withholding tax used. */
  cwt: z.string().trim().max(24).default(""),
  paidFromAccountId: z.string().max(40).default(""),
  notes: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((value) => value || null),
});
export type FilingInput = z.input<typeof filingSchema>;

function refresh() {
  revalidatePath("/dashboard/finance/taxes");
  revalidatePath("/dashboard/finance/journal");
  revalidatePath("/dashboard/audit");
}

function pesos(text: string, field: string): number {
  if (!text.trim()) return 0;
  const minor = parseMinor(text);
  if (minor === null) {
    const message = "Enter an amount like 12000 or 12,000.50.";
    throw new ActionError(message, "validation", { [field]: message });
  }
  return minor;
}

/**
 * Records that a return was filed: what was declared and paid. The tax is booked as income tax
 * expense, against the cash it was paid from and the withheld tax it used up, so the ledger, the
 * tracker and the reports all agree. A return with nothing to pay is recorded without a posting.
 */
export async function recordFiling(input: FilingInput): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const actor = await guard("finance:post");
    const data = parse(filingSchema, input);
    const cashMinor = pesos(data.cash, "cash");
    const cwtMinor = pesos(data.cwt, "cwt");
    const today = manilaDate(new Date());

    const id = await prisma.$transaction(async (tx) => {
      const all = obligationsFor(data.year);
      const position = all.findIndex((item) => item.kind === (data.kind as FilingKind));
      const obligation = all[position];
      const filings = await tx.taxFiling.findMany({
        where: { taxYear: data.year, status: "filed" },
      });
      const [gross, available] = await Promise.all([
        grossReceipts(data.year, obligation.periodEnd, tx),
        cwtAvailable(obligation.periodEnd, tx),
      ]);
      // Withheld tax earned after the period can't be used on it; what is claimable is what the books held then.
      const settledBefore = filings
        .filter((filing) => all.findIndex((item) => item.kind === filing.kind) < position)
        .reduce(
          (sum, filing) => sum + Number(filing.cashPaidMinor) + Number(filing.cwtAppliedMinor),
          0,
        );
      const invalid = checkFiling({
        obligation,
        earlierFiled: all
          .slice(0, position)
          .map((item) => filings.some((f) => f.kind === item.kind)),
        alreadyFiled: filings.some((f) => f.kind === obligation.kind),
        filedOn: data.filedOn,
        today,
        cashMinor,
        cwtMinor,
        cwtAvailableMinor: available,
        paidFromAccountId: data.paidFromAccountId,
        reference: data.reference,
      });
      if (invalid) {
        throw new ActionError(invalid.form ?? "Check the marked fields.", "validation", {
          ...(invalid.form ? { form: invalid.form } : {}),
          ...(invalid.filedOn ? { filedOn: invalid.filedOn } : {}),
          ...(invalid.cash ? { cash: invalid.cash } : {}),
          ...(invalid.cwt ? { cwt: invalid.cwt } : {}),
          ...(invalid.paidFrom ? { paidFromAccountId: invalid.paidFrom } : {}),
          ...(invalid.reference ? { reference: invalid.reference } : {}),
        });
      }

      let paidFrom: { id: string } | null = null;
      if (cashMinor > 0) {
        const account = await tx.account.findUnique({ where: { id: data.paidFromAccountId } });
        if (!account || !account.active || account.type !== "asset") {
          const message = "Choose the cash or bank account it was paid from.";
          throw new ActionError(message, "validation", { paidFromAccountId: message });
        }
        paidFrom = account;
      }

      const estimate = estimateTax({
        grossToDateMinor: gross,
        settledBeforeMinor: settledBefore,
        cwtAvailableMinor: available,
      });
      const total = cashMinor + cwtMinor;
      let journalEntryId: string | null = null;
      if (total > 0) {
        const posted = await postJournal(tx, actor, {
          date: data.filedOn,
          memo: `${obligation.form} ${obligation.label.toLowerCase()} ${data.year} income tax (8% option)${data.reference ? `, ref ${data.reference}` : ""}`,
          sourceKind: "tax",
          lines: [
            {
              accountId: await accountForRole(tx, "income_tax_expense"),
              debitMinor: total,
              creditMinor: 0,
            },
            ...(cashMinor > 0 && paidFrom
              ? [{ accountId: paidFrom.id, debitMinor: 0, creditMinor: cashMinor }]
              : []),
            ...(cwtMinor > 0
              ? [
                  {
                    accountId: await accountForRole(tx, "cwt_receivable"),
                    debitMinor: 0,
                    creditMinor: cwtMinor,
                  },
                ]
              : []),
          ],
        });
        journalEntryId = posted.id;
      }
      const filing = await tx.taxFiling.create({
        data: {
          taxYear: data.year,
          kind: obligation.kind,
          form: obligation.form,
          dueDate: date(obligation.dueDate),
          filedOn: date(data.filedOn),
          reference: data.reference || null,
          grossReceiptsMinor: Math.max(0, gross),
          estimateMinor: estimate.remainingMinor,
          cashPaidMinor: cashMinor,
          cwtAppliedMinor: cwtMinor,
          paidFromAccountId: paidFrom?.id ?? null,
          notes: data.notes,
          journalEntryId,
          filedBy: actorId(actor),
          filedByName: actor.name,
        },
      });
      await recordAudit(
        actor,
        {
          action: "tax.file",
          entity: "tax_filing",
          entityId: filing.id,
          summary: `Recorded the ${obligation.form} for ${obligation.label.toLowerCase()} ${data.year}: ₱${(total / 100).toFixed(2)} settled`,
        },
        tx,
      );
      return filing.id;
    });
    refresh();
    return { id };
  });
}

/** Undoes a recorded filing: its posting is reversed, and the return can be recorded again. */
export async function voidFiling(input: { id: string; reason: string }): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await guard("finance:post");
    const data = parse(
      z.object({ id: z.string().uuid(), reason: z.string().trim().max(300) }),
      input,
    );
    await prisma.$transaction(async (tx) => {
      const filing = await tx.taxFiling.findUnique({ where: { id: data.id } });
      if (!filing) throw new ActionError("That filing no longer exists.");
      const blocked = checkVoidFiling({ status: filing.status, reason: data.reason });
      if (blocked) throw new ActionError(blocked, "rule", { reason: blocked });
      // A later return builds on this one, so it can't be undone while that one stands.
      const later = await tx.taxFiling.count({
        where: {
          taxYear: filing.taxYear,
          status: "filed",
          kind: {
            in: obligationsFor(filing.taxYear)
              .map((o) => o.kind)
              .slice(obligationsFor(filing.taxYear).findIndex((o) => o.kind === filing.kind) + 1),
          },
        },
      });
      if (later > 0) {
        const message = "A later return of this year builds on this one. Void that first.";
        throw new ActionError(message, "rule", { reason: message });
      }
      const reversal = filing.journalEntryId
        ? await reverseJournal(tx, actor, filing.journalEntryId, {
            reason: `Voided ${filing.form} ${filing.kind} ${filing.taxYear}: ${data.reason}`,
          })
        : null;
      await tx.taxFiling.update({
        where: { id: filing.id },
        data: {
          status: "void",
          voidedAt: new Date(),
          voidReason: data.reason,
          voidEntryId: reversal?.id ?? null,
        },
      });
      await recordAudit(
        actor,
        {
          action: "tax.void",
          entity: "tax_filing",
          entityId: filing.id,
          summary: `Voided the ${filing.form} for ${filing.kind} ${filing.taxYear}: ${data.reason}`,
        },
        tx,
      );
    });
    refresh();
  });
}
