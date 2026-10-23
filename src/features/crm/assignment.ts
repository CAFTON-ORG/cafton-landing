/**
 * Round-robin assignment of new website enquiries. Pure, so the rule can be tested without a
 * database. The turn goes to whoever was given a lead least recently (nobody yet comes first), which
 * evens the load out and survives people joining, leaving or being switched off, with no counter to
 * keep in step.
 */

export interface PoolMember {
  id: string;
  /** When this person was last given a new enquiry, or null if never. */
  lastAssignedAt: Date | null;
}

/** The person whose turn it is, or null when nobody takes new leads. */
export function pickAssignee(pool: readonly PoolMember[]): string | null {
  if (pool.length === 0) return null;
  const sorted = [...pool].sort((a, b) => {
    const left = a.lastAssignedAt?.getTime() ?? -Infinity;
    const right = b.lastAssignedAt?.getTime() ?? -Infinity;
    // Never assigned (-Infinity) sorts first; equal times fall back to the id so the pick is stable.
    return left === right ? a.id.localeCompare(b.id) : left < right ? -1 : 1;
  });
  return sorted[0].id;
}
