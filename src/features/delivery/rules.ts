/**
 * The rules for projects, milestones, tasks and time, in one place so the screens, the server actions
 * and the tests all agree. Pure: no database. Dates are "YYYY-MM-DD" in Manila time; durations are
 * whole minutes.
 */

import { addDays, weekdayOf } from "@/features/schedule/slots";

/* ----------------------------------------------------------------- projects */

export const PROJECT_STATUSES = ["planned", "active", "on_hold", "completed", "cancelled"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  planned: "Planned",
  active: "In progress",
  on_hold: "On hold",
  completed: "Completed",
  cancelled: "Cancelled",
};

/** Where a project can go from each status. Completed and cancelled projects are closed. */
const PROJECT_MOVES: Record<ProjectStatus, readonly ProjectStatus[]> = {
  planned: ["active", "cancelled"],
  active: ["on_hold", "completed", "cancelled"],
  on_hold: ["active", "cancelled"],
  completed: ["active"],
  cancelled: ["planned"],
};

export const nextProjectStatuses = (from: ProjectStatus) => PROJECT_MOVES[from];

/** Time can be logged and tasks worked while a project is open. */
export const isOpenProject = (status: ProjectStatus) =>
  status === "planned" || status === "active" || status === "on_hold";

/** Hours can be logged only while the work is actually going on. */
export const canLogTimeOn = (status: ProjectStatus) => status === "active";

export interface CloseFacts {
  /** Tasks not done yet. */
  openTasks: number;
  /** Hours waiting for someone to approve them. */
  pendingTime: number;
  /** Billable milestones not done yet. */
  unfinishedBillable: number;
}

/** Why a project's status can't change that way, or null. Completing needs the loose ends tied up. */
export function checkProjectStatusChange(
  from: ProjectStatus,
  to: ProjectStatus,
  facts: CloseFacts,
): string | null {
  if (from === to) return null;
  if (!PROJECT_MOVES[from].includes(to)) {
    return `A project that is ${PROJECT_STATUS_LABEL[from].toLowerCase()} can't go straight to ${PROJECT_STATUS_LABEL[to].toLowerCase()}.`;
  }
  if (to !== "completed") return null;
  if (facts.openTasks > 0) {
    return `${plural(facts.openTasks, "task is", "tasks are")} not done yet. Finish or remove ${facts.openTasks === 1 ? "it" : "them"} first.`;
  }
  if (facts.unfinishedBillable > 0) {
    return `${plural(facts.unfinishedBillable, "billable milestone is", "billable milestones are")} not done yet, and finishing ${facts.unfinishedBillable === 1 ? "it is" : "them is"} what gets the client invoiced.`;
  }
  if (facts.pendingTime > 0) {
    return `${plural(facts.pendingTime, "time entry is", "time entries are")} waiting for approval. Approve or reject ${facts.pendingTime === 1 ? "it" : "them"} first.`;
  }
  return null;
}

export const MAX_NAME = 160;
export const MAX_NOTE = 2000;

export function checkProject(input: {
  name: string;
  startDate?: string | null;
  dueDate?: string | null;
}): { name?: string; dueDate?: string } {
  const errors: { name?: string; dueDate?: string } = {};
  if (!input.name.trim()) errors.name = "Give the project a name.";
  else if (input.name.trim().length > MAX_NAME)
    errors.name = `Keep it under ${MAX_NAME} characters.`;
  if (input.startDate && input.dueDate && input.dueDate < input.startDate) {
    errors.dueDate = "The due date can't be before the start date.";
  }
  return errors;
}

/* --------------------------------------------------------------- milestones */

export const MILESTONE_STATUSES = ["pending", "in_progress", "done"] as const;
export type MilestoneStatus = (typeof MILESTONE_STATUSES)[number];

export const MILESTONE_STATUS_LABEL: Record<MilestoneStatus, string> = {
  pending: "Not started",
  in_progress: "In progress",
  done: "Done",
};

