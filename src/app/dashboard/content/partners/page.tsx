import type { Metadata } from "next";

import { AccessDenied } from "@/components/dashboard/shared/access-denied";
import { PageHeader } from "@/components/dashboard/shared/page-header";
import { listPartners } from "@/features/cms/admin/repository";
import { CONTENT_TABLE } from "@/features/cms/admin/table";
import { ContentTable } from "@/features/cms/components/content-table";
import { requirePageAccess } from "@/lib/auth/dal";
import { parseTableParams, searchParamsFromRecord } from "@/lib/table-params";

export const metadata: Metadata = { title: "Partners" };

export default async function PartnersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const staff = await requirePageAccess("content:view");
  if (!staff) return <AccessDenied area="website content" />;

  const params = parseTableParams(searchParamsFromRecord(await searchParams), CONTENT_TABLE);
  const page = await listPartners(params);

  return (
    <>
      <PageHeader
        title="Partners"
        description="Organizations shown on the About page and the home page strip."
      />
      <ContentTable kind="partner" page={page} />
    </>
  );
}
