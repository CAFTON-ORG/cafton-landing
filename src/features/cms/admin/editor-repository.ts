import "server-only";

import { z } from "zod";

import { prisma } from "@/lib/db";
import { isDatabaseConfigured } from "@/lib/env";
import {
  blogImageSchema,
  eventFactsSchema,
  eventPosterSchema,
  eventPrizeSchema,
  eventPromoSchema,
  eventStepSchema,
  parseJson,
  partnerLinkSchema,
  partnerLogoSchema,
} from "../schemas";
import { isoToManila, textFromList, textFromParagraphs } from "../rules";
import type { AdminEventDetail, AdminFaq, AdminPartnerDetail, AdminProjectDetail } from "./forms";

/** Editor-shaped reads: one record with every field a form needs, drafts included. */

const live = { deletedAt: null } as const;

export async function getProjectForEdit(id: string): Promise<AdminProjectDetail | null> {
  if (!isDatabaseConfigured) return null;
  const row = await prisma.portfolioProject.findFirst({ where: { id, ...live } }).catch(() => null);
  if (!row) return null;
  const gallery = parseJson(
    z.array(blogImageSchema),
    row.media,
    [],
    `media of project ${row.slug}`,
  );
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    authorId: row.authorId,
    client: row.client,
    category: row.category,
    services: row.services,
    summary: row.summary,
    description: row.description,
    problem: row.problem ?? "",
    solution: row.solution ?? "",
    recognition: row.recognition ?? "",
    imageLight: row.imageLight ?? "",
    imageDark: row.imageDark ?? "",
    imageAlt: row.imageAlt ?? "",
    seoTitle: row.seoTitle ?? "",
    seoDescription: row.seoDescription ?? "",
    imageFit: row.imageFit === "cover" || row.imageFit === "contain" ? row.imageFit : "",
    liveUrl: row.liveUrl ?? "",
    gallery: gallery.map((image) => ({
      src: image.src,
      alt: image.alt,
      width: image.width,
      height: image.height,
      caption: image.caption ?? "",
    })),
    status: row.status,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getEventForEdit(id: string): Promise<AdminEventDetail | null> {
  if (!isDatabaseConfigured) return null;
  const row = await prisma.event.findFirst({ where: { id, ...live } }).catch(() => null);
  if (!row) return null;
  const where = `event ${row.slug}`;
  const poster = parseJson(eventPosterSchema.nullable(), row.poster, null, `poster of ${where}`);
  const promo = parseJson(eventPromoSchema.nullable(), row.promo, null, `promo of ${where}`);
  const prizes = parseJson(z.array(eventPrizeSchema), row.prizes, [], `prizes of ${where}`);
  const steps = parseJson(z.array(eventStepSchema), row.steps, [], `steps of ${where}`);
  const facts = parseJson(eventFactsSchema, row.facts, [], `facts of ${where}`);
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    authorId: row.authorId,
    type: row.type,
    tagline: row.tagline,
    seoTitle: row.seoTitle ?? "",
    seoDescription: row.seoDescription ?? "",
    summary: row.summary,
    campaignUrl: row.campaignUrl ?? "",
    startsAt: row.startsAt ? isoToManila(row.startsAt.toISOString()) : "",
    endsAt: row.endsAt ? isoToManila(row.endsAt.toISOString()) : "",
    closed: row.closed,
    posterSrc: poster?.src ?? "",
    posterAlt: poster?.alt ?? "",
    posterWidth: poster?.width ?? "",
    posterHeight: poster?.height ?? "",
    aboutText: textFromParagraphs(row.about),
    prizesHeading: row.prizesHeading ?? "",
    prizes: prizes.map((prize) => ({
      rank: prize.rank,
      name: prize.name,
      itemsText: textFromList(prize.items),
      image: prize.image ?? "",
      imageAlt: prize.imageAlt ?? "",
      cutout: prize.cutout ?? false,
    })),
    steps,
    facts: facts.map(([label, value]) => ({ label, value })),
    closedTitle: row.closedTitle ?? "",
    closedNote: row.closedNote ?? "",
    promoEyebrow: promo?.eyebrow ?? "",
    promoTitle: promo?.title ?? "",
    promoDescription: promo?.description ?? "",
    promoHref: promo?.href ?? "",
    promoCta: promo?.cta ?? "",
    status: row.status,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getPartnerForEdit(id: string): Promise<AdminPartnerDetail | null> {
  if (!isDatabaseConfigured) return null;
  const row = await prisma.partner.findFirst({ where: { id, ...live } }).catch(() => null);
  if (!row) return null;
  const logo = parseJson(
    partnerLogoSchema.nullable(),
    row.logo,
    null,
    `logo of partner ${row.slug}`,
  );
  const links = parseJson(
    z.array(partnerLinkSchema),
    row.links,
    [],
    `links of partner ${row.slug}`,
  );
  return {
    id: row.id,
    name: row.name,
    shortName: row.shortName,
    slug: row.slug,
    logoSrc: logo?.src ?? "",
    logoFit: logo?.fit ?? "contain",
    logoPlate: logo?.plate ?? "",
    rolesText: row.roles.join(", "),
    featured: row.featured,
    description: row.description ?? "",
    links,
    status: row.status,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getFaqsForEdit(serviceSlug: string): Promise<AdminFaq[]> {
  if (!isDatabaseConfigured) return [];
  const rows = await prisma.serviceFaq.findMany({
    where: { serviceSlug },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
  });
  return rows.map((row) => ({ question: row.question, answer: row.answer }));
}

/** Number of questions per service, for the FAQ editor's tabs. */
export async function countFaqsByService(): Promise<Record<string, number>> {
  if (!isDatabaseConfigured) return {};
  const rows = await prisma.serviceFaq.groupBy({ by: ["serviceSlug"], _count: { _all: true } });
  return Object.fromEntries(rows.map((row) => [row.serviceSlug, row._count._all]));
}
