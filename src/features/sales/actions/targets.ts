"use server";

import { revalidatePath } from "next/cache";

import { guard } from "@/features/crm/actions/guard";
import { ActionError, actorId, runAction, type ActionResult } from "@/lib/actions";
import { recordAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { formatMinor, parseMinor } from "@/lib/money";
import { isMonth } from "../dashboard";

const MAX_TARGET_MINOR = 99_999_999_999;

/**
 * Sets one person's sales goal for one month (pesos as typed, "250,000"). An empty amount removes
 * the goal. Goals are an administrator's call, so this needs `targets:manage`.
 */
export async function setSalesTarget(
  ownerId: string,
  month: string,
  amount: string,
): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await guard("targets:manage");
    if (!isMonth(month)) throw new ActionError("Pick a month.");
    const text = amount.trim();
    const minor = text === "" ? null : parseMinor(text);
    if (text !== "" && (minor === null || minor <= 0)) {
      throw new ActionError("Enter an amount like 250,000.", "validation", {
        amount: "Enter an amount like 250,000.",
      });
    }
    if (minor !== null && minor > MAX_TARGET_MINOR) {
      throw new ActionError("That amount is too large.", "validation", {
        amount: "That amount is too large.",
      });
    }
    const first = new Date(`${month}-01`);

    await prisma.$transaction(async (tx) => {
      const person = await tx.profile.findUnique({
        where: { id: ownerId },
        select: { fullName: true, email: true },
      });
      if (!person) throw new ActionError("That person no longer exists.");
      const name = person.fullName || person.email;
      if (minor === null) {
        const removed = await tx.salesTarget.deleteMany({ where: { ownerId, month: first } });
        if (removed.count === 0) return;
        await recordAudit(
          actor,
          {
            action: "target.clear",
            entity: "sales_target",
            entityId: ownerId,
            summary: `Removed ${name}'s sales target for ${month}`,
          },
          tx,
        );
        return;
      }
      await tx.salesTarget.upsert({
        where: { ownerId_month: { ownerId, month: first } },
        create: { ownerId, month: first, amountMinor: BigInt(minor), createdBy: actorId(actor) },
        update: { amountMinor: BigInt(minor) },
      });
      await recordAudit(
        actor,
        {
          action: "target.set",
          entity: "sales_target",
          entityId: ownerId,
          summary: `Set ${name}'s sales target for ${month} to ${formatMinor(minor, "PHP")}`,
        },
        tx,
      );
    });
    revalidatePath("/dashboard/sales");
  });
}
