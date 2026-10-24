import type { Metadata } from "next";
import { Clock, Send } from "lucide-react";

import { AccessDenied } from "@/components/dashboard/shared/access-denied";
import { PageHeader } from "@/components/dashboard/shared/page-header";
import { StatCard } from "@/components/dashboard/shared/stat-card";
import { QuotesTable } from "@/features/sales/components/quotes-table";
import { listQuotes, openQuoteTotals } from "@/features/sales/repository/sales";
import { QUOTES_TABLE } from "@/features/sales/table";
import { requirePageAccess } from "@/lib/auth/dal";
import { formatMinor } from "@/lib/money";
import { parseTableParams, searchParamsFromRecord } from "@/lib/table-params";

export const metadata: Metadata = { title: "Quotes" };

export default async function QuotesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const staff = await requirePageAccess("quotes:view");
  if (!staff) return <AccessDenied area="quotes" />;

  const params = parseTableParams(searchParamsFromRecord(await searchParams), QUOTES_TABLE);
  const [page, totals] = await Promise.all([listQuotes(params), openQuoteTotals()]);

  return (
    <>
      <PageHeader
        title="Quotes"
        description="Priced offers for deals. Start one from a deal; it is approved, sent and accepted here."
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <StatCard
          label="Out with clients"
          value={String(totals.out)}
          hint={`${formatMinor(totals.outMinor, "PHP", { compact: true })} waiting for an answer`}
          icon={Send}
        />
        <StatCard
          label="Waiting for approval"
          value={String(totals.waitingForApproval)}
          hint={totals.waitingForApproval > 0 ? "Over the approval limit" : "Nothing to approve"}
          icon={Clock}
        />
      </div>
      <QuotesTable page={page} />
    </>
  );
}
