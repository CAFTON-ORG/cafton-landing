import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { isDatabaseConfigured } from "@/lib/env";
import { ttlCache } from "@/lib/ttl-cache";

/** The numbers shown as badges: in the sidebar and on the bell. */
export interface NavCounts {
  /** Enquiries nobody has looked at yet. */
  newLeads: number;
  /** Visitors waiting for an answer to a meeting request. */
  meetingRequests: number;
  /** Tasks assigned to you that are past their due date. */
  overdueTasks: number;
  /** Notifications you have not opened. */
  unread: number;
}

export const NO_COUNTS: NavCounts = { newLeads: 0, meetingRequests: 0, overdueTasks: 0, unread: 0 };

async function load(userId: string): Promise<NavCounts> {
  if (!isDatabaseConfigured) return NO_COUNTS;
  // One query for everything, because each round trip to the database is the slow part.
  const rows = await prisma.$queryRaw<
    { new_leads: bigint; requests: bigint; overdue: bigint; unread: bigint }[]
  >(Prisma.sql`
    SELECT
      (SELECT count(*) FROM leads WHERE status = 'new' AND deleted_at IS NULL) AS new_leads,
      (SELECT count(*) FROM meetings WHERE status = 'requested' AND ends_at >= now()) AS requests,
      (SELECT count(*) FROM tasks WHERE done_at IS NULL AND due_at < now()
         AND assignee_id = ${userId}::uuid) AS overdue,
      (SELECT count(*) FROM notifications WHERE user_id = ${userId}::uuid AND read_at IS NULL) AS unread`);
  const row = rows[0];
  return {
    newLeads: Number(row?.new_leads ?? 0),
    meetingRequests: Number(row?.requests ?? 0),
    overdueTasks: Number(row?.overdue ?? 0),
    unread: Number(row?.unread ?? 0),
  };
}

/** Kept for 10 seconds per person. Anything that changes these numbers clears it (see refreshCrm). */
export const navCounts = ttlCache(10_000, load, (userId) => userId);
