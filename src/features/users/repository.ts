import "server-only";

import { prisma } from "@/lib/db";
import { isDatabaseConfigured } from "@/lib/env";
import { paginate, type Page } from "@/lib/pagination";
import type { TableParams } from "@/lib/table-params";
import type { DashboardUser, RoleOption } from "./types";

const roleSelect = { select: { id: true, key: true, name: true } } as const;

/** Everyone with access, plus invitations that have not been used yet. */
export async function listAllUsers(): Promise<DashboardUser[]> {
  if (!isDatabaseConfigured) return [];

  const [profiles, invites] = await Promise.all([
    prisma.profile.findMany({ orderBy: { createdAt: "asc" }, include: { role: roleSelect } }),
    prisma.staffInvite.findMany({ orderBy: { createdAt: "asc" }, include: { role: roleSelect } }),
  ]);
  const joined = new Set(profiles.map((profile) => profile.email.toLowerCase()));

  return [
    ...profiles.map(
      (profile): DashboardUser => ({
        id: profile.id,
        name: profile.fullName ?? profile.email,
        email: profile.email,
        roleId: profile.role.id,
        roleKey: profile.role.key,
        roleName: profile.role.name,
        avatarUrl: profile.avatarUrl ?? undefined,
        status: "Active",
        joined: profile.createdAt.toISOString().slice(0, 10),
      }),
    ),
    ...invites
      .filter((invite) => !joined.has(invite.email))
      .map(
        (invite): DashboardUser => ({
          id: `invite:${invite.email}`,
          name: invite.email,
          email: invite.email,
          roleId: invite.role.id,
          roleKey: invite.role.key,
          roleName: invite.role.name,
          status: "Invited",
          joined: invite.createdAt.toISOString().slice(0, 10),
        }),
      ),
  ];
}

const SORTERS: Record<string, (a: DashboardUser, b: DashboardUser) => number> = {
  name: (a, b) => a.name.localeCompare(b.name),
  role: (a, b) => a.roleName.localeCompare(b.roleName),
  status: (a, b) => a.status.localeCompare(b.status),
  joined: (a, b) => a.joined.localeCompare(b.joined),
};

/** Filtered, sorted, paginated view driven by the URL's table params. */
export async function listUsers(params: TableParams): Promise<Page<DashboardUser>> {
  const q = params.q.trim().toLowerCase();
  const rows = (await listAllUsers()).filter(
    (user) =>
      (!q || user.name.toLowerCase().includes(q) || user.email.toLowerCase().includes(q)) &&
      (!params.filters.status || user.status === params.filters.status) &&
      (!params.filters.role || user.roleKey === params.filters.role),
  );
  const compare = SORTERS[params.sort] ?? SORTERS.name;
  rows.sort((a, b) => (params.dir === "desc" ? compare(b, a) : compare(a, b)));
  return paginate(rows, params.page, params.pageSize);
}

export async function listRoleOptions(): Promise<RoleOption[]> {
  if (!isDatabaseConfigured) return [];
  return prisma.role.findMany({ orderBy: [{ isSystem: "desc" }, { name: "asc" }], select: roleSelect.select });
}
