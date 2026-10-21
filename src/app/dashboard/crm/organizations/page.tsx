import type { Metadata } from "next";

import { AccessDenied } from "@/components/dashboard/shared/access-denied";
import { PageHeader } from "@/components/dashboard/shared/page-header";
import { OrganizationsTable } from "@/features/crm/components/organizations-table";
import { listOrganizations } from "@/features/crm/repository/organizations";
import { ORGANIZATIONS_TABLE } from "@/features/crm/table";
import { requirePageAccess } from "@/lib/auth/dal";
import { parseTableParams, searchParamsFromRecord } from "@/lib/table-params";

export const metadata: Metadata = { title: "Organizations" };

export default async function OrganizationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const staff = await requirePageAccess("organizations:view");
  if (!staff) return <AccessDenied area="organizations" />;

  const params = parseTableParams(searchParamsFromRecord(await searchParams), ORGANIZATIONS_TABLE);
  const page = await listOrganizations(params);

  return (
    <>
      <PageHeader
        title="Organizations"
        description="Companies, schools and groups you work with."
      />
      <OrganizationsTable page={page} />
    </>
  );
}
