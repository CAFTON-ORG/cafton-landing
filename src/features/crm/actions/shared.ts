import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { actorId } from "@/lib/actions";
import { ActionError } from "@/lib/actions";
import { live } from "../repository/mappers";
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

/** Which permission a timeline entry or message needs depends on what it is attached to. */
export const subjectPermission = (subject: { leadId?: string; dealId?: string }) =>
  subject.dealId
    ? ("deals:update" as const)
    : subject.leadId
      ? ("leads:update" as const)
      : ("contacts:update" as const);

/** Throws when the lead, contact or deal a timeline entry is for no longer exists. */
export async function assertSubjectExists(
  tx: Tx,
  subject: { leadId?: string; contactId?: string; organizationId?: string; dealId?: string },
) {
  const found = subject.organizationId
    ? await tx.organization.findFirst({
        where: { id: subject.organizationId, ...live },
        select: { id: true },
      })
    : subject.dealId
      ? await tx.deal.findFirst({ where: { id: subject.dealId, ...live }, select: { id: true } })
      : subject.leadId
        ? await tx.lead.findFirst({ where: { id: subject.leadId, ...live }, select: { id: true } })
        : await tx.contact.findFirst({
            where: { id: subject.contactId, ...live },
            select: { id: true },
          });
  if (!found) throw new ActionError("That record no longer exists.");
}
