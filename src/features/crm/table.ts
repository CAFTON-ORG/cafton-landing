import type { TableParamsConfig } from "@/lib/table-params";
import { LEAD_STATUSES } from "./types";

/** URL-driven state for each CRM list. Declared once so the page and the client table parse identically. */

export const LEADS_TABLE: TableParamsConfig = {
  filters: { status: LEAD_STATUSES, owner: ["me", "unassigned"] },
  sortable: ["name", "status", "created"],
  defaultSort: { sort: "created", dir: "desc" },
};

export const CONTACTS_TABLE: TableParamsConfig = {
  sortable: ["name", "organization", "created"],
  defaultSort: { sort: "name", dir: "asc" },
};

export const ORGANIZATIONS_TABLE: TableParamsConfig = {
  sortable: ["name", "created"],
  defaultSort: { sort: "name", dir: "asc" },
};

/** Stage keys are data, so the caller supplies them. */
export function dealsTableConfig(stageKeys: readonly string[]): TableParamsConfig {
  return {
    filters: { stage: stageKeys, owner: ["me", "unassigned"] },
    sortable: ["title", "stage", "amount", "close", "created"],
    defaultSort: { sort: "created", dir: "desc" },
  };
}
