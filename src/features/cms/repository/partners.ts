import { z } from "zod";

import { partners } from "@/features/cms/content/partners";
import { parseJson, partnerLinkSchema, partnerLogoSchema } from "@/features/cms/schemas";
import type { Partner, PartnerLink, PartnerLogo } from "@/features/cms/types";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { opt, publicRows, readContent } from "./source";

/**
 * Data access for partners and sponsors. Async on purpose: pages already `await` them.
 * Reads the database once it has content, the bundled content before that (see `source.ts`).
 */

const MISSING_LOGO: PartnerLogo = { src: "/cafton.png", fit: "contain" };

function toPartner(row: Prisma.PartnerGetPayload<object>): Partner {
  const links = parseJson(
    z.array(partnerLinkSchema),
    row.links,
    [] as PartnerLink[],
    `links of partner ${row.slug}`,
  );
  return {
    name: row.name,
    shortName: row.shortName,
    logo: parseJson(partnerLogoSchema, row.logo, MISSING_LOGO, `logo of partner ${row.slug}`),
    ...(row.roles.length > 0 && { roles: row.roles }),
    ...(row.featured && { featured: true }),
    description: opt(row.description),
    ...(links.length > 0 && { links }),
  };
}

export async function listPartners(): Promise<Partner[]> {
  return readContent(
    "partners",
    {
      populated: () => prisma.partner.count(),
      query: async () => {
        const rows = await prisma.partner.findMany({
          where: publicRows,
          orderBy: [{ position: "asc" }, { createdAt: "asc" }],
        });
        return rows.map(toPartner);
      },
    },
    () => partners,
  );
}
