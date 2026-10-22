import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { isDatabaseConfigured } from "@/lib/env";
import { paginate, type Page } from "@/lib/pagination";
import type { TableParams } from "@/lib/table-params";
import { textFromParagraphs } from "../rules";
import { displayName, staffAuthorId } from "./authors";
import type { AdminListRow, AdminPostDetail, AuthorOption, ContentKind } from "./types";

/**
 * Reads for the dashboard: everything not deleted, drafts included. (The public
 * repositories in `../repository` only ever return published content.)
 */

const live = { deletedAt: null } as const;
const empty = (pageSize: number): Page<AdminListRow> => ({
  items: [],
  total: 0,
  page: 1,
  pageSize,
  pageCount: 1,
});

function order(params: TableParams) {
  const dir = params.dir;
  return params.sort === "title"
    ? { title: dir }
    : params.sort === "date"
      ? { date: dir }
      : { updatedAt: dir };
}

function statusFilter(params: TableParams) {
  return params.filters.status ? { status: params.filters.status as "draft" | "published" } : {};
}

async function paged<T>(
  params: TableParams,
  count: () => Promise<number>,
  rows: (skip: number, take: number) => Promise<T[]>,
  map: (row: T) => AdminListRow,
): Promise<Page<AdminListRow>> {
  const total = await count();
  const base = paginate(new Array(total), params.page, params.pageSize); // page maths only
  const found = await rows((base.page - 1) * base.pageSize, base.pageSize);
  return { ...base, items: found.map(map) };
}

