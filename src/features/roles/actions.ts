"use server";

import { revalidatePath } from "next/cache";

import { ActionError, NOT_CONFIGURED, parse, runAction, type ActionResult } from "@/lib/actions";
import { recordAudit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth/dal";
import { normalisePermissions } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db";
import { isDatabaseConfigured } from "@/lib/env";
import { checkDeletable, checkEditable, checkGrantable, slugifyRoleName } from "./rules";
import { roleSchema, type RoleInput } from "./schema";

async function guard() {
  const staff = await requirePermission("roles:manage");
  if (!isDatabaseConfigured) throw new ActionError(NOT_CONFIGURED);
  return staff;
}

function refresh() {
  revalidatePath("/dashboard/roles");
  revalidatePath("/dashboard/users");
  revalidatePath("/dashboard/audit");
}

export async function saveRole(input: RoleInput): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const actor = await guard();
    const { id, name, description, permissions } = parse(roleSchema, input);
    const granted = normalisePermissions(permissions);

    const denied = checkGrantable(actor.permissions, granted);
    if (denied) throw new ActionError(denied, "rule");

    const duplicate = await prisma.role.findFirst({
      where: { name: { equals: name, mode: "insensitive" }, ...(id ? { id: { not: id } } : {}) },
    });
    if (duplicate) {
      throw new ActionError("A role with that name already exists.", "rule", {
        name: "A role with that name already exists.",
      });
    }

    if (id) {
      const existing = await prisma.role.findUnique({ where: { id } });
      if (!existing) throw new ActionError("Role not found.");
      const locked = checkEditable(existing);
      if (locked) throw new ActionError(locked, "rule");

      // People keep the role; shrinking it simply reduces their access.
      await prisma.$transaction(async (tx) => {
        await tx.role.update({ where: { id }, data: { name, description: description || null } });
        await tx.rolePermission.deleteMany({ where: { roleId: id } });
        await tx.rolePermission.createMany({ data: granted.map((permission) => ({ roleId: id, permission })) });
        await recordAudit(
          actor,
          {
            action: "role.update",
            entity: "role",
            entityId: id,
            summary: `Updated the ${name} role (${granted.length} permissions)`,
            metadata: { permissions: granted },
          },
          tx,
        );
      });
      refresh();
      return { id };
    }

    const base = slugifyRoleName(name) || "role";
    const taken = await prisma.role.count({ where: { key: { startsWith: base } } });
    const created = await prisma.$transaction(async (tx) => {
      const role = await tx.role.create({
        data: {
          key: taken ? `${base}-${taken + 1}` : base,
          name,
          description: description || null,
          isSystem: false,
          permissions: { create: granted.map((permission) => ({ permission })) },
        },
      });
      await recordAudit(
        actor,
        {
          action: "role.create",
          entity: "role",
          entityId: role.id,
          summary: `Created the ${name} role (${granted.length} permissions)`,
          metadata: { permissions: granted },
        },
        tx,
      );
      return role;
    });
    refresh();
    return { id: created.id };
  });
}

export async function deleteRole(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await guard();

    const role = await prisma.role.findUnique({
      where: { id },
      include: { _count: { select: { profiles: true, invites: true } } },
    });
    if (!role) throw new ActionError("Role not found.");

    const blocked = checkDeletable({ isSystem: role.isSystem, people: role._count.profiles + role._count.invites });
    if (blocked) throw new ActionError(blocked, "rule");

    await prisma.$transaction(async (tx) => {
      await tx.role.delete({ where: { id } });
      await recordAudit(
        actor,
        { action: "role.delete", entity: "role", entityId: id, summary: `Deleted the ${role.name} role` },
        tx,
      );
    });
    refresh();
  });
}
