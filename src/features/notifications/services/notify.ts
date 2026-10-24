import "server-only";

import { resolvePermissions, type Permission } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db";
import { isDatabaseConfigured } from "@/lib/env";
import type { NotificationView } from "../types/core";

export interface NewNotification {
  kind: string;
  title: string;
  body?: string;
  href?: string;
}

/**
 * Tells staff something happened. It never throws and skips whoever caused the event (`except`),
 * because a notification about your own action is noise.
 */
export async function notify(
  userIds: (string | null | undefined)[],
  notification: NewNotification,
  except?: string | null,
) {
  if (!isDatabaseConfigured) return;
  const ids = [...new Set(userIds.filter((id): id is string => !!id && id !== except))];
  if (ids.length === 0) return;
  try {
    await prisma.notification.createMany({
      data: ids.map((userId) => ({ userId, ...notification })),
    });
  } catch (error) {
    console.error("Notifications: could not save.", error);
  }
}

export async function listNotifications(userId: string, limit = 20): Promise<NotificationView[]> {
  if (!isDatabaseConfigured) return [];
  const rows = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return rows.map((row) => ({
    id: row.id,
    kind: row.kind,
    title: row.title,
    body: row.body ?? undefined,
    href: row.href ?? undefined,
    read: row.readAt !== null,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function countUnread(userId: string): Promise<number> {
  if (!isDatabaseConfigured) return 0;
  return prisma.notification.count({ where: { userId, readAt: null } });
}

/** The staff who hold a permission, for "tell everyone who can act on this". */
export async function staffIdsWith(permission: Permission): Promise<string[]> {
  if (!isDatabaseConfigured) return [];
  const profiles = await prisma.profile.findMany({
    include: { role: { include: { permissions: true } } },
  });
  return profiles
    .filter((profile) => resolvePermissions(profile.role).includes(permission))
    .map((profile) => profile.id);
}
