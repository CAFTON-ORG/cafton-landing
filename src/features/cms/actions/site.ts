"use server";

import { revalidatePath } from "next/cache";

import {
  ActionError,
  NOT_CONFIGURED,
  actorId,
  parse,
  runAction,
  type ActionResult,
} from "@/lib/actions";
import { recordAudit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth/dal";
import { prisma } from "@/lib/db";
import { isDatabaseConfigured } from "@/lib/env";
import { siteSettingsSchema } from "../schemas/core";
import type { SiteSettings } from "../types/core";

/** Saves the company facts and social links. They show on every public page, so the whole site is refreshed. */
export async function saveSiteSettings(input: SiteSettings): Promise<ActionResult<void>> {
  return runAction(async () => {
    const actor = await requirePermission("settings:update");
    if (!isDatabaseConfigured) throw new ActionError(NOT_CONFIGURED);
    const data = parse(siteSettingsSchema, input);

    await prisma.$transaction(async (tx) => {
      await tx.siteContent.upsert({
        where: { key: "settings" },
        create: { key: "settings", data, updatedById: actorId(actor) },
        update: { data, updatedById: actorId(actor) },
      });
      await recordAudit(
        actor,
        {
          action: "site.settings",
          entity: "site",
          entityId: "settings",
          summary: "Updated the website settings",
        },
        tx,
      );
    });

    revalidatePath("/", "layout");
    revalidatePath("/dashboard/content/site");
    revalidatePath("/dashboard/audit");
  });
}
