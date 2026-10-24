import { canGrantAll } from "@/lib/auth/permissions";

/**
 * Business rules for managing people. Pure functions: the UI uses them to
 * disable controls with a reason, the Server Actions use them to enforce. Each
 * returns a message when the action is not allowed, or null when it is.
 */

interface Actor {
  email: string;
  roleKey: string;
  permissions: readonly string[];
}

interface Target {
  email: string;
  roleKey: string;
}

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** You may only assign a role whose permissions you hold yourself. */
export function checkAssignable(actor: Actor, rolePermissions: readonly string[]): string | null {
  return canGrantAll(actor.permissions, rolePermissions)
    ? null
    : "You can't assign a role that has more access than your own.";
}

export function checkRoleChange(input: {
  actor: Actor;
  target: Target | null;
  newRoleKey: string;
  ownerCount: number;
}): string | null {
  const { actor, target, newRoleKey, ownerCount } = input;
  if (target && same(target.email, actor.email)) return "You can't change your own role.";
  if (target?.roleKey === "owner") {
    if (actor.roleKey !== "owner") return "Only an owner can change another owner's role.";
    if (newRoleKey !== "owner" && ownerCount <= 1)
      return "There must always be at least one owner.";
  }
  return null;
}

export function checkRemoval(input: {
  actor: Actor;
  target: Target | null;
  ownerCount: number;
}): string | null {
  const { actor, target, ownerCount } = input;
  if (target && same(target.email, actor.email)) return "You can't remove yourself.";
  if (target?.roleKey === "owner") {
    if (actor.roleKey !== "owner") return "Only an owner can remove another owner.";
    if (ownerCount <= 1) return "There must always be at least one owner.";
  }
  return null;
}

/**
 * Whether someone can be put in the turn order for new website enquiries. They need an account and
 * a role that can work on leads, otherwise a lead would be handed to someone who can't open it.
 */
export function checkTakesLeads(user: {
  status: "Active" | "Invited";
  canWorkLeads: boolean;
}): string | null {
  if (user.status === "Invited") return "They can take leads once they have signed in.";
  if (!user.canWorkLeads) return "Their role can't work on leads.";
  return null;
}
