import type { LeadStatus, StageKind } from "./rules";

export const LEAD_STATUSES = [
  "new",
  "qualified",
  "disqualified",
  "converted",
] as const satisfies readonly LeadStatus[];

export const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
  new: "New",
  qualified: "Qualified",
  disqualified: "Disqualified",
  converted: "Converted",
};

export const ACTIVITY_TYPES = ["note", "call", "email", "meeting"] as const;
export type LoggableActivityType = (typeof ACTIVITY_TYPES)[number];

export interface PersonRef {
  id: string;
  name: string;
}

export interface StageView {
  id: string;
  key: string;
  name: string;
  position: number;
  probability: number;
  kind: StageKind;
  exitCriteria?: string;
}

export interface LeadView {
  id: string;
  reference: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  phone?: string;
  businessName?: string;
  goalsArea?: string;
  budget?: string;
  timeline?: string;
  source: string;
  pagePath?: string;
  status: LeadStatus;
  disqualifiedReason?: string;
  ownerId?: string;
  ownerName?: string;
  contactId?: string;
  dealId?: string;
  createdAt: string;
}

export interface OrganizationView {
  id: string;
  name: string;
  industry?: string;
  size?: string;
  website?: string;
  phone?: string;
  address?: string;
  notes?: string;
  contactCount: number;
  dealCount: number;
  createdAt: string;
}

export interface ContactView {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  phone?: string;
  position?: string;
  organizationId?: string;
  organizationName?: string;
  ownerId?: string;
  ownerName?: string;
  source: string;
  notes?: string;
  dealCount: number;
  createdAt: string;
}

export interface DealView {
  id: string;
  reference: string;
  title: string;
  contactId: string;
  contactName: string;
  organizationId?: string;
  organizationName?: string;
  stageId: string;
  stageKey: string;
  stageName: string;
  stageKind: StageKind;
  probability: number;
  /** Integer centavos, or null until a value is known. */
  amountMinor: number | null;
  currency: string;
  ownerId?: string;
  ownerName?: string;
  /** yyyy-mm-dd */
  expectedCloseDate?: string;
  source: string;
  description?: string;
  lostReason?: string;
  leadId?: string;
  stageChangedAt: string;
  wonAt?: string;
  lostAt?: string;
  createdAt: string;
}

export interface ActivityView {
  id: string;
  type: "note" | "call" | "email" | "meeting" | "stage_change" | "system";
  body: string;
  by: string;
  at: string;
}

export interface TaskView {
  id: string;
  title: string;
  dueAt?: string;
  doneAt?: string;
  assigneeId?: string;
  assigneeName?: string;
  subject?: { kind: "lead" | "contact" | "deal"; id: string; label: string };
}

export interface ForecastView {
  openCount: number;
  openValueMinor: number;
  weightedMinor: number;
  wonThisMonthMinor: number;
  wonThisMonthCount: number;
  lostThisMonthCount: number;
  currency: string;
  byStage: { stageId: string; name: string; count: number; valueMinor: number }[];
}

/** A subject an activity or task attaches to. Exactly one id is set. */
export type Subject = { leadId: string } | { contactId: string } | { dealId: string };
