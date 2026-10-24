import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { namesFor } from "@/features/crm/repository/mappers";
import { fullName } from "@/features/crm/rules/core";
import { manilaDate } from "@/features/schedule/rules/slots";
import { TOKEN_SHAPE, hashToken } from "@/features/sales/services/integrity";
import { prisma } from "@/lib/db";
import { isDatabaseConfigured } from "@/lib/env";
import { paginate, type Page } from "@/lib/pagination";
import type { TableParams } from "@/lib/table-params";
import { effectiveStatus, type ContractKind, type ContractStatus } from "../rules/core";
import type {
  ContractRow,
  ContractView,
  PublicContract,
  QuoteChoice,
  TemplateView,
} from "../types";

const day = (date: Date | null) => (date ? date.toISOString().slice(0, 10) : undefined);
const iso = (date: Date | null) => (date ? date.toISOString() : undefined);
const today = () => manilaDate(new Date());

/* -------------------------------------------------------------- templates */

export async function listTemplates(
  options: { activeOnly?: boolean } = {},
): Promise<TemplateView[]> {
  if (!isDatabaseConfigured) return [];
  const rows = await prisma.contractTemplate.findMany({
    where: options.activeOnly ? { active: true } : {},
    orderBy: [{ active: "desc" }, { kind: "asc" }, { name: "asc" }],
    include: { _count: { select: { contracts: true } } },
  });
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    kind: row.kind as ContractKind,
    body: row.body,
    active: row.active,
    used: row._count.contracts,
  }));
}

/* -------------------------------------------------------------- contracts */

const include = {
  deal: {
    select: {
      id: true,
      title: true,
      contact: { select: { firstName: true, lastName: true, email: true } },
    },
  },
  quote: { select: { reference: true, version: true } },
  template: { select: { name: true } },
} satisfies Prisma.ContractInclude;

type Full = Prisma.ContractGetPayload<{ include: typeof include }>;
type People = Map<string, { name: string; avatarUrl?: string }>;

const toRow = (row: Full, people: People): ContractRow => ({
  id: row.id,
  reference: row.reference,
  kind: row.kind as ContractKind,
  title: row.title,
  status: effectiveStatus(
    { status: row.status as ContractStatus, validUntil: day(row.validUntil) },
    today(),
  ),
  dealId: row.dealId,
  dealTitle: row.deal.title,
  contactName: fullName(row.deal.contact),
  quoteReference: row.quote ? `${row.quote.reference} v${row.quote.version}` : undefined,
  createdByName: row.createdBy ? people.get(row.createdBy)?.name : undefined,
  createdByAvatar: row.createdBy ? people.get(row.createdBy)?.avatarUrl : undefined,
  validUntil: day(row.validUntil),
  sentAt: iso(row.sentAt),
  acceptedAt: iso(row.acceptedAt),
  createdAt: row.createdAt.toISOString(),
});

export async function getContract(id: string): Promise<ContractView | null> {
  if (!isDatabaseConfigured) return null;
  const row = await prisma.contract.findUnique({ where: { id }, include }).catch(() => null);
  if (!row) return null;
  const people = await namesFor([row.createdBy]);
  return {
    ...toRow(row, people),
    body: row.body,
    quoteId: row.quoteId ?? undefined,
    templateName: row.template?.name,
    contactEmail: row.deal.contact.email?.trim() || undefined,
    hasLink: row.tokenHash !== null,
    sentTo: row.sentTo ?? undefined,
    viewedAt: iso(row.viewedAt),
    acceptedByName: row.acceptedByName ?? undefined,
    acceptedByEmail: row.acceptedByEmail ?? undefined,
    declinedAt: iso(row.declinedAt),
    declinedReason: row.declinedReason ?? undefined,
    withdrawnAt: iso(row.withdrawnAt),
    withdrawnReason: row.withdrawnReason ?? undefined,
  };
}

export async function listContractsForDeal(dealId: string): Promise<ContractRow[]> {
  if (!isDatabaseConfigured) return [];
  const rows = await prisma.contract.findMany({
    where: { dealId },
    include,
    orderBy: { createdAt: "desc" },
  });
  const people = await namesFor(rows.map((row) => row.createdBy));
  return rows.map((row) => toRow(row, people));
}

