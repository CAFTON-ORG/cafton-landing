import type { Metadata } from "next";
import Link from "next/link";
import { CircleCheck, FileText, PenLine } from "lucide-react";

import { AccessDenied } from "@/components/dashboard/shared/access-denied";
import { PageHeader } from "@/components/dashboard/shared/page-header";
import { StatCard } from "@/components/dashboard/shared/stat-card";
import { Button } from "@/components/dashboard/ui/button";
import { ContractsTable } from "@/features/contracts/components/contracts-table";
import { contractTotals, listContracts } from "@/features/contracts/repository/contracts";
import { CONTRACTS_TABLE } from "@/features/contracts/rules/table";
import { requirePageAccess } from "@/lib/auth/dal";
import { parseTableParams, searchParamsFromRecord } from "@/lib/table-params";

export const metadata: Metadata = { title: "Contracts" };

export default async function ContractsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const staff = await requirePageAccess("contracts:view");
  if (!staff) return <AccessDenied area="contracts" />;

  const params = parseTableParams(searchParamsFromRecord(await searchParams), CONTRACTS_TABLE);
  const [page, totals] = await Promise.all([listContracts(params), contractTotals()]);

  return (
    <>
      <PageHeader
        title="Contracts"
        description="Agreements and statements of work. Draft one from a deal; the client reads and signs it online."
        action={
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href="/dashboard/sales/contracts/templates" />}
          >
            <FileText aria-hidden="true" /> Templates
          </Button>
        }
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <StatCard
          label="Waiting for a signature"
          value={String(totals.waiting)}
          hint={totals.waiting > 0 ? "Out with clients" : "Nothing waiting"}
          icon={PenLine}
        />
        <StatCard
          label="Signed"
          value={String(totals.signed)}
          hint="Agreements on record"
          icon={CircleCheck}
        />
      </div>
      <ContractsTable page={page} />
    </>
  );
}
