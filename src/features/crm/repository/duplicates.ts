import "server-only";

import { prisma } from "@/lib/db";
import { isDatabaseConfigured } from "@/lib/env";
import {
  findContactDuplicates,
  findOrganizationDuplicates,
  type DuplicateGroup,
} from "../duplicates";
import { live } from "../mappers";

export interface DuplicateContact {
  id: string;
  name: string;
  email: string;
  phone?: string;
  position?: string;
  organizationId?: string;
  organizationName?: string;
  firstName: string;
  lastName: string;
  dealCount: number;
  createdAt: string;
}

export interface DuplicateOrganization {
  id: string;
  name: string;
  website?: string | null;
  industry?: string;
  contactCount: number;
  dealCount: number;
  createdAt: string;
}

const CAP = 5000;

/** Contacts that look like the same person, in groups. Oldest record first in each group. */
export async function listDuplicateContacts(): Promise<DuplicateGroup<DuplicateContact>[]> {
  if (!isDatabaseConfigured) return [];
  const rows = await prisma.contact.findMany({
    where: live,
    take: CAP,
    orderBy: { createdAt: "asc" },
    include: {
      organization: { select: { name: true } },
      _count: { select: { deals: { where: live } } },
    },
  });
  const contacts: DuplicateContact[] = rows.map((row) => ({
    id: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    name: `${row.firstName} ${row.lastName}`.trim(),
    email: row.email,
    phone: row.phone ?? undefined,
    position: row.position ?? undefined,
    organizationId: row.organizationId ?? undefined,
    organizationName: row.organization?.name,
    dealCount: row._count.deals,
    createdAt: row.createdAt.toISOString(),
  }));
  return findContactDuplicates(contacts);
}

export async function listDuplicateOrganizations(): Promise<
  DuplicateGroup<DuplicateOrganization>[]
> {
  if (!isDatabaseConfigured) return [];
  const rows = await prisma.organization.findMany({
    where: live,
    take: CAP,
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { contacts: { where: live }, deals: { where: live } } } },
  });
  const organizations: DuplicateOrganization[] = rows.map((row) => ({
    id: row.id,
    name: row.name,
    website: row.website,
    industry: row.industry ?? undefined,
    contactCount: row._count.contacts,
    dealCount: row._count.deals,
    createdAt: row.createdAt.toISOString(),
  }));
  return findOrganizationDuplicates(organizations);
}
