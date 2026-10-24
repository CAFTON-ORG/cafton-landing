"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { guard } from "@/features/crm/actions/guard";
import { ActionError, actorId, parse, runAction, type ActionResult } from "@/lib/actions";
import { recordAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { parseMinor } from "@/lib/money";
import { anchorDayOf, checkRecurring } from "../rules/recurring";
import { recurringSchema, type RecurringInput } from "../schemas/recurring";
import { generateDueRecurring, type RecurringRun } from "../services/recurring";

function refresh() {
  for (const path of [
    "/dashboard/finance/recurring",
    "/dashboard/finance/bills",
    "/dashboard/finance/expenses",
  ]) {
    revalidatePath(path);
  }
}

const date = (value: string) => new Date(`${value}T00:00:00Z`);

export async function saveRecurring(input: RecurringInput): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const actor = await guard("payables:create");
    const data = parse(recurringSchema, input);
    const amountMinor = data.amount.trim() ? (parseMinor(data.amount) ?? 0) : 0;
    const invalid = checkRecurring({
      kind: data.kind,
      name: data.name,
      startDate: data.startDate,
      endDate: data.endDate,
      vendorId: data.vendorId,
      payee: data.payee,
      description: data.description,
      accountId: data.accountId,
      paidFromAccountId: data.paidFromAccountId,
      amountMinor,
    });
    if (invalid) {
      throw new ActionError("Check the marked fields.", "validation", {
        ...(invalid.name ? { name: invalid.name } : {}),
        ...(invalid.startDate ? { startDate: invalid.startDate } : {}),
        ...(invalid.endDate ? { endDate: invalid.endDate } : {}),
        ...(invalid.vendor ? { vendorId: invalid.vendor } : {}),
        ...(invalid.payee ? { payee: invalid.payee } : {}),
        ...(invalid.description ? { description: invalid.description } : {}),
        ...(invalid.account ? { accountId: invalid.account } : {}),
        ...(invalid.paidFrom ? { paidFromAccountId: invalid.paidFrom } : {}),
        ...(invalid.amount ? { amount: invalid.amount } : {}),
      });
    }

    const id = await prisma.$transaction(async (tx) => {
      const [cost, paidFrom, vendor] = await Promise.all([
        tx.account.findUnique({ where: { id: data.accountId } }),
        data.kind === "expense"
          ? tx.account.findUnique({ where: { id: data.paidFromAccountId } })
          : null,
        data.kind === "bill" && data.vendorId
          ? tx.vendor.findUnique({ where: { id: data.vendorId } })
          : null,
      ]);
      if (!cost || !cost.active || (cost.type !== "expense" && cost.type !== "asset")) {
        const message = "Choose an expense account that is switched on.";
        throw new ActionError(message, "validation", { accountId: message });
      }
      if (
        data.kind === "expense" &&
        !(
          paidFrom &&
          paidFrom.active &&
          (paidFrom.type === "asset" || paidFrom.systemKey === "reimbursable")
        )
      ) {
        const message = "Choose cash, a bank account, or reimbursements.";
        throw new ActionError(message, "validation", { paidFromAccountId: message });
      }
      if (data.kind === "bill" && (!vendor || !vendor.active)) {
        const message = "Choose a supplier that is still active.";
        throw new ActionError(message, "validation", { vendorId: message });
      }
      const fields = {
        kind: data.kind,
        name: data.name,
        frequency: data.frequency,
        anchorDay: anchorDayOf(data.startDate),
        nextDate: date(data.startDate),
        endDate: data.endDate ? date(data.endDate) : null,
        vendorId: data.kind === "bill" ? data.vendorId : null,
        payee: data.kind === "expense" ? data.payee : null,
        description: data.description,
        accountId: data.accountId,
        amountMinor,
        paidFromAccountId: data.kind === "expense" ? data.paidFromAccountId : null,
      };
      if (data.id) {
        const found = await tx.recurringItem.findUnique({ where: { id: data.id } });
        if (!found) throw new ActionError("That recurring item no longer exists.");
        await tx.recurringItem.update({
          where: { id: data.id },
          data: { ...fields, active: true },
        });
        await recordAudit(
          actor,
          {
            action: "recurring.update",
            entity: "recurring",
            entityId: data.id,
            summary: `Edited the recurring ${data.kind} ${data.name}`,
          },
          tx,
        );
        return data.id;
      }
      const created = await tx.recurringItem.create({
        data: { ...fields, createdBy: actorId(actor) },
      });
      await recordAudit(
        actor,
        {
          action: "recurring.create",
          entity: "recurring",
          entityId: created.id,
          summary: `Set up the recurring ${data.kind} ${data.name}`,
        },
        tx,
      );
      return created.id;
    });
    refresh();
    return { id };
  });
}

export async function setRecurringActive(input: {
  id: string;
  active: boolean;
}): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await guard("payables:create");
    const data = parse(z.object({ id: z.string().uuid(), active: z.boolean() }), input);
    await prisma.$transaction(async (tx) => {
      const item = await tx.recurringItem.findUnique({ where: { id: data.id } });
      if (!item) throw new ActionError("That recurring item no longer exists.");
      await tx.recurringItem.update({ where: { id: data.id }, data: { active: data.active } });
      await recordAudit(
        actor,
        {
          action: data.active ? "recurring.resume" : "recurring.pause",
          entity: "recurring",
          entityId: data.id,
          summary: `${data.active ? "Resumed" : "Paused"} ${item.name}`,
        },
        tx,
      );
    });
    refresh();
  });
}

/** Stops it for good. What it already made stays, with a note of where it came from. */
export async function deleteRecurring(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await guard("payables:create");
    await prisma.$transaction(async (tx) => {
      const item = await tx.recurringItem.findUnique({
        where: { id: parse(z.string().uuid(), id) },
      });
      if (!item) throw new ActionError("That recurring item no longer exists.");
      await tx.recurringItem.delete({ where: { id } });
      await recordAudit(
        actor,
        {
          action: "recurring.delete",
          entity: "recurring",
          entityId: id,
          summary: `Removed the recurring ${item.kind} ${item.name}`,
        },
        tx,
      );
    });
    refresh();
  });
}

/** Makes what is due now instead of waiting for the daily job. */
export async function runRecurringNow(): Promise<ActionResult<RecurringRun>> {
  return runAction(async () => {
    await guard("payables:create");
    const run = await generateDueRecurring();
    refresh();
    return run;
  });
}
