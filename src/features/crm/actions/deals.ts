"use server";

import { ActionError, actorId, parse, runAction, type ActionResult } from "@/lib/actions";
import { notify } from "@/features/notifications/server";
import { recordAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { formatMinor, parseMinor } from "@/lib/money";
import { live } from "../mappers";
import {
  checkDealDelete,
  checkEditAmount,
  checkLose,
  checkMoveDeal,
  checkReopenDeal,
  checkWin,
} from "../rules";
import { dealSchema, reasonSchema, type DealInput } from "../schemas";
import { guard, refreshCrm } from "./guard";
import { firstOpenStage, lastOpenStage, logActivity, type Tx } from "./shared";

async function loadDeal(tx: Tx, id: string) {
  const deal = await tx.deal.findFirst({ where: { id, ...live }, include: { stage: true } });
  if (!deal) throw new ActionError("That deal no longer exists.");
  return deal;
}

const state = (deal: { stage: { kind: "open" | "won" | "lost" }; amountMinor: bigint | null }) => ({
  stageKind: deal.stage.kind,
  amountMinor: deal.amountMinor === null ? null : Number(deal.amountMinor),
});

async function assertLiveContact(tx: Tx, contactId: string) {
  const contact = await tx.contact.findFirst({
    where: { id: contactId, ...live },
    select: { id: true },
  });
  if (!contact)
    throw new ActionError("Choose a contact.", "validation", {
      contactId: "That contact no longer exists.",
    });
}

export async function createDeal(input: DealInput): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const actor = await guard("deals:create");
    const data = parse(dealSchema, input);

    const id = await prisma.$transaction(async (tx) => {
      await assertLiveContact(tx, data.contactId);
      const stage = await firstOpenStage(tx, "new", data.pipelineId);
      if (!stage) throw new ActionError("That pipeline has no open stages.");
      const contact = await tx.contact.findUnique({
        where: { id: data.contactId },
        select: { organizationId: true },
      });

      const deal = await tx.deal.create({
        data: {
          title: data.title,
          contactId: data.contactId,
          organizationId: data.organizationId ?? contact?.organizationId ?? undefined,
          stageId: stage.id,
          amountMinor: data.amount === null ? undefined : BigInt(data.amount),
          ownerId: data.ownerId ?? actorId(actor),
          expectedCloseDate: data.expectedCloseDate ? new Date(data.expectedCloseDate) : undefined,
          description: data.description,
          source: "manual",
          createdBy: actorId(actor),
        },
      });
      await logActivity(tx, actor, { dealId: deal.id }, "system", `Created in ${stage.name}`);
      await recordAudit(
        actor,
        {
          action: "deal.create",
          entity: "deal",
          entityId: deal.id,
          summary: `Created deal ${deal.reference}: ${deal.title}`,
        },
        tx,
      );
      return deal.id;
    });
    await notify(
      [data.ownerId],
      {
        kind: "deal.assigned",
        title: `A new deal is yours: ${data.title}`,
        href: `/dashboard/crm/deals/${id}`,
      },
      actorId(actor),
    );
    refreshCrm();
    return { id };
  });
}

export async function updateDeal(
  id: string,
  input: DealInput,
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const actor = await guard("deals:update");
    const data = parse(dealSchema, input);

    let previousOwner: string | null = null;
    await prisma.$transaction(async (tx) => {
      const deal = await loadDeal(tx, id);
      previousOwner = deal.ownerId;
      await assertLiveContact(tx, data.contactId);

      const amountChanged =
        (data.amount ?? null) !== (deal.amountMinor === null ? null : Number(deal.amountMinor));
      if (amountChanged) {
        const locked = checkEditAmount(state(deal));
        if (locked) throw new ActionError(locked, "rule", { amount: locked });
      }

      await tx.deal.update({
        where: { id },
        data: {
          title: data.title,
          contactId: data.contactId,
          organizationId: data.organizationId ?? null,
          ownerId: data.ownerId ?? null,
          amountMinor: data.amount === null ? null : BigInt(data.amount),
          expectedCloseDate: data.expectedCloseDate ? new Date(data.expectedCloseDate) : null,
          description: data.description ?? null,
          updatedBy: actorId(actor),
        },
      });
      if (amountChanged) {
        await logActivity(
          tx,
          actor,
          { dealId: id },
          "system",
          `Value changed to ${formatMinor(data.amount, deal.currency)}`,
        );
      }
      await recordAudit(
        actor,
        {
          action: "deal.update",
          entity: "deal",
          entityId: id,
          summary: `Updated deal ${deal.reference}`,
        },
        tx,
      );
    });
    if (data.ownerId && data.ownerId !== previousOwner) {
      await notify(
        [data.ownerId],
        {
          kind: "deal.assigned",
          title: `${data.title} was assigned to you`,
          href: `/dashboard/crm/deals/${id}`,
        },
        actorId(actor),
      );
    }
    refreshCrm();
    return { id };
  });
}

/** Moves an open deal to another open stage. */
export async function moveDeal(id: string, stageId: string): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await guard("deals:update");

    await prisma.$transaction(async (tx) => {
      const deal = await loadDeal(tx, id);
      const target = await tx.pipelineStage.findUnique({ where: { id: stageId } });
      if (!target) throw new ActionError("That stage no longer exists.");
      if (target.id === deal.stageId) return;
      if (target.pipelineId !== deal.stage.pipelineId) {
        throw new ActionError("A deal stays in its own pipeline.", "rule");
      }
      const blocked = checkMoveDeal(state(deal), target);
      if (blocked) throw new ActionError(blocked, "rule");

      await tx.deal.update({
        where: { id },
        data: { stageId: target.id, stageChangedAt: new Date(), updatedBy: actorId(actor) },
      });
      await logActivity(
        tx,
        actor,
        { dealId: id },
        "stage_change",
        `Moved from ${deal.stage.name} to ${target.name}`,
      );
      await recordAudit(
        actor,
        {
          action: "deal.move",
          entity: "deal",
          entityId: id,
          summary: `Moved deal ${deal.reference} from ${deal.stage.name} to ${target.name}`,
        },
        tx,
      );
    });
    refreshCrm();
  });
}

