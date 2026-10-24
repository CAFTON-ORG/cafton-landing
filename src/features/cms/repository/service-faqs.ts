import "server-only";

import { serviceFaqs } from "@/features/cms/content/service-faqs";
import type { FaqItem } from "@/features/cms/types/core";
import { prisma } from "@/lib/db";
import { readContent } from "./source";

/** Questions shown on a service page. Same fallback rules as the other content (see `source.ts`). */
export async function getServiceFaqs(serviceSlug: string): Promise<FaqItem[]> {
  return readContent(
    "service FAQs",
    {
      populated: () => prisma.serviceFaq.count(),
      query: async () => {
        const rows = await prisma.serviceFaq.findMany({
          where: { serviceSlug },
          orderBy: [{ position: "asc" }, { createdAt: "asc" }],
        });
        return rows.map((row): FaqItem => ({ question: row.question, answer: row.answer }));
      },
    },
    () => serviceFaqs[serviceSlug] ?? [],
  );
}
