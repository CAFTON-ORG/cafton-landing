import "server-only";
import { withActivity } from "./summary";

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { isDatabaseConfigured } from "@/lib/env";
import { fetchPage, type Page } from "@/lib/pagination";
import type { TableParams } from "@/lib/table-params";
import { live, namesFor, toContact } from "../mappers";
import type { ContactView } from "../types";

const include = {
  organization: { select: { name: true } },
  _count: { select: { deals: { where: live } } },
} satisfies Prisma.ContactInclude;

export async function listContacts(params: TableParams): Promise<Page<ContactView>> {
  if (!isDatabaseConfigured)
    return { items: [], total: 0, page: 1, pageSize: params.pageSize, pageCount: 1 };

  const q = params.q.trim();
  const where: Prisma.ContactWhereInput = {
    ...live,
    ...(params.filters.tag ? { tags: { has: params.filters.tag } } : {}),
    ...(q
      ? {
          OR: [
            { firstName: { contains: q, mode: "insensitive" } },
            { lastName: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { organization: { name: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };
  const dir = params.dir;
  const orderBy: Prisma.ContactOrderByWithRelationInput =
    params.sort === "organization"
      ? { organization: { name: dir } }
      : params.sort === "created"
        ? { createdAt: dir }
        : { lastName: dir };

  const { rows, base } = await fetchPage(
    params,
    () => prisma.contact.count({ where }),
    (skip, take) => prisma.contact.findMany({ where, include, orderBy, skip, take }),
  );
  const names = await namesFor(rows.map((row) => row.ownerId));
  return {
    ...base,
    items: await withActivity(
      "contact",
      rows.map((row) => toContact(row, names)),
    ),
  };
}

export async function getContact(id: string): Promise<ContactView | null> {
  if (!isDatabaseConfigured) return null;
  const row = await prisma.contact.findFirst({ where: { id, ...live }, include }).catch(() => null);
  if (!row) return null;
  return toContact(row, await namesFor([row.ownerId]));
}

/** Up to 300 contacts for a picker, alphabetical. */
export async function listContactOptions(): Promise<
  { id: string; name: string; email: string; organizationId?: string }[]
> {
  if (!isDatabaseConfigured) return [];
  const rows = await prisma.contact.findMany({
    where: live,
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    take: 300,
    select: { id: true, firstName: true, lastName: true, email: true, organizationId: true },
  });
  return rows.map((row) => ({
    id: row.id,
    name: `${row.firstName} ${row.lastName}`.trim(),
    email: row.email,
    organizationId: row.organizationId ?? undefined,
  }));
}

/** Everyone linked to an organization, for its page. */
export async function listContactsFor(organizationId: string) {
  if (!isDatabaseConfigured) return [];
  return prisma.contact.findMany({
    where: { organizationId, ...live },
    orderBy: { lastName: "asc" },
    select: { id: true, firstName: true, lastName: true, email: true, position: true },
  });
}
