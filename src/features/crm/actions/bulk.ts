"use server";

import { z } from "zod";

import { notify } from "@/features/notifications/server";
import { ActionError, actorId, parse, runAction, type ActionResult } from "@/lib/actions";
import { recordAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { live } from "../mappers";
import {
  checkContactDelete,
  checkDealDelete,
  checkLeadDelete,
  checkOrganizationDelete,
} from "../rules";
import { checkDealDelete as checkQuotesBlockDelete } from "@/features/sales/rules";
import { quoteStatusesFor } from "@/features/sales/server";
import { checkDealDelete as checkContractsBlockDelete } from "@/features/contracts/rules";
import { contractStatusesFor } from "@/features/contracts/server";
import { TAGGABLE, normalizeTags } from "../tags";
import { guard, refreshCrm } from "./guard";

/** One click on a list can change at most this many rows. */
const MAX_ROWS = 200;

export interface BulkResult {
  done: number;
  skipped: number;
  /** Why some were skipped, one line each, without repeats. */
  reasons: string[];
}

const base = {
  kind: z.enum(TAGGABLE),
  ids: z.array(z.string().uuid()).min(1, "Select at least one row.").max(MAX_ROWS),
};

const assignSchema = z.object({ ...base, ownerId: z.string().uuid().nullable() });
const tagSchema = z.object({
  ...base,
  add: z.array(z.string().max(100)).max(15).default([]),
  remove: z.array(z.string().max(100)).max(15).default([]),
});
const deleteSchema = z.object(base);

const result = (done: number, reasons: string[], total: number): BulkResult => ({
  done,
  skipped: total - done,
  reasons: [...new Set(reasons)],
});

/** Gives the selected leads, contacts or deals to one person (or to nobody). */
export async function bulkAssign(
  input: z.input<typeof assignSchema>,
): Promise<ActionResult<BulkResult>> {
  return runAction(async () => {
    const data = parse(assignSchema, input);
    if (data.kind === "organization") throw new ActionError("Organizations have no owner.");
    const actor = await guard(
      data.kind === "lead"
        ? "leads:update"
        : data.kind === "deal"
          ? "deals:update"
          : "contacts:update",
    );
    if (data.ownerId) {
      const owner = await prisma.profile.findUnique({
        where: { id: data.ownerId },
        select: { id: true },
      });
      if (!owner) throw new ActionError("That person no longer has access.");
    }
    const where = { id: { in: data.ids }, ...live };
    const updated = await prisma.$transaction(async (tx) => {
      const count =
        data.kind === "lead"
          ? (await tx.lead.updateMany({ where, data: { ownerId: data.ownerId } })).count
          : data.kind === "deal"
            ? (await tx.deal.updateMany({ where, data: { ownerId: data.ownerId } })).count
            : (await tx.contact.updateMany({ where, data: { ownerId: data.ownerId } })).count;
      await recordAudit(
        actor,
        {
          action: `${data.kind}.bulk-assign`,
          entity: data.kind,
          summary: `${data.ownerId ? "Assigned" : "Unassigned"} ${count} ${data.kind}${count === 1 ? "" : "s"} in bulk`,
        },
        tx,
      );
      return count;
    });
    await notify(
      [data.ownerId],
      {
        kind: `${data.kind}.assigned`,
        title: `${updated} ${data.kind}${updated === 1 ? " was" : "s were"} assigned to you`,
        href: `/dashboard/crm/${data.kind}s?owner=me`,
      },
      actorId(actor),
    );
    refreshCrm();
    return result(updated, [], data.ids.length);
  });
}

/** Adds and/or removes tags on the selected rows. */
export async function bulkTag(input: z.input<typeof tagSchema>): Promise<ActionResult<BulkResult>> {
  return runAction(async () => {
    const data = parse(tagSchema, input);
    const actor = await guard(
      data.kind === "lead"
        ? "leads:update"
        : data.kind === "deal"
          ? "deals:update"
          : data.kind === "contact"
            ? "contacts:update"
            : "organizations:update",
    );
    const add = normalizeTags(data.add);
    const remove = new Set(normalizeTags(data.remove));
    if (add.length === 0 && remove.size === 0) throw new ActionError("Type a tag first.");

    const rows =
      data.kind === "lead"
        ? await prisma.lead.findMany({
            where: { id: { in: data.ids }, ...live },
            select: { id: true, tags: true },
          })
        : data.kind === "deal"
          ? await prisma.deal.findMany({
              where: { id: { in: data.ids }, ...live },
              select: { id: true, tags: true },
            })
          : data.kind === "contact"
            ? await prisma.contact.findMany({
                where: { id: { in: data.ids }, ...live },
                select: { id: true, tags: true },
              })
            : await prisma.organization.findMany({
                where: { id: { in: data.ids }, ...live },
                select: { id: true, tags: true },
              });

    await prisma.$transaction(async (tx) => {
      for (const row of rows) {
        const tags = normalizeTags([...row.tags.filter((tag) => !remove.has(tag)), ...add]);
        const where = { id: row.id };
        if (data.kind === "lead") await tx.lead.update({ where, data: { tags } });
        else if (data.kind === "deal") await tx.deal.update({ where, data: { tags } });
        else if (data.kind === "contact") await tx.contact.update({ where, data: { tags } });
        else await tx.organization.update({ where, data: { tags } });
      }
      await recordAudit(
        actor,
        {
          action: `${data.kind}.bulk-tag`,
          entity: data.kind,
          summary: `Tagged ${rows.length} ${data.kind}${rows.length === 1 ? "" : "s"} in bulk (${[...add.map((t) => `+${t}`), ...[...remove].map((t) => `-${t}`)].join(", ")})`,
        },
        tx,
      );
    });
    refreshCrm();
    return result(rows.length, [], data.ids.length);
  });
}

/** Deletes the selected rows that the rules allow, and says why it kept the others. */
export async function bulkDelete(
  input: z.input<typeof deleteSchema>,
): Promise<ActionResult<BulkResult>> {
  return runAction(async () => {
    const data = parse(deleteSchema, input);
    const actor = await guard(
      data.kind === "lead"
        ? "leads:delete"
        : data.kind === "deal"
          ? "deals:delete"
          : data.kind === "contact"
            ? "contacts:delete"
            : "organizations:delete",
    );
    const reasons: string[] = [];
    let done = 0;
    const now = new Date();

    await prisma.$transaction(async (tx) => {
      for (const id of data.ids) {
        let blocked: string | null = null;
        if (data.kind === "lead") {
          const row = await tx.lead.findFirst({ where: { id, ...live } });
          if (!row) continue;
          blocked = checkLeadDelete(row);
          if (!blocked) await tx.lead.update({ where: { id }, data: { deletedAt: now } });
        } else if (data.kind === "deal") {
          const row = await tx.deal.findFirst({ where: { id, ...live }, include: { stage: true } });
          if (!row) continue;
          blocked =
            checkDealDelete({
              stageKind: row.stage.kind,
              amountMinor: row.amountMinor === null ? null : Number(row.amountMinor),
            }) ??
            checkQuotesBlockDelete(await quoteStatusesFor(tx, id)) ??
            checkContractsBlockDelete(await contractStatusesFor(tx, id));
          if (!blocked)
            await tx.deal.update({
              where: { id },
              data: { deletedAt: now, updatedBy: actorId(actor) },
            });
        } else if (data.kind === "contact") {
          const row = await tx.contact.findFirst({ where: { id, ...live } });
          if (!row) continue;
          blocked = checkContactDelete({
            liveDeals: await tx.deal.count({ where: { contactId: id, ...live } }),
          });
          if (!blocked)
            await tx.contact.update({
              where: { id },
              data: { deletedAt: now, updatedBy: actorId(actor) },
            });
        } else {
          const row = await tx.organization.findFirst({ where: { id, ...live } });
          if (!row) continue;
          blocked = checkOrganizationDelete({
            contacts: await tx.contact.count({ where: { organizationId: id, ...live } }),
            deals: await tx.deal.count({ where: { organizationId: id, ...live } }),
          });
          if (!blocked)
            await tx.organization.update({
              where: { id },
              data: { deletedAt: now, updatedBy: actorId(actor) },
            });
        }
        if (blocked) reasons.push(blocked);
        else done += 1;
      }
      await recordAudit(
        actor,
        {
          action: `${data.kind}.bulk-delete`,
          entity: data.kind,
          summary: `Deleted ${done} ${data.kind}${done === 1 ? "" : "s"} in bulk`,
        },
        tx,
      );
    });
    refreshCrm();
    return result(done, reasons, data.ids.length);
  });
}