/**
 * Why a milestone can't be saved as written, or null. A billable milestone needs an amount, and the
 * billable milestones together can't ask for more than the project is worth.
 */
export function checkMilestone(input: {
  name: string;
  billable: boolean;
  amountMinor: number | null;
  /** The other billable milestones of the project, added up. */
  otherBillableMinor: number;
  budgetMinor: number | null;
}): { name?: string; amount?: string } {
  const errors: { name?: string; amount?: string } = {};
  if (!input.name.trim()) errors.name = "Give the milestone a name.";
  else if (input.name.trim().length > MAX_NAME)
    errors.name = `Keep it under ${MAX_NAME} characters.`;
  if (input.billable) {
    if (input.amountMinor === null || input.amountMinor <= 0) {
      errors.amount = "A billable milestone needs the amount to invoice when it is done.";
    } else if (
      input.budgetMinor !== null &&
      input.otherBillableMinor + input.amountMinor > input.budgetMinor
    ) {
      errors.amount = "The billable milestones together can't be more than the project's price.";
    }
  }
  return errors;
}

/** A milestone is done only when its tasks are; one with no tasks can be marked done by hand. */
export function checkMilestoneDone(openTasks: number): string | null {
  return openTasks > 0
    ? `${plural(openTasks, "task is", "tasks are")} not done yet. Finish ${openTasks === 1 ? "it" : "them"} first.`
    : null;
}

/* -------------------------------------------------------------------- tasks */

export const TASK_STATUSES = ["todo", "in_progress", "review", "done"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  todo: "To do",
  in_progress: "In progress",
  review: "In review",
  done: "Done",
};

export const TASK_PRIORITIES = ["low", "normal", "high"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];
export const TASK_PRIORITY_LABEL: Record<TaskPriority, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
};

export const MAX_TASK_TITLE = 200;

export function checkTask(input: {
  title: string;
  assigneeId?: string | null;
  memberIds: readonly string[];
}): { title?: string; assigneeId?: string } {
  const errors: { title?: string; assigneeId?: string } = {};
  if (!input.title.trim()) errors.title = "Say what needs doing.";
  else if (input.title.trim().length > MAX_TASK_TITLE) {
    errors.title = `Keep it under ${MAX_TASK_TITLE} characters.`;
  }
  if (input.assigneeId && !input.memberIds.includes(input.assigneeId)) {
    errors.assigneeId = "Add that person to the project's team first.";
  }
  return errors;
}

/** `completedAt` follows the status: set when a task becomes done, cleared if it is reopened. */
export function completedAtFor(
  previous: { status: TaskStatus; completedAt: Date | null },
  next: TaskStatus,
  now: Date,
): Date | null {
  if (next !== "done") return null;
  return previous.status === "done" && previous.completedAt ? previous.completedAt : now;
}

export interface TaskCounts {
  total: number;
  done: number;
}

/** Whole percent of tasks done; a project with no tasks reads 0. */
export function progressPercent({ total, done }: TaskCounts): number {
  return total === 0 ? 0 : Math.round((done / total) * 100);
}

export function isOverdue(dueDate: string | null | undefined, today: string, done: boolean) {
  return !done && !!dueDate && dueDate < today;
}

/* --------------------------------------------------------------------- time */

export const TIME_STATUSES = ["draft", "submitted", "approved", "rejected"] as const;
export type TimeStatus = (typeof TIME_STATUSES)[number];

export const TIME_STATUS_LABEL: Record<TimeStatus, string> = {
  draft: "Draft",
  submitted: "Waiting for approval",
  approved: "Approved",
  rejected: "Sent back",
};

export const DAY_MINUTES = 24 * 60;
/** Time can be logged for today and this many days back; older corrections go through a manager. */
export const BACKDATE_DAYS = 31;

/** The Monday of the week a "YYYY-MM-DD" date falls in. */
export function weekStartOf(date: string): string {
  const weekday = weekdayOf(date); // 0 = Sunday
  return addDays(date, -((weekday + 6) % 7));
}

