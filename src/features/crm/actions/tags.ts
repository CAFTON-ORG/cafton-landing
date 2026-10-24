"use server";

import { z } from "zod";

import { ActionError, parse, runAction, type ActionResult } from "@/lib/actions";
import { recordAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import type { Permission } from "@/lib/auth/permissions";
import { live } from "../repository/mappers";
import { TAGGABLE, normalizeTags } from "../rules/tags";
import { guard, refreshCrm } from "./guard";

const PERMISSION = {
  lead: "leads:update",
  contact: "contacts:update",
  organization: "organizations:update",
  deal: "deals:update",
} as const satisfies Record<(typeof TAGGABLE)[number], Permission>;

const schema = z.object({
  kind: z.enum(TAGGABLE),
  id: z.string().uuid(),
  tags: z.array(z.string().max(100)).max(60),
});

/** Replaces the tags of one record. */
export async function setTags(
  input: z.input<typeof schema>,
): Promise<ActionResult<{ tags: string[] }>> {
  return runAction(async () => {
    const data = parse(schema, input);
    const actor = await guard(PERMISSION[data.kind]);
    const tags = normalizeTags(data.tags);
    const where = { id: data.id, ...live };

    await prisma.$transaction(async (tx) => {
      const updated =
        data.kind === "lead"
          ? await tx.lead.updateMany({ where, data: { tags } })
          : data.kind === "contact"
            ? await tx.contact.updateMany({ where, data: { tags } })
            : data.kind === "organization"
              ? await tx.organization.updateMany({ where, data: { tags } })
              : await tx.deal.updateMany({ where, data: { tags } });
      if (updated.count === 0) throw new ActionError("That record no longer exists.");
      await recordAudit(
        actor,
        {
          action: `${data.kind}.tags`,
          entity: data.kind,
          entityId: data.id,
          summary: tags.length
            ? `Tagged ${data.kind}: ${tags.join(", ")}`
            : `Cleared the tags of a ${data.kind}`,
        },
        tx,
      );
    });
    refreshCrm();
    return { tags };
  });
}
