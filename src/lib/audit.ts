import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { actorId } from "@/lib/actions";
import { prisma } from "@/lib/db";

type Db = Pick<Prisma.TransactionClient, "auditLog">;

export interface AuditEntry {
  /** Dotted verb, e.g. "user.invite". */
  action: string;
  entity: string;
  entityId?: string;
  /** One readable sentence: "Invited ada@cafton.com as Admin". */
  summary: string;
  metadata?: Prisma.InputJsonValue;
}

/**
 * Appends to the audit log. Pass the transaction client so the entry commits or
 * rolls back together with the change it describes.
 */
export async function recordAudit(
  staff: { id: string; name: string },
  entry: AuditEntry,
  db: Db = prisma,
) {
  await db.auditLog.create({
    data: {
      actorId: actorId(staff),
      actorName: staff.name,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId,
      summary: entry.summary,
      metadata: entry.metadata,
    },
  });
}
