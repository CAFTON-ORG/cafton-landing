import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { isDatabaseConfigured } from "@/lib/env";
import { paginate, type Page } from "@/lib/pagination";
import type { TableParams } from "@/lib/table-params";
import { live, namesFor, toLead } from "../mappers";
import type { LeadView } from "../types";

const include = { deal: { select: { id: true } } } as const;

const emptyPage = (pageSize: number): Page<LeadView> => ({
  items: [],
  total: 0,
  page: 1,
  pageSize,
  pageCount: 1,
});

export async function listLeads(
  params: TableParams,
  staffId?: string | null,
): Promise<Page<LeadView>> {
  if (!isDatabaseConfigured) return emptyPage(params.pageSize);

  const q = params.q.trim();
  const where: Prisma.LeadWhereInput = {
    ...live,
    ...(params.filters.status ? { status: params.filters.status as LeadView["status"] } : {}),
    ...(params.filters.owner === "me" && staffId ? { ownerId: staffId } : {}),
    ...(params.filters.owner === "unassigned" ? { ownerId: null } : {}),
    ...(q
      ? {
          OR: [
            { firstName: { contains: q, mode: "insensitive" } },
            { lastName: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { businessName: { contains: q, mode: "insensitive" } },
            { reference: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const dir = params.dir;
  const orderBy: Prisma.LeadOrderByWithRelationInput =
    params.sort === "name"
      ? { lastName: dir }
      : params.sort === "status"
        ? { status: dir }
        : { createdAt: dir };

  const total = await prisma.lead.count({ where });
  const base = paginate(new Array(total), params.page, params.pageSize); // page maths only
  const rows = await prisma.lead.findMany({
    where,
    include,
    orderBy,
    skip: (base.page - 1) * base.pageSize,
    take: base.pageSize,
  });
  const names = await namesFor(rows.map((row) => row.ownerId));
  return { ...base, items: rows.map((row) => toLead(row, names)) };
}

export async function getLead(
  id: string,
): Promise<{ lead: LeadView; answers: Record<string, unknown> } | null> {
  if (!isDatabaseConfigured) return null;
  const row = await prisma.lead.findFirst({ where: { id, ...live }, include }).catch(() => null);
  if (!row) return null;
  const names = await namesFor([row.ownerId]);
  const answers = (row.answers && typeof row.answers === "object" ? row.answers : {}) as Record<
    string,
    unknown
  >;
  return { lead: toLead(row, names), answers };
}

/** Leads nobody has looked at yet: the badge on the menu and the overview. */
export async function countNewLeads(): Promise<number> {
  if (!isDatabaseConfigured) return 0;
  return prisma.lead.count({ where: { ...live, status: "new" } });
}
