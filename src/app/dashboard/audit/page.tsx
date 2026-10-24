import type { Metadata } from "next";

import { AccessDenied } from "@/components/dashboard/shared/access-denied";
import { PageHeader } from "@/components/dashboard/shared/page-header";
import { AuditTable } from "@/features/audit/components/audit-table";
import { listAudit } from "@/features/audit/repository/audit";
import { AUDIT_TABLE } from "@/features/audit/rules/table";
import { requirePageAccess } from "@/lib/auth/dal";
import { parseTableParams, searchParamsFromRecord } from "@/lib/table-params";

export const metadata: Metadata = { title: "Audit log" };

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const staff = await requirePageAccess("audit:view");
  if (!staff) return <AccessDenied area="the audit log" />;

  const params = parseTableParams(searchParamsFromRecord(await searchParams), AUDIT_TABLE);
  const page = await listAudit(params);

  return (
    <>
      <PageHeader
        title="Audit log"
        description="Every change made in the dashboard: who, what and when. It can't be edited."
      />
      <AuditTable page={page} />
    </>
  );
}
