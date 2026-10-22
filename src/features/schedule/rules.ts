import type { MeetingStatus } from "./types";

/** Rules for meetings. Pure: shared by the dashboard and the Server Actions, and unit tested. */

/** Statuses that hold a slot on the calendar. The database refuses overlaps between these. */
export const HOLDING: readonly MeetingStatus[] = ["requested", "confirmed"];

const NEXT: Record<MeetingStatus, readonly MeetingStatus[]> = {
  requested: ["confirmed", "cancelled"],
  confirmed: ["completed", "cancelled", "no_show"],
  completed: [],
  cancelled: [],
  no_show: [],
};

export const canMove = (from: MeetingStatus, to: MeetingStatus) => NEXT[from].includes(to);

/** Why a meeting cannot go to that status, or null when it can. */
export function checkStatusChange(
  from: MeetingStatus,
  to: MeetingStatus,
  options: { startsAt: Date; now: Date; reason?: string },
): string | null {
  if (!canMove(from, to)) {
    return from === "completed" || from === "cancelled" || from === "no_show"
      ? "This meeting is finished and can't be changed."
      : `A ${from} meeting can't become ${to.replace("_", "-")}.`;
  }
  if ((to === "completed" || to === "no_show") && options.startsAt > options.now) {
    return "This meeting hasn't started yet.";
  }
  if (to === "cancelled" && !options.reason?.trim()) return "Say why it is being cancelled.";
  return null;
}

/** A finished or cancelled meeting can't be moved. */
export const isEditable = (status: MeetingStatus) => HOLDING.includes(status);

/** A confirmed or requested meeting whose time has passed and was never closed out. */
export function isOverdue(status: MeetingStatus, endsAt: Date, now: Date) {
  return HOLDING.includes(status) && endsAt < now;
}

/** True when a database error is the "two meetings at one time" constraint. */
export function isOverlapError(error: unknown): boolean {
  const text =
    error instanceof Error
      ? `${error.message} ${JSON.stringify((error as { meta?: unknown }).meta ?? "")}`
      : String(error);
  return text.includes("meetings_no_overlap") || text.includes("exclusion constraint");
}
