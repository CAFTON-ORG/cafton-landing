"use server";

import { revalidatePath } from "next/cache";

import { guard } from "@/features/crm/actions/guard";
import { ActionError, actorId, parse, runAction, type ActionResult } from "@/lib/actions";
import { recordAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { templateSchema, type TemplateInput } from "../schemas";

const refresh = () => revalidatePath("/dashboard/sales/contracts/templates");

/** Adds or edits a template. Changing a template never changes contracts already made from it. */
export async function saveTemplate(
  id: string | null,
  input: TemplateInput,
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const actor = await guard("contracts:templates");
    const data = parse(templateSchema, input);
    const saved = await prisma.$transaction(async (tx) => {
      if (id) {
        const existing = await tx.contractTemplate.findUnique({ where: { id } });
        if (!existing) throw new ActionError("That template no longer exists.");
        const template = await tx.contractTemplate.update({ where: { id }, data });
        await recordAudit(
          actor,
          {
            action: "contract_template.update",
            entity: "contract_template",
            entityId: id,
            summary: `Edited the template ${template.name}`,
          },
          tx,
        );
        return template;
      }
      const template = await tx.contractTemplate.create({
        data: { ...data, createdBy: actorId(actor) },
      });
      await recordAudit(
        actor,
        {
          action: "contract_template.create",
          entity: "contract_template",
          entityId: template.id,
          summary: `Added the template ${template.name}`,
        },
        tx,
      );
      return template;
    });
    refresh();
    return { id: saved.id };
  });
}

/** A template used by a contract is kept (switch it off instead); an unused one can go. */
export async function deleteTemplate(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await guard("contracts:templates");
    await prisma.$transaction(async (tx) => {
      const template = await tx.contractTemplate.findUnique({
        where: { id },
        include: { _count: { select: { contracts: true } } },
      });
      if (!template) throw new ActionError("That template no longer exists.");
      if (template._count.contracts > 0) {
        throw new ActionError(
          "Contracts were made from it, so it can't be deleted. Switch it to inactive instead.",
          "rule",
        );
      }
      await tx.contractTemplate.delete({ where: { id } });
      await recordAudit(
        actor,
        {
          action: "contract_template.delete",
          entity: "contract_template",
          entityId: id,
          summary: `Deleted the template ${template.name}`,
        },
        tx,
      );
    });
    refresh();
  });
}
