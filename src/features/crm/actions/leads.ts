"use server";

import { ActionError, actorId, parse, runAction, type ActionResult } from "@/lib/actions";
import { notify } from "@/features/notifications/server";
import { recordAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { parseMinor } from "@/lib/money";
import { live } from "../mappers";
import {
  checkConvert,
  checkDisqualify,
  checkLeadDelete,
  checkQualify,
  checkReopenLead,
  fullName,
} from "../rules";
import { reasonSchema } from "../schemas";
import { buildEnquirySummary, type ContactFormData } from "../contact";
import { guard, refreshCrm } from "./guard";
import { findLiveContactByEmail, firstOpenStage, logActivity } from "./shared";

async function loadLead(id: string) {
  const lead = await prisma.lead.findFirst({ where: { id, ...live } });
  if (!lead) throw new ActionError("That lead no longer exists.");
  return lead;
}

export async function assignLead(id: string, ownerId: string | null): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await guard("leads:update");
    const lead = await loadLead(id);
    if (ownerId) {
      const owner = await prisma.profile.findUnique({
        where: { id: ownerId },
        select: { fullName: true, email: true },
      });
      if (!owner) throw new ActionError("That person no longer has access.");
    }
    await prisma.$transaction(async (tx) => {
      await tx.lead.update({ where: { id }, data: { ownerId } });
      await recordAudit(
        actor,
        {
          action: "lead.assign",
          entity: "lead",
          entityId: id,
          summary: ownerId
            ? `Assigned lead ${lead.reference}`
            : `Unassigned lead ${lead.reference}`,
        },
        tx,
      );
    });
    await notify(
      [ownerId],
      {
        kind: "lead.assigned",
        title: `${lead.reference} was assigned to you`,
        body: fullName(lead),
        href: `/dashboard/crm/leads/${id}`,
      },
      actorId(actor),
    );
    refreshCrm();
  });
}

export async function qualifyLead(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await guard("leads:update");
    const lead = await loadLead(id);
    const blocked = checkQualify(lead);
    if (blocked) throw new ActionError(blocked, "rule");

    await prisma.$transaction(async (tx) => {
      await tx.lead.update({
        where: { id },
        data: { status: "qualified", ownerId: lead.ownerId ?? actorId(actor) },
      });
      await logActivity(tx, actor, { leadId: id }, "system", "Marked as qualified");
      await recordAudit(
        actor,
        {
          action: "lead.qualify",
          entity: "lead",
          entityId: id,
          summary: `Qualified lead ${lead.reference}`,
        },
        tx,
      );
    });
    refreshCrm();
  });
}

export async function disqualifyLead(id: string, reason: string): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await guard("leads:update");
    const lead = await loadLead(id);
    const why = parse(reasonSchema, reason);
    const blocked = checkDisqualify(lead, why);
    if (blocked) throw new ActionError(blocked, "rule");

    await prisma.$transaction(async (tx) => {
      await tx.lead.update({
        where: { id },
        data: { status: "disqualified", disqualifiedReason: why },
      });
      await tx.task.updateMany({
        where: { leadId: id, doneAt: null },
        data: { doneAt: new Date() },
      });
      await logActivity(tx, actor, { leadId: id }, "system", `Disqualified: ${why}`);
      await recordAudit(
        actor,
        {
          action: "lead.disqualify",
          entity: "lead",
          entityId: id,
          summary: `Disqualified lead ${lead.reference}: ${why}`,
        },
        tx,
      );
    });
    refreshCrm();
  });
}

export async function reopenLead(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await guard("leads:update");
    const lead = await loadLead(id);
    const blocked = checkReopenLead(lead);
    if (blocked) throw new ActionError(blocked, "rule");

    await prisma.$transaction(async (tx) => {
      await tx.lead.update({ where: { id }, data: { status: "new", disqualifiedReason: null } });
      await logActivity(tx, actor, { leadId: id }, "system", "Reopened");
      await recordAudit(
        actor,
        {
          action: "lead.reopen",
          entity: "lead",
          entityId: id,
          summary: `Reopened lead ${lead.reference}`,
        },
        tx,
      );
    });
    refreshCrm();
  });
}

export interface ConvertInput {
  /** Defaults to "<business or person> - <goals area>". */
  title?: string;
  /** Pesos as typed; optional, can be set later on the deal. */
  amount?: string;
}

/**
 * Turns an enquiry into a contact, an organization (when a business was named)
 * and a deal, in one transaction. An existing contact with the same email is
 * reused instead of duplicated.
 */
