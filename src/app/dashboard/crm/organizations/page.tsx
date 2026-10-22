import type { Metadata } from "next";
import { MergeLink } from "@/features/crm/components/merge-link";
import { ImportDialog } from "@/features/crm/components/import-dialog";
import { ExportButton } from "@/features/crm/components/export-button";

import { AccessDenied } from "@/components/dashboard/shared/access-denied";
import { PageHeader } from "@/components/dashboard/shared/page-header";
import { OrganizationsTable } from "@/features/crm/components/organizations-table";
import { listTagOptions } from "@/features/crm/repository/tags";
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
        action={
          <div className="flex flex-wrap gap-2">
            <MergeLink />
            <ImportDialog kind="organizations" />
            <ExportButton kind="organizations" />
          </div>
        }
      />
      <OrganizationsTable page={page} tagOptions={await listTagOptions("organization")} />
    </>
  );
}
