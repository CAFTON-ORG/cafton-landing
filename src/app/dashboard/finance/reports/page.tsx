import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { AccessDenied } from "@/components/dashboard/shared/access-denied";
import { PageHeader } from "@/components/dashboard/shared/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/dashboard/ui/card";
import { REPORT_KEYS, REPORT_META } from "@/features/finance/reports";
import { can, requirePageAccess } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Reports" };

const EXTRA = [
  {
    href: "/dashboard/finance/receivables",
    title: "Receivables aging",
    blurb: "What clients owe, by how late it is.",
    permission: "invoices:view",
  },
  {
    href: "/dashboard/finance/payables",
    title: "Payables aging",
    blurb: "What you owe suppliers, by how late it is.",
    permission: "payables:view",
  },
] as const;

export default async function ReportsPage() {
  const staff = await requirePageAccess("finance:view");
  if (!staff) return <AccessDenied area="the reports" />;

  const cards = [
    ...REPORT_KEYS.map((key) => ({
      href: `/dashboard/finance/reports/${key}`,
      title: REPORT_META[key].title,
      blurb: REPORT_META[key].blurb,
    })),
    ...EXTRA.filter((item) => can(staff, item.permission)),
  ];

  return (
    <>
      <PageHeader
        title="Reports"
        description="Built from the books, so they always agree with each other. Each one can be downloaded as a spreadsheet (CSV) or a PDF."
      />
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <li key={card.href}>
            <Link
              href={card.href}
              className="group block h-full rounded-xl focus-visible:outline-none"
            >
              <Card className="group-hover:bg-muted/30 group-focus-visible:ring-ring h-full transition-colors group-focus-visible:ring-2">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between gap-2">
                    {card.title}
                    <ArrowRight className="text-muted-foreground size-4" aria-hidden="true" />
                  </CardTitle>
                  <CardDescription>{card.blurb}</CardDescription>
                </CardHeader>
                <CardContent />
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
