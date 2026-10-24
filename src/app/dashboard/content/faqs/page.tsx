import type { Metadata } from "next";

import { AccessDenied } from "@/components/dashboard/shared/access-denied";
import { PageHeader } from "@/components/dashboard/shared/page-header";
import { countFaqsByService, getFaqsForEdit } from "@/features/cms/repository/editor";
import { FaqEditor } from "@/features/cms/components/faq-editor";
import { getServices } from "@/features/cms/repository/services";
import { requirePageAccess } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Service FAQs" };

export default async function FaqsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const staff = await requirePageAccess("content:view");
  if (!staff) return <AccessDenied area="website content" />;

  const servicePillars = await getServices();
  const raw = await searchParams;
  const requested = typeof raw.service === "string" ? raw.service : "";
  const serviceSlug =
    servicePillars.find((pillar) => pillar.slug === requested)?.slug ?? servicePillars[0].slug;

  const [counts, items] = await Promise.all([countFaqsByService(), getFaqsForEdit(serviceSlug)]);
  const services = servicePillars.map((pillar) => ({
    slug: pillar.slug,
    title: pillar.title,
    count: counts[pillar.slug] ?? 0,
  }));

  return (
    <>
      <PageHeader
        title="Service questions"
        description="The questions people ask before starting, shown on each service page."
      />
      <FaqEditor key={serviceSlug} services={services} serviceSlug={serviceSlug} initial={items} />
    </>
  );
}
