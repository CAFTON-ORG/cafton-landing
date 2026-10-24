import "server-only";

import type { Media } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { isDatabaseConfigured } from "@/lib/env";
import { mediaPublicUrl } from "@/lib/media";
import { paginate, type Page } from "@/lib/pagination";
import type { MediaItem } from "../types";

/**
 * How many pieces of content mention a stored image. Content refers to an image by its
 * public address (or, for galleries, inside JSON), so the file's unique path is searched
 * for in every column that can hold one. Drafts and deleted rows count: they come back.
 */
export async function countUsesOf(path: string): Promise<number> {
  const like = `%${path}%`;
  const rows = await prisma.$queryRaw<{ n: number }[]>`
    SELECT (
      (SELECT count(*) FROM blog_posts WHERE image_light LIKE ${like} OR image_dark LIKE ${like} OR media::text LIKE ${like}) +
      (SELECT count(*) FROM portfolio_projects WHERE image_light LIKE ${like} OR image_dark LIKE ${like} OR media::text LIKE ${like}) +
      (SELECT count(*) FROM events WHERE poster::text LIKE ${like} OR prizes::text LIKE ${like}) +
      (SELECT count(*) FROM partners WHERE logo::text LIKE ${like}) +
      (SELECT count(*) FROM authors WHERE avatar LIKE ${like})
    )::int AS n`;
  return rows[0]?.n ?? 0;
}

async function toItem(row: Media): Promise<MediaItem> {
  return {
    id: row.id,
    path: row.path,
    url: mediaPublicUrl(row.path),
    name: row.name,
    alt: row.alt,
    mime: row.mime,
    sizeBytes: row.sizeBytes,
    width: row.width,
    height: row.height,
    createdAt: row.createdAt.toISOString(),
    uses: await countUsesOf(row.path),
  };
}

const empty = (pageSize: number): Page<MediaItem> => ({
  items: [],
  total: 0,
  page: 1,
  pageSize,
  pageCount: 1,
});

export async function listMedia(
  options: { q?: string; page?: number; pageSize?: number } = {},
): Promise<Page<MediaItem>> {
  const pageSize = options.pageSize ?? 24;
  if (!isDatabaseConfigured) return empty(pageSize);
  const q = options.q?.trim();
  const where = q
    ? {
        OR: [
          { name: { contains: q, mode: "insensitive" as const } },
          { alt: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : {};
  const total = await prisma.media.count({ where });
  const base = paginate(new Array(total), options.page ?? 1, pageSize);
  const rows = await prisma.media.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (base.page - 1) * base.pageSize,
    take: base.pageSize,
  });
  return { ...base, items: await Promise.all(rows.map(toItem)) };
}

export async function getMedia(id: string): Promise<MediaItem | null> {
  if (!isDatabaseConfigured) return null;
  const row = await prisma.media.findUnique({ where: { id } }).catch(() => null);
  return row ? toItem(row) : null;
}
