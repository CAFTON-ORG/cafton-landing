import { listCustomFields } from "@/features/crm/repository/custom-fields";
import type { Metadata } from "next";
import { MergeLink } from "@/features/crm/components/merge-link";
import { ExportButton } from "@/features/crm/components/export-button";

import { AccessDenied } from "@/components/dashboard/shared/access-denied";
import { PageHeader } from "@/components/dashboard/shared/page-header";
import { LeadsTable } from "@/features/crm/components/leads-table";
import { listTagOptions } from "@/features/crm/repository/tags";
import { listStaffOptions } from "@/features/crm/repository/pipeline";
import { listLeads } from "@/features/crm/repository/leads";
import { LEADS_TABLE } from "@/features/crm/table";
import { actorId } from "@/lib/actions";
import { requirePageAccess } from "@/lib/auth/dal";
import { parseTableParams, searchParamsFromRecord } from "@/lib/table-params";

export const metadata: Metadata = { title: "Leads" };

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const staff = await requirePageAccess("leads:view");
  if (!staff) return <AccessDenied area="leads" />;

  const params = parseTableParams(searchParamsFromRecord(await searchParams), LEADS_TABLE);
  const [page, people, tagOptions] = await Promise.all([
    listLeads(params, actorId(staff)),
    listStaffOptions(),
    listTagOptions("lead"),
  ]);

  return (
    <>
      <PageHeader
        title="Leads"
        description="Enquiries from the website contact form. Qualify them, then convert the good ones into deals."
        action={
          <div className="flex flex-wrap gap-2">
            <MergeLink />
            <ExportButton kind="leads" />
          </div>
        }
      />
      <LeadsTable
        customFields={await listCustomFields("lead")}
        page={page}
        people={people}
        tagOptions={tagOptions}
      />
    </>
  );
}
