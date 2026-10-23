import { z } from "zod";

import {
  MAX_NAME,
  MAX_NOTE,
  MAX_TASK_TITLE,
  MILESTONE_STATUSES,
  PROJECT_STATUSES,
  TASK_PRIORITIES,
  TASK_STATUSES,
} from "./rules";

/**
 * What the forms send. Everything arrives as text and is checked again here and in `rules.ts`; the
 * database holds the last line of defence with its own constraints.
 */

const id = z.string().uuid();
/** "" and "none" both mean "nobody / not set". */
const optionalId = z
  .string()
  .nullable()
  .optional()
  .transform((value) => (!value || value === "none" ? null : value))
  .pipe(id.nullable());

const day = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date.")
  .or(z.literal(""))
  .optional()
  .transform((value) => value || null);

const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Keep it under ${max} characters.`)
    .optional()
    .transform((value) => value || null);

export const projectSchema = z.object({
  name: z.string().trim().min(1, "Give the project a name.").max(MAX_NAME),
  description: text(MAX_NOTE),
  dealId: optionalId,
  managerId: optionalId,
  startDate: day,
  dueDate: day,
  /** Pesos, like "250000" or "250,000.50"; "" means no price. */
  budget: z.string().trim().max(20).optional().default(""),
  /** Hours the price assumes, like "120" or "120:30"; "" means none. */
  budgetHours: z.string().trim().max(12).optional().default(""),
});
export type ProjectInput = z.input<typeof projectSchema>;

export const statusSchema = z.object({ id, status: z.enum(PROJECT_STATUSES) });

export const memberSchema = z.object({
  projectId: id,
  profileId: id,
  /** Pesos per hour; "" means unknown. */
  costRate: z.string().trim().max(20).optional().default(""),
});
export type MemberInput = z.input<typeof memberSchema>;

export const milestoneSchema = z.object({
  id: id.optional(),
  projectId: id,
  name: z.string().trim().min(1, "Give the milestone a name.").max(MAX_NAME),
  description: text(MAX_NOTE),
  dueDate: day,
  billable: z.boolean().default(false),
  /** Pesos invoiced when this milestone is done; "" when it is not billable. */
  amount: z.string().trim().max(20).optional().default(""),
});
export type MilestoneInput = z.input<typeof milestoneSchema>;

export const milestoneStatusSchema = z.object({ id, status: z.enum(MILESTONE_STATUSES) });

export const taskSchema = z.object({
  id: id.optional(),
  projectId: id,
  title: z.string().trim().min(1, "Say what needs doing.").max(MAX_TASK_TITLE),
  description: text(MAX_NOTE),
  milestoneId: optionalId,
  assigneeId: optionalId,
  priority: z.enum(TASK_PRIORITIES).default("normal"),
  dueDate: day,
  /** Hours the task should take, like "4" or "1:30". */
  estimate: z.string().trim().max(12).optional().default(""),
});
export type TaskInput = z.input<typeof taskSchema>;

export const taskMoveSchema = z.object({
  id,
  status: z.enum(TASK_STATUSES),
  /** Where in the column: the task goes before this one, or last when omitted. */
  beforeId: id.optional(),
});

export const timeSchema = z.object({
  id: id.optional(),
  projectId: id,
  taskId: optionalId,
  workDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date."),
  /** "1.5", "1:30", "90m" */
  duration: z.string().trim().max(12),
  note: text(MAX_NOTE),
  billable: z.boolean().default(true),
});
export type TimeInput = z.input<typeof timeSchema>;

export const weekSchema = z.object({
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const reviewSchema = z.object({
  ids: z.array(id).min(1).max(500),
  action: z.enum(["approve", "reject"]),
  note: z.string().trim().max(500).optional().default(""),
});
