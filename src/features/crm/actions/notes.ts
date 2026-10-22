"use server";

import { z } from "zod";

import { ActionError, actorId, parse, runAction, type ActionResult } from "@/lib/actions";
import { recordAudit } from "@/lib/audit";
import { can, type Staff } from "@/lib/auth/dal";
import { prisma } from "@/lib/db";
import { guard, refreshCrm } from "./guard";

/** Entries people write (not the ones the system keeps) can be edited, pinned and deleted. */
const WRITTEN = ["note", "call", "email", "meeting"] as const;

const permissionFor = (row: { dealId: string | null; leadId: string | null }) =>
  row.dealId
    ? ("deals:update" as const)
    : row.leadId
      ? ("leads:update" as const)
      : ("contacts:update" as const);

async function load(id: string) {
  const row = await prisma.activity.findUnique({ where: { id } });
  if (!row) throw new ActionError("That entry no longer exists.");
  if (!(WRITTEN as readonly string[]).includes(row.type)) {
    throw new ActionError("Entries the system wrote can't be changed.", "rule");
  }
  return row;
}

/** Only the author changes their words; an administrator can remove what shouldn't be there. */
function mayChange(staff: Staff, authorId: string | null, deleting: boolean) {
  const own = authorId !== null && authorId === actorId(staff);
  return own || (deleting && can(staff, "users:update"));
}

const editSchema = z.object({
  id: z.string().uuid(),
  body: z.string().trim().min(1, "Write something first.").max(5000),
});

export async function editNote(input: z.input<typeof editSchema>): Promise<ActionResult> {
  return runAction(async () => {
    const data = parse(editSchema, input);
    const row = await load(data.id);
    const actor = await guard(permissionFor(row));
    if (!mayChange(actor, row.createdBy, false))
      throw new ActionError("You can only edit your own entries.", "rule");
    await prisma.activity.update({
      where: { id: row.id },
      data: { body: data.body, editedAt: new Date() },
    });
    refreshCrm();
  });
}

export async function pinNote(id: string, pinned: boolean): Promise<ActionResult> {
  return runAction(async () => {
    const row = await load(id);
    await guard(permissionFor(row));
    await prisma.activity.update({ where: { id }, data: { pinned } });
    refreshCrm();
  });
}

export async function deleteNote(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const row = await load(id);
    const actor = await guard(permissionFor(row));
    if (!mayChange(actor, row.createdBy, true))
      throw new ActionError("You can only delete your own entries.", "rule");
    await prisma.$transaction(async (tx) => {
      await tx.activity.delete({ where: { id } });
      await recordAudit(
        actor,
        {
          action: "activity.delete",
          entity: "activity",
          entityId: id,
          summary: `Deleted a ${row.type} written by ${row.createdByName}`,
        },
        tx,
      );
    });
    refreshCrm();
  });
}