/** The accepted quotes of a deal: what a contract can be made from. */
export async function acceptedQuotesForDeal(dealId: string): Promise<QuoteChoice[]> {
  if (!isDatabaseConfigured) return [];
  const rows = await prisma.quote.findMany({
    where: { dealId, status: "accepted" },
    orderBy: { acceptedAt: "desc" },
    select: { id: true, reference: true, version: true, title: true, totalMinor: true },
  });
  return rows.map((row) => ({ ...row, totalMinor: Number(row.totalMinor) }));
}

export async function listContracts(params: TableParams): Promise<Page<ContractRow>> {
  if (!isDatabaseConfigured) {
    return { items: [], total: 0, page: 1, pageSize: params.pageSize, pageCount: 1 };
  }
  const q = params.q.trim();
  const status = params.filters.status as ContractStatus | "";
  const kind = params.filters.kind as ContractKind | "";
  const where: Prisma.ContractWhereInput = {
    ...(status ? { status } : {}),
    ...(kind ? { kind } : {}),
    ...(q
      ? {
          OR: [
            { reference: { contains: q, mode: "insensitive" } },
            { title: { contains: q, mode: "insensitive" } },
            { deal: { title: { contains: q, mode: "insensitive" } } },
            { deal: { contact: { lastName: { contains: q, mode: "insensitive" } } } },
            { deal: { contact: { firstName: { contains: q, mode: "insensitive" } } } },
          ],
        }
      : {}),
  };
  const dir = params.dir;
  const orderBy: Prisma.ContractOrderByWithRelationInput =
    params.sort === "status"
      ? { status: dir }
      : params.sort === "reference"
        ? { reference: dir }
        : { createdAt: dir };
  const total = await prisma.contract.count({ where });
  const base = paginate(new Array(total), params.page, params.pageSize); // page maths only
  const rows = await prisma.contract.findMany({
    where,
    include,
    orderBy,
    skip: (base.page - 1) * base.pageSize,
    take: base.pageSize,
  });
  const people = await namesFor(rows.map((row) => row.createdBy));
  return { ...base, items: rows.map((row) => toRow(row, people)) };
}

/** Counts for the contracts header. */
export async function contractTotals() {
  if (!isDatabaseConfigured) return { waiting: 0, signed: 0 };
  const [waiting, signed] = await Promise.all([
    prisma.contract.count({
      where: {
        status: "sent",
        OR: [{ validUntil: null }, { validUntil: { gte: new Date(today()) } }],
      },
    }),
    prisma.contract.count({ where: { status: "accepted" } }),
  ]);
  return { waiting, signed };
}

/* ------------------------------------------------------------ public link */

function toPublic(row: Full): PublicContract {
  return {
    reference: row.reference,
    kind: row.kind as ContractKind,
    title: row.title,
    body: row.body,
    status: effectiveStatus(
      { status: row.status as ContractStatus, validUntil: day(row.validUntil) },
      today(),
    ),
    validUntil: day(row.validUntil),
    issuedOn: (row.sentAt ?? row.createdAt).toISOString().slice(0, 10),
    recipientName: fullName(row.deal.contact),
    acceptedAt: iso(row.acceptedAt),
    acceptedByName: row.acceptedByName ?? undefined,
    declinedAt: iso(row.declinedAt),
    withdrawnAt: iso(row.withdrawnAt),
  };
}

/** The contract behind a secret link: only what a client may see. Null when the link is unknown. */
export async function getPublicContract(token: string): Promise<PublicContract | null> {
  if (!isDatabaseConfigured || !TOKEN_SHAPE.test(token)) return null;
  const row = await prisma.contract.findUnique({ where: { tokenHash: hashToken(token) }, include });
  return row ? toPublic(row) : null;
}

/** The same client view by id, for staff (the PDF of a draft that has no link yet). */
export async function getPublicContractById(id: string): Promise<PublicContract | null> {
  if (!isDatabaseConfigured) return null;
  const row = await prisma.contract.findUnique({ where: { id }, include });
  return row ? toPublic(row) : null;
}