/** The seven dates of the week that starts on `weekStart`. */
export const weekDates = (weekStart: string): string[] =>
  Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));

/**
 * What people type for a duration, as minutes: "1.5" and "1.5h" (hours), "1:30", "90m", "2h 15m".
 * A bare number is hours, because that is how timesheets are filled in. Null when it isn't one.
 */
export function parseDuration(input: string): number | null {
  const text = input.trim().toLowerCase().replace(/\s+/g, " ");
  if (!text) return null;

  const clock = /^(\d{1,3}):([0-5]\d)$/.exec(text);
  if (clock) return Number(clock[1]) * 60 + Number(clock[2]);

  const parts = /^(?:(\d+(?:\.\d+)?)\s*h(?:ours?|rs?)?)?\s*(?:(\d+)\s*m(?:in(?:ute)?s?)?)?$/.exec(
    text,
  );
  if (parts && (parts[1] !== undefined || parts[2] !== undefined)) {
    return Math.round(Number(parts[1] ?? 0) * 60 + Number(parts[2] ?? 0));
  }

  if (/^\d+(\.\d+)?$/.test(text)) return Math.round(Number(text) * 60);
  return null;
}

/** 90 -> "1h 30m", 120 -> "2h", 45 -> "45m", 0 -> "0h". */
export function formatMinutes(minutes: number): string {
  if (minutes <= 0) return "0h";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest}m`;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

/** The text a form field shows for a duration: 120h -> "120", 90 minutes -> "1:30". */
export function durationInput(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? String(hours) : `${hours}:${String(rest).padStart(2, "0")}`;
}

/** 90 -> "1.5": hours with at most two decimals, for tables and totals. */
export const hoursText = (minutes: number) => String(Math.round((minutes / 60) * 100) / 100);

/** An entry can be changed (or deleted) until it is approved, and again once it is sent back. */
export const canEditEntry = (status: TimeStatus) => status === "draft" || status === "rejected";

export interface LogFacts {
  minutes: number | null;
  workDate: string;
  today: string;
  /** What the same person already logged that day, on other entries. */
  otherMinutesThatDay: number;
  projectStatus: ProjectStatus;
  isMember: boolean;
}

/** Why this time can't be logged, or null. */
export function checkLogTime(facts: LogFacts): {
  minutes?: string;
  workDate?: string;
  form?: string;
} {
  const errors: { minutes?: string; workDate?: string; form?: string } = {};
  if (facts.minutes === null) {
    errors.minutes = "Enter the time like 1.5, 1:30 or 90m.";
  } else if (facts.minutes <= 0) {
    errors.minutes = "Enter more than zero.";
  } else if (facts.minutes + facts.otherMinutesThatDay > DAY_MINUTES) {
    errors.minutes = "That is more than 24 hours in one day.";
  }
  if (facts.workDate > facts.today) {
    errors.workDate = "You can't log time for a day that hasn't happened yet.";
  } else if (facts.workDate < addDays(facts.today, -BACKDATE_DAYS)) {
    errors.workDate = `Time can be logged up to ${BACKDATE_DAYS} days back. Ask a manager to add older time.`;
  }
  if (!facts.isMember) errors.form = "You're not on this project's team.";
  else if (!canLogTimeOn(facts.projectStatus)) {
    errors.form =
      facts.projectStatus === "planned"
        ? "This project hasn't started. Start it before logging time."
        : `Time can't be logged on a project that is ${PROJECT_STATUS_LABEL[facts.projectStatus].toLowerCase()}.`;
  }
  return errors;
}

/** Why a week can't be submitted, or null: there must be something to send. */
export function checkSubmitWeek(entries: readonly { status: TimeStatus }[]): string | null {
  return entries.some((entry) => canEditEntry(entry.status))
    ? null
    : "There is no unsent time in this week.";
}

