"use server";

import { revalidatePath } from "next/cache";

import { actorId, runAction, type ActionResult } from "@/lib/actions";
import { verifySession } from "@/lib/auth/dal";
import { prisma } from "@/lib/db";
import { listNotifications } from "../services/notify";
import type { NotificationView } from "../types";

async function me() {
  const staff = await verifySession();
  return actorId(staff);
}

export async function markNotificationRead(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const userId = await me();
    if (!userId) return;
    await prisma.notification.updateMany({
      where: { id, userId, readAt: null },
      data: { readAt: new Date() },
    });
    revalidatePath("/dashboard", "layout");
  });
}

export async function markAllNotificationsRead(): Promise<ActionResult> {
  return runAction(async () => {
    const userId = await me();
    if (!userId) return;
    await prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    revalidatePath("/dashboard", "layout");
  });
}

/** The newest notifications, read when the bell is opened (the page itself only needs the count). */
export async function listMyNotifications(): Promise<ActionResult<NotificationView[]>> {
  return runAction(async () => {
    const userId = await me();
    return userId ? listNotifications(userId) : [];
  });
}
