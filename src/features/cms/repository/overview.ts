import "server-only";

import { prisma } from "@/lib/db";
import { isDatabaseConfigured } from "@/lib/env";

export interface CollectionCount {
  published: number;
  drafts: number;
}

export interface ContentOverview {
  posts: CollectionCount;
  projects: CollectionCount;
  events: CollectionCount;
  partners: CollectionCount;
  images: number;
  /** When the site's settings or page text were last changed, if ever. */
  lastSiteEdit: Date | null;
}

type Grouped = { status: "draft" | "published"; _count: number }[];
const split = (rows: Grouped): CollectionCount => ({
  published: rows.find((row) => row.status === "published")?._count ?? 0,
  drafts: rows.find((row) => row.status === "draft")?._count ?? 0,
});

/** The numbers on the Website overview. Null when there is no database to count in. */
export async function getContentOverview(): Promise<ContentOverview | null> {
  if (!isDatabaseConfigured) return null;
  const live = { deletedAt: null };
  const [posts, projects, events, partners, images, lastSite] = await Promise.all([
    prisma.blogPost.groupBy({ by: ["status"], where: live, _count: true }),
    prisma.portfolioProject.groupBy({ by: ["status"], where: live, _count: true }),
    prisma.event.groupBy({ by: ["status"], where: live, _count: true }),
    prisma.partner.groupBy({ by: ["status"], where: live, _count: true }),
    prisma.media.count(),
    prisma.siteContent.findFirst({ orderBy: { updatedAt: "desc" }, select: { updatedAt: true } }),
  ]);
  return {
    posts: split(posts),
    projects: split(projects),
    events: split(events),
    partners: split(partners),
    images,
    lastSiteEdit: lastSite?.updatedAt ?? null,
  };
}
