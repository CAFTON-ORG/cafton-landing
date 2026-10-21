import "server-only";

import { resolvePermissions } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db";
import { isDatabaseConfigured } from "@/lib/env";
import type { RoleSummary } from "./types";

export async function listRoles(): Promise<RoleSummary[]> {
  if (!isDatabaseConfigured) return [];

  const roles = await prisma.role.findMany({
    orderBy: [{ isSystem: "desc" }, { name: "asc" }],
    include: { permissions: true, _count: { select: { profiles: true, invites: true } } },
  });

  const order = ["owner", "admin", "sales", "viewer"];
  const rank = (role: { key: string; isSystem: boolean }) =>
    role.isSystem ? order.indexOf(role.key) : order.length;
  roles.sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));

  return roles.map((role) => ({
    id: role.id,
    key: role.key,
    name: role.name,
    description: role.description ?? undefined,
    isSystem: role.isSystem,
    people: role._count.profiles + role._count.invites,
    permissions: resolvePermissions(role),
  }));
}
