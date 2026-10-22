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
import { isSiteDocumentKey, siteDocuments } from "../site/registry";

/** The pages that show a document and nothing else. A document not listed here is used everywhere. */
const PAGES_OF: Partial<Record<string, string[]>> = {
  careers: ["/careers"],
  about: ["/about"],
  privacy: ["/privacy"],
  legal: ["/legal"],
  contact: ["/contact"],
};

/** Saves one page of site content after checking it against that page's schema. The whole site is refreshed. */
export async function saveSiteDocument(key: string, input: unknown): Promise<ActionResult<void>> {
  return runAction(async () => {
    const actor = await requirePermission("content:update");
    if (!isDatabaseConfigured) throw new ActionError(NOT_CONFIGURED);
    if (!isSiteDocumentKey(key)) throw new ActionError("That page can't be edited.");
    const { schema, spec } = siteDocuments[key];
    const data = parse(schema as never, input) as object;

    await prisma.$transaction(async (tx) => {
      await tx.siteContent.upsert({
        where: { key },
        create: { key, data, updatedById: actorId(actor) },
        update: { data, updatedById: actorId(actor) },
      });
      await recordAudit(
        actor,
        {
          action: "site.page",
          entity: "site",
          entityId: key,
          summary: `Edited the ${spec.title} page`,
        },
        tx,
      );
    });

    // A page's own text refreshes that page. Text that is also in the footer, the menu or the
    // shared call to action refreshes the whole site.
    const pages = PAGES_OF[key];
    if (pages) for (const path of pages) revalidatePath(path);
    else revalidatePath("/", "layout");
    revalidatePath("/sitemap.xml");
    revalidatePath("/dashboard/content/pages", "layout");
    revalidatePath("/dashboard/audit");
  });
}
