import type { Metadata } from "next";

import { AccessDenied } from "@/components/dashboard/shared/access-denied";
import { PageHeader } from "@/components/dashboard/shared/page-header";
import { PeriodsView } from "@/features/finance/components/periods-view";
import { ensureFiscalYear } from "@/features/finance/ledger";
import { listPeriods } from "@/features/finance/repository";
import { manilaDate } from "@/features/schedule/slots";
import { prisma } from "@/lib/db";
import { isDatabaseConfigured } from "@/lib/env";
import { requirePageAccess } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Fiscal periods" };

export default async function PeriodsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const staff = await requirePageAccess("finance:view");
  if (!staff) return <AccessDenied area="the books" />;

  const { year: raw } = await searchParams;
  const thisYear = Number(manilaDate(new Date()).slice(0, 4));
  const requested = Number(raw);
  const year =
    Number.isInteger(requested) && requested >= 2000 && requested <= 2100 ? requested : thisYear;
  // A year's months are made the first time someone looks at it.
  if (isDatabaseConfigured) await prisma.$transaction((tx) => ensureFiscalYear(tx, year));

  return (
    <>
      <PageHeader
        title="Fiscal periods"
        description="The fiscal year is the calendar year, January to December. Close a month once its books are final: nothing can be posted into it afterwards."
      />
      <PeriodsView year={year} periods={await listPeriods(year)} />
    </>
  );
}
