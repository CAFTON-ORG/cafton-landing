import "server-only";
import { customFilterWhere } from "./custom-fields";

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { isDatabaseConfigured } from "@/lib/env";
import { paginate, type Page } from "@/lib/pagination";
import type { TableParams } from "@/lib/table-params";
import { live, toOrganization } from "./mappers";
import type { OrganizationView } from "../types";

const include = {
  _count: { select: { contacts: { where: live }, deals: { where: live } } },
} satisfies Prisma.OrganizationInclude;

export async function listOrganizations(params: TableParams): Promise<Page<OrganizationView>> {
  if (!isDatabaseConfigured)
    return { items: [], total: 0, page: 1, pageSize: params.pageSize, pageCount: 1 };

  const q = params.q.trim();
  const custom = await customFilterWhere("organization", params.filters);
  const where: Prisma.OrganizationWhereInput = {
    ...live,
    ...(custom.length ? { AND: custom } : {}),
    ...(params.filters.tag ? { tags: { has: params.filters.tag } } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { industry: { contains: q, mode: "insensitive" } },
            { website: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const orderBy: Prisma.OrganizationOrderByWithRelationInput =
    params.sort === "created" ? { createdAt: params.dir } : { name: params.dir };

  const total = await prisma.organization.count({ where });
  const base = paginate(new Array(total), params.page, params.pageSize);
  const rows = await prisma.organization.findMany({
    where,
    include,
    orderBy,
    skip: (base.page - 1) * base.pageSize,
    take: base.pageSize,
  });
  return { ...base, items: rows.map(toOrganization) };
}

export async function getOrganization(id: string): Promise<OrganizationView | null> {
  if (!isDatabaseConfigured) return null;
  const row = await prisma.organization
    .findFirst({ where: { id, ...live }, include })
    .catch(() => null);
  return row ? toOrganization(row) : null;
}

export async function listOrganizationOptions(): Promise<{ id: string; name: string }[]> {
  if (!isDatabaseConfigured) return [];
  return prisma.organization.findMany({
    where: live,
    orderBy: { name: "asc" },
    take: 300,
    select: { id: true, name: true },
  });
}
