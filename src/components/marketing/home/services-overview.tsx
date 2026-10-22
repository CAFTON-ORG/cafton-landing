import { getDocument } from "@/features/cms/repository/documents";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageShell } from "@/components/marketing/layout/page-shell";
import { Reveal } from "@/components/marketing/motion/reveal";
import { ServiceIndex } from "@/components/marketing/services/service-index";

export async function ServicesOverview() {
  const { services } = await getDocument("home");
  return (
    <section id="services" className="relative overflow-hidden py-14 sm:py-16 ">
      <PageShell>
        <Reveal className="max-w-2xl">
          <header className="flex flex-col gap-4">
            <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              {services.heading}
            </h2>
            <p className="text-pretty text-base text-muted-foreground sm:text-lg">
              {services.intro}
            </p>
          </header>
        </Reveal>

        <div className="mt-10 sm:mt-12">
          <ServiceIndex compact />
        </div>

        <Reveal>
          <Link
            href="/services"
            className="group mt-8 inline-flex items-center text-sm font-medium text-foreground sm:mt-10"
          >
            {services.linkLabel}
            <ArrowRight className="ms-2 size-4 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </Reveal>
      </PageShell>
    </section>
  );
}
