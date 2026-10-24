import type { MeetingStatus } from "../types/core";

/** Colours of a meeting on the calendar, by status. */
export const CHIP_TONE: Record<MeetingStatus, string> = {
  requested: "bg-amber-500/20 text-amber-900 dark:text-amber-200",
  confirmed: "bg-sky-500/20 text-sky-950 dark:text-sky-100",
  completed: "bg-muted text-foreground/75",
  no_show: "bg-red-500/15 text-red-900 dark:text-red-200",
  cancelled: "bg-muted text-foreground/75 line-through",
};
