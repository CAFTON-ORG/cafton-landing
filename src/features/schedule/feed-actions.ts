"use server";

import { guard } from "@/features/crm/actions/guard";
import { ActionError, actorId, runAction, type ActionResult } from "@/lib/actions";
import { prisma } from "@/lib/db";
import { siteOrigin } from "@/lib/mail";
import { newCalendarToken } from "./feed";

const linkFor = (token: string) => `${siteOrigin()}/api/calendar/${token}.ics`;

async function whoAmI() {
  const staff = await guard("meetings:view");
  const id = actorId(staff);
  if (!id) throw new ActionError("Sign in with your own account to get a personal calendar link.");
  return id;
}

/**
 * The signed-in person's own calendar link. It is made the first time they ask. "Reset" replaces
 * it, which stops the old link working (for example if it was shared by mistake).
 */
export async function getCalendarLink(): Promise<ActionResult<{ link: string }>> {
  return runAction(async () => {
    const id = await whoAmI();
    const profile = await prisma.profile.findUnique({
      where: { id },
      select: { calendarToken: true },
    });
    if (profile?.calendarToken) return { link: linkFor(profile.calendarToken) };
    const token = newCalendarToken();
    await prisma.profile.update({ where: { id }, data: { calendarToken: token } });
    return { link: linkFor(token) };
  });
}

export async function resetCalendarLink(): Promise<ActionResult<{ link: string }>> {
  return runAction(async () => {
    const id = await whoAmI();
    const token = newCalendarToken();
    await prisma.profile.update({ where: { id }, data: { calendarToken: token } });
    return { link: linkFor(token) };
  });
}
