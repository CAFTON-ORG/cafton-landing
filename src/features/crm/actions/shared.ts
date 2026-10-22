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

/**
 * The open stage a deal starts (or restarts) in. `key` names the preferred stage ("new" by default);
 * inside a pipeline that doesn't have it, the pipeline's first open stage is used. Without a
 * `pipelineId` the default pipeline is meant.
 */
export async function firstOpenStage(tx: Tx, key = "new", pipelineId?: string) {
  const pipeline = pipelineId ? { id: pipelineId } : { isDefault: true };
  const named = await tx.pipelineStage.findFirst({ where: { key, kind: "open", pipeline } });
  if (named) return named;
  return tx.pipelineStage.findFirst({
    where: { kind: "open", pipeline },
    orderBy: { position: "asc" },
  });
}

/** The last open stage of a pipeline, where a reopened deal goes. */
export function lastOpenStage(tx: Tx, pipelineId: string) {
  return tx.pipelineStage.findFirst({
    where: { kind: "open", pipelineId },
    orderBy: { position: "desc" },
  });
}
