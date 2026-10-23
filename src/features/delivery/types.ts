import type {
  MilestoneStatus,
  ProjectStatus,
  TaskPriority,
  TaskStatus,
  TimeStatus,
  TemplateMilestone,
  TemplateTask,
} from "./rules";

/** Plain data for the screens: dates are "YYYY-MM-DD", moments are ISO strings, money is minor units. */

export interface PersonRef {
  id: string;
  name: string;
  avatarUrl?: string;
}

export interface TaskCount {
  total: number;
  done: number;
}

/** One line of the projects list. */
export interface ProjectRow {
  id: string;
  reference: string;
  name: string;
  status: ProjectStatus;
  clientName?: string;
  manager?: PersonRef;
  startDate?: string;
  dueDate?: string;
  budgetMinor?: number;
  currency: string;
  tasks: TaskCount;
  /** Minutes logged and approved so far. */
  approvedMinutes: number;
  createdAt: string;
}

export interface ProjectView extends ProjectRow {
  description?: string;
  dealId?: string;
  dealTitle?: string;
  quoteId?: string;
  quoteReference?: string;
  contactId?: string;
  organizationId?: string;
  budgetMinutes?: number;
  portfolioSlug?: string;
  completedAt?: string;
  /** Minutes logged on the project in any state except sent back. */
  loggedMinutes: number;
  /** Minutes waiting for approval. */
  pendingMinutes: number;
}

export interface MemberView {
  id: string;
  profileId: string;
  name: string;
  avatarUrl?: string;
  /** What an hour of this person costs, in minor units. */
  costRateMinor?: number;
  loggedMinutes: number;
}

export interface MilestoneView {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  dueDate?: string;
  status: MilestoneStatus;
  billable: boolean;
  amountMinor?: number;
  completedAt?: string;
  tasks: TaskCount;
}

export interface TaskView {
  id: string;
  projectId: string;
  milestoneId?: string;
  milestoneName?: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee?: PersonRef;
  dueDate?: string;
  estimateMinutes?: number;
  position: number;
  loggedMinutes: number;
  commentCount: number;
  completedAt?: string;
}

export interface TimeEntryView {
  id: string;
  projectId: string;
  projectName: string;
  projectReference: string;
  taskId?: string;
  taskTitle?: string;
  person: PersonRef;
  workDate: string;
  weekStart: string;
  minutes: number;
  note?: string;
  billable: boolean;
  status: TimeStatus;
  reviewNote?: string;
  reviewedByName?: string;
}

/** Budget against actual for one project. Only approved time counts as actual. */
export interface ProjectFinancials {
  priceMinor?: number;
  currency: string;
  approvedMinutes: number;
  billableMinutes: number;
  /** Approved hours at each member's hourly cost. */
  costMinor: number;
  /** Approved minutes by people with no hourly cost set: the cost figure leaves these out. */
  unratedMinutes: number;
  /** What billable milestones will invoice, and how much of that is already earned (done). */
  billableMilestonesMinor: number;
  earnedMilestonesMinor: number;
}

export interface UtilisationRow {
  person: PersonRef;
  approvedMinutes: number;
  billableMinutes: number;
  /** Logged but not approved yet. */
  pendingMinutes: number;
  /** Whole percent of the available hours that were billable. */
  percent: number;
}

export interface PortfolioOption {
  slug: string;
  title: string;
  client: string;
  /** The project already telling its story, if any. */
  linkedProjectId?: string;
}

export interface CommentView {
  id: string;
  taskId: string;
  authorId?: string;
  authorName: string;
  body: string;
  createdAt: string;
}

export interface TemplateView {
  id: string;
  name: string;
  description?: string;
  milestones: TemplateMilestone[];
  tasks: TemplateTask[];
  active: boolean;
}

/**
 * What a client sees on their progress link. Deliberately small: no hours, costs, people or
 * internal notes, only where the work stands.
 */
export interface PublicProgress {
  reference: string;
  name: string;
  clientName?: string;
  status: ProjectStatus;
  startDate?: string;
  dueDate?: string;
  completedAt?: string;
  tasks: TaskCount;
  milestones: { name: string; status: MilestoneStatus; dueDate?: string; completedAt?: string }[];
  updatedAt: string;
}
