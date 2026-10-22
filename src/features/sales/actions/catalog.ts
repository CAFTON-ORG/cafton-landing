"use server";

import { revalidatePath } from "next/cache";

import { guard } from "@/features/crm/actions/guard";
import { ActionError, actorId, parse, runAction, type ActionResult } from "@/lib/actions";
import { recordAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { catalogItemSchema, type CatalogItemInput } from "../schemas";
import type { PricingModel } from "../types";

const refresh = () => revalidatePath("/dashboard/sales/catalog");

export async function saveCatalogItem(
  id: string | null,
  input: CatalogItemInput,
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const actor = await guard("catalog:manage");
    const data = parse(catalogItemSchema, input);
    const values = {
      name: data.name,
      description: data.description ?? null,
      pricingModel: data.pricingModel as PricingModel,
      unitPriceMinor: BigInt(data.price),
      unitLabel: data.unitLabel,
      taxable: data.taxable,
      active: data.active,
    };
    const saved = await prisma.$transaction(async (tx) => {
      if (id) {
        const existing = await tx.catalogItem.findUnique({ where: { id } });
        if (!existing) throw new ActionError("That item no longer exists.");
        const item = await tx.catalogItem.update({ where: { id }, data: values });
        await recordAudit(
          actor,
          {
            action: "catalog.update",
            entity: "catalog_item",
            entityId: id,
            summary: `Edited ${item.name}`,
          },
          tx,
        );
        return item;
      }
      const item = await tx.catalogItem.create({ data: { ...values, createdBy: actorId(actor) } });
      await recordAudit(
        actor,
        {
          action: "catalog.create",
          entity: "catalog_item",
          entityId: item.id,
          summary: `Added ${item.name} to the catalog`,
        },
        tx,
      );
      return item;
    });
    refresh();
    return { id: saved.id };
  });
}

/** Items used on a quote are kept (a quote is a record); they are deactivated instead of deleted. */
export async function deleteCatalogItem(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await guard("catalog:manage");
    await prisma.$transaction(async (tx) => {
      const item = await tx.catalogItem.findUnique({
        where: { id },
        include: { _count: { select: { lines: true } } },
      });
      if (!item) throw new ActionError("That item no longer exists.");
      if (item._count.lines > 0) {
        throw new ActionError(
          "It is on a quote, so it can't be deleted. Switch it to inactive instead.",
          "rule",
        );
      }
      await tx.catalogItem.delete({ where: { id } });
      await recordAudit(
        actor,
        {
          action: "catalog.delete",
          entity: "catalog_item",
          entityId: id,
          summary: `Deleted ${item.name} from the catalog`,
        },
        tx,
      );
    });
    refresh();
  });
}
