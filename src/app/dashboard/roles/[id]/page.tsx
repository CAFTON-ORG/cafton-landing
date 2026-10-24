import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AccessDenied } from "@/components/dashboard/shared/access-denied";
import { BackLink } from "@/components/dashboard/shared/back-link";
import { PageHeader } from "@/components/dashboard/shared/page-header";
import { RoleForm } from "@/features/roles/components/role-form";
import { listRoles } from "@/features/roles/repository/roles";
import { can, requirePageAccess } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Role" };

export default async function RolePage({ params }: { params: Promise<{ id: string }> }) {
  const staff = await requirePageAccess("roles:view");
  if (!staff) return <AccessDenied area="roles" />;

  const { id } = await params;
  const roles = await listRoles();
  const role = id === "new" ? null : (roles.find((entry) => entry.id === id) ?? null);
  if (id !== "new" && !role) notFound();
  if (id === "new" && !can(staff, "roles:manage")) return <AccessDenied area="creating roles" />;

  return (
    <>
      <BackLink href="/dashboard/roles">All roles</BackLink>
      <PageHeader
        title={role ? role.name : "New role"}
        description={
          role
            ? (role.description ?? "A set of permissions.")
            : "Choose exactly what this role can do."
        }
      />
      <RoleForm
        key={role?.id ?? "new"}
        role={role}
        roles={roles}
        held={staff.permissions}
        canManage={can(staff, "roles:manage")}
      />
    </>
  );
}
