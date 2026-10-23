"use server";

import { z } from "zod";

import type { Prisma } from "@/generated/prisma/client";
import { ActionError, actorId, parse, runAction, type ActionResult } from "@/lib/actions";
import { recordAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { mergeCustomValues } from "../custom-fields";
import { mergeValues } from "../duplicates";
import { live } from "../mappers";
import { checkMergeLeads, fullName, mergedLeadStatus, type LeadStatus } from "../rules";
import { normalizeTags } from "../tags";
import { guard, refreshCrm } from "./guard";
import { logActivity } from "./shared";

const schema = z.object({
  primaryId: z.string().uuid(),
  otherIds: z.array(z.string().uuid()).min(1, "Pick at least one to merge.").max(10),
});

/**
 * Merges duplicate contacts into one. Everything that pointed at the others (deals, leads, tasks,
 * meetings, timeline) now points at the kept contact, gaps in its details are filled from the
 * others, tags are combined, and the others are removed. All in one transaction.
 */
export async function mergeContacts(
  input: z.input<typeof schema>,
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const data = parse(schema, input);
    const actor = await guard("contacts:merge");
    if (data.otherIds.includes(data.primaryId))
      throw new ActionError("A contact can't be merged into itself.");

    await prisma.$transaction(async (tx) => {
      const ids = [data.primaryId, ...data.otherIds];
      const rows = await tx.contact.findMany({ where: { id: { in: ids }, ...live } });
      const primary = rows.find((row) => row.id === data.primaryId);
      const others = data.otherIds.map((id) => rows.find((row) => row.id === id));
      if (!primary || others.some((row) => !row))
        throw new ActionError("One of those contacts no longer exists.");
      const losers = others as typeof rows;

      const fill = mergeValues(primary, losers, [
        "phone",
        "position",
        "organizationId",
        "ownerId",
      ] as const);
      const notes =
        [primary.notes, ...losers.map((row) => row.notes)].filter(Boolean).join("\n\n") || null;
      const tags = normalizeTags([...primary.tags, ...losers.flatMap((row) => row.tags)]);
      const custom = mergeCustomValues(
        primary.custom,
        losers.map((row) => row.custom),
      );

      const where = { contactId: { in: data.otherIds } };
      const data2 = { contactId: data.primaryId };
      await tx.deal.updateMany({ where, data: data2 });
      await tx.lead.updateMany({ where, data: data2 });
      await tx.task.updateMany({ where, data: data2 });
      await tx.meeting.updateMany({ where, data: data2 });
      await tx.activity.updateMany({ where, data: data2 });
      await tx.recordFile.updateMany({ where, data: data2 });
      await tx.contact.update({
        where: { id: primary.id },
        data: { ...fill, notes, tags, custom, updatedBy: actorId(actor) },
      });
      await tx.contact.updateMany({
        where: { id: { in: data.otherIds } },
        data: { deletedAt: new Date(), updatedBy: actorId(actor) },
      });
      await logActivity(
        tx,
        actor,
        { contactId: primary.id },
        "system",
        `Merged ${losers.length} duplicate ${losers.length === 1 ? "contact" : "contacts"} into this one: ${losers.map((row) => `${fullName(row)} <${row.email}>`).join(", ")}`,
      );
      await recordAudit(
        actor,
        {
          action: "contact.merge",
          entity: "contact",
          entityId: primary.id,
          summary: `Merged ${losers.length} duplicate contacts into ${fullName(primary)}`,
          metadata: { removed: losers.map((row) => ({ id: row.id, email: row.email })) },
        },
        tx,
      );
    });
    refreshCrm();
    return { id: data.primaryId };
  });
}