/**
 * Why this person can't review these entries, or null. Nobody approves their own hours; sending
 * time back needs a reason the person can act on.
 */
export function checkReview(input: {
  reviewerId: string;
  action: "approve" | "reject";
  note: string;
  entries: readonly { profileId: string; status: TimeStatus }[];
}): string | null {
  if (input.entries.length === 0) return "There is nothing to review.";
  if (input.entries.some((entry) => entry.profileId === input.reviewerId)) {
    return "You can't review your own hours. Ask someone else.";
  }
  if (input.entries.some((entry) => entry.status !== "submitted")) {
    return "Only time that has been submitted can be approved or sent back.";
  }
  if (input.action === "reject" && !input.note.trim()) {
    return "Say why it is being sent back, so they can fix it.";
  }
  return null;
}

/* ------------------------------------------------------------------- budget */

export interface Usage {
  /** 0 when there is no budget. */
  percent: number;
  over: boolean;
  remainingMinutes: number | null;
}

/** Hours used against the hours the price assumed. */
export function hoursUsage(budgetMinutes: number | null, usedMinutes: number): Usage {
  if (!budgetMinutes || budgetMinutes <= 0) {
    return { percent: 0, over: false, remainingMinutes: null };
  }
  return {
    percent: Math.round((usedMinutes / budgetMinutes) * 100),
    over: usedMinutes > budgetMinutes,
    remainingMinutes: budgetMinutes - usedMinutes,
  };
}

/** Cost of time at a person's hourly cost rate (minor units per hour). */
export function costOf(minutes: number, hourlyMinor: number | null): number {
  return hourlyMinor === null ? 0 : Math.round((minutes / 60) * hourlyMinor);
}

/** Share of a person's available hours that went on billable work; 0 when they had none. */
export function utilisation(billableMinutes: number, availableMinutes: number): number {
  return availableMinutes <= 0 ? 0 : Math.round((billableMinutes / availableMinutes) * 100);
}

/** Working hours in a week that utilisation is measured against. */
export const WORK_WEEK_MINUTES = 40 * 60;

/* ------------------------------------------------------------------ helpers */

function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
}

/* ------------------------------------------------------------ margin, reports */

export interface Margin {
  amountMinor: number;
  /** Whole percent of the price kept; null when there is no price to compare with. */
  percent: number | null;
}

/** What is left of the price after the cost of the hours worked. */
export function margin(priceMinor: number | null, costMinor: number): Margin | null {
  if (priceMinor === null) return null;
  const amountMinor = priceMinor - costMinor;
  return {
    amountMinor,
    percent: priceMinor > 0 ? Math.round((amountMinor / priceMinor) * 100) : null,
  };
}

export const REPORT_WEEKS = [1, 4, 8, 13] as const;

/** The number of weeks a report covers, from a URL: one of the offered ranges, otherwise four. */
export function reportWeeks(value: string | undefined): (typeof REPORT_WEEKS)[number] {
  const weeks = Number(value);
  return (REPORT_WEEKS as readonly number[]).includes(weeks)
    ? (weeks as (typeof REPORT_WEEKS)[number])
    : 4;
}

/** The Monday a report of `weeks` weeks, ending with the current week, starts on. */
export const reportStart = (today: string, weeks: number) =>
  addDays(weekStartOf(today), -7 * (weeks - 1));

/**
 * Why a project can't be linked to that portfolio entry, or null. Only a delivered project can be
 * shown as a case study, and an entry tells one project's story.
 */
export function checkPortfolioLink(input: {
  projectStatus: ProjectStatus;
  slugExists: boolean;
  linkedElsewhere: boolean;
}): string | null {
  if (input.projectStatus !== "completed") {
    return "Only a completed project can be linked to a case study.";
  }
  if (!input.slugExists) return "That portfolio entry no longer exists.";
  if (input.linkedElsewhere) return "That portfolio entry already tells another project's story.";
  return null;
}