export async function convertLead(
  id: string,
  input: ConvertInput = {},
): Promise<ActionResult<{ dealId: string }>> {
  return runAction(async () => {
    const actor = await guard("leads:convert");
    const lead = await loadLead(id);
    const blocked = checkConvert(lead);
    if (blocked) throw new ActionError(blocked, "rule");

    let amountMinor: number | null = null;
    if (input.amount?.trim()) {
      amountMinor = parseMinor(input.amount);
      if (amountMinor === null) {
        throw new ActionError("Enter an amount like 12500 or 12,500.50.", "validation", {
          amount: "Enter an amount like 12500 or 12,500.50.",
        });
      }
    }

    const answers = (lead.answers ?? {}) as Partial<ContactFormData>;
    const ownerId = lead.ownerId ?? actorId(actor);

    const dealId = await prisma.$transaction(async (tx) => {
      // Organization: only when the enquirer named a business.
      let organizationId: string | undefined;
      const businessName = lead.businessName?.trim();
      if (businessName) {
        const existing = await tx.organization.findFirst({
          where: { ...live, name: { equals: businessName, mode: "insensitive" } },
        });
        const organization =
          existing ??
          (await tx.organization.create({
            data: {
              name: businessName,
              industry:
                answers.industry === "Other"
                  ? answers.industryOther || undefined
                  : answers.industry || undefined,
              size: answers.businessSize || undefined,
              address: answers.officeAddress || undefined,
              createdBy: actorId(actor),
            },
          }));
        organizationId = organization.id;
      }

      // Contact: the lead's own link, then any live contact with this email, else a new one.
      const existingContact = lead.contactId
        ? await tx.contact.findFirst({ where: { id: lead.contactId, ...live } })
        : await findLiveContactByEmail(tx, lead.email);
      const contact =
        existingContact ??
        (await tx.contact.create({
          data: {
            firstName: lead.firstName,
            lastName: lead.lastName,
            email: lead.email.toLowerCase(),
            phone: lead.phone ?? undefined,
            position:
              answers.position === "Other"
                ? answers.positionOther || undefined
                : answers.position || undefined,
            organizationId,
            ownerId,
            source: "website",
            createdBy: actorId(actor),
          },
        }));
      if (existingContact && !existingContact.organizationId && organizationId) {
        await tx.contact.update({ where: { id: existingContact.id }, data: { organizationId } });
      }

      const stage = await firstOpenStage(tx, lead.status === "qualified" ? "discovery" : "new");
      if (!stage)
        throw new ActionError("The sales pipeline has no stages. Add one in the database first.");

      const title =
        input.title?.trim() ||
        `${businessName || fullName(lead)} - ${lead.goalsArea || "New project"}`.slice(0, 200);
      const deal = await tx.deal.create({
        data: {
          title,
          contactId: contact.id,
          organizationId: organizationId ?? contact.organizationId ?? undefined,
          stageId: stage.id,
          amountMinor: amountMinor === null ? undefined : BigInt(amountMinor),
          ownerId,
          source: "website",
          description: buildEnquirySummary(answers as ContactFormData),
          leadId: lead.id,
          createdBy: actorId(actor),
        },
      });

      await tx.lead.update({
        where: { id: lead.id },
        data: { status: "converted", contactId: contact.id, convertedAt: new Date(), ownerId },
      });
      await logActivity(
        tx,
        actor,
        { dealId: deal.id },
        "system",
        `Created from website enquiry ${lead.reference}`,
      );
      await logActivity(
        tx,
        actor,
        { leadId: lead.id },
        "system",
        `Converted to deal ${deal.reference}`,
      );
      await recordAudit(
        actor,
        {
          action: "lead.convert",
          entity: "lead",
          entityId: lead.id,
          summary: `Converted lead ${lead.reference} into deal ${deal.reference}`,
          metadata: {
            dealId: deal.id,
            contactId: contact.id,
            reusedContact: Boolean(existingContact),
          },
        },
        tx,
      );
      return deal.id;
    });

    refreshCrm();
    return { dealId };
  });
}

export async function deleteLead(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await guard("leads:delete");
    const lead = await loadLead(id);
    const blocked = checkLeadDelete(lead);
    if (blocked) throw new ActionError(blocked, "rule");

    await prisma.$transaction(async (tx) => {
      await tx.lead.update({ where: { id }, data: { deletedAt: new Date() } });
      await recordAudit(
        actor,
        {
          action: "lead.delete",
          entity: "lead",
          entityId: id,
          summary: `Deleted lead ${lead.reference}`,
        },
        tx,
      );
    });
    refreshCrm();
  });
}
