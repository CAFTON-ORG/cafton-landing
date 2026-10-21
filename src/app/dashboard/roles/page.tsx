import type { Metadata } from "next";

import { AccessDenied } from "@/components/dashboard/shared/access-denied";
import { PageHeader } from "@/components/dashboard/shared/page-header";
import { RolesView } from "@/features/roles/components/roles-view";
import { listRoles } from "@/features/roles/repository";
import { requirePageAccess } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Roles" };

export default async function RolesPage() {
  const staff = await requirePageAccess("roles:view");
  if (!staff) return <AccessDenied area="roles" />;

  const roles = await listRoles();

  return (
    <>
      <PageHeader
        title="Roles"
        description="A role is a set of permissions. Everyone has exactly one."
      />
      <RolesView roles={roles} />
    </>
  );
}
