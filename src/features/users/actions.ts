"use server";

import { revalidatePath } from "next/cache";

import {
  ActionError,
  NOT_CONFIGURED,
  actorId,
  parse,
  runAction,
  type ActionResult,
} from "@/lib/actions";
import { recordAudit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth/dal";
import { resolvePermissions, type Permission } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db";
import { isDatabaseConfigured } from "@/lib/env";
import { emailSchema, inviteSchema, type InviteInput } from "./schema";
import { checkAssignable, checkRemoval, checkRoleChange } from "./rules";

async function guard(permission: Permission) {
  const staff = await requirePermission(permission);
  if (!isDatabaseConfigured) throw new ActionError(NOT_CONFIGURED);
  return staff;
}

function refresh() {
  revalidatePath("/dashboard/users");
  revalidatePath("/dashboard/roles");
  revalidatePath("/dashboard/audit");
}

async function loadRole(roleId: string) {
  const role = await prisma.role.findUnique({
    where: { id: roleId },
    include: { permissions: true },
  });
  if (!role)
    throw new ActionError("That role no longer exists.", "rule", { roleId: "Choose a role." });
  return role;
}

const ownerCount = () => prisma.profile.count({ where: { role: { key: "owner" } } });

const findProfile = (email: string) =>
  prisma.profile.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    include: { role: true },
  });

/**
 * Invites someone by email. They then sign in with that Google account; the
 * database trigger (and the sign-in fallback in the DAL) turns the invite into
 * a profile with this role.
 */
export async function inviteUser(input: InviteInput): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await guard("users:invite");
    const { email, roleId } = parse(inviteSchema, input);
    const role = await loadRole(roleId);

    const denied = checkAssignable(actor, resolvePermissions(role));
    if (denied) throw new ActionError(denied, "rule");

    if (await findProfile(email)) {
      throw new ActionError("This person already has access.", "rule", {
        email: "This person already has access.",
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.staffInvite.upsert({
        where: { email },
        update: { roleId: role.id, invitedBy: actorId(actor) },
        create: { email, roleId: role.id, invitedBy: actorId(actor) },
      });
      await recordAudit(
        actor,
        {
          action: "user.invite",
          entity: "user",
          entityId: email,
          summary: `Invited ${email} as ${role.name}`,
          metadata: { role: role.key },
        },
        tx,
      );
    });
    refresh();
  });
}

export async function changeUserRole(email: string, roleId: string): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await guard("users:update");
    const target = parse(emailSchema, email);
    const role = await loadRole(roleId);

    const denied = checkAssignable(actor, resolvePermissions(role));
    if (denied) throw new ActionError(denied, "rule");

    const profile = await findProfile(target);
    const blocked = checkRoleChange({
      actor,
      target: { email: target, roleKey: profile?.role.key ?? "" },
      newRoleKey: role.key,
      ownerCount: await ownerCount(),
    });
    if (blocked) throw new ActionError(blocked, "rule");

    await prisma.$transaction(async (tx) => {
      await tx.staffInvite.updateMany({ where: { email: target }, data: { roleId: role.id } });
      await tx.profile.updateMany({
        where: { email: { equals: target, mode: "insensitive" } },
        data: { roleId: role.id },
      });
      await recordAudit(
        actor,
        {
          action: "user.role",
          entity: "user",
          entityId: target,
          summary: `Changed ${target} from ${profile?.role.name ?? "invited"} to ${role.name}`,
          metadata: { from: profile?.role.key ?? null, to: role.key },
        },
        tx,
      );
    });
    refresh();
  });
}

/** Removes a person's access, or cancels an invitation that was never used. */
export async function removeUser(email: string): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await guard("users:remove");
    const target = parse(emailSchema, email);
    const profile = await findProfile(target);

    const blocked = checkRemoval({
      actor,
      target: profile ? { email: target, roleKey: profile.role.key } : null,
      ownerCount: await ownerCount(),
    });
    if (blocked) throw new ActionError(blocked, "rule");

    await prisma.$transaction(async (tx) => {
      if (profile) await tx.profile.delete({ where: { id: profile.id } });
      await tx.staffInvite.deleteMany({ where: { email: target } });
      await recordAudit(
        actor,
        {
          action: profile ? "user.remove" : "user.invite.cancel",
          entity: "user",
          entityId: target,
          summary: profile ? `Removed ${target}` : `Cancelled the invitation for ${target}`,
        },
        tx,
      );
    });
    refresh();
  });
}
