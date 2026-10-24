import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { resolvePermissions } from "@/lib/auth/permissions";
import { pickAssignee } from "../rules/assignment";

/** Arbitrary key for the database lock that keeps enquiries from picking the same person. */
const ASSIGNMENT_LOCK = 710_001;

/**
 * Whose turn it is for the next website enquiry: the person who takes new leads and was given one
 * least recently. Only people whose role can work on leads are in the pool. Call it inside the
 * transaction that creates the lead: the lock holds until that commits, so two enquiries arriving
 * together take turns instead of both picking the same person.
 */
export async function nextLeadOwner(
  tx: Prisma.TransactionClient,
): Promise<{ id: string; name: string } | null> {
  // Wrapped so the query returns a plain integer: the bare function returns `void`, which the
  // database driver can't read.
  await tx.$queryRaw`SELECT 1 AS locked FROM (SELECT pg_advisory_xact_lock(${ASSIGNMENT_LOCK})) AS lock`;

  const profiles = await tx.profile.findMany({
    where: { takesLeads: true },
    include: { role: { include: { permissions: true } } },
  });
  const eligible = profiles.filter((profile) =>
    resolvePermissions(profile.role).includes("leads:update"),
  );
  if (eligible.length === 0) return null;

  const latest = await tx.lead.groupBy({
    by: ["ownerId"],
    where: { ownerId: { in: eligible.map((profile) => profile.id) } },
    _max: { createdAt: true },
  });
  const lastBy = new Map(latest.map((row) => [row.ownerId, row._max.createdAt]));
  const id = pickAssignee(
    eligible.map((profile) => ({ id: profile.id, lastAssignedAt: lastBy.get(profile.id) ?? null })),
  );
  const chosen = eligible.find((profile) => profile.id === id);
  return chosen ? { id: chosen.id, name: chosen.fullName ?? chosen.email } : null;
}
