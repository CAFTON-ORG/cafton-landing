import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { namesFor } from "@/features/crm/repository/mappers";
import { fullName } from "@/features/crm/rules/core";
import { manilaDate } from "@/features/schedule/rules/slots";
import { prisma } from "@/lib/db";
import { TOKEN_SHAPE, hashToken } from "../services/integrity";
import { isDatabaseConfigured } from "@/lib/env";
import { paginate, type Page } from "@/lib/pagination";
import type { TableParams } from "@/lib/table-params";
import { effectiveStatus, type QuoteStatus } from "../rules/core";
import type {
  CatalogItemView,
  PricingModel,
  PublicQuote,
  QuoteRow,
  QuoteView,
} from "../types/core";

const day = (date: Date | null) => (date ? date.toISOString().slice(0, 10) : undefined);
const iso = (date: Date | null) => (date ? date.toISOString() : undefined);
const today = () => manilaDate(new Date());

/* ---------------------------------------------------------------- catalog */

type CatalogRow = Prisma.CatalogItemGetPayload<object>;

const toItem = (row: CatalogRow): CatalogItemView => ({
  id: row.id,
  name: row.name,
  description: row.description ?? undefined,
  pricingModel: row.pricingModel as PricingModel,
  unitPriceMinor: Number(row.unitPriceMinor),
  unitLabel: row.unitLabel,
  taxable: row.taxable,
  active: row.active,
});

export async function listCatalog(
  options: { activeOnly?: boolean } = {},
): Promise<CatalogItemView[]> {
  if (!isDatabaseConfigured) return [];
  const rows = await prisma.catalogItem.findMany({
    where: options.activeOnly ? { active: true } : {},
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });
  return rows.map(toItem);
}

/* ----------------------------------------------------------------- quotes */

