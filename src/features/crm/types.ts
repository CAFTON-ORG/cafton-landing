import type { LeadStatus, StageKind } from "./rules/core";
import type { CustomValues } from "./rules/custom-fields";
import type { LeadBand, ScoreReason } from "./rules/scoring";

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
  /** Their profile photo, when they have one. */
  avatarUrl?: string;
}

export interface PipelineView {
  id: string;
  key: string;
  name: string;
  isDefault: boolean;
  stages: StageView[];
  dealCount: number;
}

export interface StageView {
  id: string;
  pipelineId: string;
  key: string;
  name: string;
  position: number;
  probability: number;
  kind: StageKind;
  exitCriteria?: string;
  /** Deal fields that must be filled in before a deal can move in (see pipelines.ts). */
  requiredFields: string[];
}

export interface LeadView {
  id: string;
  /** Values of this kind of record's custom fields, by field key. */
  custom: CustomValues;
  tags: string[];
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
  ownerAvatar?: string;
  contactId?: string;
  dealId?: string;
  createdAt: string;
  /** 0 to 100: how ready the enquiry looks (see scoring.ts). */
  score: number;
  scoreBand: LeadBand;
  /** What earned the points, biggest first. */
  scoreReasons: ScoreReason[];
  /** The last note, call, email or meeting with them (ISO). */
  lastContactedAt?: string;
  /** The soonest open task or upcoming meeting (ISO). */
  nextActivityAt?: string;
}

export interface OrganizationView {
  id: string;
  /** Values of this kind of record's custom fields, by field key. */
  custom: CustomValues;
  tags: string[];
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
  /** Values of this kind of record's custom fields, by field key. */
  custom: CustomValues;
  tags: string[];
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
  ownerAvatar?: string;
  source: string;
  notes?: string;
  dealCount: number;
  createdAt: string;
  /** The last note, call, email or meeting with them (ISO). */
  lastContactedAt?: string;
  /** The soonest open task or upcoming meeting (ISO). */
  nextActivityAt?: string;
}

export interface DealView {
  id: string;
  /** Values of this kind of record's custom fields, by field key. */
  custom: CustomValues;
  tags: string[];
  reference: string;
  title: string;
  contactId: string;
  contactName: string;
  organizationId?: string;
  organizationName?: string;
  stageId: string;
  pipelineId: string;
  stageKey: string;
  stageName: string;
  stageKind: StageKind;
  probability: number;
  /** Integer centavos, or null until a value is known. */
  amountMinor: number | null;
  currency: string;
  ownerId?: string;
  ownerName?: string;
  ownerAvatar?: string;
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
  /** The last note, call, email or meeting with them (ISO). */
  lastContactedAt?: string;
  /** The soonest open task or upcoming meeting (ISO). */
  nextActivityAt?: string;
}

export interface ActivityView {
  id: string;
  type: "note" | "call" | "email" | "meeting" | "stage_change" | "system";
  body: string;
  by: string;
  /** The photo of the staff member who wrote it, when known. */
  byAvatar?: string;
  /** The author's id, to know whose entry it is. */
  byId?: string;
  pinned: boolean;
  edited: boolean;
  at: string;
}

export interface TaskView {
  id: string;
  title: string;
  dueAt?: string;
  doneAt?: string;
  assigneeId?: string;
  assigneeName?: string;
  assigneeAvatar?: string;
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

/** A file on a lead, contact, organization or deal. */
export interface FileView {
  id: string;
  name: string;
  mime: string;
  sizeBytes: number;
  uploadedByName: string;
  createdAt: string;
  /** Who added it, for "you can remove this". */
  uploadedBy?: string;
}
