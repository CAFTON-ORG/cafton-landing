import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { actorId } from "@/lib/actions";
import { live } from "../mappers";
import type { Subject } from "../types";

export type Tx = Prisma.TransactionClient;

/** Appends to a record's timeline inside the caller's transaction. */
export async function logActivity(
  tx: Tx,
  by: { id: string; name: string },
  subject: Subject,
  type: "note" | "call" | "email" | "meeting" | "stage_change" | "system",
  body: string,
) {
  await tx.activity.create({
    data: { type, body, ...subject, createdBy: actorId(by), createdByName: by.name },
  });
}

/** The live contact with this email address, if there is one. */
export function findLiveContactByEmail(tx: Tx, email: string) {
  return tx.contact.findFirst({
    where: { ...live, email: { equals: email.trim(), mode: "insensitive" } },
  });
}

/** The pipeline stage a new deal starts in. */
export async function firstOpenStage(tx: Tx, key = "new") {
  return (
    (await tx.pipelineStage.findUnique({ where: { key } })) ??
    (await tx.pipelineStage.findFirst({ where: { kind: "open" }, orderBy: { position: "asc" } }))
  );
}