const include = {
  deal: {
    select: {
      id: true,
      title: true,
      reference: true,
      contact: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  },
  lines: { orderBy: { position: "asc" } },
} satisfies Prisma.QuoteInclude;

type QuoteRowFull = Prisma.QuoteGetPayload<{ include: typeof include }>;

async function toView(row: QuoteRowFull, newest: number): Promise<QuoteView> {
  const people = await namesFor([row.createdBy, row.approvedBy]);
  return {
    id: row.id,
    reference: row.reference,
    version: row.version,
    isLatest: row.version >= newest,
    dealId: row.dealId,
    dealTitle: row.deal.title,
    dealReference: row.deal.reference,
    contactId: row.deal.contact.id,
    contactName: fullName(row.deal.contact),
    contactEmail: row.deal.contact.email || undefined,
    title: row.title,
    intro: row.intro ?? undefined,
    terms: row.terms ?? undefined,
    paymentTerms: row.paymentTerms ?? undefined,
    depositPct: row.depositPct,
    currency: row.currency,
    status: effectiveStatus(
      { status: row.status as QuoteStatus, validUntil: day(row.validUntil) },
      today(),
    ),
    taxRatePct: row.taxRatePct,
    subtotalMinor: Number(row.subtotalMinor),
    taxMinor: Number(row.taxMinor),
    totalMinor: Number(row.totalMinor),
    validUntil: day(row.validUntil),
    hasLink: row.tokenHash !== null,
    approvedAt: iso(row.approvedAt),
    approvedByName: row.approvedBy ? people.get(row.approvedBy)?.name : undefined,
    sentAt: iso(row.sentAt),
    sentTo: row.sentTo ?? undefined,
    viewedAt: iso(row.viewedAt),
    acceptedAt: iso(row.acceptedAt),
    acceptedByName: row.acceptedByName ?? undefined,
    acceptedByEmail: row.acceptedByEmail ?? undefined,
    declinedAt: iso(row.declinedAt),
    declinedReason: row.declinedReason ?? undefined,
    createdByName: row.createdBy ? people.get(row.createdBy)?.name : undefined,
    createdByAvatar: row.createdBy ? people.get(row.createdBy)?.avatarUrl : undefined,
    withdrawnAt: iso(row.withdrawnAt),
    withdrawnReason: row.withdrawnReason ?? undefined,
    createdAt: row.createdAt.toISOString(),
    lines: row.lines.map((line) => ({
      id: line.id,
      position: line.position,
      catalogItemId: line.catalogItemId ?? undefined,
      description: line.description,
      quantityMilli: line.quantityMilli,
      unitLabel: line.unitLabel,
      unitPriceMinor: Number(line.unitPriceMinor),
      discountPct: line.discountPct,
      taxable: line.taxable,
      totalMinor: Number(line.totalMinor),
    })),
  };
}

export async function getQuote(id: string): Promise<QuoteView | null> {
  if (!isDatabaseConfigured) return null;
  const row = await prisma.quote.findUnique({ where: { id }, include }).catch(() => null);
  if (!row) return null;
  const newest = await prisma.quote.aggregate({
    where: { reference: row.reference },
    _max: { version: true },
  });
  return toView(row, newest._max.version ?? row.version);
}

const toRow = (
  row: Prisma.QuoteGetPayload<{
    include: {
      deal: {
        select: { id: true; title: true; contact: { select: { firstName: true; lastName: true } } };
      };
    };
  }>,
  people: Map<string, { name: string; avatarUrl?: string }>,
): QuoteRow => ({
  id: row.id,
  reference: row.reference,
  version: row.version,
  title: row.title,
  status: effectiveStatus(
    { status: row.status as QuoteStatus, validUntil: day(row.validUntil) },
    today(),
  ),
  totalMinor: Number(row.totalMinor),
  currency: row.currency,
  dealId: row.dealId,
  dealTitle: row.deal.title,
  contactName: fullName(row.deal.contact),
  createdByName: row.createdBy ? people.get(row.createdBy)?.name : undefined,
  createdByAvatar: row.createdBy ? people.get(row.createdBy)?.avatarUrl : undefined,
  validUntil: day(row.validUntil),
  sentAt: iso(row.sentAt),
  createdAt: row.createdAt.toISOString(),
});

const rowInclude = {
  deal: {
    select: { id: true, title: true, contact: { select: { firstName: true, lastName: true } } },
  },
} as const;

/** All versions of the quotes for one deal, newest first. */
export async function listQuotesForDeal(dealId: string): Promise<QuoteRow[]> {
  if (!isDatabaseConfigured) return [];
  const rows = await prisma.quote.findMany({
    where: { dealId },
    include: rowInclude,
    orderBy: [{ reference: "desc" }, { version: "desc" }],
  });
  const people = await namesFor(rows.map((row) => row.createdBy));
  return rows.map((row) => toRow(row, people));
}

/** The quotes list: by default only the newest version of each quote. */
export async function listQuotes(params: TableParams): Promise<Page<QuoteRow>> {
  if (!isDatabaseConfigured) {
    return { items: [], total: 0, page: 1, pageSize: params.pageSize, pageCount: 1 };
  }
  const q = params.q.trim();
  const status = params.filters.status as QuoteStatus | "";
  const where: Prisma.QuoteWhereInput = {
    // Older versions are history: show them only when asked for.
    status: status ? status : { notIn: ["superseded"] },
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
  const orderBy: Prisma.QuoteOrderByWithRelationInput =
    params.sort === "total"
      ? { totalMinor: dir }
      : params.sort === "status"
        ? { status: dir }
        : params.sort === "reference"
          ? { reference: dir }
          : { createdAt: dir };
  const total = await prisma.quote.count({ where });
  const base = paginate(new Array(total), params.page, params.pageSize); // page maths only
  const rows = await prisma.quote.findMany({
    where,
    include: rowInclude,
    orderBy,
    skip: (base.page - 1) * base.pageSize,
    take: base.pageSize,
  });

  const people = await namesFor(rows.map((row) => row.createdBy));
  return { ...base, items: rows.map((row) => toRow(row, people)) };
}

/** Counts for the sales header and the deal tab. */
export async function openQuoteTotals() {
  if (!isDatabaseConfigured) return { waitingForApproval: 0, out: 0, outMinor: 0 };
  const [waiting, out] = await Promise.all([
    prisma.quote.count({ where: { status: "pending_approval" } }),
    prisma.quote.aggregate({
      where: {
        status: "sent",
        OR: [{ validUntil: null }, { validUntil: { gte: new Date(today()) } }],
      },
      _count: { _all: true },
      _sum: { totalMinor: true },
    }),
  ]);
  return {
    waitingForApproval: waiting,
    out: out._count._all,
    outMinor: Number(out._sum.totalMinor ?? 0),
  };
}

/* ------------------------------------------------------------ public link */

/** The quote behind a secret link: only what a client may see. Null when the link is unknown. */
export async function getPublicQuote(token: string): Promise<PublicQuote | null> {
  if (!isDatabaseConfigured || !TOKEN_SHAPE.test(token)) return null;
  const row = await prisma.quote.findUnique({ where: { tokenHash: hashToken(token) }, include });
  return row ? toPublic(row) : null;
}

/** The same client view by id, for staff (the PDF of a draft that has no link yet). */
export async function getPublicQuoteById(id: string): Promise<PublicQuote | null> {
  if (!isDatabaseConfigured) return null;
  const row = await prisma.quote.findUnique({ where: { id }, include });
  return row ? toPublic(row) : null;
}

function toPublic(row: QuoteRowFull): PublicQuote {
  return {
    reference: row.reference,
    version: row.version,
    title: row.title,
    intro: row.intro ?? undefined,
    terms: row.terms ?? undefined,
    paymentTerms: row.paymentTerms ?? undefined,
    depositPct: row.depositPct,
    currency: row.currency,
    status: effectiveStatus(
      { status: row.status as QuoteStatus, validUntil: day(row.validUntil) },
      today(),
    ),
    taxRatePct: row.taxRatePct,
    subtotalMinor: Number(row.subtotalMinor),
    taxMinor: Number(row.taxMinor),
    totalMinor: Number(row.totalMinor),
    validUntil: day(row.validUntil),
    issuedOn: (row.sentAt ?? row.createdAt).toISOString().slice(0, 10),
    withdrawnAt: iso(row.withdrawnAt),
    recipientName: fullName(row.deal.contact),
    acceptedAt: iso(row.acceptedAt),
    acceptedByName: row.acceptedByName ?? undefined,
    declinedAt: iso(row.declinedAt),
    lines: row.lines.map((line) => ({
      description: line.description,
      quantityMilli: line.quantityMilli,
      unitLabel: line.unitLabel,
      unitPriceMinor: Number(line.unitPriceMinor),
      discountPct: line.discountPct,
      totalMinor: Number(line.totalMinor),
    })),
  };
}
