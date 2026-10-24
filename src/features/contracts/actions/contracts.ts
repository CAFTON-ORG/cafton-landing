"use server";

import { revalidatePath } from "next/cache";

import { guard, refreshCrm } from "@/features/crm/actions/guard";
import { logActivity } from "@/features/crm/actions/shared";
import { live } from "@/features/crm/repository/mappers";
import { addDays, manilaDate } from "@/features/schedule/rules/slots";
import { generateToken, hashToken } from "@/features/sales/services/integrity";
import { ActionError, actorId, parse, runAction, type ActionResult } from "@/lib/actions";
import { recordAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { contractLink, sendContractEmail } from "../services/emails";
import { needsQuote } from "../rules/merge";
import { getPublicContract } from "../repository/contracts";
import {
  CONTRACT_KIND_LABEL,
  DEFAULT_VALID_DAYS,
  LIVE_STATUSES,
  canEdit,
  checkCreate,
  checkDelete,
  checkSend,
  checkWithdraw,
  type ContractKind,
  type ContractStatus,
} from "../rules/core";
import { contractSchema, type ContractInput } from "../schemas";
import { fingerprintOf, mergeValues, renderContractBody } from "../services/contracts";

function refreshContracts(dealId?: string) {
  refreshCrm();
  revalidatePath("/dashboard/sales/contracts");
  if (dealId) revalidatePath(`/dashboard/crm/deals/${dealId}`);
  revalidatePath("/dashboard/sales/contracts/[id]", "page");
}

async function load(id: string) {
  const contract = await prisma.contract.findUnique({
    where: { id },
    include: {
      deal: {
        select: {
          id: true,
          ownerId: true,
          stage: { select: { kind: true } },
          contact: { select: { email: true } },
        },
      },
    },
  });
  if (!contract) throw new ActionError("That contract no longer exists.");
  return contract;
}

/**
 * Drafts a contract or statement of work for a deal from a template: the template's merge fields
 * are filled in from the deal and, where it uses price details, from an accepted quote.
 */
export async function createContract(
  dealId: string,
  templateId: string,
  quoteId?: string,
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const actor = await guard("contracts:create");
    const id = await prisma.$transaction(async (tx) => {
      const deal = await tx.deal.findFirst({
        where: { id: dealId, ...live },
        include: { stage: true },
      });
      if (!deal) throw new ActionError("That deal no longer exists.");
      const template = await tx.contractTemplate.findUnique({ where: { id: templateId } });
      if (!template || !template.active) {
        throw new ActionError("That template isn't available. Pick another.", "rule");
      }
      const quote = quoteId
        ? await tx.quote.findFirst({
            where: { id: quoteId, dealId },
            select: { id: true, status: true },
          })
        : null;
      if (quoteId && !quote) throw new ActionError("That quote isn't on this deal.", "rule");
      const kind = template.kind as ContractKind;
      const blocked = checkCreate({
        dealKind: deal.stage.kind,
        kind,
        quote: quote ? { accepted: quote.status === "accepted" } : null,
        templateNeedsQuote: needsQuote(template.body),
        liveOfSameKind: await tx.contract.count({
          where: { dealId, kind, status: { in: LIVE_STATUSES as ContractStatus[] } },
        }),
      });
      if (blocked) throw new ActionError(blocked, "rule");

      const numbers = await tx.$queryRaw<{ reference: string }[]>`
        SELECT 'CT-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('contract_reference_seq')::text, 4, '0') AS reference`;
      const body = renderContractBody(
        template.body,
        await mergeValues(tx, dealId, quote?.id ?? null),
      );
      const contract = await tx.contract.create({
        data: {
          reference: numbers[0].reference,
          dealId,
          quoteId: quote?.id,
          templateId: template.id,
          kind,
          title: `${CONTRACT_KIND_LABEL[kind]}: ${deal.title}`.slice(0, 200),
          body,
          validUntil: new Date(addDays(manilaDate(new Date()), DEFAULT_VALID_DAYS)),
          createdBy: actorId(actor),
        },
      });
      await logActivity(
        tx,
        actor,
        { dealId },
        "system",
        `Drafted ${CONTRACT_KIND_LABEL[kind].toLowerCase()} ${contract.reference}`,
      );
      await recordAudit(
        actor,
        {
          action: "contract.create",
          entity: "contract",
          entityId: contract.id,
          summary: `Drafted ${contract.reference} for ${deal.title} from ${template.name}`,
        },
        tx,
      );
      return contract.id;
    });
    refreshContracts(dealId);
    return { id };
  });
}

/** Saves a draft's title, wording and sign-by date. */
export async function saveContract(id: string, input: ContractInput): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await guard("contracts:update");
    const data = parse(contractSchema, input);
    const dealId = await prisma.$transaction(async (tx) => {
      const contract = await tx.contract.findUnique({ where: { id } });
      if (!contract) throw new ActionError("That contract no longer exists.");
      if (!canEdit(contract.status as ContractStatus)) {
        throw new ActionError(
          "Only a draft can be edited. Withdraw it and draft a new one to change it.",
          "rule",
        );
      }
      await tx.contract.update({
        where: { id },
        data: {
          title: data.title,
          body: data.body,
          validUntil: data.validUntil ? new Date(data.validUntil) : null,
        },
      });
      await recordAudit(
        actor,
        {
          action: "contract.update",
          entity: "contract",
          entityId: id,
          summary: `Edited ${contract.reference}`,
        },
        tx,
      );
      return contract.dealId;
    });
    refreshContracts(dealId);
  });
}

