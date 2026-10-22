import type { Metadata } from "next";

import { AccessDenied } from "@/components/dashboard/shared/access-denied";
import { BackLink } from "@/components/dashboard/shared/back-link";
import { PageHeader } from "@/components/dashboard/shared/page-header";
import { TemplatesView } from "@/features/contracts/components/templates-view";
import { listTemplates } from "@/features/contracts/repository";
import { requirePageAccess } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Contract templates" };

export default async function ContractTemplatesPage() {
  const staff = await requirePageAccess("contracts:view");
  if (!staff) return <AccessDenied area="contract templates" />;

  const templates = await listTemplates();
  return (
    <>
      <BackLink href="/dashboard/sales/contracts">All contracts</BackLink>
      <PageHeader
        title="Contract templates"
        description="Reusable wording for agreements and statements of work. Merge fields are filled in from each deal."
      />
      <TemplatesView templates={templates} />
    </>
  );
}
