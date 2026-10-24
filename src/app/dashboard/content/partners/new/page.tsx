import type { Metadata } from "next";

import { AccessDenied } from "@/components/dashboard/shared/access-denied";
import { BackLink } from "@/components/dashboard/shared/back-link";
import { PageHeader } from "@/components/dashboard/shared/page-header";

import { PartnerEditor } from "@/features/cms/components/partner-editor";
import { requirePageAccess } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "New partner" };

export default async function NewPartnerPage() {
  const staff = await requirePageAccess("content:create");
  if (!staff) return <AccessDenied area="creating content" />;

  return (
    <>
      <BackLink href="/dashboard/content/partners">All partners</BackLink>
      <PageHeader
        title="New partner"
        description="It is saved as a draft. Publish it when it is ready."
      />
      <PartnerEditor />
    </>
  );
}
