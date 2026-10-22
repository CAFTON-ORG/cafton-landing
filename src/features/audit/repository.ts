import "server-only";

import { prisma } from "@/lib/db";
import { isDatabaseConfigured } from "@/lib/env";
import type { Page } from "@/lib/pagination";
import type { TableParams } from "@/lib/table-params";
import type { AuditRow } from "./types";

/** Newest first. Filters by free text (summary, person, action) and entity type. */
export async function listAudit(params: TableParams): Promise<Page<AuditRow>> {
  if (!isDatabaseConfigured)
    return { items: [], total: 0, page: 1, pageSize: params.pageSize, pageCount: 1 };

  const q = params.q.trim();
  const where = {
    ...(params.filters.entity ? { entity: params.filters.entity } : {}),
    ...(q
      ? {
          OR: [
            { summary: { contains: q, mode: "insensitive" as const } },
            { actorName: { contains: q, mode: "insensitive" as const } },
            { action: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const total = await prisma.auditLog.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / params.pageSize));
  const page = Math.min(params.page, pageCount);
  const rows = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: params.dir === "asc" ? "asc" : "desc" },
    skip: (page - 1) * params.pageSize,
    take: params.pageSize,
  });

  return {
    items: rows.map((row) => ({
      id: row.id,
      at: row.createdAt.toISOString(),
      actor: row.actorName,
      action: row.action,
      entity: row.entity,
      summary: row.summary,
    })),
    total,
    page,
    pageSize: params.pageSize,
    pageCount,
  };
}

/** The most recent entries, for the overview. */
export async function listRecentAudit(limit = 5): Promise<AuditRow[]> {
  if (!isDatabaseConfigured) return [];
  const rows = await prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: limit });
  return rows.map((row) => ({
    id: row.id,
    at: row.createdAt.toISOString(),
    actor: row.actorName,
    action: row.action,
    entity: row.entity,
    summary: row.summary,
  }));
}
