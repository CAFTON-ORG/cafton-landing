import { canGrantAll } from "@/lib/auth/permissions";

/** Rules for editing roles. Pure: shared by the editor UI and the Server Actions. */

export function slugifyRoleName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** You can only hand out what you hold yourself. */
export function checkGrantable(
  actorPermissions: readonly string[],
  granted: readonly string[],
): string | null {
  return canGrantAll(actorPermissions, granted)
    ? null
    : "You can't grant permissions that you don't have yourself.";
}

export function checkEditable(role: { isSystem: boolean }): string | null {
  return role.isSystem ? "Built-in roles can't be edited. Create a custom role instead." : null;
}

export function checkDeletable(role: { isSystem: boolean; people: number }): string | null {
  if (role.isSystem) return "Built-in roles can't be deleted.";
  if (role.people > 0) {
    return `${role.people} ${role.people === 1 ? "person has" : "people have"} this role. Reassign them first.`;
  }
  return null;
}
