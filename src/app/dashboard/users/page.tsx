import type { Metadata } from "next";

import { AccessDenied } from "@/components/dashboard/shared/access-denied";
import { PageHeader } from "@/components/dashboard/shared/page-header";
import { UsersTable } from "@/features/users/components/users-table";
import { listRoleOptions, listUsers } from "@/features/users/repository/users";
import { usersTableConfig } from "@/features/users/table";
import { requirePageAccess } from "@/lib/auth/dal";
import { prisma } from "@/lib/db";
import { isDatabaseConfigured } from "@/lib/env";
import { parseTableParams, searchParamsFromRecord } from "@/lib/table-params";

export const metadata: Metadata = { title: "People" };

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const staff = await requirePageAccess("users:view");
  if (!staff) return <AccessDenied area="people" />;

  const roles = await listRoleOptions();
  const params = parseTableParams(
    searchParamsFromRecord(await searchParams),
    usersTableConfig(roles.map((role) => role.key)),
  );
  const [page, ownerCount] = await Promise.all([
    listUsers(params),
    isDatabaseConfigured ? prisma.profile.count({ where: { role: { key: "owner" } } }) : 0,
  ]);

  return (
    <>
      <PageHeader
        title="People"
        description="Who can sign in to the dashboard, and what they can do."
      />
      <UsersTable page={page} roles={roles} ownerCount={ownerCount} />
    </>
  );
}
