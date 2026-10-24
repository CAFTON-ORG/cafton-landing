/**
 * CRM business rules. Pure functions, shared by the UI (which disables a control
 * and shows the reason) and the Server Actions (which enforce). Each check
 * returns a message when the action is not allowed, or null when it is.
 */

export type LeadStatus = "new" | "qualified" | "disqualified" | "converted";
export type StageKind = "open" | "won" | "lost";

/* ------------------------------------------------------------------ leads */

export function checkQualify(lead: { status: LeadStatus }): string | null {
  if (lead.status === "converted") return "This lead has already been converted.";
  if (lead.status === "disqualified") return "Reopen this lead before qualifying it.";
  if (lead.status === "qualified") return "This lead is already qualified.";
  return null;
}

export function checkDisqualify(lead: { status: LeadStatus }, reason: string): string | null {
  if (lead.status === "converted") return "A converted lead can't be disqualified.";
  if (lead.status === "disqualified") return "This lead is already disqualified.";
  if (!reason.trim()) return "Say why this lead is being disqualified.";
  return null;
}

export function checkReopenLead(lead: { status: LeadStatus }): string | null {
  return lead.status === "disqualified" ? null : "Only a disqualified lead can be reopened.";
}

export function checkConvert(lead: { status: LeadStatus }): string | null {
  if (lead.status === "converted") return "This lead has already been converted.";
  if (lead.status === "disqualified") return "Reopen this lead before converting it.";
  return null;
}

/** Merging keeps one lead: a converted one is part of a deal's history, so it can't be merged. */
export function checkMergeLeads(leads: readonly { status: LeadStatus }[]): string | null {
  return leads.some((lead) => lead.status === "converted")
    ? "A converted lead is part of a deal's history and can't be merged."
    : null;
}

/**
 * The status the kept lead ends with: its own, except that a lead still marked new takes
 * "qualified" when one of the leads merged into it was already qualified (that work is not undone).
 */
export function mergedLeadStatus(primary: LeadStatus, others: readonly LeadStatus[]): LeadStatus {
  return primary === "new" && others.includes("qualified") ? "qualified" : primary;
}

export function checkLeadDelete(lead: { status: LeadStatus }): string | null {
  return lead.status === "converted"
    ? "A converted lead is part of a deal's history and can't be deleted."
    : null;
}

/* ------------------------------------------------------------------ deals */

interface DealState {
  stageKind: StageKind;
  amountMinor: number | null;
}

/** Plain moves are open stage to open stage. Winning and losing have their own steps. */
export function checkMoveDeal(deal: DealState, target: { kind: StageKind }): string | null {
  if (deal.stageKind !== "open") return "This deal is closed. Reopen it before moving it.";
  if (target.kind === "won") return "Use “Mark as won” to win a deal.";
  if (target.kind === "lost") return "Use “Mark as lost” to lose a deal.";
  return null;
}

export function checkWin(deal: DealState): string | null {
  if (deal.stageKind === "won") return "This deal is already won.";
  if (deal.stageKind === "lost") return "Reopen this deal before winning it.";
  if (deal.amountMinor === null || deal.amountMinor <= 0)
    return "Enter the deal's final value before marking it as won.";
  return null;
}

export function checkLose(deal: DealState, reason: string): string | null {
  if (deal.stageKind === "lost") return "This deal is already lost.";
  if (deal.stageKind === "won") return "Reopen this deal before losing it.";
  if (!reason.trim()) return "Say why the deal was lost.";
  return null;
}

export function checkReopenDeal(deal: DealState, paymentsReceived = false): string | null {
  if (deal.stageKind === "open") return "This deal is already open.";
  if (paymentsReceived) return "A deal with payments received can't be reopened.";
  return null;
}

/** A won deal's value is its contract: it's locked. */
export function checkEditAmount(deal: DealState): string | null {
  return deal.stageKind === "won"
    ? "A won deal's value is locked. Reopen the deal to change it."
    : null;
}

export function checkDealDelete(deal: DealState): string | null {
  return deal.stageKind === "won" ? "A won deal can't be deleted." : null;
}

export function checkAddTaskToDeal(deal: DealState): string | null {
  return deal.stageKind === "open" ? null : "Tasks can't be added to a closed deal.";
}

/* ------------------------------------------------------- contacts and orgs */

export function checkContactDelete(contact: { liveDeals: number }): string | null {
  return contact.liveDeals > 0
    ? `This contact has ${contact.liveDeals} ${contact.liveDeals === 1 ? "deal" : "deals"}. Delete or reassign them first.`
    : null;
}

export function checkOrganizationDelete(org: { contacts: number; deals: number }): string | null {
  if (org.deals > 0) {
    return `This organization has ${org.deals} ${org.deals === 1 ? "deal" : "deals"}. Delete or reassign them first.`;
  }
  if (org.contacts > 0) {
    return `This organization has ${org.contacts} ${org.contacts === 1 ? "contact" : "contacts"}. Move or delete them first.`;
  }
  return null;
}

/* ------------------------------------------------------------------ tasks */

export type TaskUrgency = "done" | "overdue" | "today" | "upcoming" | "none";

/** How a task should be flagged, relative to `now` (injectable for tests). */
export function taskUrgency(
  task: { dueAt: Date | null; doneAt: Date | null },
  now: Date = new Date(),
): TaskUrgency {
  if (task.doneAt) return "done";
  if (!task.dueAt) return "none";
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);
  if (task.dueAt < startOfToday) return "overdue";
  if (task.dueAt < endOfToday) return "today";
  return "upcoming";
}

/* ----------------------------------------------------------------- dedupe */

/** Emails match case-insensitively, ignoring surrounding spaces. */
export const normaliseEmail = (email: string) => email.trim().toLowerCase();

export const fullName = (person: { firstName: string; lastName: string }) =>
  `${person.firstName} ${person.lastName}`.trim();

/** Why an email can't be sent to this record, or null when it can. */
export function checkEmailable(email: string | null | undefined): string | null {
  const address = (email ?? "").trim();
  if (!address) return "This record has no email address.";
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)
    ? null
    : "That email address doesn't look right.";
}
