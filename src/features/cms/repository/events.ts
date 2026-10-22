import { z } from "zod";

import { events } from "@/features/cms/content/events";
import {
  eventFactsSchema,
  eventPosterSchema,
  eventPrizeSchema,
  eventPromoSchema,
  eventStepSchema,
  parseJson,
} from "@/features/cms/schemas";
import type { CaftonEvent, EventPrize } from "@/features/cms/types";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { opt, publicRows, readContent } from "./source";

/**
 * Data access for events. Async on purpose: pages already `await` them.
 * Reads the database once it has content, the bundled content before that (see `source.ts`).
 */

function toEvent(row: Prisma.EventGetPayload<object>): CaftonEvent {
  const where = `event ${row.slug}`;
  const steps = parseJson(z.array(eventStepSchema), row.steps, [], `steps of ${where}`);
  const facts = parseJson(eventFactsSchema, row.facts, [], `facts of ${where}`);
  const poster = parseJson(eventPosterSchema.nullable(), row.poster, null, `poster of ${where}`);
  const promo = parseJson(eventPromoSchema.nullable(), row.promo, null, `promo of ${where}`);
  return {
    slug: row.slug,
    authorId: row.authorId,
    title: row.title,
    type: row.type,
    tagline: row.tagline,
    seoTitle: opt(row.seoTitle),
    seoDescription: opt(row.seoDescription),
    summary: row.summary,
    campaignUrl: opt(row.campaignUrl),
    startsAt: row.startsAt?.toISOString(),
    endsAt: row.endsAt?.toISOString(),
    ...(row.closed && { closed: true }),
    poster: poster ?? undefined,
    ...(row.about.length > 0 && { about: row.about }),
    prizesHeading: opt(row.prizesHeading),
    prizes: parseJson(
      z.array(eventPrizeSchema),
      row.prizes,
      [] as EventPrize[],
      `prizes of ${where}`,
    ),
    ...(steps.length > 0 && { steps }),
    ...(facts.length > 0 && { facts }),
    closedTitle: opt(row.closedTitle),
    closedNote: opt(row.closedNote),
    promo: promo ?? undefined,
  };
}

export async function listEvents(): Promise<CaftonEvent[]> {
  return readContent(
    "events",
    {
      populated: () => prisma.event.count(),
      query: async () => {
        const rows = await prisma.event.findMany({
          where: publicRows,
          orderBy: [{ position: "asc" }, { createdAt: "asc" }],
        });
        return rows.map(toEvent);
      },
    },
    () => events,
  );
}

export async function getEvent(slug: string): Promise<CaftonEvent | undefined> {
  return (await listEvents()).find((event) => event.slug === slug);
}