/** Win a deal. `amount` (pesos, optional) sets the final value in the same step. */
export async function winDeal(id: string, amount?: string): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await guard("deals:close");

    await prisma.$transaction(async (tx) => {
      const deal = await loadDeal(tx, id);
      let amountMinor = deal.amountMinor === null ? null : Number(deal.amountMinor);
      if (amount?.trim()) {
        amountMinor = parseMinor(amount);
        if (amountMinor === null) {
          throw new ActionError("Enter an amount like 12500 or 12,500.50.", "validation", {
            amount: "Enter an amount like 12500 or 12,500.50.",
          });
        }
      }
      const blocked = checkWin({ stageKind: deal.stage.kind, amountMinor });
      if (blocked) throw new ActionError(blocked, "rule", { amount: blocked });

      const won = await tx.pipelineStage.findFirst({
        where: { kind: "won", pipelineId: deal.stage.pipelineId },
        orderBy: { position: "asc" },
      });
      if (!won) throw new ActionError("The sales pipeline has no Won stage.");

      const now = new Date();
      await tx.deal.update({
        where: { id },
        data: {
          stageId: won.id,
          amountMinor: BigInt(amountMinor!),
          wonAt: now,
          lostAt: null,
          lostReason: null,
          stageChangedAt: now,
          updatedBy: actorId(actor),
        },
      });
      await logActivity(
        tx,
        actor,
        { dealId: id },
        "stage_change",
        `Won at ${formatMinor(amountMinor, deal.currency)}`,
      );
      await recordAudit(
        actor,
        {
          action: "deal.win",
          entity: "deal",
          entityId: id,
          summary: `Won deal ${deal.reference} at ${formatMinor(amountMinor, deal.currency)}`,
        },
        tx,
      );
    });
    refreshCrm();
  });
}

/** Lose a deal. A reason is required; the deal's open tasks are completed. */
export async function loseDeal(id: string, reason: string): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await guard("deals:close");
    const why = parse(reasonSchema, reason);

    await prisma.$transaction(async (tx) => {
      const deal = await loadDeal(tx, id);
      const blocked = checkLose(state(deal), why);
      if (blocked) throw new ActionError(blocked, "rule");

      const lost = await tx.pipelineStage.findFirst({
        where: { kind: "lost", pipelineId: deal.stage.pipelineId },
        orderBy: { position: "asc" },
      });
      if (!lost) throw new ActionError("The sales pipeline has no Lost stage.");

      const now = new Date();
      await tx.deal.update({
        where: { id },
        data: {
          stageId: lost.id,
          lostAt: now,
          lostReason: why,
          wonAt: null,
          stageChangedAt: now,
          updatedBy: actorId(actor),
        },
      });
      await tx.task.updateMany({ where: { dealId: id, doneAt: null }, data: { doneAt: now } });
      await logActivity(tx, actor, { dealId: id }, "stage_change", `Lost: ${why}`);
      await recordAudit(
        actor,
        {
          action: "deal.lose",
          entity: "deal",
          entityId: id,
          summary: `Lost deal ${deal.reference}: ${why}`,
        },
        tx,
      );
    });
    refreshCrm();
  });
}

/** Puts a closed deal back into the pipeline (at Negotiation, where closed deals are normally reopened from). */
export async function reopenDeal(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await guard("deals:close");

    await prisma.$transaction(async (tx) => {
      const deal = await loadDeal(tx, id);
      const blocked = checkReopenDeal(state(deal));
      if (blocked) throw new ActionError(blocked, "rule");

      const stage = await lastOpenStage(tx, deal.stage.pipelineId);
      if (!stage) throw new ActionError("The sales pipeline has no open stages.");

      await tx.deal.update({
        where: { id },
        data: {
          stageId: stage.id,
          wonAt: null,
          lostAt: null,
          lostReason: null,
          stageChangedAt: new Date(),
          updatedBy: actorId(actor),
        },
      });
      await logActivity(tx, actor, { dealId: id }, "stage_change", `Reopened in ${stage.name}`);
      await recordAudit(
        actor,
        {
          action: "deal.reopen",
          entity: "deal",
          entityId: id,
          summary: `Reopened deal ${deal.reference}`,
        },
        tx,
      );
    });
    refreshCrm();
  });
}

export async function deleteDeal(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await guard("deals:delete");

    await prisma.$transaction(async (tx) => {
      const deal = await loadDeal(tx, id);
      const blocked = checkDealDelete(state(deal));
      if (blocked) throw new ActionError(blocked, "rule");

      await tx.deal.update({
        where: { id },
        data: { deletedAt: new Date(), updatedBy: actorId(actor) },
      });
      // The lead (if any) stays converted: that is history. The deal link is soft-deleted with the deal.
      await recordAudit(
        actor,
        {
          action: "deal.delete",
          entity: "deal",
          entityId: id,
          summary: `Deleted deal ${deal.reference}: ${deal.title}`,
        },
        tx,
      );
    });
    refreshCrm();
  });
}
