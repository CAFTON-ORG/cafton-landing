import "server-only";
import { withActivity } from "./summary";
import { customFilterWhere } from "./custom-fields";

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { isDatabaseConfigured } from "@/lib/env";
import { paginate, type Page } from "@/lib/pagination";
import type { TableParams } from "@/lib/table-params";
import { dealInclude, live, namesFor, toDeal } from "../mappers";
import type { DealView } from "../types";

function filterWhere(
  params: Pick<TableParams, "q" | "filters">,
  staffId?: string | null,
  custom: Prisma.DealWhereInput[] = [],
): Prisma.DealWhereInput {
  const q = params.q.trim();
  return {
    ...live,
    ...(custom.length ? { AND: custom } : {}),
    ...(params.filters.tag ? { tags: { has: params.filters.tag } } : {}),
    ...(params.filters.stage || params.filters.pipeline
      ? {
          stage: {
            ...(params.filters.stage ? { key: params.filters.stage } : {}),
            ...(params.filters.pipeline ? { pipeline: { key: params.filters.pipeline } } : {}),
          },
        }
      : {}),
    ...(params.filters.owner === "me" && staffId ? { ownerId: staffId } : {}),
    ...(params.filters.owner === "unassigned" ? { ownerId: null } : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { reference: { contains: q, mode: "insensitive" } },
            { contact: { firstName: { contains: q, mode: "insensitive" } } },
            { contact: { lastName: { contains: q, mode: "insensitive" } } },
            { organization: { name: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };
}

export async function listDeals(
  params: TableParams,
  staffId?: string | null,
): Promise<Page<DealView>> {
  if (!isDatabaseConfigured)
    return { items: [], total: 0, page: 1, pageSize: params.pageSize, pageCount: 1 };

  const where = filterWhere(params, staffId, await customFilterWhere("deal", params.filters));
  const dir = params.dir;
  const orderBy: Prisma.DealOrderByWithRelationInput =
    params.sort === "amount"
      ? { amountMinor: { sort: dir, nulls: "last" } }
      : params.sort === "stage"
        ? { stage: { position: dir } }
        : params.sort === "close"
          ? { expectedCloseDate: { sort: dir, nulls: "last" } }
          : params.sort === "title"
            ? { title: dir }
            : { createdAt: dir };

  const total = await prisma.deal.count({ where });
  const base = paginate(new Array(total), params.page, params.pageSize);
  const rows = await prisma.deal.findMany({
    where,
    include: dealInclude,
    orderBy,
    skip: (base.page - 1) * base.pageSize,
    take: base.pageSize,
  });
  const names = await namesFor(rows.map((row) => row.ownerId));
  return {
    ...base,
    items: await withActivity(
      "deal",
      rows.map((row) => toDeal(row, names)),
    ),
  };
}

/**
 * Every open deal plus the most recently closed ones, for the board.
 * Closed columns are capped so a long history doesn't bury the live pipeline.
 */
export async function listBoardDeals(
  params: Pick<TableParams, "q" | "filters">,
  staffId?: string | null,
  closedLimit = 20,
): Promise<DealView[]> {
  if (!isDatabaseConfigured) return [];

  const where = filterWhere({ ...params, filters: { ...params.filters, stage: "" } }, staffId);
  const [open, won, lost] = await Promise.all([
    prisma.deal.findMany({
      where: {
        ...where,
        stage: {
          kind: "open",
          ...(params.filters.pipeline ? { pipeline: { key: params.filters.pipeline } } : {}),
        },
      },
      include: dealInclude,
      orderBy: [{ stage: { position: "asc" } }, { stageChangedAt: "desc" }],
    }),
    prisma.deal.findMany({
      where: {
        ...where,
        stage: {
          kind: "won",
          ...(params.filters.pipeline ? { pipeline: { key: params.filters.pipeline } } : {}),
        },
      },
      include: dealInclude,
      orderBy: { wonAt: "desc" },
      take: closedLimit,
    }),
    prisma.deal.findMany({
      where: {
        ...where,
        stage: {
          kind: "lost",
          ...(params.filters.pipeline ? { pipeline: { key: params.filters.pipeline } } : {}),
        },
      },
      include: dealInclude,
      orderBy: { lostAt: "desc" },
      take: closedLimit,
    }),
  ]);
  const rows = [...open, ...won, ...lost];
  const names = await namesFor(rows.map((row) => row.ownerId));
  return withActivity(
    "deal",
    rows.map((row) => toDeal(row, names)),
  );
}

export async function getDeal(id: string): Promise<DealView | null> {
  if (!isDatabaseConfigured) return null;
  const row = await prisma.deal
    .findFirst({ where: { id, ...live }, include: dealInclude })
    .catch(() => null);
  if (!row) return null;
  return toDeal(row, await namesFor([row.ownerId]));
}

export async function listDealsFor(subject: {
  contactId?: string;
  organizationId?: string;
}): Promise<DealView[]> {
  if (!isDatabaseConfigured) return [];
  const rows = await prisma.deal.findMany({
    where: { ...live, ...subject },
    include: dealInclude,
    orderBy: { createdAt: "desc" },
  });
  const names = await namesFor(rows.map((row) => row.ownerId));
  return rows.map((row) => toDeal(row, names));
}