export async function listPosts(params: TableParams): Promise<Page<AdminListRow>> {
  if (!isDatabaseConfigured) return empty(params.pageSize);
  const q = params.q.trim();
  const where: Prisma.BlogPostWhereInput = {
    ...live,
    ...statusFilter(params),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { category: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  return paged(
    params,
    () => prisma.blogPost.count({ where }),
    (skip, take) =>
      prisma.blogPost.findMany({
        where,
        orderBy: order(params),
        include: { author: { select: { name: true, avatar: true } } },
        skip,
        take,
      }),
    (row) => ({
      id: row.id,
      title: row.title,
      subtitle: row.category,
      slug: row.slug,
      status: row.status,
      updatedAt: row.updatedAt.toISOString(),
      date: row.date.toISOString().slice(0, 10),
      publicHref: `/blog/${row.slug}`,
      image: row.imageLight ?? row.imageDark ?? undefined,
      author: { name: row.author.name, avatar: row.author.avatar ?? undefined },
    }),
  );
}

export async function listProjects(params: TableParams): Promise<Page<AdminListRow>> {
  if (!isDatabaseConfigured) return empty(params.pageSize);
  const q = params.q.trim();
  const where: Prisma.PortfolioProjectWhereInput = {
    ...live,
    ...statusFilter(params),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { client: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  return paged(
    params,
    () => prisma.portfolioProject.count({ where }),
    (skip, take) =>
      prisma.portfolioProject.findMany({
        where,
        orderBy:
          params.sort === "title"
            ? { title: params.dir }
            : params.sort === "updated"
              ? { updatedAt: params.dir }
              : { position: "asc" },
        include: { author: { select: { name: true, avatar: true } } },
        skip,
        take,
      }),
    (row) => ({
      id: row.id,
      title: row.title,
      subtitle: `${row.client} · ${row.category}`,
      slug: row.slug,
      status: row.status,
      updatedAt: row.updatedAt.toISOString(),
      publicHref: `/portfolio/${row.slug}`,
      image: row.imageLight ?? row.imageDark ?? undefined,
      author: { name: row.author.name, avatar: row.author.avatar ?? undefined },
    }),
  );
}

export async function listEvents(params: TableParams): Promise<Page<AdminListRow>> {
  if (!isDatabaseConfigured) return empty(params.pageSize);
  const q = params.q.trim();
  const where: Prisma.EventWhereInput = {
    ...live,
    ...statusFilter(params),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { type: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  return paged(
    params,
    () => prisma.event.count({ where }),
    (skip, take) =>
      prisma.event.findMany({
        where,
        orderBy:
          params.sort === "title"
            ? { title: params.dir }
            : params.sort === "updated"
              ? { updatedAt: params.dir }
              : { position: "asc" },
        include: { author: { select: { name: true, avatar: true } } },
        skip,
        take,
      }),
    (row) => ({
      id: row.id,
      title: row.title,
      subtitle: row.type,
      slug: row.slug,
      status: row.status,
      updatedAt: row.updatedAt.toISOString(),
      publicHref: `/events/${row.slug}`,
      image: (row.poster as { src?: string } | null)?.src,
      author: { name: row.author.name, avatar: row.author.avatar ?? undefined },
    }),
  );
}

export async function listPartners(params: TableParams): Promise<Page<AdminListRow>> {
  if (!isDatabaseConfigured) return empty(params.pageSize);
  const q = params.q.trim();
  const where: Prisma.PartnerWhereInput = {
    ...live,
    ...statusFilter(params),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { shortName: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  return paged(
    params,
    () => prisma.partner.count({ where }),
    (skip, take) =>
      prisma.partner.findMany({
        where,
        orderBy:
          params.sort === "title"
            ? { name: params.dir }
            : params.sort === "updated"
              ? { updatedAt: params.dir }
              : { position: "asc" },
        skip,
        take,
      }),
    (row) => ({
      id: row.id,
      title: row.name,
      subtitle: row.roles.join(", ") || undefined,
      slug: row.slug,
      status: row.status,
      updatedAt: row.updatedAt.toISOString(),
      publicHref: "/about",
      image: (row.logo as { src?: string } | null)?.src,
    }),
  );
}

export async function getPost(id: string): Promise<AdminPostDetail | null> {
  if (!isDatabaseConfigured) return null;
  const row = await prisma.blogPost.findFirst({ where: { id, ...live } }).catch(() => null);
  if (!row) return null;
  const galleries = Array.isArray(row.media) ? row.media.length : 0;
  return {
    id: row.id,
    slug: row.slug,
    authorId: row.authorId,
    title: row.title,
    excerpt: row.excerpt,
    body: textFromParagraphs(row.content),
    date: row.date.toISOString().slice(0, 10),
    category: row.category,
    imageLight: row.imageLight ?? "",
    imageDark: row.imageDark ?? "",
    imageAlt: row.imageAlt ?? "",
    status: row.status,
    galleryCount: galleries,
    updatedAt: row.updatedAt.toISOString(),
  };
}

/**
 * Who can be credited: the people with a staff account, the signed-in person first. Staff
 * get an author row the first time they are chosen (see `ensureAuthor`).
 */
export async function listAuthorOptions(
  currentProfileId?: string,
  /** The author the item being edited already has, even if it is not a staff account. */
  keepAuthorId?: string,
): Promise<AuthorOption[]> {
  if (!isDatabaseConfigured) return [];
  const profiles = await prisma.profile.findMany({ orderBy: { createdAt: "asc" } });
  const staff = profiles.map((profile): AuthorOption => ({
    id: staffAuthorId(profile.id),
    name: displayName(profile),
    avatar: profile.avatarUrl ?? undefined,
    staff: true,
  }));
  staff.sort(
    (a, b) =>
      Number(b.id === staffAuthorId(currentProfileId ?? "")) -
        Number(a.id === staffAuthorId(currentProfileId ?? "")) || a.name.localeCompare(b.name),
  );
  if (keepAuthorId && !staff.some((option) => option.id === keepAuthorId)) {
    const kept = await prisma.author.findUnique({ where: { id: keepAuthorId } });
    if (kept) staff.push({ id: kept.id, name: kept.name, avatar: kept.avatar ?? undefined });
  }
  return staff;
}

/** Distinct categories already in use, so the editor can suggest them. */
export async function listPostCategories(): Promise<string[]> {
  if (!isDatabaseConfigured) return [];
  const rows = await prisma.blogPost.findMany({
    where: live,
    distinct: ["category"],
    select: { category: true },
    orderBy: { category: "asc" },
  });
  return rows.map((row) => row.category);
}

export type { ContentKind };