/**
 * Emails the contract (link and PDF) to the deal's contact. Every send makes a fresh link, and
 * what was sent is fingerprinted so the signature can be shown to match it.
 */
export async function sendContract(
  id: string,
): Promise<ActionResult<{ emailed: boolean; link: string }>> {
  return runAction(async () => {
    const actor = await guard("contracts:send");
    const contract = await load(id);
    const recipient = contract.deal.contact.email?.trim() || null;
    const blocked = checkSend({
      status: contract.status as ContractStatus,
      body: contract.body,
      recipient,
      validUntil: contract.validUntil ? contract.validUntil.toISOString().slice(0, 10) : null,
      today: manilaDate(new Date()),
      dealKind: contract.deal.stage.kind,
    });
    if (blocked) throw new ActionError(blocked, "rule");

    const token = generateToken();
    await prisma.$transaction(async (tx) => {
      await tx.contract.update({
        where: { id },
        data: {
          status: "sent",
          tokenHash: hashToken(token),
          sentHash: fingerprintOf(contract),
          sentAt: new Date(),
          sentTo: recipient,
        },
      });
      await logActivity(
        tx,
        actor,
        { dealId: contract.dealId },
        "email",
        `Sent ${contract.reference} to ${recipient}`,
      );
      await recordAudit(
        actor,
        {
          action: "contract.send",
          entity: "contract",
          entityId: id,
          summary: `Sent ${contract.reference} to ${recipient}`,
        },
        tx,
      );
    });

    const publicContract = await getPublicContract(token);
    let emailed = false;
    if (publicContract && recipient) {
      const result = await sendContractEmail({
        to: recipient,
        contract: publicContract,
        token,
        senderName: actor.name,
      });
      emailed = result.ok;
    }
    refreshContracts(contract.dealId);
    return { emailed, link: contractLink(token) };
  });
}

/** Only a hash of the link is kept. To get a link to send yourself, make a new one (the old one stops working). */
export async function renewContractLink(id: string): Promise<ActionResult<{ link: string }>> {
  return runAction(async () => {
    const actor = await guard("contracts:send");
    const contract = await prisma.contract.findUnique({ where: { id } });
    if (!contract) throw new ActionError("That contract no longer exists.");
    if (contract.status !== "sent") {
      throw new ActionError("Only a contract waiting for a signature has a link.", "rule");
    }
    const token = generateToken();
    await prisma.$transaction(async (tx) => {
      await tx.contract.update({ where: { id }, data: { tokenHash: hashToken(token) } });
      await recordAudit(
        actor,
        {
          action: "contract.link",
          entity: "contract",
          entityId: id,
          summary: `Made a new link for ${contract.reference}; the old one no longer works`,
        },
        tx,
      );
    });
    return { link: contractLink(token) };
  });
}

/** Takes a sent contract off the table, with a reason. The client's link then says so. */
export async function withdrawContract(id: string, reason: string): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await guard("contracts:update");
    const dealId = await prisma.$transaction(async (tx) => {
      const contract = await tx.contract.findUnique({ where: { id } });
      if (!contract) throw new ActionError("That contract no longer exists.");
      const blocked = checkWithdraw(contract.status as ContractStatus, reason);
      if (blocked) throw new ActionError(blocked, "rule");
      await tx.contract.update({
        where: { id },
        data: { status: "withdrawn", withdrawnAt: new Date(), withdrawnReason: reason.trim() },
      });
      await logActivity(
        tx,
        actor,
        { dealId: contract.dealId },
        "system",
        `Withdrew ${contract.reference}: ${reason.trim()}`,
      );
      await recordAudit(
        actor,
        {
          action: "contract.withdraw",
          entity: "contract",
          entityId: id,
          summary: `Withdrew ${contract.reference}: ${reason.trim()}`,
        },
        tx,
      );
      return contract.dealId;
    });
    refreshContracts(dealId);
  });
}

/** Only a draft that was never sent can be deleted. Everything else is a record. */
export async function deleteContract(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await guard("contracts:delete");
    const dealId = await prisma.$transaction(async (tx) => {
      const contract = await tx.contract.findUnique({ where: { id } });
      if (!contract) throw new ActionError("That contract no longer exists.");
      const blocked = checkDelete(
        contract.status as ContractStatus,
        contract.sentAt !== null || contract.tokenHash !== null,
      );
      if (blocked) throw new ActionError(blocked, "rule");
      await tx.contract.delete({ where: { id } });
      await recordAudit(
        actor,
        {
          action: "contract.delete",
          entity: "contract",
          entityId: id,
          summary: `Deleted draft ${contract.reference}`,
        },
        tx,
      );
      return contract.dealId;
    });
    refreshContracts(dealId);
  });
}