/** Merges duplicate organizations: their contacts and deals move to the kept one. */
export async function mergeOrganizations(
  input: z.input<typeof schema>,
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const data = parse(schema, input);
    const actor = await guard("organizations:merge");
    if (data.otherIds.includes(data.primaryId))
      throw new ActionError("An organization can't be merged into itself.");

    await prisma.$transaction(async (tx) => {
      const rows = await tx.organization.findMany({
        where: { id: { in: [data.primaryId, ...data.otherIds] }, ...live },
      });
      const primary = rows.find((row) => row.id === data.primaryId);
      const losers = data.otherIds.map((id) => rows.find((row) => row.id === id));
      if (!primary || losers.some((row) => !row))
        throw new ActionError("One of those organizations no longer exists.");
      const others = losers as typeof rows;

      const fill = mergeValues(primary, others, [
        "industry",
        "size",
        "website",
        "phone",
        "address",
      ] as const);
      const notes =
        [primary.notes, ...others.map((row) => row.notes)].filter(Boolean).join("\n\n") || null;
      const tags = normalizeTags([...primary.tags, ...others.flatMap((row) => row.tags)]);
      const custom = mergeCustomValues(
        primary.custom,
        others.map((row) => row.custom),
      );

      const where = { organizationId: { in: data.otherIds } };
      await tx.contact.updateMany({ where, data: { organizationId: primary.id } });
      await tx.deal.updateMany({ where, data: { organizationId: primary.id } });
      await tx.recordFile.updateMany({ where, data: { organizationId: primary.id } });
      await tx.organization.update({
        where: { id: primary.id },
        data: { ...fill, notes, tags, custom, updatedBy: actorId(actor) },
      });
      await tx.organization.updateMany({
        where: { id: { in: data.otherIds } },
        data: { deletedAt: new Date(), updatedBy: actorId(actor) },
      });
      await recordAudit(
        actor,
        {
          action: "organization.merge",
          entity: "organization",
          entityId: primary.id,
          summary: `Merged ${others.length} duplicate organizations into ${primary.name}`,
          metadata: { removed: others.map((row) => ({ id: row.id, name: row.name })) },
        },
        tx,
      );
    });
    refreshCrm();
    return { id: data.primaryId };
  });
}

/**
 * Merges duplicate leads (the same person enquiring more than once) into one. Their timeline,
 * tasks and meetings move to the kept lead, gaps in its details are filled, tags are combined, and
 * the others are removed. A converted lead can't be merged. All in one transaction.
 */
export async function mergeLeads(
  input: z.input<typeof schema>,
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const data = parse(schema, input);
    const actor = await guard("leads:merge");
    if (data.otherIds.includes(data.primaryId))
      throw new ActionError("A lead can't be merged into itself.");

    await prisma.$transaction(async (tx) => {
      const rows = await tx.lead.findMany({
        where: { id: { in: [data.primaryId, ...data.otherIds] }, ...live },
      });
      const primary = rows.find((row) => row.id === data.primaryId);
      const others = data.otherIds.map((id) => rows.find((row) => row.id === id));
      if (!primary || others.some((row) => !row))
        throw new ActionError("One of those leads no longer exists.");
      const losers = others as typeof rows;
      const blocked = checkMergeLeads(rows);
      if (blocked) throw new ActionError(blocked, "rule");

      const fill = mergeValues(primary, losers, [
        "phone",
        "businessName",
        "goalsArea",
        "budget",
        "timeline",
        "ownerId",
        "contactId",
      ] as const);
      const tags = normalizeTags([...primary.tags, ...losers.flatMap((row) => row.tags)]);
      const status = mergedLeadStatus(
        primary.status as LeadStatus,
        losers.map((row) => row.status as LeadStatus),
      );
      const custom = mergeCustomValues(
        primary.custom,
        losers.map((row) => row.custom),
      );

      const where = { leadId: { in: data.otherIds } };
      const to = { leadId: data.primaryId };
      await tx.activity.updateMany({ where, data: to });
      await tx.task.updateMany({ where, data: to });
      await tx.meeting.updateMany({ where, data: to });
      await tx.recordFile.updateMany({ where, data: to });
      await tx.lead.update({
        where: { id: primary.id },
        data: { ...(fill as Prisma.LeadUncheckedUpdateInput), tags, status, custom },
      });
      await tx.lead.updateMany({
        where: { id: { in: data.otherIds } },
        data: { deletedAt: new Date() },
      });
      await logActivity(
        tx,
        actor,
        { leadId: primary.id },
        "system",
        `Merged ${losers.length} duplicate ${losers.length === 1 ? "lead" : "leads"} into this one: ${losers.map((row) => `${row.reference} (${row.email})`).join(", ")}`,
      );
      await recordAudit(
        actor,
        {
          action: "lead.merge",
          entity: "lead",
          entityId: primary.id,
          summary: `Merged ${losers.length} duplicate leads into ${primary.reference}`,
          metadata: { removed: losers.map((row) => ({ id: row.id, reference: row.reference })) },
        },
        tx,
      );
    });
    refreshCrm();
    return { id: data.primaryId };
  });
}
