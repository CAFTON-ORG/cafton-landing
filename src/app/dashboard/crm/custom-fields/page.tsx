import type { Metadata } from "next";

import { AccessDenied } from "@/components/dashboard/shared/access-denied";
import { PageHeader } from "@/components/dashboard/shared/page-header";
import { CustomFieldsEditor } from "@/features/crm/components/custom-fields-editor";
import { listAllCustomFields } from "@/features/crm/repository/custom-fields";
import { requirePageAccess } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Custom fields" };

export default async function CustomFieldsPage() {
  const staff = await requirePageAccess("customfields:manage");
  if (!staff) return <AccessDenied area="custom fields" />;

  return (
    <>
      <PageHeader
        title="Custom fields"
        description="Extra facts to record on leads, contacts, organizations and deals, such as a region or a customer tier."
      />
      <CustomFieldsEditor fields={await listAllCustomFields()} />
    </>
  );
}
