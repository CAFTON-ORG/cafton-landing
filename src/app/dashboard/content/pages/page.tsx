import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, FileText } from "lucide-react";

import { AccessDenied } from "@/components/dashboard/shared/access-denied";
import { PageHeader } from "@/components/dashboard/shared/page-header";
import { Card, CardContent } from "@/components/dashboard/ui/card";
import { siteDocuments } from "@/features/cms/site/registry";
import { requirePageAccess } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Page content" };

export default async function PagesIndex() {
  const staff = await requirePageAccess("content:view");
  if (!staff) return <AccessDenied area="website content" />;

  return (
    <>
      <PageHeader
        title="Page content"
        description="The wording of the website's pages. Blog posts, projects and events have their own lists."
      />
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[
          ...Object.values(siteDocuments)
            .filter((entry) => !("hidden" in entry && entry.hidden))
            .map(({ spec }) => ({
              key: spec.key,
              title: spec.title,
              description: spec.description,
              href: `/dashboard/content/pages/${spec.key}`,
            })),
          {
            key: "faqs",
            title: "Service questions",
            description: "The questions answered on each service page.",
            href: "/dashboard/content/faqs",
          },
        ].map((entry) => (
          <li key={entry.key}>
            <Link
              href={entry.href}
              className="focus-visible:ring-ring block rounded-xl focus-visible:ring-2 focus-visible:outline-none"
            >
              <Card className="hover:bg-accent/40 h-full transition-colors">
                <CardContent className="flex items-start gap-3">
                  <FileText
                    className="text-muted-foreground mt-0.5 size-5 shrink-0"
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{entry.title}</p>
                    <p className="text-muted-foreground mt-1 text-sm">{entry.description}</p>
                  </div>
                  <ChevronRight
                    className="text-muted-foreground size-4 shrink-0"
                    aria-hidden="true"
                  />
                </CardContent>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
