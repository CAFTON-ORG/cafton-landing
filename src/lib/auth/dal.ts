import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { ForbiddenError } from "@/lib/actions";
import { prisma } from "@/lib/db";
import { isDatabaseConfigured, isProduction } from "@/lib/env";
import { isSupabaseConfigured } from "@/lib/env.public";
import { createClient } from "@/lib/supabase/server";
import { googleAvatarUrl, googleName } from "./identity";
import { ALL_PERMISSIONS, hasPermission, resolvePermissions, type Permission } from "./permissions";
import { inviteEmailFromClaims } from "./provision";

export interface Staff {
  id: string;
  name: string;
  email: string;
  roleId?: string;
  roleKey: string;
  roleName: string;
  /** Resolved permission list; serializable so it can be sent to the client. */
  permissions: Permission[];
  avatarUrl?: string;
}

/** Used only outside production when Supabase or the database is not configured. */
const DEV_STAFF: Staff = {
  id: "dev-preview",
  name: "Dev Preview",
  email: "dev@cafton.local",
  roleKey: "owner",
  roleName: "Owner",
  permissions: ALL_PERMISSIONS,
};

const profileInclude = { role: { include: { permissions: true } } } as const;

function findProfile(id: string) {
  return prisma.profile.findUnique({ where: { id }, include: profileInclude });
}

/**
 * The signup trigger only runs when an auth user is first created. Someone whose
 * auth user already exists when they are invited would otherwise be locked out,
 * so the matching invite is claimed here on their next sign-in.
 */
async function claimInvite(
  userId: string,
  claims: Parameters<typeof inviteEmailFromClaims>[0],
  metadata: Record<string, unknown> | undefined,
) {
  const email = inviteEmailFromClaims(claims);
  if (!email) return null;
  const invite = await prisma.staffInvite.findUnique({ where: { email } });
  if (!invite) return null;
  try {
    await prisma.profile.create({
      data: {
        id: userId,
        email,
        fullName: googleName(metadata),
        avatarUrl: googleAvatarUrl(metadata),
        roleId: invite.roleId,
      },
    });
  } catch (error) {
    // A parallel request may have created it first.
    const existing = await findProfile(userId);
    if (existing) return existing;
    throw error;
  }
  return findProfile(userId);
}

/**
 * Current signed-in staff member, or null. Memoized per request.
 * Identity comes from Supabase Auth (verified JWT claims); the role and its
 * permissions come from our own tables through Prisma.
 */
export const getStaff = cache(async (): Promise<Staff | null> => {
  if (!isSupabaseConfigured || !isDatabaseConfigured) {
    return isProduction ? null : DEV_STAFF;
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return null;

  const metadata = data?.claims?.user_metadata as Record<string, unknown> | undefined;
  const profile =
    (await findProfile(userId)) ?? (await claimInvite(userId, data?.claims, metadata));
  if (!profile) return null;

  // Keep the photo and name in step with the Google account they signed in with.
  const avatar = googleAvatarUrl(metadata);
  const name = googleName(metadata);
  const patch: { avatarUrl?: string; fullName?: string } = {};
  if (avatar && avatar !== profile.avatarUrl) patch.avatarUrl = avatar;
  if (name && !profile.fullName) patch.fullName = name;
  if (patch.avatarUrl || patch.fullName) {
    try {
      await prisma.profile.update({ where: { id: profile.id }, data: patch });
      Object.assign(profile, {
        avatarUrl: patch.avatarUrl ?? profile.avatarUrl,
        fullName: patch.fullName ?? profile.fullName,
      });
    } catch {
      // A failed sync must never block sign-in.
    }
  }

  return {
    id: profile.id,
    name: profile.fullName || profile.email,
    email: profile.email,
    roleId: profile.role.id,
    roleKey: profile.role.key,
    roleName: profile.role.name,
    permissions: resolvePermissions(profile.role),
    avatarUrl: profile.avatarUrl ?? undefined,
  };
});

export async function verifySession(): Promise<Staff> {
  const staff = await getStaff();
  if (!staff) redirect("/login?error=access");
  return staff;
}

export function can(staff: Pick<Staff, "permissions">, permission: Permission) {
  return hasPermission(staff.permissions, permission);
}

/** Use at the top of every Server Action and mutation. */
export async function requirePermission(permission: Permission): Promise<Staff> {
  const staff = await verifySession();
  if (!can(staff, permission)) throw new ForbiddenError();
  return staff;
}

/** Use at the top of a page: redirects the signed-out; returns null when access is denied. */
export async function requirePageAccess(permission: Permission): Promise<Staff | null> {
  const staff = await verifySession();
  return can(staff, permission) ? staff : null;
}
