import "server-only";

import { z } from "zod";

import { projects } from "@/features/cms/content/projects";
import { blogImageSchema, parseJson } from "@/features/cms/schemas/core";
import type { BlogImage, Project } from "@/features/cms/types/core";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { opt, publicRows, readContent } from "./source";

/**
 * Data access for portfolio projects. Async on purpose: pages already `await` them.
 * Reads the database once it has content, the bundled content before that (see `source.ts`).
 */

function toProject(row: Prisma.PortfolioProjectGetPayload<object>): Project {
  const media = parseJson(
    z.array(blogImageSchema),
    row.media,
    [] as BlogImage[],
    `media of project ${row.slug}`,
  );
  return {
    slug: row.slug,
    authorId: row.authorId,
    client: row.client,
    title: row.title,
    category: row.category,
    services: row.services,
    summary: row.summary,
    description: row.description,
    problem: opt(row.problem),
    solution: opt(row.solution),
    recognition: opt(row.recognition),
    // One cover is enough: the other theme reuses it (the site shows a cover only when both are set).
    imageLight: opt(row.imageLight) ?? opt(row.imageDark),
    imageDark: opt(row.imageDark) ?? opt(row.imageLight),
    imageAlt: opt(row.imageAlt),
    seoTitle: opt(row.seoTitle),
    seoDescription: opt(row.seoDescription),
    imageFit: row.imageFit === "cover" || row.imageFit === "contain" ? row.imageFit : undefined,
    ...(media.length > 0 && { media }),
    liveUrl: opt(row.liveUrl),
  };
}

export async function listProjects(): Promise<Project[]> {
  return readContent(
    "portfolio projects",
    {
      populated: () => prisma.portfolioProject.count(),
      query: async () => {
        const rows = await prisma.portfolioProject.findMany({
          where: publicRows,
          orderBy: [{ position: "asc" }, { createdAt: "asc" }],
        });
        return rows.map(toProject);
      },
    },
    () => projects,
  );
}

export async function getProject(slug: string): Promise<Project | undefined> {
  return (await listProjects()).find((project) => project.slug === slug);
}

export async function listProjectsForService(serviceSlug: string): Promise<Project[]> {
  return (await listProjects()).filter((project) => project.services.includes(serviceSlug));
}
