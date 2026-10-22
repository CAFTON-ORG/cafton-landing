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

interface ProfileRow {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  role: {
    id: string;
    key: string;
    name: string;
    isSystem: boolean;
    permissions: { permission: string }[];
  };
}

/**
 * The profile with its role and permissions in ONE round trip. Loading them with Prisma's
 * include takes three sequential queries, and when the database is far away each one costs
 * hundreds of milliseconds on every page.
 */
async function findProfile(id: string): Promise<ProfileRow | null> {
  const rows = await prisma.$queryRaw<
    {
      id: string;
      email: string;
      full_name: string | null;
      avatar_url: string | null;
      role_id: string;
      role_key: string;
      role_name: string;
      is_system: boolean;
      permissions: string[];
    }[]
  >`
    SELECT p.id, p.email, p.full_name, p.avatar_url,
           r.id AS role_id, r.key AS role_key, r.name AS role_name, r.is_system,
           COALESCE(array_agg(rp.permission) FILTER (WHERE rp.permission IS NOT NULL), '{}') AS permissions
    FROM profiles p
    JOIN roles r ON r.id = p.role_id
    LEFT JOIN role_permissions rp ON rp.role_id = r.id
    WHERE p.id = ${id}::uuid
    GROUP BY p.id, r.id`;
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    avatarUrl: row.avatar_url,
    role: {
      id: row.role_id,
      key: row.role_key,
      name: row.role_name,
      isSystem: row.is_system,
      permissions: row.permissions.map((permission) => ({ permission })),
    },
  };
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
 * Current signed-in staff member, or null. Identity is the verified Supabase session; the role and
 * permissions are read from the database on every request (never cached across requests, so a
 * removed or demoted person loses access at once).
 * Identity comes from Supabase Auth (verified JWT claims); the role and its
 * permissions come from our own tables through Prisma.
 */
async function resolveStaff(): Promise<Staff | null> {
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
}

/** Memoized per request (React cache), as the Next.js data-access-layer guide recommends. */
export const getStaff = cache(resolveStaff);

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
