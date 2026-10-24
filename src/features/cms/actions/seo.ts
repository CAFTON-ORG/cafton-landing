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
import { seoPages } from "../content/seo-pages";
import { seoDocumentSchema } from "../schemas/core";
import type { SeoDocument } from "../types/core";

/** Saves the search and share text of the fixed pages. Empty fields are dropped so the default applies. */
export async function saveSeo(input: SeoDocument): Promise<ActionResult<void>> {
  return runAction(async () => {
    const actor = await requirePermission("settings:update");
    if (!isDatabaseConfigured) throw new ActionError(NOT_CONFIGURED);

    const known = new Set(seoPages.map((page) => page.key));
    const pages: SeoDocument["pages"] = {};
    for (const [key, override] of Object.entries(input.pages ?? {})) {
      if (!known.has(key)) continue;
      const clean = {
        ...(override.title?.trim() && { title: override.title.trim() }),
        ...(override.description?.trim() && { description: override.description.trim() }),
        ...(override.noindex !== undefined && { noindex: override.noindex }),
        ...(override.image?.url && { image: override.image }),
      };
      if (Object.keys(clean).length > 0) pages[key] = clean;
    }
    const data = parse(seoDocumentSchema, { pages });

    await prisma.$transaction(async (tx) => {
      await tx.siteContent.upsert({
        where: { key: "seo" },
        create: { key: "seo", data, updatedById: actorId(actor) },
        update: { data, updatedById: actorId(actor) },
      });
      await recordAudit(
        actor,
        {
          action: "site.seo",
          entity: "site",
          entityId: "seo",
          summary: "Updated the search and sharing text of the website pages",
        },
        tx,
      );
    });

    revalidatePath("/", "layout");
    revalidatePath("/sitemap.xml");
    revalidatePath("/dashboard/content/site/seo");
    revalidatePath("/dashboard/audit");
  });
}
