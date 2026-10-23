import { StatusBadge, type StatusTone } from "@/components/dashboard/shared/status-badge";
import {
  MILESTONE_STATUS_LABEL,
  PROJECT_STATUS_LABEL,
  TASK_PRIORITY_LABEL,
  TASK_STATUS_LABEL,
  TIME_STATUS_LABEL,
  type MilestoneStatus,
  type ProjectStatus,
  type TaskPriority,
  type TaskStatus,
  type TimeStatus,
} from "../rules";

const PROJECT: Record<ProjectStatus, StatusTone> = {
  planned: "neutral",
  active: "info",
  on_hold: "warning",
  completed: "success",
  cancelled: "neutral",
};
const MILESTONE: Record<MilestoneStatus, StatusTone> = {
  pending: "neutral",
  in_progress: "info",
  done: "success",
};
const TASK: Record<TaskStatus, StatusTone> = {
  todo: "neutral",
  in_progress: "info",
  review: "accent",
  done: "success",
};
const PRIORITY: Record<TaskPriority, StatusTone> = {
  low: "neutral",
  normal: "neutral",
  high: "danger",
};
const TIME: Record<TimeStatus, StatusTone> = {
  draft: "neutral",
  submitted: "warning",
  approved: "success",
  rejected: "danger",
};

export const ProjectStatusBadge = ({ status }: { status: ProjectStatus }) => (
  <StatusBadge tone={PROJECT[status]}>{PROJECT_STATUS_LABEL[status]}</StatusBadge>
);
export const MilestoneStatusBadge = ({ status }: { status: MilestoneStatus }) => (
  <StatusBadge tone={MILESTONE[status]}>{MILESTONE_STATUS_LABEL[status]}</StatusBadge>
);
export const TaskStatusBadge = ({ status }: { status: TaskStatus }) => (
  <StatusBadge tone={TASK[status]}>{TASK_STATUS_LABEL[status]}</StatusBadge>
);
export const TaskPriorityBadge = ({ priority }: { priority: TaskPriority }) => (
  <StatusBadge tone={PRIORITY[priority]}>{TASK_PRIORITY_LABEL[priority]}</StatusBadge>
);
export const TimeStatusBadge = ({ status }: { status: TimeStatus }) => (
  <StatusBadge tone={TIME[status]}>{TIME_STATUS_LABEL[status]}</StatusBadge>
);
